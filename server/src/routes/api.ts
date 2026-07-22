import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../supabase.js';
import { campaignQueue, transactionalQueue } from '../queues/campaignQueue.js';
import { addResponsiveEmailFixes } from '../services/responsiveEmail.js';
import { fetchGetAiPilotUsers } from '../services/getaipilotUsers.js';
import { addSuppression, removeSuppression } from '../services/suppression.js';
import { syncSuppressionsFromWebhookLogs } from './webhooks.js';

const normalizeProjectCode = (value?: string | null) => {
  if (!value) return 'unknown';
  const normalized = value.trim();
  if (!normalized) return 'unknown';
  if (normalized.toLowerCase() === 'socialpilot') return 'socialpilot';
  return normalized;
};

const extractEmailFromIdempotencyKey = (idempotencyKey?: string | null) => {
  if (!idempotencyKey) return null;
  const emailParts = idempotencyKey
    .split(/[\s|,;]+/)
    .flatMap((part) => part.split('_'))
    .filter((part) => part.includes('@'));

  const candidate = emailParts.find((part) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part));
  if (candidate) return candidate;

  const match = idempotencyKey.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.replace(/^camp_\d+_/i, '') || null;
};

const extractProjectFromIdempotencyKey = (idempotencyKey?: string | null) => {
  if (!idempotencyKey) return 'unknown';
  const bracketMatch = idempotencyKey.match(/^\[([^\]]+)\]/);
  if (bracketMatch?.[1]) return normalizeProjectCode(bracketMatch[1]);
  if (idempotencyKey.toLowerCase().includes('socialpilot')) return 'socialpilot';
  if (idempotencyKey.toUpperCase().includes('GAP_WHATSAPP')) return 'GAP_WHATSAPP';
  return 'unknown';
};

const formatSuppression = (s: any) => ({
  id: s.id,
  email: s.email,
  reason: s.reason,
  dateAdded: new Date(s.created_at).toISOString().replace('T', ' ').substring(0, 16),
  linkedIdentities: []
});

const parseZeptoExportDate = (value?: string | null) => {
  if (!value) return new Date().toISOString();
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
  if (!match) return new Date(value).toISOString();

  const [, day, month, year, hourText, minute, second, meridiem] = match;
  let hour = Number(hourText);
  if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour,
    Number(minute),
    Number(second)
  ).toISOString();
};

const classifyBounceReason = (reason: string, bounceType: 'hard' | 'soft') => {
  const text = reason.toLowerCase();
  if (text.includes('overquota') || text.includes('quota') || text.includes('storage') || text.includes('mailbox full')) {
    return 'Over quota';
  }
  if (text.includes('nxdomain') || text.includes('domain not found') || text.includes('host not reachable')) {
    return bounceType === 'hard' ? 'Domain not found' : 'Connection issue';
  }
  if (text.includes('no mailbox') || text.includes('5.1.1') || text.includes('user unknown')) {
    return 'User not found';
  }
  if (text.includes('policy') || text.includes('rejected')) {
    return 'Policy failure';
  }
  return bounceType === 'hard' ? 'Permanent failure' : 'Temporary failure';
};

const formatBounceRecord = (record: any, fallbackId: string) => {
  const bounceType = record.bounceType === 'soft' ? 'soft' : 'hard';
  const reason = record.reason || record.diagnostic || '';
  const processedAt = record.processedAt || record.timestamp || new Date().toISOString();
  const displayTime = new Date(processedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return {
    id: record.id || fallbackId,
    email: String(record.email || '').toLowerCase().trim(),
    bounceType,
    category: record.category || classifyBounceReason(reason, bounceType),
    reason,
    subject: record.subject || 'Unknown subject',
    source: record.source || 'ZeptoMail',
    processedAt,
    displayTime
  };
};

export async function registerApiRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/getaipilot/users', async (_request, reply) => {
    try {
      const users = await fetchGetAiPilotUsers();
      return reply.send({ success: true, users });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // ==========================
  // TEMPLATES
  // ==========================
  fastify.get('/v1/templates', async (_request, reply) => {
    try {
      // Fetch templates with their versions
      const { data: templatesData, error } = await supabase
        .from('email_templates')
        .select('id, key, category');

      if (error) throw error;

      const { data: versionsData, error: vError } = await supabase
        .from('template_versions')
        .select('template_id, version_number, subject, html_source, status, created_at, created_by');

      if (vError) throw vError;

      // Map to frontend expected format
      const templates = (templatesData || []).map((t: any) => {
        const tVersions = (versionsData || []).filter((v: any) => v.template_id === t.id);
        
        return {
          key: t.key,
          name: t.key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          category: t.category,
          versions: tVersions.map((v: any) => ({
          version: `v${v.version_number} (${v.status})`,
          author: v.created_by || 'Admin',
          status: v.status === 'live' ? 'Live' : (v.status === 'approved' ? 'Approved' : 'Draft'),
          date: new Date(v.created_at).toISOString().replace('T', ' ').substring(0, 16),
          subject: v.subject,
          html: v.html_source,
          variables: [] // Variables could be parsed from HTML if needed
        })).sort((a: any, b: any) => b.version.localeCompare(a.version))
        };
      });

      return reply.send({ success: true, templates });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
    
  fastify.post('/v1/templates', async (request: FastifyRequest<{ Body: any }>, reply) => {
    try {
      const { key, name, category, html, subject } = request.body as any;
      const responsiveHtml = addResponsiveEmailFixes(html || '');
      
      let { data: product } = await supabase.from('products').select('id').eq('code', 'getaipilot').single();
      
      // Upsert template
      const { data: tmpl, error: tmplErr } = await supabase
        .from('email_templates')
        .insert({ product_id: product?.id, key, category })
        .select('id').single();

      if (tmplErr && tmplErr.code !== '23505') throw tmplErr; // ignore unique constraint if exists
      
      const templateId = tmpl?.id || (await supabase.from('email_templates').select('id').eq('key', key).single()).data?.id;

      // Get latest version number
      const { data: versions } = await supabase.from('template_versions').select('version_number').eq('template_id', templateId).order('version_number', { ascending: false }).limit(1);
      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // Insert version
      const { data: versionRow, error: versionInsertError } = await supabase.from('template_versions').insert({
        template_id: templateId,
        version_number: nextVersion,
        subject: subject,
        html_source: responsiveHtml,
        status: 'live',
        created_by: 'Admin'
      }).select('id').single();

      if (versionInsertError) throw versionInsertError;

      if (versionRow?.id) {
        await supabase
          .from('email_templates')
          .update({ current_version_id: versionRow.id })
          .eq('id', templateId);
      }

      return reply.send({ success: true });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });


  // ==========================
  // CAMPAIGNS (handled in email.ts)
  // ==========================


  // ==========================
  // SUPPRESSIONS
  // ==========================
  fastify.get('/v1/suppressions', async (_request, reply) => {
    try {
      await syncSuppressionsFromWebhookLogs();

      const { data: suppressions, error } = await supabase
        .from('suppression_list')
        .select('id, email, reason, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (suppressions || []).map(formatSuppression);

      return reply.send({ success: true, suppressions: formatted });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.post('/v1/suppressions', async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      const { email, reason } = (request.body as any) || {};
      if (!email) {
        return reply.status(400).send({ success: false, error: 'Email is required' });
      }

      const suppression = await addSuppression(email, reason || 'manual');
      if (!suppression) {
        return reply.status(500).send({ success: false, error: 'Unable to save suppression entry' });
      }

      return reply.send({ success: true, suppression: formatSuppression(suppression) });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.delete('/v1/suppressions/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const deleted = await removeSuppression(request.params.id);
      if (!deleted) {
        return reply.status(500).send({ success: false, error: 'Unable to remove suppression entry' });
      }

      return reply.send({ success: true });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.get('/v1/bounce-reports', async (_request, reply) => {
    try {
      const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('id, provider, raw_payload, received_at')
        .in('provider', ['zeptomail_export'])
        .order('received_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const bounceReports = (logs || []).flatMap((log: any) => {
        const records = Array.isArray(log.raw_payload?.records)
          ? log.raw_payload.records
          : Array.isArray(log.raw_payload)
          ? log.raw_payload
          : [log.raw_payload];

        return records.map((record: any, index: number) => formatBounceRecord(record, `${log.id}_${index}`));
      }).filter((record: any) => record.email);

      const seen = new Set<string>();
      const uniqueReports = bounceReports.filter((record: any) => {
        const key = `${record.email}:${record.bounceType}:${record.processedAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a: any, b: any) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());

      return reply.send({ success: true, bounces: uniqueReports });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  fastify.post('/v1/bounce-reports/import', async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      const { records } = (request.body as any) || {};
      if (!Array.isArray(records) || records.length === 0) {
        return reply.status(400).send({ success: false, error: 'records array is required' });
      }

      const normalizedRecords = records
        .map((record: any) => ({
          email: String(record.email || '').toLowerCase().trim(),
          bounceType: record.bounceType === 'soft' ? 'soft' : 'hard',
          reason: record.reason || '',
          category: record.category,
          subject: record.subject || 'Unknown subject',
          processedAt: parseZeptoExportDate(record.processedAt),
          source: 'ZeptoMail export'
        }))
        .filter((record: any) => record.email);

      const { error } = await supabase.from('webhook_logs').insert({
        provider: 'zeptomail_export',
        raw_payload: {
          source: 'zeptomail_export',
          imported_at: new Date().toISOString(),
          records: normalizedRecords
        },
        signature_valid: true,
        processed: true
      });

      if (error) throw error;

      for (const record of normalizedRecords) {
        if (record.bounceType === 'hard') {
          await addSuppression(record.email, 'bounce');
        }
      }

      return reply.send({ success: true, imported: normalizedRecords.length });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });


  // ==========================
  // DASHBOARD STATS
  // ==========================
  fastify.get('/v1/dashboard/stats', async (_request, reply) => {
    try {
      // Total campaigns sent
      const { count: totalCampaigns } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
      const { data: recentJobs } = await supabase
        .from('email_jobs')
        .select(`
          id, type, provider, status, created_at, idempotency_key,
          campaigns ( product_id, products ( code ) ),
          contacts ( primary_email )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const logs = (recentJobs || []).map((j: any) => {
        const extractedEmail = j.contacts?.primary_email || extractEmailFromIdempotencyKey(j.idempotency_key) || 'unknown@recipient.com';
        const projectCode = normalizeProjectCode(j.campaigns?.products?.code) !== 'unknown'
          ? normalizeProjectCode(j.campaigns?.products?.code)
          : extractProjectFromIdempotencyKey(j.idempotency_key);
        return {
          id: j.id,
          timestamp: new Date(j.created_at).toLocaleTimeString(),
          recipient: extractedEmail,
          type: j.type === 'campaign' ? 'Campaign' : 'Transactional',
          provider: `${j.provider || 'ZeptoMail'}${projectCode !== 'unknown' ? ` (${projectCode})` : ''}`,
          status: j.status === 'delivered' ? 'Delivered' : (j.status === 'failed' ? 'Failed' : 'Sent')
        };
      });

      // Fetch aggregate stats
      const { count: totalSent } = await supabase.from('email_jobs').select('*', { count: 'exact', head: true }).in('status', ['sent', 'delivered']);
      const { count: totalBounced } = await supabase.from('email_jobs').select('*', { count: 'exact', head: true }).eq('status', 'bounced');
      const { count: totalDelivered } = await supabase.from('email_jobs').select('*', { count: 'exact', head: true }).eq('status', 'delivered');
      
      const { count: totalOpened } = await supabase.from('email_events').select('*', { count: 'exact', head: true }).eq('event_type', 'opened');
      const { count: totalClicked } = await supabase.from('email_events').select('*', { count: 'exact', head: true }).eq('event_type', 'clicked');

      const sentCount = totalSent || 0;
      const bounceCount = totalBounced || 0;
      const deliveredCount = totalDelivered || 0;
      const openCount = totalOpened || 0;
      const clickCount = totalClicked || 0;

      const deliveryRate = sentCount > 0 ? ((deliveredCount / sentCount) * 100).toFixed(1) : '0.0';
      const bounceRate = sentCount > 0 ? ((bounceCount / sentCount) * 100).toFixed(1) : '0.0';
      const openRate = deliveredCount > 0 ? ((openCount / deliveredCount) * 100).toFixed(1) : '0.0';
      const clickRate = deliveredCount > 0 ? ((clickCount / deliveredCount) * 100).toFixed(1) : '0.0';

      const metrics = [
        {
          title: 'Total Campaigns',
          value: totalCampaigns || 0,
          subtitle: 'Lifetime blast campaigns',
          status: 'normal'
        },
        {
          title: 'Total Sent',
          value: sentCount,
          subtitle: 'Total processed emails',
          status: 'success'
        },
        {
          title: 'Delivered / Bounce Rate',
          value: `${deliveryRate}% / ${bounceRate}%`,
          subtitle: 'Sender reputation metrics',
          status: 'success',
          progress: parseFloat(deliveryRate)
        },
        {
          title: 'Open & Click Rate',
          value: `${openRate}% / ${clickRate}%`,
          subtitle: 'Engagement across campaigns',
          status: 'normal',
          progress: parseFloat(openRate)
        }
      ];

// ... inside stats route
      const cActive = await campaignQueue.getJobs(['active']);
      const cWaiting = await campaignQueue.getJobs(['waiting']);
      const cDelayed = await campaignQueue.getJobs(['delayed']);
      const cFailed = await campaignQueue.getFailed(0, 10);
      
      const allQJobs = [...cActive, ...cWaiting, ...cDelayed, ...cFailed];
      
      const queueJobs = await Promise.all(allQJobs.map(async j => ({
        id: j.id || `job_${Math.random()}`,
        status: await j.getState(),
        recipient: j.data.recipientEmail || 'unknown@recipient.com',
        templateKey: j.data.templateKey || 'unknown',
        attempts: j.attemptsMade || 0,
        timestamp: new Date(j.timestamp || Date.now()).toLocaleTimeString(),
        error: j.failedReason,
        payload: j.data.variables || {}
      })));

      return reply.send({ success: true, metrics, logs, queueJobs });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // ==========================
  // LOGS BY PROJECT
  // ==========================
  fastify.get('/v1/logs/by-project', async (_request, reply) => {
    try {
      const { data: dbJobs, error } = await supabase
        .from('email_jobs')
        .select(`
          id, type, provider, status, created_at, idempotency_key, attempts,
          campaigns ( product_id, products ( code ) ),
          contacts ( primary_email )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const grouped: Record<string, any[]> = {
        'GAP_WHATSAPP': [],
        'socialpilot': []
      };

      (dbJobs || []).forEach((j: any) => {
        let projectCode = 'unknown';
        let extractedEmail = 'unknown@recipient.com';
        
        // Extract email
        if (j.contacts?.primary_email) {
          extractedEmail = j.contacts.primary_email;
        } else {
          extractedEmail = extractEmailFromIdempotencyKey(j.idempotency_key) || extractedEmail;
        }

        // Extract project code
        if (j.campaigns?.products?.code) {
          projectCode = normalizeProjectCode(j.campaigns.products.code);
        } else {
          projectCode = extractProjectFromIdempotencyKey(j.idempotency_key);
        }

        if (projectCode === 'unknown') return; // Skip unknown legacy logs

        if (!grouped[projectCode]) {
          grouped[projectCode] = [];
        }

        grouped[projectCode].push({
          id: j.id,
          timestamp: j.created_at,
          recipient: extractedEmail,
          type: j.type === 'campaign' ? 'Campaign' : 'Transactional',
          provider: j.provider || 'ZeptoMail',
          status: j.status === 'delivered' ? 'Delivered' : (j.status === 'failed' ? 'Failed' : (j.status === 'sent' ? 'Sent' : 'Queued')),
          attempts: j.attempts
        });
      });

      return reply.send({ success: true, projects: grouped });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

}
