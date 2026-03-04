-- Swarm learning / feedback table — NXT//LINK platform
-- Migration: 20260304_swarm_learning.sql
--
-- Agents rate each other's findings to build per-agent reliability scores.
-- Depends on: 20260304_swarm_memory.sql (swarm_memory table must exist first)

create table if not exists public.swarm_learning (
  id              uuid primary key default gen_random_uuid(),
  memory_entry_id uuid references public.swarm_memory(id) on delete cascade,
  rated_by_agent  text not null,
  rating          text not null check (rating in ('useful', 'noise', 'critical')),
  context         text,
  created_at      timestamptz not null default now()
);

alter table public.swarm_learning enable row level security;

drop policy if exists "service_role_full_access_swarm_learning" on public.swarm_learning;
create policy "service_role_full_access_swarm_learning"
  on public.swarm_learning for all
  using (true)
  with check (true);

create index if not exists idx_swarm_learning_entry  on public.swarm_learning(memory_entry_id);
create index if not exists idx_swarm_learning_agent  on public.swarm_learning(rated_by_agent);
create index if not exists idx_swarm_learning_rating on public.swarm_learning(rating);

-- View: per-agent reliability score derived from peer ratings.
-- reliability_score = (useful + critical) / total_ratings, 0.5 when no ratings yet.
create or replace view public.swarm_agent_reliability as
select
  m.agent_name,
  count(l.id) as total_ratings,
  count(l.id) filter (where l.rating = 'useful')   as useful_count,
  count(l.id) filter (where l.rating = 'noise')    as noise_count,
  count(l.id) filter (where l.rating = 'critical') as critical_count,
  case
    when count(l.id) = 0 then 0.5
    else round(
      (count(l.id) filter (where l.rating in ('useful', 'critical'))::numeric /
       nullif(count(l.id), 0)::numeric), 3
    )
  end as reliability_score
from public.swarm_memory m
left join public.swarm_learning l on l.memory_entry_id = m.id
group by m.agent_name;
