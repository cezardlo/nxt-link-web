-- ============================================================================
-- NXT//LINK — company profile template: vendor fit / expertise / quick-fact
-- columns on vendor_profiles, plus the vendor_team table.
--
-- NOTE: this schema is ALREADY LIVE. It was applied to the production DB
-- outside the repo chain (verified against the live schema on 2026-07-13).
-- This file records it so the migration history matches reality — the same
-- reconciliation pattern used for the pre-platform tables. Idempotent; safe
-- to run against any environment.
-- ============================================================================

alter table public.vendor_profiles
  add column if not exists year_founded            int,
  add column if not exists employee_count          text,      -- e.g. '11-50'
  add column if not exists company_type            text,      -- manufacturer / distributor / integrator / consultant / service provider / software / hybrid
  add column if not exists languages               text[],
  add column if not exists response_time           text,      -- e.g. 'Same business day'
  add column if not exists projects_completed      int,
  add column if not exists emergency_available     boolean,
  add column if not exists cross_border            boolean,
  add column if not exists installation_available  boolean,
  add column if not exists pilot_available         boolean,
  add column if not exists main_expertise          text[],    -- up to 5, app-enforced
  add column if not exists problems_solved         text[],
  add column if not exists capabilities            text[],
  add column if not exists offering_families       text[],    -- products / equipment / technology / services
  add column if not exists cta_label               text,      -- storefront primary CTA label override
  add column if not exists visible_tabs            text[],    -- optional tab hiding; empty/null = all
  add column if not exists section_order           text[],
  add column if not exists featured_product_ids    uuid[],
  add column if not exists featured_service_ids    uuid[],
  add column if not exists brand_color              text;      -- accent hex for the storefront

-- Company team members shown on the public profile. No direct contact fields
-- by design — introductions run through NXT//LINK.
create table if not exists public.vendor_team (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid not null references public.vendor_profiles(id) on delete cascade,
  name           text not null,
  position       text,
  expertise      text,
  languages      text[],
  service_region text,
  photo_path     text,                 -- vendor-logos bucket, team_ prefix
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists vendor_team_vendor_idx on public.vendor_team (vendor_id);

alter table public.vendor_team enable row level security;
do $$
begin
  -- Public read: team members are public storefront content.
  begin
    create policy vendor_team_public_select on public.vendor_team
      for select using (true);
  exception when duplicate_object then null; end;
  -- A vendor manages only their own rows.
  begin
    create policy vendor_team_owner_all on public.vendor_team
      for all to authenticated
      using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()))
      with check (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  exception when duplicate_object then null; end;
  begin
    create policy vendor_team_service_all on public.vendor_team
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
