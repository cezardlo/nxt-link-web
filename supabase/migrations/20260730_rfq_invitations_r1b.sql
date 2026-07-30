-- ============================================================================
-- NXT//LINK — RFQ Slice R1b: request_invitations (buyer-invited vendors)
-- workplace/plans/rfq-seamless-build-2026-07-29.md, R1b: "Two send modes:
-- A) Match me with vendors (auto-match, existing dispatchRequestToVendors)
-- B) Invite specific vendors chosen from the marketplace (NEW — this table)."
--
-- Brand-new, additive-only table — touches no existing column, constraint,
-- or table. request_invitations is a TRACKING/AUDIT record for send-mode B:
-- the actual lead a vendor sees is still an ordinary quote_requests row
-- (created by src/lib/requests/dispatch.ts inviteVendorsToRequest(), same
-- shape as the existing auto-match dispatch path, tagged
-- answers.invited=true instead of answers.dispatched=true). This table just
-- remembers WHO was explicitly invited to WHICH open request, and tracks
-- invite-specific status independent of quote_requests.status (which already
-- means something else — see 20260729_quote_requests_status_vocabulary.sql).
--
-- Minimal status vocabulary: invited (default, set at invite time) ->
-- viewed (vendor opened their leads inbox — auto-written, never-downgrade
-- guarded, see src/lib/requests/invitations.ts) -> quoted / declined
-- (defined here for the full lifecycle; NOT wired to any writer in this
-- slice — deliberate v1 scope cut, see the R1b build report. Real "did they
-- quote" state is already tracked honestly on quote_requests.status/
-- quote_amount and is what the buyer dashboard and vendor leads inbox
-- actually read today).
--
-- unique(request_id, vendor_id): one invitation per vendor per request —
-- re-inviting the same vendor is a no-op, not a duplicate row.
--
-- All access goes through the service role (server-side writes only, no
-- anon/authenticated client access), mirroring 20260708_notifications.sql.
-- Idempotent: safe to run more than once.
-- ============================================================================

create table if not exists public.request_invitations (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references public.client_requests(id) on delete cascade,
  vendor_id         uuid not null references public.vendor_profiles(id) on delete cascade,
  quote_request_id  uuid references public.quote_requests(id) on delete set null,
  status            text not null default 'invited' check (status in ('invited', 'viewed', 'quoted', 'declined')),
  invited_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (request_id, vendor_id)
);
create index if not exists request_invitations_request_idx on public.request_invitations (request_id);
create index if not exists request_invitations_vendor_idx on public.request_invitations (vendor_id, status);
create index if not exists request_invitations_quote_request_idx on public.request_invitations (quote_request_id);

alter table public.request_invitations enable row level security;
do $$
begin
  begin
    create policy request_invitations_service_all on public.request_invitations
      for all to service_role using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;
