# Payments S0 — One deal ledger (approved architecture plan)

Status: PLAN ONLY — awaiting Cesar's approval before any implementation. Produced 2026-07-21 by the Architecture Advisor (Opus, read-only pass per the model-routing policy). Implementation goes to Sonnet in the four phases below; the fee engine (`src/lib/fees/engine.ts`) is read-only guardrail throughout.

## Decisive finding
`commissions` is migration-backed (FKs + RLS in repo). **`manual_deals` has NO migration anywhere in the repo — it exists only in the live database.** Every step below is shaped by that gap: the first deliverable is a source-controlled baseline snapshot of `manual_deals`.

## 1. Recommended architecture
Keep **`manual_deals`** as the single source of truth for a real deal (amount owed, invoiced, paid, protection window, free-deal credit). Demote **`commissions`** to a quote-stage estimate/pipeline record (`quoted → accepted / lost`); stop using its billing columns (`final_amount, invoice_number, billed_at, due_date, paid_at`) as a second settlement ledger.

The tables are NOT fully redundant — this is a linking exercise, not a table deletion:
- `commissions` is written at quote time and covers quotes later *lost* (never become deals).
- `manual_deals` covers *closed* deals, incl. operator-typed deals with no quote (no `source_quote_id`, often no `vendor_id`).
- The actual bug is the accepted quote: `buyer/quote-decision` writes BOTH a `commissions` row (`accepted`) AND a `manual_deals` row (`won`) for the same deal — settlement tracked in two places that silently drift.

Unified shape:
- `manual_deals` = authoritative deal + money record, new nullable **`commission_id → commissions(id)`** back-link (backfilled via `source_quote_id = commissions.quote_request_id`).
- `commissions` = estimate + quote outcome only; "mark paid" redirected onto the linked deal.
- Read-only SQL view **`commission_ledger`** (`manual_deals ⟕ commissions`) with a `discrepancy` flag; both `/admin/commissions` and `/admin/deals` read it — operator sees ONE number.
- New admin-gated **`GET /api/admin/reconcile`**: orphans + discrepancies; zero rows = healthy.

Matches `workplace/plans/payments-and-tracking.md` §2.3 and Audit M2.1 ("one deal ledger").

## 2. Reasoning
- `manual_deals` already models the operator's full world (free-deal credit, `applied_cap`, `invoice_ref`, `paid_at`, `protected_until`, notes) and is the only table that can hold operator-only deals with no quote.
- The accept path already dedupes `manual_deals` by `source_quote_id` — the join key exists; we formalize a relationship the code relies on.
- Survivor = `manual_deals` keeps the anti-circumvention surface (`/api/vendor/deals`, `/admin/deals`) in its existing shape; we add links + a view instead of migrating money data between tables.
- Nothing recomputes a fee. `calculateFee()` fires exactly where it does today; the merge links existing rows by id.

## 3. Alternatives rejected
- **`commissions` as survivor** — per-quote; can't represent operator-typed deals; wrong table to grow; would migrate live money rows.
- **New `deals` table, drop both** — violates additive/no-drop phase-1 constraint; big-bang cutover of a table that isn't even in migrations.
- **Delete `commissions`, compute estimates on the fly** — loses quote-stage pipeline + lost-quote history that `/admin/commissions` and RLS depend on.
- **App-layer join only** — drift stays invisible and unenforceable; DB link + view + reconcile is what creates one source of truth.

## 4. Security implications
- `commissions` RLS (`commissions_vendor_select` own-rows; `commissions_service_all`) preserved unchanged.
- `manual_deals` RLS unknown (no migration). Additive migration **enables RLS with a service-role-all policy** (optionally vendor-select-own mirroring `commissions`). Pre-check: confirm no code path reads `manual_deals` with anon/authenticated client — both known paths use `getSupabaseClient({ admin: true })`, must be confirmed before enabling.
- `commission_ledger` view: expose only via admin-gated server routes with service role; NO `GRANT` to `authenticated`; if ever RLS-queryable, create `security_invoker`. Carries buyer/vendor identity — vendor exposure must be prevented.
- Writes stay service-role only behind `isAdminRequest()`. Backfill runs as a migration, never client-side.
- No fund-holding/escrow surface introduced — bookkeeping only; "NXT//LINK never holds funds" untouched.

## 5. Database implications (all additive)
- Baseline `manual_deals` snapshot migration (`CREATE TABLE IF NOT EXISTS` matching live columns) — prerequisite for everything.
- Add `manual_deals.commission_id uuid` (nullable) + index.
- FKs: `commission_id → commissions(id)` valid; `source_quote_id → quote_requests(id)` and `vendor_id → vendor_profiles(id)` as `NOT VALID` first (live rows include null/text vendor_id from co-pilot entries); validate after cleanup.
- Status check constraint = SUPERSET of both vocabularies (`reserved, won, payment_reported, payment_confirmed, invoiced, paid, overdue, disputed, credited, cancelled`, plus deal-lifecycle terms). `SELECT DISTINCT status` on live FIRST so the constraint can't reject an existing value.
- View `commission_ledger` with computed `discrepancy` boolean.
- Backfill (idempotent, non-destructive):
  `UPDATE manual_deals d SET commission_id = c.id FROM commissions c WHERE d.source_quote_id = c.quote_request_id AND d.commission_id IS NULL;`
- NEVER mutated: `commission_amount`, `effective_rate`, `fee_policy_version`, `protected_until` — money/audit fields are read-only in this work.
- Indexes: `manual_deals(commission_id)`; keep unique `manual_deals(source_quote_id)` and unique `commissions(quote_request_id)`; optional `manual_deals(status)`.

## 6. Migration strategy (ordered; rollback per step; HOUSE LAW: migrations to live DB first with Cesar's G6 approval, THEN code deploy)
1. Snapshot `manual_deals` (`CREATE TABLE IF NOT EXISTS`). Rollback: inert on live.
2. Add `commission_id` + index. Rollback: drop column.
3. Backfill `commission_id`. Rollback: set NULL (fully reversible).
4. Add FKs (commission_id valid; others NOT VALID). Rollback: drop constraints.
5. Superset status check (after live value audit). Rollback: drop constraint.
6. Create `commission_ledger` view. Rollback: drop view.
7. Enable RLS + service-role policy on `manual_deals`. Rollback: disable RLS / drop policy.

Rollback ORDER: redeploy prior code build FIRST, then down-migration — never leave code reading a view/column the DB no longer has. Test-apply every phase on a Supabase preview branch before prod.

## 7. Implementation phases (each independently shippable; Sonnet)
- **A — Capture + link (DB only, no behavior change):** introspect live `manual_deals` read-only; author migration files (steps 1–6): `supabase/migrations/2026xxxx_one_deal_ledger*.sql`. Ship = reviewed + test-applied on preview branch.
- **B — Read from the unified view:** point `src/app/api/admin/commissions/route.ts` + `src/app/api/admin/deals/route.ts` at `commission_ledger`, identical response shapes + `discrepancy` field. Test: same totals as today, single-sourced.
- **C — Stop duplicating on write:** `buyer/quote-decision` stamps `commission_id` on its draft insert; `admin/deals` POST + `admin/deals/assist` carry `source_quote_id` and upsert on it; `admin/commissions` PATCH "mark paid" updates the linked `manual_deal`. Test: accept → exactly one linked deal; mark-paid reflects in view + `/api/vendor/deals`. Files: `src/app/api/buyer/quote-decision/route.ts`, `src/app/api/admin/deals/route.ts`, `src/app/api/admin/deals/assist/route.ts`, `src/app/api/admin/commissions/route.ts`.
- **D — Reconcile + surfacing:** new `src/app/api/admin/reconcile/route.ts` (admin-gated; orphans + discrepancies); discrepancy indicator on `src/app/admin/commissions/page.tsx` + `src/app/admin/deals/page.tsx`. Test: drift one row intentionally, confirm it surfaces.

Each phase: `npm run typecheck` clean + six gates/DoD independently.

## 8. Top risks + mitigations
1. No source-controlled `manual_deals` schema → wrong-column migrations. Mitigate: introspect live first; snapshot baseline; preview-branch test-apply.
2. Constraint/RLS rejects existing rows or breaks reads (live status value, null/text vendor_id, anon-client path). Mitigate: `SELECT DISTINCT` first; FKs `NOT VALID`; superset status check; confirm service-role-only access before enabling RLS.
3. Double-counting during transition. Mitigate: reconcile check early; Phase B (read) before Phase C (write-dedup); settle money only on `manual_deals`.
4. Deploy-order mistake → operator pages 500. Mitigate: migrations-first house law; defensive fallback if view absent.
5. Wrong link corrupts money history. Mitigate: backfill only on exact key equality; never mutate money/audit fields; reconcile flags unmatched/many-to-one; nothing dropped in phase 1.

## 9. Plain-language decision (for Cesar)
We keep the operator deal tracker (`manual_deals`) as the one official record of every real deal and the money owed and collected on it. The older `commissions` table stops doubling as a billing ledger and goes back to being just the quote-stage estimate. We add a safe link between the two, build one combined view so every deal shows a single number, and add a "reconcile" check that flags any mismatch. Everything is additive — nothing renamed or deleted, all existing rows preserved, commission math untouched, nothing implies NXT//LINK holds money. Database changes go in first with a tested undo for every step, then the code — four small, independently testable slices.
