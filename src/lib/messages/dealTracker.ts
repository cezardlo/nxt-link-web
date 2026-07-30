// Pure milestone derivation for R4's pinned deal tracker (Cesar: "tracking
// throughout the conversation... current milestones"). One thread = one
// quote_requests row (a single vendor's opportunity for a single buyer need)
// — see src/app/api/buyer/messages/route.ts and .../vendor/messages/route.ts,
// both scoped by quote_request_id. Every milestone below is read straight off
// data that already exists; nothing is invented and no new DB status is
// introduced (binding deviation: "Payment Funded" and other invented states
// are banned).
//
// "Completed" uses commissions.status === 'paid' — a REAL value already in
// that column's live CHECK constraint / admin pipeline
// (reserved -> won -> payment_reported -> payment_confirmed -> invoiced ->
// paid -> overdue/disputed/credited/cancelled, src/app/api/admin/deals/
// route.ts). "In progress" uses commissions.invoice_number being set (the
// vendor recorded the final purchase via POST /api/vendor/purchase) as the
// honest signal that execution has started. No payment/escrow step exists
// anywhere in this — see the binding deviation banning it.

export type DealMilestone =
  | 'request'
  | 'quote_sent'
  | 'revised'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined';

/** The happy-path pill order the tracker renders left-to-right. 'declined' is
 * a separate terminal state shown INSTEAD of the sequence, never inside it. */
export const DEAL_MILESTONE_SEQUENCE: DealMilestone[] = [
  'request', 'quote_sent', 'revised', 'accepted', 'in_progress', 'completed',
];

export interface DealTrackerInput {
  /** Has any offer (structured proposal or legacy flat quote) ever been sent? */
  quoteAmount: number | null;
  /** True once 2+ non-draft proposal revisions exist for this thread. */
  hasRevision: boolean;
  buyerDecision?: string | null;
  commission?: { invoice_number?: string | null; status?: string | null } | null;
}

export function deriveDealMilestone(input: DealTrackerInput): DealMilestone {
  if (input.buyerDecision === 'declined') return 'declined';
  if (input.commission?.status === 'paid') return 'completed';
  if (input.buyerDecision === 'accepted' && input.commission?.invoice_number) return 'in_progress';
  if (input.buyerDecision === 'accepted') return 'accepted';
  if (input.hasRevision) return 'revised';
  if (input.quoteAmount != null) return 'quote_sent';
  return 'request';
}

/** Index of the current milestone within the happy-path sequence, or -1 for
 * the 'declined' terminal state (which isn't part of the linear sequence). */
export function milestoneIndex(milestone: DealMilestone): number {
  return DEAL_MILESTONE_SEQUENCE.indexOf(milestone);
}
