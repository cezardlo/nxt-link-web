-- ============================================================================
-- NXT//LINK — ONE vendor application per company (2026-08-04 batch, Cesar
-- item 2). Database backstop for the server-side resume logic in
-- src/app/api/apply/submit/route.ts (which UPDATES the existing row instead
-- of inserting a second one):
--
--   1. one application per ACCOUNT   — unique on auth_id where set
--   2. one application per EMAIL among anonymous (unclaimed) submissions
--
-- APPLY ORDER / EXISTING DATA: as of 2026-08-04 the live table is empty
-- (verified by the 2026-07-30 flow audit: vendor_applications = 0 rows), so
-- both indexes build cleanly. If duplicates ever appear before this is
-- applied, the CREATE INDEX will fail — de-duplicate first, keeping the
-- NEWEST row per key (the app always treats the newest as the live one):
--
--   delete from public.vendor_applications a
--   using public.vendor_applications b
--   where a.auth_id is not null and a.auth_id = b.auth_id
--     and a.created_at < b.created_at;
--
--   delete from public.vendor_applications a
--   using public.vendor_applications b
--   where a.auth_id is null and b.auth_id is null
--     and lower(a.email) = lower(b.email)
--     and a.created_at < b.created_at;
--
-- Idempotent. Depends on 20260702b_vendor_applications_auth.sql (auth_id).
-- ============================================================================

create unique index if not exists vendor_applications_one_per_account
  on public.vendor_applications (auth_id)
  where auth_id is not null;

create unique index if not exists vendor_applications_one_per_anon_email
  on public.vendor_applications (lower(email))
  where auth_id is null;
