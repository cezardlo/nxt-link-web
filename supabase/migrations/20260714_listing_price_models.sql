-- ============================================================================
-- STATUS: FILED ONLY — NOT APPLIED. Do NOT run against the live database
-- without explicit owner approval (one shared Supabase project, live data).
-- ============================================================================
-- Normalized listing pricing. Phase 1 ships structured pricing INSIDE the
-- existing marketplace_products/services.pricing jsonb (no migration needed);
-- these tables are the Phase 2 normalization target so pricing can be
-- queried, faceted (price bands), alerted on (stale/expired), and audited.
-- Companion plan: docs/project/VENDOR_ONBOARDING_MASTER_AUDIT_2026-07-14.md §6.

-- One row per way-of-charging on one listing (a forklift can have a purchase
-- price AND a monthly rental AND a maintenance plan).
create table if not exists public.listing_price_models (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  listing_kind text not null check (listing_kind in ('product','service')),
  listing_id uuid not null,
  name text not null default '',
  method text not null default 'custom' check (method in (
    'exact','starting','range','per_unit','per_hour','per_day','per_week',
    'per_month','per_year','per_visit','per_project','per_user','per_facility',
    'rental','lease','subscription','quote','custom')),
  amount numeric,
  min_amount numeric,
  max_amount numeric,
  currency text not null default 'USD' check (currency in ('USD','MXN')),
  unit text not null default '',
  is_recurring boolean not null default false,
  billing_frequency text not null default '',
  min_quantity integer,
  max_quantity integer,
  min_contract_months integer,
  conditions text not null default '',
  included text not null default '',
  excluded text not null default '',
  effective_on date,
  expires_on date,
  visibility text not null default 'public' check (visibility in (
    'public','signed_in','after_details','after_request','private')),
  status text not null default 'active' check (status in ('active','archived')),
  last_confirmed_at timestamptz,
  last_confirmed_by uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_price_models_listing on public.listing_price_models(listing_kind, listing_id);
create index if not exists idx_price_models_vendor on public.listing_price_models(vendor_id);

-- Additional costs a client should know about (installation, travel, parts…).
create table if not exists public.listing_price_components (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  listing_kind text not null check (listing_kind in ('product','service')),
  listing_id uuid not null,
  price_model_id uuid references public.listing_price_models(id) on delete set null,
  name text not null,
  description text not null default '',
  amount numeric,
  min_amount numeric,
  max_amount numeric,
  unit text not null default '',
  is_required boolean not null default true,
  is_recurring boolean not null default false,
  conditions text not null default '',
  visibility text not null default 'public' check (visibility in (
    'public','signed_in','after_details','after_request','private')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_price_components_listing on public.listing_price_components(listing_kind, listing_id);

-- Quantity tiers: 1–9 units $100 · 10–49 $90 · 50+ $75.
create table if not exists public.listing_price_tiers (
  id uuid primary key default gen_random_uuid(),
  price_model_id uuid not null references public.listing_price_models(id) on delete cascade,
  min_quantity integer not null,
  max_quantity integer,
  unit_amount numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_price_tiers_model on public.listing_price_tiers(price_model_id);

create table if not exists public.listing_discounts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  listing_kind text not null check (listing_kind in ('product','service')),
  listing_id uuid not null,
  discount_type text not null check (discount_type in (
    'quantity','annual_contract','multi_location','bundle','returning_client','volume','custom')),
  description text not null default '',
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only price accuracy/audit trail (who confirmed, what changed, when).
create table if not exists public.price_review_history (
  id uuid primary key default gen_random_uuid(),
  price_model_id uuid not null references public.listing_price_models(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  action text not null check (action in ('created','updated','confirmed','expired','archived')),
  actor_auth_id uuid,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_price_history_model on public.price_review_history(price_model_id);

-- updated_at triggers (repo convention: per-table touch trigger).
create or replace function public.touch_pricing_row() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_price_models on public.listing_price_models;
create trigger trg_touch_price_models before update on public.listing_price_models
  for each row execute function public.touch_pricing_row();
drop trigger if exists trg_touch_price_components on public.listing_price_components;
create trigger trg_touch_price_components before update on public.listing_price_components
  for each row execute function public.touch_pricing_row();
drop trigger if exists trg_touch_listing_discounts on public.listing_discounts;
create trigger trg_touch_listing_discounts before update on public.listing_discounts
  for each row execute function public.touch_pricing_row();

-- RLS: service_role writes (server routes enforce ownership); vendors may read
-- their own rows. Buyer-visible pricing is served ONLY through server routes
-- that apply the visibility gate — no anonymous select policy on purpose.
alter table public.listing_price_models enable row level security;
alter table public.listing_price_components enable row level security;
alter table public.listing_price_tiers enable row level security;
alter table public.listing_discounts enable row level security;
alter table public.price_review_history enable row level security;

do $$ begin
  create policy price_models_service on public.listing_price_models for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy price_models_owner_read on public.listing_price_models for select
    using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  create policy price_components_service on public.listing_price_components for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy price_components_owner_read on public.listing_price_components for select
    using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  create policy price_tiers_service on public.listing_price_tiers for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy listing_discounts_service on public.listing_discounts for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  create policy price_history_service on public.price_review_history for all
    using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
