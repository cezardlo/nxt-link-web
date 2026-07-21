-- ============================================================================
-- NXT//LINK — account-level quote cart (Wave 1 task #4: bundled quote requests)
-- Additive only. Same identity + RLS model as saved_listings: keyed by the
-- buyer's verified email, all access via ownership-scoped server routes
-- (service role). Anonymous visitors keep a localStorage cart; on sign-in the
-- local cart merges into these rows so it follows the account across devices.
-- ============================================================================

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  listing_id  uuid not null,
  kind        text not null check (kind in ('product', 'service')),
  qty         integer not null default 1 check (qty >= 1 and qty <= 999),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (buyer_email, listing_id)
);
create index if not exists cart_items_buyer_idx on public.cart_items (lower(buyer_email));

alter table public.cart_items enable row level security;
do $$
begin
  begin
    create policy cart_items_service_all on public.cart_items
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
