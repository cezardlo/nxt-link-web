// Buyer self-service auth guard. A buyer signs in with Supabase Auth
// (email/password) and role 'client'. Their marketplace footprint is keyed by
// the email they submitted requests with — there is no buyer_id FK on
// client_requests / quote_requests yet, so we scope by the CALLER'S OWN
// verified email. Email confirmation is required before any email-matched data
// is returned, so an unverified account cannot claim another person's requests.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';

export interface BuyerSession {
  authId: string;
  email: string | null;
  emailConfirmed: boolean;
}

/** Resolve the signed-in buyer's auth session, or null if not signed in. */
export async function getBuyerSession(): Promise<BuyerSession | null> {
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data?.user) return null;
    return {
      authId: data.user.id,
      email: data.user.email ?? null,
      emailConfirmed: Boolean(data.user.email_confirmed_at),
    };
  } catch {
    return null;
  }
}
