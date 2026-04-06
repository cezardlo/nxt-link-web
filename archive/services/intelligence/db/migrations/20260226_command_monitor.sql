-- Command Monitor extension migration
-- Adds mission run journaling and map snapshot metrics.

CREATE TABLE IF NOT EXISTS mission_runs (
  mission_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_text TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('executive', 'operator', 'strategy')),
  time_range_days INTEGER NOT NULL CHECK (time_range_days IN (30, 90, 180)),
  layers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  inferred_state TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  briefing_json JSONB NOT NULL,
  movement_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_runs_created_at
  ON mission_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS map_layer_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_range_days INTEGER NOT NULL CHECK (time_range_days IN (30, 90, 180)),
  layer_id TEXT NOT NULL,
  point_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_layer_snapshots_generated_at
  ON map_layer_snapshots(layer_id, generated_at DESC);

