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
}

export interface DispatchResult {
  dispatched: number;
  skipped: number;
  matched: number;
}

// How many top-ranked vendors a single request fans out to.
const MAX_VENDORS = 8;
// Minimum match score (0–100) required before we bother a vendor.
const MIN_SCORE = 20;

/**
 * Fan a buyer request out to its best-matching approved vendors.
 * Idempotent per (vendor, request): a vendor who already has a lead for this
 * request public_ref is skipped, so re-running (e.g. admin re-push) is safe.
 */
export async function dispatchRequestToVendors(
  db: SupabaseClient,
  request: DispatchableRequest,
): Promise<DispatchResult> {
  const empty: DispatchResult = { dispatched: 0, skipped: 0, matched: 0 };
  try {
    const ref = request.public_ref || '';
    // A lead needs a reachable buyer email (revealed only after accept).
    if (!request.contact_email || !ref) return empty;

    const { data: vendors } = await db
      .from('vendor_profiles')
      .select('id, company_name, email, categories, service_areas, status, moderation_status, suspended_until')
      .eq('status', 'approved')
      .limit(500);

    // INVARIANT (verified against src/lib/vendor/profile.ts + moderation.ts):
    // `status` is the one-way review/approval gate — 'approved' lanes (invite,
    // admin_approval) set it once and it never reverts. `moderation_status` is
    // a SEPARATE active/suspended/banned axis an admin can flip at any time
    // AFTER approval ("a vendor can be approved AND suspended" — moderation.ts
    // header). Filtering on `status` alone (the old bug) let RFQ fan-out keep
    // matching a vendor an admin had just suspended or banned. This mirrors
    // the same combined gate the public storefront uses to hide a vendor
    // (api/marketplace/vendor/[id]/route.ts: status for the "verified" badge,
    // moderation_status/suspended_until for visibility).
    const eligible = (vendors || []).filter(
      (v) => !isRestricted({ moderation_status: (v.moderation_status as string) || null, suspended_until: (v.suspended_until as string) || null }),
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
    ).filter((v) => v.score >= MIN_SCORE).slice(0, MAX_VENDORS);

    if (!ranked.length) return { ...empty, matched: 0 };

    let dispatched = 0;
    let skipped = 0;
    const message = `[Open request ${ref}] ${request.problem || ''}${request.location ? ` — ${request.location}` : ''}`.slice(0, 3000);

    for (const v of ranked) {
      try {
        // One lead per vendor per request — safe to re-run.
        const { data: dup } = await db
          .from('quote_requests')
          .select('id')
          .eq('vendor_id', v.id)
          .contains('answers', { source_request: ref })
          .maybeSingle();
        if (dup) { skipped++; continue; }

        const { data: lead, error } = await db
          .from('quote_requests')
          .insert({
            kind: 'product',
            vendor_id: v.id,
            company: request.contact_name || 'Buyer request',
            contact_name: request.contact_name || null,
            email: request.contact_email,
            message,
            answers: { request_type: 'open_rfq', source_request: ref, dispatched: true },
            status: 'new',
          })
          .select('id')
          .single();
        if (error || !lead) { skipped++; continue; }

        await notifyVendor(
          db,
          v.id,
          lead.id as string,
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
