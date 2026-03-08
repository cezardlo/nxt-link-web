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

CREATE POLICY "anon can read products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "service can manage products" ON products FOR ALL TO service_role USING (true);

CREATE POLICY "anon can read conference_intel" ON conference_intel FOR SELECT TO anon USING (true);
CREATE POLICY "service can manage conference_intel" ON conference_intel FOR ALL TO service_role USING (true);
