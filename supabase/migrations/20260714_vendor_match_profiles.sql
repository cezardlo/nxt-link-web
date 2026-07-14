-- ============================================================================
-- STATUS: FILED ONLY — NOT APPLIED. Do NOT run against the live database
-- without explicit owner approval (one shared Supabase project, live data).
-- ============================================================================
-- Private vendor matching profile: who the vendor wants to be matched with,
-- coverage by mode (deliver / install / on-site / remote), minimum project
-- value, opportunity preferences, do-not-send exclusions, decline feedback,
-- and brands/equipment supported (the #1 industrial search axis).
-- Buyers never see this directly; it routes opportunities.
-- Companion plan: docs/project/VENDOR_ONBOARDING_MASTER_AUDIT_2026-07-14.md §6.

create table if not exists public.vendor_match_profiles (
  vendor_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  operation_types text[] not null default '{}',
  industries text[] not null default '{}',
  client_sizes text[] not null default '{}',
  facility_sqft_min integer,
  facility_sqft_max integer,
  locations_count_min integer,
  employee_count_min integer,
  -- Coverage keyed by mode: {"deliver":["El Paso"],"install":[...],"onsite":[...],"remote":["Nationwide"]}
  coverage jsonb not null default '{}'::jsonb,
  min_project_value numeric,
  typical_project_value numeric,
  max_project_capacity numeric,
  preferred_project_types text[] not null default '{}',
  preferred_timelines text[] not null default '{}',
  preferred_contract_lengths text[] not null default '{}',
  preferred_brands text[] not null default '{}',
  recurring_preference text not null default 'any' check (recurring_preference in ('recurring','one_time','any')),
  installation_required boolean,
  maintenance_required boolean,
  pilots_accepted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Do-not-send rules: opportunities matching an exclusion are never routed.
create table if not exists public.vendor_exclusions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  kind text not null check (kind in (
    'outside_service_area','below_min_value','above_capacity','unsupported_brand',
    'emergency_work','residential','government','international','no_clear_timeline',
    'industry','category','other')),
  value text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_vendor_exclusions_vendor on public.vendor_exclusions(vendor_id);

-- One reason per declined opportunity — feeds matching improvements.
create table if not exists public.opportunity_declines (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  quote_request_id uuid,
  reason text not null check (reason in (
    'outside_service_area','too_small','too_large','unsupported_equipment',
    'timeline_unavailable','wrong_industry','wrong_category','missing_information','other')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_opportunity_declines_vendor on public.opportunity_declines(vendor_id);

-- Brands / equipment supported: powers storefront ("Services Toyota, Hyster,
-- Zebra"), search facets, matching, and unsupported-brand exclusions.
create table if not exists public.vendor_brands (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  brand text not null,
  relationship text not null default 'services' check (relationship in ('sells','services','authorized','parts')),
  evidence_document_id uuid,
  verified_at timestamptz,   -- set only by NXT Link review, never self-served
  verified_by text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (vendor_id, brand, relationship)
);
create index if not exists idx_vendor_brands_vendor on public.vendor_brands(vendor_id);
create index if not exists idx_vendor_brands_brand on public.vendor_brands(lower(brand));

create or replace function public.touch_match_profile() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_match_profiles on public.vendor_match_profiles;
create trigger trg_touch_match_profiles before update on public.vendor_match_profiles
  for each row execute function public.touch_match_profile();

-- RLS: matching data is PRIVATE — service_role + owner only. vendor_brands is
-- the one buyer-facing table (public read: it renders on the storefront).
alter table public.vendor_match_profiles enable row level security;
alter table public.vendor_exclusions enable row level security;
alter table public.opportunity_declines enable row level security;
alter table public.vendor_brands enable row level security;

do $$ begin
  create policy match_profiles_service on public.vendor_match_profiles for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy match_profiles_owner on public.vendor_match_profiles for select
    using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  create policy vendor_exclusions_service on public.vendor_exclusions for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy vendor_exclusions_owner on public.vendor_exclusions for select
    using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  create policy opportunity_declines_service on public.opportunity_declines for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy vendor_brands_service on public.vendor_brands for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy vendor_brands_public_read on public.vendor_brands for select using (true);
exception when duplicate_object then null; end $$;
