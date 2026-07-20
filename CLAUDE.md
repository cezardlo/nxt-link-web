# CLAUDE.md

This file provides guidance to Claude Code and terminal Claude when working in this repository.

## Source Of Truth (READ FIRST — saves tokens)
- **Shared brain vault: `vault/Home.md`** — start here every session. It is a
  compact, current memory of the project shared by web-Claude and terminal-
  Claude. Read the 1–2 notes you need instead of re-exploring the whole repo.
- If `vault/` disagrees with anything below or in `claude/`, **the vault wins.**

The docs below are OLDER and partly describe a removed system; keep them only
as history.
- Active repo organization plan: `claude/repo-organization.md`
- Current repo state summary: `claude/current-state.md`
- Current active architecture: `docs/architecture/current-system.md`

Claude should treat archived systems as reference-only unless the user explicitly asks to reactivate them.

## Active Product Path
- Active application: `src/`
- The product is the **NXT//LINK marketplace** (see `vault/Project.md` and
  `vault/Map.md`). The old "intel/brain" system (`/briefing`, `/intel`, `/map`,
  `/command`, `src/lib/intelligence`) is **removed from the product** — dead
  code only, do not treat as active.

Do not assume `archive/` folders are active runtime dependencies.

## Ownership Rules
- `src/app` = routes and UI
- `src/lib` = app logic and brain logic
- `src/db` = persistence and queries
- `scripts` = operational scripts and maintenance utilities
- `docs` = human documentation
- `archive` = inactive or superseded systems

## Working Rules
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
