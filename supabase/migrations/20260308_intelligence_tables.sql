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
