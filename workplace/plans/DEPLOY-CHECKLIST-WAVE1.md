# Wave 1 deploy checklist (verified against live DB 2026-07-21)

Plain-language, in order. Nothing here is guesswork: the live database
(Supabase project `yvykselwehxjwsqercjg`) was introspected read-only on
2026-07-21 and every item below was confirmed missing or present.

## Verified state of live

- Live site: still the **July 16** build. All Wave-1 code is on GitHub branch
  `claude/v2-merged-baseline` only.
- Base tables the new work builds on (`quote_requests`, `commissions`,
  `manual_deals`, and everything from the 2026-07-05 comparison migration:
  `vendor_accounts`, `deals`, `deal_invites`, `quotes`, `deal_shares`,
  `leads`) — **all present on live**. Migrations through 7/16 are applied.
- The five Wave-1 migrations — **all confirmed NOT applied** (tables/columns/
  view all absent from live as of 2026-07-21).

## Step 1 — apply these 5 migrations to live, IN THIS ORDER

House law: **database first, deploy second.** Terminal-Claude can apply these
via the Supabase MCP (`apply_migration`) with Cesar watching, or Cesar can
paste each file into the Supabase dashboard SQL editor. Every file is additive
and idempotent — nothing renamed, nothing dropped, safe to re-run.

| # | File | What it unlocks | If skipped |
|---|------|-----------------|------------|
| 1 | `20260720_legal_acceptances.sql` | click-wrap terms recording at every signup lane | **ALL signups fail closed** after deploy |
| 2 | `20260720_vendor_invites.sql` | invite funnel, QR invites, day 2/5/9 reminders | **ALL signups fail closed** after deploy (invite-linking in auth callback) |
| 3 | `20260721_cart_items.sql` | signed-in quote-cart sync | carts still work anonymously; signed-in sync soft-fails to localStorage |
| 4 | `20260721_first_deal_credit.sql` | founding-vendor flag + server-enforced credit counters | credit resolver can't read tier; fee math itself unaffected |
| 5 | `20260721_one_deal_ledger.sql` | one deal ledger: `manual_deals.commission_id` link, backfill, `commission_ledger` view, RLS on `manual_deals` | admin money pages silently fall back to today's two-table reads (`ledger_source: 'fallback'`) — works, but no single ledger and no discrepancy flags |

Files 1–2 are the hard gate: the deploy must not happen until they are in.
Files 3–5 degrade gracefully (code ships with defensive fallbacks) but should
go in the same sitting so the ledger work is actually live.

## Step 2 — deploy (Cesar runs this himself; classifier blocks terminal-Claude)

```
cd C:\Users\Cesar\Desktop\nxtlink-LIVE-ready-v2
npx vercel --prod --yes
```

(In a Claude Code session: prefix with `!` to run it inline.)

## Step 3 — after deploy, glance at these (10 minutes)

1. **Approve stuck vendors**: the publish gate now blocks `pending` vendors
   from publishing (bilingual 403). Open `/admin` → review queue → approve any
   real vendor stuck in `pending`. (As of 2026-07-21 live had 1 pending
   profile, 6 demo approved.)
2. **Signed-in views**: vendor portal + admin pages were never browser-checked
   locally (no demo creds in `.env.local`) — click through `/vendor/portal`,
   `/admin/deals`, `/admin/commissions` once signed in.
3. **Admin money pages**: `/api/admin/deals` and `/api/admin/commissions`
   responses should show `ledger_source: "view"` once migration 5 is applied.
   `"fallback"` after applying it means the view read failed — check logs.
4. **Signup smoke test**: one organic vendor signup (3 fields + magic link)
   must land in the admin review queue, NOT auto-approve. One invited signup
   (via `/admin/invites` QR) must auto-approve.
5. **Cart round-trip**: add two listings to the cart signed-out, sign in via
   magic link, confirm the cart survived and submits as ONE bundled request.

## Known environment gaps (pre-existing, not deploy blockers)

- Local `.env.local` lacks `SUPABASE_SERVICE_ROLE_KEY` — local dev shows
  "Vendor" placeholder names (RLS-blocked). Local-only; production Vercel env
  has the key.
- Mail sending unverifiable locally; `mail.ts` logs when both providers fail
  (domain-only, no PII). Watch Vercel logs on first real signup.
- `/admin` unreachable when signed out (middleware wants a Supabase session
  before the access-code gate renders). Known; possibly intentional
  two-factor. Workaround: stay signed in. Change reserved for Cesar.
