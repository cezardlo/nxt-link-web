-- =============================================================================
-- NXT LINK — Signal Connection Engine Tables
-- Migration: 20260319_signal_connections.sql
-- Idempotent: safe to re-run
--
-- Note: intel_signals.id is TEXT (not UUID), so signal_a_id / signal_b_id
-- are also TEXT to satisfy the foreign key constraint.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. signal_connections — edges between two related intel signals
-- ---------------------------------------------------------------------------

create table if not exists public.signal_connections (
  id              uuid        primary key default gen_random_uuid(),
  signal_a_id     text        references public.intel_signals(id) on delete cascade,
  signal_b_id     text        references public.intel_signals(id) on delete cascade,
  connection_type text        not null
                    check (connection_type in (
                      'CAUSAL', 'TEMPORAL', 'ENTITY',
                      'GEOGRAPHIC', 'THEMATIC', 'CLUSTER'
                    )),
  strength        int         default 0
                    check (strength >= 0 and strength <= 100),
  explanation     text,
  detected_at     timestamptz default now(),
  confirmed       boolean     default false
);

create index if not exists signal_connections_a_idx
  on public.signal_connections(signal_a_id);

create index if not exists signal_connections_b_idx
  on public.signal_connections(signal_b_id);

create index if not exists signal_connections_type_idx
  on public.signal_connections(connection_type);

create index if not exists signal_connections_strength_idx
  on public.signal_connections(strength desc);


-- ---------------------------------------------------------------------------
-- 2. signal_clusters — groups of signals sharing a common theme or entity
-- ---------------------------------------------------------------------------

create table if not exists public.signal_clusters (
  id          uuid        primary key default gen_random_uuid(),
  signal_ids  uuid[],
  theme       text,
  entity      text,
  strength    int         default 0
                check (strength >= 0 and strength <= 100),
  created_at  timestamptz default now()
);

create index if not exists signal_clusters_strength_idx
  on public.signal_clusters(strength desc);


-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.signal_connections enable row level security;
alter table public.signal_clusters    enable row level security;

-- ---------------------------------------------------------------------------
-- signal_connections policies
-- ---------------------------------------------------------------------------

do $$ begin
  create policy "signal_connections_anon_select"
    on public.signal_connections for select
    to anon
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "signal_connections_service_all"
    on public.signal_connections for all
    to service_role
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- signal_clusters policies
-- ---------------------------------------------------------------------------

do $$ begin
  create policy "signal_clusters_anon_select"
    on public.signal_clusters for select
    to anon
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "signal_clusters_service_all"
    on public.signal_clusters for all
    to service_role
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Explicit grants (matches pattern in 20260311_feed_dedup.sql)
-- ---------------------------------------------------------------------------

grant select on table public.signal_connections to anon;
grant all    on table public.signal_connections to service_role;

grant select on table public.signal_clusters to anon;
grant all    on table public.signal_clusters to service_role;
