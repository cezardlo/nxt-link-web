# STATE — single running status (read this first)

_Keep this current. It is the one page both Claudes trust. Update after every
unit of work._

Last updated: 2026-07-20 (by web-Claude, in sandbox — terminal-Claude to push).

## ⚠️ Open reconciliation (do this before new building)
Two unpushed copies diverged. GitHub is still at the **July-2** state. Neither
is pushed. Merge — do not clobber:
- **web-Claude's copy** (in `nxtlink-LIVE-ready.zip`) has: dead-code cleanup
  (deleted `conference/run` etc.), Milestone-1 fixes, `/admin` operator hub,
  build-safety re-enabled, and vault notes Design-System.md / Flow.md / Audit.md.
- **terminal-Claude's copy** has: `vault/Payments.md` (Stripe escrow plan) and
  the July-14 security audit, and still contains `conference/run`.
→ terminal-Claude: merge web's unique pieces into its copy, keep Payments.md +
  security work, build clean, then **push** to establish the single truth.

## ✅ Done (in web-Claude's copy, needs merge+push to be real)
- Consolidated to one tree; `npm run build` passes with TS checking ON.
- Milestone 1: admin vendor-applications review; approve → live `vendor_profiles`
  + welcome email; buyer RFQ → matched-vendor dispatch (`lib/requests/dispatch`);
  demo-login guarded (`ALLOW_DEMO_LOGIN`).
- DB migration applied live: service_role may advance `vendor_applications.status`.
- `/admin` dead maintenance page → real Operator Console hub.
- Removed ~570 dead intel/brain/signals files; 0 obsidian refs.
- Vault: Home, Project, Map, Fees, Gotchas, Decisions, Backlog, Design-System,
  Flow, Audit, SYNC, STATE.

## 🌐 Live
- https://nxt-link-web.vercel.app — up, but an EARLIER version. Newest goes live
  after reconcile + push (Vercel auto-builds) or `vercel --prod`.

## ⏭️ Next up (priority)
1. **Reconcile + push** (above) — unblocks everything.
2. **Security leftovers** (unblocked): SSRF in `conference/run` (may already be
   gone in web's copy), `.or()` comma-injection in some API routes, missing CSP
   header, accessibility. Do on the reconciled copy.
3. **Reskin to Design System v1.0** — tokens wired in Tailwind; screen-by-screen.
4. **Search**: part-number mode, compare-from-results, trust-badge popovers.
5. **Stripe escrow (P1)** — biggest business win; **BLOCKED on Cesar** creating
   a Stripe account + Connect and adding keys to Vercel. Plan: `vault/Payments.md`.

## 🔒 Blocked on Cesar (human)
- Stripe account + Connect keys → Vercel (unblocks escrow / P1).
- `ADMIN_ACCESS_CODE` env var in Vercel.
- Supabase Auth → Site URL set to the live domain (fixes signup/login emails).

## Handoff log (newest first)
- web-Claude: seeded SYNC.md + STATE.md; verified it can READ but not WRITE
  GitHub; recommended terminal-Claude be the sole writer.
