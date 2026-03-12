-- NXT LINK — Technology Intelligence Graph Schema
-- Migration: 20260304_graph_schema.sql
--
-- Adds 7 new tables for the full intelligence graph:
--   companies, technologies, products, patents,
--   graph_signals, edges, discovery_sources

-- ENUM TYPES
do $$ begin
  create type public.signal_type_enum as enum (
    'patent_filing','grant_award','product_launch','partnership',
    'hiring_spike','funding','expansion','merger'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.edge_relationship_enum as enum (
    'builds','develops','filed','partnered_with',
    'acquired','competes_with','supplies_to'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.discovery_source_type_enum as enum (
    'government','conference','directory','news','patent','research'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.discovery_source_status_enum as enum ('active','paused','error');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.technology_maturity_enum as enum ('emerging','growing','mature','declining');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.edge_entity_type_enum as enum ('company','technology','product','patent');
exception when duplicate_object then null;
end $$;

-- 1. COMPANIES
create table if not exists public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  website          text,
  location         text,
  industry         text,
  founded_year     integer,
  employee_count   integer,
  revenue_range    text,
  lat              numeric(9, 6),
  lon              numeric(9, 6),
  logo_url         text,
  source_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.companies enable row level security;
drop policy if exists "anon_read_companies" on public.companies;
create policy "anon_read_companies" on public.companies for select to anon using (true);
grant select on table public.companies to anon;
create index if not exists idx_companies_name on public.companies using gin(to_tsvector('english', name));
create index if not exists idx_companies_industry on public.companies(industry);
create index if not exists idx_companies_lat_lon on public.companies(lat, lon) where lat is not null and lon is not null;

-- 2. TECHNOLOGIES
create table if not exists public.technologies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  category          text,
  maturity_level    public.technology_maturity_enum not null default 'emerging',
  first_detected_at timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
alter table public.technologies enable row level security;
drop policy if exists "anon_read_technologies" on public.technologies;
create policy "anon_read_technologies" on public.technologies for select to anon using (true);
grant select on table public.technologies to anon;
create index if not exists idx_technologies_category on public.technologies(category);
create index if not exists idx_technologies_name_fts on public.technologies using gin(to_tsvector('english', name));

-- 3. PRODUCTS
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  description   text,
  technology_id uuid references public.technologies(id) on delete set null,
  url           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "anon_read_products" on public.products;
create policy "anon_read_products" on public.products for select to anon using (true);
grant select on table public.products to anon;
create index if not exists idx_products_company_id on public.products(company_id);
create index if not exists idx_products_technology_id on public.products(technology_id) where technology_id is not null;

-- 4. PATENTS
create table if not exists public.patents (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  abstract            text,
  filing_date         date,
  patent_number       text,
  assignee_company_id uuid references public.companies(id) on delete set null,
  technology_ids      uuid[] default '{}',
  source_url          text,
  created_at          timestamptz not null default now()
);
alter table public.patents enable row level security;
drop policy if exists "anon_read_patents" on public.patents;
create policy "anon_read_patents" on public.patents for select to anon using (true);
grant select on table public.patents to anon;
create index if not exists idx_patents_assignee_company on public.patents(assignee_company_id) where assignee_company_id is not null;
create index if not exists idx_patents_filing_date on public.patents(filing_date desc) where filing_date is not null;
create index if not exists idx_patents_title_fts on public.patents using gin(to_tsvector('english', title));

-- 5. GRAPH_SIGNALS (named to avoid collision with existing signals table)
create table if not exists public.graph_signals (
  id            uuid primary key default gen_random_uuid(),
  type          public.signal_type_enum not null,
  title         text not null,
  description   text,
  company_id    uuid references public.companies(id) on delete set null,
  technology_id uuid references public.technologies(id) on delete set null,
  detected_at   timestamptz not null default now(),
  source_url    text,
  confidence    numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  created_at    timestamptz not null default now()
);
alter table public.graph_signals enable row level security;
drop policy if exists "anon_read_graph_signals" on public.graph_signals;
create policy "anon_read_graph_signals" on public.graph_signals for select to anon using (true);
grant select on table public.graph_signals to anon;
create index if not exists idx_graph_signals_type on public.graph_signals(type);
create index if not exists idx_graph_signals_company_id on public.graph_signals(company_id) where company_id is not null;
create index if not exists idx_graph_signals_detected_at on public.graph_signals(detected_at desc);

-- 6. EDGES (graph relationships)
create table if not exists public.edges (
  id            uuid primary key default gen_random_uuid(),
  source_type   public.edge_entity_type_enum not null,
  source_id     uuid not null,
  target_type   public.edge_entity_type_enum not null,
  target_id     uuid not null,
  relationship  public.edge_relationship_enum not null,
  confidence    numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  evidence_url  text,
  created_at    timestamptz not null default now(),
  unique (source_type, source_id, target_type, target_id, relationship)
);
alter table public.edges enable row level security;
drop policy if exists "anon_read_edges" on public.edges;
create policy "anon_read_edges" on public.edges for select to anon using (true);
grant select on table public.edges to anon;
create index if not exists idx_edges_source on public.edges(source_type, source_id);
create index if not exists idx_edges_target on public.edges(target_type, target_id);
create index if not exists idx_edges_relationship on public.edges(relationship);

-- 7. DISCOVERY_SOURCES
create table if not exists public.discovery_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            public.discovery_source_type_enum not null,
  url             text not null,
  last_crawled_at timestamptz,
  status          public.discovery_source_status_enum not null default 'active',
  cadence_hours   integer not null default 24 check (cadence_hours > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.discovery_sources enable row level security;
drop policy if exists "anon_read_discovery_sources" on public.discovery_sources;
create policy "anon_read_discovery_sources" on public.discovery_sources for select to anon using (true);
grant select on table public.discovery_sources to anon;
create index if not exists idx_discovery_sources_type on public.discovery_sources(type);
create index if not exists idx_discovery_sources_status on public.discovery_sources(status);

-- REALTIME subscriptions
do $$ begin alter publication supabase_realtime add table public.graph_signals; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.edges; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.companies; exception when duplicate_object then null; end $$;

-- SEED default discovery sources
insert into public.discovery_sources (name, type, url, cadence_hours, status)
select * from (values
  ('USPTO Patent Full-Text',       'patent'::public.discovery_source_type_enum,     'https://efts.uspto.gov/LATEST/search-fields',          24, 'active'::public.discovery_source_status_enum),
  ('SAM.gov Contract Awards',      'government'::public.discovery_source_type_enum, 'https://api.sam.gov/opportunities/v2/search',           6,  'active'::public.discovery_source_status_enum),
  ('USASpending Federal Awards',   'government'::public.discovery_source_type_enum, 'https://api.usaspending.gov/api/v2/awards/',            12, 'active'::public.discovery_source_status_enum),
  ('SBIR.gov Awards',              'government'::public.discovery_source_type_enum, 'https://api.sbir.gov/public/api/awards',                24, 'active'::public.discovery_source_status_enum),
  ('TechCrunch News',              'news'::public.discovery_source_type_enum,       'https://techcrunch.com/feed/',                          1,  'active'::public.discovery_source_status_enum),
  ('Defense One News',             'news'::public.discovery_source_type_enum,       'https://www.defenseone.com/rss/all/',                   1,  'active'::public.discovery_source_status_enum),
  ('arXiv cs.AI Research',         'research'::public.discovery_source_type_enum,   'https://export.arxiv.org/rss/cs.AI',                   24, 'active'::public.discovery_source_status_enum)
) as t(name, type, url, cadence_hours, status)
where not exists (select 1 from public.discovery_sources limit 1);
