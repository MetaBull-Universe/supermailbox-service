import { supabase } from '../supabase.js';

export async function renderTemplate(
  templateKey: string,
  variables: Record<string, any>
): Promise<{ subject: string; html: string }> {
  try {
    // Attempt to lookup template and its current live version from database
    const { data: templateRecord } = await supabase
      .from('email_templates')
      .select('id, current_version_id')
      .eq('key', templateKey)
      .single();

    if (templateRecord && templateRecord.current_version_id) {
      const { data: versionRecord } = await supabase
        .from('template_versions')
        .select('subject, html_source')
        .eq('id', templateRecord.current_version_id)
        .single();

      if (versionRecord) {
        return {
          subject: interpolateVariables(versionRecord.subject, variables),
          html: interpolateVariables(versionRecord.html_source, variables)
        };
      }
    }
  } catch (err) {
    // Fall back to clean dynamic default template if not found in DB
  }

  // Fallback default campaign HTML template
  const campaignName = variables.campaign_name || variables.campaignName || 'Announcement Blast';
  const name = variables.full_name || variables.name || variables.email?.split('@')[0] || 'Member';
  const defaultSubject = `${campaignName}`;

  const defaultHtml = `
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #E5E1E4; padding: 40px; border-radius: 16px; border: 1px solid #2A2A2C;">
      <div style="margin-bottom: 24px;">
        <span style="background: #0052FF; color: white; padding: 8px 18px; border-radius: 999px; font-weight: 700; font-size: 14px;">SupermailBox CPaaS &bull; Metabull Universe</span>
      </div>
      <h1 style="color: #FFFFFF; font-size: 24px; margin-bottom: 16px;">${campaignName}</h1>
      <p style="color: #C7C4D7; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #FFFFFF;">${name}</strong>,</p>
      <p style="color: #C7C4D7; font-size: 16px; line-height: 1.6;">
        We noticed that your GetAIPilot status or messaging preferences need your attention. Please log in to your dashboard to view new updates.
      </p>
      <div style="margin: 32px 0;">
        <a href="https://getaipilot.in/dashboard" style="background: #0052FF; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block;">
          Open Dashboard &rarr;
        </a>
      </div>
      <p style="color: #8E8D9E; font-size: 13px; border-top: 1px solid #2A2A2C; padding-top: 20px; margin-top: 36px;">
        Sent to ${variables.email || 'you'} via SupermailBox Dedicated Messaging Infrastructure
      </p>
    </div>
  `;

  return {
    subject: interpolateVariables(defaultSubject, variables),
    html: interpolateVariables(defaultHtml, variables)
  };
}

function interpolateVariables(source: string, variables: Record<string, any>): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}
