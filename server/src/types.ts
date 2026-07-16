export interface TransactionalSendRequest {
  productCode: string;
  templateKey: string;
  to: string;
  variables: Record<string, any>;
  idempotencyKey: string;
}

export interface ManualSendRequest {
  recipientType: 'single' | 'bulk';
  recipient: string | string[];
  subject: string;
  htmlBody: string;
  templateKey?: string;
}

export interface EmailJobData {
  type: 'transactional' | 'campaign';
  recipient: string;
  subject: string;
  htmlBody: string;
  provider: 'zeptomail' | 'ses' | 'smtp';
  idempotencyKey: string;
  productCode?: string;
  templateKey?: string;
}

export interface ProviderResult {
  providerMessageId: string;
}

export interface NormalizedEvent {
  providerMessageId: string;
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';
  eventData?: any;
  occurredAt: string;
}

export interface BroadcastRecipient {
  email: string;
  full_name?: string;
  [key: string]: any;
}

export interface BroadcastRequestPayload {
  campaignName: string;
  templateKey: string;
  recipients: BroadcastRecipient[];
  scheduledAt?: string | null;
  subject?: string;
  notifyEmail?: string;
  webhookUrl?: string;
}

export interface CampaignJobPayload {
  emailJobId: string;
  campaignId: string;
  recipientEmail: string;
  recipientName?: string;
  templateKey: string;
  variables: Record<string, any>;
  productCode?: string;
}

export interface ProviderSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  previewUrl?: string;
}

export interface EmailProvider {
  name: string;
  send(input: {
    to: string;
    subject: string;
    html: string;
    fromName?: string;
    fromEmail?: string;
  }): Promise<ProviderSendResult>;
  verifyWebhookSignature(payload: any, signature?: string): boolean;
  parseWebhookEvent(payload: any): NormalizedEvent[];
}