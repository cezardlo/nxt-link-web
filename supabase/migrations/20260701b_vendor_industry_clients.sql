-- ============================================================================
-- NXT//LINK — vendor industry + target-client fields, for instant organization
-- Lets a company say which industries they work in and what kind of clients
-- they're looking for, on top of the products/services (categories) they
-- already sell — so the directory can filter instantly on all three.
-- Idempotent: safe to run more than once.
-- ============================================================================

alter table public.vendor_profiles
  add column if not exists industries   jsonb default '[]'::jsonb,
  add column if not exists client_types jsonb default '[]'::jsonb;

create index if not exists vendor_profiles_industries_idx
  on public.vendor_profiles using gin (industries);
create index if not exists vendor_profiles_client_types_idx
  on public.vendor_profiles using gin (client_types);
