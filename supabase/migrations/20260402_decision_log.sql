-- Decision log: stores every decision engine request + response for learning
CREATE TABLE IF NOT EXISTS decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('top3', 'search')),
  query text,
  decisions jsonb NOT NULL DEFAULT '[]',
  signal_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_decision_log_created ON decision_log (created_at DESC);

-- Index for analyzing search patterns
CREATE INDEX IF NOT EXISTS idx_decision_log_mode ON decision_log (mode, created_at DESC);

-- RLS: public read, service role write
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decision_log_read" ON decision_log FOR SELECT USING (true);
CREATE POLICY "decision_log_write" ON decision_log FOR INSERT WITH CHECK (true);
