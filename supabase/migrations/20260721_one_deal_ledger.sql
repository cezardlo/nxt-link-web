-- ============================================================================
-- NXT//LINK — Payments S0, Phase A: one deal ledger (capture + link)
-- Approved: workplace/plans/DECISIONS-2026-07-21.md §1 (S0 merge APPROVED)
-- Architecture: workplace/plans/payments-s0-ledger-merge-plan.md §5, §6 (steps 1-7)
--
-- PURPOSE
-- `commissions` is migration-backed (this repo). `manual_deals` — the
-- operator's real deal + money tracker (amount owed, invoiced, paid,
-- protection window, free-deal credit) — had NO migration anywhere in the
-- repo; it only existed on the live database (confirmed by read-only
-- introspection below). This file:
--   1) source-controls manual_deals exactly as it exists live (baseline
--      snapshot — table, indexes, status check, updated_at trigger, RLS +
--      policies),
--   2) adds a nullable `commission_id` link from manual_deals to commissions,
--   3) backfills that link for already-matching rows (source_quote_id =
--      commissions.quote_request_id), non-destructively,
--   4) adds FKs for the new link (valid) and the two pre-existing loose
--      references, source_quote_id and vendor_id (NOT VALID — see reasoning
--      below),
--   5) creates the read-only `commission_ledger` view (manual_deals LEFT
--      JOIN commissions) with a computed `discrepancy` flag.
-- This is DB-only. No behavior changes: calculateFee() is untouched, no
-- application code in this repo reads commission_id or commission_ledger
-- yet (that's Phase B). Nothing is applied to any live database by this
-- agent — this is a file for Cesar to review and apply per G6.
--
-- LIVE INTROSPECTION (read-only, project yvykselwehxjwsqercjg, 2026-07-21)
-- Ran via Supabase MCP: information_schema.columns, pg_constraint,
-- pg_indexes, pg_policies, pg_trigger, pg_proc, role_table_grants,
-- pg_default_acl for public.manual_deals. No DDL/DML was run against live;
-- `select status, count(*) from manual_deals group by status` was the only
-- data query, returning zero rows (see below). Findings:
--   - manual_deals ALREADY EXISTS live with the exact 25 columns snapshotted
--     in SECTION 1 below (types/nullability/defaults confirmed column by
--     column). It currently holds 0 rows.
--   - manual_deals_status_check ALREADY EXISTS live and already matches
--     the plan's proposed vocabulary exactly: reserved, won,
--     payment_reported, payment_confirmed, invoiced, paid, overdue,
--     disputed, credited, cancelled (= exactly the STATUSES array in
--     src/app/api/admin/deals/route.ts). No widening needed — plan step 6
--     is a no-op confirmation, folded into SECTION 1.
--   - Indexes already live: manual_deals_pkey, manual_deals_status_idx,
--     manual_deals_vendor_idx, uniq_manual_deals_source_quote (UNIQUE,
--     partial WHERE source_quote_id IS NOT NULL).
--   - No FK constraints exist yet on manual_deals (only the PK and the
--     status check) — commission_id, source_quote_id, vendor_id are all
--     currently unenforced. vendor_id is typed `uuid` live (NOT text —
--     the plan's speculative "text vendor_id from co-pilot entries" note
--     does not apply to the current column type; NOT VALID is still used
--     below, defensively, since 0 rows means it costs nothing).
--   - RLS is ALREADY ENABLED live (relrowsecurity=true, forcerowsecurity=
--     false) with TWO existing policies: `md_admin_all` (ALL, to
--     authenticated, using/with check public.is_admin()) and
--     `md_service_all` (ALL, to service_role, using/with check true).
--     *** This is a deviation from the assumed baseline in this task's
--     brief, which described RLS state as unknown and asked for a
--     service-role-only policy mirroring vendor_profiles. Live reality is
--     richer than that (it already has an admin-authenticated policy too,
--     gated by the same public.is_admin() helper used everywhere else in
--     this schema — see 20260323_rls_policies.sql / 20260626_
--     nxtlink_rls_user.sql, both already in this repo, not live-only). ***
--     SECTION 1 source-controls exactly what's live rather than narrowing
--     to service-role-only, because narrowing would not match production
--     and is_admin() is already a vetted, widely-used gate — not a new
--     access surface. Confirmed via grep of src/app/api/**: every current
--     read/write of manual_deals uses the admin (service-role) Supabase
--     client — src/app/api/admin/deals/route.ts, .../admin/deals/assist/
--     route.ts, .../buyer/quote-decision/route.ts, .../vendor/deals/
--     route.ts — none use the anon/authenticated client, so md_admin_all
--     is a dormant safety net today, not something app code depends on.
--   - public.is_admin() already exists (both live and in-repo migrations)
--     — no new function needed for the policies.
--   - trg_touch_manual_deal (BEFORE UPDATE, sets updated_at = now()) exists
--     live and calls a function `touch_project()` that is ALSO live-only
--     (not in any repo migration — same kind of drift as manual_deals
--     itself). SECTION 1 source-controls that function too (CREATE OR
--     REPLACE, identical body to the confirmed live definition) so a fresh
--     environment ends up with the same trigger behavior.
--   - Default ACL on the `public` schema grants anon/authenticated broad
--     table-level privileges (SELECT/INSERT/UPDATE/DELETE/...) on every
--     NEW relation created by the `postgres` role — confirmed via
--     pg_default_acl and role_table_grants on manual_deals itself, which
--     already carries those grants (this is the standard Supabase
--     grant-then-restrict-with-RLS pattern; harmless on manual_deals
--     itself because RLS is enabled and md_admin_all/md_service_all are
--     the only paths in). It is NOT harmless on a VIEW: manual_deals has
--     `forcerowsecurity = false`, so the table OWNER (postgres, the role
--     that runs migrations) bypasses RLS, and a plain view runs with the
--     owner's row-visibility by default. Combined with the automatic
--     anon/authenticated grant, an unprotected view over manual_deals
--     would leak every deal (buyer, vendor, amounts) to any anon/
--     authenticated caller — exactly the risk the plan's §4 flags. SECTION
--     6 below closes this with `security_invoker = true` (forces the
--     view to re-check RLS as the querying role, not the owner) AND
--     explicit REVOKE from public/anon/authenticated + GRANT to
--     service_role only, belt-and-suspenders.
--
-- DEPLOY-ORDER LAW (house law, ENGINEERING-PROCESS.md G6 + the ledger plan
-- §6): migrations go to the live database FIRST, with Cesar's explicit
-- approval, and ONLY THEN does the code that depends on them deploy. This
-- file changes no application code, so Phase A can be applied on its own
-- with no code deploy required at all — Phase B is what starts reading
-- commission_id / commission_ledger.
--
-- ROLLBACK — run in REVERSE section order if ever undoing this file. If
-- application code from a LATER phase (B/C/D) has already shipped and reads
-- commission_id or commission_ledger, redeploy the PRIOR code build FIRST,
-- THEN run the down-migration below — never leave shipped code reading a
-- column/view the database no longer has.
--   Section 6 (view):        drop view if exists public.commission_ledger;
--   Section 4 (FKs):         alter table public.manual_deals
--                               drop constraint if exists manual_deals_commission_id_fkey,
--                               drop constraint if exists manual_deals_source_quote_id_fkey,
--                               drop constraint if exists manual_deals_vendor_id_fkey;
--   Section 3 (backfill):    update public.manual_deals set commission_id = null;
--                             -- fully reversible: nothing else in this file
--                             -- reads or is derived from commission_id yet.
--   Section 2 (column):      drop index if exists public.manual_deals_commission_id_idx;
--                             alter table public.manual_deals
--                               drop column if exists commission_id;
--   Section 1 (baseline):    DO NOT roll back on live. RLS, its policies,
--                             the status check, the indexes, and the table
--                             itself all predate this migration in
--                             production — rolling them back would REMOVE
--                             protection/behavior that already exists, not
--                             undo something this migration added. Section
--                             1 exists purely so a fresh/non-prod
--                             environment can reach the same state; it is
--                             inert everywhere this table already exists.
--
-- Idempotent throughout: every statement is IF NOT EXISTS / IF EXISTS /
-- CREATE OR REPLACE, or guarded by a DO block that checks pg_constraint
-- first. Safe to run more than once. NEVER touches commission_amount,
-- effective_rate, fee_policy_version, protected_until, or credit_applied —
-- those money/audit fields are read-only in this migration (backfill only
-- sets the new commission_id column, nothing else).
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Baseline snapshot (plan step 1; folds in plan steps 5 & 7,
-- both confirmed already-live and unchanged by introspection above).
-- Every statement here is inert against the live database.
-- ============================================================================

create table if not exists public.manual_deals (
  id                  uuid primary key default gen_random_uuid(),
  opportunity_ref     text,
  vendor_id           uuid,
  vendor_name         text not null,
  buyer_name          text,
  buyer_company       text,
  description         text,
  gross_amount        numeric,
  net_amount          numeric not null,
  currency            text not null default 'USD',
  fee_policy_version  text,
  commission_amount   numeric,
  effective_rate      numeric,
  applied_cap         boolean default false,
  is_free_credit      boolean default false,
  credit_applied      numeric,
  status              text not null default 'reserved',
  invoice_ref         text,
  protected_until     date,
  paid_at             timestamptz,
  notes               text,
  created_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  source_quote_id     uuid
);

create index if not exists manual_deals_status_idx on public.manual_deals (status);
create index if not exists manual_deals_vendor_idx on public.manual_deals (vendor_id);
create unique index if not exists uniq_manual_deals_source_quote
  on public.manual_deals (source_quote_id) where source_quote_id is not null;

-- Status vocabulary — matches live exactly (see LIVE INTROSPECTION above)
-- and the STATUSES array in src/app/api/admin/deals/route.ts. ADD
-- CONSTRAINT has no IF NOT EXISTS clause in Postgres, so guard explicitly.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.manual_deals'::regclass
      and conname = 'manual_deals_status_check'
  ) then
    alter table public.manual_deals add constraint manual_deals_status_check
      check (status in (
        'reserved', 'won', 'payment_reported', 'payment_confirmed',
        'invoiced', 'paid', 'overdue', 'disputed', 'credited', 'cancelled'
      ));
  end if;
end $$;

-- updated_at toucher — live-only function, source-controlled here
-- (identical body to the confirmed live definition of touch_project()).
create or replace function public.touch_project() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_touch_manual_deal on public.manual_deals;
create trigger trg_touch_manual_deal before update on public.manual_deals
  for each row execute function public.touch_project();

-- RLS — already enabled live with these two policies; source-controlled
-- as-is (see the *** deviation note *** in LIVE INTROSPECTION above for
-- why this is not narrowed to service-role-only).
alter table public.manual_deals enable row level security;

do $$
begin
  begin
    create policy md_admin_all on public.manual_deals
      for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  exception when duplicate_object then null; end;
  begin
    create policy md_service_all on public.manual_deals
      for all to service_role
      using (true) with check (true);
  exception when duplicate_object then null; end;
end $$;


-- ============================================================================
-- SECTION 2 — commission_id link (plan step 2). Nullable: manual_deals rows
-- created by an operator with no matching quote (no source_quote_id) will
-- never get one, by design (see plan §1 — that's a real, supported case).
-- ============================================================================

alter table public.manual_deals add column if not exists commission_id uuid;
create index if not exists manual_deals_commission_id_idx on public.manual_deals (commission_id);


-- ============================================================================
-- SECTION 3 — Backfill (plan step 3). Idempotent (only fills NULLs) and
-- non-destructive: touches ONLY commission_id, never commission_amount,
-- effective_rate, fee_policy_version, protected_until, or credit_applied.
-- Live currently has 0 manual_deals rows, so this is a true no-op today;
-- it matters once real rows exist and/or on any environment seeded with
-- historical data.
-- ============================================================================

update public.manual_deals d
set commission_id = c.id
from public.commissions c
where d.source_quote_id = c.quote_request_id
  and d.commission_id is null;


-- ============================================================================
-- SECTION 4 — Foreign keys (plan step 4). commission_id is added VALID (the
-- backfill above just ran, and there are 0 existing rows to conflict with).
-- source_quote_id and vendor_id are pre-existing loose references with no
-- FK today, so they're added NOT VALID — validating them retroactively is
-- a separate, deliberate future step, not automatic here.
--
-- ON DELETE SET NULL on all three (not CASCADE): manual_deals is the
-- authoritative money/deal record — losing the deal row because a related
-- commissions/quote_requests/vendor_profiles row was removed would be a
-- money-history loss. SET NULL preserves the deal, just drops the link.
-- This also matches the existing precedent on quote_requests_vendor_id_fkey
-- (ON DELETE SET NULL, not CASCADE).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.manual_deals'::regclass
      and conname = 'manual_deals_commission_id_fkey'
  ) then
    alter table public.manual_deals
      add constraint manual_deals_commission_id_fkey
      foreign key (commission_id) references public.commissions(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.manual_deals'::regclass
      and conname = 'manual_deals_source_quote_id_fkey'
  ) then
    alter table public.manual_deals
      add constraint manual_deals_source_quote_id_fkey
      foreign key (source_quote_id) references public.quote_requests(id)
      on delete set null not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.manual_deals'::regclass
      and conname = 'manual_deals_vendor_id_fkey'
  ) then
    alter table public.manual_deals
      add constraint manual_deals_vendor_id_fkey
      foreign key (vendor_id) references public.vendor_profiles(id)
      on delete set null not valid;
  end if;
end $$;


-- ============================================================================
-- SECTION 5 — Status check constraint (plan step 6): already satisfied by
-- SECTION 1 above (live introspection found the constraint already matches
-- the full deal-lifecycle vocabulary). No further action. Left as an
-- explicit marker so the plan's step ordering is traceable in this file.
-- ============================================================================


-- ============================================================================
-- SECTION 6 — commission_ledger view (plan step 6/§7 in the merge plan;
-- exposes the DECISIONS-2026-07-21 §1 required fields). Read-only. One row
-- per manual_deals record, LEFT JOINed to its linked commissions row.
-- processing_fee / vendor_payout / refund_status / refund_amount /
-- dispute_status are nullable Stripe-era placeholders (DECISIONS §1) until
-- Stripe Connect is live — nothing here implies NXT//LINK holds funds.
--
-- security_invoker = true is REQUIRED here, not optional: without it this
-- view would run with the view owner's (postgres) row-visibility, which
-- bypasses RLS on manual_deals (forcerowsecurity = false → owner bypasses
-- RLS), and Postgres's default per-schema ACL already grants anon/
-- authenticated broad privileges on new relations (confirmed live via
-- pg_default_acl). Without security_invoker + the explicit REVOKE below,
-- this view would leak every buyer/vendor/amount to any anon or
-- authenticated caller. With it, the view re-checks manual_deals'/
-- commissions' RLS as the ACTUAL querying role — service_role only.
-- ============================================================================

create or replace view public.commission_ledger
with (security_invoker = true)
as
select
  d.id                                as deal_id,
  d.opportunity_ref                   as contract_ref,
  d.source_quote_id                   as quote_request_id,
  d.commission_id,
  coalesce(d.vendor_id, c.vendor_id)  as vendor_id,
  d.vendor_name,
  d.buyer_name,
  d.buyer_company,
  d.description,
  d.gross_amount,
  d.net_amount                        as deal_amount,
  d.currency,
  d.commission_amount                 as nxtlink_fee,
  d.effective_rate                    as nxtlink_fee_rate,
  d.applied_cap,
  d.is_free_credit,
  d.credit_applied,
  null::numeric                       as processing_fee,   -- Stripe-era placeholder
  null::numeric                       as vendor_payout,     -- Stripe-era placeholder
  null::text                          as refund_status,     -- Stripe-era placeholder
  null::numeric                       as refund_amount,     -- Stripe-era placeholder
  null::text                          as dispute_status,    -- Stripe-era placeholder
  d.status                            as payment_status,
  d.invoice_ref,
  d.protected_until,
  d.paid_at,
  d.notes,
  d.created_at,
  d.updated_at,
  c.status                            as commission_status,
  c.quote_amount                      as commission_quote_amount,
  c.commission_amount                 as commission_fee,
  c.final_amount                      as commission_final_amount,
  c.invoice_number                    as commission_invoice_number,
  c.billed_at                         as commission_billed_at,
  c.due_date                          as commission_due_date,
  c.paid_at                           as commission_paid_at,
  case
    when c.id is null then false
    when d.commission_amount is distinct from c.commission_amount then true
    when d.net_amount is distinct from c.quote_amount then true
    when (d.status = 'paid') <> (c.status = 'paid') then true
    else false
  end                                  as discrepancy
from public.manual_deals d
left join public.commissions c on c.id = d.commission_id;

comment on view public.commission_ledger is
  'Read-only unified deal ledger (Payments S0, DECISIONS-2026-07-21 S1). '
  'One row per manual_deals record, left-joined to its linked commissions '
  'row via commission_id. Access is SERVICE ROLE ONLY through admin-gated '
  'API routes (see src/app/api/admin/commissions, src/app/api/admin/deals) '
  '-- never GRANT to authenticated or anon. processing_fee, vendor_payout, '
  'refund_status, refund_amount, dispute_status are nullable Stripe-era '
  'placeholders until Stripe Connect ships. discrepancy = true when the '
  'linked commissions row disagrees with manual_deals on fee amount, deal '
  'amount vs quoted amount, or paid state.';

revoke all on public.commission_ledger from public;
revoke all on public.commission_ledger from anon;
revoke all on public.commission_ledger from authenticated;
grant select on public.commission_ledger to service_role;


-- ============================================================================
-- SECTION 7 — RLS on manual_deals (plan step 7): already satisfied by
-- SECTION 1 above (live introspection found RLS already enabled with the
-- md_admin_all / md_service_all policies). No further action. Left as an
-- explicit marker so the plan's step ordering is traceable in this file.
-- ============================================================================
