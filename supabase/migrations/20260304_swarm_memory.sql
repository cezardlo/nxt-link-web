-- Swarm shared memory table — NXT//LINK platform
-- Migration: 20260304_swarm_memory.sql
--
-- All agents write findings here; other agents read and act on them.

create table if not exists public.swarm_memory (
  id           uuid primary key default gen_random_uuid(),
  agent_name   text not null,
  entry_type   text not null check (entry_type in ('finding', 'entity', 'signal', 'risk', 'trend', 'recommendation')),
  topic        text not null,
  content      jsonb not null default '{}',
  confidence   real not null default 0.5 check (confidence >= 0 and confidence <= 1),
  tags         text[] default '{}',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  read_by      text[] default '{}'
);

alter table public.swarm_memory enable row level security;

drop policy if exists "service_role_full_access_swarm_memory" on public.swarm_memory;
create policy "service_role_full_access_swarm_memory"
  on public.swarm_memory for all
  using (true)
  with check (true);

create index if not exists idx_swarm_memory_topic      on public.swarm_memory(topic);
create index if not exists idx_swarm_memory_agent      on public.swarm_memory(agent_name);
create index if not exists idx_swarm_memory_type       on public.swarm_memory(entry_type);
create index if not exists idx_swarm_memory_created    on public.swarm_memory(created_at desc);
create index if not exists idx_swarm_memory_confidence on public.swarm_memory(confidence desc);
create index if not exists idx_swarm_memory_expires    on public.swarm_memory(expires_at) where expires_at is not null;

-- Helper function: mark a memory entry as read by an agent (idempotent)
create or replace function swarm_memory_mark_read(entry_id uuid, reader text)
returns void as $$
begin
  update public.swarm_memory
  set read_by = array_append(read_by, reader)
  where id = entry_id and not (reader = any(read_by));
end;
$$ language plpgsql;

-- Helper function: delete expired entries; returns count of deleted rows
create or replace function swarm_memory_cleanup()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from public.swarm_memory where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

-- Realtime: agents can subscribe to new findings from peers
do $$ begin
  alter publication supabase_realtime add table public.swarm_memory;
exception when duplicate_object then null;
end $$;
