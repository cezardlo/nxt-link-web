-- ============================================================================
-- NXT//LINK — private quote comparison system
-- Business rule: only the admin sees the full set of quotes for a deal. A
-- client NEVER logs in; they only ever see the 2-3 quotes the admin curates,
-- through a tokenized link — never a table, never a list of vendors.
-- Idempotent. Depends on 20260625_nxtlink_platform.sql, 20260626_..._rls_user
-- (reuses public.is_admin()), and 20260702_vendor_applications_private_intake
-- (an approved vendor_applications row is what "graduates" into a vendor).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- vendor_accounts — the ACTIVE account created when an application is
-- approved. Deliberately a thin link table, not a duplicate profile: the
-- vendor's profile (company info, category, offering type, supply-chain
-- stage, size, region, images, etc.) already lives in vendor_applications and
-- is already editable via /api/apply/my. `vendor_accounts` just marks "this
-- application is a live account that can receive deal invites and submit
-- quotes." Named vendor_accounts (NOT vendors) because the live database's
-- `vendors` table is the 14k-row scraped public catalog behind /vendors —
-- a completely different concept that must not be touched.
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_accounts (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.vendor_applications(id) on delete restrict,
  auth_id        uuid not null unique,   -- denormalized from the application, for simple RLS joins
  status         text not null default 'active' check (status in ('active', 'paused')),
  created_at     timestamptz not null default now()
);
create index if not exists vendor_accounts_auth_id_idx on public.vendor_accounts (auth_id);

-- Auto-create the vendor_accounts row the moment an application is approved.
create or replace function public.promote_approved_vendor_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') and new.auth_id is not null then
    insert into public.vendor_accounts (application_id, auth_id, status)
    values (new.id, new.auth_id, 'active')
    on conflict (application_id) do update set status = 'active';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_promote_approved_vendor_application on public.vendor_applications;
create trigger trg_promote_approved_vendor_application
  after update on public.vendor_applications
  for each row execute function public.promote_approved_vendor_application();

create or replace function public.is_active_vendor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.vendor_accounts where auth_id = auth.uid() and status = 'active');
$$;

create or replace function public.current_vendor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.vendor_accounts where auth_id = auth.uid() and status = 'active' limit 1;
$$;

-- ---------------------------------------------------------------------------
-- deals — an admin-created opportunity. Deliberately holds NO client contact
-- info (name/email/phone) — the client never has an account and the admin
-- doesn't need it stored here to run this flow; `brief` is the vendor-safe
-- description shown to invited vendors, distinct from any private admin
-- notes. Fully admin-only table: no vendor or public policy at all. A vendor
-- learns about a deal only through deal_invites (below), and even then the
-- API layer returns only title/brief/category — never admin_notes.
-- ---------------------------------------------------------------------------
create table if not exists public.deals (
  id           uuid primary key default gen_random_uuid(),
  public_ref   text unique default ('DEAL-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  title        text not null,
  brief        text,                      -- vendor-safe: what the client needs
  category     text,                      -- optional, same fixed list as vendor_applications.category
  admin_notes  text,                      -- admin-only; never selected in a vendor-facing query
  status       text not null default 'open' check (status in ('open', 'comparing', 'shared', 'closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists deals_status_idx on public.deals (status);

create or replace function public.touch_deal() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_deal on public.deals;
create trigger trg_touch_deal before update on public.deals
  for each row execute function public.touch_deal();

-- ---------------------------------------------------------------------------
-- deal_invites — which vendors were asked to quote on which deal. A vendor
-- can see a deal ONLY if they have a row here; they never see who else was
-- invited (RLS scopes to their own invite row, not the full invite list).
-- ---------------------------------------------------------------------------
create table if not exists public.deal_invites (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals(id) on delete cascade,
  vendor_id   uuid not null references public.vendor_accounts(id) on delete cascade,
  invited_at  timestamptz not null default now(),
  unique (deal_id, vendor_id)
);
create index if not exists deal_invites_vendor_idx on public.deal_invites (vendor_id);
create index if not exists deal_invites_deal_idx on public.deal_invites (deal_id);

-- ---------------------------------------------------------------------------
-- quotes — a vendor's structured response to a deal invite. A vendor reads/
-- writes ONLY their own quote rows; admin reads/writes ALL. No other vendor,
-- ever. `selected_for_client` is the admin's curation flag.
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id                  uuid primary key default gen_random_uuid(),
  deal_id             uuid not null references public.deals(id) on delete cascade,
  vendor_id           uuid not null references public.vendor_accounts(id) on delete cascade,
  status              text not null default 'draft' check (status in ('draft', 'submitted')),
  line_items          jsonb default '[]'::jsonb,  -- [{description, quantity, unit_price, subtotal}]
  total_price         numeric,
  timeline            text,                        -- lead time / delivery timeline
  terms               text,
  notes               text,
  selected_for_client boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  unique (deal_id, vendor_id)
);
create index if not exists quotes_deal_idx on public.quotes (deal_id);
create index if not exists quotes_vendor_idx on public.quotes (vendor_id);

create or replace function public.touch_quote() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_quote on public.quotes;
create trigger trg_touch_quote before update on public.quotes
  for each row execute function public.touch_quote();

-- Defense in depth: a vendor can never set selected_for_client themselves —
-- only an admin curates. Enforced at the DB level, not just trusted to the app.
create or replace function public.guard_quote_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.selected_for_client := old.selected_for_client;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_quote_update on public.quotes;
create trigger trg_guard_quote_update
  before update on public.quotes
  for each row execute function public.guard_quote_update();

-- ---------------------------------------------------------------------------
-- deal_shares — one row per "send this curated comparison to the client"
-- action. Each share is an immutable snapshot of which quote ids were
-- included, so re-curating later doesn't disturb a link already sent. The
-- token is the ONLY way to read the curated rows — resolved exclusively by
-- a server route using the service role; there is no public/anon SELECT
-- policy on this table, or on quotes, or on deals, at all.
-- ---------------------------------------------------------------------------
create table if not exists public.deal_shares (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals(id) on delete cascade,
  token       text not null unique,        -- random, generated server-side (e.g. 32 bytes hex)
  quote_ids   jsonb not null default '[]'::jsonb,  -- snapshot of the 2-3 selected quote ids
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);
create index if not exists deal_shares_token_idx on public.deal_shares (token);

-- ---------------------------------------------------------------------------
-- leads — a client's expressed preference on a curated link ("I like this
-- one"), captured through the tokenized route (never a direct anon insert
-- against this table — the API validates the token first, then writes with
-- the service role). Shaped to also work as a general CRM-style lead record
-- (name/email/source/status/notes) so the existing /crm page's Leads tab
-- (currently dead code — no real `leads` table has existed until now) has a
-- consistent, non-broken schema to read instead of a mismatched one.
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  name           text,
  email          text,
  company        text,
  source         text not null default 'quote_preference'
                 check (source in ('quote_preference', 'chatbot', 'contact_form', 'manual', 'vendor_signup')),
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'meeting_booked', 'qualified', 'closed_won', 'closed_lost')),
  notes          text,
  deal_share_id  uuid references public.deal_shares(id) on delete set null,
  quote_id       uuid references public.quotes(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- Reconcile with the live chatbot-era leads table (name/email/company/phone/
-- source/status/category_interest/transcript/notes/assigned_to, live rows):
-- the create above no-ops there. Add the two link columns this flow needs and
-- widen the source check to include quote_preference. Existing rows untouched.
alter table public.leads
  add column if not exists deal_share_id uuid references public.deal_shares(id) on delete set null,
  add column if not exists quote_id      uuid references public.quotes(id) on delete set null;
alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('quote_preference', 'chatbot', 'contact_form', 'manual', 'vendor_signup'));

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_deal_share_idx on public.leads (deal_share_id);

create or replace function public.touch_lead() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_lead on public.leads;
create trigger trg_touch_lead before update on public.leads
  for each row execute function public.touch_lead();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.vendor_accounts enable row level security;
alter table public.deals enable row level security;
alter table public.deal_invites enable row level security;
alter table public.quotes enable row level security;
alter table public.deal_shares enable row level security;
alter table public.leads enable row level security;

do $$
begin
  -- vendors: a vendor reads/updates ONLY their own row; admin reads/updates all.
  -- No public policy at all (matches "no public SELECT on vendors ... anywhere").
  begin
    create policy vendor_accounts_owner_select on public.vendor_accounts
      for select to authenticated using (auth_id = auth.uid() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy vendor_accounts_owner_update on public.vendor_accounts
      for update to authenticated using (auth_id = auth.uid() or public.is_admin())
      with check (auth_id = auth.uid() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy vendor_accounts_service_all on public.vendor_accounts
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;

  -- deals: admin-only, full stop. No vendor policy, no public policy.
  begin
    create policy deals_admin_all on public.deals
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy deals_service_all on public.deals
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;

  -- deal_invites: a vendor sees ONLY their own invite rows (not who else was
  -- invited); admin sees/manages all.
  begin
    create policy deal_invites_vendor_select on public.deal_invites
      for select to authenticated using (vendor_id = public.current_vendor_id() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy deal_invites_admin_write on public.deal_invites
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy deal_invites_service_all on public.deal_invites
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;

  -- quotes: a vendor reads/writes ONLY their own quotes; admin reads/writes all.
  -- No public policy, no cross-vendor policy, ever.
  begin
    create policy quotes_owner_select on public.quotes
      for select to authenticated
      using (vendor_id = public.current_vendor_id() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy quotes_owner_insert on public.quotes
      for insert to authenticated
      with check (vendor_id = public.current_vendor_id());
  exception when duplicate_object then null; end;
  begin
    create policy quotes_owner_update on public.quotes
      for update to authenticated
      using (vendor_id = public.current_vendor_id() or public.is_admin())
      with check (vendor_id = public.current_vendor_id() or public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy quotes_service_all on public.quotes
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;

  -- deal_shares: admin-only for browsing/creating. The public token-resolve
  -- path NEVER queries this table with the anon key — it always goes through
  -- a server route using the service role, so no anon/public policy exists.
  begin
    create policy deal_shares_admin_all on public.deal_shares
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy deal_shares_service_all on public.deal_shares
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;

  -- leads: admin-only read/manage. Client preference INSERTs happen via the
  -- tokenized server route using the service role — never a direct anon
  -- insert policy, so a fake lead can't be posted without a valid token.
  begin
    create policy leads_admin_all on public.leads
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy leads_service_all on public.leads
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
