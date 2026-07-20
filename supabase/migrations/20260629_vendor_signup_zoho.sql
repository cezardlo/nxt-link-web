-- ============================================================================
-- NXT//LINK — Vendor/company sign-up, brochures, and Zoho integration
-- Companies sign up, add contact + email info, upload brochures; admin
-- organizes them. Zoho Mail + Zoho Meeting connection state and an outbox.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Vendor / company profiles (a company that signs up to receive opportunities)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_profiles (
  id               uuid primary key default gen_random_uuid(),
  public_ref       text unique default ('VEN-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  auth_id          uuid,                       -- maps to auth.users when signed up with an account
  platform_user_id uuid references public.platform_users(id),
  company_name     text not null,
  contact_name     text,
  email            text,                       -- primary contact email
  phone            text,
  website          text,
  city             text,
  locale           text default 'en' check (locale in ('en','es')),
  -- what they provide / where they serve
  categories       jsonb default '[]'::jsonb,  -- ['forklift','staffing',...]
  service_areas    jsonb default '[]'::jsonb,  -- ['El Paso','Juarez','New Mexico']
  description      text,
  -- organization / lifecycle
  status           text default 'pending'
                   check (status in ('pending','approved','rejected','paused')),
  source           text default 'signup',
  admin_notes      text,
  -- Zoho cross-references (filled once synced)
  zoho_contact_id  text,
  zoho_account_id  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists vendor_profiles_status_idx   on public.vendor_profiles (status);
create index if not exists vendor_profiles_email_idx    on public.vendor_profiles (lower(email));
create index if not exists vendor_profiles_created_idx  on public.vendor_profiles (created_at desc);

-- ---------------------------------------------------------------------------
-- Brochures / marketing files uploaded by a company
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_brochures (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid references public.vendor_profiles(id) on delete cascade,
  file_name     text not null,
  file_type     text,
  size_bytes    bigint,
  storage_path  text,                         -- path within the 'vendor-brochures' bucket
  public_url    text,                         -- signed/public URL when available
  title         text,
  uploaded_at   timestamptz not null default now()
);
create index if not exists vendor_brochures_vendor_idx on public.vendor_brochures (vendor_id);

-- ---------------------------------------------------------------------------
-- Zoho connection (OAuth tokens). Single active row per account_key.
-- Tokens are written server-side only; never exposed to the public key (RLS).
-- ---------------------------------------------------------------------------
create table if not exists public.zoho_connections (
  id             uuid primary key default gen_random_uuid(),
  account_key    text unique not null default 'default',  -- allow multiple mailboxes later
  api_domain     text,                         -- e.g. https://www.zohoapis.com
  account_id     text,                         -- Zoho Mail accountId
  from_address   text,                         -- the mailbox we send from
  access_token   text,
  refresh_token  text,
  expires_at     timestamptz,
  scopes         text,
  connected      boolean default false,
  connected_by   text,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Outbox: every email/meeting we draft or send through Zoho (audit + status)
-- ---------------------------------------------------------------------------
create table if not exists public.zoho_outbox (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('email','meeting')),
  vendor_id    uuid references public.vendor_profiles(id) on delete set null,
  request_ref  text,
  to_address   text,
  subject      text,
  body         text,
  meeting_topic text,
  meeting_start timestamptz,
  meeting_url  text,
  status       text default 'draft' check (status in ('draft','queued','sent','failed','scheduled')),
  provider     text,                           -- 'zoho' | 'fallback'
  error        text,
  zoho_id      text,
  created_at   timestamptz not null default now()
);
create index if not exists zoho_outbox_created_idx on public.zoho_outbox (created_at desc);

-- ============================================================================
-- Storage bucket for brochures (private; served via signed URLs / service role)
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='storage' and table_name='buckets') then
    insert into storage.buckets (id, name, public)
    values ('vendor-brochures','vendor-brochures', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- ============================================================================
-- Row Level Security — writes happen server-side via the service role.
-- Public/anon key cannot read these tables directly (tokens, contact info).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'vendor_profiles','vendor_brochures','zoho_connections','zoho_outbox'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    begin
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true);',
        t || '_service_all', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- Allow the chatbot to log drafts alongside intake/admin/vendor_quote.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='ai_draft_logs') then
    begin
      alter table public.ai_draft_logs drop constraint if exists ai_draft_logs_ai_mode_check;
      alter table public.ai_draft_logs add constraint ai_draft_logs_ai_mode_check
        check (ai_mode in ('intake','admin','vendor_quote','chatbot'));
    exception when others then null; end;
  end if;
end $$;

-- keep updated_at fresh on vendor_profiles
create or replace function public.touch_vendor_profile() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_vendor_profile on public.vendor_profiles;
create trigger trg_touch_vendor_profile before update on public.vendor_profiles
  for each row execute function public.touch_vendor_profile();
