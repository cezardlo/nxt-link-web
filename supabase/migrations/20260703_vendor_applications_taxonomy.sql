-- ============================================================================
-- NXT//LINK — vendor offering type + supply-chain stage
-- Lets the intake form capture WHAT KIND of offering a vendor has (not just
-- the problem it solves) and WHERE in the supply chain it applies — so the
-- private catalog can be filtered by "it's a receiving thing" / "it's my
-- trucks" / "customs is killing me" once the catalog view is built.
-- supply_chain_stages may include values outside the fixed list (a vendor's
-- own "Other" text) — the admin decides whether to promote a custom value
-- into the permanent taxonomy or map it to an existing stage; nothing here
-- enforces the fixed list at the database level, by design.
-- Idempotent. Depends on 20260702_vendor_applications_private_intake.sql.
-- ============================================================================

alter table public.vendor_applications
  add column if not exists offering_types      jsonb default '[]'::jsonb,
  add column if not exists supply_chain_stages jsonb default '[]'::jsonb;

create index if not exists vendor_applications_offering_types_idx
  on public.vendor_applications using gin (offering_types);
create index if not exists vendor_applications_supply_chain_stages_idx
  on public.vendor_applications using gin (supply_chain_stages);
