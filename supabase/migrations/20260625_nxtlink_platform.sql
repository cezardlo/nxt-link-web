-- ============================================================================
-- NXT//LINK AI Vendor Discovery Platform — core schema
-- Client intake · protected quote packets · vendor quotes · AI audit · security
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles / users
-- ---------------------------------------------------------------------------
create table if not exists public.platform_users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid,                       -- maps to auth.users when auth is wired
  role        text not null default 'client'
              check (role in ('public','client','vendor','admin','super_admin')),
  email       text,
  full_name   text,
  company     text,
  locale      text default 'en' check (locale in ('en','es')),
  mfa_enabled boolean default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Client requests + intake answers
-- ---------------------------------------------------------------------------
create table if not exists public.client_requests (
  id                 uuid primary key default gen_random_uuid(),
  public_ref         text unique default ('REQ-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  client_id          uuid references public.platform_users(id),
  locale             text default 'en',
  -- structured intake
  category           text,
  problem            text,
  quantity           text,
  location           text,
  deadline           text,
  urgency            text,
  budget_range       text,
  current_vendor     text,
  -- confidentiality / permissions
  nda_required       boolean default false,
  mnda_required      boolean default false,
  share_summary      boolean default true,
  share_budget       boolean default false,
  share_documents    boolean default false,
  hide_identity      boolean default true,
  vendor_scope       text default 'both' check (vendor_scope in ('local','global','both')),
  -- AI artefacts
  intake_answers     jsonb default '[]'::jsonb,   -- [{q,a}]
  ai_summary         jsonb,                        -- structured request summary
  missing_info       jsonb default '[]'::jsonb,
  recommended_categories jsonb default '[]'::jsonb,
  -- pipeline
  status             text default 'request_received',
  pipeline_stage     text default 'new_request',
  contact_email      text,
  contact_name       text,
  source             text default 'intake_assistant',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists client_requests_status_idx on public.client_requests(status);
create index if not exists client_requests_created_idx on public.client_requests(created_at desc);

create table if not exists public.request_status_history (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid references public.client_requests(id) on delete cascade,
  from_status text,
  to_status   text,
  changed_by  text default 'system',
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Files (private by default)
-- ---------------------------------------------------------------------------
create table if not exists public.request_files (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid references public.client_requests(id) on delete cascade,
  uploaded_by     uuid references public.platform_users(id),
  file_name       text,
  file_type       text,
  storage_path    text,
  visibility      text default 'private'
                  check (visibility in ('private','admin_only','selected_vendors','selected_client')),
  nda_required    boolean default false,
  approved_to_share boolean default false,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Protected quote packets (admin-built, anonymized)
-- ---------------------------------------------------------------------------
create table if not exists public.quote_packets (
  id              uuid primary key default gen_random_uuid(),
  opportunity_ref text unique default ('OPP-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  request_id      uuid references public.client_requests(id) on delete cascade,
  general_industry text,
  general_location text,
  problem_summary  text,
  scope            text,
  quantity         text,
  timeline         text,
  urgency          text,
  requirements     jsonb default '[]'::jsonb,
  questions_for_vendor jsonb default '[]'::jsonb,
  files_approved   jsonb default '[]'::jsonb,
  quote_deadline   text,
  hide_client_identity boolean default true,
  hide_budget      boolean default true,
  status           text default 'draft' check (status in ('draft','approved','sent','closed')),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vendor opportunities (a packet routed to a vendor) + responses
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_opportunities (
  id          uuid primary key default gen_random_uuid(),
  packet_id   uuid references public.quote_packets(id) on delete cascade,
  vendor_id   uuid,
  status      text default 'new_opportunity'
              check (status in ('new_opportunity','viewed','interested','needs_more_info',
                                'quote_in_progress','quote_submitted','declined','selected','not_selected','expired')),
  sent_at     timestamptz,
  viewed_at   timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.vendor_responses (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references public.vendor_opportunities(id) on delete cascade,
  vendor_id       uuid,
  quote_type      text,            -- estimate | range | formal | site_visit
  price_text      text,
  labor_rate      text,
  service_fee     text,
  travel_fee      text,
  parts_cost      text,
  included        text,
  excluded        text,
  lead_time       text,
  warranty        text,
  payment_terms   text,
  expiration_date text,
  next_info       text,
  questions       text,
  pdf_path        text,
  locale          text default 'en',
  status          text default 'draft'
                  check (status in ('draft','submitted','accepted','declined','expired')),
  ai_generated    boolean default false,
  created_at      timestamptz not null default now(),
  submitted_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- Vendor quote templates + saved quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quote_templates (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid,
  name            text not null,
  category        text,
  description     text,
  pricing_model   text,
  labor_rate      text,
  service_fee     text,
  parts_note      text,
  included        text,
  excluded        text,
  lead_time       text,
  warranty        text,
  payment_terms   text,
  required_info   text,
  terms           text,
  expiration_period text,
  attachments     jsonb default '[]'::jsonb,
  locale          text default 'en',
  spanish_version jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists quote_templates_vendor_idx on public.quote_templates(vendor_id);
create index if not exists quote_templates_category_idx on public.quote_templates(category);

create table if not exists public.saved_quotes (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid,
  opportunity_ref text,
  client_desc     text,           -- anonymous client description
  category        text,
  amount_text     text,
  status          text default 'draft'
                  check (status in ('draft','submitted','accepted','declined','expired','template')),
  expiration_date text,
  attachments     jsonb default '[]'::jsonb,
  notes           text,
  body            jsonb,          -- full quote body
  created_at      timestamptz not null default now(),
  submitted_at    timestamptz
);

create index if not exists saved_quotes_vendor_idx on public.saved_quotes(vendor_id);

-- ---------------------------------------------------------------------------
-- Visibility, agreements, commission, proof of introduction
-- ---------------------------------------------------------------------------
create table if not exists public.visibility_permissions (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid references public.client_requests(id) on delete cascade,
  vendor_id     uuid,
  reveal_client boolean default false,
  reveal_vendor boolean default false,
  approved_by   text,
  created_at    timestamptz not null default now()
);

create table if not exists public.proof_of_introduction (
  id                uuid primary key default gen_random_uuid(),
  opportunity_ref   text,
  request_id        uuid references public.client_requests(id) on delete cascade,
  vendor_id         uuid,
  received_at       timestamptz,
  terms_accepted_at timestamptz,
  quote_submitted_at timestamptz,
  identity_revealed_at timestamptz,
  client_selected_at timestamptz,
  commission_terms_version text,
  agreement_status  text default 'pending',
  deal_status       text default 'open',
  created_at        timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid references public.client_requests(id) on delete cascade,
  author      text,
  note        text,
  is_private  boolean default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI draft logs + audit log
-- ---------------------------------------------------------------------------
create table if not exists public.ai_draft_logs (
  id              uuid primary key default gen_random_uuid(),
  ai_mode         text not null,   -- intake | admin | vendor_quote
  user_id         uuid,
  request_id      uuid,
  vendor_id       uuid,
  prompt_input    text,
  draft_output    jsonb,
  provider        text,
  approval_status text default 'draft_generated'
                  check (approval_status in ('draft_generated','edited','approved','sent','rejected','regenerated')),
  visibility_used jsonb,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  sent_at         timestamptz
);

create index if not exists ai_draft_logs_mode_idx on public.ai_draft_logs(ai_mode);
create index if not exists ai_draft_logs_request_idx on public.ai_draft_logs(request_id);

create table if not exists public.platform_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  role        text,
  action      text not null,
  request_id  uuid,
  vendor_id   uuid,
  client_id   uuid,
  ip_address  text,
  before_status text,
  after_status  text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists platform_audit_log_action_idx on public.platform_audit_log(action);
create index if not exists platform_audit_log_created_idx on public.platform_audit_log(created_at desc);

create table if not exists public.platform_notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_role text,
  recipient_id   uuid,
  title       text,
  body        text,
  request_id  uuid,
  read        boolean default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Editable site content (admin content editor)
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  value_en    text,
  value_es    text,
  draft_en    text,
  draft_es    text,
  published   boolean default true,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- All writes happen server-side via the service role, which bypasses RLS.
-- RLS is enabled on every table so the anon/public key cannot read private
-- data directly. Starter policies below; harden with auth.uid() once real
-- authentication is wired (see platform_users.auth_id).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'platform_users','client_requests','request_status_history','request_files',
    'quote_packets','vendor_opportunities','vendor_responses','quote_templates',
    'saved_quotes','visibility_permissions','proof_of_introduction','admin_notes',
    'ai_draft_logs','platform_audit_log','platform_notifications','site_content'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- service role: full access (server-side writes)
    begin
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true);',
        t || '_service_all', t);
    exception when duplicate_object then null; end;
  end loop;

  -- Public, non-sensitive read of published site content for SSR/landing.
  begin
    execute 'create policy site_content_public_read on public.site_content
             for select to anon, authenticated using (published = true);';
  exception when duplicate_object then null; end;
end $$;
