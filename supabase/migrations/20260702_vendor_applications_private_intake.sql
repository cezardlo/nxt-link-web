-- ============================================================================
-- NXT//LINK — private vendor intake ("vendor_applications")
-- Business rule: the vendor catalog is PRIVATE. Clients never browse it.
-- Anyone can submit an application (public intake form). ONLY an
-- authenticated admin (platform_users.role in admin/super_admin) can ever
-- read, update, approve, or reject one. There is no "public read" path at all.
-- Idempotent: safe to run more than once.
-- Depends on: 20260625_nxtlink_platform.sql, 20260626_nxtlink_rls_user.sql
-- (reuses the existing public.is_admin() helper — same one that gates the
-- rest of the NXT//LINK admin surface).
-- ============================================================================

create table if not exists public.vendor_applications (
  id                uuid primary key default gen_random_uuid(),
  public_ref        text unique default ('APP-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),

  company_name      text not null,
  contact_name      text,
  email             text not null,
  phone             text,

  category          text not null
                    check (category in ('TMS','WMS','Telematics/ELD','Forklifts',
                                         'Customs/Cross-Border','Cold Chain','Robotics','Other')),
  problem_solved    text,          -- "What problem do you solve?"
  target_customer   text,          -- who they serve best
  price_range       text,          -- free text or band, e.g. "<$5k" / "$5-25k" / "$25k+"

  logo_path         text,          -- storage path in 'vendor-logos' (private bucket)
  product_image_paths jsonb default '[]'::jsonb,  -- up to 3 paths in 'vendor-product-images'

  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  admin_notes       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  approved_at       timestamptz
);

create index if not exists vendor_applications_status_idx   on public.vendor_applications (status);
create index if not exists vendor_applications_category_idx on public.vendor_applications (category);
create index if not exists vendor_applications_created_idx  on public.vendor_applications (created_at desc);

create or replace function public.touch_vendor_application() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_vendor_application on public.vendor_applications;
create trigger trg_touch_vendor_application before update on public.vendor_applications
  for each row execute function public.touch_vendor_application();

-- ============================================================================
-- Row Level Security — the critical part.
--   INSERT: anyone (anon + authenticated) — the public intake form.
--   SELECT / UPDATE / DELETE: admin only, via the existing is_admin() helper.
--   service_role: full access (server-side routes that need to bypass RLS,
--   e.g. the public /apply submit endpoint, which still validates + sanitizes
--   input itself before writing).
-- No policy grants public/authenticated SELECT — so without one of the above,
-- a submitter cannot read back applications, including their own.
-- ============================================================================
alter table public.vendor_applications enable row level security;

do $$
begin
  begin
    create policy vendor_applications_public_insert on public.vendor_applications
      for insert to anon, authenticated with check (true);
  exception when duplicate_object then null; end;

  begin
    create policy vendor_applications_admin_select on public.vendor_applications
      for select to authenticated using (public.is_admin());
  exception when duplicate_object then null; end;

  begin
    create policy vendor_applications_admin_update on public.vendor_applications
      for update to authenticated using (public.is_admin()) with check (public.is_admin());
  exception when duplicate_object then null; end;

  begin
    create policy vendor_applications_admin_delete on public.vendor_applications
      for delete to authenticated using (public.is_admin());
  exception when duplicate_object then null; end;

  begin
    create policy vendor_applications_service_all on public.vendor_applications
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;

-- ============================================================================
-- Storage: logo + up to 3 product images per application.
-- Both buckets are PRIVATE. Public can upload (so the intake form works
-- before any account/login exists) but cannot list or read anything back —
-- reads happen only through admin-gated server routes using signed URLs
-- (service role), same pattern as vendor-brochures.
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='buckets') then
    insert into storage.buckets (id, name, public)
    values ('vendor-logos','vendor-logos', false)
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public)
    values ('vendor-product-images','vendor-product-images', false)
    on conflict (id) do nothing;
  end if;
end $$;

do $$
begin
  begin
    create policy vendor_logos_public_insert on storage.objects
      for insert to anon, authenticated
      with check (bucket_id = 'vendor-logos');
  exception when duplicate_object then null; end;

  begin
    create policy vendor_logos_admin_select on storage.objects
      for select to authenticated
      using (bucket_id = 'vendor-logos' and public.is_admin());
  exception when duplicate_object then null; end;

  begin
    create policy vendor_product_images_public_insert on storage.objects
      for insert to anon, authenticated
      with check (bucket_id = 'vendor-product-images');
  exception when duplicate_object then null; end;

  begin
    create policy vendor_product_images_admin_select on storage.objects
      for select to authenticated
      using (bucket_id = 'vendor-product-images' and public.is_admin());
  exception when duplicate_object then null; end;
end $$;

-- ============================================================================
-- One-time: promote yourself to admin (run manually with your real email,
-- AFTER you've signed up once via Supabase Auth so the row exists):
--   update public.platform_users set role = 'admin' where email = 'you@nxtlink.com';
-- ============================================================================
