-- ============================================================================
-- NXT//LINK — account-level saved listings (survive device switches)
-- Additive only. Keyed by the buyer's verified email (same identity model as
-- quote_requests). All access via ownership-scoped server routes.
-- ============================================================================

create table if not exists public.saved_listings (
  id          uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  listing_id  uuid not null,
  kind        text not null check (kind in ('product', 'service')),
  created_at  timestamptz not null default now(),
  unique (buyer_email, listing_id)
);
create index if not exists saved_listings_buyer_idx on public.saved_listings (lower(buyer_email));

alter table public.saved_listings enable row level security;
do $$
begin
  begin
    create policy saved_listings_service_all on public.saved_listings
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
