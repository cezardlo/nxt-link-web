-- =============================================================================
-- NXT LINK — Knowledge Graph Structured Tables
-- Migration: 20260313_knowledge_graph_tables.sql
-- Idempotent: safe to re-run
--
-- Adds the full relational knowledge graph:
--   Geography: continents, countries, regions
--   Core: industries, technologies, companies, products, discoveries, events, policies
--   Relationships: 7 junction tables
--   Agent: raw_feed_items, source_trust_scores
--   Full-text search indexes
-- =============================================================================

-- ============================================================
-- GEOGRAPHY LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS public.continents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE, -- NA, SA, EU, AF, AS, OC
  intelligence_report jsonb,
  last_analyzed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  continent_id uuid REFERENCES public.continents(id),
  name text NOT NULL,
  iso_code text NOT NULL UNIQUE,
  latitude float,
  longitude float,
  gdp_usd bigint,
  innovation_score float, -- 0-100, computed by IKER
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id),
  name text NOT NULL,
  latitude float,
  longitude float,
  type text, -- city, metro, innovation_district, manufacturing_hub
  created_at timestamptz DEFAULT now()
);

-- RLS + grants for geography
ALTER TABLE public.continents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "anon_read_continents" ON public.continents FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_countries" ON public.countries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_regions" ON public.regions FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "service_all_continents" ON public.continents FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_countries" ON public.countries FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_regions" ON public.regions FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.continents TO anon;
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.regions TO anon;

-- ============================================================
-- CORE ENTITIES — Typed tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kg_industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  parent_industry_id uuid REFERENCES public.kg_industries(id),
  iker_score float,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_technologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  maturity_stage text CHECK (maturity_stage IN (
    'research', 'emerging', 'early_adoption', 'growth', 'mainstream', 'legacy'
  )),
  adoption_curve_position text CHECK (adoption_curve_position IN (
    'innovators', 'early_adopters', 'early_majority', 'late_majority', 'laggards'
  )),
  radar_quadrant text CHECK (radar_quadrant IN ('adopt', 'trial', 'assess', 'explore')),
  iker_score float,
  signal_velocity float, -- rate of mention increase
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  country_id uuid REFERENCES public.countries(id),
  region_id uuid REFERENCES public.regions(id),
  company_type text CHECK (company_type IN (
    'enterprise', 'startup', 'research_lab', 'university', 'government', 'ngo'
  )),
  founded_year int,
  employee_count_range text,
  total_funding_usd bigint,
  website text,
  linkedin_url text,
  iker_score float,
  latitude float,
  longitude float,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.kg_companies(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  product_type text, -- hardware, software, platform, service
  price_range text,
  deployment_complexity text CHECK (deployment_complexity IN ('low', 'medium', 'high')),
  adoption_level text CHECK (adoption_level IN ('niche', 'growing', 'mainstream')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  discovery_type text CHECK (discovery_type IN (
    'scientific', 'medical', 'technology', 'engineering',
    'materials', 'energy', 'space', 'biological', 'pharmaceutical'
  )),
  source_url text,
  source_name text,
  research_institution text,
  country_id uuid REFERENCES public.countries(id),
  trl_level int CHECK (trl_level BETWEEN 1 AND 9),
  published_at timestamptz,
  iker_impact_score float,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  signal_type text CHECK (signal_type IN (
    'breakthrough', 'investment', 'policy', 'disruption',
    'startup_formation', 'manufacturing_expansion', 'supply_chain_risk',
    'regulatory_change', 'geopolitical', 'research_acceleration'
  )),
  priority text CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  source_url text,
  source_name text,
  country_id uuid REFERENCES public.countries(id),
  detected_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type text CHECK (event_type IN (
    'conference', 'product_launch', 'acquisition', 'ipo',
    'funding_round', 'policy_change', 'discovery', 'disruption'
  )),
  description text,
  country_id uuid REFERENCES public.countries(id),
  occurred_at timestamptz,
  source_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kg_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  country_id uuid REFERENCES public.countries(id),
  policy_type text CHECK (policy_type IN (
    'regulation', 'subsidy', 'trade_restriction', 'innovation_program',
    'sanctions', 'environmental', 'data_privacy', 'ai_governance'
  )),
  impact_level text CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  announced_at timestamptz,
  source_url text,
  created_at timestamptz DEFAULT now()
);

-- RLS + grants for all core tables
ALTER TABLE public.kg_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "anon_read_kg_industries" ON public.kg_industries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_technologies" ON public.kg_technologies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_companies" ON public.kg_companies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_products" ON public.kg_products FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_discoveries" ON public.kg_discoveries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_signals" ON public.kg_signals FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_events" ON public.kg_events FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_policies" ON public.kg_policies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "service_all_kg_industries" ON public.kg_industries FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_technologies" ON public.kg_technologies FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_companies" ON public.kg_companies FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_products" ON public.kg_products FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_discoveries" ON public.kg_discoveries FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_signals" ON public.kg_signals FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_events" ON public.kg_events FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_policies" ON public.kg_policies FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.kg_industries TO anon;
GRANT SELECT ON public.kg_technologies TO anon;
GRANT SELECT ON public.kg_companies TO anon;
GRANT SELECT ON public.kg_products TO anon;
GRANT SELECT ON public.kg_discoveries TO anon;
GRANT SELECT ON public.kg_signals TO anon;
GRANT SELECT ON public.kg_events TO anon;
GRANT SELECT ON public.kg_policies TO anon;

-- ============================================================
-- KNOWLEDGE GRAPH RELATIONSHIPS (Junction Tables)
-- ============================================================

-- Companies ↔ Technologies
CREATE TABLE IF NOT EXISTS public.kg_company_technologies (
  company_id uuid REFERENCES public.kg_companies(id) ON DELETE CASCADE,
  technology_id uuid REFERENCES public.kg_technologies(id) ON DELETE CASCADE,
  relationship text CHECK (relationship IN ('develops', 'uses', 'researches', 'commercializes')),
  PRIMARY KEY (company_id, technology_id, relationship)
);

-- Companies ↔ Industries
CREATE TABLE IF NOT EXISTS public.kg_company_industries (
  company_id uuid REFERENCES public.kg_companies(id) ON DELETE CASCADE,
  industry_id uuid REFERENCES public.kg_industries(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, industry_id)
);

-- Technologies ↔ Industries
CREATE TABLE IF NOT EXISTS public.kg_technology_industries (
  technology_id uuid REFERENCES public.kg_technologies(id) ON DELETE CASCADE,
  industry_id uuid REFERENCES public.kg_industries(id) ON DELETE CASCADE,
  impact_level text CHECK (impact_level IN ('low', 'medium', 'high', 'transformative')),
  PRIMARY KEY (technology_id, industry_id)
);

-- Products ↔ Technologies
CREATE TABLE IF NOT EXISTS public.kg_product_technologies (
  product_id uuid REFERENCES public.kg_products(id) ON DELETE CASCADE,
  technology_id uuid REFERENCES public.kg_technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, technology_id)
);

-- Discoveries ↔ Technologies
CREATE TABLE IF NOT EXISTS public.kg_discovery_technologies (
  discovery_id uuid REFERENCES public.kg_discoveries(id) ON DELETE CASCADE,
  technology_id uuid REFERENCES public.kg_technologies(id) ON DELETE CASCADE,
  relationship text CHECK (relationship IN ('advances', 'enables', 'disrupts')),
  PRIMARY KEY (discovery_id, technology_id, relationship)
);

-- Signals ↔ any entity (polymorphic)
CREATE TABLE IF NOT EXISTS public.kg_signal_entities (
  signal_id uuid REFERENCES public.kg_signals(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'company', 'technology', 'industry', 'country'
  entity_id uuid NOT NULL,
  PRIMARY KEY (signal_id, entity_type, entity_id)
);

-- Countries ↔ Industries (dominance / strength)
CREATE TABLE IF NOT EXISTS public.kg_country_industry_strengths (
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE,
  industry_id uuid REFERENCES public.kg_industries(id) ON DELETE CASCADE,
  strength_score float CHECK (strength_score BETWEEN 0 AND 100),
  rank_in_world int,
  PRIMARY KEY (country_id, industry_id)
);

-- RLS + grants for junction tables
ALTER TABLE public.kg_company_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_company_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_technology_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_product_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_discovery_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_signal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_country_industry_strengths ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "anon_read_kg_ct" ON public.kg_company_technologies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_ci" ON public.kg_company_industries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_ti" ON public.kg_technology_industries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_pt" ON public.kg_product_technologies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_dt" ON public.kg_discovery_technologies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_se" ON public.kg_signal_entities FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_kg_cis" ON public.kg_country_industry_strengths FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "service_all_kg_ct" ON public.kg_company_technologies FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_ci" ON public.kg_company_industries FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_ti" ON public.kg_technology_industries FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_pt" ON public.kg_product_technologies FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_dt" ON public.kg_discovery_technologies FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_se" ON public.kg_signal_entities FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_kg_cis" ON public.kg_country_industry_strengths FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.kg_company_technologies TO anon;
GRANT SELECT ON public.kg_company_industries TO anon;
GRANT SELECT ON public.kg_technology_industries TO anon;
GRANT SELECT ON public.kg_product_technologies TO anon;
GRANT SELECT ON public.kg_discovery_technologies TO anon;
GRANT SELECT ON public.kg_signal_entities TO anon;
GRANT SELECT ON public.kg_country_industry_strengths TO anon;

-- ============================================================
-- RAW FEED ITEMS — Persistent feed storage with dedup
-- ============================================================

CREATE TABLE IF NOT EXISTS public.raw_feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_type text CHECK (source_type IN ('news', 'research', 'patent', 'startup', 'policy', 'social')),
  title text,
  content text,
  url text UNIQUE,
  published_at timestamptz,
  processed boolean DEFAULT false,
  extracted_entities jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.raw_feed_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_raw_feed" ON public.raw_feed_items FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_raw_feed" ON public.raw_feed_items FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.raw_feed_items TO anon;

CREATE INDEX IF NOT EXISTS idx_raw_feed_processed ON public.raw_feed_items(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_raw_feed_url ON public.raw_feed_items(url);

-- ============================================================
-- SOURCE TRUST SCORES — Track reliability of news sources
-- ============================================================

CREATE TABLE IF NOT EXISTS public.source_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL UNIQUE,
  trust_score float DEFAULT 0.5 CHECK (trust_score BETWEEN 0 AND 1),
  total_articles_processed int DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE public.source_trust_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_trust" ON public.source_trust_scores FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_all_trust" ON public.source_trust_scores FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.source_trust_scores TO anon;

-- ============================================================
-- FULL TEXT SEARCH INDEXES
-- ============================================================

ALTER TABLE public.kg_companies ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  ) STORED;

ALTER TABLE public.kg_technologies ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_kg_companies_fts ON public.kg_companies USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_kg_technologies_fts ON public.kg_technologies USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_kg_signals_priority ON public.kg_signals(priority, detected_at DESC);

-- ============================================================
-- REALTIME — Enable for live dashboards
-- ============================================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.kg_signals; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_feed_items; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED — Continents
-- ============================================================

INSERT INTO public.continents (name, code) VALUES
  ('North America', 'NA'),
  ('South America', 'SA'),
  ('Europe', 'EU'),
  ('Africa', 'AF'),
  ('Asia', 'AS'),
  ('Oceania', 'OC')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED — Core Industries
-- ============================================================

INSERT INTO public.kg_industries (name, slug) VALUES
  ('Manufacturing', 'manufacturing'),
  ('Healthcare', 'healthcare'),
  ('Agriculture', 'agriculture'),
  ('Energy', 'energy'),
  ('Logistics', 'logistics'),
  ('Defense', 'defense'),
  ('Semiconductors', 'semiconductors'),
  ('Finance', 'finance'),
  ('Automotive', 'automotive'),
  ('Construction', 'construction'),
  ('Artificial Intelligence', 'ai'),
  ('Cybersecurity', 'cybersecurity'),
  ('Space', 'space'),
  ('Biotechnology', 'biotechnology'),
  ('Telecommunications', 'telecommunications'),
  ('Mining', 'mining'),
  ('Aerospace', 'aerospace'),
  ('Robotics', 'robotics'),
  ('Climate Tech', 'climate-tech'),
  ('Quantum Computing', 'quantum-computing')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED — Core Technologies
-- ============================================================

INSERT INTO public.kg_technologies (name, slug, maturity_stage, radar_quadrant) VALUES
  ('Artificial Intelligence', 'ai', 'growth', 'adopt'),
  ('Robotics', 'robotics', 'early_adoption', 'trial'),
  ('Quantum Computing', 'quantum-computing', 'research', 'explore'),
  ('Gene Therapy', 'gene-therapy', 'emerging', 'assess'),
  ('Solid State Batteries', 'solid-state-batteries', 'emerging', 'assess'),
  ('Autonomous Vehicles', 'autonomous-vehicles', 'early_adoption', 'trial'),
  ('Digital Twins', 'digital-twins', 'early_adoption', 'trial'),
  ('Advanced Manufacturing', 'advanced-manufacturing', 'growth', 'adopt'),
  ('CRISPR', 'crispr', 'emerging', 'assess'),
  ('Small Modular Reactors', 'small-modular-reactors', 'research', 'explore'),
  ('Large Language Models', 'llm', 'growth', 'adopt'),
  ('Computer Vision', 'computer-vision', 'growth', 'adopt'),
  ('5G Networks', '5g', 'mainstream', 'adopt'),
  ('Edge Computing', 'edge-computing', 'early_adoption', 'trial'),
  ('Blockchain', 'blockchain', 'early_adoption', 'assess'),
  ('Nuclear Fusion', 'nuclear-fusion', 'research', 'explore'),
  ('Brain-Computer Interface', 'bci', 'research', 'explore'),
  ('Photonics', 'photonics', 'emerging', 'assess'),
  ('3D Printing', '3d-printing', 'growth', 'adopt'),
  ('Synthetic Biology', 'synthetic-biology', 'emerging', 'assess')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED — Key Countries (top 30 by tech output)
-- ============================================================

INSERT INTO public.countries (name, iso_code, continent_id, latitude, longitude) VALUES
  ('United States', 'US', (SELECT id FROM public.continents WHERE code='NA'), 39.8, -98.6),
  ('Canada', 'CA', (SELECT id FROM public.continents WHERE code='NA'), 56.1, -106.3),
  ('Mexico', 'MX', (SELECT id FROM public.continents WHERE code='NA'), 23.6, -102.5),
  ('Brazil', 'BR', (SELECT id FROM public.continents WHERE code='SA'), -14.2, -51.9),
  ('Argentina', 'AR', (SELECT id FROM public.continents WHERE code='SA'), -38.4, -63.6),
  ('Colombia', 'CO', (SELECT id FROM public.continents WHERE code='SA'), 4.6, -74.1),
  ('Chile', 'CL', (SELECT id FROM public.continents WHERE code='SA'), -35.7, -71.5),
  ('United Kingdom', 'GB', (SELECT id FROM public.continents WHERE code='EU'), 55.4, -3.4),
  ('Germany', 'DE', (SELECT id FROM public.continents WHERE code='EU'), 51.2, 10.5),
  ('France', 'FR', (SELECT id FROM public.continents WHERE code='EU'), 46.2, 2.2),
  ('Netherlands', 'NL', (SELECT id FROM public.continents WHERE code='EU'), 52.1, 5.3),
  ('Sweden', 'SE', (SELECT id FROM public.continents WHERE code='EU'), 60.1, 18.6),
  ('Switzerland', 'CH', (SELECT id FROM public.continents WHERE code='EU'), 46.8, 8.2),
  ('Italy', 'IT', (SELECT id FROM public.continents WHERE code='EU'), 41.9, 12.6),
  ('Spain', 'ES', (SELECT id FROM public.continents WHERE code='EU'), 40.5, -3.7),
  ('Poland', 'PL', (SELECT id FROM public.continents WHERE code='EU'), 51.9, 19.1),
  ('Finland', 'FI', (SELECT id FROM public.continents WHERE code='EU'), 61.9, 25.7),
  ('Israel', 'IL', (SELECT id FROM public.continents WHERE code='AS'), 31.0, 34.9),
  ('China', 'CN', (SELECT id FROM public.continents WHERE code='AS'), 35.9, 104.2),
  ('Japan', 'JP', (SELECT id FROM public.continents WHERE code='AS'), 36.2, 138.3),
  ('South Korea', 'KR', (SELECT id FROM public.continents WHERE code='AS'), 35.9, 127.8),
  ('Taiwan', 'TW', (SELECT id FROM public.continents WHERE code='AS'), 23.7, 121.0),
  ('India', 'IN', (SELECT id FROM public.continents WHERE code='AS'), 20.6, 78.9),
  ('Singapore', 'SG', (SELECT id FROM public.continents WHERE code='AS'), 1.4, 103.8),
  ('Australia', 'AU', (SELECT id FROM public.continents WHERE code='OC'), -25.3, 133.8),
  ('New Zealand', 'NZ', (SELECT id FROM public.continents WHERE code='OC'), -40.9, 174.9),
  ('Saudi Arabia', 'SA', (SELECT id FROM public.continents WHERE code='AS'), 23.9, 45.1),
  ('UAE', 'AE', (SELECT id FROM public.continents WHERE code='AS'), 23.4, 53.8),
  ('Nigeria', 'NG', (SELECT id FROM public.continents WHERE code='AF'), 9.1, 8.7),
  ('South Africa', 'ZA', (SELECT id FROM public.continents WHERE code='AF'), -30.6, 22.9),
  ('Kenya', 'KE', (SELECT id FROM public.continents WHERE code='AF'), -0.02, 37.9),
  ('Egypt', 'EG', (SELECT id FROM public.continents WHERE code='AF'), 26.8, 30.8)
ON CONFLICT (iso_code) DO NOTHING;
