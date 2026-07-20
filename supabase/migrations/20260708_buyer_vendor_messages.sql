-- ============================================================================
-- NXT//LINK — buyer <-> vendor messaging (user-requested chat)
-- Additive only. One thread per opportunity (quote_requests row). All reads
-- and writes go through ownership-scoped server routes (service role); no
-- direct client access. Touches no existing data.
-- ============================================================================

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  sender           text not null check (sender in ('buyer', 'vendor')),
  body             text not null,
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);
create index if not exists messages_qr_idx on public.messages (quote_request_id, created_at);

alter table public.messages enable row level security;
do $$
begin
  begin
    create policy messages_service_all on public.messages
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
