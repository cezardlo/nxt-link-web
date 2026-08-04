-- ============================================================================
-- NXT//LINK — vendor application: multi-select locations + customer types
-- (2026-08-04 vendor-application batch, Cesar items 6).
--
-- WHAT: vendors can serve more than one place and more than one customer
-- type, so the single-value `region` / `target_customer` columns gain array
-- companions:
--
--   regions           jsonb default '[]'   — e.g. ["El Paso", "Las Cruces"]
--   target_customers  jsonb default '[]'   — e.g. ["Manufacturers", "3PL providers"]
--
-- BACKWARD COMPATIBILITY: the legacy single-value `region` / `target_customer`
-- columns are KEPT and the app writes the first picked value into them, so
-- every pre-existing reader (admin review screen, approval mapping) keeps
-- working whether or not it knows about the arrays. Existing rows are
-- backfilled below. Nothing is dropped or renamed.
--
-- Idempotent. Depends on 20260704_vendor_applications_size_region.sql.
-- APPLY BEFORE/WITH the code deploy that reads these columns — PostgREST
-- errors on selecting a column that does not exist yet.
-- ============================================================================

alter table public.vendor_applications
  add column if not exists regions jsonb default '[]'::jsonb,
  add column if not exists target_customers jsonb default '[]'::jsonb;

-- Backfill existing rows: the one stored value becomes a one-element array.
update public.vendor_applications
  set regions = jsonb_build_array(region)
  where region is not null and btrim(region) <> ''
    and (regions is null or regions = '[]'::jsonb);

update public.vendor_applications
  set target_customers = jsonb_build_array(target_customer)
  where target_customer is not null and btrim(target_customer) <> ''
    and (target_customers is null or target_customers = '[]'::jsonb);

create index if not exists vendor_applications_regions_idx
  on public.vendor_applications using gin (regions);
create index if not exists vendor_applications_target_customers_idx
  on public.vendor_applications using gin (target_customers);
