-- Conference Leads table — stores scored, trucking/logistics-relevant leads
-- derived from conference exhibitor data + vendor enrichment.

CREATE TABLE IF NOT EXISTS conference_leads (
  id TEXT PRIMARY KEY,
  vendor_id TEXT DEFAULT '',
  canonical_name TEXT NOT NULL,
  logistics_score INT DEFAULT 0,
  lead_tier TEXT DEFAULT 'watch',
  logistics_category TEXT DEFAULT '',
  products TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}',
  official_domain TEXT DEFAULT '',
  description TEXT DEFAULT '',
  conference_appearances INT DEFAULT 0,
  conference_names TEXT[] DEFAULT '{}',
  employee_estimate TEXT DEFAULT '',
  country TEXT DEFAULT '',
  el_paso_relevant BOOLEAN DEFAULT false,
  last_scored_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_conf_leads_score ON conference_leads (logistics_score DESC);
CREATE INDEX IF NOT EXISTS idx_conf_leads_tier ON conference_leads (lead_tier);
CREATE INDEX IF NOT EXISTS idx_conf_leads_category ON conference_leads (logistics_category);
CREATE INDEX IF NOT EXISTS idx_conf_leads_ep ON conference_leads (el_paso_relevant) WHERE el_paso_relevant = true;

-- RLS policies
ALTER TABLE conference_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read conference_leads"
  ON conference_leads FOR SELECT
  USING (true);

CREATE POLICY "Service write conference_leads"
  ON conference_leads FOR ALL
  USING (true)
  WITH CHECK (true);
