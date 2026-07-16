import { SendMailClient } from 'zeptomail';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface MailerConfig {
  provider: 'zeptomail' | 'smtp' | 'ses' | 'ethereal';
  zeptoUrl?: string;
  zeptoApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
}

// Runtime dynamic config prioritized for ZeptoMail as per user's credentials
let currentConfig: MailerConfig = {
  provider: (process.env.ZEPTOMAIL_API_KEY && !process.env.ZEPTOMAIL_API_KEY.includes('placeholder')) ? 'zeptomail' : 'ethereal',
  zeptoUrl: process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.in/v1.1/email',
  zeptoApiKey: process.env.ZEPTOMAIL_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@getaipilot.com'
};

export function getMailerConfig(): MailerConfig {
  return currentConfig;
}

export function updateMailerConfig(newConfig: Partial<MailerConfig>): MailerConfig {
  currentConfig = { ...currentConfig, ...newConfig };
  return currentConfig;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  provider: string;
  error?: string;
}

export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const cfg = currentConfig;
  const fromEmail = cfg.fromEmail || 'noreply@getaipilot.com';
  const fromName = options.fromName || 'noreply';

  // 1. ZeptoMail SDK / REST API Provider (Primary Transactional Provider)
  if (cfg.provider === 'zeptomail' && cfg.zeptoApiKey && !cfg.zeptoApiKey.includes('placeholder')) {
    const targetUrl = cfg.zeptoUrl || 'https://api.zeptomail.in/v1.1/email';
    console.log('\n======================================================');
    console.log(`[ZEPTOMAIL SEND ATTEMPT]`);
    console.log(`Endpoint : ${targetUrl}`);
    console.log(`From     : ${fromName} <${fromEmail}>`);
    console.log(`To       : ${options.to}`);
    console.log(`Subject  : ${options.subject}`);
    console.log('======================================================');

    try {
      const zeptoClient = new SendMailClient({
        url: targetUrl,
        token: cfg.zeptoApiKey
      });

      const response = await zeptoClient.sendMail({
        from: {
          address: fromEmail,
          name: fromName
        },
        to: [
          {
            email_address: {
              address: options.to,
              name: options.to.split('@')[0]
            }
          }
        ],
        subject: options.subject,
        htmlbody: options.html
      });

      console.log('[ZEPTOMAIL SDK SUCCESS RESPONSE]:', JSON.stringify(response, null, 2));
      console.log('======================================================\n');

      return {
        success: true,
        messageId: response?.data?.[0]?.message_id || `zepto_${Date.now()}`,
        provider: 'ZeptoMail (.IN API)'
      };
    } catch (sdkErr: any) {
      console.error('[ZEPTOMAIL SDK FAILED - RETRYING VIA DIRECT HTTPS REST API]:', sdkErr?.error || sdkErr?.message || sdkErr);
      
      // Direct HTTP fetch fallback to ensure delivery even if SDK wrapper throws
      try {
        const fetchRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': cfg.zeptoApiKey.startsWith('Zoho-enczapikey') ? cfg.zeptoApiKey : `Zoho-enczapikey ${cfg.zeptoApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: { address: fromEmail, name: fromName },
            to: [{ email_address: { address: options.to, name: options.to.split('@')[0] } }],
            subject: options.subject,
            htmlbody: options.html
          })
        });

        const fetchData = await fetchRes.json() as any;
        console.log(`[ZEPTOMAIL DIRECT REST API STATUS]: ${fetchRes.status} ${fetchRes.statusText}`);
        console.log('[ZEPTOMAIL DIRECT REST API BODY]:', JSON.stringify(fetchData, null, 2));
        console.log('======================================================\n');

        if (!fetchRes.ok) {
          throw new Error(fetchData?.message || JSON.stringify(fetchData));
        }

        return {
          success: true,
          messageId: fetchData?.data?.[0]?.message_id || `zepto_${Date.now()}`,
          provider: 'ZeptoMail (.IN REST API)'
        };
      } catch (directErr: any) {
        console.error('[ZEPTOMAIL DIRECT REST API ALSO FAILED]:', directErr?.message || directErr);
        console.log('======================================================\n');
        return { success: false, provider: 'ZeptoMail (.IN API)', error: directErr?.message || sdkErr?.message || 'ZeptoMail Error' };
      }
    }
  }

  // 2. SMTP Provider (Amazon SES / Custom SMTP)
  if (cfg.provider === 'smtp' && cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort || 587,
        secure: cfg.smtpPort === 465,
        auth: {
          user: cfg.smtpUser,
          pass: cfg.smtpPass
        }
      });

      const info = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: `SMTP (${cfg.smtpHost})`
      };
    } catch (err: any) {
      console.error('SMTP send error:', err);
      return { success: false, provider: `SMTP (${cfg.smtpHost})`, error: err.message || 'SMTP error' };
    }
  }

  // 3. Ethereal Email automatically generated fallback
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SupermailBox Mailer] Delivered via Ethereal. Preview URL: ${previewUrl}`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      provider: 'Ethereal Live Test Inbox'
    };
  } catch (err: any) {
    return { success: false, provider: 'Ethereal', error: err.message };
  }
}
