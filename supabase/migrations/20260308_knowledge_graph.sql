-- =============================================================================
-- NXT LINK — Knowledge Graph
-- Migration: 20260308_knowledge_graph.sql
-- Idempotent: safe to re-run
--
-- Two tables only. Power comes from connections, not categories.
--
--   entities             — canonical nodes (industry, company, product,
--                          technology, problem, signal, event, location)
--   entity_relationships — directed edges between nodes with confidence
--                          and source attribution
--
-- Relationship types: creates | uses | solves | belongs_to |
--                     related_to | occurs_in | influences
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. ENTITIES
-- Every real-world concept the platform tracks lives here once,
-- identified by a stable slug. Rich detail lives in metadata JSONB.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity classification
  entity_type TEXT        NOT NULL
                CHECK (entity_type IN (
                  'industry', 'company', 'product', 'technology',
                  'problem', 'signal', 'event', 'location'
                )),

  -- Human-readable identity
  name        TEXT        NOT NULL,

  -- URL-safe unique identifier — e.g. 'palantir-technologies', 'el-paso-tx'
  -- Slugs allow stable cross-table references without UUID coupling.
  slug        TEXT        NOT NULL UNIQUE,

  -- Optional prose description
  description TEXT,

  -- Flexible structured data per type.
  -- Examples:
  --   company   → { "website": "...", "founded": 2003, "employees": 3800 }
  --   location  → { "lat": 31.76, "lon": -106.48, "country": "US" }
  --   signal    → { "severity": "high", "source_url": "...", "detected_at": "..." }
  --   event     → { "start_date": "2026-04-10", "venue": "..." }
  metadata    JSONB       NOT NULL DEFAULT '{}',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Type lookups — most queries filter by entity_type first
CREATE INDEX IF NOT EXISTS idx_entities_type
  ON public.entities (entity_type);

-- Slug lookups — O(1) exact match for cross-system references
-- (UNIQUE constraint above already creates a btree index, this
--  explicit name makes it easy to reference in query plans)
CREATE INDEX IF NOT EXISTS idx_entities_slug
  ON public.entities (slug);

-- Full-text search on name — powers the global search bar
CREATE INDEX IF NOT EXISTS idx_entities_name_fts
  ON public.entities USING gin (to_tsvector('english', name));

-- Compound index for the most common list query: type + recency
CREATE INDEX IF NOT EXISTS idx_entities_type_created
  ON public.entities (entity_type, created_at DESC);

-- GIN index on metadata — supports jsonb containment queries like:
--   WHERE metadata @> '{"severity": "high"}'
CREATE INDEX IF NOT EXISTS idx_entities_metadata
  ON public.entities USING gin (metadata jsonb_path_ops);


-- ---------------------------------------------------------------------------
-- 2. ENTITY_RELATIONSHIPS
-- Directed edges. Read as: source → relationship_type → target
-- Example: Palantir (company) → uses → Foundry (product)
--          El Paso (location) → occurs_in → Border Surge (signal)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Directed edge endpoints
  source_entity_id  UUID        NOT NULL
                      REFERENCES public.entities (id) ON DELETE CASCADE,
  target_entity_id  UUID        NOT NULL
                      REFERENCES public.entities (id) ON DELETE CASCADE,

  -- Relationship semantics
  relationship_type TEXT        NOT NULL
                      CHECK (relationship_type IN (
                        'creates', 'uses', 'solves', 'belongs_to',
                        'related_to', 'occurs_in', 'influences'
                      )),

  -- How confident are we in this edge? 0.0 = guess, 1.0 = verified.
  -- Agents write lower scores; human-confirmed edges get 1.0.
  confidence        NUMERIC(4, 3) NOT NULL DEFAULT 0.5
                      CHECK (confidence >= 0 AND confidence <= 1),

  -- Where did this relationship come from?
  -- Free text: agent name, URL, human analyst, etc.
  source_attribution TEXT,

  -- No duplicate directed edges of the same type
  CONSTRAINT uq_entity_relationship
    UNIQUE (source_entity_id, target_entity_id, relationship_type),

  -- Self-loops are not meaningful in this graph
  CONSTRAINT chk_no_self_loop
    CHECK (source_entity_id <> target_entity_id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbound traversal — "what does this entity connect to?"
-- Used when rendering a node's connections in the graph view.
CREATE INDEX IF NOT EXISTS idx_er_source
  ON public.entity_relationships (source_entity_id);

-- Inbound traversal — "what points at this entity?"
-- Used for influence analysis and backlink counts.
CREATE INDEX IF NOT EXISTS idx_er_target
  ON public.entity_relationships (target_entity_id);

-- Relationship type filter — "show all 'uses' edges across the graph"
CREATE INDEX IF NOT EXISTS idx_er_relationship_type
  ON public.entity_relationships (relationship_type);

-- Compound for the common pattern: outbound edges of a specific type
--   WHERE source_entity_id = $1 AND relationship_type = 'uses'
CREATE INDEX IF NOT EXISTS idx_er_source_type
  ON public.entity_relationships (source_entity_id, relationship_type);

-- Confidence-ranked reads — surface highest-confidence edges first
CREATE INDEX IF NOT EXISTS idx_er_confidence
  ON public.entity_relationships (confidence DESC);


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.entities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships  ENABLE ROW LEVEL SECURITY;

-- anon: read-only
DO $$ BEGIN
  CREATE POLICY "entities_anon_select"
    ON public.entities
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "entity_relationships_anon_select"
    ON public.entity_relationships
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- service_role: full management (INSERT / UPDATE / DELETE from agents + cron)
DO $$ BEGIN
  CREATE POLICY "entities_service_all"
    ON public.entities
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "entity_relationships_service_all"
    ON public.entity_relationships
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Explicit grants (belt-and-suspenders alongside RLS)
GRANT SELECT ON public.entities             TO anon;
GRANT SELECT ON public.entity_relationships TO anon;


-- ---------------------------------------------------------------------------
-- REALTIME
-- Agents will write new entities and relationships live;
-- the graph view subscribes to stream updates in real time.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entities;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_relationships;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
