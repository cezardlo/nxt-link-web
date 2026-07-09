// POST  /api/vendor/pilot — create a demo/pilot/site-visit on one of MY leads
// PATCH /api/vendor/pilot — update MY pilot (status, schedule, results, outcome)
// Build step 8: demo/pilot tracking, scoped to the signed-in vendor's own rows.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { notifyBuyer } from '@/lib/notify';
import { maskContacts } from '@/lib/guard';
import { sendZohoMail } from '@/lib/zoho/mail';

const KINDS = ['demo', 'pilot', 'site_visit'];
const STATUSES = ['proposed', 'scheduled', 'in_progress', 'completed', 'cancelled'];
const OUTCOMES = ['passed', 'failed', 'inconclusive'];
const COLS = 'id, quote_request_id, kind, status, scheduled_for, location, scope, success_criteria, results, outcome, created_at';

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const qrId = String(body.quote_request_id || '');
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : 'demo';
  if (!qrId) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: opp } = await db.from('quote_requests').select('id, email, public_ref, buyer_decision').eq('id', qrId).eq('vendor_id', vendor.id).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Lead not found' }, { status: 404 });

  // Anti-circumvention: pilot text fields carry no contact details pre-acceptance.
  const guard = (v: string) => (opp.buyer_decision === 'accepted' ? v : maskContacts(v).masked);
  const { data, error } = await db.from('pilots').insert({
    quote_request_id: qrId,
    vendor_id: vendor.id,
    kind,
    status: body.scheduled_for ? 'scheduled' : 'proposed',
    scheduled_for: body.scheduled_for ? String(body.scheduled_for) : null,
    location: guard(String(body.location || '').slice(0, 300)) || null,
    scope: guard(String(body.scope || '').slice(0, 2000)) || null,
    success_criteria: guard(String(body.success_criteria || '').slice(0, 2000)) || null,
  }).select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await notifyBuyer(db, (opp.email as string) || '', qrId, 'pilot', `A ${kind.replace('_', ' ')} was proposed for ${opp.public_ref}`);
  if (opp.email) {
    sendZohoMail({
      to: opp.email as string,
      subject: `NXT//LINK: a ${kind.replace('_', ' ')} was proposed for your request ${opp.public_ref}`,
      body: `${vendor.company_name} proposed a ${kind.replace('_', ' ')} for your request (${opp.public_ref}) through NXT//LINK. Track it in your dashboard: /buyer`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, pilot: data });
}

export async function PATCH(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  // Anti-circumvention: mask contact details in pilot text pre-acceptance.
  const { data: pilotRow } = await db.from('pilots').select('quote_request_id').eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!pilotRow) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  const { data: opp } = await db.from('quote_requests').select('buyer_decision').eq('id', pilotRow.quote_request_id as string).maybeSingle();
  const guard = (v: string) => (opp?.buyer_decision === 'accepted' ? v : maskContacts(v).masked);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (STATUSES.includes(String(body.status))) patch.status = body.status;
  if (body.scheduled_for !== undefined) patch.scheduled_for = body.scheduled_for ? String(body.scheduled_for) : null;
  if (typeof body.location === 'string') patch.location = guard(body.location.slice(0, 300)) || null;
  if (typeof body.scope === 'string') patch.scope = guard(body.scope.slice(0, 2000)) || null;
  if (typeof body.success_criteria === 'string') patch.success_criteria = guard(body.success_criteria.slice(0, 2000)) || null;
  if (typeof body.results === 'string') patch.results = guard(body.results.slice(0, 2000)) || null;
  if (body.outcome === null || OUTCOMES.includes(String(body.outcome))) patch.outcome = body.outcome;
  const { data, error } = await db.from('pilots').update(patch)
    .eq('id', id).eq('vendor_id', vendor.id).select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pilot: data });
}
