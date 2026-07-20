-- ============================================================================
-- NXT//LINK — verified-engagement reviews (build step 9, trust layer)
-- Additive only. A review can ONLY be written by a buyer who accepted a quote
-- (verified engagement), enforced in the server route. One review per
-- engagement. Public can read published reviews. Touches no existing data.
-- ============================================================================

create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        uuid not null references public.vendor_profiles(id) on delete cascade,
  quote_request_id uuid unique references public.quote_requests(id) on delete set null,
  buyer_email      text not null,
  rating           int not null check (rating between 1 and 5),
  title            text,
  body             text,
  status           text not null default 'published' check (status in ('published', 'hidden')),
  created_at       timestamptz not null default now()
);
create index if not exists reviews_vendor_idx on public.reviews (vendor_id);

alter table public.reviews enable row level security;
do $$
begin
  -- Anyone may read published reviews (they are public trust signals).
  begin
    create policy reviews_public_select on public.reviews
      for select using (status = 'published');
  exception when duplicate_object then null; end;
  -- All writes go through the server route (service role), which verifies the
  -- reviewer actually accepted a quote from this vendor.
  begin
    create policy reviews_service_all on public.reviews
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
