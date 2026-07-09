-- ============================================================================
-- NXT//LINK — demo / pilot tracking (build step 8)
-- Additive only. One pilots row per engagement stage on an opportunity
-- (quote_requests): demo or pilot, scheduled -> completed -> decision.
-- Touches no existing data.
-- ============================================================================

create table if not exists public.pilots (
  id               uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  vendor_id        uuid not null references public.vendor_profiles(id) on delete cascade,
  kind             text not null default 'demo' check (kind in ('demo', 'pilot', 'site_visit')),
  status           text not null default 'proposed'
                   check (status in ('proposed', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_for    timestamptz,
  location         text,
  scope            text,             -- what the demo/pilot will show or prove
  success_criteria text,             -- what "success" means, agreed up front
  results          text,             -- what actually happened / measurements
  outcome          text check (outcome is null or outcome in ('passed', 'failed', 'inconclusive')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pilots_qr_idx on public.pilots (quote_request_id);
create index if not exists pilots_vendor_idx on public.pilots (vendor_id);

alter table public.pilots enable row level security;
do $$
begin
  -- A vendor sees only their own pilot records.
  begin
    create policy pilots_vendor_select on public.pilots
      for select to authenticated
      using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  exception when duplicate_object then null; end;
  -- Writes go through server routes (service role) which scope by ownership.
  begin
    create policy pilots_service_all on public.pilots
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
