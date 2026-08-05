# WORK ORDER — Force the wedge fields, cut the legacy fluff (2026-08-04)

Cesar, verbatim: *"Labor rate / Mobile fee / Response time / Contract type — those
are not optional. They are your differentiation. Without them, you're a directory
again. Cut the legacy fluff. Force the wedge fields."*

Base: `master` @ `1d79097` (live). Branch: `wt/wedge-fields-2026-08-04`.

## READ FIRST (binding)
1. `KIMI-START-HERE.md` — live URL + DB. `AGENTS.md` is STALE.
2. `workplace/process/ENGINEERING-PROCESS.md` — six gates, DoD.
3. `workplace/briefs/KIMI-BATCH-2026-08-04-REPORT.md` + `...B-REPORT.md` — the
   application flow was rebuilt TODAY. Build on it, do not undo it.

## HARD RULES
- **NEVER push. NEVER deploy. NEVER apply a migration** — write the file, flag it.
- **DO NOT DROP ANY DATABASE COLUMN.** See the legacy section — removal is from
  the FORM only. Dropping columns destroys data irreversibly and is not reversible
  by redeploying.
- Do not touch fee or commission math.
- Spanish is informal **"tú"** (Cesar's binding ruling, 2026-08-04). Never usted.
- Every new user-facing string → **NEEDS CESAR APPROVAL** list, EN + ES.
- No new dependencies. Design System v1.0. a11y floor.
- Gates: typecheck 0 errors, `npm test` >= **546** passing, build clean. **Try to
  run them; if your session denies the command, say so plainly — never claim a
  gate passed that you did not run.**

## WHY THIS MATTERS (context, not decoration)
The promise is: one simple intake form -> **2-3 structured, comparable responses**
-> clear pricing breakdown -> no ambiguity. Comparable is the load-bearing word.
Today the vendor application captures **services offered** and **service area** and
nothing else that can be compared. Two forklift companies would come back as two
company names. These four fields ARE the comparison.

## PART 1 — ADD FOUR REQUIRED FIELDS
On the vendor application (`/apply`, `src/lib/apply/fields.ts`,
`src/app/api/apply/submit/route.ts`) add, and make **required**:

1. **`labor_rate`** — hourly labour rate, numeric + currency. This is the forklift
   service model: an hourly rate plus a trip charge. Label plainly ("Your hourly
   labor rate"). Validate as a positive number; do not accept free text like
   "call us" — the whole point is comparability.
2. **`mobile_fee`** — the flat trip/mobilization charge per visit, numeric. Allow
   **0** (some vendors do not charge one) but require an explicit answer; a blank
   is not the same as zero and must not be stored as one.
3. **`response_time`** — how fast they can be on site. Fixed choices so it sorts:
   same day / within 24 hours / within 48 hours / 3+ days. Not free text.
4. **`contract_type`** — none / membership / annual. Multi-select if a vendor
   genuinely offers more than one; single if not — decide from the data model and
   say which you chose and why.

**Write a migration FILE** for the new columns (numeric for the two money fields,
text/jsonb for the other two). Additive, idempotent, nothing renamed or dropped.
Do not apply it.

**Surface them everywhere they matter:** the admin review screen
(`src/app/admin/vendor-applications/`) so Cesar can see them when approving, and
the vendor's own read-back at `/apply/status`. A field captured and never shown is
a field that rots.

## PART 2 — CUT THE LEGACY FLUFF FROM THE FORM
These columns exist from an earlier conference-era positioning. A forklift service
company currently scrolls past questions about **conference participation** to
reach the ones that matter:

`conference_interests` · `participation_preference` · `demo_capabilities` ·
`worker_support_value` · `budget_range` · `technology_category`

**Remove them from the FORM UI and from the submit payload.**

⚠️ **DO NOT drop the columns and DO NOT delete stored values.** Leave the columns
in place, keep the admin screen able to display any existing value, and report
which of the six still have data in them. Cesar can decide later whether to drop
them; that decision needs a live-DB check the coordinator will run.

Also confirm `price_range` still earns its place now that `labor_rate` and
`mobile_fee` exist — if it is now redundant or confusing next to a real rate, say
so with your reasoning rather than removing it unilaterally.

## PART 3 — MAKE THEM COMPARABLE (quote side)
`quote_proposals.quote_extras` is **jsonb**, so the quote side needs **no
migration**. Ensure a service quote can carry: labour rate, additional fees, parts
policy, response SLA, contract terms summary — and that
`src/components/marketplace/QuoteCompareTable.tsx` shows them **side by side** for
a service request. Data-gated: never render an empty row as if it were an answer.

## DEFINITION OF DONE
Report to `workplace/briefs/WEDGE-FIELDS-2026-08-04-REPORT.md`: what you added,
the migration file, which legacy fields you removed from the form and which still
hold data, your `price_range` recommendation, the NEEDS CESAR APPROVAL strings
(EN + ES tú), honest gate status, and anything found but not fixed.
