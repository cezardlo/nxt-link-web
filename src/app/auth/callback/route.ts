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

          // Invite-funnel linking: an open vendor_invites row matching this
          // email means the account came from an operator invite (/join/<token>).
          // Create their vendor profile and advance the invite to
          // account_created. Best-effort — a linking hiccup must never break
          // sign-in.
          //
          // ⚠️ ADMIN-REVIEW SKIP — INTENTIONAL (MASTER-PLAN decision #5,
          // approved: "the invite IS the review"). The profile below is born
          // status 'approved' + moderation_status 'active', bypassing the
          // /admin/vendor-applications queue, because only operators behind
          // the admin access code can create invites — the human vetting
          // already happened at invite time. Cold inbound (/apply) still goes
          // through admin review; this path is invite-only.
          if (role !== 'admin' && role !== 'super_admin' && data.user.email) {
            try {
              const esc = data.user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
              const { data: inv } = await db.from('vendor_invites')
                .select('id, company_name, contact_name, email, phone, locale, vendor_id, status')
                .ilike('email', esc)
                .in('status', ['invited', 'reminded', 'clicked'])
                .order('created_at', { ascending: false })
                .limit(1).maybeSingle();
              if (inv) {
                let vendorId = (inv.vendor_id as string | null) || null;
                if (!vendorId) {
                  // Reuse an existing profile if one already belongs to this
                  // account (idempotent), otherwise create it from the invite.
                  const { data: mine } = await db.from('vendor_profiles').select('id').eq('auth_id', data.user.id).maybeSingle();
                  if (mine) {
                    vendorId = mine.id as string;
                  } else {
                    const { data: ins } = await db.from('vendor_profiles').insert({
                      company_name: inv.company_name || 'New company',
                      contact_name: inv.contact_name || null,
                      email: data.user.email.toLowerCase(),
                      phone: inv.phone || null,
                      locale: inv.locale === 'es' ? 'es' : 'en',
                      status: 'approved',            // ← the review skip (see note above)
                      moderation_status: 'active',
                      source: 'invite',
                      auth_id: data.user.id,
                    }).select('id').maybeSingle();
                    vendorId = (ins?.id as string) || null;
                  }
                }
                await db.from('vendor_invites').update({
                  auth_id: data.user.id,
                  vendor_id: vendorId,
                  account_created_at: new Date().toISOString(),
                  status: 'account_created',
                }).eq('id', inv.id);
                isVendor = true;
              }
            } catch { /* best-effort: never block sign-in on invite linking */ }
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
