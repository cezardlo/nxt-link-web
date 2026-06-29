// POST /api/vendors/signup
// A company signs up to receive opportunities. Stores a vendor_profiles row
// (server-side, service role). Optionally drafts a welcome email via Zoho.
// Degrades gracefully when Supabase/Zoho are not configured.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
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
  if (!companyName) return NextResponse.json({ ok: false, message: 'Company name is required' }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ ok: false, message: 'A valid email is required' }, { status: 400 });

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

  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from('vendor_profiles')
      .insert(row)
      .select('id, public_ref, company_name, email')
      .single();
    if (error) throw error;

    // Best-effort welcome email (draft if Zoho not connected).
    const mail = await sendZohoMail({
      to: email,
      subject: 'Welcome to NXT//LINK — your company is registered',
      body: welcomeEmail(companyName, data?.public_ref || ''),
    }).catch(() => ({ ok: true, sent: false, provider: 'fallback' as const }));

    return NextResponse.json({
      ok: true,
      stored: true,
      id: data?.id,
      public_ref: data?.public_ref,
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
