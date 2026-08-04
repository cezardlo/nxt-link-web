-- ============================================================================
-- NXT//LINK — vendor application: "needs more info" status + vendor-visible
-- message (2026-08-04 Batch B, Cesar's decision: send an application back
-- asking for a missing detail instead of rejecting a good vendor).
--
-- WHAT:
--   1. vendor_applications.status gains the value 'needs_info'
--      (was: pending / approved / rejected — check constraint created inline
--      in 20260702_vendor_applications_private_intake.sql:32-33; confirmed
--      unchanged in the Batch A audit of 2026-08-04. NOTE: migration files
--      are an incomplete record of the live schema — verify the constraint
--      in the Supabase dashboard before/after applying; the DO block below
--      drops ANY check constraint that mentions `status` and re-adds the
--      canonical one, so it is safe either way).
--   2. NEW COLUMN vendor_message text — the note an admin writes when sending
--      an application back. ⚠️ Deliberately NOT admin_notes: admin_notes may
--      hold internal comments and must never leak to a vendor. vendor_message
--      is written ONLY by the admin send-back action and shown ONLY to the
--      vendor who owns the application (via the server-side /api/apply/my
--      route — RLS still blocks all direct reads).
--   3. The guard trigger (guard_vendor_application_update) now also reverts
--      vendor_message for non-admin / non-service-role sessions — same
--      protection status/admin_notes already had. A vendor can never write
--      their own message column, even if an app bug tried.
--
-- Idempotent: safe to run more than once. Additive: nothing renamed/dropped.
-- Depends on: 20260702_vendor_applications_private_intake.sql,
--             20260716_vendor_application_guard_allow_service_role.sql
-- APPLY BEFORE/WITH the Batch B code deploy — the code selects vendor_message
-- and writes status 'needs_info'; PostgREST/check-constraint errors if the
-- schema isn't there first.
-- ============================================================================

-- 1. Widen the status check constraint to include 'needs_info'. Drop whatever
--    status-related check constraint exists (name may differ if the table was
--    touched in the dashboard), then re-add the canonical one.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'vendor_applications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.vendor_applications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.vendor_applications
  add constraint vendor_applications_status_check
  check (status in ('pending','approved','rejected','needs_info'));

-- 2. The vendor-visible message column (internal comments stay in admin_notes).
alter table public.vendor_applications
  add column if not exists vendor_message text;

comment on column public.vendor_applications.vendor_message is
  'Admin note sent to the vendor with a needs_info send-back. Vendor-visible (only ever returned to the application owner via server-side routes). NEVER put internal comments here — those belong in admin_notes.';

-- 3. Extend the moderation guard to cover vendor_message: only platform
--    admins or the trusted backend (service_role) may set it. Regular
--    authenticated sessions get it reverted, same as status/admin_notes.
create or replace function public.guard_vendor_application_update()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status         := old.status;
    new.admin_notes    := old.admin_notes;
    new.vendor_message := old.vendor_message;
    new.approved_at    := old.approved_at;
    new.auth_id        := old.auth_id;
  end if;
  return new;
end;
$function$;
