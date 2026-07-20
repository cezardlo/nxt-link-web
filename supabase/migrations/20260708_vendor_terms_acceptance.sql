-- ============================================================================
-- NXT//LINK — vendor agreement acceptance (revenue protection, build step 1)
-- Additive only: records which version of the NXT//LINK vendor terms a vendor
-- accepted, and when. A vendor cannot publish listings until this matches the
-- current terms version (enforced in the listings publish route). Touches no
-- existing data.
-- ============================================================================

alter table public.vendor_profiles add column if not exists terms_accepted_version text;
alter table public.vendor_profiles add column if not exists terms_accepted_at timestamptz;
