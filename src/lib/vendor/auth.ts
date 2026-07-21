// Vendor self-service auth guard. A vendor signs in with Supabase Auth
// (email/password); their vendor_profiles row is resolved by auth_id, linked
// by email on first login if they registered anonymously before, or created
// fresh if this is their first time. Every vendor-portal API route scopes
// reads/writes to the CALLER'S OWN row — never a client-supplied vendor id.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ensureVendorProfile } from '@/lib/vendor/profile';

export interface VendorSession {
  authId: string;
  email: string | null;
  emailConfirmed: boolean;
}

/** Resolve the signed-in vendor's auth session, or null if not signed in. */
export async function getVendorSession(): Promise<VendorSession | null> {
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
 * Delegates to the ONE shared creator (src/lib/vendor/profile.ts), lane
 * 'portal': match by auth_id → link an unowned same-email row → create a
 * blank PENDING placeholder (the review gate stays with the admin queue).
 */
export async function getOrCreateVendorProfile(session: VendorSession): Promise<VendorRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabaseClient({ admin: true });

  const cols = 'id, public_ref, company_name, contact_name, email, phone, website, city, categories, service_areas, industries, client_types, description, status, auth_id';

  const ensured = await ensureVendorProfile(db, {
    lane: 'portal',
    authId: session.authId,
    email: session.email,
    select: cols,
    profile: { company_name: 'New company', email: session.email, source: 'vendor_portal' },
  });
  return ensured.ok ? (ensured.row as unknown as VendorRow) : null;
}
