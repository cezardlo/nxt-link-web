-- ============================================================================
-- NXT//LINK — vendor company size + region
-- Adds two more intake fields, same "fixed list + fill it in yourself if it's
-- not there" pattern already used for supply_chain_stages: a dropdown of
-- common values, with a free-text fallback stored as-is when the vendor
-- picks "Other". Nothing here enforces the fixed list at the database level.
-- Idempotent. Depends on 20260702_vendor_applications_private_intake.sql.
-- ============================================================================

alter table public.vendor_applications
  add column if not exists company_size text,
  add column if not exists region text;
