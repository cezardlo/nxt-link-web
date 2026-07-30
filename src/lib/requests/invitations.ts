// Guard for the automatic "vendor viewed this invitation" status transition
// (Slice R1b, 2026-07-30) — mirrors src/lib/vendor/leadStatus.ts's
// canAutoMarkViewed, for the SEPARATE request_invitations.status vocabulary
// (invited/viewed/quoted/declined — see
// supabase/migrations/20260730_rfq_invitations_r1b.sql). That table tracks
// send-mode B ("invite specific vendors") independently of quote_requests
// .status, which already means something else.
//
// Rule: only an untouched invitation ('invited') may be auto-upgraded to
// 'viewed', the first time the invited vendor opens their leads inbox (there
// is no separate detail route — same reasoning as the quote_requests guard).
// An invitation already at 'viewed'/'quoted'/'declined' must NEVER be pulled
// back to 'viewed' — that would erase real progress.

export const INVITATION_STATUSES = ['invited', 'viewed', 'quoted', 'declined'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

// The only status it is safe to auto-upgrade to 'viewed' (single source of
// truth for the DB guard — used both as the in-memory pre-filter and as the
// re-check in the update's own .in('status', ...) at write time).
export const AUTO_VIEWABLE_INVITATION_STATUSES = ['invited'] as const;

/** True only for the one status it is safe to auto-upgrade to 'viewed'. */
export function canMarkInvitationViewed(status: string | null | undefined): boolean {
  if (!status) return false;
  return (AUTO_VIEWABLE_INVITATION_STATUSES as readonly string[]).includes(status);
}
