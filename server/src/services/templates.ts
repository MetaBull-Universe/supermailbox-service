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

  // Fallback Templates if not found in DB
  let finalSubject = '';
  let finalHtml = '';

  const campaignName = variables.campaign_name || variables.campaignName || 'Announcement Blast';
  const name = variables.full_name || variables.name || variables.email?.split('@')[0] || 'Member';

  if (templateKey === 'auth_welcome') {
    finalSubject = 'Welcome to QuickPost! 🎉';
    finalHtml = `
      <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #eaeaea;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: 800;">QuickPost</h2>
        </div>
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 20px;">Welcome aboard, ${name}!</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          We are thrilled to have you! Your account is officially active and ready to go. You can now start scheduling, publishing, and managing all your social media posts from one central dashboard.
        </p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Status: <span style="color: #10b981;">{{otp_code}}</span></p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="https://quickpost.app/dashboard" style="background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Go to Dashboard</a>
        </div>
      </div>
    `;
  } else if (templateKey === 'broadcast_notification') {
    const platforms = Array.isArray(variables.platforms) ? variables.platforms.join(', ') : (variables.platforms || 'All Platforms');
    finalSubject = 'Post Published: {{campaign_name}}';
    finalHtml = `
      <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #eaeaea;">
        <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
          <h2 style="color: #3b82f6; margin: 0; font-size: 22px; font-weight: 800;">QuickPost</h2>
          <span style="background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">PUBLISHED</span>
        </div>
        <h1 style="color: #111827; font-size: 20px; margin-bottom: 16px;">Hey ${name}, your post is live!</h1>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your campaign <strong>{{campaign_name}}</strong> has been successfully broadcasted to your social channels.
        </p>
        
        <div style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
            Post Details
          </div>
          <div style="padding: 16px;">
            <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;"><strong>Platforms:</strong> ${platforms}</p>
            <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Caption:</strong> <br/><span style="color: #6b7280; font-style: italic;">"{{caption}}"</span></p>
          </div>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; text-align: center;">Sent securely via Supermailbox CPaaS</p>
      </div>
    `;
  } else if (templateKey === 'account_connected') {
    finalSubject = 'New Social Account Connected: {{platform}}';
    finalHtml = `
      <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #eaeaea;">
        <div style="margin-bottom: 24px;">
          <h2 style="color: #3b82f6; margin: 0; font-size: 22px; font-weight: 800;">QuickPost</h2>
        </div>
        <h1 style="color: #111827; font-size: 20px; margin-bottom: 16px;">Success! ${name}</h1>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          You have successfully connected a new <strong>{{platform}}</strong> account to your QuickPost dashboard!
        </p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          You can now start publishing and scheduling posts to this account immediately.
        </p>
      </div>
    `;
  } else if (templateKey === 'automation_created') {
    finalSubject = 'AutoDM Automation Created: {{automation_name}}';
    finalHtml = `
      <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #eaeaea;">
        <div style="margin-bottom: 24px;">
          <h2 style="color: #3b82f6; margin: 0; font-size: 22px; font-weight: 800;">QuickPost AutoDM</h2>
        </div>
        <h1 style="color: #111827; font-size: 20px; margin-bottom: 16px;">Automation Active, ${name}!</h1>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your new AutoDM automation <strong>{{automation_name}}</strong> has been successfully created and is now active!
        </p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          It will now automatically respond to users based on your configured trigger ({{trigger_type}}).
        </p>
      </div>
    `;
  } else {
    // Default fallback
    finalSubject = `${campaignName}`;
    finalHtml = `
      <div style="font-family: Inter, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #E5E1E4; padding: 40px; border-radius: 16px; border: 1px solid #2A2A2C;">
        <div style="margin-bottom: 24px;">
          <span style="background: #0052FF; color: white; padding: 8px 18px; border-radius: 999px; font-weight: 700; font-size: 14px;">SupermailBox CPaaS</span>
        </div>
        <h1 style="color: #FFFFFF; font-size: 24px; margin-bottom: 16px;">${campaignName}</h1>
        <p style="color: #C7C4D7; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #FFFFFF;">${name}</strong>,</p>
        <p style="color: #C7C4D7; font-size: 16px; line-height: 1.6;">
          You have a new notification or update.
        </p>
        <p style="color: #8E8D9E; font-size: 13px; border-top: 1px solid #2A2A2C; padding-top: 20px; margin-top: 36px;">
          Sent to ${variables.email || 'you'} via SupermailBox Dedicated Messaging Infrastructure
        </p>
      </div>
    `;
  }

  return {
    subject: interpolateVariables(finalSubject, variables),
    html: interpolateVariables(finalHtml, variables)
  };
}

function interpolateVariables(source: string, variables: Record<string, any>): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}
