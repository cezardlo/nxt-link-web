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
  CREATE POLICY "technologies_anon_select" ON technologies FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "technologies_service_all" ON technologies FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
