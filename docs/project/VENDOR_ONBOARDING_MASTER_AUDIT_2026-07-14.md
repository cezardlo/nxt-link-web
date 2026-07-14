# Vendor Onboarding, Pricing, Matching & Marketplace UX — Master Audit and Plan

Date: 2026-07-14
Branch audited: `claude/event-strategy-platform` (commit `e0c9021`, in sync with GitHub)
Companion doc: `docs/product/MARKETPLACE_BENCHMARKS_2026-07-14.md`

This is the "required first output" for the vendor onboarding / pricing /
matching / marketplace master plan. It synthesizes three deep code audits
(vendor onboarding surfaces, database & pricing model, client marketplace UX)
against the target experience: a six-stage guided vendor onboarding
(Company → Offerings → Pricing → Ideal Clients → Proof → Preview), flexible
pricing with visibility controls, a private matching profile, and an
explainable client-vendor matching loop.

Rules honored throughout: the Supabase project is LIVE and shared — every
migration in this plan is FILED ONLY and must not be applied without explicit
owner approval. No AI content or pricing is ever auto-published.

---

## 1. Current vendor onboarding audit

There are **three parallel vendor intake systems**:

| System | Entry | API | Table | Account? |
|---|---|---|---|---|
| A. Public "Apply" | `/apply` | `/api/apply/submit` | `vendor_applications` | No |
| B. Public "Vendor signup" | `/vendor-signup` | `/api/vendors/signup` | `vendor_profiles` (no `auth_id`) | No |
| C. Authenticated portal | `/signup` → `/vendor/start` → `/vendor/portal` + `/vendor/listings` | `/api/vendor/*` | `vendor_profiles` + `marketplace_products/services` | Yes |

- B and C are bridged by email-linking on first login (`src/lib/vendor/auth.ts:83-95`).
- A is fully siloed by design ("do not merge" comments); nothing carries
  `vendor_applications` data into `vendor_profiles`.
- `/vendor/start` is an 8-item **read-only checklist**, not a data-collecting
  wizard — every item links out to the portal or listings editor.
- `/vendor-signup` is a real 3-step stepper (Company → What you do →
  Brochures) but collects no pricing, no ideal-client data, no preview.
- **No autosave exists anywhere.** Draft persistence exists only where records
  save to DB (listings, proposals). `/apply` and `/vendor-signup` lose state
  on refresh.
- Progress meters exist in three places (start checklist, portal completion
  via `profileCompletion()` in `src/lib/vendor/profile-template.ts:91-115`,
  per-listing `scoreListing()` in `src/lib/marketplace/completeness.ts`).
- AI assist exists and is disciplined: brochure→profile draft and
  document/paste→listing draft, both require explicit confirmation; AI
  listings are forced to `needs_review` server-side; strict no-invention
  prompts. No website import, no spreadsheet import.
- Publish gate (listings): terms accepted + email verified + accuracy
  checkbox, enforced server-side (`src/app/api/vendor/listings/route.ts:91-108`).
  Storefront/profile edits publish instantly with no review step.

**Verdict:** the pieces of onboarding exist as scattered surfaces; there is no
single guided 6-stage experience, no quick-vs-complete path, no pricing stage,
no ideal-clients stage, no preview stage.

## 2. Current company-profile audit

`/vendor/portal` (942 lines) is a long save-per-section editor covering:
banner/logo/name/contact/tagline/about; company details (year founded,
employees, company type, response time, languages, capability toggles for
installation / emergency / cross-border / pilot); expertise (max 5) + problems
solved + capabilities; industries / client types / categories / service
areas / awards; proof (case studies max 3, certifications max 12 with files +
expiry, gallery, team max 8, videos, brochures + AI fill); storefront options
(accent color + CTA label only).

Public storefront `/marketplace/vendor/[id]` renders a standardized tabbed
template (Overview / Expertise / Products / Services / Technology / Case
studies / Documents / Team / Reviews, auto-hiding) with the action row
Request Quote / Save / Compare / Ask a Question.

**Adopted target storefront spec (owner, 2026-07-14)** — supersedes generic
plans where they differ:

1. Header: banner · logo · name · one-line tagline · verified badges · HQ +
   service areas · response time · [Request Quote] · Save · Compare · Ask a
   Question — BUILT
2. About — BUILT
3. Expertise (top-5 + problems + capabilities) — BUILT
4. Industries chips — BUILT
5. Who they specialize in (client statements) — PARTIAL (chips inside
   Expertise; needs its own section with sentence-style entries)
6. Products cards — BUILT
7. Services cards — BUILT
8. Case studies (3): customer type → problem → solution → results with real
   numbers → image + testimonial — PARTIAL (missing image, testimonial,
   structured results)
9. Proof: certifications & documents with verified badges, insurance — PARTIAL
   (records exist; no verification status, no expiry automation)
10. Reviews from verified NXT Link deals only — BUILT
11. Team (no direct contact) — BUILT

High-value additions (owner list) and status:

| Item | Status |
|---|---|
| 🏷️ Brands / equipment supported ("Services Toyota, Hyster, Zebra") | **MISSING — highest priority new field**; powers storefront, search facets, matching, and do-not-send |
| ⚡ Response/availability badges ("4-hr response · 24/7 · same-day RMA") | PARTIAL (response time + 24/7 exist) |
| 🧪 Pilot/demo badge | BUILT |
| 🌎 Cross-border ready badge | BUILT (toggle + badge) |
| 🗺️ Coverage map | MISSING |
| 📊 Marketplace stats ("responds in ~3 hrs · 12 deals closed") | MISSING (must be computed from platform events, never vendor-typed) |
| 📌 Featured/pinned section | MISSING (DB columns `featured_product_ids`/`featured_service_ids` exist; no UI, no storefront slot) |
| 📄 Downloadable line card | MISSING (brochures exist; no designated slot) |
| 🎥 60-second intro video | PARTIAL (videos exist; no featured header slot) |
| 🛡️ Warranty & support at a glance | PARTIAL (listing-level only) |
| ⭐ "Why choose us" ×3 differentiators | MISSING |

## 3. Current listing and pricing data model

Critical finding: the core marketplace tables (`marketplace_products`,
`marketplace_services`, `quote_requests`, `quote_proposals`, `categories`)
have **no CREATE TABLE migration in the repo** — they were created in the
Supabase dashboard. Their shapes live only in `src/lib/marketplace/types.ts`
and API column lists. This is a schema-drift risk to fix (capture DDL).

Pricing today is free-text and split across two layers:

- **Listing (advertised):** `pricing` jsonb =
  `{ model: string; range: string; buy/rent/lease: boolean; notes: string }` —
  no numbers, no currency, no unit, no recurrence, no conditions, no tiers,
  no additional costs, no visibility, no effective/expiry dates, no
  review metadata. Services add a free-text `pricing_model` column.
- **Quote (transactional):** `quote_requests` quote columns (amount, currency,
  valid_until, protected_until) and `quote_proposals` (line_items jsonb,
  subtotal/tax/discount/total, terms, revisioned). The proposal builder is the
  only rich pricing UI in the product.

Other model facts:

- Offering type equipment|product|technology|service is **derived at runtime**
  by regex (`solutionTypeOf()` in `src/lib/marketplace/guided-search.ts:83-88`),
  never stored. Storage-level split is products vs services tables only.
- Specs: products only, free-form `Record<string,string>` (≤40 pairs); no
  per-category templates; services have none; no custom-field framework.
- `listing.category` is free text, NOT a FK to the `categories` table.
- Matching data is scattered: `client_types`, `industries`, `service_areas`
  jsonb on `vendor_profiles`; `fit.not_a_fit_for` free text on listings
  (no editor UI). **No minimum project value, no opportunity preferences, no
  exclusion/do-not-send model, no match-profile table.**
- Three disconnected vendor identities: `vendor_profiles` (storefront),
  `vendor_applications`+`vendor_accounts` (intake + admin deals flow), intel
  `vendors` (TEXT id, 14.6k rows, do not touch). Two parallel opportunity
  pipelines (`quote_requests` vs `deals`/`quotes`) that never join.
- Buyers are keyed by **email string** (`buyer_profiles.buyer_email`,
  `saved_listings.buyer_email`) — no FK to auth.
- Accuracy confirmation is a single listing-level timestamp; **no price review
  history, no reviewer identity, no per-price confirmations.**
- RLS pattern: RLS on everything; writes via service-role server routes;
  buyer-scoped tables rely on route logic, not RLS (no buyer DB identity).

## 4. Duplicate or disconnected flows

1. Three vendor intake systems (A/B/C above).
2. Two quote-sending paths (`/api/vendor/quote` legacy vs `/api/vendor/proposals`).
3. Three buyer browse surfaces: `/marketplace` (current) vs `/products`
   (older, own compare) vs `/vendors` (intel-era catalog) — the legacy two
   still routable and inconsistent.
4. Two request pipelines: self-service `quote_requests` (vendor leads) vs
   `/intake` → `client_requests` (admin console); a buyer's activity is split
   across both on `/buyer`.
5. `/projects` Deal Room exists but **cannot be populated from the
   marketplace** — the "Save to project" button its UI references does not
   exist anywhere in `/marketplace`.
6. Homepage `?department=` links are inert (marketplace page only reads
   `?q=`/`?tab=`).
7. Three compare systems (listing compare, company compare, `/products/compare`).
8. Legacy `src/app/vendor/[id]` intel-era profile page still present.

## 5. Proposed screen map

New route: **`/vendor/onboarding`** — one wizard shell, six stages, one major
question per screen. `/vendor/start` becomes a thin redirect. Existing portal
remains as the post-onboarding editor (same APIs, same records — the wizard is
a guided front-end over the SAME data, not a parallel store).

Path choice up front: **Quick setup** (publishable minimum: company basics →
one offering → one price method → coverage → one ideal-client selection →
preview) vs **Complete setup** (all stages, all sections). Progress starts at
15% ("account created" counts). Autosave everywhere with "Saved just now."

- **Stage 1 — Company:** 1a basics (prefilled from signup; legal name, DBA,
  logo, banner, website, HQ, contact, languages, year founded, size, short
  description) · 1b company type (multi) · 1c expertise: best known for
  (max 5) → problems solved → capabilities.
- **Stage 2 — Offerings:** 2a four cards (Equipment / Products / Technology /
  Services, multi) — stored, no longer regex-derived · 2b add method (manual /
  brochure AI / duplicate; spreadsheet + website import Phase 3) · 2c offering
  basics (name, category from taxonomy, images, descriptions, problems solved,
  best-for, industries, facility types, locations, lead time, availability) ·
  2d category-specific specs from templates + custom fields (name, type, unit,
  value, public/private).
- **Stage 3 — Pricing:** 3a pricing-method cards (multi; incl. custom unit
  builder) · 3b price fields (amount/min/max, currency, unit, one-time vs
  recurring, billing frequency, quantities, contract length, conditions,
  included/excluded, effective/expiry) · 3c additional costs (quick options →
  simple rows; "Add another cost") · 3d discounts & tiers (optional) ·
  3e visibility (public / signed-in / after project details / after quote
  request / private) · 3f client-facing price preview requiring vendor
  approval. Estimate-formula builder and bundles are Phase 4.
- **Stage 4 — Ideal Clients (private matching profile):** 4a operation types +
  industries + client size (+ optional structured numbers) · 4b geography by
  mode: deliver / install / on-site / remote (El Paso, Horizon City, Juárez,
  Southern NM, West Texas, Texas, Mexico, US, nationwide, custom radius) ·
  4c preferred opportunities (project types, min/typical/max value, timeline,
  contract length, brands, recurring vs one-time, pilots) · 4d do-not-send
  exclusions · 4e plain-language matching summary ("You will receive… valued
  above $5,000") with edit links — no unexplained percentages.
- **Stage 5 — Proof:** documents (name, type, expiry, public/private,
  verification status — NXT-only verified badges), certifications,
  **brands/equipment supported**, case-study builder (max 3 featured, with
  customer type / problem / solution / structured results / photo /
  testimonial), line card slot, intro video slot, "why choose us" ×3.
- **Stage 6 — Preview & publish:** marketplace card preview → full listing
  preview → storefront preview (draft mode) → accuracy confirmation ("I
  confirm this pricing is accurate as of today") → save draft or submit for
  review → NXT review → published & searchable.

Every screen: Back · Save and finish later · Continue · progress bar ·
autosave state · help text · live preview where appropriate.

**Client-side additions:** "Add to project" on listings/storefronts (wires
marketplace to `/projects`); wizard step 6 (budget/timeline) in guided search;
match explanations on listing cards (Companies tab already has them); pricing
band + lead-time band + certification + brand facets; homepage `?department=`
deep links honored.

## 6. Proposed database migrations (FILED ONLY — approval required to apply)

One migration file per group, all additive, no destructive changes, all with
RLS (public-read only where visibility requires), touch triggers, and
created/updated audit columns:

1. `capture_marketplace_schema.sql` — documentation-only DDL capture of the
   dashboard-created tables (guarded `create table if not exists` no-ops) to
   end schema drift.
2. `offering_type_and_taxonomy.sql` — add `offering_type` enum column
   (equipment/product/technology/service) to both listing tables (backfill via
   existing `solutionTypeOf()` logic, vendor-confirmable); FK-ready
   `category_slug` column alongside free-text category.
3. `price_models.sql` — `listing_price_models`: id, listing_id + kind,
   name, model_type (exact/starting/range/per_unit/rental/lease/subscription/
   custom_quote/custom), amount, min_amount, max_amount, currency, unit,
   custom_unit, is_recurring, billing_frequency, min_qty, max_qty,
   min_contract_months, conditions, included, excluded, effective_on,
   expires_on, visibility (public/signed_in/after_details/after_request/
   private), status, last_confirmed_at, last_confirmed_by, sort_order.
4. `price_components_tiers_discounts.sql` — `listing_price_components`
   (charge name, description, amount/min/max, unit, required/optional,
   one-time/recurring, conditions, visibility); `listing_price_tiers`
   (price_model_id, min_qty, max_qty, unit_amount); `listing_discounts`
   (type, description, rules jsonb).
5. `price_review_history.sql` — append-only log: price_model_id, action
   (created/updated/confirmed/expired), actor, snapshot jsonb, created_at.
6. `specification_templates.sql` — `specification_definitions` (category_slug,
   field key, label EN/ES, type, unit, options, required, sort) +
   `specification_values` (listing_id, definition_id nullable for custom
   fields, custom_label, custom_unit, value, visibility). Seed templates:
   forklifts, warehouse software, maintenance service, machine vision (from
   master prompt §9), racking, conveyors.
7. `vendor_match_profiles.sql` — one row per vendor: operation_types[],
   industries[], client_sizes[], facility_sqft ranges, locations_count,
   employee ranges, budget ranges, coverage jsonb keyed by mode
   (deliver/install/onsite/remote → areas[]), min_project_value numeric,
   typical_project_value, max_capacity, preferred_project_types[],
   preferred_timelines[], preferred_brands[], recurring_preference,
   pilot_ok — plus `vendor_exclusions` (kind, value, note) and
   `opportunity_declines` (opportunity id, reason enum, note) for the
   matching feedback loop.
8. `vendor_brands.sql` — vendor_id, brand, relationship
   (sells/services/authorized/parts), authorized_evidence_document_id,
   verified_at/by. Facet + matching source.
9. `storefront_extras.sql` — `vendor_profiles` add: why_choose_us text[],
   intro_video_url, line_card_path, specialize_in text[] (sentence-style
   client statements), featured pin metadata; `vendor_certifications` add
   verification_status (self_reported/verified/expired), verified_at/by;
   document records gain visibility + type where missing.
10. `marketplace_stats.sql` — view or materialized rollup computing response
    time and deals closed per vendor from `quote_requests`/`purchases`
    (display gated by minimum sample size). No vendor-writable columns.
11. Phase 4 file (deferred): `estimate_formulas` + `listing_bundles` +
    `bundle_items`.

Explicitly deferred decisions (owner): staging-database strategy;
buyer identity FK migration (email → account id); unifying `vendor_accounts`
with `vendor_profiles`.

## 7. Reusable component plan

Wizard infrastructure: `WizardShell` (stage nav, progress, Back/Continue/Save
and finish later, autosave indicator), `useAutosave` (debounced PATCH +
status line + retry), `StageProgress` (starts ≥15%), `HelpText`.

Inputs: `OptionCardGrid` (single/multi, icons, hints — used for company type,
offering types, pricing methods, add-method), `ChipMultiSelect` with
"add your own" (exists in portal — extract and reuse), `MoneyInput`
(amount/min/max + currency), `Recurrencepicker`, `CoveragePicker` (mode-aware
geography), `BrandPicker` (typeahead + relationship), `SpecTemplateForm`
(schema-driven from `specification_definitions`), `CustomFieldRow`,
`AdditionalCostRow` + quick-option chips, `TierEditor`, `DiscountEditor`,
`VisibilitySelector` (5 levels with plain-language explanations).

Previews: `PricePreviewCard` (client-facing price block requiring approval),
`MarketplaceCardPreview` (extract from publish modal), `ListingPreview`,
`StorefrontPreview` (draft mode of the existing storefront template),
`MatchingSummaryCard` (plain-language sentence + edit links).

Reused as-is: `profileCompletion()`, `scoreListing()`, publish modal accuracy
flow, AI extract endpoints and confirm-before-apply pattern, proposal builder,
`CategoryPicker`, existing upload endpoints (logo/banner/brochures/
certifications/gallery).

## 8. UX risks

1. **Wizard fatigue** — six stages could feel like homework. Mitigation:
   quick path publishes with ~10 screens; everything else optional; "skip for
   now" never blocks; progress bar + next-best-action instead of walls of
   fields.
2. **Pricing disclosure reluctance** — industrial vendors guard prices.
   Mitigation: 5-level visibility with plain-language explanations; private
   pricing still powers their own quoting; benchmark evidence (G2/Clutch)
   that "starting at" improves lead quality shown as a nudge, never a
   requirement.
3. **Free-text → structured pricing migration** — existing `pricing.range`
   strings must be parsed into draft price models that vendors CONFIRM (never
   auto-published as structured fact).
4. **Dual-editor drift** — wizard and portal edit the same records; both must
   share the same PATCH endpoints or fields will fight. One API, two fronts.
5. **Autosave conflicts** — last-write-wins per section with updated_at
   checks; keep sections small.
6. **Matching over-promise with thin supply** — matching summary must promise
   only what exists ("we'll notify you when matching projects arrive"), no
   fake match counts.
7. **Bilingual gap** — marketplace UI is English-only while data layer has ES
   labels; new wizard strings must be built translation-ready from day one.
8. **Trust-stat cold start** — hide computed stats until sample threshold;
   never show "0 deals closed."

## 9. Mobile plan

One-major-question-per-screen already suits mobile. Specifics: sticky bottom
bar (Back/Continue) below 900px; option cards stack single-column; previews
open as full-screen sheets; ≥44px touch targets; photo/document upload via
camera capture; test at 360px width; number pads (`inputmode="decimal"`) on
money fields; chips wrap with horizontal scroll fallback; autosave makes
interruption-safe mobile sessions the default path, not an edge case.

## 10. Accessibility plan

Fix existing violations found in audit: facet `<label>` without `htmlFor`
(`FacetSelect`), placeholder-only inputs on the primary quote form,
non-semantic tab bars on `/marketplace`, unlabeled chip-remove "✕" buttons.
New wizard standards: every input labeled and associated; option-card groups
as `radiogroup`/`group` with keyboard arrows + space/enter; `aria-live=polite`
for autosave status and step changes; focus moved to stage heading on
navigation; visible focus rings; error summary linked to fields; color never
the sole signal (badges get text); WCAG AA contrast including vendor accent
colors (clamp palette); keyboard-complete E2E pass per stage.

## 11. Implementation order

Sequenced to repo reality (vendor agreement/terms gate: BUILT; search/save/
compare: BUILT; quote request → leads: BUILT):

- **Phase 1 — Wizard core (quick setup end-to-end):** wizard shell +
  autosave hook; Stage 1 over existing profile APIs; Stage 2 offering-type
  cards + quick offering create (reuse listings API); Stage 3 basic price
  model (migration 3 minimum); Stage 4 basics + coverage (migration 7
  minimum); Stage 6 previews + accuracy + submit; draft persistence
  everywhere. Migrations filed: 1, 2, 3, 7 (apply only with approval).
- **Phase 2 — Depth:** spec templates + custom fields (6); price components /
  tiers / visibility enforcement server-side (4, 5); brands supported (8);
  storefront extras incl. featured pins, why-choose-us, specialize-in,
  marketplace stats (9, 10); search facets for price band / lead time /
  certifications / brands; "Add to project" wiring; match explanations on
  listing cards; guided-search budget/timeline step.
- **Phase 3 — Import & trust:** spreadsheet import (column mapping), website
  import, case-study builder v2 (photo/testimonial/structured results),
  document verification statuses + expiry automation + badge effects,
  do-not-send enforcement in lead routing + decline-reason feedback loop,
  coverage map.
- **Phase 4 — Advanced pricing:** estimate calculator (deterministic formulas
  only), bundle pricing, pricing alerts (stale 6-months, expired, missing),
  price review history surfacing, advanced matching rank + vendor dashboard
  next-actions.

Consolidation debt (schedule alongside Phase 1–2): retire `/products` and
`/vendors` browse surfaces or redirect them; decide `/apply` fate; fix
homepage department deep links.

## 12. Testing plan

- **Unit:** price-model normalization, tier math, visibility resolution,
  free-text price parser, matching-summary sentence builder, coverage
  matching, `solutionTypeOf` backfill.
- **API contract:** autosave PATCH idempotence; publish gates (terms + email +
  accuracy + required fields) unbypassable server-side; visibility levels
  enforced in listing/detail APIs (private prices never serialized to
  public responses — test the JSON, not the UI).
- **RLS/authz:** vendor A cannot read/write vendor B's price models, match
  profile, or exclusions; anonymous sees only public-visibility pricing.
- **Acceptance (mirrors master prompt §36):** scripted persona run — vendor
  account → company basics → offering → price method + additional charge →
  visibility → ideal clients + coverage → previews → accuracy confirm →
  draft/submit → logout/login persistence → admin review → published →
  matching client finds it → explainable opportunity → quote uses stored
  pricing.
- **E2E (Playwright, new):** quick-setup happy path desktop + 360px mobile +
  keyboard-only; buyer guided-search → detail → quote request → buyer
  dashboard status.
- **Gates:** `npm run verify` (lint, typecheck, unit, build) green on touched
  routes; note repo-wide lint debt pre-exists (`TECH_HANDOFF_CURRENT.md`).
