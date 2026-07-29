-- ============================================================================
-- NXT//LINK — RFQ Slice R1: structured request + quote fields (data foundation)
-- workplace/plans/rfq-seamless-build-2026-07-29.md, slice R1.
--
-- Additive only: every column below is nullable or has a safe default, so
-- every existing row (old-shape, none of this populated) stays valid and every
-- existing query keeps working untouched. No existing column, constraint, or
-- table is altered or dropped. No new quote_requests.status values are added
-- (out of scope — status vocabulary is a separate, already-decided concern;
-- see 20260729_quote_requests_status_vocabulary.sql).
--
-- Three request-creation surfaces write into two tables:
--   - POST /api/marketplace/request      -> quote_requests (listing-tied)
--   - POST /api/platform/requests        -> client_requests (open /intake ask)
--   - src/lib/requests/dispatch.ts + POST /api/vendor/open-requests (self-claim)
--     both also create quote_requests rows FROM a client_requests row.
-- Two vendor quote-submission surfaces write onto quote_requests / quote_proposals:
--   - POST /api/vendor/quote      (legacy, flat amount)
--   - POST /api/vendor/proposals  (structured, line-item, drafts+revisions)
--
-- BLIND BUDGET INVARIANT (binding, R1 spec): budget_min/budget_max are the
-- buyer's private number and must NEVER be read by a vendor-facing route.
-- Every reader of quote_requests/client_requests in src/ already uses an
-- explicit column list (grepped 2026-07-29 — no `select('*')` anywhere on
-- either table), so simply never adding budget_min/budget_max to a vendor-
-- facing route's select list keeps them out structurally. Enforcement helper
-- + proof test: src/lib/requests/vendor-view.ts, tests/rfq-blind-budget.test.ts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- quote_requests — the buyer's structured ask (request side) + the vendor's
-- structured answer (quote side), both nullable/defaulted.
-- ----------------------------------------------------------------------------

-- Request side (buyer-authored, set at creation time; never overwritten by a
-- vendor quote-submission route).
alter table public.quote_requests add column if not exists request_kind text
  check (request_kind is null or request_kind in ('product', 'service', 'technology'));
alter table public.quote_requests add column if not exists quantity integer
  check (quantity is null or quantity > 0);
alter table public.quote_requests add column if not exists delivery_location text;
alter table public.quote_requests add column if not exists preferred_timeline text;
-- BLIND: never select these in a vendor-facing route (see invariant above).
alter table public.quote_requests add column if not exists budget_min numeric
  check (budget_min is null or budget_min >= 0);
alter table public.quote_requests add column if not exists budget_max numeric
  check (budget_max is null or budget_max >= 0);
alter table public.quote_requests add column if not exists structured_specs jsonb default '{}'::jsonb;
-- drop-then-add makes this idempotent (same pattern as
-- 20260729_quote_requests_status_vocabulary.sql) — safe to run more than once.
alter table public.quote_requests drop constraint if exists quote_requests_budget_range_chk;
alter table public.quote_requests
  add constraint quote_requests_budget_range_chk
  check (budget_min is null or budget_max is null or budget_min <= budget_max);

-- Quote side (vendor-authored "comparable commons" not already covered by the
-- existing quote_amount/quote_currency/quote_message/quote_timeline/
-- quote_valid_until columns added in 20260708_quote_responses_commissions.sql).
alter table public.quote_requests add column if not exists quote_payment_terms text;
alter table public.quote_requests add column if not exists quote_warranty text;
-- Per-kind extras (products: installation/training/shipping; services: scope/
-- duration/team size/emergency response; technology: license model/pricing/
-- implementation cost/annual support/SLA) — validated per request_kind by
-- src/lib/requests/structured.ts before it ever reaches this column.
alter table public.quote_requests add column if not exists quote_extras jsonb default '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- client_requests — same request-side structure as quote_requests, as NEW,
-- separately-named typed columns alongside the existing free-text ones
-- (quantity, location, deadline, budget_range stay exactly as they are; old
-- /intake rows keep rendering with these new columns simply null).
-- ----------------------------------------------------------------------------
alter table public.client_requests add column if not exists request_kind text
  check (request_kind is null or request_kind in ('product', 'service', 'technology'));
alter table public.client_requests add column if not exists quantity_int integer
  check (quantity_int is null or quantity_int > 0);
alter table public.client_requests add column if not exists delivery_location text;
alter table public.client_requests add column if not exists preferred_timeline text;
-- BLIND: never select these in a vendor-facing route. (Distinct from the
-- pre-existing free-text budget_range + share_budget opt-in gate, which stays
-- as-is — see src/lib/requests/vendor-view.ts for both enforcement points.)
alter table public.client_requests add column if not exists budget_min numeric
  check (budget_min is null or budget_min >= 0);
alter table public.client_requests add column if not exists budget_max numeric
  check (budget_max is null or budget_max >= 0);
alter table public.client_requests add column if not exists structured_specs jsonb default '{}'::jsonb;
alter table public.client_requests drop constraint if exists client_requests_budget_range_chk;
alter table public.client_requests
  add constraint client_requests_budget_range_chk
  check (budget_min is null or budget_max is null or budget_min <= budget_max);

-- ----------------------------------------------------------------------------
-- quote_proposals — mirror the request_kind (denormalized copy, same pattern
-- this table already uses for currency/lead_time/etc. — self-contained rows,
-- no join needed to know which per-kind extras schema applies) + the vendor's
-- per-kind quote extras.
-- ----------------------------------------------------------------------------
alter table public.quote_proposals add column if not exists request_kind text
  check (request_kind is null or request_kind in ('product', 'service', 'technology'));
alter table public.quote_proposals add column if not exists quote_extras jsonb default '{}'::jsonb;
