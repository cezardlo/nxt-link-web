# CLAUDE.md

This file provides guidance to Claude Code and terminal Claude when working in this repository.

## Source Of Truth
- Product truth + priorities + sprint plan: `docs/project/ROADMAP_2026-07-08.md`
- Current technical state (environments, migration truth, known issues): `docs/project/TECH_HANDOFF_CURRENT.md`
- Core-transaction acceptance script (MVP definition of done): `docs/project/CORE_TRANSACTION_TEST.md`
- Historical context only: `docs/project/CLAUDE_APP_HANDOFF_2026-07-06.md`
- Active repo organization plan: `claude/repo-organization.md`
- Current repo state summary: `claude/current-state.md`
- Current active architecture: `docs/architecture/current-system.md`
- Agent operating framework (WAT: workflows/agents/tools, approval gates): `docs/AGENT_INSTRUCTIONS.md`
- Consolidated product architecture & phased plan (gating doc): `docs/product/master-plan.md`

Claude should treat archived systems as reference-only unless the user explicitly asks to reactivate them.

## Active Product Path
- Active application: `src/`
- Core surfaces (MVP): `/marketplace`, `/vendor/listings`, `/vendor/leads`, `/intake`, `/admin/requests`, `/admin/marketplace`, `/signup`, `/login`
- Paused (do not extend until the core transaction works): intelligence surfaces (`/briefing`, `/intel`, `/map`, `/command`), feeds, agents, conference tools

Do not assume `archive/` folders are active runtime dependencies.

## Ownership Rules
- `src/app` = routes and UI
- `src/lib` = app logic and brain logic
- `src/db` = persistence and queries
- `scripts` = operational scripts and maintenance utilities
- `docs` = human documentation
- `archive` = inactive or superseded systems

## Working Rules
- Read `docs/project/ROADMAP_2026-07-08.md` before proposing the next product change; fix the core transaction where `docs/project/CORE_TRANSACTION_TEST.md` first fails.
- The live Supabase project is the ONLY database (no staging) — never apply migrations or touch data without explicit user approval.
- Read existing code before editing.
- Prefer small targeted edits.
- Validate changes before declaring done.
- Use the active TypeScript brain path before looking at archived Python systems.
- User instructions override this file.

## Commands
```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run verify
```
