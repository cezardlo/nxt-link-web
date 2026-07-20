# SYNC — how web-Claude and terminal-Claude stay in one mind

Read this FIRST, every session, before doing anything. It lives on GitHub so it
is identical for everyone.

## The one rule that prevents drift
**GitHub is the ONLY source of truth.** Nothing is "real" until it is committed
and pushed to this repo/branch. No private local/sandbox copy is authoritative.

## Roles
- **terminal-Claude** (Cesar's machine): the *hands* — writes code, commits,
  `git push`, deploys to Vercel, runs live tests. **The only writer.**
- **web-Claude** (sandbox): *reader + planner*. CANNOT push code and CANNOT
  write files to GitHub (verified: read-only integration). It MUST read the
  live repo before reporting status or building, and hands terminal-Claude a
  patch to apply rather than forking a copy.

## The loop (every task)
1. **Read** `vault/SYNC.md` (this) + `vault/STATE.md` + the notes you need.
2. **Work.**
3. **Update** `vault/STATE.md` — what changed, what's next, who owns it.
4. **Publish** — terminal-Claude commits + pushes. It lands HERE.

## Never
- Never force a whole local copy over this branch without reconciling — copies
  have diverged before and it loses work (e.g. `vault/Payments.md`).
- Never report state from memory or a sandbox copy — read `STATE.md`.
