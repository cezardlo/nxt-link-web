-- NXT LINK — Full Database Schema
-- Run this in Supabase SQL Editor (project: yvykselwehxjwsqercjg)
-- Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS / DO $$ blocks)
-- Date: March 2026

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VENDORS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.vendors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  website      text,
  category     text,
  tags         text[] default '{}',
  evidence     text[] default '{}',
  iker_score   numeric(5,2) default 0,
  status       text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.vendors enable row level security;

drop policy if exists "public_read_approved_vendors" on public.vendors;
create policy "public_read_approved_vendors"
  on public.vendors for select to anon
  using (lower(trim(status)) = 'approved');

grant usage on schema public to anon;
grant select on table public.vendors to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SIGNALS
-- Used by IKERAgent, NarrativeAgent, AlertAgent, TrendAgent
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.signals (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  source       text,
  source_url   text,
  category     text,
  vendor_name  text,
  sentiment    text,               -- 'positive' | 'negative' | 'neutral'
  iker_score   numeric(5,2),       -- NULL until IKERAgent scores it
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.signals enable row level security;
create policy "anon_read_signals" on public.signals for select to anon using (true);
grant select on table public.signals to anon;

create index if not exists idx_signals_published_at on public.signals(published_at desc);
create index if not exists idx_signals_iker_null    on public.signals(id) where iker_score is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FEED_SIGNALS
-- RSS-sourced items; fallback table when 'signals' is unavailable or empty
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.feed_signals (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  source       text,
  source_url   text,
  category     text,
  vendor       text,               -- note: agents use 'vendor' not 'vendor_name'
  sentiment    text,
  iker_score   numeric(5,2),
  created_at   timestamptz not null default now()
);

alter table public.feed_signals enable row level security;
create policy "anon_read_feed_signals" on public.feed_signals for select to anon using (true);
grant select on table public.feed_signals to anon;

create index if not exists idx_feed_signals_created_at  on public.feed_signals(created_at desc);
create index if not exists idx_feed_signals_iker_null   on public.feed_signals(id) where iker_score is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AGENT_RUNS
-- Tracks each agent execution lifecycle (idle → running → completed/failed)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_name  text not null,
  status      text not null default 'idle',  -- 'idle' | 'running' | 'completed' | 'failed'
  started_at  timestamptz,
  finished_at timestamptz,
  items_in    int default 0,
  items_out   int default 0,
  error       text,
  metadata    jsonb default '{}'::jsonb
);

alter table public.agent_runs enable row level security;
create policy "anon_read_agent_runs" on public.agent_runs for select to anon using (true);
grant select on table public.agent_runs to anon;

create index if not exists idx_agent_runs_name on public.agent_runs(agent_name, started_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AGENT_EVENTS
-- Inter-agent event bus (narrative_ready, alert_fired, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.agent_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,
  source_agent text not null,
  target_agent text,
  payload      jsonb default '{}'::jsonb,
  processed    boolean default false,
  created_at   timestamptz not null default now()
);

alter table public.agent_events enable row level security;
create policy "anon_read_agent_events" on public.agent_events for select to anon using (true);
grant select on table public.agent_events to anon;

create index if not exists idx_agent_events_unprocessed
  on public.agent_events(processed, created_at)
  where processed = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ALERT_RULES
-- User-defined keyword rules for AlertAgent
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.alert_rules (
  id         uuid primary key default gen_random_uuid(),
  keyword    text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.alert_rules enable row level security;
create policy "anon_read_alert_rules" on public.alert_rules for select to anon using (true);
grant select on table public.alert_rules to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS
-- Fired by AlertAgent when a signal matches an alert rule
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'alert_match',
  title      text,
  payload    jsonb default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "anon_read_notifications" on public.notifications for select to anon using (true);
grant select on table public.notifications to anon;

create index if not exists idx_notifications_unread on public.notifications(read, created_at desc) where read = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TRENDS
-- Computed by TrendAgent — signal momentum by category and time window
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.trends (
  category     text not null,
  window_days  integer not null,
  signal_count integer not null default 0,
  computed_at  timestamptz not null default now(),
  primary key (category, window_days)
);

alter table public.trends enable row level security;
create policy "anon_read_trends" on public.trends for select to anon using (true);
grant select on table public.trends to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SUPABASE REALTIME
-- Enable realtime subscriptions for live dashboard updates
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.agent_runs;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.agent_events;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.signals;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SEED — Default alert rules
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.alert_rules (keyword, is_active)
select * from (values
  ('fort bliss',   true),
  ('border tech',  true),
  ('maquiladora',  true),
  ('l3harris',     true),
  ('raytheon',     true)
) as t(keyword, is_active)
where not exists (select 1 from public.alert_rules limit 1);
