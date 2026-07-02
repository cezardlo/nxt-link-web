## Database Schema & Technical Build Plan

The database is not a design exercise — 39 Supabase migrations already exist in `supabase/migrations/`. They fall into two eras sharing one Postgres instance: an **Intelligence Platform era** (2026-03 → 2026-04: signals, knowledge graph, conferences, feeds — anon-readable by design) and the **NXT//LINK marketplace era** (2026-06 → 2026-07: private-by-default, service-role writes, admin/owner-scoped reads). This section documents what exists, what the two product specs still require, and how to build the gap.

### A. Existing schema (BUILT — with pending-apply flags)

Status legend: **BUILT/applied**, **BUILT/pending** = migration file exists but is marked not-yet-applied, **PARTIAL**, **MISSING**.

#### Users & roles

**`platform_users`** (BUILT — `20260625_nxtlink_platform.sql`): the role registry. Key fields: `auth_id` (→ `auth.users`), `role` CHECK (`public/client/vendor/admin/super_admin`), `email`, `full_name`, `company`, `locale` CHECK (`en/es`), `mfa_enabled`. A `handle_new_auth_user()` trigger (`20260626_nxtlink_rls_user.sql`) auto-creates a row (role `client`) on every Supabase Auth signup, and `is_admin()` / `current_pu_id()` helpers drive every RLS policy in the marketplace era. The bilingual mandate is in the schema from day one: `locale` on users, requests, vendor profiles, and quote responses.

#### Vendor side

**`vendor_profiles`** (BUILT — `20260629_vendor_signup_zoho.sql`): self-signup company profiles behind `/vendor-signup` and `/vendor/portal`. Fields: `public_ref` (`VEN-…`), `auth_id`, `company_name`, contact fields, `city`, `locale`, `categories` jsonb, `service_areas` jsonb, `industries` + `client_types` jsonb (GIN-indexed, `20260701b`), `status` (`pending/approved/rejected/paused`), `zoho_contact_id/account_id`. Child tables: **`vendor_brochures`** (private files in the `vendor-brochures` bucket) and **`vendor_videos`** (YouTube/Vimeo links with `embed_url`, `position`). RLS is service-role-only — all reads go through server routes.

**`vendor_applications`** (BUILT/pending — `20260702` + `20260702b/03/04/06`): the second, lower-friction intake behind `/apply`, `/apply/login`, `/apply/status`. Fields: `public_ref` (`APP-…`), `company_name`, `email`, `category` CHECK (TMS/WMS/Telematics-ELD/Forklifts/Customs-Cross-Border/Cold Chain/Robotics/Other), `problem_solved`, `target_customer`, `price_range`, `logo_path`, `product_image_paths` jsonb (≤3), `offering_types` + `supply_chain_stages` jsonb, `company_size`, `region`, `status`, `auth_id` (owner claim). RLS is the business-critical part: anonymous insert allowed, reads admin- or owner-only, and a SECURITY DEFINER guard trigger silently reverts non-admin edits to `status/admin_notes/approved_at/auth_id` — the "catalog never public" promise enforced at the database layer.

#### Client requests / tickets

**`client_requests`** (BUILT — `20260625`): the ticket. `public_ref` (`REQ-…`), structured intake (`category`, `problem`, `quantity`, `location`, `deadline`, `urgency`, `budget_range`, `current_vendor`), confidentiality flags (`nda_required`, `mnda_required`, `share_summary/budget/documents`, `hide_identity`, `vendor_scope` local/global/both), and AI artefacts (`intake_answers`, `ai_summary`, `missing_info`, `recommended_categories` jsonb). Supporting tables: **`request_status_history`**, **`request_files`** (private uploads with `visibility` CHECK and `approved_to_share`), **`admin_notes`**.

#### Quotes & confidential comparison

Two generations coexist. Generation 1 (BUILT — `20260625`): **`quote_packets`** (anonymized `OPP-…` packets with `hide_client_identity/hide_budget`), **`vendor_opportunities`** (packet routed to one vendor, 10-state status), **`vendor_responses`** (structured quote: price/labor/travel/parts, lead time, warranty, payment terms, `pdf_path`, `locale`, `ai_generated`), **`quote_templates`** and **`saved_quotes`** (vendor reuse, with `spanish_version` jsonb). Generation 2 (BUILT/pending — `20260705_quotes_deals_private_comparison.sql`): **`vendors`** (uuid link table promoting approved applications via trigger), **`deals`** (`DEAL-…`, vendor-safe brief, no client PII by design), **`deal_invites`** (UNIQUE deal+vendor — a vendor never sees who else was invited), **`quotes`** (line_items jsonb, `total_price`, `selected_for_client` protected by a guard trigger), **`deal_shares`** (immutable tokenized snapshot the client opens without an account — resolved only by a service-role server route), **`leads`** (client preference/CRM). *Apply-blocker:* `20260705` re-declares `vendors`, which collides with the legacy TEXT-pk `vendors` directory table from `20260308_static_data_tables.sql`; reconcile (rename legacy to `intel_vendors` or schema-qualify) before applying.

#### Categories / industries / facets

No normalized taxonomy tables in the marketplace era — deliberately. Facets live as jsonb arrays with GIN indexes (`vendor_profiles.categories/industries/client_types`, `vendor_applications.offering_types/supply_chain_stages`), using a "fixed dropdown list + free-text Other" convention enforced in the UI, not the DB. The Era-1 `dynamic_industries`, `kg_industries`, `conferences` (1,772 events), `exhibitors`, `enriched_vendors`, and `conference_leads` tables remain available as reference intelligence for event targeting, but are not runtime dependencies of the marketplace.

#### Zoho, audit, notifications, permissions

**`zoho_connections`** (OAuth tokens, server-only RLS) and **`zoho_outbox`** (every email/meeting attempt with status `draft/queued/sent/failed/scheduled`) — BUILT, `20260629`. **`ai_draft_logs`** (every AI draft with mode, provider, approval_status), **`platform_audit_log`**, **`platform_notifications`** (in-app rows: recipient_role/id, title, body, read), **`visibility_permissions`** (identity-reveal approvals per request+vendor), **`proof_of_introduction`** (commission lifecycle timestamps), and **`site_content`** (bilingual `value_en/value_es` editable copy) — all BUILT in `20260625`.

#### Storage buckets

| Bucket | Status | Access model |
|---|---|---|
| `vendor-brochures` | BUILT/applied | Private; service-role + signed URLs only |
| `vendor-logos` | BUILT/pending (`20260702`) | Private; anon INSERT, admin-only SELECT, signed URLs via server routes |
| `vendor-product-images` | BUILT/pending (`20260702`) | Same as vendor-logos |

### B. Proposed additions to complete both specs

#### Covered by the in-flight Conference & Event Strategy migration

`supabase/migrations/20260706_event_strategy_platform.sql` already exists in the repo (BUILT/pending, admin-only RLS on every table, `is_sample` flags, and source-URL + verification-date requirements on factual rows). Server routes exist at `src/app/api/events/{catalog,concepts,ideas,pipeline,export}/route.ts` with logic in `src/lib/events/` (`scoring.ts`, `validation.ts`, `csv.ts`, `templates.ts` — tested in `tests/event-*.test.ts`).

| Table | Key fields (already in migration) |
|---|---|
| `event_organizations` | kind (conference/expo/chamber/association/economic_development), name, location, **source_url + source_verified_on (required)**, audience, industries jsonb, attendees_estimate (text — never invented numbers), mission_fit, participation_recommendation, estimated_cost + cost_source_url, priority, four 0–100 scores (customers, vendors, global_trends, cross_border) |
| `wow_ideas` | idea, where_used, why_impressive, **worker_support** (how it supports — never replaces — workers), local_adaptation, difficulty, cost_range, target_local_company, demo_concept |
| `target_companies` | name, segment (warehouse/manufacturer/maquiladora/logistics/supplier/vendor/investor/consultant), industry, company_size, location, pain_points jsonb, tech_readiness, decision_makers jsonb |
| `event_concepts` | template_key (7 seeded templates incl. Warehouse Technology Showcase, Cross-Border Industrial Innovation Forum), title, audience, theme, speakers/vendors/demos/sponsors/invitees jsonb, venue, value_statement, **anti_sales_safeguards**, follow_up_plan, revenue_model, status |
| `invite_lists` + `invite_list_members` | list: name, purpose, event_org_id, concept_id; member: exactly one of company_id / vendor_application_id (CHECK), role_at_event, status (proposed/invited/confirmed/declined) |
| `event_pipeline_items` | title, 10-stage pipeline (research → … → pilot_conversion), status, owner, due_on, outcomes jsonb ({meetings, audits, pilots, paid_projects}) |
| `vendor_applications` additions | certifications, technology_category, pain_points_solved, target_company_types, demo_capabilities, conference_interests, participation_preference, budget_range, worker_support_value, consent_terms_at |

MISSING from that effort: the **admin event dashboard page** (`src/app/admin/events/` does not exist yet — the API layer is ready for it).

#### Still-missing tables (new migrations required)

| Table | Status | Most important fields (proposed) |
|---|---|---|
| `message_threads` + `messages` | MISSING | thread: request_id/deal_id, participant ids, anonymity_mode; message: thread_id, sender_id, sender_display ("Vendor B" until reveal), body, redacted_body, attachments jsonb, read_at. RLS: participants + admin; identity-reveal only via `visibility_permissions` |
| `meetings` | PARTIAL — `zoho_outbox` already stores meeting_topic/start/url; propose a first-class table | request_id/deal_id, vendor_id, client_id, zoho_meeting_id, join_url, starts_at, timezone, status (proposed/confirmed/held/cancelled), notes |
| `favorites` | MISSING | user_id, target_type CHECK (vendor/product/event/wow_idea), target_id, created_at; UNIQUE(user_id, target_type, target_id) |
| `reviews` | MISSING (V2 — only meaningful after completed deals) | deal_id, reviewer_pu_id, vendor_id, rating 1–5 CHECK, dimensions jsonb (quality/timeliness/communication), text, verified_transaction bool (only reviewable after proof_of_introduction shows client_selected), moderation_status |
| `notifications` delivery | PARTIAL — `platform_notifications` table BUILT; MISSING: email/digest delivery worker, per-user notification_preferences (channel, frequency, locale) |
| `analytics_events` | MISSING | id, session_id, pu_id nullable, event_name, surface, properties jsonb, locale, created_at. Insert-only RLS; 90-day purge like `cleanup_audit_logs()` |
| `consents` | PARTIAL — `consent_terms_at` on vendor_applications and NDA flags on client_requests exist; propose a generalized ledger: pu_id, consent_type (terms/privacy/nda/marketing/data_share), version, granted_at, revoked_at, ip |

### C. Technical build plan

#### Stack: keep what is built

The recommended stack is the existing stack — **Next.js 14 App Router + TypeScript + Tailwind, Supabase (Postgres, Auth, Storage, RLS), Vercel hosting, the provider-routed LLM client, and Zoho Mail/Meeting**. Justification: (1) ~180 API routes, 51 pages, and 39 migrations already run on it — any re-platform burns months for zero user value; (2) RLS puts the confidentiality promise (the product's core differentiator) in the database, not in app code that every new route must remember; (3) the LLM router (`src/lib/llm/parallel-router.ts`, 8 providers, consensus voting, per-day token budgets, deterministic fallbacks) means no vendor lock-in and a hard cost ceiling; (4) Supabase Auth + Storage + signed URLs eliminate three categories of custom infrastructure; (5) the whole system degrades gracefully — it runs with zero external services configured, which de-risks demos and outages.

#### File uploads — BUILT

Private buckets + signed URLs are the pattern throughout: brochures via `/api/vendor/brochures`, application logos/product images via `/api/apply/my/media` (`src/app/api/apply/my/media/route.ts`), request documents via `request_files` with per-file `visibility` and `approved_to_share`. Nothing is publicly listable; admin routes mint short-lived signed URLs. This meets the spec as-is.

#### Authentication & RBAC — PARTIAL, one critical fix

BUILT: Supabase email/password sessions; `platform_users.role` five-role model; owner-scoped guards `getApplicantSession` (`src/lib/apply/auth.ts`) and `getVendorSession` (`src/lib/vendor/auth.ts`) that only ever return the caller's own row; per-user RLS (`20260626`); the hardened admin session in `src/lib/server/admin-session.ts` (env-managed `ADMIN_ACCESS_CODE`, constant-time compare, HMAC-signed httpOnly cookie, 12h TTL — tested in `tests/admin-session.test.ts`).

THE FIX (small, urgent): `src/lib/privateAccess.ts` still hardcodes and exports `PRIVATE_ACCESS_CODE = '4444'`, which ships in the client bundle and is still accepted by `isAdminRequest` in `src/lib/assistant/auth.ts` — cosmetic gating, not security. Migration path: (1) point `isAdminRequest` at the `admin-session.ts` cookie/env check; (2) replace `AccessGate`/`PrivateAccessPrompt` localStorage checks with the `POST /api/auth/access-code` cookie flow; (3) delete the constant; (4) move real admins to `platform_users.role = 'admin'` accounts. Roughly 1–2 developer-days.

#### Admin tools

BUILT: `/admin/requests` (queue + AI drafting), `/admin/vendors` (statuses, brochures), `/admin/match` (category/service-area scoring via `src/lib/matching.ts` — pure functions, admin-gated `/api/match`), `/admin/directory`. MISSING: `/admin/events` dashboard (APIs ready), a deal-builder UI for the `20260705` schema, and an admin analytics view.

#### Security basics

BUILT with tests: fixed-window rate limiting (`src/lib/http/rate-limit.ts`), LLM prompt-injection sanitizer (`src/lib/llm/sanitize.ts` — 8 patterns, risk scoring), SSRF guard with DNS-rebinding protection (`src/lib/http/url-safety.ts`), retrying fetch, append-only `audit_log`, and best-effort `ai_draft_logs`/`platform_audit_log`/`zoho_outbox` trails. Required hardening before scale: apply rate limiting to all public POST routes (`/api/vendors/signup`, `/api/apply/submit`, `/api/chat`, `/api/assistant/*`); close the Era-1 world-writable RLS policies (swarm_memory, exhibitors, enriched_vendors, causal_maps, decision_log inserts — see inventory item 6.4); add guards or retirement decisions for the ~161 unguarded intel/agent routes; fix the two known broken migrations (`20260323_insights.sql` type mismatch; `vendors` name collision) before applying the pending chain; move rate limits/token budgets from in-memory to a durable store (e.g. Postgres or Upstash) when moving beyond a single instance. Validation quality gate already exists: `npm run verify` = lint + typecheck + tests + build.

#### Development phases

Estimates assume one full-stack TypeScript developer familiar with the repo; ranges are recommendations, not commitments.

| Phase | Work | Difficulty | Skills | Est. effort |
|---|---|---|---|---|
| 1. Stabilize | Apply pending migration chain (`20260702`→`20260706`) after fixing `vendors` collision; kill `'4444'`; rate-limit public POSTs | Medium (migration reconciliation is the risky part) | Postgres/RLS, Supabase CLI | 1–2 weeks |
| 2. Complete V1 loop | Deal-builder admin UI on `20260705` schema; client `deal_shares` compare page; `/admin/events` dashboard on existing APIs | Medium | Next.js App Router, React, Tailwind | 2–4 weeks |
| 3. Communication | `message_threads`/`messages` with anonymity modes; `meetings` table wired to existing Zoho lib; notification email delivery worker | Medium-high (RLS for reveal states needs care) | Postgres/RLS, Zoho API | 3–4 weeks |
| 4. Engagement | `favorites`, `analytics_events`, `consents` ledger, ES translations for vendor portal and admin | Low-medium | Full-stack + a bilingual reviewer | 2–3 weeks |
| 5. V2 | `reviews` (post-deal only), event ROI reporting joining `event_pipeline_items.outcomes` to `leads`/`deals`, payments/subscriptions | High (trust/moderation + payments compliance) | Payments (Stripe-class), moderation design | 4–8 weeks |

#### Version-1 vs Version-2 split

**V1 (ship on existing rails):** ticket intake (`/intake`, bilingual — BUILT) · vendor application + portal (BUILT) · AI draft-only assistants with human review (BUILT) · admin match + quote packets (BUILT) · private deal/quote comparison + tokenized client share (schema BUILT/pending; UI to build) · event catalog, scoring, wow-ideas, invite lists, concepts, pipeline (migration + APIs BUILT/pending; admin UI to build) · Zoho email/meeting drafts (BUILT) · env-based admin auth (BUILT; wiring to finish).

**V2 (defer deliberately):** vendor↔client messaging threads · reviews/ratings (needs completed-deal volume first) · notification digests + preferences · analytics dashboards · payments/subscription billing · public marketplace search over approved vendors (a policy decision, since today's RLS keeps the catalog private by design) · Spanish coverage of admin surfaces.

**Bilingual note / Nota bilingüe:** EN/ES is already structural — `locale` columns on users/requests/profiles/responses, `site_content.value_en/value_es`, `quote_templates.spanish_version`, and bilingual question flows in `src/lib/assistant/intake-flow.ts`. Today only `/intake`, `/vendor-signup`, and `/vendor/quotes` expose the toggle; V1 should extend it to `/apply` and the vendor portal, with admin surfaces in V2. / El soporte EN/ES ya es estructural en el esquema; la V1 debe extender el selector de idioma a `/apply` y al portal de proveedores.
