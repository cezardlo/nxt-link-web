-- ============================================================================
-- NXT//LINK — security hardening (full-site audit 2026-07-28, finding H6)
-- Apply order: 3 of 3 for 2026-07-29.
--
-- WHAT: replace the world-readable public SELECT policies on three vendor
-- profile tables with policies scoped to APPROVED, moderation-active vendors.
--
-- CURRENT (live-verified) — each was written with NO `TO` clause, so it applies
-- to PUBLIC (incl. the anon role), and USES an unconditional `USING (true)`:
--   vendor_certifications_public_select  SELECT TO public  USING (true)
--   vendor_gallery_public_select         SELECT TO public  USING (true)
--   vendor_case_studies_public_select    SELECT TO public  USING (true)
--
-- WHY IT IS A HOLE: with the public anon key (shipped in the JS bundle) and no
-- account, anyone could read EVERY vendor's rows via PostgREST — certification
-- credential/licence numbers, gallery paths + captions, and case-study drafts —
-- regardless of whether that vendor is approved, pending, suspended, or banned,
-- and including in-progress drafts of vendors who never agreed to be public.
--
-- NEW: only rows whose vendor is `status = 'approved'` AND moderation-active are
-- publicly selectable. This mirrors the app's own public-storefront gate in
-- src/app/api/marketplace/vendor/[id]/route.ts:35-37 (status='approved' AND
-- effective moderation = active). It is STRICTER than, and never looser than,
-- that gate (a not-yet-auto-reactivated expired suspension reads as hidden here,
-- which is safe).
--
-- WHY IT DOES NOT BREAK A LEGITIMATE FLOW: the app reads these three tables
-- EXCLUSIVELY through the service-role client (marketplace/vendor/[id] uses
-- `getSupabaseClient({ admin: true })`), which bypasses RLS — so the app render
-- path is unaffected by this policy at all. The owning vendor still reads/writes
-- their OWN rows (incl. drafts) via the existing *_owner_all policy. This change
-- only closes the direct anon/authenticated PostgREST back door.
--
-- NOTE: vendor_case_studies has NO per-row status/published column (verified in
-- the table definition), so scoping is by the vendor's approval only. The
-- audit's illustrative SQL suggested `and status = 'published'` for this table;
-- that column does not exist and is intentionally omitted here.
-- Idempotent (drop-if-exists before each create).
-- ============================================================================

-- vendor_certifications
drop policy if exists vendor_certifications_public_select on public.vendor_certifications;
create policy vendor_certifications_public_select on public.vendor_certifications
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.vendor_profiles vp
      where vp.id = vendor_certifications.vendor_id
        and vp.status = 'approved'
        and coalesce(vp.moderation_status, 'active') = 'active'
    )
  );

-- vendor_gallery
drop policy if exists vendor_gallery_public_select on public.vendor_gallery;
create policy vendor_gallery_public_select on public.vendor_gallery
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.vendor_profiles vp
      where vp.id = vendor_gallery.vendor_id
        and vp.status = 'approved'
        and coalesce(vp.moderation_status, 'active') = 'active'
    )
  );

-- vendor_case_studies
drop policy if exists vendor_case_studies_public_select on public.vendor_case_studies;
create policy vendor_case_studies_public_select on public.vendor_case_studies
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.vendor_profiles vp
      where vp.id = vendor_case_studies.vendor_id
        and vp.status = 'approved'
        and coalesce(vp.moderation_status, 'active') = 'active'
    )
  );
