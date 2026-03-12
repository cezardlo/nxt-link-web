-- =============================================================================
-- NXT LINK — Extend Knowledge Graph
-- Migration: 20260309_extend_graph.sql
-- Idempotent: safe to re-run
--
-- Changes:
--   1. Extend entity_type CHECK to add: force, trajectory, opportunity,
--      discovery, policy
--   2. Extend relationship_type CHECK to add: builds, funds, regulates,
--      competes_with, supplies, enables, depends_on, located_in,
--      accelerates, affects
--   3. Add aliases JSONB array to entities (alias handling for duplicates)
--   4. Add last_seen_at to entities and entity_relationships
--   5. Add evidence_count to entity_relationships
--   6. Create signal_entity_links table
--   7. Add review_status to dynamic_industries
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. EXTEND entity_type CHECK
-- Drop old constraint, add expanded one
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.entities DROP CONSTRAINT IF EXISTS entities_entity_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.entities
  ADD CONSTRAINT entities_entity_type_check
  CHECK (entity_type IN (
    'industry', 'company', 'product', 'technology',
    'problem', 'signal', 'event', 'location',
    'force', 'trajectory', 'opportunity', 'discovery', 'policy'
  ));


-- ---------------------------------------------------------------------------
-- 2. EXTEND relationship_type CHECK
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.entity_relationships DROP CONSTRAINT IF EXISTS entity_relationships_relationship_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.entity_relationships
  ADD CONSTRAINT entity_relationships_relationship_type_check
  CHECK (relationship_type IN (
    'creates', 'uses', 'solves', 'belongs_to',
    'related_to', 'occurs_in', 'influences',
    'builds', 'funds', 'regulates', 'competes_with',
    'supplies', 'enables', 'depends_on', 'located_in',
    'accelerates', 'affects'
  ));


-- ---------------------------------------------------------------------------
-- 3. ENTITY ALIASES — array of alternative names to prevent duplicates
-- Examples: ["IBM", "International Business Machines"]
--           ["AI chips", "AI semiconductors", "AI accelerators"]
-- ---------------------------------------------------------------------------

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]';

-- GIN index for containment queries: WHERE aliases @> '["IBM"]'
CREATE INDEX IF NOT EXISTS idx_entities_aliases
  ON public.entities USING gin (aliases jsonb_path_ops);


-- ---------------------------------------------------------------------------
-- 4. LAST_SEEN_AT — tracks freshness for both entities and relationships
-- ---------------------------------------------------------------------------

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.entity_relationships
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_entities_last_seen
  ON public.entities (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_er_last_seen
  ON public.entity_relationships (last_seen_at DESC);


-- ---------------------------------------------------------------------------
-- 5. EVIDENCE COUNT — how many signals/sources support this relationship
-- ---------------------------------------------------------------------------

ALTER TABLE public.entity_relationships
  ADD COLUMN IF NOT EXISTS evidence_count INTEGER NOT NULL DEFAULT 1;


-- ---------------------------------------------------------------------------
-- 6. SIGNAL_ENTITY_LINKS — connects intel_signals to knowledge graph entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.signal_entity_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   TEXT        NOT NULL,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL,   -- 'subject', 'object', 'location', 'technology', 'industry'
  confidence  REAL        DEFAULT 0.7,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sel_signal_id
  ON public.signal_entity_links (signal_id);
CREATE INDEX IF NOT EXISTS idx_sel_entity_id
  ON public.signal_entity_links (entity_id);

-- Prevent duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS idx_sel_unique_link
  ON public.signal_entity_links (signal_id, entity_id, role);

-- RLS
ALTER TABLE public.signal_entity_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sel_anon_select"
    ON public.signal_entity_links
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sel_service_all"
    ON public.signal_entity_links
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.signal_entity_links TO anon;


-- ---------------------------------------------------------------------------
-- 7. REVIEW STATUS for dynamic_industries
-- ---------------------------------------------------------------------------

ALTER TABLE public.dynamic_industries
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected'));
