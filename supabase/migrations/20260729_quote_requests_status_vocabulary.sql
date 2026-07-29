-- ============================================================================
-- NXT//LINK — widen quote_requests.status to the app's real vocabulary
-- (fixes the #1 audit finding: "vendors literally cannot send a quote" —
-- workplace/audit/ALL-DEPT-AUDIT-2026-07-28.md, backend-correctness-2026-07-28.md
-- §3 Finding 1 / §2 Finding 4)
--
-- ROOT CAUSE (verified live on project dwotpviynxkbvyxambdy 2026-07-29):
-- the live CHECK constraint quote_requests_status_check only allows
--   new, sent_to_vendor, quoted, won, lost, closed
-- but the application has ALWAYS written/read this column using
--   new, viewed, responded, won, lost, spam
-- (src/app/api/vendor/quote/route.ts, src/app/api/vendor/proposals/route.ts,
-- src/app/api/vendor/leads/route.ts PATCH, and the buyer/vendor dashboards'
-- QUOTE_LABEL / STATUSES maps in src/app/buyer/page.tsx and
-- src/app/vendor/leads/page.tsx already expect 'viewed'/'responded'/'spam').
-- Every "vendor sends a quote" write has been silently rejected by Postgres
-- since launch, on both the old and new databases — the core marketplace
-- loop (vendor quotes -> buyer accepts -> deal) has never completed once.
-- 'sent_to_vendor', 'quoted', 'closed' are DB-only values with NO writer
-- anywhere in src/ (grepped) — kept below for backward compatibility, not
-- removed (widening a CHECK is safe; narrowing is not).
--
-- NOTE this is a DIFFERENT column from commissions.status, which has its OWN
-- separate CHECK ('quoted','accepted','won','lost','void','paid') and is NOT
-- touched by this migration — that constraint is already correct;
-- commissions.status = 'quoted' means something different ("a commission
-- record was created when the vendor quoted"), not this column's "vendor
-- has responded to the buyer" state. Fee/commission math is untouched.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

alter table public.quote_requests drop constraint if exists quote_requests_status_check;

alter table public.quote_requests add constraint quote_requests_status_check
  check (status in (
    'new', 'sent_to_vendor', 'quoted', 'won', 'lost', 'closed',
    'viewed', 'responded', 'spam'
  ));
