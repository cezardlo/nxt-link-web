// GET /auth/callback — target of the email-confirmation (and other auth)
// links. Exchanges the code for a session cookie, then sends the user to the
// right surface for their role.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');

  let dest = '/login?confirmed=1';
  try {
    if (code) {
      const sb = await createServerSupabaseClient();
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        let role = String(data.user.user_metadata?.role || 'client');
        if (isSupabaseConfigured()) {
          const db = getSupabaseClient({ admin: true });
          const { data: pu } = await db.from('platform_users').select('role').eq('auth_id', data.user.id).maybeSingle();
          if (pu?.role) role = pu.role as string;
        }
        dest = next || (role === 'admin' || role === 'super_admin' ? '/admin'
          : role === 'vendor' ? '/vendor/listings?verified=1'
          : '/marketplace');
      }
    }
  } catch { /* fall through to login */ }

  return NextResponse.redirect(new URL(dest, url.origin));
}
