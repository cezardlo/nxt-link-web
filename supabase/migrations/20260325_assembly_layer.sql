-- ═══════════════════════════════════════════════════════════════════
-- ASSEMBLY LAYER — Clusters, Trends, Narratives, Recommendations
-- Bridges the gap between signal detection and intelligence output
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. INTEL CLUSTERS ─────────────────────────────────────────────
-- Groups of related signals that form a "story"
-- Updated by cron every 15 minutes

CREATE TABLE IF NOT EXISTS intel_clusters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,                          -- e.g. "Palantir El Paso Expansion"
  summary       TEXT,                                   -- AI-generated narrative (filled by Layer 3)
  signal_ids    TEXT[] NOT NULL DEFAULT '{}',            -- FK references to intel_signals.id
  signal_count  INT NOT NULL DEFAULT 0,
  companies     TEXT[] DEFAULT '{}',                     -- extracted company names
  industries    TEXT[] DEFAULT '{}',                     -- industries involved
  locations     TEXT[] DEFAULT '{}',                     -- geographic mentions
  technologies  TEXT[] DEFAULT '{}',                     -- tech keywords
  primary_type  TEXT,                                   -- dominant signal_type in cluster
  strength      INT DEFAULT 0 CHECK (strength BETWEEN 0 AND 100),
  first_signal  TIMESTAMPTZ,                            -- earliest signal in cluster
  last_signal   TIMESTAMPTZ,                            -- most recent signal in cluster
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'stale', 'archived')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clusters_strength ON intel_clusters (strength DESC);
CREATE INDEX idx_clusters_last_signal ON intel_clusters (last_signal DESC);
CREATE INDEX idx_clusters_status ON intel_clusters (status);

-- ─── 2. INTEL TRENDS ───────────────────────────────────────────────
-- Velocity and pattern detection across clusters and time windows
-- Updated by cron every 30 minutes

CREATE TABLE IF NOT EXISTS intel_trends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                        -- e.g. "Defense spending acceleration — El Paso"
  trend_type      TEXT NOT NULL CHECK (trend_type IN ('spike', 'growth', 'cooling', 'hotspot', 'chain', 'emergence')),
  industry        TEXT,
  location        TEXT,
  company         TEXT,
  signal_count    INT DEFAULT 0,                        -- signals contributing to this trend
  cluster_ids     UUID[] DEFAULT '{}',                  -- clusters that form this trend
  velocity        DOUBLE PRECISION DEFAULT 0,           -- ratio: current period / baseline
  direction       TEXT DEFAULT 'stable' CHECK (direction IN ('accelerating', 'stable', 'decelerating')),
  confidence      INT DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  window_start    TIMESTAMPTZ,                          -- analysis window start
  window_end      TIMESTAMPTZ,                          -- analysis window end
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trends_type ON intel_trends (trend_type);
CREATE INDEX idx_trends_velocity ON intel_trends (velocity DESC);
CREATE INDEX idx_trends_created ON intel_trends (created_at DESC);

-- ─── 3. CLUSTER NARRATIVES ─────────────────────────────────────────
-- AI-generated briefings per cluster (one AI call per cluster)
-- Generated after clustering, only for clusters with strength >= 40

CREATE TABLE IF NOT EXISTS cluster_narratives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id        UUID REFERENCES intel_clusters(id) ON DELETE CASCADE,
  what_is_happening TEXT NOT NULL,                      -- plain English summary
  why_it_matters    TEXT NOT NULL,                      -- significance
  what_happens_next TEXT NOT NULL,                      -- prediction
  actions           TEXT[] DEFAULT '{}',                 -- recommended actions
  confidence        INT DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  model_used        TEXT DEFAULT 'gemini-1.5-flash',
  tokens_used       INT,
  generated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cluster_id)
);

CREATE INDEX idx_narratives_cluster ON cluster_narratives (cluster_id);

-- ─── 4. CLUSTER RECOMMENDATIONS ────────────────────────────────────
-- Vendors, products, technologies matched to each cluster
-- Populated by SQL joins, no AI needed

CREATE TABLE IF NOT EXISTS cluster_recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id    UUID REFERENCES intel_clusters(id) ON DELETE CASCADE,
  rec_type      TEXT NOT NULL CHECK (rec_type IN ('vendor', 'product', 'technology')),
  entity_id     TEXT,                                   -- FK to vendors.id, products.id, etc.
  entity_name   TEXT NOT NULL,
  relevance     INT DEFAULT 50 CHECK (relevance BETWEEN 0 AND 100),
  reason        TEXT,                                   -- why this recommendation
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recs_cluster ON cluster_recommendations (cluster_id);
CREATE INDEX idx_recs_type ON cluster_recommendations (rec_type);

-- ─── 5. HELPER VIEWS ───────────────────────────────────────────────

-- Active clusters with narrative and signal count
CREATE OR REPLACE VIEW v_cluster_briefings AS
SELECT
  c.id,
  c.title,
  c.signal_count,
  c.companies,
  c.industries,
  c.locations,
  c.technologies,
  c.strength,
  c.first_signal,
  c.last_signal,
  n.what_is_happening,
  n.why_it_matters,
  n.what_happens_next,
  n.actions,
  n.confidence AS narrative_confidence,
  n.generated_at AS narrative_generated_at
FROM intel_clusters c
LEFT JOIN cluster_narratives n ON n.cluster_id = c.id
WHERE c.status = 'active'
ORDER BY c.strength DESC, c.last_signal DESC;

-- Signal velocity by industry (7-day window vs 28-day baseline)
CREATE OR REPLACE VIEW v_signal_velocity AS
SELECT
  industry,
  COUNT(*) FILTER (WHERE discovered_at > now() - INTERVAL '7 days') AS signals_7d,
  COUNT(*) FILTER (WHERE discovered_at > now() - INTERVAL '28 days') AS signals_28d,
  CASE
    WHEN COUNT(*) FILTER (WHERE discovered_at BETWEEN now() - INTERVAL '28 days' AND now() - INTERVAL '7 days') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE discovered_at > now() - INTERVAL '7 days')::NUMERIC /
      (COUNT(*) FILTER (WHERE discovered_at BETWEEN now() - INTERVAL '28 days' AND now() - INTERVAL '7 days') / 3.0),
      2
    )
  END AS velocity_ratio,
  AVG(importance_score) FILTER (WHERE discovered_at > now() - INTERVAL '7 days') AS avg_importance_7d,
  MAX(discovered_at) AS latest_signal
FROM intel_signals
WHERE discovered_at > now() - INTERVAL '28 days'
GROUP BY industry
HAVING COUNT(*) FILTER (WHERE discovered_at > now() - INTERVAL '7 days') >= 3
ORDER BY velocity_ratio DESC;

-- Company activity concentration
CREATE OR REPLACE VIEW v_company_activity AS
SELECT
  company,
  COUNT(*) AS signal_count,
  COUNT(DISTINCT signal_type) AS type_diversity,
  COUNT(DISTINCT industry) AS industry_spread,
  array_agg(DISTINCT signal_type) AS signal_types,
  array_agg(DISTINCT industry) AS industries,
  MIN(discovered_at) AS first_seen,
  MAX(discovered_at) AS last_seen,
  AVG(importance_score) AS avg_importance,
  SUM(COALESCE(amount_usd, 0)) AS total_amount
FROM intel_signals
WHERE company IS NOT NULL
  AND discovered_at > now() - INTERVAL '14 days'
GROUP BY company
HAVING COUNT(*) >= 2
ORDER BY signal_count DESC;

-- ─── 6. RLS POLICIES ───────────────────────────────────────────────

ALTER TABLE intel_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_recommendations ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "anon_read_clusters" ON intel_clusters FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_trends" ON intel_trends FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_narratives" ON cluster_narratives FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_recs" ON cluster_recommendations FOR SELECT TO anon USING (true);

-- Service role full access
CREATE POLICY "service_all_clusters" ON intel_clusters FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_trends" ON intel_trends FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_narratives" ON cluster_narratives FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_recs" ON cluster_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 7. UPDATED_AT TRIGGER ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clusters_updated
  BEFORE UPDATE ON intel_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
