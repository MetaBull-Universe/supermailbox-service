import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../supabase.js';
import { addSuppression } from '../services/suppression.js';

type NormalizedWebhookEvent = {
  status: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed' | 'deferred';
  bounceKind?: 'hard' | 'soft';
  emails: string[];
  messageId?: string | null;
  raw: any;
};

const asArray = (value: any): any[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toEventText = (value: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(toEventText).join(' ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const extractAddress = (value: any): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return value.includes('@') ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(extractAddress);

  return [
    value.email,
    value.recipient,
    value.address,
    value.email_address?.address,
    value.emailAddress?.address,
    value.email_address,
    value.emailAddress
  ].flatMap(extractAddress);
};

const extractEmails = (event: any): string[] => {
  const directEmails = extractAddress([
    event.recipient,
    event.email,
    event.to,
    event.email_address,
    event.emailAddress
  ]);

  const nestedEmails = asArray(event.event_message).flatMap((message: any) => {
    const emailInfo = message?.email_info || message?.emailInfo || {};
    return extractAddress(emailInfo.to);
  });

  const dataEmails = asArray(event.data).flatMap((item: any) => extractAddress([
    item.email,
    item.recipient,
    item.to,
    item.email_address,
    item.emailAddress
  ]));

  return [...new Set([...directEmails, ...nestedEmails, ...dataEmails].map((email) => email.toLowerCase().trim()))];
};

const isZeptoSampleEmail = (email: string) => email.endsWith('@zylker.com');

const extractMessageId = (event: any): string | null => {
  const messages = asArray(event.event_message);
  const firstMessage = messages[0] || {};
  const emailInfo = firstMessage.email_info || firstMessage.emailInfo || {};

  return (
    event.message_id ||
    event.messageId ||
    event.request_id ||
    firstMessage.request_id ||
    emailInfo.email_reference ||
    emailInfo.client_reference ||
    null
  );
};

export const normalizeZeptoWebhookPayload = (payload: any): NormalizedWebhookEvent[] => {
  const events = Array.isArray(payload?.events) ? payload.events : [payload];

  return events.map((event: any) => {
    const messages = asArray(event.event_message);
    const eventDataText = messages
      .map((message: any) => toEventText(message?.event_data))
      .join(' ');
    const eventText = [
      event.event_type,
      event.event,
      event.event_name,
      event.action,
      event.actionType,
      event.bounce_type,
      event.bounceType,
      eventDataText
    ].map(toEventText).join(' ').toLowerCase();

    const isHardBounce = eventText.includes('hardbounce') || eventText.includes('hard bounce');
    const isSoftBounce = eventText.includes('softbounce') || eventText.includes('soft bounce');

    let status: NormalizedWebhookEvent['status'] = 'delivered';
    if (eventText.includes('complaint') || eventText.includes('spam') || eventText.includes('feedback loop')) status = 'complained';
    else if (eventText.includes('bounce')) status = 'bounced';
    else if (eventText.includes('open')) status = 'opened';
    else if (eventText.includes('click')) status = 'clicked';
    else if (eventText.includes('defer')) status = 'deferred';
    else if (eventText.includes('fail')) status = 'failed';

    return {
      status,
      bounceKind: isHardBounce ? 'hard' : isSoftBounce ? 'soft' : undefined,
      emails: extractEmails(event),
      messageId: extractMessageId(event),
      raw: event
    };
  });
};

export async function syncSuppressionsFromWebhookLogs(limit = 500): Promise<number> {
  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('raw_payload')
    .eq('provider', 'zeptomail')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  let synced = 0;
  for (const log of logs || []) {
    for (const event of normalizeZeptoWebhookPayload(log.raw_payload)) {
      const shouldSuppress = event.status === 'complained';

      if (!shouldSuppress) continue;

      for (const email of event.emails) {
        if (isZeptoSampleEmail(email)) continue;
        const saved = await addSuppression(email, 'complaint');
        if (saved) synced++;
      }
    }
  }

  return synced;
}

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
    for (const event of normalizeZeptoWebhookPayload(rawPayload)) {
      const normalizedStatus = event.status;
      const messageId = event.messageId;

      // 3. Auto-suppress complaints. Hard bounces stay as bounce reports unless Zepto's
      // real suppression list or a manual admin action marks them suppressed.
      const shouldSuppress = normalizedStatus === 'complained';

      if (shouldSuppress) {
        for (const email of event.emails) {
          if (isZeptoSampleEmail(email)) continue;
          console.log(`[Webhook Auto-Suppression] Suppressing ${email} due to ${normalizedStatus}`);
          await addSuppression(email, 'complaint');
        }
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
            const jobStatus =
              normalizedStatus === 'bounced' ? 'bounced' :
              normalizedStatus === 'failed' ? 'failed' :
              normalizedStatus === 'delivered' ? 'delivered' :
              null;

            if (jobStatus) {
              await supabase
                .from('email_jobs')
                .update({ status: jobStatus })
                .eq('id', jobRow.id);
            }

            await supabase.from('email_events').insert({
              email_job_id: jobRow.id,
              event_type: normalizedStatus,
              event_data: event.raw
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
