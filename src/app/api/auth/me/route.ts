// GET /api/auth/me — who am I? Ensures the platform_users row exists (created
// from the role chosen at signup, stored in auth user_metadata; only client and
// vendor can be self-assigned — operator/admin roles are granted by the team).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/auth/admin-allowlist';

const SELF_SERVE_ROLES = ['client', 'vendor'];

export async function GET() {
  try {
    const sb = await createServerSupabaseClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth?.user) return NextResponse.json({ ok: true, signed_in: false });

    const emailVerified = Boolean(auth.user.email_confirmed_at);
    let role = 'client';

    if (isSupabaseConfigured()) {
      const db = getSupabaseClient({ admin: true });
      const metaRole = String(auth.user.user_metadata?.role || 'client');
      const { data: pu } = await db.from('platform_users').select('id, role').eq('auth_id', auth.user.id).maybeSingle();
      if (pu) {
        role = pu.role as string;
        // A DB trigger creates every new account as 'client'; honor the role
        // chosen at signup (vendor only — admin can never be self-assigned).
        if (role === 'client' && metaRole === 'vendor') {
          await db.from('platform_users').update({ role: 'vendor' }).eq('id', pu.id).eq('role', 'client');
          role = 'vendor';
        }
      } else {
        role = SELF_SERVE_ROLES.includes(metaRole) ? metaRole : 'client';
        await db.from('platform_users').insert({ auth_id: auth.user.id, email: auth.user.email, role }).select('id').maybeSingle();
      }
    }

    // Server-side admin allowlist (ADMIN_EMAILS) — the same override applied in
    // /auth/callback, mirrored here so every surface that reads role via
    // /api/auth/me (login redirect, admin UI checks) agrees. Never trusted from
    // the client; empty/unset = nobody; does NOT bypass the /admin AccessGate.
    if (isAdminEmail(auth.user.email, process.env.ADMIN_EMAILS)) role = 'admin';

    return NextResponse.json({ ok: true, signed_in: true, role, email: auth.user.email, email_verified: emailVerified });
  } catch {
    return NextResponse.json({ ok: true, signed_in: false });
  }
}
