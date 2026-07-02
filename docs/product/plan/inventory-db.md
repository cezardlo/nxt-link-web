# Supabase Schema Inventory — nxt-link-web

Source: all 39 files in `supabase/migrations/*.sql` (read in full, 2026-07-02).
Two eras share one database: the **Intelligence Platform** (2026-03 → 2026-04) and the **NXT//LINK vendor platform** (2026-06 → 2026-07).

Legend: `pk` = primary key, `fk` = foreign key, `ts` = timestamptz, `→` references.

---

## 1. Era 1 — Intelligence Platform (20260304 – 20260430)

### 20260304_graph_schema.sql — technology intelligence graph

Enums created: `signal_type_enum`, `edge_relationship_enum`, `discovery_source_type_enum`, `discovery_source_status_enum`, `technology_maturity_enum`, `edge_entity_type_enum`.

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `companies` | Tracked companies for the graph | id uuid pk, name text, description, website, location, industry, founded_year int, employee_count int, revenue_range, lat/lon numeric(9,6), logo_url, source_url, created/updated ts | — | GIN fts(name); industry; partial (lat,lon) |
| `technologies` (uuid version) | Tracked technologies | id uuid pk, name, description, category, maturity_level enum default 'emerging', first_detected_at ts | — | category; GIN fts(name) |
| `products` (uuid version) | Company products | id uuid pk, company_id uuid fk→companies (cascade), name, description, technology_id fk→technologies (set null), url | NOT NULL name/company_id | company_id; partial technology_id |
| `patents` | Patent filings | id uuid pk, title, abstract, filing_date date, patent_number, assignee_company_id fk→companies (set null), technology_ids uuid[], source_url | — | partial assignee; filing_date desc; GIN fts(title) |
| `graph_signals` | Typed intelligence signals (enum) | id uuid pk, type enum, title, description, company_id fk, technology_id fk, detected_at ts, source_url, confidence numeric(4,3) 0–1 | confidence CHECK 0–1 | type; partial company_id; detected_at desc |
| `edges` | Polymorphic graph edges | id uuid pk, source_type/target_type enum, source_id/target_id uuid, relationship enum, confidence numeric(4,3), evidence_url | UNIQUE(source_type,source_id,target_type,target_id,relationship); confidence 0–1 | source; target; relationship |
| `discovery_sources` | Crawl source registry | id uuid pk, name, type enum, url, last_crawled_at, status enum default 'active', cadence_hours int >0 | cadence CHECK | type; status |

RLS (all 7): `anon` SELECT `using(true)` + `GRANT SELECT TO anon`. Writes only via service role (bypasses RLS). Realtime enabled on graph_signals, edges, companies. Seeds 7 default discovery sources (USPTO, SAM.gov, USASpending, SBIR, TechCrunch, Defense One, arXiv).

> Collision note: `technologies` and `products` are re-created with **TEXT pks** by 20260308 migrations using `IF NOT EXISTS` — whichever migration ran first wins; the other is a silent no-op.

### 20260304_swarm_memory.sql / 20260304_swarm_learning.sql — agent swarm

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `swarm_memory` | Shared agent findings blackboard | id uuid pk, agent_name, entry_type CHECK in (finding/entity/signal/risk/trend/recommendation), topic, content jsonb, confidence real 0–1, tags text[], expires_at ts default now()+7d, read_by text[] | entry_type + confidence CHECKs | topic; agent; type; created desc; confidence desc; partial expires |
| `swarm_learning` | Peer ratings of findings | id uuid pk, memory_entry_id fk→swarm_memory (cascade), rated_by_agent, rating CHECK in (useful/noise/critical), context | rating CHECK | entry; agent; rating |

RLS: **`for all using(true) with check(true)` with no role restriction** — applies to every role (effectively open CRUD to anon/authenticated if default grants exist). View: `swarm_agent_reliability` (per-agent score = (useful+critical)/total, 0.5 default). Functions: `swarm_memory_mark_read(entry_id, reader)`, `swarm_memory_cleanup()` (deletes expired, returns count). Realtime on swarm_memory.

### 20260308_dynamic_industries.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `dynamic_industries` | Auto-discovered industry tree | id uuid pk, slug unique, label, parent_slug fk→self(slug) set null, color, description, signal/product/source counts int, last_scanned_at, scan_quality CHECK (pass/warning/fail), executive_summary, is_core bool, popularity int, review_status (added 20260309, CHECK pending/approved/rejected) | slug UNIQUE | popularity desc; last_scanned desc; parent |

RLS: anon SELECT true; service_role ALL. Seeds the 8 core industries (ai-ml, cybersecurity, defense, border-tech, manufacturing, energy, healthcare, logistics).

### 20260308_intel_persistence.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `intel_signals` | Persisted intelligence discoveries | **id TEXT pk**, signal_type, industry default 'general', title, url, source, evidence, company, amount_usd float, confidence float, importance_score float, tags text[], discovered_at ts; + `vendor_id` TEXT and `problem_category` (added 20260401_connect_signals_vendors) | — | type; industry; importance desc; discovered desc; partial vendor_id; partial problem_category |
| `daily_briefings` | Auto-generated daily summaries | id uuid pk, briefing_date date UNIQUE, title, summary, sections jsonb, signal_count int, top_industries text[], top_signal_types text[], highlights jsonb, generated_at | date UNIQUE | date desc |

RLS: anon SELECT true; service_role ALL — on both.

### 20260308_intelligence_tables.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `feed_items` | Persisted RSS articles | id uuid pk, title, link UNIQUE, source, source_id, pub_date, description, vendor, score smallint, sentiment CHECK (positive/negative/neutral), category, source_tier smallint | link UNIQUE | pub_date desc; category; source |
| `signals` | Detected signals | id uuid pk, title, description, sector, severity CHECK (critical/high/moderate/low), signal_type, source_count int, article_ids uuid[], vendor_ids text[], detected_at, expires_at default +7d | severity CHECK | detected desc; sector |
| `agent_runs` | Agent execution log | id uuid pk, agent_name, status CHECK (running/success/failed), started/finished ts, items_processed/created int, error_message, metadata jsonb | status CHECK | (agent_name, started desc) |
| `opportunities` | SAM.gov solicitations | id uuid pk, notice_id UNIQUE, title, description, agency, posted_date, response_deadline, naics_code, set_aside, estimated_value numeric, matched_vendor_ids text[], matched_sectors text[], link | notice_id UNIQUE | deadline desc; naics |
| `sector_scores` | Daily sector health snapshots | id uuid pk, sector, score int, trend CHECK (rising/stable/falling), article_count, contract_count, top_vendor, top_headline, scored_at | trend CHECK | scored desc; (sector, scored desc) |

RLS initially: anon SELECT true + service_role ALL on all five (later reshaped by 20260323_rls_policies — see below). Function: `cleanup_old_feed_items()` — deletes feed_items >30d, expired signals, agent_runs >90d (intended for pg_cron).

### 20260308_knowledge_graph.sql (+ 20260309_extend_graph.sql)

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `entities` | Canonical KG nodes | id uuid pk, entity_type CHECK (13 types after extension: industry/company/product/technology/problem/signal/event/location/force/trajectory/opportunity/discovery/policy), name, slug UNIQUE, description, metadata jsonb, aliases jsonb (20260309), last_seen_at (20260309) | slug UNIQUE; type CHECK | type; slug; GIN fts(name); (type, created desc); GIN metadata; GIN aliases; last_seen desc |
| `entity_relationships` | Directed KG edges | id uuid pk, source/target_entity_id fk→entities (cascade), relationship_type CHECK (17 types after extension), confidence numeric(4,3) 0–1, source_attribution, evidence_count int (20260309), last_seen_at (20260309) | UNIQUE(source,target,type); CHECK no self-loop; confidence 0–1 | source; target; type; (source,type); confidence desc; last_seen desc |
| `signal_entity_links` (20260309) | Links intel_signals (TEXT ids) to KG entities | id uuid pk, signal_id TEXT, entity_id fk→entities (cascade), role text, confidence real | UNIQUE(signal_id, entity_id, role) | signal; entity |

RLS: anon SELECT true; service_role ALL; GRANT SELECT to anon. Realtime on entities + entity_relationships.

### 20260308_products_table.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `products` (TEXT version) | Living solutions catalog | **id TEXT pk**, product_name, company, company_url, industry default 'general', category, technology, product_type, description, use_cases/benefits text[], price_range, region_available, maturity, confidence float, source, source_url, related_tech_ids text[], tags text[] | Later (20260326): confidence 0–1 CHECK; name length 2–200 CHECK; unique lower(name)+lower(company) index | industry; category; company; type; discovered desc |
| `conference_intel` | Extracted conference intelligence | id TEXT pk, conference_id, conference_name, company_name, role, signal_type, title, description, industry, technology_cluster, importance_score float, source_url, event_date date | — | conference; company; industry; discovered desc |

RLS: anon SELECT true; service_role ALL — on both.

### 20260308_static_data_tables.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `conferences` | 1,772+ industry events | id TEXT pk, name, category, location, city, country, lat/lon float, month, start/end_date date, website, description, estimated_exhibitors int, relevance_score int, sector_tags text[] | — | category; relevance desc |
| `technologies` (TEXT version) | 50+ tracked tech domains | id TEXT pk, name, category, description, maturity_level CHECK (emerging/growing/mature), related_vendor_count, el_paso_relevance CHECK (high/medium/low), govt_budget_fy25m numeric, procurement_keywords text[] | CHECKs above | category |
| `vendors` (legacy TEXT version) | Vendor directory + map/IKER fields | id TEXT pk, company_name, company_url, description, primary_category, lat/lon, iker_score int, sector, tags/evidence text[], weight/confidence float, layer, extraction_confidence, status default 'active' | Later (20260326): iker_score 0–100 CHECK; unique lower(coalesce(company_name,name,'')) index | category; iker desc |

RLS: conferences + technologies anon SELECT true / service_role ALL. Vendors RLS defined in 20260323_rls_policies (below).

### 20260310_ml_brain_tables.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `ml_patterns` | Persistent learned patterns (key-value) | pattern_key TEXT pk ('agent:metric:slug'), pattern_data jsonb, agent, version int | — | agent; updated desc |
| `prediction_outcomes` | IKER prediction ground truth | id uuid pk, entity_id TEXT, entity_name, prediction_type, predicted_score float, actual_score float, prediction_horizon int default 180, predicted_at, measured_at, outcome_measured bool, error float, context_data jsonb, agent | — | entity; type; partial unmeasured; predicted desc |
| `country_activity` | Country heat scores for global map | country_code TEXT pk (ISO-2), country_name, entity_count, signal_count_30d, signal_velocity float, funding_total_usd bigint, avg_iker_score, top_companies jsonb, top_signal_types jsonb, heat_score float 0–100, last_updated | — | heat desc; updated desc |

RLS (all 3): anon SELECT true; service_role ALL; explicit grants. Realtime on country_activity.

### 20260311_feed_dedup.sql

| Table | Purpose | Key columns |
|---|---|---|
| `feed_seen_urls` | URL dedup for feed ingestion | url_hash TEXT pk (md5), url, source_id, seen_at |

Index seen_at desc. RLS: service_role ALL; anon SELECT true. Function `cleanup_feed_seen_urls()` — deletes entries >90d.

### 20260312_feed_sources.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `feed_sources` | Registry of RSS/Atom sources | id TEXT pk, name, url, tier smallint 1–4, category, country, language, quality_score real 0–1, last_checked/last_success ts, consecutive_failures smallint, is_active bool, discovered_via, domain | tier + quality CHECKs | (tier,is_active,quality desc); (category,is_active); partial country; partial domain |

Trigger: `feed_sources_updated_at` BEFORE UPDATE → `update_feed_sources_updated_at()`. Function `record_feed_source_health(p_id, p_success)` — resets or increments failures, deactivates after 5 consecutive. RLS: service_role ALL; **anon SELECT only where `is_active = true`**.

### 20260313_knowledge_graph_tables.sql — structured relational KG

Geography: `continents` (id uuid pk, name/code UNIQUE, intelligence_report jsonb), `countries` (id uuid pk, continent_id fk, name, iso_code UNIQUE, lat/lon, gdp_usd bigint, innovation_score), `regions` (id uuid pk, country_id fk, name, lat/lon, type).

Core typed entities (all uuid pk, slug UNIQUE where present):
- `kg_industries` — name, slug, parent_industry_id fk→self, iker_score
- `kg_technologies` — maturity_stage CHECK (research…legacy), adoption_curve_position CHECK, radar_quadrant CHECK (adopt/trial/assess/explore), iker_score, signal_velocity, + generated `fts` tsvector column (GIN)
- `kg_companies` — country_id/region_id fks, company_type CHECK (enterprise/startup/research_lab/university/government/ngo), founded_year, employee_count_range, total_funding_usd, website, linkedin_url, iker_score, lat/lon, + generated `fts` (GIN)
- `kg_products` — company_id fk, product_type, price_range, deployment_complexity CHECK, adoption_level CHECK
- `kg_discoveries` — discovery_type CHECK (9 types), trl_level CHECK 1–9, country_id fk, iker_impact_score
- `kg_signals` — signal_type CHECK (10 types), priority CHECK (P0–P3), country_id fk, detected_at, is_active; index (priority, detected desc)
- `kg_events` — event_type CHECK (8 types), country_id fk, occurred_at
- `kg_policies` — policy_type CHECK (8 types), impact_level CHECK, country_id fk, announced_at

Junction tables (composite pks, cascade fks): `kg_company_technologies` (relationship CHECK develops/uses/researches/commercializes), `kg_company_industries`, `kg_technology_industries` (impact_level CHECK), `kg_product_technologies`, `kg_discovery_technologies` (relationship CHECK advances/enables/disrupts), `kg_signal_entities` (polymorphic entity_type + entity_id), `kg_country_industry_strengths` (strength_score 0–100 CHECK, rank_in_world).

Agent tables: `raw_feed_items` (id uuid pk, source, source_type CHECK, title, content, url UNIQUE, processed bool, extracted_entities jsonb; indexes processed+created, url), `source_trust_scores` (id uuid pk, source_name UNIQUE, trust_score 0–1 CHECK, total_articles_processed).

RLS on ALL of the above: anon SELECT true; service_role ALL; GRANT SELECT to anon. Realtime on kg_signals + raw_feed_items. Seeds: 6 continents, 20 industries, 20 technologies, 32 countries.

### 20260319_signal_connections.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `signal_connections` | Edges between two intel_signals | id uuid pk, signal_a_id/signal_b_id TEXT fk→intel_signals (cascade), connection_type CHECK (CAUSAL/TEMPORAL/ENTITY/GEOGRAPHIC/THEMATIC/CLUSTER), strength int 0–100, explanation, confirmed bool | CHECKs | a; b; type; strength desc |
| `signal_clusters` | Signal groups by theme/entity | id uuid pk, signal_ids uuid[], theme, entity, strength int 0–100 | strength CHECK | strength desc |

RLS: anon SELECT true; service_role ALL; explicit grants.

### 20260323_audit_log.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `audit_log` | Immutable append-only access log | id uuid pk, user_id text, action, resource_type, resource_id, metadata jsonb, ip_address inet, user_agent, created_at | Append-only via RULES `audit_log_no_update` / `audit_log_no_delete` (DO INSTEAD NOTHING) | (user_id, created desc); created desc; (resource_type, resource_id, created desc); (action, created desc) |

RLS: service_role INSERT + SELECT; authenticated SELECT where `is_admin()`; authenticated SELECT own rows (`user_id = jwt sub`); **no anon access; no UPDATE/DELETE policies**.
Trigger functions (SECURITY DEFINER): `log_vendor_access()` (AFTER INSERT/UPDATE on `vendors`), `log_signal_access()` (AFTER INSERT/UPDATE on `signals`), `log_kg_signal_access()` (AFTER INSERT/UPDATE on `kg_signals`) — each writes an audit_log row. Function `cleanup_audit_logs()` (SECURITY DEFINER, purges >90d; note: the no-delete RULE would still intercept this DELETE). View: `audit_summary_daily` (30-day aggregates).

### 20260323_insights.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `insights` | AI "so what / now what" per signal | id uuid pk, **signal_id UUID fk→intel_signals(id)**, meaning, actions text[], pattern, confidence int 0–100, related_signal_ids uuid[], user_id fk→auth.users, model_used, tokens_used, user_rating 1–5 CHECK, user_feedback, feedback_at | CHECKs | signal; partial pattern; generated desc; partial low rating |

> Defect: `intel_signals.id` is **TEXT**, so a `UUID REFERENCES intel_signals(id)` fk cannot be created — this migration fails as written. The read policy also references a `user_profiles` table that no migration creates.

RLS: SELECT — system insights (user_id null) readable by any authenticated; own insights by creator; admins via `user_profiles.role='admin'`. UPDATE — any authenticated (intended for feedback fields only, not enforced column-wise).
Triggers: `insights_updated_at` (touch), `insights_feedback_timestamp` (sets feedback_at when rating/feedback change). Functions (SECURITY DEFINER): `get_signal_insight(uuid)`, `get_pattern_insights(text)`. Views: `insight_patterns`, `insight_model_stats`.

### 20260323_rls_policies.sql — RLS hardening (tiered access)

Functions: `is_admin()` — JWT `app_metadata.role = 'admin'` (later **redefined** by 20260626 to use platform_users); `is_authenticated()`.

Policy reshape:
- `vendors` (legacy): anon SELECT only `status in (approved, active)`; authenticated SELECT all; authenticated ALL where is_admin(); service_role ALL.
- `signals`: anon SELECT moderate/low severity immediately, critical/high only after 7 days (free-tier delay); authenticated SELECT all; service_role ALL.
- `kg_signals`: anon SELECT P2/P3 immediately, P0/P1 delayed 7 days; authenticated SELECT all; service_role ALL.
- `technologies` and `kg_technologies`: anon + authenticated SELECT true; authenticated ALL where is_admin(); service_role ALL.
- `feed_items`: anon + authenticated SELECT true; service_role ALL.
- `agent_runs`: **anon SELECT removed**; authenticated SELECT true; service_role ALL.
- `opportunities`: anon + authenticated SELECT true; service_role ALL.
- GRANT USAGE on schema public to anon + authenticated.

### 20260325_assembly_layer.sql

| Table | Purpose | Key columns | Constraints | Indexes |
|---|---|---|---|---|
| `intel_clusters` | Signal groups forming a "story" | id uuid pk, title, summary, signal_ids text[], signal_count, companies/industries/locations/technologies text[], primary_type, strength 0–100 CHECK, first/last_signal ts, status CHECK (active/stale/archived) | CHECKs | strength desc; last_signal desc; status (plain CREATE INDEX — not idempotent) |
| `intel_trends` | Velocity/pattern detection | id uuid pk, name, trend_type CHECK (spike/growth/cooling/hotspot/chain/emergence), industry, location, company, signal_count, cluster_ids uuid[], velocity float, direction CHECK, confidence 0–100, window_start/end | CHECKs | type; velocity desc; created desc |
| `cluster_narratives` | AI briefing per cluster | id uuid pk, cluster_id fk→intel_clusters (cascade) UNIQUE, what_is_happening, why_it_matters, what_happens_next, actions text[], confidence, model_used, tokens_used | UNIQUE(cluster_id) | cluster |
| `cluster_recommendations` | Vendor/product/tech matches per cluster | id uuid pk, cluster_id fk (cascade), rec_type CHECK (vendor/product/technology), entity_id TEXT, entity_name, relevance 0–100, reason | CHECKs | cluster; type |

RLS: anon SELECT true; service_role ALL (plain CREATE POLICY — not idempotent). Views: `v_cluster_briefings`, `v_signal_velocity` (7d vs 28d baseline), `v_company_activity` (14d concentration). Trigger `trg_clusters_updated` → `update_updated_at()`.

### 20260326_best_sources.sql

| Table | Purpose | Key columns | Constraints |
|---|---|---|---|
| `best_sources` | Curated buy-recommendations per industry × need | id uuid pk, industry, technology_need, best_global_name/price/website/why, best_local_name/phone, best_value_name/price/why, avoid_what/why, buy_now bool | UNIQUE(industry, technology_need) |

RLS: `best_sources_public_read` SELECT USING(true) — **no role clause → all roles can read**. No insert/update policy (service role only). Seeds ~24 rows across restaurant / warehouse / construction / logistics / border_tech / window_cleaning.

### 20260326_solution_data_quality.sql
No new tables. Adds to `products`: confidence 0–1 CHECK, name-length CHECK, dedup delete, unique (lower(name), lower(company)) index; purges low-confidence/garbage rows. Adds to `vendors`: dedup delete by `name` (note: static-data vendors table has `company_name`, not `name` — assumes prod has both), unique lower(coalesce(company_name,name,'')) index, iker_score 0–100 CHECK + clamp update.

### 20260328_vendor_discovery_pipeline.sql

| Table | Purpose | Key columns | Indexes |
|---|---|---|---|
| `exhibitors` | Raw scraped conference exhibitors | id TEXT pk, conference_id, conference_name, raw_name, normalized_name, booth, category, description, profile_url, website, confidence numeric, source_url, scraped_at; + technologies text[] (20260401) | conference; name; confidence desc |
| `enriched_vendors` | AI-enriched vendor records | id TEXT pk, canonical_name, official_domain, description, products/technologies/industries/use_cases text[], country, vendor_type, employee_estimate, conference_sources text[], confidence | name; type; confidence desc; GIN industries; GIN technologies |
| `conference_scrape_runs` | Scrape run history | id uuid pk, conferences_scanned, pages_found, total_exhibitors, vendors_enriched, errors jsonb, duration_ms, phase, started/completed | — |

RLS: "Public read" SELECT USING(true) and "Service write" **FOR ALL USING(true) with no role clause** — effectively open read *and* write to any role on all three tables (weakest policies in the repo).

### 20260401_conference_vendor_links.sql

| Table | Purpose | Key columns | Constraints |
|---|---|---|---|
| `conference_vendor_links` | Conference ↔ vendor bridge | id uuid pk, conference_id, vendor_id, exhibitor_id, company_name, match_type, match_confidence real, technologies/signal_types text[] | UNIQUE(conference_id, company_name) |

Indexes: conference; vendor; company; confidence desc. RLS: public read USING(true); "Service write" FOR ALL USING(true) — same open pattern as above.

### 20260401_connect_signals_vendors.sql
No tables. Adds `intel_signals.vendor_id` TEXT + `intel_signals.problem_category` TEXT with partial indexes.

### 20260402_conference_leads.sql

| Table | Purpose | Key columns | Indexes |
|---|---|---|---|
| `conference_leads` | Scored logistics-relevant leads | id TEXT pk, vendor_id, canonical_name, logistics_score int, lead_tier default 'watch', logistics_category, products/technologies text[], official_domain, description, conference_appearances, conference_names text[], employee_estimate, country, el_paso_relevant bool, last_scored_at | score desc; tier; category; partial el_paso |

RLS: public read USING(true); service write FOR ALL USING(true) WITH CHECK(true) — no role clause (open).

### 20260402_decision_log.sql

| Table | Purpose | Key columns |
|---|---|---|
| `decision_log` | Decision-engine request/response log | id uuid pk, mode CHECK (top3/search), query, decisions jsonb, signal_count int |

Indexes: created desc; (mode, created desc). RLS: SELECT USING(true) (all roles); INSERT WITH CHECK(true) (all roles) — anyone can write log rows.

### 20260403_causal_maps.sql

| Table | Purpose | Key columns | Constraints |
|---|---|---|---|
| `causal_maps` | Problem → causes/effects/solutions knowledge | id uuid pk, problem UNIQUE, description, causes text[], effects jsonb [{label,severity,timeframe}], solutions text[], technologies text[], event_type, keywords text[], industries text[], regions text[], source, confidence real, active bool | problem UNIQUE |

Indexes: event_type; partial active; GIN keywords; GIN industries. RLS: SELECT / INSERT / UPDATE all USING/CHECK (true) — **no role clause: anon can insert and update**. Trigger `trg_causal_maps_updated` → `update_causal_maps_timestamp()`. Seeds 15 causal maps (tariffs, border delays, driver shortage, port congestion, etc.).

### 20260430_vendor_hunt_requests.sql

| Table | Purpose | Key columns |
|---|---|---|
| `vendor_hunt_requests` | Homepage vendor-hunt intake | id uuid pk, category, problem, timeline, email, source default 'homepage' |

Indexes: created desc; category. RLS: **service_role ALL only** — no anon/authenticated policy at all (inserts happen via server routes).

---

## 2. Era 2 — NXT//LINK Platform (20260625 – 20260705)

### 20260625_nxtlink_platform.sql — core platform (16 tables)

| Table | Purpose | Key columns / constraints |
|---|---|---|
| `platform_users` | Role/user registry | id uuid pk, auth_id uuid (→auth.users, unenforced), role CHECK (public/client/vendor/admin/super_admin) default 'client', email, full_name, company, locale CHECK (en/es), mfa_enabled bool |
| `client_requests` | Client intake requests | id uuid pk, public_ref UNIQUE ('REQ-xxxxxxxx'), client_id fk→platform_users, locale, structured intake (category, problem, quantity, location, deadline, urgency, budget_range, current_vendor), confidentiality flags (nda_required, mnda_required, share_summary/budget/documents, hide_identity, vendor_scope CHECK local/global/both), AI artefacts (intake_answers jsonb, ai_summary jsonb, missing_info jsonb, recommended_categories jsonb), status default 'request_received', pipeline_stage, contact_email/name, source. Indexes: status; created desc |
| `request_status_history` | Status transitions | id uuid pk, request_id fk cascade, from/to_status, changed_by, note |
| `request_files` | Private uploaded files | id uuid pk, request_id fk cascade, uploaded_by fk→platform_users, file_name/type, storage_path, visibility CHECK (private/admin_only/selected_vendors/selected_client), nda_required, approved_to_share |
| `quote_packets` | Admin-built anonymized opportunity packets | id uuid pk, opportunity_ref UNIQUE ('OPP-…'), request_id fk cascade, general_industry/location, problem_summary, scope, quantity, timeline, urgency, requirements jsonb, questions_for_vendor jsonb, files_approved jsonb, quote_deadline, hide_client_identity/hide_budget bool, status CHECK (draft/approved/sent/closed) |
| `vendor_opportunities` | Packet routed to a vendor | id uuid pk, packet_id fk cascade, vendor_id uuid, status CHECK (10 states: new_opportunity…expired), sent_at, viewed_at |
| `vendor_responses` | Vendor quote responses | id uuid pk, opportunity_id fk cascade, vendor_id, quote_type, price/labor/service/travel/parts fields (text), included/excluded, lead_time, warranty, payment_terms, expiration_date, next_info, questions, pdf_path, locale, status CHECK (draft/submitted/accepted/declined/expired), ai_generated bool, submitted_at |
| `quote_templates` | Vendor reusable quote templates | id uuid pk, vendor_id, name, category, pricing fields, attachments jsonb, spanish_version jsonb. Indexes: vendor; category |
| `saved_quotes` | Vendor saved quotes | id uuid pk, vendor_id, opportunity_ref, client_desc (anonymous), category, amount_text, status CHECK (…/template), attachments jsonb, body jsonb. Index: vendor |
| `visibility_permissions` | Identity-reveal approvals | id uuid pk, request_id fk cascade, vendor_id, reveal_client/reveal_vendor bool, approved_by |
| `proof_of_introduction` | Commission/introduction evidence | id uuid pk, opportunity_ref, request_id fk cascade, vendor_id, lifecycle timestamps (received/terms_accepted/quote_submitted/identity_revealed/client_selected), commission_terms_version, agreement_status, deal_status |
| `admin_notes` | Private admin notes per request | id uuid pk, request_id fk cascade, author, note, is_private bool |
| `ai_draft_logs` | Every AI draft | id uuid pk, ai_mode NOT NULL (CHECK extended 20260629 to intake/admin/vendor_quote/chatbot), user_id, request_id, vendor_id, prompt_input, draft_output jsonb, provider, approval_status CHECK (6 states), visibility_used jsonb, edited_at, sent_at. Indexes: mode; request |
| `platform_audit_log` | Platform action audit | id uuid pk, user_id, role, action NOT NULL, request/vendor/client ids, ip_address, before/after_status, notes. Indexes: action; created desc |
| `platform_notifications` | In-app notifications | id uuid pk, recipient_role, recipient_id, title, body, request_id, read bool |
| `site_content` | Bilingual editable site copy | id uuid pk, key UNIQUE, value_en/es, draft_en/es, published bool, updated_by |

RLS: enabled on all 16; each gets a `<table>_service_all` policy (service_role ALL). Only public-facing policy: `site_content_public_read` — anon + authenticated SELECT where `published = true`. All writes are server-side via service role.

### 20260626_nxtlink_rls_user.sql — per-user RLS

Functions (SECURITY DEFINER): `handle_new_auth_user()` — trigger `on_auth_user_created` AFTER INSERT ON **auth.users** auto-creates a platform_users row (role 'client'); `current_pu_id()`; `current_pu_role()`; `is_admin()` — **redefines** the 20260323 JWT-claim version to check `platform_users.role in ('admin','super_admin')`.

Policies added (all to `authenticated`):
- `client_requests`: owner (client_id = current_pu_id()) or admin — SELECT + ALL.
- `request_status_history`: SELECT if admin or owner of parent request.
- `quote_templates`, `saved_quotes`, `vendor_responses`: ALL where vendor_id = current_pu_id() or admin.
- `vendor_opportunities`: SELECT where vendor_id = current_pu_id() or admin.
- `platform_users`: SELECT own row (auth_id = auth.uid()) or admin.
- `admin_notes`, `ai_draft_logs`, `platform_audit_log`: SELECT admin-only.

### 20260629_vendor_signup_zoho.sql

| Table | Purpose | Key columns |
|---|---|---|
| `vendor_profiles` | Self-signup company profiles | id uuid pk, public_ref UNIQUE ('VEN-…'), auth_id, platform_user_id fk, company_name NOT NULL, contact_name, email, phone, website, city, locale CHECK, categories jsonb, service_areas jsonb, description, status CHECK (pending/approved/rejected/paused), source, admin_notes, zoho_contact_id/account_id; + industries jsonb, client_types jsonb (20260701b, GIN-indexed). Indexes: status; lower(email); created desc |
| `vendor_brochures` | Uploaded marketing files | id uuid pk, vendor_id fk cascade, file_name NOT NULL, file_type, size_bytes bigint, storage_path (bucket vendor-brochures), public_url, title. Index: vendor |
| `zoho_connections` | Zoho OAuth tokens (server-only) | id uuid pk, account_key UNIQUE default 'default', api_domain, account_id, from_address, access_token, refresh_token, expires_at, scopes, connected bool, connected_by |
| `zoho_outbox` | Email/meeting audit outbox | id uuid pk, kind CHECK (email/meeting), vendor_id fk set null, request_ref, to_address, subject, body, meeting_topic/start/url, status CHECK (draft/queued/sent/failed/scheduled), provider, error, zoho_id. Index: created desc |

RLS (all 4): service_role ALL only — **no anon/authenticated read at all** (tokens + contact info stay server-side). Trigger `trg_touch_vendor_profile` → `touch_vendor_profile()` keeps updated_at fresh. Also extends `ai_draft_logs.ai_mode` CHECK with 'chatbot'.

### 20260701_vendor_videos.sql

| Table | Purpose | Key columns |
|---|---|---|
| `vendor_videos` | Profile showcase video links | id uuid pk, vendor_id fk→vendor_profiles cascade, title, url NOT NULL, embed_url, provider (youtube/vimeo/other), position int |

Index: vendor. RLS: service_role ALL only.

### 20260701b_vendor_industry_clients.sql
No tables — adds `vendor_profiles.industries` + `client_types` jsonb with GIN indexes.

### 20260702_vendor_applications_private_intake.sql — **NOT YET APPLIED**

| Table | Purpose | Key columns |
|---|---|---|
| `vendor_applications` | Private vendor intake (catalog never public) | id uuid pk, public_ref UNIQUE ('APP-…'), company_name NOT NULL, contact_name, email NOT NULL, phone, category NOT NULL CHECK (TMS/WMS/Telematics-ELD/Forklifts/Customs-Cross-Border/Cold Chain/Robotics/Other), problem_solved, target_customer, price_range, logo_path, product_image_paths jsonb (≤3), status CHECK (pending/approved/rejected), admin_notes, approved_at; later columns: auth_id uuid (20260702b, partial UNIQUE), offering_types + supply_chain_stages jsonb GIN (20260703), company_size + region text (20260704) |

Indexes: status; category; created desc. Trigger `trg_touch_vendor_application` → `touch_vendor_application()`.

RLS (the business-critical part):
- INSERT: originally anon+authenticated `with check(true)`; **replaced by 20260702b** with `vendor_applications_anon_insert` (anon: auth_id must be NULL) and `vendor_applications_authenticated_insert` (auth_id NULL or = auth.uid()).
- SELECT: admin only (`is_admin()`); + owner (`auth_id = auth.uid()`) after 20260702b.
- UPDATE: admin only; + owner after 20260702b.
- DELETE: admin only.
- service_role: ALL.
- No public read path exists — a submitter without an account cannot read back even their own application.

Defense-in-depth trigger (20260702b): `trg_guard_vendor_application_update` → `guard_vendor_application_update()` (SECURITY DEFINER) — for non-admins, silently reverts any change to `status`, `admin_notes`, `approved_at`, `auth_id`, even via direct REST calls.

### 20260702b / 20260703 / 20260704 — dependent on unapplied 20260702
- **20260702b** (vendor accounts): auth_id column, insert tightening, owner select/update policies, guard trigger (all described above).
- **20260703** (taxonomy): `offering_types`, `supply_chain_stages` jsonb + GIN indexes. Fixed lists deliberately NOT enforced at DB level ("Other" free text allowed).
- **20260704** (size/region): `company_size`, `region` text. Same dropdown+Other pattern; no DB-level enforcement.

### 20260705_quotes_deals_private_comparison.sql — **NOT YET APPLIED**

| Table | Purpose | Key columns / constraints |
|---|---|---|
| `vendors` (new uuid link table) | Marks an approved application as a live account | id uuid pk, application_id uuid NOT NULL UNIQUE fk→vendor_applications (restrict), auth_id uuid NOT NULL UNIQUE, status CHECK (active/paused). Index: auth_id |
| `deals` | Admin-created opportunity (no client PII by design) | id uuid pk, public_ref UNIQUE ('DEAL-…'), title NOT NULL, brief (vendor-safe), category, admin_notes (admin-only), status CHECK (open/comparing/shared/closed). Index: status |
| `deal_invites` | Which vendors may quote a deal | id uuid pk, deal_id fk cascade, vendor_id fk cascade, invited_at; UNIQUE(deal_id, vendor_id). Indexes: vendor; deal |
| `quotes` | Vendor's structured quote | id uuid pk, deal_id fk cascade, vendor_id fk cascade, status CHECK (draft/submitted), line_items jsonb, total_price numeric, timeline, terms, notes, selected_for_client bool (admin curation flag), submitted_at; UNIQUE(deal_id, vendor_id). Indexes: deal; vendor |
| `deal_shares` | Immutable tokenized snapshot sent to client | id uuid pk, deal_id fk cascade, token UNIQUE NOT NULL (server-generated), quote_ids jsonb snapshot, expires_at. Index: token |
| `leads` | Client preference / general CRM lead | id uuid pk, name, email, company, source CHECK (quote_preference/chatbot/contact_form/manual/vendor_signup), status CHECK (new→closed_won/lost), notes, deal_share_id fk set null, quote_id fk set null. Indexes: status; deal_share |

Functions/triggers: `promote_approved_vendor_application()` — AFTER UPDATE trigger on vendor_applications auto-creates/reactivates a `vendors` row when status flips to approved (and auth_id set); `is_active_vendor()`, `current_vendor_id()` (SECURITY DEFINER helpers); touch triggers on deals/quotes/leads; `guard_quote_update()` — BEFORE UPDATE trigger stopping non-admins from setting `selected_for_client`.

RLS (all 6 tables enabled):
- `vendors`: authenticated SELECT/UPDATE own row (auth_id = auth.uid()) or admin; service_role ALL. No public policy.
- `deals`: admin-only ALL (authenticated + is_admin()); service_role ALL. No vendor or public policy — vendors learn of deals only via their invite rows.
- `deal_invites`: vendor SELECT own rows (vendor_id = current_vendor_id()) or admin; admin ALL; service_role ALL. A vendor never sees who else was invited.
- `quotes`: vendor SELECT/INSERT/UPDATE own quotes (vendor_id = current_vendor_id()) or admin; service_role ALL. No cross-vendor visibility, ever.
- `deal_shares`: admin ALL; service_role ALL. The client token path is resolved **only** by a server route with the service role — no anon policy exists.
- `leads`: admin ALL; service_role ALL. Client preference inserts go through the tokenized server route (no direct anon insert).

> Conflict risk: `create table if not exists public.vendors` will **no-op** against the legacy TEXT-pk `vendors` table from 20260308_static_data_tables.sql if both live in the same database — the uuid fks in deal_invites/quotes would then fail to create. Must be reconciled before applying.

---

## 3. Storage buckets

| Bucket | Migration | Public? | Access rules |
|---|---|---|---|
| `vendor-brochures` | 20260629 | private | No storage.objects policies defined — reads/writes via service role + signed URLs only |
| `vendor-logos` | 20260702 (not yet applied) | private | INSERT: anon + authenticated (`bucket_id='vendor-logos'`); SELECT: authenticated where `is_admin()`; no list/read for the public — admin-gated server routes serve signed URLs |
| `vendor-product-images` | 20260702 (not yet applied) | private | Same as vendor-logos |

---

## 4. Functions, triggers, views (consolidated)

**Functions**
- `swarm_memory_mark_read(uuid, text)`, `swarm_memory_cleanup()` (20260304)
- `cleanup_old_feed_items()` (20260308), `cleanup_feed_seen_urls()` (20260311), `cleanup_audit_logs()` (20260323)
- `update_feed_sources_updated_at()`, `record_feed_source_health(text, boolean)` (20260312)
- `is_admin()` — defined twice: JWT-claim version (20260323), replaced by platform_users-role version (20260626); `is_authenticated()` (20260323)
- `log_vendor_access()`, `log_signal_access()`, `log_kg_signal_access()` (20260323, SECURITY DEFINER)
- `update_insights_updated_at()`, `set_feedback_timestamp()`, `get_signal_insight(uuid)`, `get_pattern_insights(text)` (20260323_insights)
- `update_updated_at()` (20260325), `update_causal_maps_timestamp()` (20260403)
- `handle_new_auth_user()`, `current_pu_id()`, `current_pu_role()` (20260626, SECURITY DEFINER)
- `touch_vendor_profile()` (20260629), `touch_vendor_application()` (20260702), `guard_vendor_application_update()` (20260702b, SECURITY DEFINER)
- `promote_approved_vendor_application()`, `is_active_vendor()`, `current_vendor_id()`, `touch_deal()`, `touch_quote()`, `touch_lead()`, `guard_quote_update()` (20260705, guard/promote are SECURITY DEFINER)

**Triggers**
- `feed_sources_updated_at` (BEFORE UPDATE feed_sources)
- `trg_audit_vendor_insert/update` (AFTER on vendors), `trg_audit_signal_insert/update` (signals), `trg_audit_kg_signal_insert/update` (kg_signals)
- `insights_updated_at`, `insights_feedback_timestamp` (BEFORE UPDATE insights)
- `trg_clusters_updated` (intel_clusters), `trg_causal_maps_updated` (causal_maps)
- `on_auth_user_created` (AFTER INSERT auth.users)
- `trg_touch_vendor_profile`, `trg_touch_vendor_application`, `trg_guard_vendor_application_update`
- `trg_promote_approved_vendor_application` (AFTER UPDATE vendor_applications), `trg_touch_deal`, `trg_touch_quote`, `trg_guard_quote_update`, `trg_touch_lead`

**Views**: `swarm_agent_reliability`, `audit_summary_daily`, `insight_patterns`, `insight_model_stats`, `v_cluster_briefings`, `v_signal_velocity`, `v_company_activity`.

**Rules**: `audit_log_no_update`, `audit_log_no_delete` (append-only audit_log).

---

## 5. Migrations marked "not yet applied"

Per git commit messages on `supabase/migrations/`:

| Migration | Commit | Marker |
|---|---|---|
| `20260702_vendor_applications_private_intake.sql` | 1e8c3b7 "Add vendor_applications schema + strict RLS + private storage **(not yet applied)**" | Explicit |
| `20260705_quotes_deals_private_comparison.sql` | e09c8a6 "Add private quote-comparison schema + RLS **(not yet applied)** … Migration only — awaiting confirmation" | Explicit |
| `20260702b_vendor_applications_auth.sql` | 12c359e | No explicit marker, but depends on unapplied 20260702 |
| `20260703_vendor_applications_taxonomy.sql` | d7e54d0 | Same — depends on 20260702 |
| `20260704_vendor_applications_size_region.sql` | 6d0cc85 | Same — depends on 20260702 |

Treat the whole `vendor_applications` / `vendors`-`deals`-`quotes` chain (20260702 → 20260705) as pending until 20260702 is confirmed applied.

---

## 6. Cross-cutting issues worth knowing

1. **Table-name collisions**: `technologies` and `products` are created twice (uuid vs TEXT pks, 20260304 vs 20260308) under `IF NOT EXISTS`; `vendors` exists as a legacy TEXT-pk directory table (20260308) and is re-declared as a uuid link table in unapplied 20260705 — the latter's fks will fail against the legacy table.
2. **`20260323_insights.sql` cannot apply as written**: `signal_id UUID REFERENCES intel_signals(id)` mismatches intel_signals' TEXT pk, and its RLS references a nonexistent `user_profiles` table.
3. **`is_admin()` redefined**: 20260323 (JWT app_metadata claim) vs 20260626 (platform_users.role). Last applied wins; every admin-gated policy in both eras rides on it.
4. **Policies with no role clause** (`FOR ALL USING(true)` applying to all roles, including anon): swarm_memory, swarm_learning, exhibitors, enriched_vendors, conference_scrape_runs, conference_vendor_links, conference_leads, decision_log (insert), causal_maps (insert/update). These are effectively world-writable at the RLS layer.
5. **Access philosophy split**: Era 1 = anon-readable intelligence data (with 7-day tiered delays on signals/kg_signals after 20260323); Era 2 = private-by-default (service-role writes, admin/owner-scoped reads, zero public read on vendor catalog, quotes, deals, Zoho tokens).
6. Non-idempotent statements in 20260325 (plain CREATE INDEX/POLICY) and 20260326_solution_data_quality (unconditional ADD CONSTRAINT) will error on re-run.
