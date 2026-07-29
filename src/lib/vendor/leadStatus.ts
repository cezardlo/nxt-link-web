// Guard for the automatic "vendor viewed this lead" status transition
// (Slice RV, 2026-07-29). The status vocabulary already allows 'viewed' on
// quote_requests (see STATUSES in src/app/api/vendor/leads/route.ts and
// supabase/migrations/20260729_quote_requests_status_vocabulary.sql) — this
// module only decides WHEN it is safe to write it automatically, the first
// time a vendor opens their leads inbox (GET /api/vendor/leads).
//
// Rule: only an untouched lead — still 'new', or the legacy DB-only
// 'sent_to_vendor' value (no code writer, kept for backward compatibility by
// the migration) — may be auto-upgraded to 'viewed'. A lead that has already
// progressed (responded / won / lost / spam) or is already 'viewed' must
// NEVER be pulled back to 'viewed' — that would erase real progress and would
// visibly "regress" the status a buyer sees on their dashboard (e.g. a vendor
// who already sent a quote would look like they hadn't even opened it yet).

export const AUTO_VIEWABLE_STATUSES = ['new', 'sent_to_vendor'] as const;

/** True only for the statuses it is safe to auto-upgrade to 'viewed'. */
export function canAutoMarkViewed(status: string | null | undefined): boolean {
  if (!status) return false;
  return (AUTO_VIEWABLE_STATUSES as readonly string[]).includes(status);
}
