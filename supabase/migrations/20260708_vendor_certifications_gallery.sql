-- ============================================================================
-- NXT//LINK — vendor certifications (with proof + expiry) and photo gallery
-- Per Thomasnet-style research: certifications are a dedicated, evidence-backed
-- profile section buyers filter by; facility/work photos drive engagement.
-- Additive only; images reuse the private 'vendor-logos' bucket (cert_/gallery_
-- prefixes). Touches no existing data.
-- ============================================================================

create table if not exists public.vendor_certifications (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendor_profiles(id) on delete cascade,
  name         text not null,          -- e.g. ISO 9001:2015
  issuer       text,                   -- e.g. SGS, TUV
  credential   text,                   -- certificate / license number
  issued_on    date,
  expires_on   date,
  image_path   text,                   -- scan/photo of the certificate
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists vendor_certifications_vendor_idx on public.vendor_certifications (vendor_id);

create table if not exists public.vendor_gallery (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendor_profiles(id) on delete cascade,
  image_path   text not null,
  caption      text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists vendor_gallery_vendor_idx on public.vendor_gallery (vendor_id);

alter table public.vendor_certifications enable row level security;
alter table public.vendor_gallery enable row level security;
do $$
declare t text;
begin
  foreach t in array array['vendor_certifications','vendor_gallery'] loop
    -- Public read: these are public trust/marketing content on the storefront.
    execute format('drop policy if exists %I on public.%I', t || '_public_select', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_public_select', t);
    -- A vendor manages only their own rows.
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid())) with check (vendor_id in (select id from public.vendor_profiles where auth_id = auth.uid()))',
      t || '_owner_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_service_all', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service_all', t);
  end loop;
end $$;
