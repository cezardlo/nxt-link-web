-- ============================================================================
-- NXT//LINK — vendor self-service videos (profile showcase)
-- Companies can add video links (YouTube/Vimeo) to their profile once they
-- have a real account. Idempotent: safe to run more than once.
-- ============================================================================

create table if not exists public.vendor_videos (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid references public.vendor_profiles(id) on delete cascade,
  title        text,
  url          text not null,      -- original URL as pasted by the vendor
  embed_url    text,               -- normalized embeddable URL
  provider     text,               -- 'youtube' | 'vimeo' | 'other'
  position     int default 0,
  created_at   timestamptz not null default now()
);
create index if not exists vendor_videos_vendor_idx on public.vendor_videos (vendor_id);

do $$
begin
  execute 'alter table public.vendor_videos enable row level security;';
  begin
    execute 'create policy vendor_videos_service_all on public.vendor_videos
             for all to service_role using (true) with check (true);';
  exception when duplicate_object then null; end;
end $$;
