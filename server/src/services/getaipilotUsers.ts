import { createClient } from '@supabase/supabase-js';

type ProfileRow = Record<string, any>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isSyntheticEmail = (email: string) =>
  /^user_\d+@getaipilot\.in$/i.test(email) ||
  /@truecaller\.getaipilot\.in$/i.test(email);

const getProfileEmail = (profile: ProfileRow) => {
  const candidates = [
    profile.email,
    profile.business_email,
    profile.raw_user_meta_data?.email
  ];

  const email = candidates
    .map((candidate) => (typeof candidate === 'string' ? candidate.trim() : ''))
    .find((candidate) => EMAIL_RE.test(candidate) && !isSyntheticEmail(candidate));

  return email || null;
};

const resolveOnboardingStatus = (profile: ProfileRow) => {
  if (profile.onboarding_completed === true) return 'completed';
  if (profile.tour_completed === true) return 'tour_completed';
  if (profile.tour_seen === true) return 'tour_started';
  if (typeof profile.tour_step === 'number' && profile.tour_step > 0) return `tour_step_${profile.tour_step}`;
  return 'pending';
};

const createGetAiPilotClient = () => {
  const supabaseUrl = process.env.GETAIPILOT_SUPABASE_URL;
  const serviceRoleKey = process.env.GETAIPILOT_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('GETAIPILOT_SUPABASE_URL and GETAIPILOT_SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

export async function fetchGetAiPilotUsers() {
  const client = createGetAiPilotClient();

  const [profilesResult, authResult] = await Promise.all([
    client.from('profiles').select('*').limit(1000),
    client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (authResult.error) throw authResult.error;

  const profiles = (profilesResult.data || []) as ProfileRow[];
  const authUsers = authResult.data.users || [];
  const authById = new Map(authUsers.map((user: any) => [user.id, user]));
  const authByEmail = new Map(
    authUsers
      .filter((user: any) => user.email)
      .map((user: any) => [String(user.email).toLowerCase(), user])
  );

  const mappedProfiles = profiles.flatMap((profile, idx) => {
    const email = getProfileEmail(profile);
    if (!email) return [];

    const authUser = authById.get(profile.id) || authByEmail.get(String(email).toLowerCase());
    const authMetadata = (authUser as any)?.user_metadata || {};
    const rawMetadata = profile.raw_user_meta_data || {};

    return [{
      id: profile.id || (authUser as any)?.id || String(idx),
      email,
      full_name:
        profile.full_name ||
        profile.username ||
        authMetadata.full_name ||
        authMetadata.name ||
        (email.includes('@') ? email.split('@')[0] : `User ${idx}`),
      account_type: profile.account_type || profile.plan || 'Free Tier',
      country: profile.country || 'India',
      created_at: String(profile.created_at || (authUser as any)?.created_at || '2026-07-01').split('T')[0],
      status: (authUser as any)?.banned_until ? 'blocked' : (profile.account_status || 'active'),
      onboarding_completed: profile.onboarding_completed === true,
      onboarding_status: resolveOnboardingStatus(profile),
      tour_seen: profile.tour_seen === true,
      tour_completed: profile.tour_completed === true,
      tour_step: profile.tour_step || 0,
      is_verified: Boolean(
        (authUser as any)?.email_confirmed_at ||
        (authUser as any)?.confirmed_at ||
        profile.email_confirmed_at ||
        rawMetadata.email_verified ||
        authMetadata.email_verified
      )
    }];
  });

  const profileIds = new Set(mappedProfiles.map((user) => user.id));
  const profileEmails = new Set(mappedProfiles.map((user) => String(user.email).toLowerCase()));

  const authOnlyUsers = authUsers
    .filter((user: any) => {
      const email = String(user.email || '').toLowerCase();
      return user.email && !isSyntheticEmail(email) && !profileIds.has(user.id) && !profileEmails.has(email);
    })
    .map((user: any, idx) => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
      account_type: user.user_metadata?.plan || 'Free Tier',
      country: user.user_metadata?.country || 'India',
      created_at: String(user.created_at || '2026-07-01').split('T')[0],
      status: user.banned_until ? 'blocked' : 'active',
      onboarding_completed: false,
      is_verified: Boolean(user.email_confirmed_at || user.confirmed_at),
      sort_index: profiles.length + idx
    }));

  return [...mappedProfiles, ...authOnlyUsers].sort((a: any, b: any) =>
    String(b.created_at).localeCompare(String(a.created_at))
  );
}
