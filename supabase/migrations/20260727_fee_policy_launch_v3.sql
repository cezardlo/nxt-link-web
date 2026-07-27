-- ============================================================================
-- NXT//LINK — seed the launch-v3 fee schedule into the versioned, immutable
-- fee_policies ledger (Cesar's ruling 2026-07-27, supersedes launch-v2).
--
-- New schedule: 4% on the first $50,000 of the eligible subtotal, 2% above,
-- hard cap $12,500 per deal, no minimum. Matches src/lib/fees/engine.ts
-- DEFAULT_FEE_POLICY (version 'launch-v3').
--
-- WHY THIS IS SAFE / OPTIONAL:
--   * The money-path tables (commissions, manual_deals) store fee_policy_version
--     as free text with NO foreign key to fee_policies — verified against the
--     live DB. So new commissions/deals stamped 'launch-v3' work with or without
--     this row. This seed is NOT required for the fee math to run.
--   * It IS recommended so the immutable policy ledger stays complete, and so
--     the FK-bound audit tables (fee_acknowledgments.policy_version and
--     fee_calculations.policy_version, which reference fee_policies.version) can
--     record 'launch-v3' if/when that flow is built. Live already holds
--     launch-v1, launch-v2, provisional-v1.
--
-- Requires legal/tax review before launch (effective_from left null).
-- Idempotent: on conflict do nothing. INSERT only — never trips the
-- fee_policies immutability guard (which fires on UPDATE/DELETE).
-- Apply only with Cesar's explicit approval (agents never apply to prod).
-- ============================================================================

insert into public.fee_policies (version, label, brackets, minimum_fee, maximum_fee, effective_from)
values (
  'launch-v3',
  'Launch schedule: 4% on first $50k, 2% above, $12,500 cap per deal, no minimum (requires legal/tax review before launch)',
  '[{"upTo":50000,"rate":0.04},{"upTo":null,"rate":0.02}]'::jsonb,
  null,
  12500,
  null
)
on conflict (version) do nothing;
