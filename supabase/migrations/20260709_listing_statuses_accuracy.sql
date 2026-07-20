-- Marketplace publishing safety:
-- 1) Listing lifecycle grows from draft/published/archived to
--    draft / needs_review / ready / published / unpublished / archived.
-- 2) accuracy_confirmed_at records the vendor's "I confirm this information
--    is accurate" checkbox at publish time (required to publish).

alter table public.marketplace_products drop constraint if exists marketplace_products_status_check;
alter table public.marketplace_products add constraint marketplace_products_status_check
  check (status in ('draft','needs_review','ready','published','unpublished','archived'));
alter table public.marketplace_products add column if not exists accuracy_confirmed_at timestamptz;

alter table public.marketplace_services drop constraint if exists marketplace_services_status_check;
alter table public.marketplace_services add constraint marketplace_services_status_check
  check (status in ('draft','needs_review','ready','published','unpublished','archived'));
alter table public.marketplace_services add column if not exists accuracy_confirmed_at timestamptz;
