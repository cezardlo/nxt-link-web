-- Fix 1: Link signals to vendors
ALTER TABLE intel_signals ADD COLUMN IF NOT EXISTS vendor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_intel_signals_vendor ON intel_signals(vendor_id) WHERE vendor_id IS NOT NULL;

-- Fix 2: Problem categories
ALTER TABLE intel_signals ADD COLUMN IF NOT EXISTS problem_category TEXT;
CREATE INDEX IF NOT EXISTS idx_intel_signals_problem ON intel_signals(problem_category) WHERE problem_category IS NOT NULL;

-- Fix 3: Industry normalization is handled at application level (8 buckets)
-- logistics, manufacturing, tech, defense, border-tech, government, energy, other
