# CLAUDE.md

This file provides guidance to Claude Code and terminal Claude when working in this repository.

## Source Of Truth
- Active repo organization plan: `claude/repo-organization.md`
- Current repo state summary: `claude/current-state.md`
- Current active architecture: `docs/architecture/current-system.md`

Claude should treat archived systems as reference-only unless the user explicitly asks to reactivate them.

## Active Product Path
- Active application: `src/`
- Active brain: `src/lib/intelligence` and `src/app/api/brain`
- Core surfaces: `/briefing`, `/intel`, `/map`, `/command`

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
