/**
 * NXT LINK — Audit Logging Utility
 *
 * Call from API routes to log data-access and mutation events
 * to the audit_log table. Uses the service_role client since
 * audit inserts bypass RLS intentionally.
 *
 * Usage in an API route:
 *
 *   import { logAudit } from '@/lib/audit';
 *
 *   export async function GET(req: Request) {
 *     await logAudit({
 *       action: 'view',
 *       resourceType: 'vendor',
 *       resourceId: slug,
 *       ip: req.headers.get('x-forwarded-for') ?? undefined,
 *       metadata: { query: Object.fromEntries(url.searchParams) },
 *     });
 *   }
 */

import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditParams {
  /** Supabase auth user ID, or 'anon' for unauthenticated requests */
  userId?: string;
  /** What happened: 'view', 'search', 'create', 'update', 'delete', 'export' */
  action: string;
  /** Entity type: 'vendor', 'signal', 'kg_signal', 'technology', 'opportunity', etc. */
  resourceType: string;
  /** UUID or slug of the specific resource (null for list/search queries) */
  resourceId?: string;
  /** Arbitrary context — query params, filters, result counts, etc. */
  metadata?: Record<string, unknown>;
  /** Client IP address from x-forwarded-for or request socket */
  ip?: string;
  /** Browser / bot user-agent string */
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Insert one row into public.audit_log.
 *
 * Errors are caught and logged to stderr — audit logging must never
 * break the request that called it.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = createClient({ admin: true });

    const { error } = await supabase.from('audit_log').insert({
      user_id: params.userId ?? 'anon',
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    });

    if (error) {
      console.error('[audit] Failed to write audit log:', error.message);
    }
  } catch (err) {
    // Never throw — audit is best-effort
    console.error(
      '[audit] Unexpected error:',
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Extract audit-relevant headers from a Request object */
export function extractRequestMeta(req: Request): {
  ip: string | undefined;
  userAgent: string | undefined;
} {
  return {
    ip:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  };
}

/** Log a page/resource view with automatic header extraction */
export async function logView(
  req: Request,
  resourceType: string,
  resourceId?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    action: 'view',
    resourceType,
    resourceId,
    ip,
    userAgent,
    metadata: extra,
  });
}

/** Log a search query with automatic header extraction */
export async function logSearch(
  req: Request,
  resourceType: string,
  query: string,
  resultCount?: number,
): Promise<void> {
  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    action: 'search',
    resourceType,
    ip,
    userAgent,
    metadata: { query, resultCount },
  });
}
