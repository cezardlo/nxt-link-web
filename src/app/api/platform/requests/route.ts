// /api/platform/requests
// POST: submit a finished client request (server-side write via service role).
// GET:  list recent requests for the admin console (access-code protected).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { logAudit } from '@/lib/assistant/llm';
import { isAdminRequest } from '@/lib/assistant/auth';
import { dispatchRequestToVendors, inviteVendorsToRequest, MAX_VENDORS, MAX_INVITES } from '@/lib/requests/dispatch';
import { getSessionUser } from '@/lib/auth/require-user';
import { validateStructuredRequest } from '@/lib/requests/structured';

// Send-mode B (Slice R1b, 2026-07-30): "Invite specific vendors chosen from
// the marketplace" — workplace/plans/rfq-seamless-build-2026-07-29.md.
// Default 'auto_match' preserves every existing caller's behavior byte-for-
// byte (nothing new in the body validates to this default, same as every
// other Slice R1/RV addition on this route).
const SEND_MODES = ['auto_match', 'invite', 'both'] as const;
type SendMode = (typeof SEND_MODES)[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanInviteVendorIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of v) {
    const id = String(raw || '');
    if (UUID_RE.test(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
    if (out.length >= MAX_INVITES) break;
  }
  return out;
}

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

  // Structured RFQ fields (Slice R1) — NEW, typed columns alongside the
  // existing free-text ones above (quantity/location/deadline/budget_range
  // stay exactly as they were; old callers that never send these keep
  // working unchanged). Read from the same `summary` object as the existing
  // intake fields, under distinct keys so there is zero ambiguity with the
  // legacy free-text values already read above.
  const structured = validateStructuredRequest({
    request_kind: body.request_kind,
    quantity: summary.quantity_int,
    delivery_location: summary.delivery_location,
    preferred_timeline: summary.preferred_timeline,
    budget_min: summary.budget_min,
    budget_max: summary.budget_max,
    structured_specs: summary.structured_specs,
  });
  if (!structured.ok) {
    return NextResponse.json({ ok: false, code: 'invalid_structured_fields', message: structured.errors[0], errors: structured.errors }, { status: 400 });
  }

  const sendMode: SendMode = SEND_MODES.includes(body.send_mode as SendMode) ? (body.send_mode as SendMode) : 'auto_match';
  const inviteVendorIds = cleanInviteVendorIds(body.invite_vendor_ids);

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
    request_kind: structured.value.request_kind,
    quantity_int: structured.value.quantity,
    delivery_location: structured.value.delivery_location,
    preferred_timeline: structured.value.preferred_timeline,
    budget_min: structured.value.budget_min,
    budget_max: structured.value.budget_max,
    structured_specs: structured.value.structured_specs,
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

    // Push the request out to vendors so it actually reaches them instead of
    // waiting for one to browse open requests. Best-effort, non-blocking.
    // Two send modes (Slice R1b): auto_match (unchanged existing behavior,
    // the default) and invite/both (buyer hand-picked specific vendors —
    // see src/lib/requests/dispatch.ts inviteVendorsToRequest).
    let dispatched = 0;
    let invited = 0;
    if (data?.id) {
      const dispatchable = {
        id: data.id as string,
        public_ref: (data.public_ref as string) || null,
        category: row.category,
        problem: row.problem,
        location: row.location,
        contact_name: row.contact_name,
        contact_email: row.contact_email,
        // Non-blind structured fields only — DispatchableRequest has no
        // budget_min/budget_max field at all (see dispatch.ts), so a matched
        // vendor's lead can never carry the buyer's budget, structurally.
        request_kind: row.request_kind,
        quantity: row.quantity_int,
        delivery_location: row.delivery_location,
        preferred_timeline: row.preferred_timeline,
        structured_specs: row.structured_specs,
      };

      if (sendMode === 'invite' && inviteVendorIds.length) {
        const inviteResult = await inviteVendorsToRequest(db, dispatchable, inviteVendorIds);
        invited = inviteResult.invited;
        // No dead ends (spec §3): if every chosen vendor turned out to be
        // unreachable (e.g. suspended between page load and submit), fall
        // back to auto-match so the request still goes somewhere — invite
        // mode itself still sent to ONLY the chosen vendors, this is a
        // resilience path, not a silent auto-blast on top of a successful invite.
        if (inviteResult.invited === 0) {
          const result = await dispatchRequestToVendors(db, dispatchable);
          dispatched = result.dispatched;
        }
      } else if (sendMode === 'both' && inviteVendorIds.length) {
        const inviteResult = await inviteVendorsToRequest(db, dispatchable, inviteVendorIds);
        invited = inviteResult.invited;
        // Keep the COMBINED total bounded at MAX_VENDORS — auto-match only
        // fills whatever's left after the buyer's own picks, and never
        // re-invites a vendor already invited above.
        const remaining = MAX_VENDORS - inviteResult.invitedVendorIds.length;
        if (remaining > 0) {
          const result = await dispatchRequestToVendors(db, dispatchable, {
            excludeVendorIds: inviteResult.invitedVendorIds,
            maxVendors: remaining,
          });
          dispatched = result.dispatched;
        }
      } else {
        const result = await dispatchRequestToVendors(db, dispatchable);
        dispatched = result.dispatched;
      }
    }
    return NextResponse.json({
      ok: true, stored: true, id: data?.id, public_ref: data?.public_ref, dispatched, invited,
      request_kind: row.request_kind,
      quantity: row.quantity_int,
      delivery_location: row.delivery_location,
      preferred_timeline: row.preferred_timeline,
      budget_min: row.budget_min,
      budget_max: row.budget_max,
      structured_specs: row.structured_specs,
    });
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
