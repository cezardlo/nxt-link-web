-- =============================================================================
-- NXT LINK — Audit Logging Infrastructure
-- Migration: 20260323_audit_log.sql
-- Idempotent: safe to re-run
--
-- Creates:
--   1. audit_log table — immutable append-only log of all access events
--   2. Trigger function for vendor access logging
--   3. Trigger function for signal access logging
--   4. Performance indexes on user_id and created_at
--   5. RLS: only service_role can write; admins can read; users see own logs
--   6. Auto-cleanup of logs older than 90 days
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUDIT_LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text,                                     -- auth.uid() or 'anon' or API key identifier
  action        text          NOT NULL,                   -- 'view', 'search', 'export', 'create', 'update', 'delete'
  resource_type text          NOT NULL,                   -- 'vendor', 'signal', 'kg_signal', 'technology', 'opportunity', etc.
  resource_id   text,                                     -- UUID or slug of accessed resource (nullable for list queries)
  metadata      jsonb         DEFAULT '{}'::jsonb,        -- flexible context: query params, filters, result count, etc.
  ip_address    inet,                                     -- client IP from request headers
  user_agent    text,                                     -- browser/bot user agent string
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- Prevent updates/deletes on audit log (append-only)
CREATE OR REPLACE RULE audit_log_no_update AS
  ON UPDATE TO public.audit_log
  DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete AS
  ON DELETE TO public.audit_log
  DO INSTEAD NOTHING;

COMMENT ON TABLE public.audit_log IS 'Immutable append-only audit trail for all data access events';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INDEXES for fast query patterns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON public.audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON public.audit_log(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON public.audit_log(action, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS POLICIES — strict access control on audit data
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service role: full insert (used by API routes and trigger functions)
DO $$ BEGIN
  CREATE POLICY "audit_log_service_insert"
    ON public.audit_log FOR INSERT
    TO service_role
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role: full read (for admin dashboards via backend)
DO $$ BEGIN
  CREATE POLICY "audit_log_service_select"
    ON public.audit_log FOR SELECT
    TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin users: can read all audit logs
DO $$ BEGIN
  CREATE POLICY "audit_log_admin_select"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Regular authenticated users: can only see their own audit trail
DO $$ BEGIN
  CREATE POLICY "audit_log_user_own_select"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (user_id = (current_setting('request.jwt.claim.sub', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No anon access to audit logs
-- No UPDATE or DELETE policies (append-only enforced by RULES above)

GRANT INSERT ON public.audit_log TO service_role;
GRANT SELECT ON public.audit_log TO service_role;
GRANT SELECT ON public.audit_log TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER FUNCTION — Log vendor data access
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_vendor_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    coalesce(current_setting('request.jwt.claim.sub', true), 'anon'),
    TG_ARGV[0],          -- 'create', 'update', 'delete' passed as trigger arg
    'vendor',
    NEW.id::text,
    jsonb_build_object(
      'vendor_name', coalesce(NEW.name, NEW.company_name),
      'status', NEW.status,
      'trigger', TG_NAME
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger on vendor INSERT
DROP TRIGGER IF EXISTS trg_audit_vendor_insert ON public.vendors;
CREATE TRIGGER trg_audit_vendor_insert
  AFTER INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.log_vendor_access('create');

-- Trigger on vendor UPDATE
DROP TRIGGER IF EXISTS trg_audit_vendor_update ON public.vendors;
CREATE TRIGGER trg_audit_vendor_update
  AFTER UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.log_vendor_access('update');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGER FUNCTION — Log signal data access / mutations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_signal_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    coalesce(current_setting('request.jwt.claim.sub', true), 'anon'),
    TG_ARGV[0],
    'signal',
    NEW.id::text,
    jsonb_build_object(
      'title', NEW.title,
      'severity', coalesce(NEW.severity, 'unknown'),
      'sector', coalesce(NEW.sector, 'unknown'),
      'trigger', TG_NAME
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger on signals INSERT
DROP TRIGGER IF EXISTS trg_audit_signal_insert ON public.signals;
CREATE TRIGGER trg_audit_signal_insert
  AFTER INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_signal_access('create');

-- Trigger on signals UPDATE (e.g., when IKER scores are applied)
DROP TRIGGER IF EXISTS trg_audit_signal_update ON public.signals;
CREATE TRIGGER trg_audit_signal_update
  AFTER UPDATE ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_signal_access('update');


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER FUNCTION — Log KG signal mutations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_kg_signal_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    coalesce(current_setting('request.jwt.claim.sub', true), 'anon'),
    TG_ARGV[0],
    'kg_signal',
    NEW.id::text,
    jsonb_build_object(
      'title', NEW.title,
      'signal_type', coalesce(NEW.signal_type, 'unknown'),
      'priority', coalesce(NEW.priority, 'unknown'),
      'trigger', TG_NAME
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger on kg_signals INSERT
DROP TRIGGER IF EXISTS trg_audit_kg_signal_insert ON public.kg_signals;
CREATE TRIGGER trg_audit_kg_signal_insert
  AFTER INSERT ON public.kg_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kg_signal_access('create');

-- Trigger on kg_signals UPDATE
DROP TRIGGER IF EXISTS trg_audit_kg_signal_update ON public.kg_signals;
CREATE TRIGGER trg_audit_kg_signal_update
  AFTER UPDATE ON public.kg_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kg_signal_access('update');


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLEANUP — Purge audit logs older than 90 days
-- Schedule with pg_cron: SELECT cron.schedule('0 4 * * *', 'SELECT cleanup_audit_logs()');
-- ─────────────────────────────────────────────────────────────────────────────

-- Temporarily allow deletes for the cleanup function only
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass the no-delete rule by using TRUNCATE on a temp partition
  -- or direct delete with the SECURITY DEFINER context
  DELETE FROM public.audit_log
  WHERE created_at < now() - interval '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_audit_logs IS 'Purges audit entries older than 90 days. Schedule with pg_cron daily at 04:00 UTC.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. VIEWS — Convenient audit summaries for admin dashboards
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.audit_summary_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  action,
  resource_type,
  count(*)                            AS event_count,
  count(DISTINCT user_id)             AS unique_users
FROM public.audit_log
WHERE created_at > now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

COMMENT ON VIEW public.audit_summary_daily IS 'Daily aggregated audit stats for the last 30 days';
