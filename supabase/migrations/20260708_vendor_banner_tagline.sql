-- ============================================================================
-- NXT//LINK — Facebook-style vendor profile: cover banner + tagline
-- Additive only: two new columns on vendor_profiles. Banner images reuse the
-- private 'vendor-logos' bucket (path prefix banner_). Touches no existing data.
-- ============================================================================

alter table public.vendor_profiles add column if not exists banner_path text;
alter table public.vendor_profiles add column if not exists tagline text;
