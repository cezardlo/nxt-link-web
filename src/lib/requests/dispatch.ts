// Push a buyer request out to matched vendors so it actually reaches them,
// instead of sitting until a vendor happens to browse /vendor/open-requests.
//
// Reuses the existing matching logic (scoreVendors) and writes leads into the
// SAME table the vendor leads inbox reads (quote_requests), mirroring the shape
// that /api/vendor/open-requests already creates. Each matched vendor also gets
// a best-effort notification. Everything here is best-effort: it never throws,
// so it can be fire-and-forget from a request-creation path.

import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreVendors, type MatchableVendor } from '@/lib/matching';
import { notifyVendor } from '@/lib/notify';
import { isRestricted } from '@/lib/vendor/moderation';
import { sendMail } from '@/lib/mail';
import { maskContacts } from '@/lib/guard';

export interface DispatchableRequest {
  id: string;
  public_ref: string | null;
  category?: string | null;
  problem?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  // Structured RFQ fields (Slice R1) — NON-BLIND ONLY. Deliberately no
  // budget_min/budget_max field exists on this type: the buyer's budget must
  // NEVER reach a vendor-facing quote_requests row created here (BLIND BUDGET
  // INVARIANT, workplace/plans/rfq-seamless-build-2026-07-29.md). Leaving the
  // field off the type makes leaking it a compile error, not just a review
  // catch — see tests/rfq-blind-budget.test.ts.
  request_kind?: string | null;
  quantity?: number | null;
  delivery_location?: string | null;
  preferred_timeline?: string | null;
  structured_specs?: Record<string, unknown> | null;
}

export interface DispatchResult {
  dispatched: number;
  skipped: number;
  matched: number;
}

// How many top-ranked vendors a single request fans out to (send-mode A,
// auto-match). Also the cap on send-mode B, invited vendors — see
// MAX_INVITES below and inviteVendorsToRequest.
export const MAX_VENDORS = 8;
// Minimum match score (0–100) required before we bother a vendor.
const MIN_SCORE = 20;

/** Optional knobs for dispatchRequestToVendors — used only when a request also
 * had specific vendors INVITED (send-mode B) before auto-match (send-mode A)
 * runs on top (the buyer's "both" choice): excludeVendorIds keeps an already-
 * invited vendor from getting a second, duplicate lead, and maxVendors lets
 * the combined total across both send modes stay bounded at MAX_VENDORS
 * instead of blasting MAX_VENDORS invites + MAX_VENDORS more auto-matched
 * vendors (workplace/plans/rfq-seamless-build-2026-07-29.md R1b: "no mass-
 * blast paths"). Omitted entirely, this behaves exactly as before this slice. */
export interface DispatchOptions {
  excludeVendorIds?: string[];
  maxVendors?: number;
}

/** Shared insert: one quote_requests lead for ONE vendor against ONE open
 * request, tagged by which send mode created it (dispatched = auto-match,
 * invited = buyer hand-picked). Idempotent per (vendor, request public_ref) —
 * a vendor who already has a lead for this request (from EITHER send mode)
 * is skipped, so re-running (admin re-push, or "both" modes choosing the same
 * vendor) never creates a duplicate. Returns the new lead's id, or null if
 * skipped/failed — never throws (callers already wrap in try/catch). */
async function insertLeadForVendor(
  db: SupabaseClient,
  request: DispatchableRequest,
  vendorId: string,
  tag: 'dispatched' | 'invited',
): Promise<string | null> {
  const ref = request.public_ref || '';
  const { data: dup } = await db
    .from('quote_requests')
    .select('id')
    .eq('vendor_id', vendorId)
    .contains('answers', { source_request: ref })
    .maybeSingle();
  if (dup) return null;

  const messageTag = tag === 'invited' ? 'Invited' : 'Open request';
  const message = `[${messageTag} ${ref}] ${request.problem || ''}${request.location ? ` — ${request.location}` : ''}`.slice(0, 3000);

  const { data: lead, error } = await db
    .from('quote_requests')
    .insert({
      kind: 'product',
      vendor_id: vendorId,
      company: request.contact_name || 'Buyer request',
      contact_name: request.contact_name || null,
      email: request.contact_email,
      message,
      answers: { request_type: 'open_rfq', source_request: ref, [tag]: true },
      status: 'new',
      request_kind: request.request_kind || null,
      quantity: request.quantity ?? null,
      delivery_location: request.delivery_location || null,
      preferred_timeline: request.preferred_timeline || null,
      structured_specs: request.structured_specs || {},
    })
    .select('id')
    .single();
  if (error || !lead) return null;
  return lead.id as string;
}

/**
 * Fan a buyer request out to its best-matching approved vendors (send-mode A,
 * "match me with vendors"). Idempotent per (vendor, request): a vendor who
 * already has a lead for this request public_ref is skipped, so re-running
 * (e.g. admin re-push, or running after inviteVendorsToRequest already
 * claimed some vendors) is safe.
 */
export async function dispatchRequestToVendors(
  db: SupabaseClient,
  request: DispatchableRequest,
  opts: DispatchOptions = {},
): Promise<DispatchResult> {
  const empty: DispatchResult = { dispatched: 0, skipped: 0, matched: 0 };
  try {
    const ref = request.public_ref || '';
    // A lead needs a reachable buyer email (revealed only after accept).
    if (!request.contact_email || !ref) return empty;

    const maxVendors = opts.maxVendors ?? MAX_VENDORS;
    if (maxVendors <= 0) return empty;
    const excluded = new Set(opts.excludeVendorIds || []);

    const { data: vendors } = await db
      .from('vendor_profiles')
      .select('id, company_name, email, categories, service_areas, status, moderation_status, suspended_until')
      .eq('status', 'approved')
      .limit(500);

    // INVARIANT (verified against src/lib/vendor/profile.ts + moderation.ts):
    // `status` is the one-way review/approval gate — only the admin_approval
    // lane sets it to 'approved' (F1 decision, 2026-07-22: invite no longer
    // does), and it never reverts once set. `moderation_status` is
    // a SEPARATE active/suspended/banned axis an admin can flip at any time
    // AFTER approval ("a vendor can be approved AND suspended" — moderation.ts
    // header). Filtering on `status` alone (the old bug) let RFQ fan-out keep
    // matching a vendor an admin had just suspended or banned. This mirrors
    // the same combined gate the public storefront uses to hide a vendor
    // (api/marketplace/vendor/[id]/route.ts: status for the "verified" badge,
    // moderation_status/suspended_until for visibility).
    const eligible = (vendors || []).filter(
      (v) => !excluded.has(v.id as string)
        && !isRestricted({ moderation_status: (v.moderation_status as string) || null, suspended_until: (v.suspended_until as string) || null }),
    );

    const enriched: MatchableVendor[] = eligible.map((v) => ({
      id: v.id as string,
      company_name: (v.company_name as string) || '',
      email: (v.email as string) || null,
      categories: (v.categories as string[]) || [],
      service_areas: (v.service_areas as string[]) || [],
      status: (v.status as string) || null,
    }));

    const ranked = scoreVendors(
      { category: request.category || '', location: request.location || '' },
      enriched,
    ).filter((v) => v.score >= MIN_SCORE).slice(0, maxVendors);

    if (!ranked.length) return { ...empty, matched: 0 };

    let dispatched = 0;
    let skipped = 0;

    for (const v of ranked) {
      try {
        const leadId = await insertLeadForVendor(db, request, v.id, 'dispatched');
        if (!leadId) { skipped++; continue; }

        await notifyVendor(
          db,
          v.id,
          leadId,
          'lead',
          `New request ${ref}${request.category ? ` — ${request.category}` : ''} matched to you`,
        );
        // Best-effort email alert, mirroring the tone/structure of the single-
        // listing path (api/marketplace/request/route.ts). No buyer contact
        // info (email/phone) in the body — same masking discipline as the
        // leads inbox pre-acceptance (api/vendor/leads/route.ts).
        if (v.email) {
          sendMail({
            to: v.email,
            subject: `NXT//LINK: new request ${ref}${request.category ? ` — ${request.category}` : ''} matched to you`,
            // Buyer free text is masked: email leaves our control, and pre-acceptance
            // no contact info may reach the vendor (anti-circumvention, §4.3).
            body: `A buyer request (${ref}) matches your profile${request.category ? ` — ${request.category}` : ''}.${request.location ? ` Location: ${maskContacts(request.location).masked}.` : ''}\n\n${maskContacts(request.problem || '').masked}\n\nRespond inside NXT//LINK — do not contact the buyer off-platform. Open your leads inbox: /vendor/leads`,
          }).catch(() => {});
        }
        dispatched++;
      } catch {
        skipped++;
      }
    }

    return { dispatched, skipped, matched: ranked.length };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Send-mode B (Slice R1b, 2026-07-30): "Invite specific vendors chosen from
// the marketplace" — the buyer picks who sees their request, instead of (or
// alongside) the auto-match ranking above. No scoreVendors ranking here: the
// buyer's own pick IS the reason, so the honest match-reason chip a vendor
// sees for one of these leads is "Invited by the buyer", never a fabricated
// score (GET /api/vendor/leads enforces this — see that route + the
// answers.invited tag written below).
// ---------------------------------------------------------------------------

// Cap on how many vendors a single "invite" send can reach — same sane bound
// as auto-match's fan-out, so this can never become a mass-blast path.
export const MAX_INVITES = MAX_VENDORS;

export interface InviteResult {
  invited: number;
  skipped: number;
  invitedVendorIds: string[];
}

/**
 * Invite specific, buyer-chosen vendors to quote on an open request. Only
 * approved + active vendors are ever actually invited (a stale/tampered id
 * pointing at a pending/suspended/banned vendor is silently skipped, same
 * fail-closed posture as the auto-match path) — the caller decides what to
 * do if `invited` comes back 0 (e.g. fall back to auto-match so the request
 * never dead-ends; see POST /api/platform/requests). Idempotent per (vendor,
 * request): re-inviting an already-invited vendor is a no-op.
 */
export async function inviteVendorsToRequest(
  db: SupabaseClient,
  request: DispatchableRequest,
  vendorIds: string[],
): Promise<InviteResult> {
  const empty: InviteResult = { invited: 0, skipped: 0, invitedVendorIds: [] };
  try {
    const ref = request.public_ref || '';
    if (!request.contact_email || !ref || !request.id) return empty;

    const ids = Array.from(new Set(vendorIds.filter(Boolean))).slice(0, MAX_INVITES);
    if (!ids.length) return empty;

    const { data: vendors } = await db
      .from('vendor_profiles')
      .select('id, company_name, email, status, moderation_status, suspended_until')
      .in('id', ids);

    // Approved + active only (same combined gate as dispatchRequestToVendors
    // above) — a buyer cannot invite a vendor who isn't actually live.
    const eligible = (vendors || []).filter(
      (v) => v.status === 'approved'
        && !isRestricted({ moderation_status: (v.moderation_status as string) || null, suspended_until: (v.suspended_until as string) || null }),
    );

    let invited = 0;
    let skipped = 0;
    const invitedVendorIds: string[] = [];

    for (const v of eligible) {
      try {
        const vendorId = v.id as string;
        const leadId = await insertLeadForVendor(db, request, vendorId, 'invited');
        if (!leadId) { skipped++; continue; }

        // Tracking/audit row (request_invitations) — best-effort, mirrors the
        // notify/email calls below: the real lead already exists in
        // quote_requests either way, so a failure here never blocks the vendor
        // actually seeing the request.
        try {
          await db.from('request_invitations').insert({
            request_id: request.id,
            vendor_id: vendorId,
            quote_request_id: leadId,
            status: 'invited',
          });
        } catch { /* best-effort */ }

        // In-app signal only, via the SAME notifyVendor() every other lead
        // type already uses (existing mechanism, not a new notification
        // center — just a new `type` value on it). The vendor also sees this
        // invite in-list with a "Direct invite" badge (GET /api/vendor/leads
        // + src/app/vendor/leads/page.tsx).
        await notifyVendor(
          db,
          vendorId,
          leadId,
          'invite',
          `${request.contact_name || 'A buyer'} invited you to quote ${ref}`,
        );
        // Email hook intentionally STUBBED (binding rule for this slice:
        // marketing owns all new email copy — no wording has been approved
        // yet for a "you were invited" vendor email). Wire in once Cesar/
        // marketing supply approved EN/ES copy, mirroring the shape of the
        // existing dispatchRequestToVendors() email above:
        // if (v.email) {
        //   sendMail({ to: v.email as string, subject: '…', body: '…' }).catch(() => {});
        // }
        invited++;
        invitedVendorIds.push(vendorId);
      } catch {
        skipped++;
      }
    }

    return { invited, skipped, invitedVendorIds };
  } catch {
    return empty;
  }
}
