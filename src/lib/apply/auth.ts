// Session guard for the private vendor-application system (vendor_applications).
// A signed-in vendor may only ever see/edit THEIR OWN row — resolved from
// their auth session, never a client-supplied id. Mirrors src/lib/vendor/auth.ts
// but for the vendor_applications table (separate from vendor_profiles).

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  regions: string[] | null;
  problem_solved: string | null;
  target_customer: string | null;
  target_customers: string[] | null;
  price_range: string | null;
  // Wedge fields (2026-08-04) — the four required comparison fields.
  labor_rate: number | null;
  labor_rate_currency: string | null;
  mobile_fee: number | null;
  response_time: string | null;
  contract_types: string[] | null;
  logo_path: string | null;
  product_image_paths: string[];
  status: string;
  // Vendor-visible send-back note (needs_info). Dedicated column — NEVER
  // admin_notes, which may hold internal comments and is not exposed here.
  vendor_message: string | null;
  auth_id: string | null;
  created_at: string;
}

const COLS =
  'id, public_ref, company_name, contact_name, email, phone, category, offering_types, supply_chain_stages, company_size, region, regions, problem_solved, target_customer, target_customers, price_range, labor_rate, labor_rate_currency, mobile_fee, response_time, contract_types, logo_path, product_image_paths, status, vendor_message, auth_id, created_at';

function escLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Find the caller's own application: by auth_id, or by linking a prior
 * anonymous submission with a matching email (claimed once, then locked to
 * this account). Returns null if they haven't applied yet — the UI should
 * send them to /apply, NOT auto-create a blank application.
 * Db-injectable so tests can run it against the in-memory fake.
 */
export async function findOwnApplication(db: SupabaseClient, session: ApplicantSession): Promise<ApplicationRow | null> {
  const { data: byAuth } = await db.from('vendor_applications').select(COLS).eq('auth_id', session.authId).maybeSingle();
  if (byAuth) return byAuth as ApplicationRow;

  if (session.email) {
    const { data: byEmail } = await db
      .from('vendor_applications')
      .select(COLS)
      .ilike('email', escLike(session.email))
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

export async function getOwnApplication(session: ApplicantSession): Promise<ApplicationRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabaseClient({ admin: true });
  return findOwnApplication(db, session);
}

/**
 * One application per company (2026-08-04 batch): the resume target for a
 * SIGNED-OUT submit — the latest UNCLAIMED application with this email.
 * A row already claimed by an account (auth_id set) is never returned here:
 * an anonymous caller who happens to know the email must not be able to
 * overwrite someone else's linked application.
 */
export async function findAnonymousApplication(db: SupabaseClient, email: string): Promise<ApplicationRow | null> {
  const e = email.trim();
  if (!e) return null;
  const { data } = await db
    .from('vendor_applications')
    .select(COLS)
    .ilike('email', escLike(e))
    .is('auth_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ApplicationRow) || null;
}
