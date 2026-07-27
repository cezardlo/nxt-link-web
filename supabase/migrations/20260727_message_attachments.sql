-- ============================================================================
-- NXT//LINK — file attachments on buyer <-> vendor messages
-- Additive only. One row per uploaded file, linked to the existing `messages`
-- table (itself scoped to a quote_requests thread). Reuses the existing
-- private 'vendor-brochures' Storage bucket under a new path prefix
-- (message-attachments/<quote_request_id>/...) instead of creating a new
-- bucket — see workplace notes for this feature. All reads/writes go through
-- ownership-scoped server routes (service role); no direct client access.
-- Touches no existing data.
-- ============================================================================

create table if not exists public.message_attachments (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references public.messages(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,   -- ORIGINAL name — display metadata only, never used as/in the storage path
  file_type     text,
  size_bytes    integer not null,
  created_at    timestamptz not null default now()
);
create index if not exists message_attachments_message_idx on public.message_attachments (message_id);

alter table public.message_attachments enable row level security;
do $$
begin
  begin
    create policy message_attachments_service_all on public.message_attachments
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;

-- No new storage bucket: 'vendor-brochures' already exists (private, no
-- anon/authenticated storage.objects policies — service-role only, signed
-- URLs on read), created in 20260629_vendor_signup_zoho.sql. Message
-- attachments live under the 'message-attachments/' prefix inside it.
