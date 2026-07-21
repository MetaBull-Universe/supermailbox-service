import { createClient } from '@supabase/supabase-js';

type AuthLinkResult = {
  url: string | null;
  error?: string;
};

const getRedirectUrl = () => {
  const configured =
    process.env.GETAIPILOT_AUTH_REDIRECT_TO ||
    process.env.FRONTEND_URL ||
    process.env.frontend_Url ||
    'https://mail.getaipilot.in/';

  return configured.endsWith('/') ? configured : `${configured}/`;
};

const isVerificationTemplate = (templateKey?: string, campaignName?: string) => {
  const haystack = `${templateKey || ''} ${campaignName || ''}`.toLowerCase();
  return ['verify', 'verification', 'confirm', 'confirmation', 'signup'].some((term) => haystack.includes(term));
};

export async function generateSupabaseVerificationLink(
  email: string,
  fullName?: string
): Promise<AuthLinkResult> {
  const supabaseUrl = process.env.GETAIPILOT_SUPABASE_URL;
  const serviceRoleKey = process.env.GETAIPILOT_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      url: null,
      error: 'GETAIPILOT_SUPABASE_URL and GETAIPILOT_SUPABASE_SERVICE_ROLE_KEY are not configured.'
    };
  }

  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await authClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: getRedirectUrl(),
      data: fullName ? { full_name: fullName } : undefined
    }
  });

  if (error) {
    return { url: null, error: error.message };
  }

  const properties = data?.properties as any;
  return {
    url: properties?.action_link || properties?.actionLink || null
  };
}

export function shouldGenerateSupabaseVerificationLink(templateKey?: string, campaignName?: string) {
  return isVerificationTemplate(templateKey, campaignName);
}

export function isSupabaseAuthLinkConfigured() {
  return Boolean(process.env.GETAIPILOT_SUPABASE_URL && process.env.GETAIPILOT_SUPABASE_SERVICE_ROLE_KEY);
}
