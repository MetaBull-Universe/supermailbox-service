import { supabase } from './supabase.js';

const DEMO_TEMPLATES = [
  {
    key: 'payment_success',
    name: 'Payment Receipt / Success Notice',
    category: 'transactional',
    versions: [
      {
        version_number: 3,
        status: 'live',
        created_by: 'Tanishq (DevOps)',
        subject: 'Receipt for your SupermailBox payment ({{invoice_id}})',
        html_source: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0e0e10; color: #e5e1e4; padding: 40px; border-radius: 16px; border: 1px solid #2a2a2c;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 999px; font-weight: bold; font-size: 18px; letter-spacing: -0.5px;">⚡ SupermailBox</div>
  </div>
  <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Payment Confirmed</h2>
  <p style="color: #c7c4d7; font-size: 16px; line-height: 1.6;">Hi <strong>{{name}}</strong>,</p>
  <p style="color: #c7c4d7; font-size: 16px; line-height: 1.6;">We have successfully processed your payment of <strong style="color: #4edea3;">{{amount}}</strong> for invoice <code style="background: #201f21; padding: 2px 8px; border-radius: 4px; color: #c0c1ff;">{{invoice_id}}</code>.</p>
  <div style="background: #1c1b1d; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #6366f1;">
    <p style="margin: 0; font-size: 14px; color: #908fa0;">Current Wallet Balance:</p>
    <p style="margin: 4px 0 0; font-size: 22px; font-weight: bold; color: #ffffff;">{{wallet_balance}}</p>
  </div>
  <p style="color: #908fa0; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #201f21; padding-top: 20px;">Sent via SupermailBox CPaaS Infrastructure &bull; Metabull Universe</p>
</div>`
      }
    ]
  },
  {
    key: 'otp_login',
    name: 'Two-Factor Authentication / Login OTP',
    category: 'transactional',
    versions: [
      {
        version_number: 1,
        status: 'live',
        created_by: 'Security Bot',
        subject: 'Your authentication code is {{otp_code}}',
        html_source: `<div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; background: #131315; color: #e5e1e4; padding: 40px; border-radius: 20px; border: 1px solid #353437; text-align: center;">
  <h2 style="color: #ffffff; font-size: 22px;">Verification Required</h2>
  <p style="color: #c7c4d7; font-size: 15px;">Hello {{name}}, enter the code below to complete your login attempt:</p>
  <div style="background: #201f21; padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid #464554;">
    <span style="font-family: 'JetBrains Mono', monospace; font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 6px;">{{otp_code}}</span>
  </div>
  <p style="color: #ffb4ab; font-size: 13px;">⚠️ This code expires in <strong>{{expires_in}}</strong>. Never share this code with anyone.</p>
</div>`
      }
    ]
  },
  {
    key: 'welcome_email',
    name: 'Developer Onboarding Welcome Blast',
    category: 'marketing',
    versions: [
      {
        version_number: 1,
        status: 'live',
        created_by: 'Elena Rostova',
        subject: 'Welcome to SupermailBox CPaaS Infrastructure, {{name}}! 🚀',
        html_source: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0c; color: #e5e1e4; padding: 40px; border-radius: 16px; border: 1px solid #6366f1;">
  <h1 style="color: #ffffff; font-size: 28px;">Welcome aboard, {{name}}!</h1>
  <p style="color: #c7c4d7; font-size: 16px;">You are now enrolled in the <strong style="color: #6ffbbe;">{{plan}}</strong> tier. You have full access to our global transactional email routing engines and 99.99% SLA queues.</p>
  <div style="margin: 32px 0; text-align: center;">
    <a href="{{setup_url}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Developer Console &rarr;</a>
  </div>
</div>`
      }
    ]
  },
  {
    key: 'getaipilot_verify_account',
    name: 'GetAiPilot Account Verification',
    category: 'transactional',
    versions: [
      {
        version_number: 1,
        status: 'live',
        created_by: 'Admin',
        subject: 'Verify your GetAiPilot Account',
        html_source: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GetAiPilot Email Template</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
  </style>
</head>

<body style="background-color:#f3f4f6; margin:0; padding:10px 16px; font-family: 'Outfit', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- PRE-HEADER (seen in inbox preview, hidden in the email body) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#ffffff;line-height:1px;">
    Don't miss out — verify your GetAiPilot account now!
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <div style="width:100%; max-width:480px; background-color:#ffffff; border-radius:16px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); overflow:hidden; margin:0 auto; text-align:left; box-sizing:border-box;">

          <!-- Logo -->
          <div style="padding:16px 0; text-align:center; box-sizing:border-box;">
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle; padding-right:8px;">
                  <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/logo.png" style="height:28px; display:block;" alt="GetAiPilot Logo">
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-weight:bold; color:#1f2937; font-size:22px;">getaipilot</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Hero -->
          <div style="margin:0; overflow:hidden; background: linear-gradient(to bottom right, #10183f, #1b2360, #8b3cff); color:#ffffff; padding:24px 20px; min-height:160px; position:relative; box-sizing:border-box;">

            <p style="font-size:16px; margin:0 0 4px 0; color:rgba(255,255,255,0.8);">Hi there,</p>

            <h1 style="font-size:28px; font-weight:bold; line-height:1.2; margin:0;">
              Your account is <br />
              almost <span style="color:#d8b4fe;">ready!</span>
            </h1>

            <p style="margin:8px 0 0 0; font-size:16px; color:rgba(255,255,255,0.8); max-width:210px; line-height:1.2;">
              Just one quick step left before you can start using GetAiPilot.
            </p>

            <!-- Paper plane -->
            <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/34.png" alt="Paper plane" style="position:absolute; top:12px; right:12px; width:24px;" >

            <!-- Envelope Card -->
            <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/10.png" style="position:absolute; right:8px; bottom:8px; width:140px; height:120px; border-radius:16px; transform:rotate(-8deg); box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);" >

          </div>

          <!-- Content -->
          <div style="padding:24px 16px 12px 16px; box-sizing:border-box;">
            <h2 style="text-align:center; font-weight:bold; color:#1f2937; margin:0 0 16px 0; font-size:16px;">
              Here's why verifying matters:
            </h2>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="width:48px; vertical-align:top;">
                  <div style="width:32px; height:32px; border-radius:12px; background-color:#f3e8ff; text-align:center; line-height:32px; box-sizing:border-box;">
                    <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/16.png" style="width:100%; height:100%; object-fit:contain; display:block;">
                  </div>
                </td>
                <td style="vertical-align:top; padding-top:4px;">
                  <h3 style="font-weight:bold; color:#1f2937; font-size:16px; margin:0;">Unlock full access</h3>
                  <p style="font-size:14px; color:#6b7280; margin:2px 0 0 0; line-height:1.2;">
                    Verifying your email unlocks every feature GetAiPilot has to offer.
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="width:48px; vertical-align:top;">
                  <div style="width:32px; height:32px; border-radius:12px; background-color:#f3e8ff; text-align:center; padding:6px; box-sizing:border-box;">
                    <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/34.png" style="width:100%; height:100%; object-fit:contain; display:block;">
                  </div>
                </td>
                <td style="vertical-align:top; padding-top:4px;">
                  <h3 style="font-weight:bold; color:#1f2937; font-size:16px; margin:0;">Keep your account secure</h3>
                  <p style="font-size:14px; color:#6b7280; margin:2px 0 0 0; line-height:1.2;">
                    Verification helps us keep your data safe and your account protected.
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td style="width:48px; vertical-align:top;">
                  <div style="width:32px; height:32px; border-radius:12px; background-color:#f3e8ff; text-align:center; line-height:24px;  box-sizing:border-box;">
                    <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/32.png" style="width:100%; height:100%; object-fit:contain; display:block;">
                  </div>
                </td>
                <td style="vertical-align:top; padding-top:4px;">
                  <h3 style="font-weight:bold; color:#1f2937; font-size:16px; margin:0;">It only takes a second</h3>
                  <p style="font-size:14px; color:#6b7280; margin:2px 0 0 0; line-height:1.2;">
                    One click is all it takes to confirm your account and get started.
                  </p>
                </td>
              </tr>
            </table>

          </div>

          <!-- CTA -->
          <div style="margin:0 16px 24px 16px; padding:24px 0 12px 0; border-top:1px solid #f3f4f6; box-sizing:border-box; display:flex; align-items:center; gap:20px;">
            <div style="flex:0 0 180px; width:180px; overflow:hidden; box-sizing:border-box;">
              <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/8.png" style="width:100%; height:auto; object-fit:contain; display:block;">
            </div>

            <div style="flex:1; text-align:left;">
              <h3 style="font-weight:bold; color:#1f2937; font-size:22px; margin:0;">Don't miss out!</h3>
              <p style="font-size:16px; color:#6b7280; margin:8px 0 20px 0; line-height:1.4;">
                Verify your account now to start exploring everything GetAiPilot has to offer.
              </p>

              <a href="{{ .ConfirmationURL }}" style="display:inline-block; background: linear-gradient(to right, #f43f5e, #8b5cf6); color:#ffffff; font-size:16px; font-weight:bold; padding:12px 24px; border-radius:8px; text-decoration:none; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); box-sizing:border-box;">
                Verify My Account &rarr;
              </a>
            </div>
          </div>

          <!-- Help -->
          <div style="margin:0 16px 16px 16px; background-color:#faf5ff; border-radius:12px; padding:16px; box-sizing:border-box;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:24px; vertical-align:top; padding-top:2px;">
                  <svg style="width:20px; height:20px; color:#8b5cf6;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </td>
                <td style="vertical-align:top; padding-left:12px;">
                  <h3 style="font-weight:bold; color:#1f2937; font-size:15px; margin:0;">Trouble verifying your account?</h3>
                  <p style="font-size:14px; color:#6b7280; margin:4px 0 0 0; line-height:1.4;">
                    Check out our <a href="#" style="color:#8b5cf6; text-decoration:none;">Help Center</a> or reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Fallback link -->
          <div style="margin:0 16px 12px 16px; padding:0 8px; text-align:center; box-sizing:border-box;">
            <p style="font-size:13px; color:#9ca3af; line-height:1.4; margin:0;">
              If the button doesn't work, copy and paste this URL into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#8b5cf6; word-break:break-all;">{{ .ConfirmationURL }}</a>
            </p>
          </div>

        </div>

        <!-- Outside Footer -->
        <div style="width:100%; max-width:400px; margin:24px auto 0 auto; text-align:center; box-sizing:border-box;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr>
              <td style="text-align:left; vertical-align:middle;">
                <!-- Social Icons -->
                <a href="#" style="display:inline-block; margin-right:12px; text-decoration:none;">
                  <div style="width:48px; height:48px; background-color:#ffffff; border-radius:12px; display:inline-block; text-align:center; line-height:48px; box-shadow:0 2px 5px rgba(0,0,0,0.08);">
                    <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/22.png" alt="Twitter" style="width:38px; height:38px; vertical-align:middle; display:inline-block;">
                  </div>
                </a>
                <a href="#" style="display:inline-block; margin-right:12px; text-decoration:none;">
                  <div style="width:48px; height:48px; background-color:#ffffff; border-radius:12px; display:inline-block; text-align:center; line-height:48px; box-shadow:0 2px 5px rgba(0,0,0,0.08);">
                    <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/23.png" alt="LinkedIn" style="width:38px; height:38px; vertical-align:middle; display:inline-block;">
                  </div>
                </a>
                <a href="#" style="display:inline-block; text-decoration:none;">
                  <div style="width:48px; height:48px; background-color:#ffffff; border-radius:12px; display:inline-block; text-align:center; line-height:48px; box-shadow:0 2px 5px rgba(0,0,0,0.08);">
                    <img src="https://uklxlappjcuvdqjvecfh.supabase.co/storage/v1/object/public/Emails%20images/24.png" alt="Instagram" style="width:38px; height:38px; vertical-align:middle; display:inline-block;">
                  </div>
                </a>
              </td>
              <td style="text-align:right; vertical-align:middle; font-size:13px; color:#6b7280;">
                Made with <span style="color:#8b5cf6;">&hearts;</span> by GetAiPilot team
              </td>
            </tr>
          </table>

          <p style="font-size:13px; color:#9ca3af; margin:0 0 4px 0; line-height:1.4;">
            You're receiving this email because you signed up for GetAiPilot and haven't verified your account yet.<br>
            If you didn't sign up for this, you can safely ignore this email.
          </p>
          <p style="font-size:13px; color:#9ca3af; margin:0;">
            &copy; 2026 GetAiPilot. All rights reserved.
          </p>

        </div>

      </td>
    </tr>
  </table>
</body>
</html>`
      }
    ]
  }
];

async function runSeed() {
  console.log('Seeding templates into Supabase...');

  // Get the product ID for getaipilot
  const { data: product } = await supabase.from('products').select('id').eq('code', 'getaipilot').single();
  
  if (!product) {
    console.error('Error: Product getaipilot not found. Cannot seed templates.');
    process.exit(1);
  }

  for (const tmpl of DEMO_TEMPLATES) {
    // Upsert Template
    const { data: insertedTmpl, error: tmplErr } = await supabase
      .from('email_templates')
      .upsert({
        product_id: product.id,
        key: tmpl.key,
        category: tmpl.category
      }, { onConflict: 'product_id,key' })
      .select('id').single();

    if (tmplErr) {
      console.error('Error inserting template', tmpl.key, tmplErr);
      continue;
    }

    const templateId = insertedTmpl.id;

    // Insert Version
    for (const v of tmpl.versions) {
      const { error: vErr } = await supabase
        .from('template_versions')
        .upsert({
          template_id: templateId,
          version_number: v.version_number,
          subject: v.subject,
          html_source: v.html_source,
          status: v.status,
          created_by: v.created_by
        }, { onConflict: 'template_id,version_number' });

      if (vErr) {
        console.error('Error inserting version for', tmpl.key, vErr);
      }
    }
  }

  console.log('Seed complete!');
}

runSeed().catch(console.error);
