-- SQL DDL for Standalone SupermailBox Database Instance
-- Execute this script in the SQL editor of your new dedicated Postgres/Supabase project.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products Registry
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,          -- e.g. 'flowpilot', 'crmpilot'
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Unified Contacts Model
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email CITEXT UNIQUE,
  primary_phone TEXT,
  full_name TEXT,
  merged_into_contact_id UUID REFERENCES public.contacts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(primary_phone);
CREATE INDEX IF NOT EXISTS idx_contacts_merged ON public.contacts(merged_into_contact_id);

-- 3. Product Identities Mapping
CREATE TABLE IF NOT EXISTS public.contact_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_user_id TEXT NOT NULL,
  email CITEXT,
  phone TEXT,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, product_user_id)
);

CREATE INDEX IF NOT EXISTS idx_identities_contact ON public.contact_identities(contact_id);

-- 4. Flexible attributes key-values
CREATE TABLE IF NOT EXISTS public.contact_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_key TEXT NOT NULL,
  attribute_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact_id, product_id, attribute_key)
);

CREATE INDEX IF NOT EXISTS idx_attrs_contact_key ON public.contact_attributes(contact_id, attribute_key);
CREATE INDEX IF NOT EXISTS idx_attrs_value_gin ON public.contact_attributes USING GIN (attribute_value);

-- 5. Email Templates & Versions
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('transactional','marketing')),
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, key)
);

CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  subject TEXT NOT NULL,
  html_source TEXT NOT NULL,
  mjml_source TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','live')),
  language TEXT DEFAULT 'en',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

-- Circular references safety check: Add foreign key for email_templates' current version after creation
ALTER TABLE public.email_templates ADD CONSTRAINT fk_current_version 
  FOREIGN KEY (current_version_id) REFERENCES public.template_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  required BOOLEAN DEFAULT true,
  default_value TEXT
);

-- 6. Campaigns & Batches (Marketing Blasts)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  segment_id UUID, -- Optional segment logic reference
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','completed','paused','cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  batch_number INT NOT NULL,
  contact_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- 7. Email Dispatch Jobs (Primary logs)
CREATE TABLE IF NOT EXISTS public.email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('transactional','campaign')),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  template_version_id UUID REFERENCES public.template_versions(id) ON DELETE SET NULL,
  provider TEXT,
  provider_message_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','bounced','failed','suppressed','skipped')),
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_contact ON public.email_jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_campaign ON public.email_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_jobs_provider_msg ON public.email_jobs(provider_message_id);

-- 8. Email Delivery Events log
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_job_id UUID NOT NULL REFERENCES public.email_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent','accepted','delivered','opened','clicked','bounced','complained','unsubscribed','failed','deferred')),
  event_data JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_job ON public.email_events(email_job_id);

-- 9. Suppression & Unsubscribe preferences
CREATE TABLE IF NOT EXISTS public.suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('bounce','complaint','manual','unsubscribe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, product_id)
);

CREATE INDEX IF NOT EXISTS idx_suppression_email ON public.suppression_list(email);

CREATE TABLE IF NOT EXISTS public.unsubscribe_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subscribed BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact_id, product_id, category)
);

-- 10. Service Security API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Debug logs / webhooks logs
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Provider Accounts
CREATE TABLE IF NOT EXISTS public.provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('zeptomail', 'ses', 'resend', 'smtp', 'ethereal')),
  account_name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Sender Domains
CREATE TABLE IF NOT EXISTS public.sender_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  dkim_verified BOOLEAN DEFAULT false,
  spf_verified BOOLEAN DEFAULT false,
  tracking_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',`
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Data (Dev / Default Instance Setup)
INSERT INTO public.products (code, name, status)
VALUES ('getaipilot', 'GetAIPilot Core Platform', 'active')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.sender_domains (domain, dkim_verified, spf_verified, is_default)
VALUES ('getaipilot.com', true, true, true)
ON CONFLICT (domain) DO NOTHING;

INSERT INTO public.email_templates (product_id, key, category)
SELECT id, 'getaipilot_welcome', 'transactional' FROM public.products WHERE code = 'getaipilot'
ON CONFLICT (product_id, key) DO NOTHING;

INSERT INTO public.email_templates (product_id, key, category)
SELECT id, 'getaipilot_feature_announce', 'marketing' FROM public.products WHERE code = 'getaipilot'
ON CONFLICT (product_id, key) DO NOTHING;

INSERT INTO public.email_templates (product_id, key, category)
SELECT id, 'getaipilot_billing_alert', 'transactional' FROM public.products WHERE code = 'getaipilot'
ON CONFLICT (product_id, key) DO NOTHING;

