-- ============================================================================
-- Vendor invite funnel (Wave 1, Onboarding slices 1-4).
-- One row per operator-issued invite: the 3-field capture, the /join/<token>
-- landing key, the reminder cadence timestamps (day 2 / day 5 / day 9 final
-- close per MASTER-PLAN §3 resolution #2), and the funnel status pipeline:
--   invited → reminded → clicked → account_created → profile_complete → listed
-- Terminal side-states: expired (30 days), opted_out (unsubscribe),
-- declined (operator marks "not now" / vendor replied no),
-- already_vendor (dedup hit at capture time — nothing was sent).
--
-- RLS: service-role only — all access goes through server API routes
-- (same pattern as 20260708_lock_internal_tables_rls.sql). Idempotent.
-- ============================================================================

create table if not exists public.vendor_invites (
  id                  uuid primary key default gen_random_uuid(),
  token               text not null unique,        -- 32+ char random; the /join/<token> key
  contact_name        text not null,
  company_name        text not null,
  email               text,                        -- stored lowercased
  phone               text,                        -- E.164; SMS is Phase 2 (not used yet)
  channel             text not null default 'email' check (channel in ('email','sms')),
  locale              text not null default 'en'  check (locale in ('en','es')),
  source              text not null default 'admin' check (source in ('admin','buyer','event')),
  invited_by          text,                        -- operator label ("cesar")
  consent_note        text,                        -- how SMS consent was obtained (Phase 2 compliance)
  status              text not null default 'invited' check (status in (
                        'invited','reminded','clicked','account_created',
                        'profile_complete','listed',
                        'expired','opted_out','declined','already_vendor')),
  -- per-stage timestamps (funnel measurement + reminder send-once guards)
  sent_at             timestamptz,
  reminded_2_at       timestamptz,                 -- day-2 reminder ("quoting is free")
  reminded_5_at       timestamptz,                 -- day-5 reminder (fee rules, pre-escrow Variant B)
  reminded_9_at       timestamptz,                 -- day-9 final close (Growth cadence, MASTER-PLAN §3.2)
  clicked_at          timestamptz,
  account_created_at  timestamptz,
  profile_complete_at timestamptz,
  listed_at           timestamptz,
  opted_out_at        timestamptz,
  expires_at          timestamptz not null default (now() + interval '30 days'),
  -- links filled as the vendor moves through the funnel
  auth_id             uuid,                        -- auth.users id at account creation
  vendor_id           uuid references public.vendor_profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  check (email is not null or phone is not null)
);

-- Dedup lookups at capture time + cron scans.
create index if not exists vendor_invites_email_idx   on public.vendor_invites (lower(email)) where email is not null;
create index if not exists vendor_invites_phone_idx   on public.vendor_invites (phone) where phone is not null;
create index if not exists vendor_invites_status_idx  on public.vendor_invites (status);
create index if not exists vendor_invites_created_idx on public.vendor_invites (created_at desc);

alter table public.vendor_invites enable row level security;
do $$ begin
  create policy vendor_invites_service_all on public.vendor_invites
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
