# CLAUDE.md

This file provides mandatory guidance to Claude Code and terminal Claude when
working in this repository.

## Mandatory start

1. Read `docs/project/START_HERE.md` first.
2. Follow its reading order and instruction precedence.
3. The user's latest explicit instruction overrides repository documents.
4. Do not use older status, handoff, decision, or product-plan files to
   override the active marketplace blueprint.

## Active sources of truth

- Entry point and instruction order: `docs/project/START_HERE.md`
- Product definition: `docs/product/MARKETPLACE_BLUEPRINT.md`
- Current gaps and exact build order: `docs/project/MARKETPLACE_GAP_ANALYSIS_2026-07-08.md`
- Active priorities and MVP boundary: `docs/project/ROADMAP_2026-07-08.md`
- Environments, migrations, and technical truth: `docs/project/TECH_HANDOFF_CURRENT.md`
- Managed-flow acceptance script: `docs/project/CORE_TRANSACTION_TEST.md`
- Agent operating framework: `docs/AGENT_INSTRUCTIONS.md`

Historical context only:

- `docs/project/STATUS.md`
- `docs/project/DECISIONS.md`
- `docs/project/NXT_LINK_WEBSITE_AND_AGENTS_DOCUMENTATION.md`
- `docs/project/CLAUDE_HANDOFF.md`
- `docs/project/CLAUDE_APP_HANDOFF_2026-07-06.md`
- `docs/product/master-plan.md`
- `docs/product/plan/*`

## Active product path

- Active application: `src/`
- Core marketplace surfaces: `/marketplace`, `/vendor/portal`,
  `/vendor/listings`, `/vendor/leads`, `/vendor/quotes`, `/intake`,
  `/admin/requests`, `/admin/marketplace`, `/signup`, `/login`
- Paused: intelligence surfaces (`/briefing`, `/intel`, `/map`, `/command`),
  feeds, conference tools, unrelated agents, and visual redesigns that do not
  improve the marketplace flow.

Do not assume `archive/` folders are active runtime dependencies.

## Ownership rules

- `src/app` = routes and UI
- `src/lib` = application and domain logic
- `src/db` = persistence and queries
- `scripts` = operational and maintenance utilities
- `docs` = current human documentation
- `archive` = inactive or superseded systems

## Working rules

- Follow the active build order in
  `docs/project/MARKETPLACE_GAP_ANALYSIS_2026-07-08.md`.
- Use `CORE_TRANSACTION_TEST.md` as acceptance for the managed path; do not use
  it to skip newer vendor-trust and marketplace priorities.
- The current Supabase project is live and shared. Never apply migrations,
  seed or delete data, or change database configuration without explicit user
  approval.
- Never deploy production, merge to `master`, send external messages, collect
  payments, or change external accounts without explicit user approval.
- Run `git status --short` before and after work; preserve unrelated changes.
- Read existing code before editing and prefer small targeted changes.
- Validate changes in proportion to risk before declaring them done.
- Verify visible outcomes with the correct buyer, vendor, or operator persona.
- Update source-of-truth documents when product or technical truth changes.

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run verify
```
