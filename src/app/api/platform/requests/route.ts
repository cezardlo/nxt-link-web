// /api/platform/requests
// POST: submit a finished client request (server-side write via service role).
// GET:  list recent requests for the admin console (access-code protected).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { logAudit } from '@/lib/assistant/llm';
import { isAdminRequest } from '@/lib/assistant/auth';
import { dispatchRequestToVendors } from '@/lib/requests/dispatch';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const summary = (body.summary as Record<string, unknown>) || {};
  const contact = (body.contact as Record<string, unknown>) || {};

  const row = {
    category: String(summary.category || body.category || ''),
    problem: String(summary.problem || ''),
    quantity: String(summary.quantity || ''),
    location: String(summary.location || ''),
    deadline: String(summary.deadline || ''),
    urgency: String(summary.urgency || ''),
    budget_range: String(summary.budget_range || ''),
    nda_required: Boolean(summary.nda_required),
    vendor_scope: ['local', 'global', 'both'].includes(String(body.vendor_scope))
      ? String(body.vendor_scope)
      : 'both',
    intake_answers: summary.answers || [],
    ai_summary: summary,
    missing_info: summary.missing_info || [],
    recommended_categories: summary.recommended_categories || [],
    contact_email: String(contact.email || ''),
    contact_name: String(contact.name || ''),
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
