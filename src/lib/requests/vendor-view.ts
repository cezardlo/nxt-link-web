// Enforcement point for the BLIND BUDGET INVARIANT
// (workplace/plans/rfq-seamless-build-2026-07-29.md, R1 — binding):
// "the buyer's budget range must NEVER be serialized into any vendor-facing
// response."
//
// Belt AND suspenders: every reader of quote_requests/client_requests in
// src/ already uses an explicit (never select('*')) column list, so simply
// never adding budget_min/budget_max/budget_range to a vendor-facing route's
// select is the FIRST line of defense. This module is the SECOND line — a
// vendor-facing route also runs its row(s) through the matching function
// below before building its JSON response, so a future edit that carelessly
// widens a select (or switches to select('*')) can't silently reopen the
// leak. Proof test: tests/rfq-blind-budget.test.ts.

/** quote_requests: the new, ALWAYS-blind numeric budget range (Slice R1). No
 * opt-in exists for these — unlike client_requests.share_budget below, a
 * buyer can never choose to reveal budget_min/budget_max to a vendor. */
export function stripBlindBudgetFields<T extends Record<string, unknown>>(
  row: T,
): Omit<T, 'budget_min' | 'budget_max'> {
  const out: Record<string, unknown> = { ...row };
  delete out.budget_min;
  delete out.budget_max;
  return out as Omit<T, 'budget_min' | 'budget_max'>;
}

/** client_requests: the PRE-EXISTING free-text budget_range column is gated
 * by the buyer's own share_budget flag (default false — see
 * 20260625_nxtlink_platform.sql). GET /api/vendor/open-requests previously
 * returned budget_range unconditionally, ignoring this flag (a real,
 * pre-existing leak of a different — older — budget field, fixed alongside
 * this slice since it's the same invariant on the same neighboring code
 * path). Nothing in the app has ever set share_budget=true, so honoring it
 * here changes today's live behavior from "always shown" to "always hidden"
 * — never the other way around. */
export function shouldShareClientRequestBudget(row: { share_budget?: boolean | null }): boolean {
  return row.share_budget === true;
}
