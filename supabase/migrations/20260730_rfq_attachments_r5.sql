-- ============================================================================
-- NXT//LINK — RFQ Slice R5: request attachments (buyer -> request, read-only
-- for the vendor(s) who legitimately see that request).
-- workplace/plans/rfq-seamless-build-2026-07-29.md, slice R5.
--
-- Additive only, idempotent (if not exists / do $$ ... exception when
-- duplicate_object). Mirrors the EXACT pattern of
-- supabase/migrations/20260727_message_attachments.sql (same private Storage
-- bucket, same service-role-only RLS shape) but links directly to
-- quote_requests instead of messages — a request can carry files (spec
-- sheets, drawings, POs, photos) even before any chat message exists.
--
-- No new Storage bucket: reuses the existing private 'vendor-brochures'
-- bucket (created in 20260629_vendor_signup_zoho.sql, already holding the
-- 'message-attachments/' prefix) under a NEW 'request-attachments/' prefix.
-- All reads/writes go through ownership-scoped server routes (service role);
-- no direct client access, no new bucket policy needed.
-- ============================================================================

create table if not exists public.request_attachments (
  id               uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  storage_path     text not null,
  file_name        text not null,   -- ORIGINAL name — display metadata only, never used as/in the storage path
  file_type        text,
  size_bytes       integer not null,
  created_at       timestamptz not null default now()
);
create index if not exists request_attachments_qr_idx on public.request_attachments (quote_request_id);

alter table public.request_attachments enable row level security;
do $$
begin
  begin
    create policy request_attachments_service_all on public.request_attachments
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
