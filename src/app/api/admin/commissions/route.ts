// GET   /api/admin/commissions — operator money ledger: every opportunity's
//        commission with vendor/buyer context + totals.
// PATCH /api/admin/commissions {id, action:'mark_paid'|'mark_unpaid'} — settle.
// Admin/operator only.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, rows: [], totals: { pipeline: 0, billed_due: 0, paid: 0 } });

  const db = getSupabaseClient({ admin: true });
  const { data: coms } = await db.from('commissions')
    .select('id, quote_request_id, vendor_id, quote_amount, final_amount, commission_amount, effective_rate, status, invoice_number, billed_at, due_date, paid_at, protected_until, created_at')
    .order('created_at', { ascending: false }).limit(500);
  const rows = coms || [];

  const qrIds = rows.map((r) => r.quote_request_id);
  const vIds = Array.from(new Set(rows.map((r) => r.vendor_id)));
  const [qrRes, vRes] = await Promise.all([
    qrIds.length ? db.from('quote_requests').select('id, public_ref, company, buyer_decision').in('id', qrIds) : Promise.resolve({ data: [] }),
    vIds.length ? db.from('vendor_profiles').select('id, company_name').in('id', vIds) : Promise.resolve({ data: [] }),
  ]);
  const qrs = new Map<string, { public_ref: string; company: string | null; buyer_decision: string | null }>();
  for (const q of qrRes.data || []) qrs.set(q.id as string, { public_ref: q.public_ref as string, company: (q.company as string) || null, buyer_decision: (q.buyer_decision as string) || null });
  const vendors = new Map<string, string>();
  for (const v of vRes.data || []) vendors.set(v.id as string, v.company_name as string);

  const enriched = rows.map((r) => ({
    ...r,
    ref: qrs.get(r.quote_request_id as string)?.public_ref || '—',
    buyer_company: qrs.get(r.quote_request_id as string)?.company || '—',
    vendor_name: vendors.get(r.vendor_id as string) || '—',
  }));

  const sum = (f: (r: typeof rows[number]) => boolean) =>
    Math.round(rows.filter(f).reduce((s, r) => s + Number(r.commission_amount || 0), 0) * 100) / 100;
  const totals = {
    pipeline: sum((r) => r.status === 'quoted' || r.status === 'accepted'),
    billed_due: sum((r) => r.status === 'won' && !r.paid_at),
    paid: sum((r) => r.status === 'paid' || !!r.paid_at),
  };
  return NextResponse.json({ ok: true, rows: enriched, totals });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  let body: { id?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const patch = body.action === 'mark_unpaid'
    ? { paid_at: null, status: 'won', updated_at: new Date().toISOString() }
    : { paid_at: new Date().toISOString(), status: 'paid', updated_at: new Date().toISOString() };
  const { error } = await db.from('commissions').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
