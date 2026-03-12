-- ═══════════════════════════════════════════════════════════════════════════════
-- NXT//LINK — Full Database Deploy
-- Paste this entire file into Supabase SQL Editor and click Run.
-- Safe to run multiple times (all CREATE TABLE uses IF NOT EXISTS).
-- Last generated: 2026-03-12
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Alert Rules ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword       TEXT NOT NULL,
  sector        TEXT,
  signal_types  TEXT[] NOT NULL DEFAULT '{}',
  min_importance REAL NOT NULL DEFAULT 0.5,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_alerts" ON alert_rules;
CREATE POLICY "service_role_all_alerts" ON alert_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_alerts" ON alert_rules;
CREATE POLICY "anon_read_alerts" ON alert_rules FOR SELECT TO anon USING (true);

-- ─── Alert Matches ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  signal_id     UUID,
  signal_title  TEXT NOT NULL,
  signal_type   TEXT,
  company       TEXT,
  industry      TEXT,
  importance    REAL,
  matched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  read          BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS alert_matches_rule_id ON alert_matches (rule_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS alert_matches_unread ON alert_matches (read, matched_at DESC) WHERE read = false;
ALTER TABLE alert_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_alert_matches" ON alert_matches;
CREATE POLICY "service_role_all_alert_matches" ON alert_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_alert_matches" ON alert_matches;
CREATE POLICY "anon_read_alert_matches" ON alert_matches FOR SELECT TO anon USING (true);

-- NXT LINK — Technology Intelligence Graph Schema
-- Migration: 20260304_graph_schema.sql
--
-- Adds 7 new tables for the full intelligence graph:
--   companies, technologies, products, patents,
--   graph_signals, edges, discovery_sources

-- ENUM TYPES
do $$ begin
  create type public.signal_type_enum as enum (
    'patent_filing','grant_award','product_launch','partnership',
    'hiring_spike','funding','expansion','merger'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.edge_relationship_enum as enum (
    'builds','develops','filed','partnered_with',
    'acquired','competes_with','supplies_to'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.discovery_source_type_enum as enum (
    'government','conference','directory','news','patent','research'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.discovery_source_status_enum as enum ('active','paused','error');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.technology_maturity_enum as enum ('emerging','growing','mature','declining');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.edge_entity_type_enum as enum ('company','technology','product','patent');
exception when duplicate_object then null;
end $$;

-- 1. COMPANIES
create table if not exists public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  website          text,
  location         text,
  industry         text,
  founded_year     integer,
  employee_count   integer,
  revenue_range    text,
  lat              numeric(9, 6),
  lon              numeric(9, 6),
  logo_url         text,
  source_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.companies enable row level security;
drop policy if exists "anon_read_companies" on public.companies;
create policy "anon_read_companies" on public.companies for select to anon using (true);
grant select on table public.companies to anon;
create index if not exists idx_companies_name on public.companies using gin(to_tsvector('english', name));
create index if not exists idx_companies_industry on public.companies(industry);
create index if not exists idx_companies_lat_lon on public.companies(lat, lon) where lat is not null and lon is not null;

-- 2. TECHNOLOGIES
create table if not exists public.technologies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  category          text,
  maturity_level    public.technology_maturity_enum not null default 'emerging',
  first_detected_at timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
alter table public.technologies enable row level security;
drop policy if exists "anon_read_technologies" on public.technologies;
create policy "anon_read_technologies" on public.technologies for select to anon using (true);
grant select on table public.technologies to anon;
create index if not exists idx_technologies_category on public.technologies(category);
create index if not exists idx_technologies_name_fts on public.technologies using gin(to_tsvector('english', name));

-- 3. GRAPH_PRODUCTS (renamed to avoid collision with existing products table)
create table if not exists public.graph_products (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  description   text,
  technology_id text,
  url           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.graph_products enable row level security;
drop policy if exists "anon_read_graph_products" on public.graph_products;
create policy "anon_read_graph_products" on public.graph_products for select to anon using (true);
grant select on table public.graph_products to anon;
create index if not exists idx_graph_products_company_id on public.graph_products(company_id);
create index if not exists idx_graph_products_technology_id on public.graph_products(technology_id) where technology_id is not null;

-- 4. PATENTS
create table if not exists public.patents (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  abstract            text,
  filing_date         date,
  patent_number       text,
  assignee_company_id uuid references public.companies(id) on delete set null,
  technology_ids      text[] default '{}',
  source_url          text,
  created_at          timestamptz not null default now()
);
alter table public.patents enable row level security;
drop policy if exists "anon_read_patents" on public.patents;
create policy "anon_read_patents" on public.patents for select to anon using (true);
grant select on table public.patents to anon;
create index if not exists idx_patents_assignee_company on public.patents(assignee_company_id) where assignee_company_id is not null;
create index if not exists idx_patents_filing_date on public.patents(filing_date desc) where filing_date is not null;
create index if not exists idx_patents_title_fts on public.patents using gin(to_tsvector('english', title));

-- 5. GRAPH_SIGNALS (named to avoid collision with existing signals table)
create table if not exists public.graph_signals (
  id            uuid primary key default gen_random_uuid(),
  type          public.signal_type_enum not null,
  title         text not null,
  description   text,
  company_id    uuid references public.companies(id) on delete set null,
  technology_id text,
  detected_at   timestamptz not null default now(),
  source_url    text,
  confidence    numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  created_at    timestamptz not null default now()
);
alter table public.graph_signals enable row level security;
drop policy if exists "anon_read_graph_signals" on public.graph_signals;
create policy "anon_read_graph_signals" on public.graph_signals for select to anon using (true);
grant select on table public.graph_signals to anon;
create index if not exists idx_graph_signals_type on public.graph_signals(type);
create index if not exists idx_graph_signals_company_id on public.graph_signals(company_id) where company_id is not null;
create index if not exists idx_graph_signals_detected_at on public.graph_signals(detected_at desc);

-- 6. EDGES (graph relationships)
create table if not exists public.edges (
  id            uuid primary key default gen_random_uuid(),
  source_type   public.edge_entity_type_enum not null,
  source_id     uuid not null,
  target_type   public.edge_entity_type_enum not null,
  target_id     uuid not null,
  relationship  public.edge_relationship_enum not null,
  confidence    numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  evidence_url  text,
  created_at    timestamptz not null default now(),
  unique (source_type, source_id, target_type, target_id, relationship)
);
alter table public.edges enable row level security;
drop policy if exists "anon_read_edges" on public.edges;
create policy "anon_read_edges" on public.edges for select to anon using (true);
grant select on table public.edges to anon;
create index if not exists idx_edges_source on public.edges(source_type, source_id);
create index if not exists idx_edges_target on public.edges(target_type, target_id);
create index if not exists idx_edges_relationship on public.edges(relationship);

-- 7. DISCOVERY_SOURCES
create table if not exists public.discovery_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            public.discovery_source_type_enum not null,
  url             text not null,
  last_crawled_at timestamptz,
  status          public.discovery_source_status_enum not null default 'active',
  cadence_hours   integer not null default 24 check (cadence_hours > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.discovery_sources enable row level security;
drop policy if exists "anon_read_discovery_sources" on public.discovery_sources;
create policy "anon_read_discovery_sources" on public.discovery_sources for select to anon using (true);
grant select on table public.discovery_sources to anon;
create index if not exists idx_discovery_sources_type on public.discovery_sources(type);
create index if not exists idx_discovery_sources_status on public.discovery_sources(status);

-- REALTIME subscriptions
do $$ begin alter publication supabase_realtime add table public.graph_signals; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.edges; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.companies; exception when duplicate_object then null; end $$;

-- SEED default discovery sources
insert into public.discovery_sources (name, type, url, cadence_hours, status)
select * from (values
  ('USPTO Patent Full-Text',       'patent'::public.discovery_source_type_enum,     'https://efts.uspto.gov/LATEST/search-fields',          24, 'active'::public.discovery_source_status_enum),
  ('SAM.gov Contract Awards',      'government'::public.discovery_source_type_enum, 'https://api.sam.gov/opportunities/v2/search',           6,  'active'::public.discovery_source_status_enum),
  ('USASpending Federal Awards',   'government'::public.discovery_source_type_enum, 'https://api.usaspending.gov/api/v2/awards/',            12, 'active'::public.discovery_source_status_enum),
  ('SBIR.gov Awards',              'government'::public.discovery_source_type_enum, 'https://api.sbir.gov/public/api/awards',                24, 'active'::public.discovery_source_status_enum),
  ('TechCrunch News',              'news'::public.discovery_source_type_enum,       'https://techcrunch.com/feed/',                          1,  'active'::public.discovery_source_status_enum),
  ('Defense One News',             'news'::public.discovery_source_type_enum,       'https://www.defenseone.com/rss/all/',                   1,  'active'::public.discovery_source_status_enum),
  ('arXiv cs.AI Research',         'research'::public.discovery_source_type_enum,   'https://export.arxiv.org/rss/cs.AI',                   24, 'active'::public.discovery_source_status_enum)
) as t(name, type, url, cadence_hours, status)
where not exists (select 1 from public.discovery_sources limit 1);
-- Swarm shared memory table — NXT//LINK platform
-- Migration: 20260304_swarm_memory.sql
--
-- All agents write findings here; other agents read and act on them.

create table if not exists public.swarm_memory (
  id           uuid primary key default gen_random_uuid(),
  agent_name   text not null,
  entry_type   text not null check (entry_type in ('finding', 'entity', 'signal', 'risk', 'trend', 'recommendation')),
  topic        text not null,
  content      jsonb not null default '{}',
  confidence   real not null default 0.5 check (confidence >= 0 and confidence <= 1),
  tags         text[] default '{}',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  read_by      text[] default '{}'
);

alter table public.swarm_memory enable row level security;

drop policy if exists "service_role_full_access_swarm_memory" on public.swarm_memory;
create policy "service_role_full_access_swarm_memory"
  on public.swarm_memory for all
  using (true)
  with check (true);

create index if not exists idx_swarm_memory_topic      on public.swarm_memory(topic);
create index if not exists idx_swarm_memory_agent      on public.swarm_memory(agent_name);
create index if not exists idx_swarm_memory_type       on public.swarm_memory(entry_type);
create index if not exists idx_swarm_memory_created    on public.swarm_memory(created_at desc);
create index if not exists idx_swarm_memory_confidence on public.swarm_memory(confidence desc);
create index if not exists idx_swarm_memory_expires    on public.swarm_memory(expires_at) where expires_at is not null;

-- Helper function: mark a memory entry as read by an agent (idempotent)
create or replace function swarm_memory_mark_read(entry_id uuid, reader text)
returns void as $$
begin
  update public.swarm_memory
  set read_by = array_append(read_by, reader)
  where id = entry_id and not (reader = any(read_by));
end;
$$ language plpgsql;

-- Helper function: delete expired entries; returns count of deleted rows
create or replace function swarm_memory_cleanup()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from public.swarm_memory where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

-- Realtime: agents can subscribe to new findings from peers
do $$ begin
  alter publication supabase_realtime add table public.swarm_memory;
exception when duplicate_object then null;
end $$;

-- Swarm learning / feedback table — NXT//LINK platform
-- Migration: 20260304_swarm_learning.sql
-- Agents rate each other's findings to build per-agent reliability scores.

create table if not exists public.swarm_learning (
  id              uuid primary key default gen_random_uuid(),
  memory_entry_id uuid references public.swarm_memory(id) on delete cascade,
  rated_by_agent  text not null,
  rating          text not null check (rating in ('useful', 'noise', 'critical')),
  context         text,
  created_at      timestamptz not null default now()
);

alter table public.swarm_learning enable row level security;

drop policy if exists "service_role_full_access_swarm_learning" on public.swarm_learning;
create policy "service_role_full_access_swarm_learning"
  on public.swarm_learning for all
  using (true)
  with check (true);

create index if not exists idx_swarm_learning_entry  on public.swarm_learning(memory_entry_id);
create index if not exists idx_swarm_learning_agent  on public.swarm_learning(rated_by_agent);
create index if not exists idx_swarm_learning_rating on public.swarm_learning(rating);

-- View: per-agent reliability score
create or replace view public.swarm_agent_reliability as
select
  m.agent_name,
  count(l.id) as total_ratings,
  count(l.id) filter (where l.rating = 'useful')   as useful_count,
  count(l.id) filter (where l.rating = 'noise')    as noise_count,
  count(l.id) filter (where l.rating = 'critical') as critical_count,
  case
    when count(l.id) = 0 then 0.5
    else round(
      (count(l.id) filter (where l.rating in ('useful', 'critical'))::numeric /
       nullif(count(l.id), 0)::numeric), 3
    )
  end as reliability_score
from public.swarm_memory m
left join public.swarm_learning l on l.memory_entry_id = m.id
group by m.agent_name;

-- Dynamic Industries — auto-discovered from user exploration + signal clusters
-- Parent-child hierarchy enables industry tree navigation

CREATE TABLE IF NOT EXISTS dynamic_industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  parent_slug TEXT REFERENCES dynamic_industries(slug) ON DELETE SET NULL,
  color TEXT DEFAULT '#00d4ff',
  description TEXT,
  signal_count INT DEFAULT 0,
  product_count INT DEFAULT 0,
  source_count INT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  scan_quality TEXT CHECK (scan_quality IN ('pass', 'warning', 'fail')),
  executive_summary TEXT,
  is_core BOOLEAN DEFAULT FALSE,       -- true for the 8 hardcoded industries
  popularity INT DEFAULT 0,             -- how many times explored
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for homepage queries (most popular, recently active)
CREATE INDEX IF NOT EXISTS idx_dynamic_industries_popularity ON dynamic_industries(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_dynamic_industries_last_scanned ON dynamic_industries(last_scanned_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_dynamic_industries_parent ON dynamic_industries(parent_slug);

-- RLS
ALTER TABLE dynamic_industries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon can read dynamic_industries" ON dynamic_industries;
CREATE POLICY "anon can read dynamic_industries" ON dynamic_industries FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "service can manage dynamic_industries" ON dynamic_industries;
CREATE POLICY "service can manage dynamic_industries" ON dynamic_industries FOR ALL TO service_role USING (true);

-- Seed the 8 core industries
INSERT INTO dynamic_industries (slug, label, color, description, is_core, popularity) VALUES
  ('ai-ml', 'AI & Machine Learning', '#60a5fa', 'Artificial intelligence, deep learning, NLP, and automation platforms', TRUE, 100),
  ('cybersecurity', 'Cybersecurity', '#00d4ff', 'Network security, zero-trust architecture, threat intelligence', TRUE, 100),
  ('defense', 'Defense & Aerospace', '#ff6400', 'Military systems, defense contractors, aerospace technology', TRUE, 100),
  ('border-tech', 'Border Technology', '#f97316', 'Smart border solutions, trade facilitation, surveillance systems', TRUE, 100),
  ('manufacturing', 'Manufacturing', '#00d4ff', 'Smart manufacturing, robotics, additive manufacturing, CNC', TRUE, 100),
  ('energy', 'Energy & Water', '#ffd700', 'Renewable energy, grid modernization, water technology', TRUE, 100),
  ('healthcare', 'Healthcare', '#00ff88', 'Health tech, biotech, medical devices, telemedicine', TRUE, 100),
  ('logistics', 'Logistics & Supply Chain', '#ffb800', 'Warehousing, freight, last-mile delivery, supply chain software', TRUE, 100)
ON CONFLICT (slug) DO NOTHING;
-- Intel Signals — persisted intelligence discoveries (patents, funding, M&A, etc.)
CREATE TABLE IF NOT EXISTS intel_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  url TEXT,
  source TEXT,
  evidence TEXT,
  company TEXT,
  amount_usd DOUBLE PRECISION,
  confidence DOUBLE PRECISION DEFAULT 0.5,
  importance_score DOUBLE PRECISION DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  discovered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_signals_type ON intel_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_intel_signals_industry ON intel_signals(industry);
CREATE INDEX IF NOT EXISTS idx_intel_signals_importance ON intel_signals(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_discovered ON intel_signals(discovered_at DESC);

-- Daily Briefings — auto-generated intelligence summaries
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sections JSONB DEFAULT '[]',
  signal_count INT DEFAULT 0,
  top_industries TEXT[] DEFAULT '{}',
  top_signal_types TEXT[] DEFAULT '{}',
  highlights JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(briefing_date DESC);

-- RLS
ALTER TABLE intel_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read intel_signals" ON intel_signals;
CREATE POLICY "anon can read intel_signals" ON intel_signals FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "service can manage intel_signals" ON intel_signals;
CREATE POLICY "service can manage intel_signals" ON intel_signals FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "anon can read daily_briefings" ON daily_briefings;
CREATE POLICY "anon can read daily_briefings" ON daily_briefings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "service can manage daily_briefings" ON daily_briefings;
CREATE POLICY "service can manage daily_briefings" ON daily_briefings FOR ALL TO service_role USING (true);
-- =============================================================================
-- NXT LINK — Intelligence Platform Core Tables
-- Migration: 20260308_intelligence_tables.sql
-- Idempotent: safe to re-run
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. feed_items — persisted RSS articles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feed_items (
  id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT      NOT NULL,
  link        TEXT      NOT NULL UNIQUE,
  source      TEXT      NOT NULL,
  source_id   TEXT,
  pub_date    TIMESTAMPTZ,
  description TEXT,
  vendor      TEXT,
  score       SMALLINT  DEFAULT 0,
  sentiment   TEXT      DEFAULT 'neutral'
                CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  category    TEXT      DEFAULT 'General',
  source_tier SMALLINT  DEFAULT 4,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_items_pub_date ON feed_items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_feed_items_category ON feed_items(category);
CREATE INDEX IF NOT EXISTS idx_feed_items_source   ON feed_items(source);


-- ---------------------------------------------------------------------------
-- 2. signals — detected intelligence signals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signals (
  id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT      NOT NULL,
  description TEXT,
  sector      TEXT      NOT NULL,
  severity    TEXT      DEFAULT 'moderate'
                CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
  signal_type TEXT,
  source_count INT      DEFAULT 1,
  article_ids UUID[]    DEFAULT '{}',
  vendor_ids  TEXT[]    DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_signals_detected ON signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_sector   ON signals(sector);


-- ---------------------------------------------------------------------------
-- 3. agent_runs — log of every agent execution
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_runs (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name      TEXT    NOT NULL,
  status          TEXT    DEFAULT 'running'
                    CHECK (status IN ('running', 'success', 'failed')),
  started_at      TIMESTAMPTZ DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  items_processed INT     DEFAULT 0,
  items_created   INT     DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB   DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent
  ON agent_runs(agent_name, started_at DESC);


-- ---------------------------------------------------------------------------
-- 4. opportunities — SAM.gov solicitations matched to vendors
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id           TEXT    UNIQUE,
  title               TEXT    NOT NULL,
  description         TEXT,
  agency              TEXT,
  posted_date         TIMESTAMPTZ,
  response_deadline   TIMESTAMPTZ,
  naics_code          TEXT,
  set_aside           TEXT,
  estimated_value     NUMERIC,
  matched_vendor_ids  TEXT[]  DEFAULT '{}',
  matched_sectors     TEXT[]  DEFAULT '{}',
  link                TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_deadline
  ON opportunities(response_deadline DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_naics
  ON opportunities(naics_code);


-- ---------------------------------------------------------------------------
-- 5. sector_scores — daily snapshot of sector health
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sector_scores (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  sector         TEXT    NOT NULL,
  score          INT     NOT NULL,
  trend          TEXT    DEFAULT 'stable'
                   CHECK (trend IN ('rising', 'stable', 'falling')),
  article_count  INT     DEFAULT 0,
  contract_count INT     DEFAULT 0,
  top_vendor     TEXT,
  top_headline   TEXT,
  scored_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sector_scores_date
  ON sector_scores(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_sector_scores_sector
  ON sector_scores(sector, scored_at DESC);


-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE feed_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_scores ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- feed_items policies
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE POLICY "feed_items_anon_select"
    ON feed_items FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "feed_items_service_all"
    ON feed_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- signals policies
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE POLICY "signals_anon_select"
    ON signals FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signals_service_all"
    ON signals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- agent_runs policies
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE POLICY "agent_runs_anon_select"
    ON agent_runs FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "agent_runs_service_all"
    ON agent_runs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- opportunities policies
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE POLICY "opportunities_anon_select"
    ON opportunities FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "opportunities_service_all"
    ON opportunities FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- sector_scores policies
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE POLICY "sector_scores_anon_select"
    ON sector_scores FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sector_scores_service_all"
    ON sector_scores FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- Cleanup Function
-- Deletes feed_items older than 30 days, expired signals,
-- and agent_runs older than 90 days.
-- Schedule with pg_cron: SELECT cron.schedule('0 3 * * *', 'SELECT cleanup_old_feed_items()');
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_feed_items()
RETURNS void AS $$
BEGIN
  DELETE FROM feed_items  WHERE created_at  < now() - interval '30 days';
  DELETE FROM signals     WHERE expires_at  < now();
  DELETE FROM agent_runs  WHERE started_at  < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;
-- =============================================================================
-- NXT LINK — Knowledge Graph
-- Migration: 20260308_knowledge_graph.sql
-- Idempotent: safe to re-run
--
-- Two tables only. Power comes from connections, not categories.
--
--   entities             — canonical nodes (industry, company, product,
--                          technology, problem, signal, event, location)
--   entity_relationships — directed edges between nodes with confidence
--                          and source attribution
--
-- Relationship types: creates | uses | solves | belongs_to |
--                     related_to | occurs_in | influences
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. ENTITIES
-- Every real-world concept the platform tracks lives here once,
-- identified by a stable slug. Rich detail lives in metadata JSONB.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity classification
  entity_type TEXT        NOT NULL
                CHECK (entity_type IN (
                  'industry', 'company', 'product', 'technology',
                  'problem', 'signal', 'event', 'location'
                )),

  -- Human-readable identity
  name        TEXT        NOT NULL,

  -- URL-safe unique identifier — e.g. 'palantir-technologies', 'el-paso-tx'
  -- Slugs allow stable cross-table references without UUID coupling.
  slug        TEXT        NOT NULL UNIQUE,

  -- Optional prose description
  description TEXT,

  -- Flexible structured data per type.
  -- Examples:
  --   company   → { "website": "...", "founded": 2003, "employees": 3800 }
  --   location  → { "lat": 31.76, "lon": -106.48, "country": "US" }
  --   signal    → { "severity": "high", "source_url": "...", "detected_at": "..." }
  --   event     → { "start_date": "2026-04-10", "venue": "..." }
  metadata    JSONB       NOT NULL DEFAULT '{}',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Type lookups — most queries filter by entity_type first
CREATE INDEX IF NOT EXISTS idx_entities_type
  ON public.entities (entity_type);

-- Slug lookups — O(1) exact match for cross-system references
-- (UNIQUE constraint above already creates a btree index, this
--  explicit name makes it easy to reference in query plans)
CREATE INDEX IF NOT EXISTS idx_entities_slug
  ON public.entities (slug);

-- Full-text search on name — powers the global search bar
CREATE INDEX IF NOT EXISTS idx_entities_name_fts
  ON public.entities USING gin (to_tsvector('english', name));

-- Compound index for the most common list query: type + recency
CREATE INDEX IF NOT EXISTS idx_entities_type_created
  ON public.entities (entity_type, created_at DESC);

-- GIN index on metadata — supports jsonb containment queries like:
--   WHERE metadata @> '{"severity": "high"}'
CREATE INDEX IF NOT EXISTS idx_entities_metadata
  ON public.entities USING gin (metadata jsonb_path_ops);


-- ---------------------------------------------------------------------------
-- 2. ENTITY_RELATIONSHIPS
-- Directed edges. Read as: source → relationship_type → target
-- Example: Palantir (company) → uses → Foundry (product)
--          El Paso (location) → occurs_in → Border Surge (signal)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Directed edge endpoints
  source_entity_id  UUID        NOT NULL
                      REFERENCES public.entities (id) ON DELETE CASCADE,
  target_entity_id  UUID        NOT NULL
                      REFERENCES public.entities (id) ON DELETE CASCADE,

  -- Relationship semantics
  relationship_type TEXT        NOT NULL
                      CHECK (relationship_type IN (
                        'creates', 'uses', 'solves', 'belongs_to',
                        'related_to', 'occurs_in', 'influences'
                      )),

  -- How confident are we in this edge? 0.0 = guess, 1.0 = verified.
  -- Agents write lower scores; human-confirmed edges get 1.0.
  confidence        NUMERIC(4, 3) NOT NULL DEFAULT 0.5
                      CHECK (confidence >= 0 AND confidence <= 1),

  -- Where did this relationship come from?
  -- Free text: agent name, URL, human analyst, etc.
  source_attribution TEXT,

  -- No duplicate directed edges of the same type
  CONSTRAINT uq_entity_relationship
    UNIQUE (source_entity_id, target_entity_id, relationship_type),

  -- Self-loops are not meaningful in this graph
  CONSTRAINT chk_no_self_loop
    CHECK (source_entity_id <> target_entity_id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbound traversal — "what does this entity connect to?"
-- Used when rendering a node's connections in the graph view.
CREATE INDEX IF NOT EXISTS idx_er_source
  ON public.entity_relationships (source_entity_id);

-- Inbound traversal — "what points at this entity?"
-- Used for influence analysis and backlink counts.
CREATE INDEX IF NOT EXISTS idx_er_target
  ON public.entity_relationships (target_entity_id);

-- Relationship type filter — "show all 'uses' edges across the graph"
CREATE INDEX IF NOT EXISTS idx_er_relationship_type
  ON public.entity_relationships (relationship_type);

-- Compound for the common pattern: outbound edges of a specific type
--   WHERE source_entity_id = $1 AND relationship_type = 'uses'
CREATE INDEX IF NOT EXISTS idx_er_source_type
  ON public.entity_relationships (source_entity_id, relationship_type);

-- Confidence-ranked reads — surface highest-confidence edges first
CREATE INDEX IF NOT EXISTS idx_er_confidence
  ON public.entity_relationships (confidence DESC);


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.entities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships  ENABLE ROW LEVEL SECURITY;

-- anon: read-only
DO $$ BEGIN
  CREATE POLICY "entities_anon_select"
    ON public.entities
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "entity_relationships_anon_select"
    ON public.entity_relationships
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- service_role: full management (INSERT / UPDATE / DELETE from agents + cron)
DO $$ BEGIN
  CREATE POLICY "entities_service_all"
    ON public.entities
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "entity_relationships_service_all"
    ON public.entity_relationships
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Explicit grants (belt-and-suspenders alongside RLS)
GRANT SELECT ON public.entities             TO anon;
GRANT SELECT ON public.entity_relationships TO anon;


-- ---------------------------------------------------------------------------
-- REALTIME
-- Agents will write new entities and relationships live;
-- the graph view subscribes to stream updates in real time.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entities;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_relationships;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Products / Machines — living catalog of real solutions across all industries
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  company TEXT,
  company_url TEXT,
  industry TEXT NOT NULL DEFAULT 'general',
  category TEXT,
  technology TEXT,
  product_type TEXT DEFAULT 'product',
  description TEXT,
  use_cases TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  price_range TEXT,
  region_available TEXT,
  maturity TEXT DEFAULT 'emerging',
  confidence DOUBLE PRECISION DEFAULT 0.5,
  source TEXT,
  source_url TEXT,
  related_tech_ids TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  discovered_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_industry ON products(industry);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_discovered ON products(discovered_at DESC);

-- Conference intelligence — extracted companies, products, trends from conferences
CREATE TABLE IF NOT EXISTS conference_intel (
  id TEXT PRIMARY KEY,
  conference_id TEXT,
  conference_name TEXT NOT NULL,
  company_name TEXT,
  role TEXT,
  signal_type TEXT,
  title TEXT,
  description TEXT,
  industry TEXT,
  technology_cluster TEXT,
  importance_score DOUBLE PRECISION DEFAULT 0,
  source_url TEXT,
  event_date DATE,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conf_intel_conference ON conference_intel(conference_id);
CREATE INDEX IF NOT EXISTS idx_conf_intel_company ON conference_intel(company_name);
CREATE INDEX IF NOT EXISTS idx_conf_intel_industry ON conference_intel(industry);
CREATE INDEX IF NOT EXISTS idx_conf_intel_discovered ON conference_intel(discovered_at DESC);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_intel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read products" ON products;
CREATE POLICY "anon can read products" ON products FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "service can manage products" ON products;
CREATE POLICY "service can manage products" ON products FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "anon can read conference_intel" ON conference_intel;
CREATE POLICY "anon can read conference_intel" ON conference_intel FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "service can manage conference_intel" ON conference_intel;
CREATE POLICY "service can manage conference_intel" ON conference_intel FOR ALL TO service_role USING (true);
-- =============================================================================
-- NXT LINK — Static Data Tables (conferences, technologies, vendor extensions)
-- Migration: 20260308_static_data_tables.sql
-- Idempotent: safe to re-run
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. conferences — 1,772+ industry events with coordinates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conferences (
  id              TEXT      PRIMARY KEY,
  name            TEXT      NOT NULL,
  category        TEXT,
  location        TEXT,
  city            TEXT,
  country         TEXT,
  lat             DOUBLE PRECISION,
  lon             DOUBLE PRECISION,
  month           TEXT,
  start_date      DATE,
  end_date        DATE,
  website         TEXT,
  description     TEXT,
  estimated_exhibitors INT DEFAULT 0,
  relevance_score INT      DEFAULT 50,
  sector_tags     TEXT[]   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conferences_category ON conferences(category);
CREATE INDEX IF NOT EXISTS idx_conferences_relevance ON conferences(relevance_score DESC);


-- ---------------------------------------------------------------------------
-- 2. technologies — 50+ tracked technology domains
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS technologies (
  id                  TEXT      PRIMARY KEY,
  name                TEXT      NOT NULL,
  category            TEXT,
  description         TEXT,
  maturity_level      TEXT      DEFAULT 'emerging'
                        CHECK (maturity_level IN ('emerging', 'growing', 'mature')),
  related_vendor_count INT      DEFAULT 0,
  el_paso_relevance   TEXT      DEFAULT 'medium'
                        CHECK (el_paso_relevance IN ('high', 'medium', 'low')),
  govt_budget_fy25m   NUMERIC,
  procurement_keywords TEXT[]   DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technologies_category ON technologies(category);


-- ---------------------------------------------------------------------------
-- 3. vendors_extended — extend vendors with map/intelligence fields
-- ---------------------------------------------------------------------------

-- The base vendors table already exists from a previous migration.
-- Add columns needed for map rendering and IKER scoring.
DO $$ BEGIN
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iker_score INT;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sector TEXT;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS evidence TEXT[] DEFAULT '{}';
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION DEFAULT 0.5;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 0.5;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS layer TEXT DEFAULT 'vendors';
EXCEPTION WHEN undefined_table THEN
  -- vendors table doesn't exist yet — create it fresh
  CREATE TABLE vendors (
    id              TEXT      PRIMARY KEY,
    company_name    TEXT      NOT NULL,
    company_url     TEXT,
    description     TEXT,
    primary_category TEXT,
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    iker_score      INT,
    sector          TEXT,
    tags            TEXT[]    DEFAULT '{}',
    evidence        TEXT[]    DEFAULT '{}',
    weight          DOUBLE PRECISION DEFAULT 0.5,
    confidence      DOUBLE PRECISION DEFAULT 0.5,
    layer           TEXT      DEFAULT 'vendors',
    extraction_confidence DOUBLE PRECISION,
    status          TEXT      DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT now()
  );
END $$;

CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(primary_category);
CREATE INDEX IF NOT EXISTS idx_vendors_iker ON vendors(iker_score DESC);


-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE conferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "conferences_anon_select"  ON conferences  FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "conferences_service_all"  ON conferences  FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "technologies_anon_select" ON technologies;
CREATE POLICY "technologies_anon_select" ON technologies FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "technologies_service_all" ON technologies;
CREATE POLICY "technologies_service_all" ON technologies FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- =============================================================================
-- NXT LINK — Extend Knowledge Graph
-- Migration: 20260309_extend_graph.sql
-- Idempotent: safe to re-run
--
-- Changes:
--   1. Extend entity_type CHECK to add: force, trajectory, opportunity,
--      discovery, policy
--   2. Extend relationship_type CHECK to add: builds, funds, regulates,
--      competes_with, supplies, enables, depends_on, located_in,
--      accelerates, affects
--   3. Add aliases JSONB array to entities (alias handling for duplicates)
--   4. Add last_seen_at to entities and entity_relationships
--   5. Add evidence_count to entity_relationships
--   6. Create signal_entity_links table
--   7. Add review_status to dynamic_industries
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. EXTEND entity_type CHECK
-- Drop old constraint, add expanded one
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.entities DROP CONSTRAINT IF EXISTS entities_entity_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.entities
  ADD CONSTRAINT entities_entity_type_check
  CHECK (entity_type IN (
    'industry', 'company', 'product', 'technology',
    'problem', 'signal', 'event', 'location',
    'force', 'trajectory', 'opportunity', 'discovery', 'policy'
  ));


-- ---------------------------------------------------------------------------
-- 2. EXTEND relationship_type CHECK
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.entity_relationships DROP CONSTRAINT IF EXISTS entity_relationships_relationship_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.entity_relationships
  ADD CONSTRAINT entity_relationships_relationship_type_check
  CHECK (relationship_type IN (
    'creates', 'uses', 'solves', 'belongs_to',
    'related_to', 'occurs_in', 'influences',
    'builds', 'funds', 'regulates', 'competes_with',
    'supplies', 'enables', 'depends_on', 'located_in',
    'accelerates', 'affects'
  ));


-- ---------------------------------------------------------------------------
-- 3. ENTITY ALIASES — array of alternative names to prevent duplicates
-- Examples: ["IBM", "International Business Machines"]
--           ["AI chips", "AI semiconductors", "AI accelerators"]
-- ---------------------------------------------------------------------------

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]';

-- GIN index for containment queries: WHERE aliases @> '["IBM"]'
CREATE INDEX IF NOT EXISTS idx_entities_aliases
  ON public.entities USING gin (aliases jsonb_path_ops);


-- ---------------------------------------------------------------------------
-- 4. LAST_SEEN_AT — tracks freshness for both entities and relationships
-- ---------------------------------------------------------------------------

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.entity_relationships
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_entities_last_seen
  ON public.entities (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_er_last_seen
  ON public.entity_relationships (last_seen_at DESC);


-- ---------------------------------------------------------------------------
-- 5. EVIDENCE COUNT — how many signals/sources support this relationship
-- ---------------------------------------------------------------------------

ALTER TABLE public.entity_relationships
  ADD COLUMN IF NOT EXISTS evidence_count INTEGER NOT NULL DEFAULT 1;


-- ---------------------------------------------------------------------------
-- 6. SIGNAL_ENTITY_LINKS — connects intel_signals to knowledge graph entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.signal_entity_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   TEXT        NOT NULL,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL,   -- 'subject', 'object', 'location', 'technology', 'industry'
  confidence  REAL        DEFAULT 0.7,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sel_signal_id
  ON public.signal_entity_links (signal_id);
CREATE INDEX IF NOT EXISTS idx_sel_entity_id
  ON public.signal_entity_links (entity_id);

-- Prevent duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS idx_sel_unique_link
  ON public.signal_entity_links (signal_id, entity_id, role);

-- RLS
ALTER TABLE public.signal_entity_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sel_anon_select"
    ON public.signal_entity_links
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sel_service_all"
    ON public.signal_entity_links
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.signal_entity_links TO anon;


-- ---------------------------------------------------------------------------
-- 7. REVIEW STATUS for dynamic_industries
-- ---------------------------------------------------------------------------

ALTER TABLE public.dynamic_industries
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected'));
-- ─────────────────────────────────────────────────────────────────────────────
-- NXT//LINK ML Brain Tables — March 2026
-- Implements the 3 missing tables from NXT_LINK_ML_Engine.docx:
--   1. ml_patterns        — persistent learned patterns (survive restarts)
--   2. prediction_outcomes — IKER ground truth labels for self-improvement loop
--   3. country_activity   — live country heat scores for the global map
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ML_PATTERNS — Persistent Learning Store
-- Stores any key-value intelligence pattern the ML engine learns over time.
-- pattern_key format: '<agent>:<metric>:<entity_slug>'
-- e.g. 'iker:funding_weight:defense-tech', 'source:reliability:gao-reports'
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ml_patterns (
  pattern_key   text        not null primary key,
  pattern_data  jsonb       not null default '{}',
  agent         text        null,          -- which agent wrote this
  version       integer     not null default 1,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.ml_patterns enable row level security;

create policy "anon_read_ml_patterns"
  on public.ml_patterns for select to anon using (true);

create policy "service_write_ml_patterns"
  on public.ml_patterns for all to service_role using (true);

grant select on table public.ml_patterns to anon;
grant all    on table public.ml_patterns to service_role;

-- Index for agent-scoped queries
create index if not exists ml_patterns_agent_idx on public.ml_patterns(agent);
create index if not exists ml_patterns_updated_idx on public.ml_patterns(updated_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PREDICTION_OUTCOMES — IKER Self-Learning Ground Truth
-- Every IKER score prediction gets logged here.
-- When the outcome is measured (e.g. company raised Series B 180 days later),
-- the result is recorded and used to update model weights.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.prediction_outcomes (
  id                  uuid        not null default gen_random_uuid() primary key,
  entity_id           text        not null,   -- slug or entity UUID
  entity_name         text        null,
  prediction_type     text        not null,   -- 'funding', 'growth', 'legitimacy', 'acquisition', 'sector_heat'
  predicted_score     float       not null,   -- 0.0 – 1.0 or 0 – 100
  actual_score        float       null,       -- filled when outcome is measured
  prediction_horizon  integer     not null default 180,  -- days until outcome measured
  predicted_at        timestamptz not null default now(),
  measured_at         timestamptz null,
  outcome_measured    boolean     not null default false,
  error               float       null,       -- actual - predicted (filled on measurement)
  context_data        jsonb       null,       -- signals available at prediction time
  agent               text        null,       -- which agent made this prediction
  created_at          timestamptz not null default now()
);

alter table public.prediction_outcomes enable row level security;

create policy "anon_read_prediction_outcomes"
  on public.prediction_outcomes for select to anon using (true);

create policy "service_write_prediction_outcomes"
  on public.prediction_outcomes for all to service_role using (true);

grant select on table public.prediction_outcomes to anon;
grant all    on table public.prediction_outcomes to service_role;

-- Indexes for the learning loop queries
create index if not exists pred_outcomes_entity_idx     on public.prediction_outcomes(entity_id);
create index if not exists pred_outcomes_type_idx       on public.prediction_outcomes(prediction_type);
create index if not exists pred_outcomes_unmeasured_idx on public.prediction_outcomes(predicted_at)
  where outcome_measured = false;
create index if not exists pred_outcomes_predicted_at   on public.prediction_outcomes(predicted_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COUNTRY_ACTIVITY — Real-Time Country Heat Scores
-- Updated by the CountryActivityUpdater (Python) and the daily cron (TS).
-- Powers the global map country glow intensity.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.country_activity (
  country_code        text        not null primary key,  -- ISO 3166-1 alpha-2
  country_name        text        null,
  entity_count        integer     not null default 0,
  signal_count_30d    integer     not null default 0,
  signal_velocity     float       not null default 0,    -- signals per day (30d window)
  funding_total_usd   bigint      not null default 0,
  avg_iker_score      float       null,
  top_companies       jsonb       null,   -- [{name, iker_score}]
  top_signal_types    jsonb       null,   -- {contract_award: N, ...}
  heat_score          float       not null default 0,    -- 0–100 composite heat
  last_updated        timestamptz not null default now()
);

alter table public.country_activity enable row level security;

create policy "anon_read_country_activity"
  on public.country_activity for select to anon using (true);

create policy "service_write_country_activity"
  on public.country_activity for all to service_role using (true);

grant select on table public.country_activity to anon;
grant all    on table public.country_activity to service_role;

-- Index for heat score ordering
create index if not exists country_activity_heat_idx on public.country_activity(heat_score desc);
create index if not exists country_activity_updated_idx on public.country_activity(last_updated desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable realtime for live map updates
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.country_activity;
exception when duplicate_object then null;
end $$;
-- ─────────────────────────────────────────────────────────────────────────────
-- NXT//LINK Feed Deduplication Table — March 2026
-- Tracks URLs already ingested so the same article is never processed twice.
-- Feed agents check this table before persisting. Very cheap: just URL hashes.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.feed_seen_urls (
  url_hash    text        not null primary key,  -- md5(url) for compact storage
  url         text        not null,
  source_id   text        null,                   -- feed source ID
  seen_at     timestamptz not null default now()
);

-- Auto-expire old entries (keep 90 days, articles older than that can re-ingest)
create index if not exists feed_seen_urls_seen_at_idx on public.feed_seen_urls(seen_at desc);

alter table public.feed_seen_urls enable row level security;

create policy "service_all_feed_seen_urls"
  on public.feed_seen_urls for all to service_role using (true);

create policy "anon_read_feed_seen_urls"
  on public.feed_seen_urls for select to anon using (true);

grant select on table public.feed_seen_urls to anon;
grant all    on table public.feed_seen_urls to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup function: delete entries older than 90 days
-- Call via Supabase Edge Functions or pg_cron if available
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cleanup_feed_seen_urls()
returns void language plpgsql as $$
begin
  delete from public.feed_seen_urls
  where seen_at < now() - interval '90 days';
end;
$$;
-- Feed Sources Registry Table
-- Stores 1M+ quality-scored RSS/Atom feed sources
-- Replaces the hardcoded TypeScript registry for scalability

CREATE TABLE IF NOT EXISTS feed_sources (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  tier         SMALLINT NOT NULL DEFAULT 3 CHECK (tier BETWEEN 1 AND 4),
  category     TEXT NOT NULL DEFAULT 'General',
  country      TEXT,
  language     TEXT NOT NULL DEFAULT 'en',
  quality_score REAL NOT NULL DEFAULT 0.5 CHECK (quality_score BETWEEN 0 AND 1),
  -- Health tracking
  last_checked  TIMESTAMPTZ,
  last_success  TIMESTAMPTZ,
  consecutive_failures SMALLINT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  -- Discovery metadata
  discovered_via TEXT,   -- 'gdelt', 'google_news', 'manual', 'python_script'
  domain        TEXT,
  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active sources by tier (primary query pattern)
CREATE INDEX IF NOT EXISTS feed_sources_active_tier
  ON feed_sources (tier, is_active, quality_score DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS feed_sources_category
  ON feed_sources (category, is_active);

-- Index for country filtering
CREATE INDEX IF NOT EXISTS feed_sources_country
  ON feed_sources (country, is_active)
  WHERE country IS NOT NULL;

-- Index for domain dedup
CREATE INDEX IF NOT EXISTS feed_sources_domain
  ON feed_sources (domain)
  WHERE domain IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_feed_sources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER feed_sources_updated_at
  BEFORE UPDATE ON feed_sources
  FOR EACH ROW EXECUTE FUNCTION update_feed_sources_updated_at();

-- Function to mark source health after fetch attempt
CREATE OR REPLACE FUNCTION record_feed_source_health(
  p_id TEXT,
  p_success BOOLEAN
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_success THEN
    UPDATE feed_sources
    SET last_success = now(),
        last_checked = now(),
        consecutive_failures = 0
    WHERE id = p_id;
  ELSE
    UPDATE feed_sources
    SET last_checked = now(),
        consecutive_failures = consecutive_failures + 1,
        is_active = CASE WHEN consecutive_failures >= 5 THEN false ELSE is_active END
    WHERE id = p_id;
  END IF;
END;
$$;

-- RLS: service_role full access, anon can read active sources
ALTER TABLE feed_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_feed_sources"
  ON feed_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_active_feed_sources"
  ON feed_sources FOR SELECT TO anon USING (is_active = true);
