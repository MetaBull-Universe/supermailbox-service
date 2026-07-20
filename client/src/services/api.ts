// API Service connecting to Real Fastify Backend
import { SYNCED_228_USERS } from './getaipilotUsersData';

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

export interface GetAIPilotUser {
  id: string;
  email: string;
  full_name: string;
  account_type: string;
  country: string;
  created_at: string;
  status: string;
  onboarding_completed?: boolean;
  is_verified?: boolean;
}

export interface BroadcastResult {
  success?: boolean;
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

export class ApiService {
  static async getCampaignJobStats(campaignId: string): Promise<CampaignJobStats> {
    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/jobs`);
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
      const res = await fetch(`${API_BASE}/dashboard/stats`);
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
      const res = await fetch(`${API_BASE}/dashboard/stats`);
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
      const res = await fetch(`${API_BASE}/dashboard/stats`);
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
      const res = await fetch(`${API_BASE}/logs/by-project`);
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
      const res = await fetch(`${API_BASE}/templates`);
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
      const res = await fetch(`${API_BASE}/templates`, {
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
      const res = await fetch(`${API_BASE}/campaigns`);
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
      const res = await fetch(`${API_BASE}/broadcast`, {
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
      }
    } catch (err) {
      console.error('Broadcast fetch error:', err);
    }
    return { success: false, queued: 0 };
  }

  static async getSuppressions(): Promise<SuppressionItem[]> {
    try {
      const res = await fetch(`${API_BASE}/suppressions`);
      if (res.ok) {
        const data = await res.json();
        if (data.suppressions) return data.suppressions;
      }
    } catch (err) {
      console.warn('API getSuppressions failed:', err);
    }
    return [];
  }

  static async getGetAIPilotUsers(): Promise<GetAIPilotUser[]> {
    try {
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrbHhsYXBwamN1dmRxanZlY2ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0NzA4MywiZXhwIjoyMDgzNzIzMDgzfQ.8raDYx4BqeVELD691E720qBORhWEI4L68c_ED2JIt5w';
      const response = await fetch(
        'https://uklxlappjcuvdqjvecfh.supabase.co/rest/v1/profiles?select=*&limit=1000',
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((p: any, idx: number) => ({
            id: p.id || String(idx),
            email: p.email || p.phone || (`user_${idx}@getaipilot.in`),
            full_name: p.full_name || p.username || (p.email ? p.email.split('@')[0] : `User ${idx}`),
            account_type: p.account_type || p.plan || 'Free Tier',
            country: p.country || 'India',
            created_at: (p.created_at || '2026-07-01').split('T')[0],
            status: 'active',
            onboarding_completed: p.onboarding_completed === true,
            is_verified: Boolean(p.email_confirmed_at || (p.raw_user_meta_data && p.raw_user_meta_data.email_verified))
          }));
        }
      }
    } catch (err) {
      // Fallback
    }
    // We are keeping the SYNCED_228_USERS snapshot for this specific external service (Supabase Profiles) 
    // as it is unrelated to our postgres backend tables for now.
    return SYNCED_228_USERS;
  }
}
