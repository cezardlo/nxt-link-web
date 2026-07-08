-- Buyer-facing "report a problem" on marketplace listings, reviewed by
-- operators in /admin/marketplace. Service-role only (public writes go
-- through the server API, which validates the listing exists).

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('product','service')),
  product_id uuid references public.marketplace_products(id) on delete cascade,
  service_id uuid references public.marketplace_services(id) on delete cascade,
  vendor_id uuid not null,
  reason text not null check (reason in ('wrong_info','misleading','spam','not_available','other')),
  details text,
  reporter_email text,
  status text not null default 'new' check (status in ('new','reviewed','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.listing_reports enable row level security;
do $$ begin
  create policy listing_reports_service_all on public.listing_reports
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
