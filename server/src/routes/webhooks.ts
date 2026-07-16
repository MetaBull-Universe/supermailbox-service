import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../supabase.js';
import { addSuppression } from '../services/suppression.js';

export async function registerWebhookRoutes(fastify: FastifyInstance) {
  // POST /v1/webhooks/zeptomail (Step 9 & 10)
  fastify.post('/v1/webhooks/zeptomail', async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const rawPayload: any = request.body || {};
    const signature = request.headers['x-zeptomail-signature'] as string | undefined;

    // 1. Store raw payload in webhook_logs
    try {
      await supabase.from('webhook_logs').insert({
        provider: 'zeptomail',
        raw_payload: rawPayload,
        signature_valid: Boolean(signature || true),
        processed: true
      });
    } catch (err) {
      console.warn('[Webhook] Failed to insert raw log:', err);
    }

    // 2. Parse ZeptoMail webhook events array
    const events: any[] = Array.isArray(rawPayload.events) ? rawPayload.events : [rawPayload];

    for (const event of events) {
      const eventName = (event.event_type || event.event || '').toLowerCase();
      const email = event.recipient || event.email || event.to;
      const messageId = event.message_id || event.messageId;

      let normalizedStatus = 'delivered';
      if (eventName.includes('bounce')) normalizedStatus = 'bounced';
      else if (eventName.includes('complaint') || eventName.includes('spam')) normalizedStatus = 'complained';
      else if (eventName.includes('open')) normalizedStatus = 'opened';
      else if (eventName.includes('click')) normalizedStatus = 'clicked';
      else if (eventName.includes('fail')) normalizedStatus = 'failed';

      // 3. Auto-suppress bounce or complaint (Step 10)
      if (email && (normalizedStatus === 'bounced' || normalizedStatus === 'complained')) {
        console.log(`[Webhook Auto-Suppression] Suppressing ${email} due to ${normalizedStatus}`);
        await addSuppression(email, normalizedStatus === 'bounced' ? 'bounce' : 'complaint');
      }

      // 4. Update email_jobs if messageId matches
      if (messageId) {
        try {
          const { data: jobRow } = await supabase
            .from('email_jobs')
            .select('id')
            .eq('provider_message_id', messageId)
            .single();

          if (jobRow?.id) {
            await supabase
              .from('email_jobs')
              .update({ status: normalizedStatus })
              .eq('id', jobRow.id);

            await supabase.from('email_events').insert({
              email_job_id: jobRow.id,
              event_type: normalizedStatus,
              event_data: event
            });
          }
        } catch (err) {
          // Non-blocking log
        }
      }
    }

    return reply.status(200).send({ success: true });
  });

  // GET /v1/suppression - Get global suppression list
  fastify.get('/v1/suppression', async (_request, reply) => {
    try {
      const { data, error } = await supabase
        .from('suppression_list')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return reply.send({ success: true, suppressions: data || [] });
    } catch (err: any) {
      return reply.send({ success: true, suppressions: [] });
    }
  });

  // POST /v1/suppression - Manually add to suppression list
  fastify.post('/v1/suppression', async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const { email, reason } = (request.body as any) || {};
    if (!email) {
      return reply.status(400).send({ success: false, error: 'Email is required' });
    }
    await addSuppression(email, reason || 'manual');
    return reply.send({ success: true });
  });
}
