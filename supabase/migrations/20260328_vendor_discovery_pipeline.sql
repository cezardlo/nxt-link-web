-- Vendor Discovery Pipeline — exhibitor scraping + vendor enrichment tables
-- Supports the automated conference → exhibitor → vendor → marketplace flow

-- ── Exhibitors ──────────────────────────────────────────────────────────────────
-- Raw exhibitor names extracted from conference websites

CREATE TABLE IF NOT EXISTS exhibitors (
  id            TEXT PRIMARY KEY,
  conference_id TEXT NOT NULL,
  conference_name TEXT NOT NULL,
  raw_name      TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  booth         TEXT DEFAULT '',
  category      TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  profile_url   TEXT DEFAULT '',
  website       TEXT DEFAULT '',
  confidence    NUMERIC DEFAULT 0.5,
  source_url    TEXT DEFAULT '',
  scraped_at    TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exhibitors_conference ON exhibitors (conference_id);
CREATE INDEX IF NOT EXISTS idx_exhibitors_name ON exhibitors (normalized_name);
CREATE INDEX IF NOT EXISTS idx_exhibitors_confidence ON exhibitors (confidence DESC);

-- ── Enriched Vendors ────────────────────────────────────────────────────────────
-- Vendors enriched with website scraping + AI extraction

CREATE TABLE IF NOT EXISTS enriched_vendors (
  id                TEXT PRIMARY KEY,
  canonical_name    TEXT NOT NULL,
  official_domain   TEXT DEFAULT '',
  description       TEXT DEFAULT '',
  products          TEXT[] DEFAULT '{}',
  technologies      TEXT[] DEFAULT '{}',
  industries        TEXT[] DEFAULT '{}',
  country           TEXT DEFAULT '',
  vendor_type       TEXT DEFAULT 'unknown',
  use_cases         TEXT[] DEFAULT '{}',
  employee_estimate TEXT DEFAULT 'unknown',
  conference_sources TEXT[] DEFAULT '{}',
  confidence        NUMERIC DEFAULT 0.5,
  enriched_at       TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enriched_vendors_name ON enriched_vendors (canonical_name);
CREATE INDEX IF NOT EXISTS idx_enriched_vendors_type ON enriched_vendors (vendor_type);
CREATE INDEX IF NOT EXISTS idx_enriched_vendors_confidence ON enriched_vendors (confidence DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_vendors_industries ON enriched_vendors USING gin (industries);
CREATE INDEX IF NOT EXISTS idx_enriched_vendors_technologies ON enriched_vendors USING gin (technologies);

-- ── Conference Scrape Runs ──────────────────────────────────────────────────────
-- Track scrape execution history

CREATE TABLE IF NOT EXISTS conference_scrape_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conferences_scanned INT DEFAULT 0,
  pages_found         INT DEFAULT 0,
  total_exhibitors    INT DEFAULT 0,
  vendors_enriched    INT DEFAULT 0,
  errors              JSONB DEFAULT '[]',
  duration_ms         INT DEFAULT 0,
  phase               TEXT DEFAULT 'complete',
  started_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ DEFAULT now()
);

-- ── RLS Policies ────────────────────────────────────────────────────────────────

ALTER TABLE exhibitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE enriched_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read exhibitors" ON exhibitors FOR SELECT USING (true);
CREATE POLICY "Service write exhibitors" ON exhibitors FOR ALL USING (true);

CREATE POLICY "Public read enriched_vendors" ON enriched_vendors FOR SELECT USING (true);
CREATE POLICY "Service write enriched_vendors" ON enriched_vendors FOR ALL USING (true);

CREATE POLICY "Public read conference_scrape_runs" ON conference_scrape_runs FOR SELECT USING (true);
CREATE POLICY "Service write conference_scrape_runs" ON conference_scrape_runs FOR ALL USING (true);
