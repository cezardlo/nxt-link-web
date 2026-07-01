// Vendor self-service auth guard. A vendor signs in with Supabase Auth
// (email/password); their vendor_profiles row is resolved by auth_id, linked
// by email on first login if they registered anonymously before, or created
// fresh if this is their first time. Every vendor-portal API route scopes
// reads/writes to the CALLER'S OWN row — never a client-supplied vendor id.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface VendorSession {
  authId: string;
  email: string | null;
}

/** Resolve the signed-in vendor's auth session, or null if not signed in. */
export async function getVendorSession(): Promise<VendorSession | null> {
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data?.user) return null;
    return { authId: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

export interface VendorRow {
  id: string;
  public_ref: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  categories: string[];
  service_areas: string[];
  industries: string[];
  client_types: string[];
  description: string | null;
  status: string;
  auth_id: string | null;
}

/**
 * Get-or-create the vendor_profiles row for the signed-in user.
 * 1) match by auth_id  2) link by email (legacy anonymous signup)  3) create fresh.
 */
export async function getOrCreateVendorProfile(session: VendorSession): Promise<VendorRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabaseClient({ admin: true });

  const cols = 'id, public_ref, company_name, contact_name, email, phone, website, city, categories, service_areas, industries, client_types, description, status, auth_id';

  const { data: byAuth } = await db.from('vendor_profiles').select(cols).eq('auth_id', session.authId).maybeSingle();
  if (byAuth) return byAuth as VendorRow;

  if (session.email) {
    const { data: byEmail } = await db
      .from('vendor_profiles')
      .select(cols)
      .ilike('email', session.email)
      .is('auth_id', null)
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (byEmail) {
      const { data: linked } = await db.from('vendor_profiles').update({ auth_id: session.authId }).eq('id', byEmail.id).select(cols).single();
      if (linked) return linked as VendorRow;
    }
  }

  const { data: created } = await db
    .from('vendor_profiles')
    .insert({ company_name: 'New company', email: session.email, auth_id: session.authId, status: 'pending', source: 'vendor_portal' })
    .select(cols)
    .single();
  return (created as VendorRow) ?? null;
}
