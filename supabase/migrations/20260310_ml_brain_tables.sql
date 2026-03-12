-- ─────────────────────────────────────────────────────────────────────────────
-- NXT//LINK ML Brain Tables — March 2026
-- Implements the 3 missing tables from NXT_LINK_ML_Engine.docx:
--   1. ml_patterns        — persistent learned patterns (survive restarts)
--   2. prediction_outcomes — IKER ground truth labels for self-improvement loop
--   3. country_activity   — live country heat scores for the global map
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ML_PATTERNS — Persistent Learning Store
-- Stores any key-value intelligence pattern the ML engine learns over time.
-- pattern_key format: '<agent>:<metric>:<entity_slug>'
-- e.g. 'iker:funding_weight:defense-tech', 'source:reliability:gao-reports'
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ml_patterns (
  pattern_key   text        not null primary key,
  pattern_data  jsonb       not null default '{}',
  agent         text        null,          -- which agent wrote this
  version       integer     not null default 1,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.ml_patterns enable row level security;

create policy "anon_read_ml_patterns"
  on public.ml_patterns for select to anon using (true);

create policy "service_write_ml_patterns"
  on public.ml_patterns for all to service_role using (true);

grant select on table public.ml_patterns to anon;
grant all    on table public.ml_patterns to service_role;

-- Index for agent-scoped queries
create index if not exists ml_patterns_agent_idx on public.ml_patterns(agent);
create index if not exists ml_patterns_updated_idx on public.ml_patterns(updated_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PREDICTION_OUTCOMES — IKER Self-Learning Ground Truth
-- Every IKER score prediction gets logged here.
-- When the outcome is measured (e.g. company raised Series B 180 days later),
-- the result is recorded and used to update model weights.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.prediction_outcomes (
  id                  uuid        not null default gen_random_uuid() primary key,
  entity_id           text        not null,   -- slug or entity UUID
  entity_name         text        null,
  prediction_type     text        not null,   -- 'funding', 'growth', 'legitimacy', 'acquisition', 'sector_heat'
  predicted_score     float       not null,   -- 0.0 – 1.0 or 0 – 100
  actual_score        float       null,       -- filled when outcome is measured
  prediction_horizon  integer     not null default 180,  -- days until outcome measured
  predicted_at        timestamptz not null default now(),
  measured_at         timestamptz null,
  outcome_measured    boolean     not null default false,
  error               float       null,       -- actual - predicted (filled on measurement)
  context_data        jsonb       null,       -- signals available at prediction time
  agent               text        null,       -- which agent made this prediction
  created_at          timestamptz not null default now()
);

alter table public.prediction_outcomes enable row level security;

create policy "anon_read_prediction_outcomes"
  on public.prediction_outcomes for select to anon using (true);

create policy "service_write_prediction_outcomes"
  on public.prediction_outcomes for all to service_role using (true);

grant select on table public.prediction_outcomes to anon;
grant all    on table public.prediction_outcomes to service_role;

-- Indexes for the learning loop queries
create index if not exists pred_outcomes_entity_idx     on public.prediction_outcomes(entity_id);
create index if not exists pred_outcomes_type_idx       on public.prediction_outcomes(prediction_type);
create index if not exists pred_outcomes_unmeasured_idx on public.prediction_outcomes(predicted_at)
  where outcome_measured = false;
create index if not exists pred_outcomes_predicted_at   on public.prediction_outcomes(predicted_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COUNTRY_ACTIVITY — Real-Time Country Heat Scores
-- Updated by the CountryActivityUpdater (Python) and the daily cron (TS).
-- Powers the global map country glow intensity.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.country_activity (
  country_code        text        not null primary key,  -- ISO 3166-1 alpha-2
  country_name        text        null,
  entity_count        integer     not null default 0,
  signal_count_30d    integer     not null default 0,
  signal_velocity     float       not null default 0,    -- signals per day (30d window)
  funding_total_usd   bigint      not null default 0,
  avg_iker_score      float       null,
  top_companies       jsonb       null,   -- [{name, iker_score}]
  top_signal_types    jsonb       null,   -- {contract_award: N, ...}
  heat_score          float       not null default 0,    -- 0–100 composite heat
  last_updated        timestamptz not null default now()
);

alter table public.country_activity enable row level security;

create policy "anon_read_country_activity"
  on public.country_activity for select to anon using (true);

create policy "service_write_country_activity"
  on public.country_activity for all to service_role using (true);

grant select on table public.country_activity to anon;
grant all    on table public.country_activity to service_role;

-- Index for heat score ordering
create index if not exists country_activity_heat_idx on public.country_activity(heat_score desc);
create index if not exists country_activity_updated_idx on public.country_activity(last_updated desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable realtime for live map updates
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.country_activity;
exception when duplicate_object then null;
end $$;
