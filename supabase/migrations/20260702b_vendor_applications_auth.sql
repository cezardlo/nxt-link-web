-- ============================================================================
-- NXT//LINK — vendor accounts for the private intake system
-- Lets a vendor create an account and sign in to check status / edit their
-- OWN application. Still never exposes the catalog: a signed-in vendor can
-- only ever see their own row, never anyone else's (admin still sees all,
-- via the existing is_admin() policies from 20260702_...).
-- Idempotent. Depends on 20260702_vendor_applications_private_intake.sql.
-- ============================================================================

alter table public.vendor_applications
  add column if not exists auth_id uuid;

create unique index if not exists vendor_applications_auth_id_uniq
  on public.vendor_applications (auth_id) where auth_id is not null;

-- ---------------------------------------------------------------------------
-- Tighten INSERT: an anonymous submitter cannot claim an auth_id; a signed-in
-- vendor can only tag the application as their OWN account (or leave it
-- unlinked). The original blanket "with check (true)" is replaced so this is
-- actually enforced, not just additive.
-- ---------------------------------------------------------------------------
drop policy if exists vendor_applications_public_insert on public.vendor_applications;

do $$
begin
  begin
    create policy vendor_applications_anon_insert on public.vendor_applications
      for insert to anon with check (auth_id is null);
  exception when duplicate_object then null; end;

  begin
    create policy vendor_applications_authenticated_insert on public.vendor_applications
      for insert to authenticated with check (auth_id is null or auth_id = auth.uid());
  exception when duplicate_object then null; end;

  -- Owner access: a signed-in vendor may read/update ONLY their own row.
  -- (Combines with the existing admin-only policies via OR — admin still sees all.)
  begin
    create policy vendor_applications_owner_select on public.vendor_applications
      for select to authenticated using (auth_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy vendor_applications_owner_update on public.vendor_applications
      for update to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------------
-- Defense in depth: RLS lets an owner UPDATE their own row, but a non-admin
-- must never be able to change status/admin_notes/approved_at themselves —
-- only an admin approves/rejects. This is enforced even if someone bypasses
-- the app and calls the Supabase REST API directly with their own vendor JWT.
-- ---------------------------------------------------------------------------
create or replace function public.guard_vendor_application_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status      := old.status;
    new.admin_notes := old.admin_notes;
    new.approved_at := old.approved_at;
    new.auth_id     := old.auth_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_vendor_application_update on public.vendor_applications;
create trigger trg_guard_vendor_application_update
  before update on public.vendor_applications
  for each row execute function public.guard_vendor_application_update();
