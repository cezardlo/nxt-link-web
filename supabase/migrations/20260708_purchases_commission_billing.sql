-- ============================================================================
-- NXT//LINK — purchase records + commission billing (closes the money loop)
-- After a buyer accepts, the vendor records the final purchase (per the vendor
-- agreement's "report closed deals"). The commission is recalculated on the
-- final amount and billed with an invoice number + due date. Additive only.
-- ============================================================================

create table if not exists public.purchases (
  id               uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  vendor_id        uuid not null references public.vendor_profiles(id) on delete cascade,
  amount           numeric not null,
  currency         text not null default 'USD',
  po_number        text,
  invoice_ref      text,           -- the vendor's own invoice to the buyer
  purchased_at     date,
  notes            text,
  created_at       timestamptz not null default now()
);
create index if not exists purchases_vendor_idx on public.purchases (vendor_id);

-- Commission billing fields.
alter table public.commissions add column if not exists final_amount numeric;
alter table public.commissions add column if not exists invoice_number text;
alter table public.commissions add column if not exists billed_at timestamptz;
alter table public.commissions add column if not exists due_date date;
alter table public.commissions add column if not exists paid_at timestamptz;

-- Widen the status lifecycle: ... -> won (billed) -> paid.
alter table public.commissions drop constraint if exists commissions_status_check;
alter table public.commissions add constraint commissions_status_check
  check (status in ('quoted', 'accepted', 'won', 'lost', 'void', 'paid'));

alter table public.purchases enable row level security;
do $$
begin
  begin
    create policy purchases_vendor_select on public.purchases
      for select to authenticated
      using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()));
  exception when duplicate_object then null; end;
  begin
    create policy purchases_service_all on public.purchases
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
