// POST /api/vendor/purchase — vendor records the closed deal (final amount,
// PO/invoice refs) on one of MY accepted leads. The NXT//LINK commission is
// recalculated on the FINAL amount and billed: invoice number + 30-day due
// date. This is the "report closed deals" obligation from the vendor terms.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { calculateFee } from '@/lib/fees/engine';
import { notifyBuyer } from '@/lib/notify';

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.quote_request_id || '');
  const amount = Number(body.amount || 0);
  if (!id) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, message: 'Enter the final purchase amount' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: opp } = await db.from('quote_requests')
    .select('id, public_ref, email, buyer_decision')
    .eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Lead not found' }, { status: 404 });
  if (opp.buyer_decision !== 'accepted') return NextResponse.json({ ok: false, message: 'The buyer must accept the quote before recording a purchase' }, { status: 400 });

  const dateOf = (v: unknown) => { const s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };
  const { error: pErr } = await db.from('purchases').upsert({
    quote_request_id: id,
    vendor_id: vendor.id,
    amount,
    currency: String(body.currency || 'USD').slice(0, 8),
    po_number: String(body.po_number || '').trim().slice(0, 80) || null,
    invoice_ref: String(body.invoice_ref || '').trim().slice(0, 80) || null,
    purchased_at: dateOf(body.purchased_at) || new Date().toISOString().slice(0, 10),
    notes: String(body.notes || '').trim().slice(0, 1000) || null,
  }, { onConflict: 'quote_request_id' });
  if (pErr) return NextResponse.json({ ok: false, message: pErr.message }, { status: 500 });

  // Bill the commission on the FINAL amount.
  const fee = calculateFee(amount);
  const now = new Date();
  const due = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const invoiceNumber = `NXT-${now.getFullYear()}-${String(opp.public_ref || '').replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase() || id.slice(0, 8)}`;
  const { data: com, error: cErr } = await db.from('commissions').update({
    final_amount: amount,
    commission_amount: fee.fee,
    effective_rate: fee.effectiveRate,
    status: 'won',
    invoice_number: invoiceNumber,
    billed_at: now.toISOString(),
    due_date: due,
    updated_at: now.toISOString(),
  }).eq('quote_request_id', id).eq('vendor_id', vendor.id)
    .select('commission_amount, effective_rate, invoice_number, due_date, status').maybeSingle();
  if (cErr) return NextResponse.json({ ok: false, message: cErr.message }, { status: 500 });

  await notifyBuyer(db, (opp.email as string) || '', id, 'purchase', `Purchase recorded for ${opp.public_ref} — thank you for buying through NXT//LINK`);
  return NextResponse.json({ ok: true, commission: com });
}
