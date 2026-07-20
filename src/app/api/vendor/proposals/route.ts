// GET  /api/vendor/proposals?quote_request_id= — MY proposal revisions for a lead
// POST /api/vendor/proposals — save a draft or submit a structured proposal.
//   { quote_request_id, action: 'save' | 'submit', line_items: [...], ... }
// Submitted revisions are immutable (DB trigger); revising creates revision+1.
// On submit we mirror the summary onto quote_requests (buyer dashboard reads
// it), create the commission record, and notify the buyer — same contract as
// the legacy /api/vendor/quote, now with full line-item history.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { calculateFee } from '@/lib/fees/engine';
import { notifyBuyer } from '@/lib/notify';
import { maskContacts } from '@/lib/guard';
import { sendMail } from '@/lib/mail';

const PROTECTED_PERIOD_DAYS = 90;
const ITEM_KINDS = ['product', 'labor', 'install', 'shipping', 'travel', 'other'];

interface LineItem { description: string; qty: number; unit_price: number; kind: string }

function cleanItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).map((r) => {
    const o = (r || {}) as Record<string, unknown>;
    const qty = Number(o.qty);
    const unit = Number(o.unit_price);
    return {
      description: String(o.description || '').slice(0, 300),
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unit_price: Number.isFinite(unit) && unit >= 0 ? unit : 0,
      kind: ITEM_KINDS.includes(String(o.kind)) ? String(o.kind) : 'other',
    };
  }).filter((i) => i.description);
}

export async function GET(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, proposals: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const qrId = new URL(req.url).searchParams.get('quote_request_id');
  const db = getSupabaseClient({ admin: true });
  let q = db.from('quote_proposals').select('*').eq('vendor_id', vendor.id).order('revision', { ascending: false });
  if (qrId) q = q.eq('quote_request_id', qrId);
  const { data, error } = await q.limit(50);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, proposals: data || [] });
}

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const qrId = String(body.quote_request_id || '');
  const action = body.action === 'submit' ? 'submit' : 'save';
  if (!qrId) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  // The lead must belong to THIS vendor.
  const { data: opp } = await db.from('quote_requests')
    .select('id, vendor_id, email, public_ref, opportunity_ref')
    .eq('id', qrId).eq('vendor_id', vendor.id).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Lead not found' }, { status: 404 });

  const items = cleanItems(body.line_items);
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const tax = Math.max(0, Number(body.tax) || 0);
  const discount = Math.max(0, Number(body.discount) || 0);
  const total = Math.max(0, subtotal + tax - discount);
  if (action === 'submit' && (!items.length || total <= 0)) {
    return NextResponse.json({ ok: false, message: 'Add at least one line item with a price before submitting' }, { status: 400 });
  }

  const s = (k: string, max = 500): string | null =>
    typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim().slice(0, max) : null;

  const fields = {
    line_items: items,
    subtotal, tax: tax || null, discount: discount || null, total,
    currency: (s('currency', 8) || 'USD').toUpperCase(),
    lead_time: s('lead_time', 200),
    delivery_schedule: s('delivery_schedule', 400),
    warranty: s('warranty', 400),
    support: s('support', 400),
    payment_terms: s('payment_terms', 300),
    valid_until: s('valid_until', 10),
    assumptions: s('assumptions', 1500),
    exclusions: s('exclusions', 1500),
    notes: maskContacts(String(body.notes || '').slice(0, 3000)).masked || null,
  };

  // Find my latest revision for this lead.
  const { data: latest } = await db.from('quote_proposals').select('id, revision, status')
    .eq('quote_request_id', qrId).eq('vendor_id', vendor.id)
    .order('revision', { ascending: false }).limit(1).maybeSingle();

  let proposalId: string;
  let revision: number;

  if (latest && latest.status === 'draft') {
    // Update the existing draft in place.
    revision = latest.revision as number;
    const { error } = await db.from('quote_proposals').update(fields).eq('id', latest.id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    proposalId = latest.id as string;
  } else {
    // New draft (revision 1, or latest submitted + 1).
    revision = latest ? (latest.revision as number) + 1 : 1;
    const { data: created, error } = await db.from('quote_proposals')
      .insert({ quote_request_id: qrId, vendor_id: vendor.id, revision, status: 'draft', ...fields })
      .select('id').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    proposalId = (created as unknown as { id: string }).id;
    // The prior submitted revision is superseded.
    if (latest && ['submitted', 'final'].includes(String(latest.status))) {
      await db.from('quote_proposals').update({ status: 'revised' }).eq('id', latest.id);
    }
  }

  if (action === 'save') {
    return NextResponse.json({ ok: true, proposal_id: proposalId, revision, status: 'draft', subtotal, total });
  }

  // SUBMIT: freeze the revision, mirror summary, commission, notify.
  const now = new Date();
  const { error: subErr } = await db.from('quote_proposals')
    .update({ status: 'submitted', submitted_at: now.toISOString() }).eq('id', proposalId);
  if (subErr) return NextResponse.json({ ok: false, message: subErr.message }, { status: 500 });

  const fee = calculateFee(total);
  const protectedUntil = new Date(now.getTime() + PROTECTED_PERIOD_DAYS * 86400000).toISOString();
  const summaryMsg = [
    fields.notes,
    fields.assumptions ? `Assumptions: ${fields.assumptions}` : null,
    fields.exclusions ? `Exclusions: ${fields.exclusions}` : null,
  ].filter(Boolean).join('\n\n');

  const { error: upErr } = await db.from('quote_requests').update({
    quote_amount: total,
    quote_currency: fields.currency,
    quote_message: summaryMsg || null,
    quote_timeline: fields.lead_time,
    quote_valid_until: fields.valid_until,
    quoted_at: now.toISOString(),
    protected_until: protectedUntil,
    status: 'responded',
    updated_at: now.toISOString(),
  }).eq('id', qrId).eq('vendor_id', vendor.id);
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { error: comErr } = await db.from('commissions').upsert({
    quote_request_id: qrId,
    vendor_id: vendor.id,
    quote_amount: total,
    currency: fields.currency,
    fee_policy_version: fee.policyVersion,
    commission_amount: fee.fee,
    effective_rate: fee.effectiveRate,
    protected_period_days: PROTECTED_PERIOD_DAYS,
    protected_until: protectedUntil,
    status: 'quoted',
    updated_at: now.toISOString(),
  }, { onConflict: 'quote_request_id' });
  if (comErr) return NextResponse.json({ ok: false, message: comErr.message }, { status: 500 });

  const ref = (opp.opportunity_ref as string) || (opp.public_ref as string);
  await notifyBuyer(db, (opp.email as string) || '', qrId, 'quote',
    `${vendor.company_name} sent you a ${revision > 1 ? 'revised ' : ''}quote (${ref})`);
  if (opp.email) {
    sendMail({
      to: opp.email as string,
      subject: `NXT//LINK: you received a ${revision > 1 ? 'revised ' : ''}quote (${ref})`,
      body: `${vendor.company_name} sent you a quote through NXT//LINK for request ${ref}. Review it and accept or decline in your dashboard: /buyer`,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true, proposal_id: proposalId, revision, status: 'submitted', subtotal, total,
    commission: { amount: fee.fee, effective_rate: fee.effectiveRate, protected_until: protectedUntil },
  });
}
