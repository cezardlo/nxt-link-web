-- Intel Signals — persisted intelligence discoveries (patents, funding, M&A, etc.)
CREATE TABLE IF NOT EXISTS intel_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  url TEXT,
  source TEXT,
  evidence TEXT,
  company TEXT,
  amount_usd DOUBLE PRECISION,
  confidence DOUBLE PRECISION DEFAULT 0.5,
  importance_score DOUBLE PRECISION DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  discovered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_signals_type ON intel_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_intel_signals_industry ON intel_signals(industry);
CREATE INDEX IF NOT EXISTS idx_intel_signals_importance ON intel_signals(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_discovered ON intel_signals(discovered_at DESC);

-- Daily Briefings — auto-generated intelligence summaries
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sections JSONB DEFAULT '[]',
  signal_count INT DEFAULT 0,
  top_industries TEXT[] DEFAULT '{}',
  top_signal_types TEXT[] DEFAULT '{}',
  highlights JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(briefing_date DESC);

-- RLS
ALTER TABLE intel_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read intel_signals" ON intel_signals FOR SELECT TO anon USING (true);
CREATE POLICY "service can manage intel_signals" ON intel_signals FOR ALL TO service_role USING (true);

CREATE POLICY "anon can read daily_briefings" ON daily_briefings FOR SELECT TO anon USING (true);
CREATE POLICY "service can manage daily_briefings" ON daily_briefings FOR ALL TO service_role USING (true);
