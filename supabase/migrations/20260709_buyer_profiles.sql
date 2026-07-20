-- ============================================================================
-- NXT//LINK — buyer profiles (user-requested): company, person, position,
-- industry, logo. Keyed by verified buyer email (same identity model as the
-- rest of the buyer surface). Additive only; access via scoped server routes.
-- ============================================================================

create table if not exists public.buyer_profiles (
  id           uuid primary key default gen_random_uuid(),
  buyer_email  text not null unique,
  company_name text,
  contact_name text,          -- person's name
  position     text,          -- their role in the company
  industry     text,
  city         text,
  phone        text,
  logo_path    text,          -- company logo in 'vendor-logos' bucket (buyerlogo_ prefix)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists buyer_profiles_email_idx on public.buyer_profiles (lower(buyer_email));

alter table public.buyer_profiles enable row level security;
do $$
begin
  begin
    create policy buyer_profiles_service_all on public.buyer_profiles
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
