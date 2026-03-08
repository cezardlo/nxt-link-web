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
CREATE POLICY "anon can read dynamic_industries" ON dynamic_industries FOR SELECT TO anon USING (true);
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
