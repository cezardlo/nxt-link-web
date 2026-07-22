// GET /auth/callback — target of the email-confirmation (and other auth)
// links. Exchanges the code for a session cookie, then sends the user to the
// right surface for their role.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ensureVendorProfile } from '@/lib/vendor/profile';
import { recordLegalAcceptance } from '@/lib/legal/acceptance';

function metaCategories(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const raw of v) {
    const s = String(raw).trim().slice(0, 80);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 10) break;
  }
  return out;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');

  // Google OAuth click-wrap threading (Continue-with-Google, gated by
  // NEXT_PUBLIC_AUTH_GOOGLE): signInWithOAuth has no `data` option like
  // signInWithOtp, so the button threads its lane/locale/invite-token/
  // bounce-back path as query params on redirectTo — Supabase echoes the
  // whole URL back verbatim (+`&code=`). Absent for every existing flow
  // (magic link, password) — zero effect on them. See src/lib/auth/google.ts.
  const oauthLane = url.searchParams.get('oauth_lane'); // 'organic' | 'invite' | 'buyer'
  const oauthFrom = url.searchParams.get('oauth_from');
  const oauthInvite = url.searchParams.get('oauth_invite');
  const oauthLocale: 'en' | 'es' = url.searchParams.get('oauth_locale') === 'es' ? 'es' : 'en';
  const oauthCompany = url.searchParams.get('oauth_company');
  const oauthCategories = (url.searchParams.get('oauth_categories') || '')
    .split('|').map((s) => s.trim()).filter(Boolean).slice(0, 10);

  let dest = '/login?confirmed=1';
  try {
    if (code) {
      const sb = await createServerSupabaseClient();
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        let role = String(data.user.user_metadata?.role || 'client');
        let isVendor = false;
        let organicDest: string | null = null;
        if (isSupabaseConfigured()) {
          const db = getSupabaseClient({ admin: true });
          const { data: pu } = await db.from('platform_users').select('role').eq('auth_id', data.user.id).maybeSingle();
          if (pu?.role) role = pu.role as string;

          // Link pre-account click-wrap acceptance rows (/signup, /apply,
          // /join) to this now-confirmed auth id. The DB guard only permits
          // this null → id transition. Best-effort — never blocks sign-in.
          if (data.user.email) {
            try {
              await db.from('terms_acceptances').update({ user_id: data.user.id })
                .eq('email', data.user.email.toLowerCase()).is('user_id', null);
            } catch { /* best-effort */ }
          }

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
              const inviteCols = 'id, company_name, contact_name, email, phone, locale, vendor_id, status';
              let inv: Record<string, unknown> | null = null;
              // A Google click on /join/<token> can return a different email
              // than the invite's (a personal Gmail vs. the invited work
              // address) — match by the token itself first, the same
              // credential /join already trusts, before falling back to the
              // email match every other lane (including magic-link) uses.
              if (oauthLane === 'invite' && oauthInvite) {
                const { data: byToken } = await db.from('vendor_invites')
                  .select(inviteCols).eq('token', oauthInvite)
                  .in('status', ['invited', 'reminded', 'clicked']).maybeSingle();
                inv = (byToken as Record<string, unknown> | null) || null;
              }
              if (!inv) {
                const esc = data.user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
                const { data: byEmail } = await db.from('vendor_invites')
                  .select(inviteCols)
                  .ilike('email', esc)
                  .in('status', ['invited', 'reminded', 'clicked'])
                  .order('created_at', { ascending: false })
                  .limit(1).maybeSingle();
                inv = (byEmail as Record<string, unknown> | null) || null;
              }
              if (inv) {
                // Google path click-wrap gate — fail closed (process doc
                // §4): record the acceptance BEFORE approving anything. On
                // failure, bounce back to /join instead of silently
                // finishing an unrecorded signup; the invite's status is
                // untouched so retrying (once the recording works) still works.
                if (oauthLane === 'invite') {
                  const rec = await recordLegalAcceptance(db, {
                    authId: data.user.id, email: data.user.email, context: 'invite_join',
                    languageShown: oauthLocale, relatedObjectType: 'vendor_invite',
                    relatedObjectId: inv.id as string, req,
                  });
                  if (!rec.ok) {
                    const back = oauthFrom || (oauthInvite ? `/join/${oauthInvite}` : '/vendor-signup');
                    return NextResponse.redirect(new URL(`${back}?err=google_terms`, url.origin));
                  }
                }
                let vendorId = (inv.vendor_id as string | null) || null;
                if (!vendorId) {
                  // ONE shared creator for every lane (src/lib/vendor/profile.ts).
                  // Reuses this account's existing profile (idempotent) or an
                  // unowned same-email row, otherwise creates fresh from the
                  // invite. lane 'invite' = born approved (the review skip —
                  // see note above).
                  const inviteCats = metaCategories(data.user.user_metadata?.supply_categories);
                  const ensured = await ensureVendorProfile(db, {
                    lane: 'invite',
                    authId: data.user.id,
                    email: data.user.email,
                    profile: {
                      company_name: (inv.company_name as string | null) || 'New company',
                      contact_name: (inv.contact_name as string | null) || null,
                      email: data.user.email.toLowerCase(),
                      phone: (inv.phone as string | null) || null,
                      locale: inv.locale === 'es' ? 'es' : 'en',
                      source: 'invite',
                      // "What do you supply?" chips tapped on /join — carried
                      // in the OTP metadata so we never ask twice.
                      ...(inviteCats.length ? { categories: inviteCats } : {}),
                    },
                  });
                  vendorId = ensured.ok ? ensured.id : null;
                }
                await db.from('vendor_invites').update({
                  auth_id: data.user.id,
                  vendor_id: vendorId,
                  account_created_at: new Date().toISOString(),
                  status: 'account_created',
                }).eq('id', inv.id as string);
                isVendor = true;
              }
            } catch { /* best-effort: never block sign-in on invite linking */ }
          }

          // Google organic vendor lane (Continue with Google on
          // /vendor-signup, /signup's vendor step, or /vendor-login's
          // signup tab). signInWithOAuth can't carry the
          // signup_lane:'quick' metadata the magic-link path uses (no
          // `data` option), so the button threads oauth_lane=organic on
          // redirectTo instead. Same rule as every other organic door:
          // ensureVendorProfile lane 'organic' — born PENDING, admin review
          // still gates anything public. `!isVendor` makes this fire only
          // on the first touch — a returning vendor already has a profile
          // linked to this auth id, so it's skipped (and never re-recorded)
          // on every later sign-in.
          if (oauthLane === 'organic' && !isVendor && data.user.email) {
            const rec = await recordLegalAcceptance(db, {
              authId: data.user.id, email: data.user.email, context: 'vendor_signup',
              languageShown: oauthLocale, relatedObjectType: 'oauth_google', req,
            });
            if (!rec.ok) {
              return NextResponse.redirect(new URL(`${oauthFrom || '/vendor-signup'}?err=google_terms`, url.origin));
            }
            try {
              const meta = data.user.user_metadata || {};
              const fullName = String(meta.full_name || meta.name || '').trim().slice(0, 120) || null;
              const ensured = await ensureVendorProfile(db, {
                lane: 'organic', // born PENDING — review decides what goes public
                authId: data.user.id,
                email: data.user.email,
                profile: {
                  company_name: (oauthCompany || '').trim().slice(0, 120) || 'New company',
                  contact_name: fullName,
                  email: data.user.email.toLowerCase(),
                  locale: oauthLocale,
                  source: 'quick_signup_google',
                  ...(oauthCategories.length ? { categories: oauthCategories } : {}),
                },
              });
              if (ensured.ok) isVendor = true;
            } catch { /* best-effort: the portal's get-or-create still catches them */ }
          }

          // Google buyer lane (Continue with Google on /signup's buyer
          // step): no profile to create, but the click-wrap gate still
          // applies fail-closed — record the acceptance or bounce back
          // instead of finishing sign-in silently.
          if (oauthLane === 'buyer' && data.user.email) {
            const rec = await recordLegalAcceptance(db, {
              authId: data.user.id, email: data.user.email, context: 'signup',
              languageShown: oauthLocale, relatedObjectType: 'oauth_google', req,
            });
            if (!rec.ok) {
              return NextResponse.redirect(new URL(`${oauthFrom || '/signup'}?err=google_terms`, url.origin));
            }
          }

          // ORGANIC lane routing (two lanes, ONE system).
          //
          // Quick signup (signup_lane 'quick' metadata, set by the magic mode
          // of /api/auth/signup): account + dashboard IMMEDIATELY — the
          // profile is created here through ensureVendorProfile lane
          // 'organic', which is born PENDING. Admin review still gates
          // anything going public (the publish gate checks vendor status);
          // the portal shows what they can do meanwhile. Never weaken this.
          //
          // Legacy password signups keep the old routing: a vendor-role
          // account with NO profile goes to the application/review flow.
          // Best-effort — a lookup hiccup falls back to defaults.
          if (role === 'vendor' && !isVendor) {
            const meta = data.user.user_metadata || {};
            if (meta.signup_lane === 'quick' && data.user.email) {
              try {
                const quickCats = metaCategories(meta.supply_categories);
                const ensured = await ensureVendorProfile(db, {
                  lane: 'organic', // born PENDING — review decides what goes public
                  authId: data.user.id,
                  email: data.user.email,
                  profile: {
                    company_name: String(meta.company_name || '').trim().slice(0, 120) || 'New company',
                    email: data.user.email.toLowerCase(),
                    locale: meta.locale === 'es' ? 'es' : 'en',
                    source: 'quick_signup',
                    ...(quickCats.length ? { categories: quickCats } : {}),
                  },
                });
                if (ensured.ok) isVendor = true;
              } catch { /* best-effort: the portal's get-or-create still catches them */ }
            } else {
              try {
                const { data: vp2 } = await db.from('vendor_profiles').select('id').eq('auth_id', data.user.id).maybeSingle();
                if (!vp2) {
                  let hasApplication = false;
                  const { data: appByAuth } = await db.from('vendor_applications')
                    .select('id').eq('auth_id', data.user.id)
                    .order('created_at', { ascending: false }).limit(1).maybeSingle();
                  hasApplication = Boolean(appByAuth);
                  if (!hasApplication && data.user.email) {
                    const esc = data.user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
                    const { data: appByEmail } = await db.from('vendor_applications')
                      .select('id').ilike('email', esc)
                      .order('created_at', { ascending: false }).limit(1).maybeSingle();
                    hasApplication = Boolean(appByEmail);
                  }
                  organicDest = hasApplication ? '/apply/status' : '/apply?from=signup';
                }
              } catch { /* fall back to default routing */ }
            }
          }
        }
        dest = next || organicDest || (role === 'admin' || role === 'super_admin' ? '/admin'
          : role === 'vendor' || isVendor ? '/vendor/portal?welcome=1'
          : '/buyer');
      }
    }
  } catch { /* fall through to login */ }

  return NextResponse.redirect(new URL(dest, url.origin));
}
