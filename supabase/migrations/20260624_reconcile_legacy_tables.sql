-- ============================================================================
-- NXT//LINK — reconcile legacy tables BEFORE the platform chain applies.
-- The live database (pre-platform era) already contains:
--   * vendor_applications — an old chatbot-era shape (website / regions /
--     commission_ok / deal_size / pilot_terms ...), 0 rows, incompatible with
--     the private-intake shape created by 20260702. Without this rename,
--     20260702's `create table if not exists` would silently no-op onto the
--     wrong shape and every /apply query would break. Renamed aside so
--     20260702 can create the real table. Guarded: only renames the LEGACY
--     shape (commission_ok present, public_ref absent) — never the new one.
--   * vendors (14k-row scraped catalog powering /vendors) and leads
--     (chatbot-era CRM shape, live rows) — both handled inside 20260705,
--     which names its new account-link table vendor_accounts and extends
--     leads additively instead of colliding.
-- Idempotent: safe to run more than once.
-- ============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vendor_applications'
      and column_name = 'commission_ok'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vendor_applications'
      and column_name = 'public_ref'
  ) then
    alter table public.vendor_applications rename to vendor_applications_legacy;
    comment on table public.vendor_applications_legacy is
      'Pre-platform vendor_applications shape (0 rows at rename time). Preserved for forensics; superseded by 20260702_vendor_applications_private_intake.sql.';
  end if;
end $$;
