-- Agent Lightning System realtime setup
-- Run this in Supabase SQL Editor.

create table if not exists agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_name  text not null,
  status      text not null default 'idle',
  started_at  timestamptz,
  finished_at timestamptz,
  items_in    int default 0,
  items_out   int default 0,
  error       text,
  metadata    jsonb default '{}'::jsonb
);

create table if not exists agent_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,
  source_agent text not null,
  target_agent text,
  payload      jsonb default '{}'::jsonb,
  processed    boolean default false,
  created_at   timestamptz default now()
);

do $$
begin
  alter publication supabase_realtime add table agent_runs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table agent_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table signals;
exception when duplicate_object then null;
end $$;

create index if not exists idx_agent_events_unprocessed
  on agent_events(processed, created_at)
  where processed = false;

create index if not exists idx_agent_runs_name
  on agent_runs(agent_name, started_at desc);
