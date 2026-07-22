// GET  /api/vendor/open-requests — open buyer needs (posted via /intake) that
//      vendors can respond to. Anti-leak: NO buyer contact info is exposed —
//      only the need itself. Relevant-to-you requests are flagged first.
//      Left UNGATED by approval status on purpose: browsing alone creates no
//      lead and reveals no buyer contact info (same anti-leak discipline as
//      the public marketplace), so it doesn't trip Cesar's "no receiving/
//      working leads before approval" rule (F1 decision, 2026-07-22) — a
//      pending vendor can look around while under review, same as they can
//      draft listings, just can't act.
// POST /api/vendor/open-requests {id} — respond: creates a lead (opportunity)
//      in MY leads inbox wired to the existing quote/commission pipeline, and
//      emails the buyer. THIS is the lead-receiving action, so it's gated:
//      only an approved, non-restricted vendor may respond (see the check
//      below).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { notifyBuyer } from '@/lib/notify';
import { canReceiveLeads } from '@/lib/vendor/moderation';

const OPEN_STATUSES = ['request_received', 'new'];

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, requests: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  // Never select contact_email here — the browse response must stay
  // contact-free (POST re-queries it separately when a response is created).
  const { data: reqs } = await db.from('client_requests')
    .select('id, public_ref, category, problem, location, urgency, budget_range, created_at')
    .in('status', OPEN_STATUSES)
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = reqs || [];

  // Which ones did I already respond to? (a lead exists with my vendor_id +
  // that request ref in answers)
  const { data: mine } = await db.from('quote_requests')
    .select('answers').eq('vendor_id', vendor.id).not('answers', 'is', null).limit(500);
  const respondedRefs = new Set(
    (mine || []).map((m) => (m.answers as { source_request?: string })?.source_request).filter(Boolean),
  );

  const cats = (vendor.categories || []).map((c) => c.toLowerCase());
  const inds = (vendor.industries || []).map((c) => c.toLowerCase());
  const out = rows.map((r) => {
    const hay = `${r.category || ''} ${r.problem || ''}`.toLowerCase();
    // Human-readable match reasons — which of MY categories/industries this
    // request mentions. relevant == at least one reason.
    const reasons = [
      ...cats.filter((c) => c && hay.includes(c.split(' ')[0])).map((c) => `You provide ${c}`),
      ...inds.filter((i) => i && hay.includes(i.split(' ')[0])).map((i) => `You serve ${i}`),
    ];
    return {
      id: r.id, public_ref: r.public_ref, category: r.category, problem: r.problem,
      location: r.location, urgency: r.urgency, budget_range: r.budget_range,
      created_at: r.created_at, relevant: reasons.length > 0, reasons,
      responded: respondedRefs.has(r.public_ref as string),
    };
  }).sort((a, b) => Number(b.relevant) - Number(a.relevant));

  return NextResponse.json({ ok: true, requests: out });
}

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });

  // Fail-closed: responding here creates a lead + emails the buyer, so it's a
  // "receiving a qualified lead" action same as an RFQ dispatch — Cesar's
  // rule, no working leads before business verification (F1 decision,
  // 2026-07-22; an invited-but-not-yet-approved vendor is exactly the case
  // this closes). Reuses the SAME 404 as "no profile" above — a pending or
  // restricted vendor gets no signal beyond what a signed-out caller would
  // see, no new status oracle.
  const { data: modRow } = await db.from('vendor_profiles')
    .select('status, moderation_status, suspended_until').eq('id', vendor.id).maybeSingle();
  if (!modRow || !canReceiveLeads({ status: (modRow.status as string) || null, moderation_status: (modRow.moderation_status as string) || null, suspended_until: (modRow.suspended_until as string) || null })) {
    return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
  }

  const { data: r } = await db.from('client_requests')
    .select('id, public_ref, category, problem, location, urgency, contact_name, contact_email')
    .eq('id', id).in('status', OPEN_STATUSES).maybeSingle();
  if (!r) return NextResponse.json({ ok: false, message: 'Request not found or closed' }, { status: 404 });
  if (!r.contact_email) return NextResponse.json({ ok: false, message: 'This request has no reachable buyer' }, { status: 400 });

  // One response per vendor per request.
  const { data: dup } = await db.from('quote_requests')
    .select('id').eq('vendor_id', vendor.id).contains('answers', { source_request: r.public_ref }).maybeSingle();
  if (dup) return NextResponse.json({ ok: false, message: 'You already responded to this request — see your leads inbox' }, { status: 400 });

  const { data: lead, error } = await db.from('quote_requests').insert({
    kind: 'product',
    vendor_id: vendor.id,
    company: r.contact_name || 'Buyer request',
    contact_name: r.contact_name,
    email: r.contact_email,
    message: `[Open request ${r.public_ref}] ${r.problem || ''}${r.location ? ` — ${r.location}` : ''}`.slice(0, 3000),
    answers: { request_type: 'open_rfq', source_request: r.public_ref },
    status: 'new',
  }).select('id, public_ref').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await notifyBuyer(db, r.contact_email as string, lead.id as string, 'quote', `${vendor.company_name} wants to quote your request ${r.public_ref}`);
  return NextResponse.json({ ok: true, lead });
}
