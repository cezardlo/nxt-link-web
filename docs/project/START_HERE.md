# Start Here — NXT Link

This is the mandatory entry point for Claude Code, Codex, and any other agent
working in this repository.

## Read in this order

1. `CLAUDE.md` — repository safety and working rules.
2. `docs/product/MARKETPLACE_BLUEPRINT.md` — what the product is.
3. `docs/project/MARKETPLACE_GAP_ANALYSIS_2026-07-08.md` — what exists, what is missing, and the exact build order.
4. `docs/project/ROADMAP_2026-07-08.md` — active priorities and MVP boundary.
5. `docs/project/TECH_HANDOFF_CURRENT.md` — environment, database, migration, and known technical truth.
6. `docs/project/CORE_TRANSACTION_TEST.md` — acceptance script for the managed quote/pilot/purchase path.

Do not begin product work until these six sources have been read.

## Instruction precedence

When documents disagree, use this order:

1. The user's latest explicit instruction.
2. `CLAUDE.md` and this file.
3. `MARKETPLACE_BLUEPRINT.md`.
4. `MARKETPLACE_GAP_ANALYSIS_2026-07-08.md`.
5. `ROADMAP_2026-07-08.md`.
6. `TECH_HANDOFF_CURRENT.md` for technical/environment facts.
7. `CORE_TRANSACTION_TEST.md` for managed-flow acceptance.
8. Everything else is supporting or historical context.

## Product in one paragraph

NXT Link is a bilingual web app for industrial vendors, service providers,
buyers, and NXT Link operators. Vendors list standardized products, services,
bundles, rentals, and pilots. Credential tokens and maturity status control
what they may publish. Buyers browse, filter, compare, request estimates or
quotes, contact a vendor, or ask an NXT Link advisor. Complex purchases move
through demos, site assessments, measured pilots, final quotes, purchases,
implementation, and support. NXT Link earns a disclosed fee on protected
purchases.

## Active build order

1. **P0 — Data truth:** canonical taxonomy; vendor/credential/fit model; reconcile quote/deal schema; no live migration without approval.
2. **P1 — Vendor trust:** maturity levels, credential tokens, target-client profile, publish permissions, standardized product/service fields.
3. **P2 — Buyer discovery:** richer filters and comparison, buyer dashboard, structured contact, advisor request, messaging, and scheduling.
4. **P3 — Transaction:** inquiry -> quote -> demo/pilot -> measured result -> selection -> purchase/implementation -> commission record.
5. **P4 — Payments and scale:** legal/accounting decision, compliant payment routing, payouts/refunds/disputes, then reviews and expansion.

Fixing unrelated intelligence dashboards, feeds, conferences, maps, or new AI
agents is not part of the active marketplace plan.

## Before changing anything

- Run `git status --short` and preserve unrelated user work.
- Read the relevant existing code and migration files.
- State which blueprint capability and gap-analysis item the work addresses.
- Confirm whether the work is documentation, local code, preview deployment, or live data.
- Treat Supabase as live production data. Never apply a migration, seed data, delete records, or change production configuration without explicit user approval.
- Do not deploy to production or merge to `master` without explicit approval.

## Definition of done for a task

- The visible user outcome exists, not merely a file or stub.
- Authorization and tenant isolation are enforced server-side.
- Loading, empty, validation, and error states are handled where relevant.
- Relevant typecheck/tests/build checks pass.
- The change is verified with the correct buyer, vendor, or operator persona.
- Git diff/status is reviewed and unrelated changes remain untouched.
- Source-of-truth documentation is updated if technical or product truth changed.

## Historical documents

The following are retained for context but must not direct new work:

- `docs/project/STATUS.md`
- `docs/project/DECISIONS.md`
- `docs/project/NXT_LINK_WEBSITE_AND_AGENTS_DOCUMENTATION.md`
- `docs/project/CLAUDE_HANDOFF.md`
- `docs/project/CLAUDE_APP_HANDOFF_2026-07-06.md`
- `docs/product/master-plan.md`
- `docs/product/plan/*`

