# Repo Organization Plan

## Goal
Make the repository immediately understandable by centering it around one active Next.js product and archiving inactive parallel systems.

## Active Structure
- `src/` is the live application
- `public/`, `tests/`, `supabase/`, `scripts/`, and `docs/` are active support folders
- `src/lib/intelligence` and `src/app/api/brain` are the active brain path

## Archived Structure
- `archive/services/intelligence`
- `archive/services/nxt-brain`
- `archive/services/pipeline`
- `archive/legacy-scripts`

Archived code is preserved for reference but must not be treated as part of the active runtime unless explicitly reactivated.

## Ownership Rules
- `src/app` = routes and UI surfaces
- `src/lib` = business logic, intelligence logic, and orchestration
- `src/db` = database access and persistence
- `scripts` = manual operations and maintenance
- `docs` = architecture, project notes, and handoff material
- `archive` = inactive systems

## Core Product Surfaces
- `/briefing`
- `/intel`
- `/map`
- `/command`

Everything else should be treated as secondary, experimental, or a candidate for later pruning.

## Cleanup Standard
If code is not imported by the active app, not required for deployment, and not part of active tests or scripts, it should not stay at the active repo root.
