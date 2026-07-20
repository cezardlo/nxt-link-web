# Conference & Event Strategy Platform

Internal B2B event-strategy tooling for the El Paso / Ciudad Juárez program:
research events, catalog worker-supportive "wow ideas", segment target
companies, build invite lists, design event concepts from templates, and run
the execution pipeline from research to pilot conversion.

## Security model

- **All event-strategy data is private admin intelligence.** No public read
  path exists — RLS on every table allows only `public.is_admin()`
  (authenticated admins) and `service_role`.
- Server routes are guarded by `isAdminRequest()`
  (`src/lib/assistant/auth.ts`): Supabase session role `admin`/`super_admin`,
  OR a valid httpOnly admin session cookie minted by
  `POST /api/auth/access-code`, OR (transitional, scripts only) an
  `x-access-code` header compared server-side against the env-managed
  `ADMIN_ACCESS_CODE`. The old hardcoded `PRIVATE_ACCESS_CODE='4444'` constant
  is gone — no secret ships in the client bundle
  (`src/lib/server/admin-session.ts`).
- Mutating routes validate input with zod (`src/lib/events/validation.ts`)
  and rate-limit per client (`src/lib/http/rate-limit.ts`).

## Factual-record integrity

- Event/organization records REQUIRE `source_url` + `source_verified_on`.
- A non-sample record carrying `estimated_cost` REQUIRES `cost_source_url` +
  `cost_verified_on` (enforced by `eventOrganizationInput`).
- Demo data is explicitly flagged `is_sample=true`, name-prefixed `SAMPLE —`,
  and points at `example.com` sources. Seed via
  `npx tsx scripts/seed-event-strategy.ts` (idempotent; only touches
  `is_sample=true` rows).

## Data model (migration `20260706_event_strategy_platform.sql`)

| Table | Purpose | Key fields |
|---|---|---|
| `event_organizations` | Event intelligence catalog: conferences, expos, chambers, associations, economic-development groups | `kind`, `name`, `location`, `source_url`*, `source_verified_on`*, `audience`, `industries[]`, `attendees_estimate`, `relevance`, `mission_fit`, `participation_recommendation`, `estimated_cost` (+ its own source/date), `timing_frequency`, `priority` (high/medium/low), four 0–100 scores (`score_customers`, `score_vendors`, `score_global_trends`, `score_cross_border`) |
| `wow_ideas` | Global wow-ideas catalog | `idea`*, `where_used`, `why_impressive`, `worker_support`, `local_adaptation`, `difficulty`, `cost_range`, `target_local_company`, `demo_concept`, optional source fields |
| `target_companies` | Invite universe segmentation | `name`*, `segment` (warehouse/manufacturer/maquiladora/logistics/supplier/vendor/investor/consultant/other), `industry`, `company_size`, `location`, `pain_points[]`, `tech_readiness`, `decision_makers[]` |
| `event_concepts` | Concept builder output | `template_key`, `title`*, `audience`, `theme`, `speakers[]`, `vendors[]`, `demos[]`, `venue`, `sponsors[]`, `invitees[]`, `value_statement`, `anti_sales_safeguards`, `follow_up_plan`, `revenue_model`, `status` (draft/active/archived) |
| `invite_lists` | Named invite list, optionally tied to an event or concept | `name`*, `purpose`, `event_org_id`, `concept_id` |
| `invite_list_members` | List membership — exactly one of company/vendor | `list_id`*, `company_id` XOR `vendor_application_id` (DB check), `role_at_event`, `status` (proposed/invited/confirmed/declined) |
| `event_pipeline_items` | Execution pipeline | `title`*, `stage` (research → selection → partner_outreach → invite_building → vendor_recruitment → demo_planning → marketing → execution → follow_up → pilot_conversion), `status` (todo/in_progress/blocked/done), `owner`, `due_on`, `outcomes` json (`meetings`, `audits`, `pilots`, `paid_projects`) |

`*` = required. Every table carries audit fields (`created_by`, `created_at`,
`updated_at` with touch trigger) and `is_sample`.

### Vendor intake extension (`vendor_applications` ALTER)

New columns for the event program: `certifications[]`,
`technology_category`, `pain_points_solved[]`, `target_company_types[]`,
`demo_capabilities`, `conference_interests[]`, `participation_preference`,
`budget_range`, `worker_support_value`, `consent_terms_at`. Same jsonb-array
conventions as `offering_types`.

## Shared library (`src/lib/events/`)

- `types.ts` — row types.
- `validation.ts` — zod create/update schemas per entity; factual-record
  rules live here.
- `scoring.ts` — pure, deterministic: `rankEvents(events, view)` for the four
  scoring views; `matchVendorToCompany` / `matchVendorToEvent` +
  `rankVendorsFor*` with human-readable `reasons[]` so admins see *why* a
  match was proposed. Accent-insensitive (Juárez ≡ Juarez).
- `csv.ts` — `toCsv` with quoting + spreadsheet formula-injection guard.
- `templates.ts` — the seven event-concept templates (speakers/vendors are
  role descriptions, never invented names).

Tests: `tests/event-scoring.test.ts`, `tests/event-csv.test.ts`,
`tests/event-validation.test.ts`, `tests/admin-session.test.ts`.

## API surface (all admin-guarded)

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/access-code` | POST/GET/DELETE | Verify access code → httpOnly session cookie |
| `/api/events/catalog` | GET/POST/PATCH/DELETE | Event intelligence catalog CRUD + filters |
| `/api/events/ideas` | GET/POST/PATCH/DELETE | Wow-ideas CRUD |
| `/api/events/companies` | GET/POST/PATCH/DELETE | Target-company CRUD |
| `/api/events/concepts` | GET/POST/PATCH/DELETE | Concept CRUD (+ `?templates=1` returns templates) |
| `/api/events/invites` | GET/POST/PATCH/DELETE | Invite lists + members |
| `/api/events/match` | POST | Rank approved vendors for a company or event (deterministic scoring) |
| `/api/events/pipeline` | GET/POST/PATCH/DELETE | Pipeline items |
| `/api/events/export` | GET | CSV export per entity |

## Admin UI

`/admin/events` (wrapped in `AccessGate`): tabs for Catalog, Scoring views
(best-for-customers / vendors / global trends / cross-border), Wow Ideas,
Companies & Invites, Concepts (template picker), Pipeline (stage board), and
CSV export. Sample rows are visibly badged `SAMPLE`.

## Worker-support rule

All templates, UI copy, and matching signals favor technology that supports
productivity, safety, quality, visibility, training, and maintenance while
supporting the existing workforce. "Replace workers" positioning is not used
anywhere, and `worker_support_value` is a scored matching signal.
