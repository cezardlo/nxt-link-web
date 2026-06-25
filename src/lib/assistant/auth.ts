// Server-side auth guard for NXT//LINK platform routes.
// Real auth via Supabase session + platform_users.role, with a transitional
// fallback to the shared admin access code so existing tooling keeps working.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { PRIVATE_ACCESS_CODE } from '@/lib/privateAccess';

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
 * Accepts a signed-in admin/super_admin, OR the shared access code header
 * (transitional — remove once every admin has a real account).
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const user = await getCurrentUser();
  if (user && (user.role === 'admin' || user.role === 'super_admin')) return true;
  return req.headers.get('x-access-code') === PRIVATE_ACCESS_CODE;
}
