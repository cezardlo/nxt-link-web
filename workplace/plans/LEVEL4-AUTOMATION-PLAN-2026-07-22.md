# Level 4 Plan — Events Launch Agents, Cesar Reviews Exceptions

**Status:** Draft for Cesar's approval. Written 2026-07-22. Nothing in this
document is wired up yet — building any phase starts only on Cesar's go.
**Plain-language rule applies:** every section says what it means for Cesar
first, tech detail second.

---

## 1. Where we are, honestly

Today the company runs at **Level 2, touching Level 3**: departments exist
(frontend, backend, fullstack, security), agents check each other's work
(builders + security reviews), the vision is written down (blueprint, process
doc, decisions, routing policy), and parallel agents build while Cesar reviews
outcomes. **The one thing keeping us below Level 4: Cesar is still the
trigger.** No work starts until he types something.

Level 4 = the *product itself* starts the work. A vendor applies → an agent
has already reviewed the application before Cesar opens the queue. A deploy
fails → an agent has already read the logs. Cesar handles exceptions and
direction, not initiation.

---

## 2. The event catalog (what fires, what the agent does, where Cesar stays)

| # | Event (trigger) | Agent does automatically | Cesar's touchpoint |
|---|---|---|---|
| E1 | **Vendor application lands** (new pending row in vendor_profiles / vendor_applications) | Pre-review: completeness, website/business sanity check, red flags; drafts a one-paragraph approve/reject recommendation onto the admin queue entry | **Taps approve/reject.** Verification stays human — this is the F1 rule, it never automates |
| E2 | **Buyer posts a request** (new client_requests / quote_requests row) | Verifies dispatch actually ran, counts matched vendors, flags zero-match or suspicious content | Only hears about exceptions (zero matches, spam) |
| E3 | **Quote accepted / deal recorded** | Runs the existing reconcile check (`/api/admin/reconcile`), confirms one-ledger consistency | Only hears on discrepancy. **Money is report-only — no agent ever settles, refunds, or marks paid** |
| E4 | **Nightly (cron)** | security-dept sweep of auth/admin/money surfaces + `npm audit`; ops digest at morning: pending approvals, unanswered RFQs, stuck leads | Reads a short digest; acts only on flagged items |
| E5 | **Deploy fails** (Vercel webhook) | Reads build logs, diagnoses in plain English; proposes fix (or applies + re-verifies for known-safe classes like type errors) | Gets the plain-English note; production promote stays his command |
| E6 | **Vendor profile stalls** (incomplete after N days) | Already half-built: `/api/cron/profile-nudges` emails exist. Extend per blueprint §5 ("add proof" wording) | Copy = marketing drafts, Cesar approves BEFORE it sends (standing rule) |
| E7 | **Weekly** | Reconcile report + backlog groom: what shipped, what's queued, what's blocked on Cesar | 5-minute read |

## 3. The plumbing, in three phases

**Phase A — Routines (days, no new code).** Use the existing `/schedule`
capability to create cloud routines: E4 nightly sweep + morning digest, E7
weekly report. This alone removes Cesar as the trigger for all *recurring*
work. Needs: Cesar's one-word go per routine.

**Phase B — Event wiring (a scoped backend-dev project).** Supabase Database
Webhooks fire on the E1/E2/E3 table inserts → a new fail-closed endpoint
(same `requireCronSecret` discipline as existing crons) → launches the
matching agent. Vercel's deploy webhook covers E5. All secrets server-side;
every hook writes an audit-log row before doing anything.

**Phase C — Agent SDK runner (the true Level 4 step).** A small service built
with the Claude Agent SDK — the same Claude Code, launched by our code instead
of by Cesar. It loads the repo's CLAUDE.md + vault rules so event-agents
inherit the exact same constraints the interactive departments follow, and it
posts everything it does to an **Exceptions inbox** (start simple: email to
Cesar + a row on the admin console). Build order: after B proves the events
flow.

## 4. Guardrails — what never automates (Cesar's standing rules, restated)

1. **Vendor/buyer-facing words**: marketing drafts, Cesar approves, then it
   ships. No event-agent sends new copy on its own — ever.
2. **Money**: agents reconcile and report. No settling, refunding, crediting,
   or fee changes without Cesar. Fee engine stays sacred.
3. **Business verification (E1)**: agent recommends, human approves.
4. **Production deploys / domain changes**: Cesar's command.
5. **Model routing + budget**: Haiku triage, Sonnet build, Opus only for
   money/security judgment; every event-agent runs with a token cap and a
   timebox; runaway = stop and report, never retry silently.
6. **Audit trail**: every autonomous action logged (who/what/why) to
   platform_audit_log before it happens, so "what context was it missing?"
   is always answerable.

## 5. Rollout order and ownership

| Step | What | Who builds | When |
|---|---|---|---|
| 0 | Cesar approves this plan (any line can be struck) | — | after today's demo |
| 1 | Phase A routines (E4, E7) | coordinator via /schedule | same day as approval |
| 2 | E1 vendor pre-review + E2 dispatch watchdog | backend-dev + security-dept review | first build week |
| 3 | E5 deploy watchdog, E3 reconcile hook | backend-dev | second |
| 4 | Phase C SDK runner + Exceptions inbox | fullstack-dev + security-dept review | after 2–3 prove out |

**The demo-day rule still holds:** none of this starts while the 3-hour demo
sprint is in flight. This document exists so Level 4 starts the morning after,
not from a blank page.
