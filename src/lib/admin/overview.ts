// Shared counts behind the operator console's "Needs your attention"
// dashboard (src/app/admin/page.tsx) AND its nav badges — ONE function so
// the two can never drift apart (call it once per request, reuse the result
// for both). Cesar's 2026-07-31 directive: a pending-tasks dashboard built
// ONLY from real queryable data — no fabricated metrics (ui-standards
// addendum §6).
//
// Every count is a real, admin-scoped Supabase query (head:true / exact
// count — no rows fetched, cheap). A single query failing degrades that ONE
// count to 0 rather than failing the whole dashboard — matches the
// degrade-gracefully pattern GET /api/platform/requests already uses; an
// admin landing screen should never 500 on a warm pass.
//
// Sources verified against the live route handlers before wiring this up:
//   - pendingVendorApplications: vendor_applications.status = 'pending'
//     (POST /api/apply/submit inserts new rows with status: 'pending';
//     src/app/api/admin/vendor-applications/route.ts is the review queue).
//     The status column IS reliably writable by the service-role admin
//     session (supabase/migrations/20260716_vendor_application_guard_allow_
//     service_role.sql), so this is a plain status filter — no need to
//     re-derive the "approved" join that route does for its own display.
//   - listingsAwaitingReview: marketplace_products/marketplace_services
//     status = 'needs_review' — the one discrete "entered review" state
//     (src/app/api/vendor/listings/route.ts: "AI-drafted listings start in
//     needs_review — a human must look before publish"). There is no
//     separate "first listing only" queue — needs_review IS the review
//     queue, for every AI-drafted listing regardless of listing number.
//   - newClientRequests7d: client_requests.created_at within the last 7
//     days (src/app/api/platform/requests/route.ts GET reads this table for
//     /admin/requests).
//   - quotesAwaitingBuyerDecision: quote_requests.status = 'responded' — a
//     vendor sent a quote and the buyer hasn't accepted/declined yet
//     (status enum 'new'|'viewed'|'responded'|'won'|'lost'|'spam', see
//     src/app/api/vendor/leads/route.ts). Informational only, per spec — no
//     dedicated admin action exists for this state today.
//   - Open disputes: OMITTED. No disputes table exists.
//     `dispute_status` in the commission_ledger view is a nullable
//     "Stripe-era placeholder" with no writer anywhere in the codebase
//     (supabase/migrations/20260721_one_deal_ledger.sql:365, DECISIONS §1) —
//     verified there is no real dispute data to count.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminOverviewCounts {
  pendingVendorApplications: number;
  listingsAwaitingReview: number;
  newClientRequests7d: number;
  quotesAwaitingBuyerDecision: number;
}

export const EMPTY_ADMIN_OVERVIEW_COUNTS: AdminOverviewCounts = {
  pendingVendorApplications: 0,
  listingsAwaitingReview: 0,
  newClientRequests7d: 0,
  quotesAwaitingBuyerDecision: 0,
};

export async function getAdminOverviewCounts(db: SupabaseClient): Promise<AdminOverviewCounts> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [pendingApps, needsReviewProducts, needsReviewServices, newRequests, respondedQuotes] = await Promise.all([
      db.from('vendor_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('marketplace_products').select('id', { count: 'exact', head: true }).eq('status', 'needs_review'),
      db.from('marketplace_services').select('id', { count: 'exact', head: true }).eq('status', 'needs_review'),
      db.from('client_requests').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      db.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'responded'),
    ]);

    return {
      pendingVendorApplications: pendingApps.count ?? 0,
      listingsAwaitingReview: (needsReviewProducts.count ?? 0) + (needsReviewServices.count ?? 0),
      newClientRequests7d: newRequests.count ?? 0,
      quotesAwaitingBuyerDecision: respondedQuotes.count ?? 0,
    };
  } catch {
    // A dashboard is never worth a 500 — an admin landing on a broken count
    // should see quiet zeros, not a crash.
    return { ...EMPTY_ADMIN_OVERVIEW_COUNTS };
  }
}
