-- ============================================================================
-- NXT//LINK — in-app notifications (quote arrived, message, decision, lead,
-- pilot update). Additive only. Reads/writes go through ownership-scoped
-- server routes (service role). Touches no existing data.
-- ============================================================================

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  recipient        text not null check (recipient in ('buyer', 'vendor')),
  vendor_id        uuid references public.vendor_profiles(id) on delete cascade,
  buyer_email      text,
  quote_request_id uuid references public.quote_requests(id) on delete cascade,
  type             text not null,   -- new_lead | quote | decision | message | pilot
  title            text not null,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists notifications_vendor_idx on public.notifications (vendor_id, read_at);
create index if not exists notifications_buyer_idx on public.notifications (lower(buyer_email), read_at);

alter table public.notifications enable row level security;
do $$
begin
  begin
    create policy notifications_service_all on public.notifications
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
