# NXT Link — Current Technical Handoff

Updated: 2026-07-08. Pairs with `ROADMAP_2026-07-08.md` (product truth) and
`CORE_TRANSACTION_TEST.md` (acceptance script). Supersedes
`CLAUDE_APP_HANDOFF_2026-07-06.md` for technical state.

## Environments — the honest picture

| Piece | Reality |
|---|---|
| Git | `cezardlo/nxt-link-web`, MVP branch `claude/event-strategy-platform` (latest audit-era commit `e0eb311`). `master` runs the old production marketing site. |
| Vercel | Project `nxt-link-web-fresh` (team cezardlos-projects). Branch pushes auto-deploy previews: `https://nxt-link-web-fresh-git-claude-event-s-d2ace2-cezardlos-projects.vercel.app`. Production target = `master` only. |
| Supabase | **ONE project: `yvykselwehxjwsqercjg`. There is no separate staging database.** The branch preview and any local dev all point at this same database, which also holds the live intel data (intel_signals 35k+ rows, vendors 14,597, products 1,041 — do not touch). |

**P0 decision needed:** create a real staging DB (Supabase branch database or a
second project) OR explicitly accept "one shared DB, demo-flagged data" for
the pilot. Until then, treat every DB change as production: file the migration
in `supabase/migrations/` AND get explicit approval before applying.

## Migration state (verified against the live DB, 2026-07-08)

Applied and live (platform era): `nxtlink_platform_core`,
`nxtlink_rls_user_helpers`, `vendor_signup_zoho_videos_taxonomy`,
`vendor_applications_private_intake_full`, `marketplace_products_services`,
`lock_down_internal_tables_rls`, `listing_statuses_accuracy`,
`listing_reports` (plus the long intel-era history under dashboard-generated
version numbers).

**CORRECTION 2026-07-08 (verified against the live DB migration ledger):**
The quote/deal and agreement/fee migrations described below as "not applied"
were in fact APPLIED to the live DB earlier the same day (ledger versions
`20260708063904 quotes_deals_private_comparison` and
`20260708063933 agreements_consent_fees`). The collision fear was already
resolved in the SQL: the migration creates `public.vendor_accounts`, NOT
`public.vendors`, so the 14,615-row intel `vendors` table is untouched.

Live tables now present (all 0 rows unless noted): `vendor_accounts`, `deals`,
`deal_invites`, `quotes`, `deal_shares`, `consent_log`, `agreements`,
`fee_policies` (1 row), `fee_acknowledgments`, `fee_calculations`.

| File | Status |
|---|---|
| `20260705_quotes_deals_private_comparison.sql` | **APPLIED** (ledger `20260708063904`). Uses `vendor_accounts`; no `vendors` collision. |
| `20260706_event_strategy_platform.sql` | Still NOT applied. Not required for the MVP transaction; apply later. |
| `20260707_agreements_consent_fees.sql` | **APPLIED** (ledger `20260708063933`). |

Revised consequence: the deal/quote/agreement/fee tables EXIST. The remaining
gap is no longer "missing tables" — it is UI/API wiring, and choosing ONE
canonical flow among the overlapping systems already in the DB (the newest
admin-curated `deals`/`quotes`/`deal_shares` set vs. the older, empty
`quote_packets`/`vendor_opportunities`/`vendor_responses` set vs. the live
self-service `quote_requests`). No new migration is needed to run the core
transaction.

## Known code issues (from the 2026-07-08 audit)
- Lint fails repo-wide; includes a React Hooks violation in
  `src/app/vendor/quotes/page.tsx`. Fix core MVP routes first.
- `next.config.mjs` sets `typescript.ignoreBuildErrors` and
  `eslint.ignoreDuringBuilds` — remove once MVP routes are clean.
- Build prerenders 1,166 pages incl. intel surfaces that attempt external
  fetches; scope-control problem, not a correctness one.
- No Playwright e2e; no route-level authorization tests.
- Supabase Auth: confirmation-email redirect URL for the branch preview
  (`<preview>/auth/callback`) must be allowlisted in the dashboard (manual,
  owner-only). Default SMTP has a low hourly email cap — replace before pilot.

## What is working and verified
- Accounts: `/signup` (buyer/vendor roles), `/login` (role routing),
  email-verification gating; operator roles granted internally only.
- Marketplace: browse/search/filter/compare/save, tabbed detail pages, quote
  requests -> vendor leads inbox, report-a-problem -> operator triage.
- Vendor Seller Central: structured product/service listings, AI fill
  (no-invention contract), review-before-publish with accuracy confirmation,
  draft/needs_review/ready/published/unpublished/archived lifecycle.
- Operator: `/admin/marketplace` oversight (vendors + verification status,
  listings + AI flags + accuracy timestamps, reports, force-unpublish).
- Demo data: 2 vendors / 2 products / 2 services / 1 lead, all marked (DEMO);
  demo vendor A is linked to the owner's email for testing. Delete before pilot.
- Security: 21-fix audit hardening ported; 9 internal tables RLS-locked;
  typecheck + build green; 86 unit tests pass.

## Where the core transaction first breaks
See `CORE_TRANSACTION_TEST.md`. First UI failure: **step 3 — the buyer has no
dashboard** to see their submitted request. First structural failure: **steps
5-9 have no database tables** (unapplied migrations above).
