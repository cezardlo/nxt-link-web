// Server-side auth guard for NXT//LINK platform routes.
// Real auth via Supabase session + platform_users.role, with a transitional
// fallback to the env-managed admin access code / signed admin session cookie.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { accessCodeHeaderOk, adminCookieOk } from '@/lib/server/admin-session';

export type PlatformRole = 'public' | 'client' | 'vendor' | 'admin' | 'super_admin';

export interface CurrentUser {
  authId: string;
  id: string | null;      // platform_users.id (null if row not yet created)
  role: PlatformRole;
  email: string | null;
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
      role: ((pu?.role as PlatformRole) ?? 'client'),
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
