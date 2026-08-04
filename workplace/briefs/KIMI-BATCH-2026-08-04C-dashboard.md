# KIMI BATCH C — Operator dashboard: accounts, funnel, traffic (2026-08-04)

Follows Batch A (`8e99801`) and Batch B (`b481bc3`) on branch
`wt/vendor-application-2026-08-04`. **Stay on that branch. Do not touch master.**

## READ FIRST (binding)
1. `KIMI-START-HERE.md` — live URL + DB. `AGENTS.md` is STALE.
2. `workplace/process/ENGINEERING-PROCESS.md` — six gates, DoD.
3. Your own Batch A + B reports in `workplace/briefs/`.

## HARD RULES
- **NEVER push. NEVER deploy. NEVER apply a migration.**
- **Do not touch fee or commission math.**
- **Do not re-do Batch A or B work.**
- New user-facing strings → **NEEDS CESAR APPROVAL** list, EN + Spanish.
  **Spanish is informal "tú"** — Cesar's binding ruling, no usted.
- No new dependencies. Design System v1.0. a11y floor.
- Gates: `npm run typecheck` 0 errors, `npm test` >= **536**, `npm run build`
  clean. **Try to run them; if denied, say so plainly. Never claim a gate passed
  that you did not run.**

---

## THE ONE ITEM — the operator dashboard Cesar asked for
Cesar, verbatim: *"add in a dashboard how many people are in the website, traffic,
accounts — like the ones that every startup has."*

### Where it lives
Extend the **EXISTING** admin surface: `src/app/admin/` and
`src/app/api/admin/overview/`. **Do NOT create a fourth admin app** — a prior
audit already flagged "admin = 3 different apps" as a defect. Reuse the existing
admin auth and gating exactly (`isAdminRequest`). This is operator-only data:
it must never be reachable by a vendor, a buyer, or an anonymous visitor. Fail
closed.

### The numbers — all REAL, all from the live database
- **Accounts**: total, plus new signups over the last 7 and 30 days with a trend.
- **Vendors by status**: pending / approved / needs_info / rejected / restricted.
  **Pending is the number Cesar must act on — make it the most prominent thing
  on the page**, and link it straight to the review screen.
- **Buyers**, **listings published**, **requests posted**, **quotes sent**, **deals**.

### The funnel — this is the point of the whole page
Signed up → application submitted → approved → **published a listing**.

As of 2026-08-04 that funnel reads roughly **4 → 1 → 2 → 0**: nobody has ever
published a listing on the real site. Cesar needs to SEE where people fall out,
at a glance, without asking anyone. Design it so a single glance answers "where
are we losing people?". Show real counts and the drop between each step.

### Traffic — READ THIS CAREFULLY BEFORE YOU BUILD IT
`@vercel/analytics` IS in `package.json`, **but Vercel Web Analytics is NOT
ENABLED on the production project.** The coordinator verified this on 2026-08-04:
the Vercel analytics API returns `not_found`. **Zero traffic data exists.**

Therefore:
- **Do NOT fabricate, mock, estimate, sample, or placeholder any traffic number.**
  The standing rule "real-computed stats are never faked" is binding and this is
  exactly the situation it exists for. A made-up visitor count would mislead
  Cesar about his own business.
- Build the traffic panel with an **honest empty state** that says tracking is not
  connected yet — in plain language, EN + ES (tú).
- If you wire a real read, put it behind an env var, document the exact variable
  name and what it needs, and make the panel degrade gracefully when it is unset.
- Turning Web Analytics on is a Vercel dashboard action the **coordinator** is
  handling with Cesar. Your job: the panel lights up correctly once it is on.

### Quality bar
Cesar's standing rule is that design work uses the installed taste/design skills.
This is a page he will look at every day — it should be genuinely well made, not a
table of numbers. Empty states matter more than usual here, because **most of
these numbers are currently zero** and the page must still feel intentional rather
than broken.

## DEFINITION OF DONE
Report to `workplace/briefs/KIMI-BATCH-2026-08-04C-REPORT.md`: what you built,
every query and where its number comes from, the NEEDS CESAR APPROVAL strings
(EN + ES tú), honest gate status, and anything found but not fixed.
