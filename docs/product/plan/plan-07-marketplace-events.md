## Marketplace Directory & Event/Conference Integration

This section covers the browsable vendor marketplace, the event/conference layer, and the loop that connects them: ticket demand → event concepts → invitations → demos → quotes. Status labels: **BUILT** (working code, path given), **PARTIAL** (schema or library exists, surface incomplete), **MISSING** (recommended, not yet in repo).

### 1. Marketplace Directory

#### 1.1 What exists today

The exhibitor-style directory browser is **BUILT** at `src/app/admin/directory/page.tsx` (route `/admin/directory`, admin-gated). It is deliberately modeled on trade-show exhibitor browsers (MapYourShow-style, per the file's own comment): a faceted sidebar with live counts, free-text search across name/description/categories, an A–Z letter rail, a card grid, and a detail drawer that surfaces brochures (`vendor_brochures`, private bucket, signed URLs) and showcase videos (`vendor_videos`). Facets already implemented as multi-select filters with counts: **categories**, **service areas**, **industries**, **client types**, plus an approved/pending toggle. Data comes from `/api/vendors/manage` over `vendor_profiles`, whose `categories`, `service_areas`, `industries`, and `client_types` are GIN-indexed jsonb columns (`supabase/migrations/20260629_vendor_signup_zoho.sql`, `20260701b_vendor_industry_clients.sql`).

Supporting taxonomy is **BUILT** on the intake side: `/vendor-signup` (`src/app/vendor-signup/page.tsx`) captures 16 bilingual EN/ES warehouse categories (forklift maintenance, copier service, waste, transportation FTL/LTL, labels/Zebra, fire extinguisher inspection, electrical, pallets, fire doors, IT support, general maintenance, propane, pest control, staffing, warehouse technology, warehouse products/parts) and 6 service areas (El Paso, Juárez, New Mexico, West Texas, Cross-border, National). The private `/apply` intake adds a second axis (`supabase/migrations/20260702–20260704`, pending apply): `category` (TMS, WMS, Telematics/ELD, Forklifts, Customs/Cross-Border, Cold Chain, Robotics, Other), `offering_types`, `supply_chain_stages`, `company_size`, `region`.

There is also a public `/vendors` page (`src/app/vendors/page.tsx`), but it reads the legacy intelligence-era `vendors` table, not the curated `vendor_profiles` marketplace. **Decision required:** the public marketplace directory should be a filtered projection of `vendor_profiles` (approved rows only, no contact details), not the legacy table. Recommended implementation: an anon-readable RLS policy scoped to `status = 'approved'` exposing only company name, categories, industries, service areas, description, and badge fields — contact happens through tickets, never scraped emails (keeps the confidentiality model from the private-intake design intact).

#### 1.2 Target category taxonomy

The spec's browse categories map onto the existing 16 + 8 category sets. Recommended top-level directory taxonomy (bilingual labels follow the existing `{ id, en, es }` pattern in `src/app/vendor-signup/page.tsx`):

| Spec category | Coverage today | Action |
|---|---|---|
| Software (WMS/TMS/inventory/quality) | PARTIAL — `whtech`, apply-flow TMS/WMS/Telematics | Promote to top-level "Software" with sub-tags |
| Hardware & Equipment | PARTIAL — `whparts`, forklifts, labels/Zebra | Split "Hardware" vs "Equipment" |
| Services / Maintenance / Installation | BUILT — 10 of the 16 signup categories | Group under "Services" parent |
| Consulting / Training | MISSING as categories | Add `consulting`, `training` (training is a worker-support pillar) |
| Logistics / Cross-border trade | PARTIAL — `transport` + Cross-border service area | Add `customs-crossborder` category (exists in apply flow) |
| Packaging / Safety / Quality / Inventory | MISSING as named categories | Add 4 ids; safety partially covered by extinguisher/fire-door |
| Manufacturing / Warehouse / Facility support | PARTIAL — maintenance, electrical, pest, propane | Parent groupings over existing ids |
| Events / B2B networking | MISSING in vendor taxonomy | Add `events-networking`; links vendors to the event module (§2) |

Category ids should stay stable across `/vendor-signup`, `/intake` (`detectCategory()` in `src/lib/assistant/intake-flow.ts`), the matching engine, and the directory facets — today they already share one list by design ("aligned with the client intake flow").

#### 1.3 Search filters — status matrix

| Filter | Status | Grounding |
|---|---|---|
| Category | **BUILT** | Facet + counts in `src/app/admin/directory/page.tsx`; `vendor_profiles.categories` |
| Industry | **BUILT** | Facet; `vendor_profiles.industries` (GIN, `20260701b`) |
| Location served | **BUILT** | `service_areas` facet incl. El Paso / Juárez / Cross-border / National |
| Company size served | **BUILT** | `client_types` facet (`20260701b`) |
| Language (EN/ES) | PARTIAL | `vendor_profiles.locale` CHECK en/es exists; not yet a facet — one-line addition |
| Budget range | PARTIAL | `price_range` on `vendor_applications`, `budget_range` in event-module ALTER; absent from `vendor_profiles` and UI |
| Product type / Service type | PARTIAL | `offering_types` + `supply_chain_stages` jsonb (`20260703`) on applications; not surfaced as facets |
| Implementation difficulty | PARTIAL | Precedents exist (`kg_products.deployment_complexity`, `wow_ideas.difficulty`); no vendor-profile field yet |
| Demo availability | PARTIAL | `vendor_applications.demo_capabilities` added by `20260706_event_strategy_platform.sql`; not a facet |
| Event availability | PARTIAL | `conference_interests[]` + `participation_preference` (same migration); not a facet |
| Verified vendor status | PARTIAL | Approved/pending toggle exists; public badge treatment MISSING (below) |

#### 1.4 Verified-badge logic

Recommended tiers, each grounded in an existing mechanism:

1. **Registered** — profile exists, `status='pending'`. Not publicly listed.
2. **Verified** — admin sets `status='approved'` via `/api/vendors/manage` PATCH (BUILT). On the applications track, approval fires `promote_approved_vendor_application()` (`20260705`) creating a live `vendors` account row; the SECURITY DEFINER guard trigger `trg_guard_vendor_application_update` (`20260702b`) makes self-approval impossible even via direct REST — the badge is therefore trustworthy by construction.
3. **Documented** — Verified + at least one brochure/video. Already a ranking signal: `scoreVendors()` in `src/lib/matching.ts` gives approved vendors +8 and brochure-holders +2.
4. **Event-Proven** (new) — Verified + completed a demo or booth at an NXT//LINK event, recorded via `invite_list_members.status='confirmed'` + a pipeline outcome (§2.2). Display: "Demoed at [event], [month/year]."

ES labels: Registrado / Verificado / Documentado / Probado en evento. Badge copy must never imply endorsement of pricing or outcomes — verification attests identity, category fit, and review by a human.

### 2. Event & Conference Integration

Two complementary layers exist in the repo: an **external-event intelligence layer** (Era 1) and the new **Conference & Event Strategy module set** (Era 2) for events NXT//LINK runs or joins.

#### 2.1 External event intelligence — BUILT

- `conferences` table (1,772+ seeded industry events with dates, geo, relevance scores, sector tags), `conference_intel`, `exhibitors` (with booth numbers), `enriched_vendors`, `conference_vendor_links`, `conference_scrape_runs`, `conference_leads` (logistics-scored, `el_paso_relevant` flag) — `supabase/migrations/20260308_static_data_tables.sql`, `20260328`, `20260401`, `20260402`.
- Surfaces: `/conferences` (exhibitor browser fed by `src/app/api/conferences/route.ts`, which joins conferences to intel and computes live/upcoming/past status), `/conference/[id]`, `/conference/global`, `/leads` (`/api/leads/conference` with tier/category/search/el_paso facets), agent routes `/api/agents/exhibitor-scraper`, `/api/agents/conference-intel`.
- This layer answers "which external events matter and who exhibits there" — it feeds vendor recruitment and the invite universe. Caveat carried over from the DB inventory: its RLS policies are world-writable (`FOR ALL USING(true)`) and should be hardened before public launch.

#### 2.2 Conference & Event Strategy modules — schema + library BUILT, routes/UI in progress

Documented in `docs/architecture/event-strategy-platform.md`; migration `supabase/migrations/20260706_event_strategy_platform.sql`; shared library `src/lib/events/` (`types.ts`, `validation.ts`, `scoring.ts`, `csv.ts`, `templates.ts`) with tests (`tests/event-scoring.test.ts`, `tests/event-validation.test.ts`) and an idempotent seed script (`scripts/seed-event-strategy.ts`, sample rows flagged `is_sample=true`). The documented API routes (`/api/events/catalog|ideas|companies|concepts|invites|match|pipeline|export`) and the `/admin/events` UI are **not yet present** under `src/app` at HEAD — treat the module as **PARTIAL: data model and pure logic BUILT, admin surface MISSING**.

The seven modules and their state:

| Module | Table / code | Status |
|---|---|---|
| Event intelligence catalog | `event_organizations` — kind (conference/expo/chamber/association/econ-dev), required `source_url` + `source_verified_on`, cost fields requiring their own source, four 0–100 scores | BUILT (schema) |
| Event scoring views | `rankEvents(events, view)` in `src/lib/events/scoring.ts` — views: customers, vendors, global_trends, cross_border; priority-weighted, unscored last | BUILT (tested) |
| Wow-ideas catalog | `wow_ideas` — idea, where_used, why_impressive, **worker_support**, local_adaptation, difficulty, cost_range, demo_concept | BUILT (schema) |
| Company matching / invite-list builder | `target_companies` (segment: warehouse/manufacturer/maquiladora/logistics/supplier/vendor/investor/consultant), `invite_lists`, `invite_list_members` (company XOR vendor member, `role_at_event`, status proposed→invited→confirmed→declined); deterministic `matchVendorToCompany` / `matchVendorToEvent` / `rankVendorsFor*` with human-readable `reasons[]`, accent-insensitive (Juárez ≡ Juarez) | BUILT (schema + tested logic) |
| Event concept builder | `event_concepts` + the **seven templates** in `src/lib/events/templates.ts`: `warehouse-tech-showcase`, `juarez-manufacturing-tech-day`, `cross-border-innovation-forum`, `smart-warehouse-maquila-expo`, `worker-support-demo-day`, `supply-chain-visibility-roundtable`, `quality-safety-productivity-forum`. Speakers/vendors are role descriptions, never invented names; every concept carries `anti_sales_safeguards` and `follow_up_plan` | BUILT (schema + templates) |
| Execution pipeline | `event_pipeline_items` — 10 stages: research → selection → partner_outreach → invite_building → vendor_recruitment → demo_planning → marketing → execution → follow_up → pilot_conversion; `outcomes` json counts meetings/audits/pilots/paid_projects | BUILT (schema) |
| Admin event dashboard | `/admin/events` tabs per the architecture doc | MISSING (next build step) |

#### 2.3 Spec feature coverage

| Spec feature | Status | How it lands |
|---|---|---|
| Event listings | PARTIAL | External: `/conferences` BUILT. Own events: render `event_organizations` + active `event_concepts`; public listing page MISSING |
| Vendor booths | PARTIAL | `exhibitors.booth` (external, BUILT); own events use `invite_list_members.role_at_event` (e.g. "demo booth — inventory tracking"); floor-plan UI MISSING |
| Demo scheduling | PARTIAL | Zoho Meeting BUILT (`src/lib/zoho/meeting.ts`, `POST /api/zoho/meeting`, admin-gated, logs to `zoho_outbox`, degrades to a proposed slot when unconfigured); per-event slot grid MISSING |
| Private B2B meetings | PARTIAL | Same Zoho path + confidential matching; identities stay masked until admin reveal (visibility model is §06's lane) |
| Buyer–vendor matchmaking | BUILT (logic) | `rankVendorsForCompany/Event` (`src/lib/events/scoring.ts`) + `scoreVendors` (`src/lib/matching.ts`, admin `/api/match`) |
| Registration | PARTIAL | Internal RSVP state machine BUILT (`invite_list_members.status`); public registration form + confirmation email (Zoho draft) MISSING |
| Sponsor profiles | PARTIAL | `event_concepts.sponsors[]` field exists; sponsor page/tier display MISSING |
| Conference brochures | PARTIAL | Vendor brochures BUILT (`/api/vendor/brochures`, private bucket, signed URLs); event brochure = curated export; `src/lib/events/csv.ts` (formula-injection-guarded) BUILT for lists; branded PDF packet MISSING |
| Meeting requests | PARTIAL | Zoho mail BUILT (`/api/zoho/email`, draft-first, `zoho_outbox` audit); attendee-initiated request form MISSING |
| Post-event follow-up | PARTIAL | Pipeline `follow_up`/`pilot_conversion` stages + `outcomes` json BUILT (schema); templated bilingual follow-up drafts via `aiDraft()` MISSING wiring |
| Lead capture | PARTIAL | `leads` table (`20260705`, pending apply) with source CHECK — recommend adding `event` to the allowed sources; external `conference_leads` BUILT |
| Event-based quote requests | PARTIAL | A demo that lands becomes a ticket via `/intake` (BUILT, EN/ES) → deal → invited quotes (`deals`/`deal_invites`/`quotes`, `20260705` pending). Recommend an `event_org_id`/`concept_id` reference on `deals` for attribution |
| AI-recommended invitees & vendors per theme | PARTIAL | Deterministic ranking BUILT; an `aiDraft()` layer (draft-only, logged to `ai_draft_logs`, human-approved — consistent with §05) can propose invitee lists per concept theme; MISSING wiring |

**Bilingual note (EN/ES):** invitations, registration pages, and follow-ups must ship in both languages — Juárez manufacturers are a primary audience. Building blocks exist: `site_content.value_en/value_es`, the bilingual `/intake` and ChatWidget, `locale` fields on requests/profiles/responses, and `generateTerms(locale)`. The seven templates are currently EN-only; add ES title/value-statement fields before the first Juárez-facing event.

**Worker-friendly rule:** already enforced in the module — `wow_ideas.worker_support` and `vendor_applications.worker_support_value` are scored matching signals, `event_concepts.anti_sales_safeguards` is a first-class field, and the architecture doc bans "replace workers" positioning outright. Every event concept leads with productivity, safety, quality, visibility, training, and maintenance *for the existing workforce*; this is a selection criterion for featured vendors, not marketing garnish.

### 3. The Demand-Signal Loop: Tickets → Events → Quotes

This is the platform's compounding advantage: ticket flow tells us what the region needs *before* an event is planned, and events generate tickets in return.

#### 3.1 Mechanics and grounding

1. **Signal capture — BUILT.** Every ticket carries `category`, `problem`, `location`, `budget_range`, `ai_summary`, and `recommended_categories` (`client_requests`, `20260625`). The deterministic `detectCategory()` in `src/lib/assistant/intake-flow.ts` classifies even LLM-less intakes.
2. **Theme clustering — PARTIAL.** Clustering infrastructure exists for intelligence signals (`intel_clusters`, `cluster_narratives`, `cluster_recommendations` with vendor/product/tech matches per cluster, `20260325_assembly_layer.sql`; velocity view `v_signal_velocity`), but nothing yet clusters `client_requests`. **To build:** a small aggregation view/job grouping open tickets by `category × location × 60-day window` — no LLM required for v1.
3. **Concept trigger — MISSING (thin).** Recommended rule (an operating recommendation, not a fixed number): when a theme crosses ~5 tickets in 60 days in one geography, surface a "propose event concept" card in the admin dashboard, pre-filled with the matching template.
4. **Build-out — BUILT (schema/logic).** The concept builder fills a template; `rankVendorsForEvent` proposes featured vendors with reasons; the invite-list builder pulls `target_companies` whose `pain_points[]` overlap the theme; the pipeline tracks execution through `pilot_conversion`.
5. **Close the loop — PARTIAL.** Demos → meeting requests (Zoho) → tickets (`/intake`) → deals and quotes; pipeline `outcomes` counts meetings/audits/pilots/paid_projects so each event's ROI is measurable.

**Confidentiality rule (one line; detail in §06):** clustering uses aggregated themes only — an event is pitched as "regional demand for inventory tracking," never "Company X has an inventory problem."

#### 3.2 Worked examples

| Demand signal (tickets) | Concept template | Invite (from `target_companies`) | Feature (via `rankVendorsForEvent`) | Demos / topics | B2B meetings & follow-up |
|---|---|---|---|---|---|
| Inventory-tracking tickets across El Paso warehouses | `warehouse-tech-showcase` | Warehouse + logistics segments, `pain_points` ∋ inventory | Verified WMS/inventory-software + barcode-hardware vendors | Live cycle-count demo; "visibility without headcount cuts" talk | Match ticket-submitters to 2–3 vendors; follow_up stage → pilot offers |
| Juárez quality-inspection tickets from maquiladoras | `juarez-manufacturing-tech-day` or `quality-safety-productivity-forum` | Manufacturer/maquiladora segments; ES-first invitations | Vision-inspection, quality-software, training vendors with `demo_capabilities` | Defect-detection demo assisting (not replacing) inspectors; operator training | Private meetings via Zoho; ES follow-up drafts; quality tickets → deals |
| El Paso barcode/label requests (existing `labels` category) | `warehouse-tech-showcase` (tracking focus) or `supply-chain-visibility-roundtable` | Warehouses + cross-border shippers | Labels/Zebra vendors (already a signup category) + scanning/RFID | Scan-to-ship line demo; label-compliance topic | On-site audits as follow-up outcome; audits counted in pipeline `outcomes` |
| Customs/cross-border delay tickets | `cross-border-innovation-forum` | Logistics + maquiladora + broker segments, both cities | Customs-software (apply-flow category), telematics, TMS vendors | Border-crossing visibility demo; documentation-automation topic | Cross-border intro meetings; `score_cross_border` view picks partner events |
| Staffing/training-heavy tickets | `worker-support-demo-day` | Warehouses + staffing-dependent manufacturers | Training-tech and safety vendors with high `worker_support_value` | Onboarding/training tech, ergonomics, safety wearables | Workforce-development follow-ups; positions NXT//LINK's worker-first brand |

#### 3.3 Build order for this section

1. Ship the `/api/events/*` routes + `/admin/events` dashboard already specified in `docs/architecture/event-strategy-platform.md` (schema, validation, scoring, templates, seed, and tests are done).
2. Add the ticket-theme aggregation view over `client_requests` and the concept-suggestion card.
3. Public directory projection of approved `vendor_profiles` with the badge tiers and the language/demo/event facets (§1.3–1.4).
4. Public event listing + bilingual registration form writing to `invite_list_members`, with Zoho confirmation drafts.
5. Event attribution on `deals` and an `event` lead source, so every event reports meetings → quotes → closed deals.
