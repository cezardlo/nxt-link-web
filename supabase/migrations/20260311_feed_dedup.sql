-- ─────────────────────────────────────────────────────────────────────────────
-- NXT//LINK Feed Deduplication Table — March 2026
-- Tracks URLs already ingested so the same article is never processed twice.
-- Feed agents check this table before persisting. Very cheap: just URL hashes.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.feed_seen_urls (
  url_hash    text        not null primary key,  -- md5(url) for compact storage
  url         text        not null,
  source_id   text        null,                   -- feed source ID
  seen_at     timestamptz not null default now()
);

-- Auto-expire old entries (keep 90 days, articles older than that can re-ingest)
create index if not exists feed_seen_urls_seen_at_idx on public.feed_seen_urls(seen_at desc);

alter table public.feed_seen_urls enable row level security;

create policy "service_all_feed_seen_urls"
  on public.feed_seen_urls for all to service_role using (true);

create policy "anon_read_feed_seen_urls"
  on public.feed_seen_urls for select to anon using (true);

grant select on table public.feed_seen_urls to anon;
grant all    on table public.feed_seen_urls to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup function: delete entries older than 90 days
-- Call via Supabase Edge Functions or pg_cron if available
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cleanup_feed_seen_urls()
returns void language plpgsql as $$
begin
  delete from public.feed_seen_urls
  where seen_at < now() - interval '90 days';
end;
$$;
