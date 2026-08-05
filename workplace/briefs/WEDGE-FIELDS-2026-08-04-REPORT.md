# WEDGE FIELDS BATCH REPORT — Force the wedge fields, cut the legacy fluff (2026-08-04)

Work order: `workplace/briefs/WEDGE-FIELDS-2026-08-04.md`.
Branch intended: `wt/wedge-fields-2026-08-04` off `master @ 1d79097`.

---

## ⚠️ COORDINATOR — READ FIRST

**1. BRANCH + GATES + COMMIT COULD NOT BE DONE — ALL COMMANDS DENIED.**
Exactly like Batches A and B: `git switch -c` (tried in Bash and PowerShell),
`npm run typecheck`, `npm test`, `npm run build`, and even direct
`node node_modules/typescript/bin/tsc --noEmit` were each attempted and each
denied ("This command requires approval"). **I am NOT claiming any gate
passed.** All work is in the **working tree on `master`, uncommitted**. Exact
finish commands:

```bash
git switch -c wt/wedge-fields-2026-08-04
git add src/ supabase/migrations/20260804_vendor_applications_wedge_fields.sql tests/ workplace/briefs/WEDGE-FIELDS-2026-08-04-REPORT.md
npm run typecheck   # must be 0 errors
npm test            # expected 536 (Batch B baseline) + 15 new = 551; brief floor is 546
npm run build       # must be clean
git -c user.email=delaocesar65@gmail.com -c user.name=cezardlo commit -m "feat(vendor): required wedge fields on the application, legacy conference questions out of the form, service quotes comparable"
# DO NOT PUSH (Cesar pushes)
```

**2. ONE NEW MIGRATION FILE — WRITTEN, NOT APPLIED. Apply before/with deploy.**
`supabase/migrations/20260804_vendor_applications_wedge_fields.sql`
- Adds `labor_rate numeric`, `labor_rate_currency text`, `mobile_fee numeric`,
  `response_time text`, `contract_types jsonb` to `vendor_applications`.
- Column comments + value CHECK constraints (rate > 0, fee >= 0, response_time
  in the four fixed values). Additive, idempotent, nothing renamed or dropped.
- **The new code selects and writes these columns** — if this ships before the
  migration, `/apply`, `/apply/status`, `/api/apply/*`, and the admin
  applications screen break (same failure mode Batches A/B flagged).
- No trigger change needed: `guard_vendor_application_update()` only protects
  status/admin_notes/approved_at/vendor_message; wedge fields are
  vendor-editable like company_name/phone.

**3. What I did instead of gates (G3):** full manual self-review of every
diff, hand-traced every new/changed type across all 16 files, and wrote 15
unit tests against the pure helpers (same node-runner suite). **Do not treat
the gates as passed until you run them and see the numbers.**

---

## PART 1 — FOUR REQUIRED WEDGE FIELDS (done)

On `/apply` (`src/app/apply/page.tsx`), the submit route
(`src/app/api/apply/submit/route.ts`), the vendor read-back/edit page
(`/apply/status`), and its PATCH route (`/api/apply/my`):

1. **`labor_rate`** — numeric + currency (`labor_rate_currency`: USD/MXN/CAD/
   EUR, default USD). Validated as a **positive number only** — free text like
   "call us" is rejected client-side AND server-side (400 with a bilingual
   message). Helper: `cleanLaborRate` in `src/lib/apply/fields.ts`.
2. **`mobile_fee`** — numeric, **0 accepted, blank never accepted**. The form
   keeps it a string so "blank" and "0" stay different end to end;
   `cleanMobileFee` returns a real `0` for an explicit "0" and `null`
   (→ 400 required-field error) for blank/invalid. Zero and unanswered can
   never be stored as the same thing: unanswered is rejected, never stored.
3. **`response_time`** — fixed choices: `same_day` / `within_24h` /
   `within_48h` / `days_3_plus` (select, EN + ES labels). Not free text.
4. **`contract_type` → implemented as `contract_types` (MULTI-select)** —
   decision required by the brief: **I chose multi-select** because a forklift
   service company genuinely offers more than one (per-visit work AND an
   annual PM contract), and it matches this table's existing multi-value
   convention (`regions`, `target_customers`). Values: `none` / `membership` /
   `annual`, with **`none` exclusive** (picking it clears the others, both in
   the UI and in the server normalizer `cleanContractTypes`).

Surfaced where they matter:
- **Admin review** (`/admin/vendor-applications`): a highlighted wedge strip
  per card — Labor rate, Trip fee (an explicit `0` shows as "None (0 USD)",
  never as missing), On site, Contract. API `APP_COLS` extended.
- **Vendor read-back** (`/apply/status`): all four are editable fields in the
  bilingual dictionary (EN + ES tú), prefilled (an explicit 0 prefills as
  "0", never blank), required on save, and PATCH-validated server-side.
- `src/lib/apply/auth.ts` `COLS` + `ApplicationRow` extended so every
  read-back path carries them.

## PART 2 — LEGACY FLUFF (already out of the form; data untouched)

The six conference-era columns — `conference_interests`,
`participation_preference`, `demo_capabilities`, `worker_support_value`,
`budget_range`, `technology_category` — **are not referenced anywhere in
`src/`** (verified by repo-wide grep). Today's Batch A rebuild of `/apply`
already removed them from the form UI and the submit payload; the
`budget_range` hits that remain in `src/` are the BUYER-side
`client_requests`/projects system — a different table, untouched.

- **No column dropped, no value deleted.** Migration history is intact.
- The **admin screen can still display any existing value**: a data-gated
  "Earlier application answers (no longer asked)" block renders only when a
  row actually has legacy data (never an empty block).
- **Which of the six still hold data: I cannot check the live DB** (no
  Supabase access from this session; DB commands denied). The 2026-07-30
  audit recorded `vendor_applications` at **0 rows**, so as far as the repo
  knows **none of the six hold data** — but the live-DB check is the
  coordinator's, per the brief. SQL to run:

```sql
select
  count(*) filter (where conference_interests is not null and conference_interests <> '[]'::jsonb) as conference_interests,
  count(*) filter (where nullif(trim(participation_preference), '') is not null) as participation_preference,
  count(*) filter (where nullif(trim(demo_capabilities), '') is not null)     as demo_capabilities,
  count(*) filter (where nullif(trim(worker_support_value), '') is not null)  as worker_support_value,
  count(*) filter (where nullif(trim(budget_range), '') is not null)          as budget_range,
  count(*) filter (where nullif(trim(technology_category), '') is not null)   as technology_category
from public.vendor_applications;
```

## `price_range` RECOMMENDATION — remove it from the FORM (keep the column)

**Recommendation: cut `price_range` from the `/apply` form in the next
wording batch — but I did NOT remove it unilaterally, per the brief.**
Reasoning: `price_range` ("under $5k / $5-25k / $25k+ / Other + free text")
is a product/software pricing band from the conference positioning. Next to
`labor_rate` + `mobile_fee` it is **redundant and confusing for exactly the
vendor this batch is for**: a forklift service company's price IS its rate
plus its trip fee — being also asked "is your price under $5k or $25k+?"
contradicts the wedge (it invites a vague band where we just forced a real
number). It still earns its place nowhere else: it drives no matching and is
display-only on the admin card. Keep the column and the admin display
(existing answers stay visible); stop asking the question. Cesar's call.

## PART 3 — COMPARABLE SERVICE QUOTES (done, no migration)

`quote_proposals.quote_extras` / `quote_requests.quote_extras` are jsonb —
**no migration**, per the brief. `ServiceQuoteExtras`
(`src/lib/requests/structured.ts`) gained five optional fields, all
data-gated everywhere they render (an empty answer never renders as an
answer):

| field | type | why |
|---|---|---|
| `labor_rate` | number ≥ 0 | the forklift service model's core number; the ONE numeric wedge field, so it gets a "Lowest/Best value" tag like the other money extras |
| `additional_fees` | short text (300) | trip/mobilization + other fees, vendor's words |
| `parts_policy` | fixed enum: `oem_only` / `oem_or_aftermarket` / `customer_supplied` / `included_in_rate` | fixed so it compares |
| `response_sla` | fixed enum: same four values as the application's `response_time` | a vendor's application answer and quote answer line up |
| `contract_terms` | short text (500) | summary, e.g. "no contract — per visit" |

Wired end to end:
- **Vendor quote form** (`src/app/vendor/leads/page.tsx`): service quotes now
  ask for all five (number input, two fixed selects, two capped text inputs),
  EN + ES tú; drafts prefill them; `buildQuoteExtras` sends them; the server
  validator (`validateQuoteExtras`, the SAME function client and server call)
  accepts them — unknown enum values null silently, a negative rate 400s,
  omitted fields validate to null (old quotes never break).
- **Buyer comparison** — all three surfaces, same R6 data-gating pattern:
  - `QuoteCompareTable.tsx`: five new columns that only take up width when at
    least one competing quote answered them; per-cell "—" otherwise; "Lowest"
    tag on the cheapest labor rate only.
  - `QuoteCompareDeck.tsx` + `src/lib/buyer/compareDeck.ts`: five new card
    rows + diff-toggle metrics; `laborRateId` best-value winner.
  - `OfferCard.tsx` (offer-in-chat): five new detail rows + hasExtras.
  - Enum→label mappers `partsPolicyValueLabel` / `responseSlaValueLabel`
    shared by all three surfaces so a buyer reads the exact word the vendor
    picked, in EN and ES (all four label-literal sites updated: EN defaults,
    buyer dashboard dict, /projects Deal Room dict, OfferCard dict).

## TESTS (15 new)

- `tests/vendor-application-batch.test.ts` (+8): wedge helper rules — rate
  positive-only/cents-rounded, "call us" rejected; mobile fee explicit-0 vs
  blank; currency fallback; response-time fixed list; contract-types dedup +
  'none' exclusivity + unanswered.
- `tests/rfq-structured-quote.test.ts` (+4): service wedge round-trip, enum
  nulling, negative rate rejected, omitted → null, per-kind isolation.
- `tests/quote-compare-extras.test.ts` (+2): the two new enum mappers.
- `tests/compare-deck.test.ts` (+1): lowest labor_rate wins; unset → no winner.

## NEW USER-FACING STRINGS — NEEDS CESAR APPROVAL (EN + ES, tú)

**A. `/apply` form (EN label / inline ES):**
1. "Your hourly labor rate" / hint "A number — buyers compare vendors on this · Un número"
2. "Trip / mobilization fee (per visit)" / hint "Enter 0 if you don't charge one · Escribe 0 si no cobras"
3. "How fast can you be on site?" / hint "¿Qué tan rápido puedes estar en sitio?" + placeholder "Select one / Elige una"
4. Response options: "Same day / El mismo día" · "Within 24 hours / En menos de 24 horas" · "Within 48 hours / En menos de 48 horas" · "3+ days / 3 días o más"
5. "Contract options you offer" (hint reuses the existing "Select all that apply · Elige todas las que apliquen") + options "No contract (per-visit) / Sin contrato (por visita)" · "Membership / Membresía" · "Annual contract / Contrato anual"
6. Currency selector aria-label "Currency / Moneda"

**B. Validation errors (submit route + `/apply` + `/apply/status`, EN / ES):**
7. "Your hourly labor rate is required — a number, e.g. 95." / "Tu tarifa por hora es obligatoria — un número, p. ej. 95."
8. "Your trip / mobilization fee is required — enter 0 if you don't charge one." / "Tu cargo por traslado es obligatorio — escribe 0 si no cobras."
9. "Choose how fast you can be on site." / "Elige qué tan rápido puedes estar en sitio."
10. "Choose at least one contract option (choose "No contract" if you work per-visit)." / "Elige al menos una opción de contrato (elige "Sin contrato" si trabajas por visita)."
11. `/apply/status` save-blocker: EN "Labor rate, trip fee, response time and contract options are all required (enter 0 for the trip fee if you don't charge one)." / ES "La tarifa por hora, el cargo por traslado, el tiempo de respuesta y las opciones de contrato son obligatorios (escribe 0 en el cargo por traslado si no cobras)."

**C. `/apply/status` dictionary (EN / ES tú):**
12. "Your hourly labor rate" / "Tu tarifa por hora" · hint "A number — buyers compare vendors on this" / "Un número — los compradores comparan con esto"
13. "Trip / mobilization fee (per visit)" / "Cargo por traslado (por visita)" · hint "Enter 0 if you don't charge one" / "Escribe 0 si no cobras"
14. "How fast can you be on site?" / "¿Qué tan rápido puedes estar en sitio?" · "Select one" / "Elige una" · "Currency" / "Moneda"
15. Options: "Same day" / "El mismo día" · "Within 24 hours" / "En menos de 24 horas" · "Within 48 hours" / "En menos de 48 horas" · "3+ days" / "3 días o más"
16. "Contract options you offer" / "Opciones de contrato que ofreces" · "No contract (per-visit)" / "Sin contrato (por visita)" · "Membership" / "Membresía" · "Annual contract" / "Contrato anual"

**D. Vendor quote form — service wedge fields (EN / ES tú):**
17. "Hourly labor rate" / "Tarifa por hora"
18. "Additional fees" / "Cargos adicionales" · placeholder "e.g. $75 trip charge per visit" / "ej. $75 de cargo por traslado por visita"
19. "Parts policy" / "Política de refacciones" · "OEM parts only" / "Solo refacciones OEM" · "OEM or aftermarket" / "OEM o aftermarket" · "Customer supplies parts" / "El cliente surte las refacciones" · "Parts included in rate" / "Refacciones incluidas en la tarifa"
20. "Response time on site" / "Tiempo de respuesta en sitio" (+ the same four response options as #15)
21. "Contract terms" / "Términos de contrato" · placeholder "e.g. no contract — per visit, or annual PM plan available" / "ej. sin contrato — por visita, o plan anual de mantenimiento disponible"

**E. Buyer comparison surfaces (compare table/deck/offer card, EN / ES):**
22. The buyer-side mirrors of #17–#21 ("Hourly labor rate"/"Tarifa por hora", "Additional fees"/"Cargos adicionales", all parts-policy and response-time option labels, "Contract terms"/"Términos de contrato") — wired in the buyer dashboard dict, the /projects Deal Room dict, and the OfferCard dict.

**F. Admin screen (operator-facing, English — consistent with the rest of /admin):**
23. Wedge strip: "Labor rate:" · "Trip fee:" · "None (0 USD)" · "On site:" · "Contract:" + plain-language enum labels ("Same day", "No contract (per-visit)", …)
24. Legacy block: "Earlier application answers (no longer asked):" + the six legacy labels.

## FOUND BUT NOT FIXED

1. **Branch/commit/gates all denied by session permissions** — everything is
   uncommitted on `master`; commands at the top. Same posture as Batches A/B.
2. **`price_range` still on the form** — recommendation above; Cesar's call,
   not removed unilaterally.
3. **Legacy-column live-data check** — SQL provided; coordinator runs it
   (audit says the table is empty, so expected all zeros).
4. **Wedge fields are NOT mirrored onto `vendor_profiles` or the approval
   mapping** (`ensureVendorProfile`) — the brief scoped surfacing to the
   admin screen + `/apply/status`. If Cesar wants labor rate/trip fee on the
   live storefront profile, that's a follow-up (profile schema + storefront
   display + wording approval).
5. **Quote-side overlap:** `response_sla` (new fixed enum) vs the older
   free-text `emergency_response` — both kept (additive rule); if they
   confuse vendors, deprecate the free-text one in a future batch.
6. **`contract_type` became `contract_types` (multi)** — decision + rationale
   in Part 1 above; flagged per the brief ("say which you chose and why").
7. **Demo/degraded path** (Supabase unconfigured): wedge validation now runs
   before the degraded accept, so a demo submit missing wedge fields gets a
   400 instead of a fake success — intended (required means required), noted
   in case a demo script posts the old payload.

## GATES (honest)

| Gate | Status |
|---|---|
| `git switch -c wt/wedge-fields-2026-08-04` | **DENIED by session permissions** (Bash + PowerShell). Work is uncommitted on master. |
| `npm run typecheck` | **NOT RUN — command denied** (also direct `tsc --noEmit`). Coordinator must run; 0 errors expected. |
| `npm test` | **NOT RUN — same.** Expected 536 baseline + 15 new = **551** (brief floor 546). |
| `npm run build` | **NOT RUN — same.** |
| Migration file | Written, NOT applied (per rule). **Apply before/with deploy** — the code selects the new columns. |
