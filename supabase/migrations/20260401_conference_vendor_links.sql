-- Conference → Vendor Links — bridge table connecting conference discoveries to vendors
-- Enables: "which vendors were discovered at this conference?" and "which conferences featured this vendor?"

-- ── Conference Vendor Links ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conference_vendor_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id     TEXT NOT NULL,
  vendor_id         TEXT,
  exhibitor_id      TEXT,
  company_name      TEXT NOT NULL,
  match_type        TEXT DEFAULT 'exact',
  match_confidence  REAL DEFAULT 0.5,
  technologies      TEXT[] DEFAULT '{}',
  signal_types      TEXT[] DEFAULT '{}',
  discovered_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conference_id, company_name)
);

CREATE INDEX IF NOT EXISTS idx_cvl_conference ON conference_vendor_links (conference_id);
CREATE INDEX IF NOT EXISTS idx_cvl_vendor ON conference_vendor_links (vendor_id);
CREATE INDEX IF NOT EXISTS idx_cvl_company ON conference_vendor_links (company_name);
CREATE INDEX IF NOT EXISTS idx_cvl_confidence ON conference_vendor_links (match_confidence DESC);

-- ── Add technologies column to exhibitors ───────────────────────────────────────

ALTER TABLE exhibitors ADD COLUMN IF NOT EXISTS technologies TEXT[] DEFAULT '{}';

-- ── RLS Policies ────────────────────────────────────────────────────────────────

ALTER TABLE conference_vendor_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read conference_vendor_links" ON conference_vendor_links FOR SELECT USING (true);
CREATE POLICY "Service write conference_vendor_links" ON conference_vendor_links FOR ALL USING (true);
