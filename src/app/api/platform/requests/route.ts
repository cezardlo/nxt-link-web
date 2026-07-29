// /api/platform/requests
// POST: submit a finished client request (server-side write via service role).
// GET:  list recent requests for the admin console (access-code protected).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { logAudit } from '@/lib/assistant/llm';
import { isAdminRequest } from '@/lib/assistant/auth';
import { dispatchRequestToVendors } from '@/lib/requests/dispatch';
import { getSessionUser } from '@/lib/auth/require-user';

export async function POST(req: Request) {
  // Login wall (owner decision, 2026-07-23; mirrors /api/marketplace/request:19-20):
  // submitting a buyer request now REQUIRES a signed-in account. This closes the
  // old anonymous, free-typed-email hole where anyone could loop this endpoint
  // and make the platform email real vendors from its own sending domain
  // (security audit 2026-07-28, C2). The sibling marketplace RFQ route was
  // walled for exactly this reason; this lane was missed.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: 'auth_required', message: 'Sign in to submit a request' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const summary = (body.summary as Record<string, unknown>) || {};
  const contact = (body.contact as Record<string, unknown>) || {};
  // Cap every free-text field: audit C2 flagged that these intake fields — unlike
  // every other intake route — had no length bound, so a scripted caller could
  // bloat the row unbounded.
  const cap = (v: unknown, n: number) => String(v || '').slice(0, n);

  const row = {
    category: cap(summary.category || body.category, 120),
    problem: cap(summary.problem, 4000),
    quantity: cap(summary.quantity, 200),
    location: cap(summary.location, 300),
    deadline: cap(summary.deadline, 200),
    urgency: cap(summary.urgency, 120),
    budget_range: cap(summary.budget_range, 200),
    nda_required: Boolean(summary.nda_required),
    vendor_scope: ['local', 'global', 'both'].includes(String(body.vendor_scope))
      ? String(body.vendor_scope)
      : 'both',
    intake_answers: summary.answers || [],
    ai_summary: summary,
    missing_info: summary.missing_info || [],
    recommended_categories: summary.recommended_categories || [],
    // Attribute the request to the authenticated account, NOT a free-typed value
    // — the signed-in email is the source of truth, so a request can't be
    // attributed to a spoofed address (audit C2).
    contact_email: ((user.email || String(contact.email || '')).trim().toLowerCase()).slice(0, 200),
    contact_name: cap(contact.name, 200),
    locale: body.locale === 'es' ? 'es' : 'en',
    status: 'request_received',
    pipeline_stage: 'new_request',
    source: 'intake_assistant',
  };

  if (!isSupabaseConfigured()) {
    // No DB in this environment — echo a synthetic ref so the UI still flows.
    const ref = 'REQ-' + Math.abs(hash(JSON.stringify(row))).toString(36).slice(0, 8).toUpperCase();
    return NextResponse.json({ ok: true, stored: false, public_ref: ref, request: row });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db.from('client_requests').insert(row).select('id, public_ref').single();
    if (error) throw error;
    await logAudit({ action: 'client_request_submitted', role: 'client', request_id: data?.id, after_status: 'request_received' });

    // Push the request to matched vendors so it actually reaches them instead
    // of waiting for a vendor to browse open requests. Best-effort, non-blocking.
    let dispatched = 0;
    if (data?.id) {
      const result = await dispatchRequestToVendors(db, {
        id: data.id as string,
        public_ref: (data.public_ref as string) || null,
        category: row.category,
        problem: row.problem,
        location: row.location,
        contact_name: row.contact_name,
        contact_email: row.contact_email,
      });
      dispatched = result.dispatched;
    }
    return NextResponse.json({ ok: true, stored: true, id: data?.id, public_ref: data?.public_ref, dispatched });
  } catch (e) {
    // Degrade gracefully when the DB is unreachable/misconfigured: still return
    // a reference so the client flow completes instead of erroring.
    const ref = 'REQ-' + Math.abs(hash(JSON.stringify(row))).toString(36).slice(0, 8).toUpperCase();
    return NextResponse.json({
      ok: true,
      stored: false,
      degraded: true,
      public_ref: ref,
      message: e instanceof Error ? e.message : 'Could not store request',
    });
  }
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, stored: false, requests: [] });
  }
  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from('client_requests')
      .select('id, public_ref, category, problem, location, urgency, status, pipeline_stage, created_at, ai_summary, missing_info, recommended_categories, nda_required')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, stored: true, requests: data || [] });
  } catch (e) {
    // Degrade gracefully: an admin UI should render an empty list, not a 500,
    // when the DB is unreachable or misconfigured.
    return NextResponse.json({
      ok: true,
      stored: false,
      degraded: true,
      requests: [],
      message: e instanceof Error ? e.message : 'Could not load requests',
    });
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
