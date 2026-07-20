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
        let isVendor = false;
        if (isSupabaseConfigured()) {
          const db = getSupabaseClient({ admin: true });
          const { data: pu } = await db.from('platform_users').select('role').eq('auth_id', data.user.id).maybeSingle();
          if (pu?.role) role = pu.role as string;

          // A passwordless early-access vendor never had a role set, so they'd
          // otherwise be treated as a buyer. Recognize them as a vendor if they
          // already own a vendor profile OR were approved from the waitlist,
          // and send them straight to the profile builder.
          if (role !== 'admin' && role !== 'super_admin' && role !== 'vendor') {
            const { data: vp } = await db.from('vendor_profiles').select('id').eq('auth_id', data.user.id).maybeSingle();
            isVendor = Boolean(vp);
            if (!isVendor && data.user.email) {
              const esc = data.user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
              const { data: lead } = await db.from('early_access_leads')
                .select('id').ilike('email', esc).in('status', ['onboarding', 'onboarded']).maybeSingle();
              isVendor = Boolean(lead);
            }
          }
        }
        dest = next || (role === 'admin' || role === 'super_admin' ? '/admin'
          : role === 'vendor' || isVendor ? '/vendor/portal?welcome=1'
          : '/buyer');
      }
    }
  } catch { /* fall through to login */ }

  return NextResponse.redirect(new URL(dest, url.origin));
}
