-- ============================================================================
-- NXT//LINK — consent ledger, agreement gates (NDA/MNDA/NCA), and success-fee
-- persistence.
-- Business rules:
--   * Every information-sharing action (identity reveal, document share,
--     RFQ send, introduction) is recorded in consent_log BEFORE it happens
--     and is revocable. Deterministic code enforces the gates; AI never
--     shares anything (docs/AGENT_INSTRUCTIONS.md gates 1-7).
--   * NDA/MNDA/NCA records gate identity/contact reveal. Templates are
--     organization-approved STARTING DRAFTS, NOT LEGAL ADVICE — attorney
--     review is required before any signature.
--   * Fee policies are versioned and IMMUTABLE (corrections = a new version).
--     Both parties acknowledge the fee before introduction and again before
--     acceptance. AI may recommend; only the deterministic engine
--     (src/lib/fees/engine.ts) calculates; only an authorized admin finalizes.
-- All tables are private admin/service data — no vendor/public RLS path;
-- vendor-facing disclosure flows through server routes that check gates.
-- Idempotent. Depends on 20260705 (deals, quotes, vendor_accounts),
-- 20260626 (public.is_admin()).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- consent_log — the audit ledger for every sharing decision.
-- ---------------------------------------------------------------------------
create table if not exists public.consent_log (
  id                        uuid primary key default gen_random_uuid(),
  request_id                uuid,             -- client_requests.id (ticket), when applicable
  deal_id                   uuid references public.deals(id) on delete cascade,
  action                    text not null check (action in
                            ('reveal_identity','share_document','share_field',
                             'send_rfq','introduce','fee_acknowledged')),
  grantee_vendor_account_id uuid references public.vendor_accounts(id) on delete cascade,
  fields                    jsonb not null default '[]'::jsonb,  -- field-level scope, e.g. ["company_name","contact_email"]
  document_paths            jsonb not null default '[]'::jsonb,  -- storage paths covered, if action=share_document
  granted_by                uuid,             -- auth uid of the HUMAN who approved
  granted_at                timestamptz not null default now(),
  revoked_at                timestamptz,
  revoke_reason             text,
  notes                     text
);
create index if not exists consent_log_deal_idx    on public.consent_log (deal_id);
create index if not exists consent_log_request_idx on public.consent_log (request_id);

-- Immutability guard: a consent row can only ever be revoked/annotated —
-- its grant facts (action, scope, grantee, who, when) can never be edited.
create or replace function public.guard_consent_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.request_id, new.deal_id, new.action, new.grantee_vendor_account_id,
      new.fields, new.document_paths, new.granted_by, new.granted_at)
     is distinct from
     (old.request_id, old.deal_id, old.action, old.grantee_vendor_account_id,
      old.fields, old.document_paths, old.granted_by, old.granted_at) then
    raise exception 'consent_log rows are immutable except revocation/notes';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_consent_update on public.consent_log;
create trigger trg_guard_consent_update
  before update on public.consent_log
  for each row execute function public.guard_consent_update();

-- ---------------------------------------------------------------------------
-- agreements — NDA / MNDA / NCA lifecycle records.
-- NCA (non-circumvention) protects NXT Link's introduction + success fee:
-- protected contact info is not released until the configured agreements
-- are signed AND client consent exists (enforced in src/lib/deals/gates.ts).
-- ---------------------------------------------------------------------------
create table if not exists public.agreements (
  id                    uuid primary key default gen_random_uuid(),
  kind                  text not null check (kind in ('nda','mnda','nca')),
  deal_id               uuid references public.deals(id) on delete cascade,
  request_id            uuid,
  vendor_account_id     uuid references public.vendor_accounts(id) on delete cascade,
  parties               jsonb not null default '[]'::jsonb,  -- [{name, role, email?}]
  status                text not null default 'draft'
                        check (status in ('draft','sent','signed','declined','expired')),
  effective_date        date,
  term_months           integer check (term_months is null or term_months > 0),
  territory_scope       text,
  protected_opportunity text,          -- NCA: the introduction/opportunity protected
  fee_policy_version    text,          -- NCA: which fee schedule it references
  document_version      text,
  document_path         text,          -- private storage path (signed copies)
  signed_at             timestamptz,
  notes                 text,          -- templates are drafts; attorney review required
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists agreements_deal_idx   on public.agreements (deal_id);
create index if not exists agreements_vendor_idx on public.agreements (vendor_account_id);

create or replace function public.touch_agreement() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_agreement on public.agreements;
create trigger trg_touch_agreement before update on public.agreements
  for each row execute function public.touch_agreement();

-- ---------------------------------------------------------------------------
-- fee_policies — versioned, immutable fee schedules.
-- ---------------------------------------------------------------------------
create table if not exists public.fee_policies (
  version        text primary key,
  label          text not null,
  brackets       jsonb not null,   -- [{upTo: number|null, rate: number}] marginal brackets
  minimum_fee    numeric,
  maximum_fee    numeric,
  effective_from date,
  created_by     uuid,
  created_at     timestamptz not null default now()
);

create or replace function public.guard_fee_policy_immutable() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'fee_policies are immutable — corrections require a new version';
end;
$$;
drop trigger if exists trg_guard_fee_policy_update on public.fee_policies;
create trigger trg_guard_fee_policy_update
  before update or delete on public.fee_policies
  for each row execute function public.guard_fee_policy_immutable();

-- Seed the provisional launch schedule (matches src/lib/fees/engine.ts
-- DEFAULT_FEE_POLICY). Requires legal/tax review before launch.
insert into public.fee_policies (version, label, brackets, effective_from)
values (
  'provisional-v1',
  'Provisional launch schedule (requires legal/tax review before launch)',
  '[{"upTo":10000,"rate":0.15},{"upTo":50000,"rate":0.125},{"upTo":null,"rate":0.1}]'::jsonb,
  null
)
on conflict (version) do nothing;

-- ---------------------------------------------------------------------------
-- fee_acknowledgments — both parties see and accept the fee terms BEFORE a
-- protected introduction and AGAIN before quote acceptance. Never hidden.
-- ---------------------------------------------------------------------------
create table if not exists public.fee_acknowledgments (
  id              uuid primary key default gen_random_uuid(),
  deal_id         uuid not null references public.deals(id) on delete cascade,
  policy_version  text not null references public.fee_policies(version),
  party           text not null check (party in ('vendor','customer')),
  stage           text not null check (stage in ('pre_introduction','pre_acceptance')),
  acknowledged_by uuid,
  acknowledged_at timestamptz not null default now(),
  notes           text,
  unique (deal_id, party, stage, policy_version)
);
create index if not exists fee_acknowledgments_deal_idx on public.fee_acknowledgments (deal_id);

-- ---------------------------------------------------------------------------
-- fee_calculations — every engine run that matters is persisted with the
-- exact policy version, inputs, bracket breakdown, and approval trail.
-- ---------------------------------------------------------------------------
create table if not exists public.fee_calculations (
  id                 uuid primary key default gen_random_uuid(),
  deal_id            uuid references public.deals(id) on delete cascade,
  quote_id           uuid references public.quotes(id) on delete set null,
  policy_version     text not null references public.fee_policies(version),
  eligible_subtotal  numeric not null,
  exclusions         jsonb not null default '[]'::jsonb,
  breakdown          jsonb not null default '[]'::jsonb,  -- bracket-by-bracket math
  fee                numeric not null,
  effective_rate     numeric,
  currency           text not null default 'USD',
  exchange_rate      numeric,
  exchange_rate_date date,
  status             text not null default 'estimate'
                     check (status in ('estimate','final','adjusted')),
  adjustment_reason  text,
  approved_by        uuid,          -- admin who finalized/adjusted (never AI)
  created_by         uuid,
  created_at         timestamptz not null default now()
);
create index if not exists fee_calculations_deal_idx on public.fee_calculations (deal_id);

-- ---------------------------------------------------------------------------
-- RLS — admin + service_role only. Vendor/customer disclosure happens through
-- gate-checked server routes, never direct table reads.
-- ---------------------------------------------------------------------------
alter table public.consent_log          enable row level security;
alter table public.agreements           enable row level security;
alter table public.fee_policies         enable row level security;
alter table public.fee_acknowledgments  enable row level security;
alter table public.fee_calculations     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['consent_log','agreements','fee_policies',
                           'fee_acknowledgments','fee_calculations']
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
