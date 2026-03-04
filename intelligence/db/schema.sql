-- NXT Link Intelligence Platform Schema
-- Target: PostgreSQL 15+ with pgvector

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE source_category AS ENUM (
  'directory',
  'exhibitor',
  'marketplace',
  'news',
  'jobs',
  'patents',
  'github'
);

CREATE TYPE crawl_method AS ENUM ('rss', 'sitemap', 'html', 'api', 'search-page');
CREATE TYPE queue_status AS ENUM ('queued', 'running', 'completed', 'failed', 'retry_scheduled', 'dead_letter');
CREATE TYPE capture_status AS ENUM ('success', 'failed', 'blocked', 'parse_error');
CREATE TYPE review_status AS ENUM ('auto_accepted', 'needs_review', 'reviewed');
CREATE TYPE feedback_action AS ENUM ('impression', 'click', 'save', 'reject', 'edit');
CREATE TYPE model_stage AS ENUM ('candidate', 'staging', 'production', 'archived');

CREATE TABLE sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  category source_category NOT NULL,
  crawl_method crawl_method NOT NULL,
  crawl_frequency_minutes INTEGER NOT NULL CHECK (crawl_frequency_minutes > 0),
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 20 CHECK (rate_limit_per_minute > 0),
  render_js BOOLEAN NOT NULL DEFAULT FALSE,
  reliability_score DOUBLE PRECISION NOT NULL DEFAULT 0.50 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  circuit_open_until TIMESTAMPTZ NULL,
  etag TEXT NULL,
  last_modified TEXT NULL,
  last_success TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_category_active ON sources(category, active);
CREATE INDEX idx_sources_reliability ON sources(reliability_score DESC);

CREATE TABLE crawl_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
  priority SMALLINT NOT NULL DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
  status queue_status NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  next_retry_at TIMESTAMPTZ NULL,
  worker_id TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crawl_queue_pickup ON crawl_queue(status, scheduled_at, priority);
CREATE INDEX idx_crawl_queue_source ON crawl_queue(source_id, status);

CREATE TABLE captures (
  capture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
  queue_id UUID NULL REFERENCES crawl_queue(queue_id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  http_status INTEGER NULL,
  status capture_status NOT NULL,
  etag TEXT NULL,
  last_modified TEXT NULL,
  content_hash TEXT NULL,
  content_type TEXT NULL,
  raw_snapshot_uri TEXT NULL,
  rendered_snapshot_uri TEXT NULL,
  text_snapshot_uri TEXT NULL,
  response_ms INTEGER NULL,
  bytes_downloaded BIGINT NULL,
  parser_version TEXT NOT NULL,
  extraction_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_captures_source_time ON captures(source_id, captured_at DESC);
CREATE INDEX idx_captures_domain_time ON captures(domain, captured_at DESC);
CREATE UNIQUE INDEX uq_captures_url_hash ON captures(normalized_url, content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE evidence_snippets (
  evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID NOT NULL REFERENCES captures(capture_id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  char_start INTEGER NULL,
  char_end INTEGER NULL,
  section_hint TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_capture ON evidence_snippets(capture_id);

CREATE TABLE vendor_truth_cards (
  truth_card_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(source_id) ON DELETE RESTRICT,
  capture_id UUID NOT NULL REFERENCES captures(capture_id) ON DELETE CASCADE,
  canonical_vendor_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  product_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  capabilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  industries_mentioned TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  integrations_mentioned TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  deployment_type TEXT NULL,
  geographic_signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  card_text TEXT NOT NULL,
  card_text_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', card_text)) STORED,
  card_embedding vector(768) NULL,
  evidence_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  review_status review_status NOT NULL DEFAULT 'needs_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_truth_cards_vendor ON vendor_truth_cards(canonical_vendor_id);
CREATE INDEX idx_truth_cards_review_status ON vendor_truth_cards(review_status, confidence DESC);
CREATE INDEX idx_truth_cards_tsv ON vendor_truth_cards USING GIN(card_text_tsv);
CREATE INDEX idx_truth_cards_embedding ON vendor_truth_cards USING ivfflat(card_embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE ontology_labels (
  label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_group TEXT NOT NULL CHECK (label_group IN ('industry', 'problem_category', 'solution_type', 'capability_tag')),
  label_key TEXT NOT NULL,
  label_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(label_group, label_key)
);

CREATE TABLE truth_card_classifications (
  classification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truth_card_id UUID NOT NULL REFERENCES vendor_truth_cards(truth_card_id) ON DELETE CASCADE,
  industry_label_key TEXT NOT NULL,
  problem_category_key TEXT NOT NULL,
  solution_type_key TEXT NOT NULL,
  capability_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  unknown_candidate_labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  evidence_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  classifier_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classifications_truth_card ON truth_card_classifications(truth_card_id, created_at DESC);
CREATE INDEX idx_classifications_confidence ON truth_card_classifications(confidence DESC);

CREATE TABLE review_queue (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truth_card_id UUID NOT NULL REFERENCES vendor_truth_cards(truth_card_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  assigned_to TEXT NULL,
  resolved_by TEXT NULL,
  resolution_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_review_queue_status_priority ON review_queue(status, priority, created_at);

CREATE TABLE search_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  query_embedding vector(768) NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE search_results (
  search_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES search_sessions(session_id) ON DELETE CASCADE,
  truth_card_id UUID NOT NULL REFERENCES vendor_truth_cards(truth_card_id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  bm25_score DOUBLE PRECISION NOT NULL,
  vector_score DOUBLE PRECISION NOT NULL,
  ontology_match_score DOUBLE PRECISION NOT NULL,
  evidence_strength_score DOUBLE PRECISION NOT NULL,
  freshness_score DOUBLE PRECISION NOT NULL,
  source_reliability_score DOUBLE PRECISION NOT NULL,
  feedback_boost_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  final_score DOUBLE PRECISION NOT NULL,
  ranker_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_results_session ON search_results(session_id, rank_position);
CREATE INDEX idx_search_results_truth_card ON search_results(truth_card_id);

CREATE TABLE user_feedback_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_result_id UUID NOT NULL REFERENCES search_results(search_result_id) ON DELETE CASCADE,
  truth_card_id UUID NOT NULL REFERENCES vendor_truth_cards(truth_card_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action feedback_action NOT NULL,
  dwell_ms INTEGER NULL,
  edited_labels_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_events_card ON user_feedback_events(truth_card_id, created_at DESC);
CREATE INDEX idx_feedback_events_action ON user_feedback_events(action, created_at DESC);

CREATE TABLE source_reliability_history (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
  extraction_quality_score DOUBLE PRECISION NOT NULL,
  classification_confidence_score DOUBLE PRECISION NOT NULL,
  downstream_engagement_score DOUBLE PRECISION NOT NULL,
  spam_penalty_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  reliability_score DOUBLE PRECISION NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_reliability_history ON source_reliability_history(source_id, measured_at DESC);

CREATE TABLE trend_signals (
  signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('jobs', 'patents', 'exhibitors', 'launches', 'github')),
  source_id UUID NULL REFERENCES sources(source_id) ON DELETE SET NULL,
  observed_date DATE NOT NULL,
  region_key TEXT NOT NULL,
  category_key TEXT NOT NULL,
  count_value INTEGER NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trend_signals_lookup ON trend_signals(signal_type, category_key, observed_date);
CREATE INDEX idx_trend_signals_region ON trend_signals(region_key, observed_date);

CREATE TABLE trend_metrics (
  trend_metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL,
  region_key TEXT NOT NULL,
  window_days INTEGER NOT NULL CHECK (window_days IN (30, 90, 180)),
  growth_rate DOUBLE PRECISION NOT NULL,
  saturation DOUBLE PRECISION NOT NULL,
  geographic_concentration DOUBLE PRECISION NOT NULL,
  momentum_score DOUBLE PRECISION NOT NULL,
  cluster_label TEXT NULL,
  model_version TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trend_metrics_category ON trend_metrics(category_key, window_days, measured_at DESC);

CREATE TABLE ml_model_registry (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_family TEXT NOT NULL CHECK (model_family IN ('classifier', 'ranker', 'trend_clusterer')),
  model_version TEXT NOT NULL,
  stage model_stage NOT NULL DEFAULT 'candidate',
  artifact_uri TEXT NOT NULL,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  trained_from TIMESTAMPTZ NOT NULL,
  trained_to TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_family, model_version)
);

CREATE TABLE audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  trace_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);

