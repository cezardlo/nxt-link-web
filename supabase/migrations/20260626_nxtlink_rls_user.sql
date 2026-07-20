-- ============================================================================
-- NXT//LINK — per-user Row Level Security
-- Apply AFTER 20260625_nxtlink_platform.sql.
-- Maps Supabase Auth users to platform_users and scopes data by ownership so
-- clients only see their own requests and vendors only see their own quotes.
-- Server-side service-role writes still bypass RLS (that path is unchanged).
-- Idempotent.
-- ============================================================================

-- 1) Auto-create a platform_users row when a new auth user signs up ----------
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.platform_users (auth_id, email, role)
  values (new.id, new.email, 'client')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 2) Identity helpers --------------------------------------------------------
create or replace function public.current_pu_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.platform_users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.current_pu_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.platform_users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_pu_role() in ('admin','super_admin'), false);
$$;

-- 3) Per-user policies (RLS already enabled by the prior migration) ----------
-- helper to create a policy only if missing
do $$
declare
  pol record;
begin
  -- Clients own their requests; admins see all
  begin
    create policy client_requests_owner_select on public.client_requests
      for select to authenticated using (client_id = public.current_pu_id() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy client_requests_owner_write on public.client_requests
      for all to authenticated
      using (client_id = public.current_pu_id() or public.is_admin())
      with check (client_id = public.current_pu_id() or public.is_admin());
  exception when duplicate_object then null; end;

  -- A client can read their own request's status history; admins all
  begin
    create policy status_history_owner_select on public.request_status_history
      for select to authenticated using (
        public.is_admin() or exists (
          select 1 from public.client_requests r
          where r.id = request_id and r.client_id = public.current_pu_id()));
  exception when duplicate_object then null; end;

  -- Vendors own their templates / saved quotes / responses; admins all
  begin
    create policy quote_templates_owner_all on public.quote_templates
      for all to authenticated
      using (vendor_id = public.current_pu_id() or public.is_admin())
      with check (vendor_id = public.current_pu_id() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy saved_quotes_owner_all on public.saved_quotes
      for all to authenticated
      using (vendor_id = public.current_pu_id() or public.is_admin())
      with check (vendor_id = public.current_pu_id() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy vendor_responses_owner_all on public.vendor_responses
      for all to authenticated
      using (vendor_id = public.current_pu_id() or public.is_admin())
      with check (vendor_id = public.current_pu_id() or public.is_admin());
  exception when duplicate_object then null; end;

  -- Vendors see opportunities routed to them; admins all
  begin
    create policy vendor_opportunities_owner_select on public.vendor_opportunities
      for select to authenticated using (vendor_id = public.current_pu_id() or public.is_admin());
  exception when duplicate_object then null; end;

  -- A user reads their own platform_users row; admins all
  begin
    create policy platform_users_self_select on public.platform_users
      for select to authenticated using (auth_id = auth.uid() or public.is_admin());
  exception when duplicate_object then null; end;

  -- Admin-only tables: only admins (authenticated) may read
  begin
    create policy admin_notes_admin_only on public.admin_notes
      for select to authenticated using (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy ai_draft_logs_admin_only on public.ai_draft_logs
      for select to authenticated using (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy audit_log_admin_only on public.platform_audit_log
      for select to authenticated using (public.is_admin());
  exception when duplicate_object then null; end;
end $$;

-- NOTE: assign admin role manually after signup, e.g.:
--   update public.platform_users set role = 'admin' where email = 'you@nxtlink.com';
