// Public invite API for the /join/[token] landing page.
//   GET  → load the invite for display (name, company, masked email, locale).
//          Marks clicked_at / status 'clicked' on first view. 404s unknown,
//          expired, opted-out, declined, and already_vendor tokens — the page
//          shows a generic "link no longer active" state (no data leaks).
//   POST → send the Supabase magic sign-in link (signInWithOtp with
//          shouldCreateUser, same auth pattern as /login) to the invite's
//          email. Runs server-side with the anon client so the full email
//          address never has to be exposed to whoever holds the link.
//          Phone-only invites (Phase 2) supply their email in the body.
// The token itself is the credential: 32-char random, server-generated,
// service-role-only table, 30-day expiry.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isEmailBanned } from '@/lib/vendor/moderation';
import { recordLegalAcceptance, LEGAL_MSG, bilingual } from '@/lib/legal/acceptance';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '');
const DEAD = ['expired', 'opted_out', 'declined', 'already_vendor'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  return `${local.slice(0, 1)}•••@${domain}`;
}

type Ctx = { params: { token: string } };

async function loadInvite(db: ReturnType<typeof getSupabaseClient>, token: string) {
  const { data } = await db.from('vendor_invites')
    .select('id, token, contact_name, company_name, email, phone, locale, status, expires_at, clicked_at')
    .eq('token', token).maybeSingle();
  return data;
}

export async function GET(_req: Request, { params }: Ctx) {
  const token = String(params.token || '');
  if (!token || !isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 404 });
  const db = getSupabaseClient({ admin: true });

  const inv = await loadInvite(db, token);
  if (!inv || DEAD.includes(inv.status as string)) return NextResponse.json({ ok: false }, { status: 404 });

  // Lazy 30-day expiry: mark it the first time anyone touches a stale token.
  if (new Date(inv.expires_at as string).getTime() < Date.now() && ['invited', 'reminded', 'clicked'].includes(inv.status as string)) {
    await db.from('vendor_invites').update({ status: 'expired' }).eq('id', inv.id);
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // First view = the "clicked" funnel stage (reminders stop distinguishing
  // here; the cron still nudges clicked-but-stalled invites per Growth's
  // stop rules — only signup/unsubscribe/decline halt the sequence).
  if (['invited', 'reminded'].includes(inv.status as string)) {
    await db.from('vendor_invites').update({ status: 'clicked', clicked_at: inv.clicked_at || new Date().toISOString() }).eq('id', inv.id);
  }

  return NextResponse.json({
    ok: true,
    invite: {
      contact_name: inv.contact_name,
      company_name: inv.company_name,
      locale: inv.locale === 'es' ? 'es' : 'en',
      email_masked: maskEmail(inv.email as string | null),
      has_email: Boolean(inv.email),
      status: ['invited', 'reminded'].includes(inv.status as string) ? 'clicked' : inv.status,
    },
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const token = String(params.token || '');
  if (!token || !isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not available' }, { status: 404 });
  const db = getSupabaseClient({ admin: true });

  let body: { email?: string; terms_accepted?: boolean; terms_language?: string; company_name?: string; supply_categories?: unknown } = {};
  try { body = await req.json(); } catch { /* tolerated — the click-wrap check below still applies */ }

  const inv = await loadInvite(db, token);
  if (!inv || DEAD.includes(inv.status as string)) return NextResponse.json({ ok: false, message: 'This invite is no longer active.' }, { status: 404 });
  if (new Date(inv.expires_at as string).getTime() < Date.now()) return NextResponse.json({ ok: false, message: 'This invite has expired.' }, { status: 404 });

  // Click-wrap gate — fail closed (process doc §4): the invited lane skips
  // admin review, never the terms. Error leads with the language they saw.
  const langShown: 'en' | 'es' = body.terms_language === 'es' ? 'es' : body.terms_language === 'en' ? 'en' : (inv.locale === 'es' ? 'es' : 'en');
  if (body.terms_accepted !== true) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.required, langShown) }, { status: 400 });
  }

  // Resolve the email to send the sign-in link to: the invite's own email,
  // or (phone-only invites) one supplied by the vendor on the landing page.
  let email = (inv.email as string | null)?.toLowerCase() || '';
  if (!email) {
    const supplied = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(supplied)) return NextResponse.json({ ok: false, message: 'Enter a valid email address.' }, { status: 400 });
    email = supplied;
    await db.from('vendor_invites').update({ email }).eq('id', inv.id);
  }

  if (await isEmailBanned(db, email)) {
    return NextResponse.json({ ok: false, message: 'This email cannot be used. Contact us for help.' }, { status: 403 });
  }

  // Quick-signup answers from the landing page (never ask twice):
  //  - a corrected company name updates the invite row (the operator may
  //    have typed it slightly wrong — the vendor knows best);
  //  - "what do you supply" chips ride in the OTP metadata below, and
  //    /auth/callback writes them onto the new vendor profile.
  const companyEdit = String(body.company_name || '').trim().slice(0, 120);
  if (companyEdit && companyEdit !== inv.company_name) {
    await db.from('vendor_invites').update({ company_name: companyEdit }).eq('id', inv.id);
  }
  const supplyCategories: string[] = [];
  if (Array.isArray(body.supply_categories)) {
    for (const raw of body.supply_categories) {
      const s = String(raw).trim().slice(0, 80);
      if (s && !supplyCategories.includes(s)) supplyCategories.push(s);
      if (supplyCategories.length >= 10) break;
    }
  }

  // Record the ToS/Privacy acceptance BEFORE sending the sign-in link — no
  // evidence row, no account email. user_id is linked at /auth/callback.
  const recorded = await recordLegalAcceptance(db, {
    email,
    context: 'invite_join',
    languageShown: langShown,
    relatedObjectType: 'vendor_invite',
    relatedObjectId: inv.id as string,
    req,
  });
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.recordFailed, langShown) }, { status: 500 });
  }

  // Same magic-link flow as /login (signInWithOtp), with shouldCreateUser so
  // the account is created when they click the emailed link. The /auth/callback
  // route then links the invite and creates their pre-approved vendor profile.
  const anon = getSupabaseClient();
  const redirect = `${SITE}/auth/callback?next=${encodeURIComponent('/vendor/portal?welcome=1')}`;
  const { error } = await anon.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect,
      shouldCreateUser: true,
      data: supplyCategories.length ? { supply_categories: supplyCategories } : undefined,
    },
  });
  if (error) return NextResponse.json({ ok: false, message: 'Could not send the sign-in link. Try again in a minute.' }, { status: 500 });

  return NextResponse.json({ ok: true, email_masked: maskEmail(email) });
}
