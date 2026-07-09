-- ============================================================================
-- NXT//LINK — vendor profile logo + structured case studies
-- Additive only: adds a logo column to vendor_profiles and a new
-- vendor_case_studies table (up to 3 enforced at the app layer). Touches no
-- existing data. Reuses the existing private 'vendor-logos' storage bucket
-- created in 20260702_vendor_applications_private_intake.
-- ============================================================================

alter table public.vendor_profiles add column if not exists logo_path text;

create table if not exists public.vendor_case_studies (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendor_profiles(id) on delete cascade,
  title       text not null,
  challenge   text,
  solution    text,
  result      text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists vendor_case_studies_vendor_idx on public.vendor_case_studies (vendor_id);

alter table public.vendor_case_studies enable row level security;

do $$
begin
  -- Public read: profile case studies are marketing content shown publicly.
  begin
    create policy vendor_case_studies_public_select on public.vendor_case_studies
      for select using (true);
  exception when duplicate_object then null; end;
  -- A vendor manages ONLY their own case studies (matched via their profile's auth_id).
  begin
    create policy vendor_case_studies_owner_all on public.vendor_case_studies
      for all to authenticated
      using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()))
      with check (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  exception when duplicate_object then null; end;
  -- Service role (server routes) full access.
  begin
    create policy vendor_case_studies_service_all on public.vendor_case_studies
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
