// API Service connecting to Real Fastify Backend

export interface MetricCardData {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  status?: 'success' | 'alert' | 'normal' | 'loading';
  progress?: number;
}

export interface QueueJob {
  id: string;
  status: 'active' | 'waiting' | 'delayed' | 'failed';
  recipient: string;
  templateKey: string;
  attempts: number;
  timestamp: string;
  error?: string;
  payload: any;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  recipient: string;
  type: 'Transactional' | 'Campaign';
  provider: 'ZeptoMail' | 'SES' | 'Resend';
  status: 'Delivered' | 'Bounced' | 'Sent' | 'Queued' | 'Failed';
}

export interface TemplateVersion {
  version: string;
  author: string;
  status: 'Live' | 'Approved' | 'Draft';
  date: string;
  subject: string;
  html: string;
  variables: string[];
}

export interface Template {
  key: string;
  name: string;
  category: 'transactional' | 'marketing';
  versions: TemplateVersion[];
}

export interface Campaign {
  id: string;
  name: string;
  templateKey: string;
  audienceCount: number;
  sentCount: number;
  deliveredRate: number;
  openRate: number;
  status: 'active' | 'completed' | 'paused' | 'scheduled';
  scheduledAt?: string;
}

export interface SuppressionItem {
  id: string;
  email: string;
  reason: 'bounce' | 'complaint' | 'unsubscribe' | 'manual';
  dateAdded: string;
  linkedIdentities?: string[];
}

export interface BounceReportItem {
  id: string;
  email: string;
  bounceType: 'hard' | 'soft';
  category: string;
  reason: string;
  subject: string;
  source: string;
  processedAt: string;
  displayTime: string;
}

export interface GetAIPilotUser {
  id: string;
  email: string;
  full_name: string;
  account_type: string;
  country: string;
  created_at: string;
  status: string;
  onboarding_completed?: boolean;
  onboarding_status?: string;
  tour_seen?: boolean;
  tour_completed?: boolean;
  tour_step?: number;
  is_verified?: boolean;
}

export interface BroadcastResult {
  success?: boolean;
  error?: string;
  campaignId?: string;
  queued?: number;
  campaign?: Campaign;
  providerUsed?: string;
  previewUrl?: string | null;
  deliveryResults?: {
    email: string;
    success: boolean;
    provider: string;
    previewUrl?: string | null;
    error?: string | null;
  }[];
}

export interface CampaignJobStats {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  suppressed: number;
}

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/v1` : 'http://localhost:5050/v1';
const REQUEST_TIMEOUT_MS = 5000;

const fetchWithTimeout = async (url: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

export class ApiService {
  static async getCampaignJobStats(campaignId: string): Promise<CampaignJobStats> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/campaigns/${campaignId}/jobs`);
      if (res.ok) {
        const data = await res.json();
        if (data?.stats) return data.stats;
      }
    } catch (err) {
      console.warn('API getCampaignJobStats failed:', err);
    }
    return { queued: 0, sending: 0, sent: 0, failed: 0, suppressed: 0 };
  }

  static async getMetrics(): Promise<MetricCardData[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) return data.metrics;
      }
    } catch (err) {
      console.warn('API getMetrics failed:', err);
    }
    return [];
  }

  static async getQueueJobs(): Promise<QueueJob[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.queueJobs) return data.queueJobs;
      }
    } catch (err) {
      console.warn('API getQueueJobs failed:', err);
    }
    return [];
  }

  static async getActivityLogs(): Promise<ActivityLog[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) return data.logs;
      }
    } catch (err) {
      console.warn('API getActivityLogs failed:', err);
    }
    return [];
  }

  static async getProjectLogs(): Promise<Record<string, ActivityLog[]>> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/logs/by-project`);
      if (res.ok) {
        const data = await res.json();
        if (data.projects) return data.projects;
      }
    } catch (err) {
      console.warn('API getProjectLogs failed:', err);
    }
    return {};
  }

  static async getTemplates(): Promise<Template[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/templates`);
      if (res.ok) {
        const data = await res.json();
        if (data.templates) return data.templates;
      }
    } catch (err) {
      console.warn('API getTemplates failed:', err);
    }
    return [];
  }

  static async saveTemplate(data: { key: string; name?: string; category?: string; html: string; subject: string }): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (err) {
      console.warn('API saveTemplate failed:', err);
      return false;
    }
  }

  static async getCampaigns(): Promise<Campaign[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/campaigns`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.campaigns)) return data.campaigns;
      }
    } catch (err) {
      console.warn('API getCampaigns failed:', err);
    }
    return [];
  }

  static async broadcastCampaign(
    campaignName: string,
    templateKey: string,
    recipients: { email: string; full_name: string }[],
    scheduledAt?: string
  ): Promise<BroadcastResult> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer supermailbox-secret-key-12345'
        },
        body: JSON.stringify({ campaignName, templateKey, recipients, scheduledAt })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          campaignId: data.campaignId,
          queued: data.queued,
          providerUsed: 'Redis BullMQ Worker Pipeline (ZeptoMail / SMTP)',
          campaign: {
            id: data.campaignId || `camp_${Date.now()}`,
            name: campaignName,
            templateKey,
            audienceCount: recipients.length,
            sentCount: 0,
            deliveredRate: 0,
            openRate: 0,
            status: 'active'
          }
        };
      } else {
        const errText = await res.text();
        console.error('Backend broadcast non-OK response:', res.status, errText);
        return { success: false, queued: 0, error: errText };
      }
    } catch (err) {
      console.error('Broadcast fetch error:', err);
      return { success: false, queued: 0, error: err instanceof Error ? err.message : 'Broadcast request failed' };
    }
    return { success: false, queued: 0, error: 'Broadcast failed' };
  }

  static async getSuppressions(): Promise<SuppressionItem[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/suppressions`);
      if (res.ok) {
        const data = await res.json();
        if (data.suppressions) return data.suppressions;
      }
    } catch (err) {
      console.warn('API getSuppressions failed:', err);
    }
    return [];
  }

  static async addSuppression(email: string, reason: SuppressionItem['reason']): Promise<SuppressionItem | null> {
    try {
      const res = await fetch(`${API_BASE}/suppressions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.suppression) return data.suppression;
      }
    } catch (err) {
      console.warn('API addSuppression failed:', err);
    }
    return null;
  }

  static async removeSuppression(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/suppressions/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.warn('API removeSuppression failed:', err);
      return false;
    }
  }

  static async getBounceReports(): Promise<BounceReportItem[]> {
    try {
      const res = await fetch(`${API_BASE}/bounce-reports`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.bounces)) return data.bounces;
      }
    } catch (err) {
      console.warn('API getBounceReports failed:', err);
    }
    return [];
  }

  static async getGetAIPilotUsers(): Promise<GetAIPilotUser[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/getaipilot/users`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.users) && data.users.length > 0) return data.users;
      }
    } catch (err) {
      console.warn('API getGetAIPilotUsers failed:', err);
    }
    return [];
  }
}
