# Gotchas — traps that waste time

## Git / delivery
- **Can't push to GitHub from the sandbox** in some sessions (403). Deliver as
  patches; user applies with `git am`.
- Stop-hook "Unverified commits" warning is **cosmetic only**. Do NOT
  amend/rebase history to chase it.
- Work branch: `claude/website-functionality-trd0mu`.

## Environment
- Sandbox outbound HTTPS needs the agent proxy (`HTTPS_PROXY`). Node/supabase-js
  fetch does NOT auto-route through it → a running dev server in the sandbox
  **can't reach Supabase** (HTTP 000). So a fully-live local preview is not
  possible here. Screenshots are layout-only.
- Next.js does NOT propagate `NODE_OPTIONS` to worker processes — proxy preload
  tricks don't take.
- Middleware blocks headless browsers (HeadlessChrome UA + missing
  accept-language) and blocks `/api/` without proper headers. For Playwright,
  use a real Chrome UA + `accept-language: en-US`.
- Playwright/Chromium pre-installed at `/opt/pw-browsers/chromium`. Use
  `executablePath`; do NOT run `playwright install`.

## Supabase data
- DDL via `apply_migration`; data via `execute_sql`.
- jsonb columns need casts on insert: `to_jsonb(ARRAY[...])`
  (e.g. `achievements`, `best_for`, `industries`).
- `commissions` table: `vendor_id`, `quote_amount`, `fee_policy_version` are
  NOT NULL; `status` must be one of
  quoted / accepted / won / lost / void / paid.

## Email
- Email confirmation breaks if Supabase **Site URL** is `localhost`. Set Site
  URL + Redirect URLs to the real domain, and configure custom SMTP.
