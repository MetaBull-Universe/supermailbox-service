import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../supabase.js';
import { campaignQueue, transactionalQueue } from '../queues/campaignQueue.js';

export async function registerApiRoutes(fastify: FastifyInstance) {
  
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
      await supabase.from('template_versions').insert({
        template_id: templateId,
        version_number: nextVersion,
        subject: subject,
        html_source: html,
        status: 'live',
        created_by: 'Admin'
      });

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
      const { data: suppressions, error } = await supabase
        .from('suppression_list')
        .select('id, email, reason, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (suppressions || []).map((s: any) => ({
        id: s.id,
        email: s.email,
        reason: s.reason,
        dateAdded: new Date(s.created_at).toISOString().replace('T', ' ').substring(0, 16),
        linkedIdentities: [] 
      }));

      return reply.send({ success: true, suppressions: formatted });
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
          contacts ( primary_email )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const logs = (recentJobs || []).map((j: any) => {
        let extractedEmail = 'unknown@recipient.com';
        if (j.contacts?.primary_email) {
          extractedEmail = j.contacts.primary_email;
        } else if (j.idempotency_key) {
          const parts = j.idempotency_key.split('_');
          const emailPart = parts.find((p: string) => p.includes('@'));
          if (emailPart) extractedEmail = emailPart;
        }
        return {
          id: j.id,
          timestamp: new Date(j.created_at).toLocaleTimeString(),
          recipient: extractedEmail,
          type: j.type === 'campaign' ? 'Campaign' : 'Transactional',
          provider: j.provider || 'ZeptoMail',
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
        } else if (j.idempotency_key) {
          const parts = j.idempotency_key.split('_');
          const emailPart = parts.find((p: string) => p.includes('@'));
          if (emailPart) extractedEmail = emailPart;
        }

        // Extract project code
        if (j.campaigns?.products?.code) {
          projectCode = j.campaigns.products.code;
        } else if (j.idempotency_key && j.idempotency_key.startsWith('[')) {
          const closingIdx = j.idempotency_key.indexOf(']');
          if (closingIdx > -1) {
            projectCode = j.idempotency_key.substring(1, closingIdx);
          }
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
