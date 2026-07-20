// Internal concierge deal tracker + commission calculator. Admin-only.
// GET   — list manual deals (newest first)
// POST  — create a deal; the fee engine computes commission from the NET amount
//         (5% first $50k, 3% above, $20k cap), applies a free credit if flagged,
//         and stamps the 12-month protection window.
// PATCH — update status (won → payment_confirmed → invoiced → paid …) / invoice ref.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { calculateFee, DEFAULT_FEE_POLICY, FREE_DEAL_CREDIT, PROTECTION_MONTHS } from '@/lib/fees/engine';
import { effectiveModeration, MODERATION_LABEL } from '@/lib/vendor/moderation';

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, deals: [], policy: DEFAULT_FEE_POLICY });
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('manual_deals').select('*').order('created_at', { ascending: false }).limit(200);
  return NextResponse.json({ ok: true, deals: data || [], policy: { version: DEFAULT_FEE_POLICY.version, brackets: DEFAULT_FEE_POLICY.brackets, cap: DEFAULT_FEE_POLICY.maximumFee, free_credit: FREE_DEAL_CREDIT, protection_months: PROTECTION_MONTHS } });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const vendorName = typeof body.vendor_name === 'string' ? body.vendor_name.trim().slice(0, 200) : '';
  const net = Number(body.net_amount);
  if (!vendorName) return NextResponse.json({ ok: false, message: 'Vendor name required' }, { status: 400 });
  if (!Number.isFinite(net) || net <= 0) return NextResponse.json({ ok: false, message: 'Enter a valid net amount' }, { status: 400 });

  const fee = calculateFee(net);
  const isFreeCredit = Boolean(body.is_free_credit);
  // A free credit reduces the commission by up to FREE_DEAL_CREDIT (not a full waiver).
  const creditApplied = isFreeCredit ? Math.min(FREE_DEAL_CREDIT, fee.fee) : 0;
  const commission = Math.round((fee.fee - creditApplied) * 100) / 100;

  const s = (k: string, max = 300): string | null =>
    typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim().slice(0, max) : null;

  const protectedUntil = new Date();
  protectedUntil.setMonth(protectedUntil.getMonth() + PROTECTION_MONTHS);

  const row = {
    opportunity_ref: s('opportunity_ref', 40),
    vendor_id: s('vendor_id', 60),
    vendor_name: vendorName,
    buyer_name: s('buyer_name', 200),
    buyer_company: s('buyer_company', 200),
    description: s('description', 1000),
    gross_amount: Number.isFinite(Number(body.gross_amount)) ? Number(body.gross_amount) : null,
    net_amount: net,
    currency: (s('currency', 8) || 'USD').toUpperCase(),
    fee_policy_version: fee.policyVersion,
    commission_amount: commission,
    effective_rate: net > 0 ? Math.round((commission / net) * 10000) / 10000 : 0,
    applied_cap: fee.appliedMaximum,
    is_free_credit: isFreeCredit,
    credit_applied: creditApplied || null,
    status: 'reserved',
    protected_until: protectedUntil.toISOString().slice(0, 10),
    notes: s('notes', 1000),
  };

  const db = getSupabaseClient({ admin: true });

  // A suspended or banned vendor can't have new deals logged against them.
  if (row.vendor_id) {
    const { data: mod } = await db.from('vendor_profiles')
      .select('moderation_status, suspended_until').eq('id', row.vendor_id).maybeSingle();
    if (mod) {
      const eff = effectiveModeration(mod);
      if (eff !== 'active') {
        return NextResponse.json({ ok: false, code: 'vendor_restricted',
          message: `This vendor is ${MODERATION_LABEL[eff].toLowerCase()} — you can’t log a new deal for them. Reactivate them first if this is resolved.` }, { status: 409 });
      }
    }
  }

  const { data, error } = await db.from('manual_deals').insert(row).select('*').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deal: data, breakdown: fee.lines });
}

const STATUSES = ['reserved', 'won', 'payment_reported', 'payment_confirmed', 'invoiced', 'paid', 'overdue', 'disputed', 'credited', 'cancelled'];

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (STATUSES.includes(String(body.status))) patch.status = String(body.status);
  if (typeof body.invoice_ref === 'string') patch.invoice_ref = body.invoice_ref.trim().slice(0, 80) || null;
  if (body.status === 'paid') patch.paid_at = new Date().toISOString();
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from('manual_deals').update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deal: data });
}
