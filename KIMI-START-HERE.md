# KIMI — START HERE

You are working on **NXT//LINK** with Cesar (the owner) and Claude (the coordinator).
Read this file completely before your first edit. It overrides `AGENTS.md`, which is
stale in places (it names an old production URL and an old database — both wrong now).

---

## 1. What this is

NXT//LINK is a two-sided industrial marketplace for the El Paso / Juárez borderplex.
Buyers post sourcing requests (RFQs); vendors reply with quotes; NXT//LINK takes a
commission only when a deal actually closes. It is **live and real** — not a prototype.

Cesar is a **non-technical owner**. Explain everything in plain language, lead with what
it means for him, and never bury the answer under jargon.

## 2. Current truth (verify before trusting anything older)

| Thing | Value |
|---|---|
| Repo | `C:\Users\Cesar\Desktop\nxtlink-LIVE-ready-v2` |
| Default branch | `master` (not `main`) |
| Live production site | https://nxtlinktech.com (custom domain, confirmed working 2026-08-03) / nxt-link-real.vercel.app |
| Live database (Supabase) | project `dwotpviynxkbvyxambdy` |
| Demo site | nxt-link-web.vercel.app + Supabase `yvykselwehxjwsqercjg` |
| Local master | pushed and live as of 2026-08-03 (commit `773ed2b`) — `origin/master` is current, do not assume there's a backlog of unpushed work without checking `git log origin/master..master` yourself |

Anything in `AGENTS.md` that contradicts this table is out of date.

## 3. The rules that are binding

1. **`workplace/process/ENGINEERING-PROCESS.md` governs all work.** Read it. Six gates
   and a definition-of-done checklist. Follow it.
2. **Never push to `origin`.** Commit locally, merge locally. Cesar pushes himself —
   `origin/master` auto-deploys to real production. Pushing is his decision, not yours.
3. **Gate every change with `npm run test`.** Do NOT use `npx vitest` — this repo's suite
   is the Node built-in test runner and vitest silently runs **zero** tests and reports
   success. Full gate = `npm run typecheck` (must be 0 errors) + `npm run test` (500+
   tests, all passing) + `npm run build` (clean).
4. **Money code is off-limits without review.** The commission/fee engine, anything that
   computes or charges an amount: do not change it on your own initiative. Flag it.
   Current published terms: 4% on the first $50k, 2% above that, capped at **$20,000**,
   first deal 50% off. These numbers are approved and **frozen** — do not "fix" them.
5. **Anything a vendor or buyer will read needs Cesar's approval first.** Email copy,
   legal wording, fee wording, promises. Write it as a draft, show him, wait.
6. **EN/ES parity.** The site is bilingual. Every user-facing string you add needs both,
   and new Spanish strings get flagged for Cesar's review.
7. **No fake data.** Never submit test sourcing requests or trigger test emails to real
   vendors. That is his explicit standing rule.
8. **Design work follows `workplace/design/design-charter-2026-07-28.md`** and appends
   lessons to `workplace/design/DESIGN-LESSONS.md`.

## 4. Gotchas that have burned people before

- `npx vitest run` = 0 tests, false green. Always `npm run test`.
- Curling production returns a **fake empty page** and `{"error":"Forbidden"}` to bots.
  You must send both a real browser `User-Agent` **and** an `Accept-Language` header, or
  the results will lie to you.
- Migration files are an **incomplete record** of the schema — a lot was created straight
  in the Supabase dashboard. Check the live database before assuming a column exists.
- `middleware.ts` at the repo root is dead code that Next never loads. The real one is
  `src/middleware.ts`.

## 5. Where to find the state of things

- `C:\Users\Cesar\.claude\projects\C--Users-Cesar\memory\current-work.md` — the live
  running log of everything done and pending. Long, but it is the truth. Read this FIRST.
- `vault/Home.md` — compact shared project brain, start here for orientation.
- `vault/Backlog.md` — **the task list.** What's open, what's next, what's ready when
  Cesar says go. Check this before assuming there's nothing to do.
- `vault/Gotchas.md` — **lessons learned.** Traps that have already wasted someone's
  time (git/delivery quirks, environment quirks, Supabase data quirks). Read before you
  hit the same wall again.
- `vault/Decisions.md`, `vault/Plans.md`, `vault/Project.md`, `vault/Map.md`,
  `vault/Fees.md`, `vault/Flow.md`, `vault/Payments.md` — rest of the shared vault, read
  the ones relevant to what you're touching.
- `workplace/audit/ALL-DEPT-AUDIT-2026-07-28.md` — full security/backend/UX audit.
- `workplace/plans/` — department plans (payments, onboarding, ops, contracts, growth).

## 6. How to hand work back

When you finish something, write a short plain-English summary for Cesar covering:
what changed, whether the three gates passed (typecheck / test / build), which commit,
and anything that needs his decision or his wording approval. Do not claim done until
the gates actually passed — paste the numbers.
