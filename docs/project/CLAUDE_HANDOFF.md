# Claude Handoff

Historical note: this file reflects an older workspace snapshot before the repo was reorganized around one active Next.js app. Use `CLAUDE.md`, `claude/repo-organization.md`, and `docs/architecture/current-system.md` as the current source of truth.

## Project
- Repo: `nxt-link-web`
- Branch: `master`
- Date: 2026-03-02

## Why this file exists
You are being brought into this workspace from VS Code so you can continue the same work context.

## Current git snapshot
### Modified files
- `.gitignore`
- `README.md`
- `next.config.mjs`
- `package-lock.json`
- `package.json`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`

### Untracked paths/files
- `.dev-run-check.log`
- `.env`
- `.env.example`
- `.github/`
- `.next-dev-live.log`
- `.next-dev.log`
- `.next-start.log`
- `.next-start2.log`
- `.next-start3.log`
- `.next-start4.log`
- `.next-start5.log`
- `.next-start6.log`
- `.npmrc`
- `autobuilder.py`
- `docker-compose.yml`
- `archive/services/intelligence/`
- `middleware.ts`
- `archive/workflows/n8n/`
- `prisma.config.ts`
- `prisma/`
- `scripts/`
- `src/app/admin/`
- `src/app/api/`
- `src/app/challenges/`
- `src/app/command/`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/app/onboarding/`
- `src/app/platform/`
- `src/app/share/`
- `src/app/submit-vendor/`
- `src/app/vendors/`
- `src/components/`
- `src/lib/`
- `supabase/`
- `tests/`

## Notes for Claude
- Assume the user wants to continue active implementation, not reset history.
- Start by reading `README.md` and then running:
  - `git status --short`
  - `npm run lint` (if configured)
  - `npm test` (if configured)
- Be careful with existing local changes and avoid destructive git commands.

## User intent (latest)
- User asked to "connect Claude" so Claude can see ongoing work in VS Code.
- Practical approach: use this file + current workspace state as the shared context.
