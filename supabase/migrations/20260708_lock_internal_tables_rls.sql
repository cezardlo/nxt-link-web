-- ============================================================================
-- Lock down internal/ops tables that had RLS disabled (flagged by the
-- Supabase security advisor): anyone with the public anon key could read
-- and write them. All app access to these tables happens server-side with
-- the service role (src/lib/cache.ts switched to the admin client in the
-- same change), so service_role-only is the correct policy. Idempotent.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'tracked_companies','tracked_products','tracked_conferences',
    'tracked_technologies','tracker_signals','_temp_file_chunks',
    'token_logs','cache_store','api_quota_log'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security;', t);
      begin
        execute format(
          'create policy %I on public.%I for all to service_role using (true) with check (true);',
          t || '_service_all', t);
      exception when duplicate_object then null; end;
    end if;
  end loop;
end $$;
