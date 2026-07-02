-- ============================================================================
-- NXT//LINK — B2B Conference & Event Strategy platform
-- Internal intelligence + planning tables for the El Paso / Ciudad Juárez
-- event program: an event/organization intelligence catalog, a "global wow
-- ideas" catalog, target-company segmentation + invite-list building, event
-- concept building, and an execution pipeline.
--
-- Business rules:
--   * ALL tables here are PRIVATE admin intelligence. No public read path.
--     SELECT/INSERT/UPDATE/DELETE: admin only (public.is_admin(), same helper
--     that gates the rest of the NXT//LINK admin surface) + service_role for
--     server routes (which themselves require an admin session — see
--     src/lib/server/admin-session.ts and isAdminRequest()).
--   * Factual records (events, costs) REQUIRE a source URL and verification
--     date — the app refuses factual rows without them. Sample/demo rows are
--     explicitly flagged is_sample=true and are labeled in the UI.
--   * Audit fields on every table: created_by (auth uid when available),
--     created_at, updated_at (touch trigger).
-- Idempotent: safe to run more than once.
-- Depends on: 20260625_nxtlink_platform.sql, 20260626_nxtlink_rls_user.sql
--             20260702_vendor_applications_private_intake.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Shared touch-updated_at trigger (one function reused by every table here)
-- ---------------------------------------------------------------------------
create or replace function public.touch_event_strategy_row() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1) Event intelligence catalog: conferences, expos, chambers, associations,
--    economic-development groups.
-- ---------------------------------------------------------------------------
create table if not exists public.event_organizations (
  id                           uuid primary key default gen_random_uuid(),
  kind                         text not null default 'conference'
                               check (kind in ('conference','expo','chamber','association',
                                               'economic_development','other')),
  name                         text not null,
  location                     text,

  -- Factual-record integrity: where this info came from and when it was checked.
  source_url                   text not null,
  source_verified_on           date not null,

  audience                     text,                       -- who attends
  industries                   jsonb not null default '[]'::jsonb,
  attendees_estimate           text,                       -- stored as text: "~1,200 (2025)" — never an invented number
  relevance                    text,                       -- why it matters to NXT//LINK
  mission_fit                  text,                       -- fit with worker-support mission
  participation_recommendation text,                       -- attend / sponsor / booth / speak / skip + why
  estimated_cost               text,                       -- text band, e.g. "$500–$2,000 booth"
  cost_source_url              text,
  cost_verified_on             date,
  timing_frequency             text,                       -- "annual, spring", "monthly mixer", …
  priority                     text not null default 'medium'
                               check (priority in ('high','medium','low')),

  -- Scoring views (0–100, null = unscored): best-for-customers, best for
  -- vendors/partners, global-trend signal, El Paso–Juárez cross-border value.
  score_customers              integer check (score_customers between 0 and 100),
  score_vendors                integer check (score_vendors between 0 and 100),
  score_global_trends          integer check (score_global_trends between 0 and 100),
  score_cross_border           integer check (score_cross_border between 0 and 100),

  is_sample                    boolean not null default false,
  notes                        text,

  created_by                   uuid,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create index if not exists event_organizations_kind_idx      on public.event_organizations (kind);
create index if not exists event_organizations_priority_idx  on public.event_organizations (priority);
create index if not exists event_organizations_industries_idx on public.event_organizations using gin (industries);

drop trigger if exists trg_touch_event_organizations on public.event_organizations;
create trigger trg_touch_event_organizations before update on public.event_organizations
  for each row execute function public.touch_event_strategy_row();

-- ---------------------------------------------------------------------------
-- 2) Global "wow ideas" catalog: impressive worker-supportive tech/event ideas
--    seen elsewhere, with a local adaptation plan.
-- ---------------------------------------------------------------------------
create table if not exists public.wow_ideas (
  id                   uuid primary key default gen_random_uuid(),
  idea                 text not null,
  where_used           text,            -- where in the world it was used
  why_impressive       text,
  worker_support       text,            -- how it supports workers (never replaces them)
  local_adaptation     text,            -- how to adapt it for El Paso / Juárez
  difficulty           text not null default 'medium'
                       check (difficulty in ('low','medium','high')),
  cost_range           text,            -- text band, clearly an estimate
  target_local_company text,            -- which kind of local company it fits
  demo_concept         text,            -- how to demo it at a local event

  source_url           text,
  source_verified_on   date,
  is_sample            boolean not null default false,
  notes                text,

  created_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists wow_ideas_difficulty_idx on public.wow_ideas (difficulty);

drop trigger if exists trg_touch_wow_ideas on public.wow_ideas;
create trigger trg_touch_wow_ideas before update on public.wow_ideas
  for each row execute function public.touch_event_strategy_row();

-- ---------------------------------------------------------------------------
-- 3) Target companies: the invite universe — warehouses, manufacturers,
--    maquiladoras, logistics firms, suppliers, vendors, investors, consultants.
-- ---------------------------------------------------------------------------
create table if not exists public.target_companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  segment         text not null default 'other'
                  check (segment in ('warehouse','manufacturer','maquiladora','logistics',
                                     'supplier','vendor','investor','consultant','other')),
  industry        text,
  company_size    text,            -- same free-band convention as vendor_applications.company_size
  location        text,            -- "El Paso, TX", "Ciudad Juárez, CHIH", …
  pain_points     jsonb not null default '[]'::jsonb,
  tech_readiness  text
                  check (tech_readiness in ('low','medium','high')),
  decision_makers jsonb not null default '[]'::jsonb,  -- [{name, role, email?}] — internal CRM-style notes

  is_sample       boolean not null default false,
  notes           text,

  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists target_companies_segment_idx     on public.target_companies (segment);
create index if not exists target_companies_pain_points_idx on public.target_companies using gin (pain_points);

drop trigger if exists trg_touch_target_companies on public.target_companies;
create trigger trg_touch_target_companies before update on public.target_companies
  for each row execute function public.touch_event_strategy_row();

-- ---------------------------------------------------------------------------
-- 4) Event concepts: built from templates (Warehouse Technology Showcase,
--    Juárez Manufacturing Tech Day, Cross-Border Industrial Innovation Forum,
--    Smart Warehouse & Maquiladora Solutions Expo, Worker-Support Technology
--    Demo Day, Supply Chain Visibility Roundtable, Quality/Safety/Productivity
--    Tech Forum) or from scratch.
-- ---------------------------------------------------------------------------
create table if not exists public.event_concepts (
  id                    uuid primary key default gen_random_uuid(),
  template_key          text,            -- which template seeded it (null = from scratch)
  title                 text not null,
  audience              text,
  theme                 text,
  speakers              jsonb not null default '[]'::jsonb,
  vendors               jsonb not null default '[]'::jsonb,  -- vendor names / vendor_application ids
  demos                 jsonb not null default '[]'::jsonb,
  venue                 text,
  sponsors              jsonb not null default '[]'::jsonb,
  invitees              jsonb not null default '[]'::jsonb,  -- target_company ids / names
  value_statement       text,            -- why attendees win
  anti_sales_safeguards text,            -- how we keep it useful, not a pitch-fest
  follow_up_plan        text,
  revenue_model         text,

  status                text not null default 'draft'
                        check (status in ('draft','active','archived')),
  is_sample             boolean not null default false,
  notes                 text,

  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists event_concepts_status_idx on public.event_concepts (status);

drop trigger if exists trg_touch_event_concepts on public.event_concepts;
create trigger trg_touch_event_concepts before update on public.event_concepts
  for each row execute function public.touch_event_strategy_row();

-- ---------------------------------------------------------------------------
-- 5) Invite lists + members: match vendors/companies to an event or concept.
-- ---------------------------------------------------------------------------
create table if not exists public.invite_lists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  purpose       text,
  event_org_id  uuid references public.event_organizations (id) on delete set null,
  concept_id    uuid references public.event_concepts (id) on delete set null,

  is_sample     boolean not null default false,

  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_touch_invite_lists on public.invite_lists;
create trigger trg_touch_invite_lists before update on public.invite_lists
  for each row execute function public.touch_event_strategy_row();

create table if not exists public.invite_list_members (
  id                    uuid primary key default gen_random_uuid(),
  list_id               uuid not null references public.invite_lists (id) on delete cascade,
  -- A member is a target company OR a vendor application (exactly one).
  company_id            uuid references public.target_companies (id) on delete cascade,
  vendor_application_id uuid references public.vendor_applications (id) on delete cascade,
  role_at_event         text,            -- attendee / demo / sponsor / speaker / booth
  status                text not null default 'proposed'
                        check (status in ('proposed','invited','confirmed','declined')),
  notes                 text,

  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  check (num_nonnulls(company_id, vendor_application_id) = 1)
);

create index if not exists invite_list_members_list_idx on public.invite_list_members (list_id);
create unique index if not exists invite_list_members_company_uniq
  on public.invite_list_members (list_id, company_id) where company_id is not null;
create unique index if not exists invite_list_members_vendor_uniq
  on public.invite_list_members (list_id, vendor_application_id) where vendor_application_id is not null;

drop trigger if exists trg_touch_invite_list_members on public.invite_list_members;
create trigger trg_touch_invite_list_members before update on public.invite_list_members
  for each row execute function public.touch_event_strategy_row();

-- ---------------------------------------------------------------------------
-- 6) Execution pipeline: research → selection → partner outreach → invite
--    building → vendor recruitment → demo planning → marketing → execution →
--    follow-up → pilot conversion. Outcomes tracked per item.
-- ---------------------------------------------------------------------------
create table if not exists public.event_pipeline_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  stage         text not null default 'research'
                check (stage in ('research','selection','partner_outreach','invite_building',
                                 'vendor_recruitment','demo_planning','marketing','execution',
                                 'follow_up','pilot_conversion')),
  status        text not null default 'todo'
                check (status in ('todo','in_progress','blocked','done')),
  concept_id    uuid references public.event_concepts (id) on delete set null,
  event_org_id  uuid references public.event_organizations (id) on delete set null,
  owner         text,
  due_on        date,
  notes         text,
  -- Outcome counters: {"meetings": 0, "audits": 0, "pilots": 0, "paid_projects": 0}
  outcomes      jsonb not null default '{}'::jsonb,

  is_sample     boolean not null default false,

  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists event_pipeline_items_stage_idx  on public.event_pipeline_items (stage);
create index if not exists event_pipeline_items_status_idx on public.event_pipeline_items (status);

drop trigger if exists trg_touch_event_pipeline_items on public.event_pipeline_items;
create trigger trg_touch_event_pipeline_items before update on public.event_pipeline_items
  for each row execute function public.touch_event_strategy_row();

-- ---------------------------------------------------------------------------
-- 7) Vendor application intake: the extra profile fields the event program
--    needs (certifications, technology category, pain points solved, target
--    company types, demo capabilities, conference interests, participation
--    preference, budget range, worker-support value proposition, consent).
--    Same "fixed list + free text fallback" convention as offering_types.
-- ---------------------------------------------------------------------------
alter table public.vendor_applications
  add column if not exists certifications        jsonb default '[]'::jsonb,
  add column if not exists technology_category   text,
  add column if not exists pain_points_solved    jsonb default '[]'::jsonb,
  add column if not exists target_company_types  jsonb default '[]'::jsonb,
  add column if not exists demo_capabilities     text,
  add column if not exists conference_interests  jsonb default '[]'::jsonb,
  add column if not exists participation_preference text,
  add column if not exists budget_range          text,
  add column if not exists worker_support_value  text,
  add column if not exists consent_terms_at      timestamptz;

create index if not exists vendor_applications_pain_points_idx
  on public.vendor_applications using gin (pain_points_solved);
create index if not exists vendor_applications_target_types_idx
  on public.vendor_applications using gin (target_company_types);

-- ---------------------------------------------------------------------------
-- Row Level Security — admin-only intelligence, no public path at all.
-- ---------------------------------------------------------------------------
alter table public.event_organizations  enable row level security;
alter table public.wow_ideas            enable row level security;
alter table public.target_companies    enable row level security;
alter table public.event_concepts      enable row level security;
alter table public.invite_lists        enable row level security;
alter table public.invite_list_members enable row level security;
alter table public.event_pipeline_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['event_organizations','wow_ideas','target_companies',
                           'event_concepts','invite_lists','invite_list_members',
                           'event_pipeline_items']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_service_all', t);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      t || '_service_all', t);
  end loop;
end $$;
