// Server-side session check for API routes (the login wall on the marketplace
// read/write endpoints). This is the REAL check — it verifies the session with
// Supabase Auth on the server via getUser(), not a cookie-presence guess — so
// it cannot be spoofed by a forged cookie the way UI-only gating can.
//
// Fail-closed: any error (misconfig, network, no session) resolves to null and
// the caller must treat null as anonymous → 401.

import { createServerSupabaseClient } from '@/lib/supabase/server-auth';

export interface SessionUser {
  id: string;
  email: string | null;
}

/** The authenticated Supabase user for the current request, or null if there
 *  is no valid session. Use in an API route as:
 *
 *    const user = await getSessionUser();
 *    if (!user) return NextResponse.json(
 *      { ok: false, code: 'auth_required', message: 'Sign in to continue' },
 *      { status: 401 },
 *    );
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const sb = await createServerSupabaseClient();
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
