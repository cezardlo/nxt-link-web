-- ============================================================================
-- NXT//LINK — vendor quote responses + commission tracking (build steps 6 & 7)
-- Additive only. Treats each quote_requests row as the OPPORTUNITY: the vendor's
-- structured quote answer is stored on it, and a commissions row is created per
-- opportunity when a quote is submitted. Touches no existing data.
-- ============================================================================

-- Vendor's quote answer, stored on the opportunity (quote_requests).
alter table public.quote_requests add column if not exists quote_amount numeric;
alter table public.quote_requests add column if not exists quote_currency text default 'USD';
alter table public.quote_requests add column if not exists quote_message text;
alter table public.quote_requests add column if not exists quote_timeline text;
alter table public.quote_requests add column if not exists quote_valid_until date;
alter table public.quote_requests add column if not exists quoted_at timestamptz;
alter table public.quote_requests add column if not exists protected_until timestamptz;
alter table public.quote_requests add column if not exists buyer_decision text
  check (buyer_decision is null or buyer_decision in ('accepted', 'declined'));

-- One commission record per opportunity (created when the vendor quotes).
create table if not exists public.commissions (
  id                   uuid primary key default gen_random_uuid(),
  quote_request_id     uuid not null unique references public.quote_requests(id) on delete cascade,
  vendor_id            uuid not null references public.vendor_profiles(id) on delete cascade,
  quote_amount         numeric not null,
  currency             text not null default 'USD',
  fee_policy_version   text not null,
  commission_amount    numeric not null,
  effective_rate       numeric,
  protected_period_days int not null default 90,
  protected_until      timestamptz,
  status               text not null default 'quoted'
                       check (status in ('quoted', 'accepted', 'won', 'lost', 'void')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists commissions_vendor_idx on public.commissions (vendor_id);
create index if not exists commissions_status_idx on public.commissions (status);

alter table public.commissions enable row level security;
do $$
begin
  -- A vendor sees only their own commission records.
  begin
    create policy commissions_vendor_select on public.commissions
      for select to authenticated
      using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  exception when duplicate_object then null; end;
  -- Service role (server routes) full access.
  begin
    create policy commissions_service_all on public.commissions
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
