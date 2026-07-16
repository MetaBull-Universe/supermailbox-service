import { Worker } from 'bullmq';
import { redisConnection } from '../queues/campaignQueue.js';
import type { CampaignJobPayload } from '../types.js';
import { checkSuppression } from '../services/suppression.js';
import { renderTemplate } from '../services/templates.js';
import { sendEmail } from '../providers/mailer.js';
import { supabase } from '../supabase.js';
import { broadcastCampaigns } from '../routes/email.js';

async function processEmailJob(job: any, workerLabel: string) {
  if (job.data.isMigration) {
    console.log(`${workerLabel} Migrating historical job record ${job.id} into queue without re-sending email.`);
    return { success: true, status: 'migrated', recipientEmail: job.data.recipientEmail };
  }

  const { emailJobId, campaignId, recipientEmail, recipientName, templateKey, variables, productCode } = job.data;
  const projectTag = productCode ? `[${productCode.toUpperCase()}] ` : '';
  console.log(`${workerLabel} Processing ${projectTag}job ${job.id || emailJobId} for ${recipientEmail}`);

  // 1. Update status to sending
  if (emailJobId && emailJobId !== 'in_memory') {
    await supabase
      .from('email_jobs')
      .update({ status: 'sending' })
      .eq('id', emailJobId);
  }

  // 2. Check suppression list
  const suppressionResult = await checkSuppression(recipientEmail);
  if (suppressionResult.suppressed) {
    console.warn(`${workerLabel} Skipping send to ${recipientEmail} - Suppressed (${suppressionResult.reason})`);
    if (emailJobId && emailJobId !== 'in_memory') {
      await supabase
        .from('email_jobs')
        .update({ status: 'suppressed' })
        .eq('id', emailJobId);

      await supabase.from('email_events').insert({
        email_job_id: emailJobId,
        event_type: 'failed',
        event_data: { reason: `Suppressed: ${suppressionResult.reason}` }
      });
    }
    return { success: false, status: 'suppressed', reason: suppressionResult.reason };
  }

  // 3. Render template
  const rendered = await renderTemplate(templateKey, {
    ...variables,
    email: recipientEmail,
    full_name: recipientName || recipientEmail.split('@')[0]
  });

  // 4. Send email via provider router
  const sendResult = await sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    fromName: productCode ? `${productCode.toUpperCase()} Team` : 'GetAIPilot Team'
  });

  // 5. Update email_jobs and insert email_events
  const finalStatus = sendResult.success ? 'sent' : 'failed';
  if (emailJobId && emailJobId !== 'in_memory') {
    await supabase
      .from('email_jobs')
      .update({
        status: finalStatus,
        provider: sendResult.provider,
        provider_message_id: sendResult.messageId || null,
        attempts: job.attemptsMade + 1
      })
      .eq('id', emailJobId);

    await supabase.from('email_events').insert({
      email_job_id: emailJobId,
      event_type: sendResult.success ? 'sent' : 'failed',
      event_data: {
        provider: sendResult.provider,
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl || null,
        error: sendResult.error || null
      }
    });
  }

  // 6. Increment campaign sent_count if successful
  if (sendResult.success && campaignId && campaignId.startsWith('camp_db_')) {
    const rawUuid = campaignId.replace('camp_db_', '');
    try {
      await supabase.rpc('increment_campaign_sent', { camp_id: rawUuid });
    } catch (err) {
      // Fallback if rpc is not present
    }
  }

  if (!sendResult.success) {
    throw new Error(sendResult.error || 'Failed to dispatch email');
  }

  return {
    success: true,
    status: 'sent',
    provider: sendResult.provider,
    messageId: sendResult.messageId,
    previewUrl: sendResult.previewUrl
  };
}

export function initCampaignWorker() {
  const campaignWorkerInstance = new Worker<CampaignJobPayload>(
    'campaign-email-queue',
    async (job) => processEmailJob(job, '📢 [Campaign Worker]'),
    { connection: redisConnection, concurrency: 10 }
  );

  const transactionalWorkerInstance = new Worker<CampaignJobPayload>(
    'transactional-email-queue',
    async (job) => processEmailJob(job, '⚡ [Transactional Worker]'),
    { connection: redisConnection, concurrency: 10 }
  );

  const setupEvents = (w: Worker<CampaignJobPayload>, label: string) => {
    w.on('completed', (job) => {
      console.log(`${label} Job ${job.id} completed: Delivered to ${job.data.recipientEmail}`);
      const camp = broadcastCampaigns.find((c) => c.id === job.data.campaignId);
      if (camp) {
        camp.queuedCount = Math.max(0, (camp.queuedCount || 0) - 1);
        camp.sentCount = (camp.sentCount || 0) + 1;
        if (camp.queuedCount === 0) {
          camp.status = 'completed';
          if (job.data.campaignId?.startsWith('camp_db_')) {
            const rawUuid = job.data.campaignId.replace('camp_db_', '');
            supabase.from('campaigns').update({ status: 'completed' }).eq('id', rawUuid).then();
          }
        }
      }
    });

    w.on('failed', (job, err) => {
      console.error(`${label} Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`);
    });

    w.on('error', () => {});
  };

  setupEvents(campaignWorkerInstance, '📢 [Campaign Worker]');
  setupEvents(transactionalWorkerInstance, '⚡ [Transactional Worker]');

  return { campaignWorkerInstance, transactionalWorkerInstance };
}
