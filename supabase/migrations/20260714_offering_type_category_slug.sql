-- ============================================================================
-- STATUS: FILED ONLY — NOT APPLIED. Do NOT run against the live database
-- without explicit owner approval (one shared Supabase project, live data).
-- ============================================================================
-- Store the offering type (equipment | product | technology | service)
-- instead of deriving it at read time by regex (guided-search solutionTypeOf),
-- and link listings to the canonical categories taxonomy by slug alongside
-- the existing free-text category. Both columns additive and nullable;
-- backfill uses the same logic buyers see today, then vendors confirm in the
-- onboarding wizard / Seller Central.
-- Companion plan: docs/project/VENDOR_ONBOARDING_MASTER_AUDIT_2026-07-14.md §6.

alter table public.marketplace_products
  add column if not exists offering_type text
    check (offering_type in ('equipment','product','technology')),
  add column if not exists category_slug text;

alter table public.marketplace_services
  add column if not exists offering_type text default 'service'
    check (offering_type in ('service')),
  add column if not exists category_slug text;

create index if not exists idx_products_offering_type on public.marketplace_products(offering_type);
create index if not exists idx_products_category_slug on public.marketplace_products(category_slug);
create index if not exists idx_services_category_slug on public.marketplace_services(category_slug);

-- Backfill is intentionally NOT automated here: run the app-side backfill
-- (solutionTypeOf over published rows) behind vendor confirmation, per the
-- no-invented-data rule.
