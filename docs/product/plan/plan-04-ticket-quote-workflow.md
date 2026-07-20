## Ticket/RFQ System, Quote Workflow, Comparison & Worked Examples

This section defines the request-to-quote engine end to end. Every capability is marked **BUILT** (in the repo, with path), **PARTIAL**, or **MISSING**. The existing spine: `/intake` wizard → `POST /api/platform/requests` → `client_requests` → `/admin/requests` + `/admin/match` → `/vendor/quotes` → the private comparison schema in `supabase/migrations/20260705_quotes_deals_private_comparison.sql` (written, **not yet applied**).

### A. Ticket Submission — Field Model vs. What Exists

The intake wizard (`src/app/intake/page.tsx`, EN/ES toggle) runs a deterministic question engine (`src/lib/assistant/intake-flow.ts`): 5 category flows (forklift, staffing, warehouse_tech, transportation, facility, + unsure) plus 6 shared closing questions (location, deadline, budget, NDA, vendor scope, share-permission). Submissions land in `client_requests` via `src/app/api/platform/requests/route.ts`.

| Ticket field (target) | Status | Where it lives / gap |
|---|---|---|
| Company type (maquiladora, warehouse, 3PL, carrier…) | **MISSING** | No column; add `company_type` to `client_requests` + one intake question (EN/ES) |
| Industry | **PARTIAL** | `client_requests.category` (service category) exists; a true client-industry field only appears on packets (`quote_packets.general_industry`). Add `industry` to `client_requests` |
| Location (city/site) | **BUILT** | `client_requests.location`; shared intake question `location` |
| Facility size (sq ft / m²) | **MISSING** | Add column + question; feeds vendor sizing |
| Number of employees | **MISSING** | Add column + question |
| Problem description | **BUILT** | `client_requests.problem`; free-text opener + `detectCategory()` |
| Desired outcome | **PARTIAL** | Asked in the `unsure` flow (`result` question) and stored in `intake_answers` jsonb; promote to first-class `desired_outcome` column |
| Current process | **PARTIAL** | Asked in `warehouse_tech` flow (`process`, `current`); jsonb only |
| Current vendors/tools | **PARTIAL** | `client_requests.current_vendor` column exists (migration `20260625_nxtlink_platform.sql`) but the POST route never writes it; wire it |
| Budget range | **BUILT** | `client_requests.budget_range`; bilingual question includes the confidentiality reassurance ("stays hidden unless you allow sharing") |
| Timeline / deadline / urgency | **BUILT** | `deadline` + `urgency` columns and questions |
| Language preference | **BUILT** | `client_requests.locale` CHECK (en/es); EN/ES toggle on `/intake` |
| Confidentiality level | **PARTIAL** | Schema is strong: `nda_required`, `mnda_required`, `share_summary/budget/documents`, `hide_identity`, `vendor_scope` (local/global/both). Intake asks NDA + share-summary; POST writes only `nda_required` + `vendor_scope`. Wire the rest |
| Site visit needed | **MISSING** | Add boolean + question |
| Wants: quotes / recommendations / demos / research / introductions | **MISSING** | Today every ticket implicitly means "get me quotes." Add a `requested_services` jsonb multi-select — cheap to add, big routing value |
| Attachments | **PARTIAL** | `/intake` has a file picker but only captures file **names** (`src/app/intake/page.tsx` `handleFiles()`); `request_files` table with visibility levels (private/admin_only/selected_vendors/selected_client) exists in schema. Wire real upload to a private bucket + signed URLs |

**Bottom line:** the submission pipeline, bilingual UX, and confidentiality schema are BUILT; roughly a third of the target fields need columns and one intake question each — days of work, not weeks, because the question engine is data-driven.

### B. AI Ticket Organization

Every AI output in the platform is a **draft** requiring human approval (`aiDraft()` in `src/lib/assistant/llm.ts` marks `is_draft: true` and logs to `ai_draft_logs`). Extraction targets:

| Extraction target | Status | Grounding |
|---|---|---|
| Category | **BUILT** | Deterministic `detectCategory()` (works with zero LLM keys) + `recommended_categories` jsonb |
| Industry | **PARTIAL** | Inferred into `ai_summary`; no dedicated field |
| Problem type | **BUILT** | `ai_summary.problem` via intake engine summary |
| Urgency | **BUILT** | `urgency` extracted + stored |
| Budget level | **BUILT** | `budget_range` |
| Location | **BUILT** | `location` |
| Required products/services/software/hardware/expertise | **PARTIAL** | `warehouse_tech` flow asks capabilities (WMS/RFID/sensors/etc.); not normalized into a taxonomy field. Reuse the `offering_types`/`supply_chain_stages` taxonomy from `20260703_vendor_applications_taxonomy.sql` so tickets and vendors speak the same language |
| Possible vendors | **BUILT** | `POST /api/match` → `scoreVendors()` in `src/lib/matching.ts` (category ×62, service-area ×28, approved +8, brochures +2) |
| Missing info | **BUILT** | `client_requests.missing_info` jsonb, produced by the engine |
| Clarifying questions | **BUILT** | One-at-a-time follow-ups are the core of the intake engine; admin can draft more via `POST /api/assistant/admin` |
| Confidentiality risk | **PARTIAL** | `sanitizeUntrustedLlmInput()` (`src/lib/llm/sanitize.ts`) yields a `risk_score` for prompt-injection, not for "this text names the client." Add a PII/identity-leak check before any packet is sent |
| Next steps | **PARTIAL** | Admin assistant drafts them; not a structured field |

**RFQ-style professional rewrite — BUILT (draft stage).** `/admin/requests` (`src/app/admin/requests/page.tsx`) uses the admin assistant to draft an anonymized **quote packet** with exactly the RFQ shape: `general_industry`, `general_location`, `problem_summary`, `scope`, `quantity`, `timeline`, `urgency`, `quote_deadline`, `requirements[]`, `questions_for_vendor[]` (see `packetToText()`). The `quote_packets` table (with `hide_client_identity`, `hide_budget`, OPP-ref) exists in `20260625_nxtlink_platform.sql`. **Gap:** the drafted packet is not yet persisted to `quote_packets` nor fanned out into `vendor_opportunities` rows — that write path is the top workflow gap.

### C. Status Model — Target vs. Existing

The repo already has a three-layer model in `src/lib/assistant/branding.ts`: 10 bilingual client-facing statuses (`CLIENT_STATUSES`), a 12-column admin pipeline (`REQUEST_PIPELINE`), and 10 vendor-opportunity statuses (`VENDOR_OPP_STATUSES`), plus an append-only `request_status_history` table. Keep the three layers (clients should never see internal kanban states); reconcile the target model onto them:

| Target status | Client-facing (EN/ES) | Admin pipeline | Status |
|---|---|---|---|
| Draft | — | — | **MISSING** — requests exist only once submitted; add a `draft` state + resumable intake |
| Submitted | `request_received` / Solicitud recibida | `new_request` | **BUILT** |
| Needs clarification | `reviewing_details` | `needs_more_info` | **BUILT** |
| Matching in progress | `searching_vendors` / Buscando proveedores | `vendor_search` | **BUILT** |
| Waiting for customer approval | `next_step_pending` (loose) | — | **PARTIAL** — share-permission is captured at intake, but there is no explicit "client approves this packet before it goes out" state; add `waiting_client_approval` |
| Sent to vendors | `contacting_vendors` | `quote_packets_sent` | **BUILT** (status exists; the send mechanics are the Section B gap) |
| Vendor questions received | — | — | **PARTIAL** — vendor side has `needs_more_info` and `vendor_responses.questions`; no request-level rollup status |
| Quotes received | `collecting_quotes` | `quotes_received` | **BUILT** |
| Demo scheduled | — | — | **PARTIAL** — Zoho Meeting creation is BUILT (`src/lib/zoho/meeting.ts`, `zoho_outbox` kind='meeting'); no status reflects it |
| Site visit scheduled | — | — | **MISSING** |
| In negotiation | `comparing_options`/`options_ready` (adjacent) | `sent_to_client` | **PARTIAL** — add explicit `in_negotiation` |
| Selected vendor | `vendor_selected` / Proveedor seleccionado | `client_selected` | **BUILT** |
| Completed | `closed` | `closed` | **PARTIAL** — `closed` conflates outcomes; `proof_of_introduction.deal_status` can carry won/completed |
| Closed without selection | `closed` | `lost` | **PARTIAL** — admin distinguishes `lost`; client sees only "Closed"; add an honest bilingual "Closed — no selection" |

**Recommendation:** add 5 states (`draft`, `waiting_client_approval`, `demo_scheduled`, `site_visit_scheduled`, `in_negotiation`) and split `closed` into `completed` / `closed_no_selection`. Every transition already has a home in `request_status_history` (BUILT).

### D. The 10-Step Quote & Introduction Workflow

1. **Client submits a ticket** — `/intake` (EN/ES), or ChatWidget handoff. *BUILT.*
2. **AI organizes it** — category, summary, missing info, clarifying questions; logged as draft. *BUILT* (`/api/assistant/intake`, deterministic fallback works without any LLM key).
3. **Admin reviews & clarifies** — `/admin/requests` queue; AI-drafted clarification emails sent via Zoho (`POST /api/zoho/email`, logged to `zoho_outbox`; unconfigured → human sends manually). *BUILT.*
4. **Confidential vendor matching** — `/admin/match` + `POST /api/match` scores `vendor_profiles` with human-readable reasons. Vendors never see the client; clients never see the long-list. *BUILT.*
5. **Client approves the anonymized summary** — consent captured at intake; per-packet approval step *PARTIAL* (needs the `waiting_client_approval` state + a client-facing approval screen).
6. **Anonymized quote packet sent to selected vendors** — `quote_packets` → `vendor_opportunities` rows, OPP-refs, `hide_client_identity` enforced. Schema *BUILT*; persistence + fan-out wiring *PARTIAL* (Section B gap); email delivery via Zoho *BUILT*.
7. **Vendors respond or ask questions** — `/vendor/quotes` workspace (EN/ES) with the AI quote assistant (`/api/assistant/vendor-quote`), templates (`quote_templates`), and structured `vendor_responses`. *BUILT.*
8. **Quotes collected & compared side-by-side** — the `20260705` schema (`deals`, `deal_invites`, `quotes`, `deal_shares`) is written with airtight RLS (a vendor can never see another vendor's quote or who else was invited; `UNIQUE(deal_id, vendor_id)`); **not yet applied**, and it collides with the legacy TEXT-pk `vendors` table from `20260308_static_data_tables.sql` — reconcile before applying. Comparison **UI is MISSING**.
9. **Client reviews options; demos/site visits scheduled; selects** — tokenized read-only `deal_shares` snapshot for the client (admin-curated via the `quotes.selected_for_client` flag, protected by the `guard_quote_update()` trigger); client preference lands in `leads` (source `quote_preference`). Zoho Meeting for demos *BUILT*; share-page UI *MISSING*.
10. **Introduction & commission trail** — identity reveal only via `visibility_permissions`; lifecycle timestamps (received → terms_accepted → quote_submitted → identity_revealed → client_selected) in `proof_of_introduction`, referencing the non-circumvention terms generated by `src/lib/assistant/terms.ts`. Schema *BUILT*; workflow UI *MISSING*.

### E. Vendor Response Fields & Side-by-Side Comparison

**Vendor response fields** — grounded in `vendor_responses` (20260625) and `quotes` (20260705), plus the `/vendor/quotes` form state (`price_text`, `labor_rate`, `service_fee`, `travel_fee`, `parts_cost`, `included`, `excluded`, `lead_time`, `warranty`, `payment_terms`):

| Target field | Status | Grounding / gap |
|---|---|---|
| Proposed solution | **PARTIAL** | Narrative goes in `included`/notes; add a `solution_summary` field |
| Products / services offered | **PARTIAL** | `quotes.line_items` jsonb is the right home; no structured product rows in `vendor_responses` |
| Price (one-time) | **BUILT** | `quotes.total_price` numeric + itemized price fields in `vendor_responses` |
| Monthly / recurring cost | **MISSING** | Add `recurring_cost` + `recurring_period` (critical for SaaS/WMS quotes) |
| Timeline | **BUILT** | `vendor_responses.lead_time`, `quotes.timeline` |
| Hardware / software needed | **MISSING** | Add jsonb field; mirrors intake `capabilities` question |
| Training included | **MISSING** | Intake asks about training; vendor side has no field — add `training_included` + description. Worker-friendly rule: every quote surfaces the training plan for existing staff |
| Support plan | **MISSING** | Add `support_terms` |
| Warranty | **BUILT** | `vendor_responses.warranty`; `generateTerms()` defaults 12 months, bilingual |
| Assumptions | **PARTIAL** | `included` approximates; add explicit `assumptions` |
| Exclusions | **BUILT** | `vendor_responses.excluded` |
| Next steps | **BUILT** | `vendor_responses.next_info` + `questions` |

**Comparison criteria** (the client-facing side-by-side, rendered from a `deal_shares` snapshot so it never changes after sending):

| Criterion | Source | Status |
|---|---|---|
| Price | `quotes.total_price` + `line_items` | **BUILT** (schema, unapplied) |
| Timeline | `quotes.timeline` | **BUILT** (schema, unapplied) |
| Fit score | `scoreVendors()` output + reasons | **BUILT** (engine) — persist the score onto the quote row |
| Support | new `support_terms` | **MISSING** |
| Local availability | `vendor_profiles.service_areas` (national/nacional handled) | **BUILT** |
| Language capability | `vendor_profiles.locale`, `vendor_responses.locale` | **BUILT** |
| Implementation difficulty | — | **MISSING** (Era-1 `kg_products.deployment_complexity` exists but is not linked; add a 1–5 field) |
| Vendor rating | — | **MISSING** — no ratings table yet; seed from admin assessment until real reviews accrue |
| AI summary per quote | `aiDraft()` admin mode | **PARTIAL** — engine BUILT, per-quote wiring missing |
| Risk score | — | **MISSING** — recommend rubric: vendor age on platform, quote completeness, exclusion breadth, reference availability |
| Best-fit recommendation | `quotes.selected_for_client` (manual curation, trigger-guarded) | **PARTIAL** — human curation BUILT in schema; AI-drafted recommendation (always labeled draft) MISSING |

### F. Worked Example 1 — Juárez Maquiladora, Quality Inspection Tooling

*Illustrative example; company and figures are fictional.*

**Raw submission (via `/intake`, ES locale):** "Somos una maquiladora de arneses automotrices en Ciudad Juárez. Tenemos demasiados defectos que se escapan en la inspección visual manual de conectores. Queremos algo que ayude a nuestras inspectoras a detectar defectos sin frenar la línea. Presupuesto aún no definido. Necesitamos algo funcionando antes del próximo cambio de modelo."

**AI organization (draft, human-approved):** category `warehouse_tech` → refined to *quality inspection technology*; industry: automotive harness manufacturing; location: Ciudad Juárez; urgency: high (model changeover deadline); budget: undisclosed (hidden per default); language: ES; missing info flagged: parts per shift, number of inspection stations, current escape rate, integration with existing MES, training needs. Clarifying questions issued one at a time per the intake engine.

**Anonymized RFQ packet (the professional rewrite, `quote_packets` shape):**

> **OPP-7Q2M4K1D — Vision-Assisted Quality Inspection, Connector Assemblies**
> **Industry:** Automotive wire-harness manufacturing (maquiladora) · **General location:** Ciudad Juárez, Chih. · **Urgency:** High — must be operational before next model changeover
> **Problem:** Manual visual inspection of connectors is allowing defect escapes; the operation needs inspection support that **assists the existing inspection team** — the client explicitly wants to keep and upskill its inspectors, not reduce headcount.
> **Scope:** Camera/vision-assisted inspection at 4 stations, 2 shifts; ~9,000 connectors/shift (client estimate); operator-facing pass/fail guidance in Spanish; defect-trend reporting for the quality department.
> **Requirements:** Spanish-language operator UI and training · integration path to existing quality logs · on-site installation and calibration in Juárez · training plan for current inspectors included in quote.
> **Questions for vendor:** Camera hardware included or client-purchased? Typical false-reject rate at comparable line speeds? Training hours included? Local (Juárez/El Paso) support availability and response time?
> **Quote deadline:** 10 business days. *Client identity and budget hidden (`hide_client_identity`, `hide_budget`).*

### G. Worked Example 2 — AI Match Explanation (Required Format)

*Illustrative draft as it would appear in `/admin/match` for the RFQ above — every field labeled a recommendation, pending human review. Vendor is fictional.*

| Field | Content |
|---|---|
| **Vendor** | BorderVision QA Systems (example vendor — approved profile, service areas: El Paso / Cd. Juárez) |
| **Relevant products** | Bench-top vision inspection stations; Spanish-language operator guidance software; defect-analytics dashboard |
| **Problem it solves** | Catches connector defects at the station before they escape downstream, with visual cues the inspector confirms |
| **Why it fits** | Category match (quality/inspection tech), service area includes Juárez, bilingual deployment team, quotes on-site installation and operator training — matches the worker-support requirement (fit score 87/100: category 0.85×62 + area 1.0×28 + approved +8) |
| **Estimated cost range** | US$18k–45k for 4 stations (estimate for planning only — actual quote governs) |
| **Implementation difficulty** | Medium (2/5) — no line reconfiguration; per-connector-family calibration required |
| **Expected benefit** | Fewer defect escapes and rework hours; inspectors shift from eye-strain scanning to confirm-and-disposition, with defect-trend data for the quality team — supports the existing workforce, replaces no one |
| **Questions to ask** | False-reject rate at 9k units/shift? Training hours per inspector included? Juárez support SLA? MES/quality-log integration cost included or extra? |
| **Risk level** | Low-medium — local presence reduces support risk; calibration effort at model changeover is the main schedule risk |
| **Next step** | Send anonymized packet OPP-7Q2M4K1D; request a 30-minute demo (Zoho Meeting) with the client's quality supervisor and one line inspector present |

### H. Build Priorities for This Workflow

1. Apply the `20260702` → `20260705` migration chain after resolving the `vendors` table-name collision (blocker for steps 8–9).
2. Wire packet persistence + `vendor_opportunities` fan-out from `/admin/requests` (turns the drafted RFQ into a routed one).
3. Build the client comparison page on `deal_shares` tokens + the quote side-by-side table.
4. Add the missing ticket fields (Section A) and the 5 missing statuses (Section C) — schema + one intake question each.
5. Add vendor-response fields for recurring cost, training, support — required for honest comparisons and for the worker-friendly positioning to be visible in every quote.
