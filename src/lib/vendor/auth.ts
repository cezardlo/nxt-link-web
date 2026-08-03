// Vendor self-service auth guard. A vendor signs in with Supabase Auth
// (email/password); their vendor_profiles row is resolved by auth_id, linked
// by email on first login if they registered anonymously before, or created
// fresh if this is their first time. Every vendor-portal API route scopes
// reads/writes to the CALLER'S OWN row — never a client-supplied vendor id.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ensureVendorProfile } from '@/lib/vendor/profile';
import type { PlatformRole } from '@/lib/assistant/auth';

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

/** Roles that may touch the vendor portal and therefore may have a
 *  vendor_profiles row resolved or created for them. Buyers ('client')
 *  must never auto-mint a blank vendor profile by calling /api/vendor/*.
 */
const VENDOR_FACING_ROLES: readonly PlatformRole[] = ['vendor', 'admin', 'super_admin'];

/** Pure role check — exported so the policy is unit-testable without a
 *  live Supabase session.
 */
export function isVendorFacingRole(role: PlatformRole | null | undefined): boolean {
  return VENDOR_FACING_ROLES.includes(role as PlatformRole);
}

/**
 * Get-or-create the vendor_profiles row for the signed-in user.
 * Delegates to the ONE shared creator (src/lib/vendor/profile.ts), lane
 * 'portal': match by auth_id → link an unowned same-email row → create a
 * blank PENDING placeholder (the review gate stays with the admin queue).
 *
 * SECURITY: a signed-in buyer is rejected here so that calling any
 * /api/vendor/* route cannot silently mint a blank vendor profile.
 */
export async function getOrCreateVendorProfile(session: VendorSession): Promise<VendorRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabaseClient({ admin: true });

  // 1) Role gate: only vendor-facing platform roles may proceed.
  const { data: pu } = await db
    .from('platform_users')
    .select('role')
    .eq('auth_id', session.authId)
    .maybeSingle();
  if (!isVendorFacingRole(pu?.role as PlatformRole | undefined)) return null;

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
