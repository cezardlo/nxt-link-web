-- ============================================================================
-- NXT//LINK — First-deal fee-credit rework (task #7b / DECISIONS-2026-07-21 §5)
--
-- PURPOSE
-- Source-controls the columns the new tiered first-deal credit needs:
--   - founding_vendor / founding_set_by / founding_set_at: an operator-only,
--     audited flag. Normal invited vendors get up to $250 off their first
--     deal's NXT//LINK fee; a manually-approved "founding vendor" gets up to
--     $1,250. This flag must only ever be set via the admin-gated
--     PATCH /api/vendors/manage allowlist — never from a vendor-facing route
--     or a profile-creation default.
--   - free_deals_used / free_deals_reserved: the durable one-per-company
--     usage counters that make the credit server-authoritative instead of a
--     trusted client checkbox.
-- This migration is ADDITIVE ONLY. It adds no logic, changes no existing
-- column, and grants no new access. The new columns are inert until a later
-- slice teaches admin/deals + vendor/deals to read/write them.
--
-- LIVE-DB DRIFT NOTE (read before touching this table again)
-- `free_deals_used` and `free_deals_reserved` were confirmed via read-only
-- introspection (project yvykselwehxjwsqercjg, 2026-07-21) to ALREADY exist
-- on the live public.vendor_profiles table as
-- `integer NOT NULL DEFAULT 0` — they were never in a repo migration
-- (schema drift, same pattern the payments-ledger plan already flagged).
-- The two `ADD COLUMN IF NOT EXISTS` statements for them below are a
-- deliberate NO-OP against live: they exist only to bring the repo's
-- migration history in line with what production already has, so a fresh
-- environment (or a future teammate) ends up with the same schema.
-- `founding_vendor`, `founding_set_by`, and `founding_set_at` do NOT exist
-- live yet — this migration is what will create them, whenever it is
-- applied (Cesar's approval required; an agent must never run this against
-- the live database — see G6 in workplace/process/ENGINEERING-PROCESS.md).
--
-- ROLLBACK (per column — run only the ones that were actually applied)
--   alter table public.vendor_profiles drop column if exists founding_vendor;
--   alter table public.vendor_profiles drop column if exists founding_set_by;
--   alter table public.vendor_profiles drop column if exists founding_set_at;
--   -- free_deals_used / free_deals_reserved: do NOT drop these on rollback.
--   -- They predate this migration on live (drift) and other code already
--   -- reads them (src/app/api/vendor/deals/route.ts). Dropping them would
--   -- break that route, not just undo this migration.
--
-- Idempotent: every statement uses IF NOT EXISTS and is safe to run more
-- than once.
-- ============================================================================

alter table public.vendor_profiles
  add column if not exists founding_vendor boolean not null default false;

-- Audit trail for the founding_vendor flag: who set it and when. Free-text
-- operator identifier (matches the style of vendor_profiles.moderated_by),
-- not a foreign key, so it survives even if the admin's own record changes.
alter table public.vendor_profiles
  add column if not exists founding_set_by text;

alter table public.vendor_profiles
  add column if not exists founding_set_at timestamptz;

-- Durable one-per-company usage counters for the first-deal credit.
-- Confirmed already present on live with these exact types/defaults
-- (see drift note above) — IF NOT EXISTS makes this a no-op there.
alter table public.vendor_profiles
  add column if not exists free_deals_used integer not null default 0;

alter table public.vendor_profiles
  add column if not exists free_deals_reserved integer not null default 0;

-- No RLS change: public.vendor_profiles already has a service-role-only
-- policy from 20260629_vendor_signup_zoho.sql
-- (`vendor_profiles_service_all` — `for all to service_role using (true)
-- with check (true)`), and no other policy grants broader access. Every
-- vendor-facing read of these columns already goes through the service-role
-- client (src/app/api/vendor/deals/route.ts uses
-- `getSupabaseClient({ admin: true })`), so adding founding_vendor here does
-- not expose it to vendors directly — a later slice still must make sure no
-- vendor-facing route ever echoes founding_vendor back verbatim (it should
-- only ever change what cap resolveFirstDealCredit() picks, never be shown
-- as a raw flag to the vendor).
