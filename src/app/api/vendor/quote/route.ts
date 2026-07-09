// GET  /api/vendor/quote?amount=  — preview the NXT//LINK commission for an amount
// POST /api/vendor/quote          — submit MY structured quote for one of MY leads
// Builds steps 6 & 7: the vendor answers inside NXT//LINK, and a commission
// record is created for the opportunity using the deterministic fee engine.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { calculateFee, DEFAULT_FEE_POLICY } from '@/lib/fees/engine';
import { notifyBuyer } from '@/lib/notify';
import { maskContacts } from '@/lib/guard';
import { sendZohoMail } from '@/lib/zoho/mail';

const PROTECTED_PERIOD_DAYS = 90;

export async function GET(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  const amount = Number(new URL(req.url).searchParams.get('amount') || 0);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ ok: true, commission_amount: 0, effective_rate: 0, policy_version: DEFAULT_FEE_POLICY.version });
  const fee = calculateFee(amount);
  return NextResponse.json({ ok: true, commission_amount: fee.fee, effective_rate: fee.effectiveRate, policy_version: fee.policyVersion });
}

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.quote_request_id || '');
  const amount = Number(body.amount || 0);
  if (!id) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, message: 'Enter a valid quote amount' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  // The opportunity must belong to THIS vendor.
  const { data: opp } = await db.from('quote_requests').select('id, vendor_id, email, public_ref').eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Lead not found' }, { status: 404 });

  const fee = calculateFee(amount);
  const now = new Date();
  const protectedUntil = new Date(now.getTime() + PROTECTED_PERIOD_DAYS * 86400000).toISOString();
  const currency = String(body.currency || 'USD').slice(0, 8);

  const { error: upErr } = await db.from('quote_requests').update({
    quote_amount: amount,
    quote_currency: currency,
    quote_message: maskContacts(String(body.message || '').slice(0, 4000)).masked || null,
    quote_timeline: String(body.timeline || '').slice(0, 300) || null,
    quote_valid_until: body.valid_until ? String(body.valid_until).slice(0, 40) : null,
    quoted_at: now.toISOString(),
    protected_until: protectedUntil,
    status: 'responded',
    updated_at: now.toISOString(),
  }).eq('id', id).eq('vendor_id', vendor.id);
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { error: comErr } = await db.from('commissions').upsert({
    quote_request_id: id,
    vendor_id: vendor.id,
    quote_amount: amount,
    currency,
    fee_policy_version: fee.policyVersion,
    commission_amount: fee.fee,
    effective_rate: fee.effectiveRate,
    protected_period_days: PROTECTED_PERIOD_DAYS,
    protected_until: protectedUntil,
    status: 'quoted',
    updated_at: now.toISOString(),
  }, { onConflict: 'quote_request_id' });
  if (comErr) return NextResponse.json({ ok: false, message: comErr.message }, { status: 500 });

  // Tell the buyer a quote is waiting for them inside NXT//LINK.
  await notifyBuyer(db, (opp.email as string) || '', id, 'quote', `${vendor.company_name} sent you a quote (${opp.public_ref})`);
  if (opp.email) {
    sendZohoMail({
      to: opp.email as string,
      subject: `NXT//LINK: you received a quote (${opp.public_ref})`,
      body: `${vendor.company_name} sent you a quote through NXT//LINK for request ${opp.public_ref}. Review it and accept or decline in your dashboard: /buyer`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, commission: { amount: fee.fee, effective_rate: fee.effectiveRate, protected_until: protectedUntil } });
}
