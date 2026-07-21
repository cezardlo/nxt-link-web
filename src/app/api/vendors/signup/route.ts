// POST /api/vendors/signup
// A company signs up to receive opportunities (the ORGANIC lane — always
// review-gated). Stores a PENDING vendor_profiles row through the shared
// creator (src/lib/vendor/profile.ts) so a same-email profile is reused, not
// duplicated. Click-wrap is enforced fail-closed: the ToS/Privacy acceptance
// row is written before the profile. Optionally drafts a welcome email via
// Zoho. Degrades gracefully when Supabase/Zoho are not configured.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ensureVendorProfile } from '@/lib/vendor/profile';
import { recordLegalAcceptance, LEGAL_MSG, bilingual } from '@/lib/legal/acceptance';
import { sendZohoMail } from '@/lib/zoho/mail';

interface SignupBody {
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  categories?: string[];
  service_areas?: string[];
  description?: string;
  locale?: string;
  terms_accepted?: boolean;
}

export async function POST(req: Request) {
  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const companyName = String(body.company_name || '').trim();
  const email = String(body.email || '').trim();
  const locale: 'en' | 'es' = body.locale === 'es' ? 'es' : 'en';
  if (!companyName) return NextResponse.json({ ok: false, message: 'Company name is required' }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ ok: false, message: 'A valid email is required' }, { status: 400 });

  // Click-wrap gate — fail closed (process doc §4): no accepted terms, no registration.
  if (body.terms_accepted !== true) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.required, locale) }, { status: 400 });
  }

  const row = {
    company_name: companyName,
    contact_name: String(body.contact_name || '').trim(),
    email,
    phone: String(body.phone || '').trim(),
    website: String(body.website || '').trim(),
    city: String(body.city || '').trim(),
    categories: Array.isArray(body.categories) ? body.categories.slice(0, 30) : [],
    service_areas: Array.isArray(body.service_areas) ? body.service_areas.slice(0, 20) : [],
    description: String(body.description || '').trim().slice(0, 4000),
    locale: body.locale === 'es' ? 'es' : 'en',
    status: 'pending',
    source: 'signup',
  };

  if (!isSupabaseConfigured()) {
    const ref = 'VEN-' + Math.abs(hash(JSON.stringify(row))).toString(36).slice(0, 8).toUpperCase();
    return NextResponse.json({ ok: true, stored: false, degraded: true, public_ref: ref, vendor: row });
  }

  // Record the ToS/Privacy acceptance BEFORE the profile — if the evidence
  // row can't be written, the registration is rejected (fail closed).
  const dbLegal = getSupabaseClient({ admin: true });
  const recorded = await recordLegalAcceptance(dbLegal, {
    email,
    context: 'vendor_signup',
    languageShown: locale,
    req,
  });
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.recordFailed, locale) }, { status: 500 });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    // ONE shared creator — reuses a same-email profile instead of inserting a
    // duplicate; the 'organic' lane is always born pending (review-gated).
    const ensured = await ensureVendorProfile(db, {
      lane: 'organic',
      email,
      select: 'id, public_ref, status, auth_id, email, company_name',
      profile: row,
    });
    if (!ensured.ok) throw new Error(ensured.error);
    const data = ensured.row as { id?: string; public_ref?: string };

    // Best-effort welcome email (draft if Zoho not connected) — only for a
    // NEW registration, never re-sent to an already-registered company.
    const mail = ensured.created
      ? await sendZohoMail({
          to: email,
          subject: 'Welcome to NXT//LINK — your company is registered',
          body: welcomeEmail(companyName, data?.public_ref || ''),
        }).catch(() => ({ ok: true, sent: false, provider: 'fallback' as const }))
      : { ok: true, sent: false, provider: 'fallback' as const };

    return NextResponse.json({
      ok: true,
      stored: true,
      id: data?.id,
      public_ref: data?.public_ref,
      already_registered: !ensured.created,
      email_sent: mail.sent,
      email_provider: mail.provider,
    });
  } catch (e) {
    const ref = 'VEN-' + Math.abs(hash(JSON.stringify(row))).toString(36).slice(0, 8).toUpperCase();
    return NextResponse.json({
      ok: true,
      stored: false,
      degraded: true,
      public_ref: ref,
      message: e instanceof Error ? e.message : 'Could not store signup',
    });
  }
}

function welcomeEmail(company: string, ref: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#0F172A">
  <p>Hi ${escapeHtml(company)},</p>
  <p>Thanks for registering with <b>NXT//LINK</b>. Your company profile (<b>${escapeHtml(ref)}</b>)
  is under review. Once approved, you'll start receiving protected, pre-qualified
  warehouse opportunities that match what you provide.</p>
  <p>A member of our team will follow up shortly.</p>
  <p>— NXT//LINK</p></div>`;
}
function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m] as string));
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
