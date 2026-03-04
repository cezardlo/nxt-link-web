-- Run in Supabase SQL Editor (project: yvykselwehxjwsqercjg)
-- Purpose: allow public (anon) read access only to approved vendors.

-- Ensure table exists in public schema
-- (No-op if already exists)

-- Keep RLS enabled and add explicit safe policy
alter table public.vendors enable row level security;

-- Remove old conflicting policies if they exist
drop policy if exists "public_read_approved_vendors" on public.vendors;
drop policy if exists "Allow anon approved vendors" on public.vendors;

-- Ensure role has table access (still filtered by RLS policy)
grant usage on schema public to anon;
grant select on table public.vendors to anon;

-- Allow anon users to read only approved rows (case/space tolerant)
create policy "public_read_approved_vendors"
on public.vendors
for select
to anon
using (lower(trim(status)) = 'approved');

-- Optional sanity check
-- select id, company_name, status, created_at from public.vendors order by created_at desc;
