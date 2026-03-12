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
