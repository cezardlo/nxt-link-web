-- NXT Link vendor hunt intake requests
-- Safe to run more than once.

create table if not exists public.vendor_hunt_requests (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  problem text,
  timeline text,
  email text,
  source text default 'homepage',
  created_at timestamptz not null default now()
);

alter table public.vendor_hunt_requests enable row level security;

do $$ begin
  create policy "service_role_all_vendor_hunt_requests"
    on public.vendor_hunt_requests
    for all to service_role
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

create index if not exists vendor_hunt_requests_created_at_idx
  on public.vendor_hunt_requests(created_at desc);

create index if not exists vendor_hunt_requests_category_idx
  on public.vendor_hunt_requests(category);
