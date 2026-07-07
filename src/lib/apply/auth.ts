// Session guard for the private vendor-application system (vendor_applications).
// A signed-in vendor may only ever see/edit THEIR OWN row — resolved from
// their auth session, never a client-supplied id. Mirrors src/lib/vendor/auth.ts
// but for the vendor_applications table (separate from vendor_profiles).

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface ApplicantSession {
  authId: string;
  email: string | null;
}

export async function getApplicantSession(): Promise<ApplicantSession | null> {
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data?.user) return null;
    return { authId: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

export interface ApplicationRow {
  id: string;
  public_ref: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  category: string;
  offering_types: string[];
  supply_chain_stages: string[];
  company_size: string | null;
  region: string | null;
  problem_solved: string | null;
  target_customer: string | null;
  price_range: string | null;
  logo_path: string | null;
  product_image_paths: string[];
  status: string;
  auth_id: string | null;
  created_at: string;
}

const COLS =
  'id, public_ref, company_name, contact_name, email, phone, category, offering_types, supply_chain_stages, company_size, region, problem_solved, target_customer, price_range, logo_path, product_image_paths, status, auth_id, created_at';

/**
 * Find the caller's own application: by auth_id, or by linking a prior
 * anonymous submission with a matching email (claimed once, then locked to
 * this account). Returns null if they haven't applied yet — the UI should
 * send them to /apply, NOT auto-create a blank application.
 */
export async function getOwnApplication(session: ApplicantSession): Promise<ApplicationRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabaseClient({ admin: true });

  const { data: byAuth } = await db.from('vendor_applications').select(COLS).eq('auth_id', session.authId).maybeSingle();
  if (byAuth) return byAuth as ApplicationRow;

  if (session.email) {
    const { data: byEmail } = await db
      .from('vendor_applications')
      .select(COLS)
      .ilike('email', session.email.replace(/[\\%_]/g, (c) => `\\${c}`))
      .is('auth_id', null)
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (byEmail) {
      const { data: linked } = await db.from('vendor_applications').update({ auth_id: session.authId }).eq('id', byEmail.id).select(COLS).single();
      if (linked) return linked as ApplicationRow;
    }
  }

  return null;
}
