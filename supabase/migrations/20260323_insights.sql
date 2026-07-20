-- supabase/migrations/20260323_insights.sql
-- Step 8: Insight Layer Storage

-- =============================================================================
-- INSIGHTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES intel_signals(id) ON DELETE CASCADE,
  
  -- The insight content
  meaning TEXT NOT NULL,                    -- "So what?" - why this matters
  actions TEXT[] NOT NULL DEFAULT '{}',     -- "Now what?" - what to do
  pattern TEXT,                             -- Detected trend/pattern name
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Context & provenance
  related_signal_ids UUID[] DEFAULT '{}',   -- Signals that informed this insight
  user_id UUID REFERENCES auth.users(id),   -- NULL = system-generated
  
  -- Model metadata
  model_used TEXT DEFAULT 'gemini-1.5-flash',
  tokens_used INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User feedback (for improving quality)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  feedback_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Fast lookup by signal
CREATE INDEX IF NOT EXISTS idx_insights_signal_id ON insights(signal_id);

-- Find all insights with a specific pattern
CREATE INDEX IF NOT EXISTS idx_insights_pattern ON insights(pattern) WHERE pattern IS NOT NULL;

-- Recent insights for dashboard
CREATE INDEX IF NOT EXISTS idx_insights_generated_at ON insights(generated_at DESC);

-- Low-rated insights for review
CREATE INDEX IF NOT EXISTS idx_insights_low_rating ON insights(user_rating) WHERE user_rating <= 2;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Users can read insights for signals they have access to
CREATE POLICY "insights_read_policy" ON insights
  FOR SELECT
  USING (
    -- System-generated insights (no user_id) are readable by all authenticated users
    (user_id IS NULL AND auth.role() = 'authenticated')
    OR
    -- User-generated insights are readable by the creator
    (user_id = auth.uid())
    OR
    -- Admins can read all
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    ))
  );

-- Users can only update their own feedback
CREATE POLICY "insights_feedback_policy" ON insights
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    -- Can only update rating/feedback fields, not core insight
    auth.role() = 'authenticated'
  );

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW
  EXECUTE FUNCTION update_insights_updated_at();

-- =============================================================================
-- FEEDBACK TIMESTAMP TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION set_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_rating IS DISTINCT FROM OLD.user_rating 
     OR NEW.user_feedback IS DISTINCT FROM OLD.user_feedback THEN
    NEW.feedback_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insights_feedback_timestamp
  BEFORE UPDATE ON insights
  FOR EACH ROW
  EXECUTE FUNCTION set_feedback_timestamp();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get the most recent insight for a signal
CREATE OR REPLACE FUNCTION get_signal_insight(p_signal_id UUID)
RETURNS TABLE (
  id UUID,
  meaning TEXT,
  actions TEXT[],
  pattern TEXT,
  confidence INTEGER,
  related_signal_ids UUID[],
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.meaning,
    i.actions,
    i.pattern,
    i.confidence,
    i.related_signal_ids,
    i.generated_at
  FROM insights i
  WHERE i.signal_id = p_signal_id
  ORDER BY i.generated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all insights with a specific pattern (for trend analysis)
CREATE OR REPLACE FUNCTION get_pattern_insights(p_pattern TEXT)
RETURNS TABLE (
  id UUID,
  signal_id UUID,
  meaning TEXT,
  confidence INTEGER,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.signal_id,
    i.meaning,
    i.confidence,
    i.generated_at
  FROM insights i
  WHERE i.pattern = p_pattern
  ORDER BY i.generated_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ANALYTICS VIEWS
-- =============================================================================

-- Pattern frequency view
CREATE OR REPLACE VIEW insight_patterns AS
SELECT 
  pattern,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  MIN(generated_at) as first_seen,
  MAX(generated_at) as last_seen
FROM insights
WHERE pattern IS NOT NULL
GROUP BY pattern
ORDER BY count DESC;

-- Model performance view
CREATE OR REPLACE VIEW insight_model_stats AS
SELECT 
  model_used,
  COUNT(*) as total_insights,
  AVG(confidence) as avg_confidence,
  AVG(user_rating) FILTER (WHERE user_rating IS NOT NULL) as avg_rating,
  COUNT(*) FILTER (WHERE user_rating >= 4) as positive_ratings,
  COUNT(*) FILTER (WHERE user_rating <= 2) as negative_ratings,
  SUM(tokens_used) as total_tokens
FROM insights
GROUP BY model_used;
