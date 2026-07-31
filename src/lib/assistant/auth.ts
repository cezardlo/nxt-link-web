// Server-side auth guard for NXT//LINK platform routes.
// Real auth via Supabase session + platform_users.role, with a transitional
// fallback to the env-managed admin access code / signed admin session cookie.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { accessCodeHeaderOk, adminCookieOk } from '@/lib/server/admin-session';
import { isAdminEmail } from '@/lib/auth/admin-allowlist';

export type PlatformRole = 'public' | 'client' | 'vendor' | 'admin' | 'super_admin';

export interface CurrentUser {
  authId: string;
  id: string | null;      // platform_users.id (null if row not yet created)
  role: PlatformRole;
  email: string | null;
}

/**
 * Fold the ADMIN_EMAILS allowlist into a resolved platform role. Pure — no
 * I/O — so it's unit-testable without a live Supabase session.
 *
 * ROOT CAUSE (2026-07-30, vendor storefront preview dead-end): /auth/callback
 * and /api/auth/me already grant 'admin' to any ADMIN_EMAILS-listed owner for
 * ROUTING purposes (nav, redirect to /admin) WITHOUT ever writing 'admin'
 * back to the platform_users.role DB row (documented, intentional — see
 * src/lib/auth/admin-allowlist.ts: "no DB write, instantly reversible"). This
 * helper was missing from getCurrentUser()/isAdminRequest() below, so every
 * OTHER admin-gated route (including the vendor storefront preview,
 * decideStorefrontPreview's isAdmin input) silently disagreed with the rest
 * of the app about who counts as admin: an allowlisted owner whose DB role
 * hadn't separately been promoted to 'admin' (e.g. because a vendor lane
 * touched their platform_users row first, as happened when Cesar's own admin
 * email got linked to a test vendor profile) was treated as an ordinary
 * non-admin — and if the vendor they were previewing wasn't THEIR OWN linked
 * profile (or had no auth_id yet), the ownership fallback failed too, so
 * they landed on the exact same not_found an anonymous stranger gets.
 */
export function resolvePlatformRole(
  dbRole: PlatformRole | null | undefined,
  email: string | null | undefined,
  adminEmailsEnv: string | null | undefined,
): PlatformRole {
  if (isAdminEmail(email, adminEmailsEnv)) return 'admin';
  return dbRole ?? 'client';
}

/** Resolve the signed-in user + their platform role, or null if not signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const sb = await createServerSupabaseClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth?.user) return null;
    const { data: pu } = await sb
      .from('platform_users')
      .select('id, role')
      .eq('auth_id', auth.user.id)
      .maybeSingle();
    return {
      authId: auth.user.id,
      id: (pu?.id as string) ?? null,
      role: resolvePlatformRole(pu?.role as PlatformRole | undefined, auth.user.email, process.env.ADMIN_EMAILS),
      email: auth.user.email ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * True when the caller is allowed to act as admin.
 * Accepts a signed-in admin/super_admin, a valid admin session cookie minted
 * by POST /api/auth/access-code, OR (transitional, for scripts/tooling) an
 * x-access-code header matching the env-managed ADMIN_ACCESS_CODE.
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const user = await getCurrentUser();
  if (user && (user.role === 'admin' || user.role === 'super_admin')) return true;
  if (adminCookieOk(req.headers)) return true;
  return accessCodeHeaderOk(req.headers);
}
