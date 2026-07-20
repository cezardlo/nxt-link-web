-- =============================================================================
-- NXT LINK — Row Level Security Hardening
-- Migration: 20260323_rls_policies.sql
-- Idempotent: safe to re-run
--
-- Problem: existing RLS policies grant anon SELECT on everything with
--          USING (true). This migration replaces open policies with
--          role-aware, tiered-access policies:
--
--   1. Vendors: anon can only see approved/active vendors
--   2. Signals: free-tier (anon) gets 7-day delayed access to high-value signals
--   3. Authenticated users can read all non-restricted data
--   4. Admin (service_role) retains full CRUD
--   5. KG tables get proper authenticated + anon policies
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: create an admin role claim check function
-- Uses Supabase JWT custom claims: auth.jwt()->'app_metadata'->>'role'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.sub', true),
    ''
  ) <> '';
$$;


-- =============================================================================
-- VENDORS — public read for approved only; authenticated read all; admin full
-- =============================================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies
DROP POLICY IF EXISTS "public_read_approved_vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow anon approved vendors" ON public.vendors;
DROP POLICY IF EXISTS "anon_read_vendors" ON public.vendors;

-- Anon: only approved/active vendors
DO $$ BEGIN
  CREATE POLICY "vendors_anon_select"
    ON public.vendors FOR SELECT
    TO anon
    USING (lower(trim(status)) IN ('approved', 'active'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated: can read all vendors (including pending for their own submissions)
DO $$ BEGIN
  CREATE POLICY "vendors_authenticated_select"
    ON public.vendors FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated admin: full CRUD
DO $$ BEGIN
  CREATE POLICY "vendors_admin_all"
    ON public.vendors FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role: full access (agents, cron, backend)
DROP POLICY IF EXISTS "vendors_service_all" ON public.vendors;
DO $$ BEGIN
  CREATE POLICY "vendors_service_all"
    ON public.vendors FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.vendors TO authenticated;


-- =============================================================================
-- SIGNALS — tiered access: anon gets 7-day delay on critical/high severity
-- =============================================================================

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_signals" ON public.signals;
DROP POLICY IF EXISTS "signals_anon_select" ON public.signals;

-- Anon: immediate access to moderate/low severity;
-- critical/high severity signals are delayed 7 days (free-tier paywall)
DO $$ BEGIN
  CREATE POLICY "signals_anon_select_tiered"
    ON public.signals FOR SELECT
    TO anon
    USING (
      severity IN ('moderate', 'low')
      OR detected_at <= now() - interval '7 days'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated: full signal access (paid tier)
DO $$ BEGIN
  CREATE POLICY "signals_authenticated_select"
    ON public.signals FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role
DROP POLICY IF EXISTS "signals_service_all" ON public.signals;
DO $$ BEGIN
  CREATE POLICY "signals_service_all"
    ON public.signals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.signals TO anon;
GRANT SELECT ON public.signals TO authenticated;


-- =============================================================================
-- KG_SIGNALS — same tiered pattern (P0/P1 delayed for anon)
-- =============================================================================

ALTER TABLE public.kg_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_kg_signals" ON public.kg_signals;

-- Anon: P2/P3 immediate, P0/P1 delayed 7 days
DO $$ BEGIN
  CREATE POLICY "kg_signals_anon_select_tiered"
    ON public.kg_signals FOR SELECT
    TO anon
    USING (
      priority IN ('P2', 'P3')
      OR detected_at <= now() - interval '7 days'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated: full access
DO $$ BEGIN
  CREATE POLICY "kg_signals_authenticated_select"
    ON public.kg_signals FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role (keep existing or re-create)
DROP POLICY IF EXISTS "service_all_kg_signals" ON public.kg_signals;
DO $$ BEGIN
  CREATE POLICY "kg_signals_service_all"
    ON public.kg_signals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.kg_signals TO anon;
GRANT SELECT ON public.kg_signals TO authenticated;


-- =============================================================================
-- TECHNOLOGIES — public read; admin write
-- =============================================================================

ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "technologies_anon_select" ON public.technologies;

DO $$ BEGIN
  CREATE POLICY "technologies_anon_select"
    ON public.technologies FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "technologies_authenticated_select"
    ON public.technologies FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "technologies_admin_all"
    ON public.technologies FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "technologies_service_all" ON public.technologies;
DO $$ BEGIN
  CREATE POLICY "technologies_service_all"
    ON public.technologies FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.technologies TO anon;
GRANT SELECT ON public.technologies TO authenticated;


-- =============================================================================
-- KG_TECHNOLOGIES — same pattern
-- =============================================================================

ALTER TABLE public.kg_technologies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_kg_technologies" ON public.kg_technologies;

DO $$ BEGIN
  CREATE POLICY "kg_technologies_anon_select"
    ON public.kg_technologies FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kg_technologies_authenticated_select"
    ON public.kg_technologies FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kg_technologies_admin_all"
    ON public.kg_technologies FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "service_all_kg_technologies" ON public.kg_technologies;
DO $$ BEGIN
  CREATE POLICY "kg_technologies_service_all"
    ON public.kg_technologies FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.kg_technologies TO anon;
GRANT SELECT ON public.kg_technologies TO authenticated;


-- =============================================================================
-- FEED_ITEMS — read only for consumers; service_role writes
-- =============================================================================

ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_items_anon_select" ON public.feed_items;

DO $$ BEGIN
  CREATE POLICY "feed_items_anon_select"
    ON public.feed_items FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "feed_items_authenticated_select"
    ON public.feed_items FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "feed_items_service_all" ON public.feed_items;
DO $$ BEGIN
  CREATE POLICY "feed_items_service_all"
    ON public.feed_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.feed_items TO anon;
GRANT SELECT ON public.feed_items TO authenticated;


-- =============================================================================
-- AGENT_RUNS — authenticated read; admin + service write
-- =============================================================================

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_agent_runs" ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs_anon_select" ON public.agent_runs;

-- Anon: no access to agent run details (internal operational data)
DO $$ BEGIN
  CREATE POLICY "agent_runs_authenticated_select"
    ON public.agent_runs FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "agent_runs_service_all" ON public.agent_runs;
DO $$ BEGIN
  CREATE POLICY "agent_runs_service_all"
    ON public.agent_runs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.agent_runs TO authenticated;


-- =============================================================================
-- OPPORTUNITIES — public read; service writes
-- =============================================================================

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunities_anon_select" ON public.opportunities;

DO $$ BEGIN
  CREATE POLICY "opportunities_anon_select"
    ON public.opportunities FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "opportunities_authenticated_select"
    ON public.opportunities FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "opportunities_service_all" ON public.opportunities;
DO $$ BEGIN
  CREATE POLICY "opportunities_service_all"
    ON public.opportunities FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.opportunities TO anon;
GRANT SELECT ON public.opportunities TO authenticated;


-- =============================================================================
-- Grant authenticated role schema access
-- =============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
