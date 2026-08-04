// The operator dashboard's data layer (src/app/admin/dashboard/page.tsx),
// served by GET /api/admin/overview alongside the existing "Needs your
// attention" counts (src/lib/admin/overview.ts — untouched, one module per
// concern). Cesar's 2026-08-04 ask: "a dashboard how many people are in the
// website, traffic, accounts — like the ones that every startup has."
//
// EVERY number here is a real read from the live database — the standing
// rule "real-computed stats are never faked" is binding, and the traffic
// panel is exactly the case it exists for: Vercel Web Analytics is NOT
// enabled on the production project (verified 2026-08-04 — the API returns
// not_found), so ZERO traffic data exists and none is fabricated, mocked,
// estimated, or placeholdered. The panel reports `connected: false` and the
// UI shows an honest empty state until a real read succeeds.
//
// Where each number comes from (all verified against the live readers):
//   - accounts.total / new7d / new30d / prev7d:
//       platform_users — one row per signed-up account, created by the DB
//       trigger on signup and by /api/auth/me (src/app/api/auth/me/route.ts:
//       "A DB trigger creates every new account as 'client'"). created_at is
//       the signup timestamp. prev7d is the 7 days BEFORE the last 7, so the
//       UI can show an honest up/down trend.
//   - accounts.buyers:  platform_users.role = 'client' (buyers self-assign
//       'client' at signup; only client/vendor are self-serve roles).
//   - accounts.vendors: platform_users.role = 'vendor'.
//   - vendorsByStatus.pending / approved / needsInfo / rejected:
//       vendor_applications.status — the review queue at
//       /admin/vendor-applications. ('needs_info' exists only once
//       supabase/migrations/20260804_vendor_applications_needs_info.sql is
//       applied; filtering by it before then simply counts 0 rows — no
//       error, fail-safe.)
//   - vendorsByStatus.restricted:
//       vendor_profiles.moderation_status IN ('suspended','banned') — the
//       SEPARATE moderation axis an admin flips after approval
//       (src/lib/requests/dispatch.ts: "a vendor can be approved AND
//       suspended"). Managed at /admin/vendors.
//   - funnel.signedUp:   vendor_profiles — every vendor account has exactly
//       one profile row (minted on first authed portal touch by
//       src/lib/vendor/auth.ts, or created at approval), so this is the real
//       "vendor accounts on the site" count.
//   - funnel.applicationSubmitted: vendor_applications — every row is a
//       submitted application (POST /api/apply/submit inserts with
//       status 'pending'; one-per-company enforced since Batch A).
//   - funnel.approved:   vendor_profiles.status = 'approved' — the truth of
//       "can sell on the marketplace". Deliberately NOT vendor_applications
//       approved: the INVITED lane skips the application entirely
//       (ENGINEERING-PROCESS §4), so approved profiles can exceed approved
//       applications. When that happens the funnel honestly shows the bypass
//       rather than hiding it.
//   - funnel.publishedListing: DISTINCT vendor_id across marketplace_products
//       + marketplace_services with status = 'published' — "vendors who have
//       at least one live listing". As of 2026-08-04 this is 0: nobody has
//       ever published a listing on the real site. This step is the point of
//       the page.
//   - activity.listingsPublished: marketplace_products + marketplace_services
//       status = 'published' (the only live-to-buyers state; drafts and
//       needs_review are not visible).
//   - activity.requestsPosted: client_requests — buyer RFQs
//       (src/app/api/platform/requests/route.ts reads this table).
//   - activity.quotesSent: quote_requests.status IN ('responded','won','lost')
//       — a vendor actually submitted a quote (submit flips the lead to
//       'responded' and stamps quoted_at, src/app/api/vendor/proposals/
//       route.ts). 'new'/'viewed' leads have no quote yet; 'spam' never did.
//   - activity.deals: manual_deals — the one deal ledger
//       (supabase/migrations/20260721_one_deal_ledger.sql). 'cancelled' rows
//       are excluded — a cancelled deal never happened commercially.
//
// Reads are minimal-column selects computed in JS (not count-head queries)
// so the whole computation runs through the pure buildOperatorDashboard()
// below — fully unit-testable with plain arrays, no DB mock needed. At this
// marketplace's scale (single-digit tables today, thousands at most) the
// payloads are a few KB; if a table ever grows large this can be swapped for
// head-count queries without changing the API shape.
//
// Degradation: each query fails soft to [] (same philosophy as overview.ts —
// an operator dashboard shows quiet zeros, never a 500). The route still
// gates on isAdminRequest BEFORE any of this runs: no admin, no data.

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OperatorDashboard {
  /** ISO timestamp of when these numbers were read (shown on the page). */
  generatedAt: string;
  accounts: {
    total: number;
    new7d: number;
    new30d: number;
    /** Signups in the 7 days BEFORE the last 7 — the trend baseline. */
    prev7d: number;
    buyers: number;
    vendors: number;
  };
  vendorsByStatus: {
    pending: number;
    approved: number;
    needsInfo: number;
    rejected: number;
    /** Approved vendors an admin later suspended or banned. */
    restricted: number;
  };
  funnel: {
    signedUp: number;
    applicationSubmitted: number;
    approved: number;
    publishedListing: number;
  };
  activity: {
    listingsPublished: number;
    requestsPosted: number;
    quotesSent: number;
    deals: number;
  };
  traffic: TrafficStats;
}

export interface TrafficStats {
  connected: boolean;
  /** Why the panel is showing its empty state (null when connected). */
  reason: 'env_unset' | 'http_error' | 'fetch_failed' | 'unexpected_response' | null;
  visitors7d: number | null;
  pageviews7d: number | null;
}

export const EMPTY_TRAFFIC_STATS: TrafficStats = {
  connected: false,
  reason: 'env_unset',
  visitors7d: null,
  pageviews7d: null,
};

export function emptyOperatorDashboard(now: Date = new Date()): OperatorDashboard {
  return {
    generatedAt: now.toISOString(),
    accounts: { total: 0, new7d: 0, new30d: 0, prev7d: 0, buyers: 0, vendors: 0 },
    vendorsByStatus: { pending: 0, approved: 0, needsInfo: 0, rejected: 0, restricted: 0 },
    funnel: { signedUp: 0, applicationSubmitted: 0, approved: 0, publishedListing: 0 },
    activity: { listingsPublished: 0, requestsPosted: 0, quotesSent: 0, deals: 0 },
    traffic: { ...EMPTY_TRAFFIC_STATS },
  };
}

// ---------------------------------------------------------------------------
// Pure computation (unit-tested — tests/operator-dashboard.test.ts)
// ---------------------------------------------------------------------------

/** Minimal row shapes the dashboard reads. Plain arrays in, numbers out. */
export interface DashboardSourceRows {
  platformUsers: Array<{ role?: string | null; created_at?: string | null }>;
  applications: Array<{ status?: string | null }>;
  vendorProfiles: Array<{ status?: string | null; moderation_status?: string | null }>;
  products: Array<{ status?: string | null; vendor_id?: string | null }>;
  services: Array<{ status?: string | null; vendor_id?: string | null }>;
  requests: Array<Record<string, unknown>>;
  quotes: Array<{ status?: string | null }>;
  deals: Array<{ status?: string | null }>;
}

/** Lead statuses that mean "a vendor actually sent a quote" (see header). */
export const QUOTE_SENT_STATUSES = ['responded', 'won', 'lost'] as const;

/** Moderation statuses that take an approved vendor off the marketplace. */
export const RESTRICTED_MODERATION_STATUSES = ['suspended', 'banned'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function countSince(rows: Array<{ created_at?: string | null }>, sinceMs: number, untilMs?: number): number {
  return rows.filter((r) => {
    const t = r.created_at ? Date.parse(r.created_at) : NaN;
    if (Number.isNaN(t)) return false;
    return t >= sinceMs && (untilMs === undefined || t < untilMs);
  }).length;
}

export function buildOperatorDashboard(rows: DashboardSourceRows, now: Date = new Date()): Omit<OperatorDashboard, 'traffic'> {
  const nowMs = now.getTime();
  const d7 = nowMs - 7 * DAY_MS;
  const d14 = nowMs - 14 * DAY_MS;
  const d30 = nowMs - 30 * DAY_MS;

  const appStatus = (s: string) => rows.applications.filter((a) => a.status === s).length;
  const publishedVendorIds = new Set(
    [...rows.products, ...rows.services]
      .filter((l) => l.status === 'published')
      .map((l) => l.vendor_id)
      .filter((id): id is string => Boolean(id)),
  );

  return {
    generatedAt: now.toISOString(),
    accounts: {
      total: rows.platformUsers.length,
      new7d: countSince(rows.platformUsers, d7),
      new30d: countSince(rows.platformUsers, d30),
      prev7d: countSince(rows.platformUsers, d14, d7),
      buyers: rows.platformUsers.filter((u) => u.role === 'client').length,
      vendors: rows.platformUsers.filter((u) => u.role === 'vendor').length,
    },
    vendorsByStatus: {
      pending: appStatus('pending'),
      approved: appStatus('approved'),
      needsInfo: appStatus('needs_info'),
      rejected: appStatus('rejected'),
      restricted: rows.vendorProfiles.filter((v) =>
        (RESTRICTED_MODERATION_STATUSES as readonly string[]).includes(String(v.moderation_status)),
      ).length,
    },
    funnel: {
      signedUp: rows.vendorProfiles.length,
      applicationSubmitted: rows.applications.length,
      approved: rows.vendorProfiles.filter((v) => v.status === 'approved').length,
      publishedListing: publishedVendorIds.size,
    },
    activity: {
      listingsPublished: [...rows.products, ...rows.services].filter((l) => l.status === 'published').length,
      requestsPosted: rows.requests.length,
      quotesSent: rows.quotes.filter((q) => (QUOTE_SENT_STATUSES as readonly string[]).includes(String(q.status))).length,
      deals: rows.deals.filter((d) => d.status !== 'cancelled').length,
    },
  };
}

// ---------------------------------------------------------------------------
// Live reads
// ---------------------------------------------------------------------------

/** One query failing degrades that ONE table to empty — never a 500. */
async function soft<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const res = await promise;
    if (res.error || !Array.isArray(res.data)) return [];
    return res.data;
  } catch {
    return [];
  }
}

export async function getOperatorDashboard(db: SupabaseClient, now: Date = new Date()): Promise<OperatorDashboard> {
  const [platformUsers, applications, vendorProfiles, products, services, requests, quotes, deals, traffic] =
    await Promise.all([
      soft(db.from('platform_users').select('role, created_at')),
      soft(db.from('vendor_applications').select('status')),
      soft(db.from('vendor_profiles').select('status, moderation_status')),
      soft(db.from('marketplace_products').select('status, vendor_id')),
      soft(db.from('marketplace_services').select('status, vendor_id')),
      soft(db.from('client_requests').select('id')),
      soft(db.from('quote_requests').select('status')),
      soft(db.from('manual_deals').select('status')),
      getTrafficStats(),
    ]);

  return {
    ...buildOperatorDashboard(
      { platformUsers, applications, vendorProfiles, products, services, requests, quotes, deals },
      now,
    ),
    traffic,
  };
}

// ---------------------------------------------------------------------------
// Traffic — REAL READ ONLY, behind env vars, degrades to the empty state.
//
// Vercel Web Analytics is NOT enabled on the production project (coordinator
// verified 2026-08-04: the analytics API answers not_found — zero data
// exists). Turning it on is a Vercel-dashboard action the coordinator owns
// with Cesar. Once it is on, set BOTH env vars and this read lights up:
//
//   VERCEL_WEB_ANALYTICS_PROJECT_ID — the Vercel project ID (prj_…) of the
//     production project (Vercel dashboard → project → Settings → General).
//   VERCEL_WEB_ANALYTICS_TOKEN — a Vercel access token allowed to read that
//     project's analytics (vercel.com → Account Settings → Tokens).
//
// Both are server-only (no NEXT_PUBLIC_). Unset/partial → env_unset. Any
// HTTP/network failure or an answer whose shape we can't verify → the panel
// stays in its honest empty state. It can NEVER show a made-up number: the
// parser below only accepts finite non-negative integers from the API's own
// payload, anything else is reported as unexpected_response.
//
// CAVEAT (documented in the batch report): the endpoint/response shape below
// is the best-known Vercel web-analytics API shape as of 2026-08-04 and is
// UNVERIFIED against a live project, because no project has analytics
// enabled yet. The strict parser is the safety net — worst case the panel
// keeps showing "not connected" until the coordinator confirms the shape and
// adjusts parseVercelAnalytics() in one place.
// ---------------------------------------------------------------------------

export const VERCEL_ANALYTICS_ENV = {
  projectId: 'VERCEL_WEB_ANALYTICS_PROJECT_ID',
  token: 'VERCEL_WEB_ANALYTICS_TOKEN',
} as const;

/** Small helper so the route/UI can explain WHY the panel is empty. */
export function trafficEnvConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env[VERCEL_ANALYTICS_ENV.projectId] && env[VERCEL_ANALYTICS_ENV.token]);
}

function asCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/**
 * Accepts only payloads that unambiguously carry real visitor/pageview
 * totals; returns null on anything else (→ unexpected_response empty state).
 * Handles the plausible Vercel shapes: flat totals, a `total` wrapper, or an
 * array of per-day buckets (summed). Exported for tests.
 */
export function parseVercelAnalytics(json: unknown): { visitors7d: number; pageviews7d: number } | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, unknown>;

  // Shape A: { visitors: n, pageviews: n } or { total: { visitors, pageviews } }
  for (const bag of [root, root.total as Record<string, unknown> | undefined]) {
    if (!bag || typeof bag !== 'object') continue;
    const visitors = asCount(bag.visitors ?? bag.Visitors);
    const pageviews = asCount(bag.pageviews ?? bag.pageViews ?? bag.views);
    if (visitors !== null && pageviews !== null) return { visitors7d: visitors, pageviews7d: pageviews };
  }

  // Shape B: array of per-day buckets → sum.
  for (const key of ['data', 'days', 'stats']) {
    const arr = root[key];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    let visitors = 0;
    let pageviews = 0;
    let ok = true;
    for (const day of arr) {
      if (!day || typeof day !== 'object') { ok = false; break; }
      const v = asCount((day as Record<string, unknown>).visitors);
      const p = asCount((day as Record<string, unknown>).pageviews ?? (day as Record<string, unknown>).pageViews ?? (day as Record<string, unknown>).views);
      if (v === null || p === null) { ok = false; break; }
      visitors += v;
      pageviews += p;
    }
    if (ok) return { visitors7d: visitors, pageviews7d: pageviews };
  }

  return null;
}

export async function getTrafficStats(): Promise<TrafficStats> {
  const projectId = process.env[VERCEL_ANALYTICS_ENV.projectId];
  const token = process.env[VERCEL_ANALYTICS_ENV.token];
  if (!projectId || !token) return { ...EMPTY_TRAFFIC_STATS };

  try {
    const until = Date.now();
    const since = until - 7 * DAY_MS;
    const url = new URL('https://vercel.com/api/web/analytics/stats');
    url.searchParams.set('projectId', projectId);
    url.searchParams.set('environment', 'production');
    url.searchParams.set('since', String(since));
    url.searchParams.set('until', String(until));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { connected: false, reason: 'http_error', visitors7d: null, pageviews7d: null };
    }
    const parsed = parseVercelAnalytics(await res.json());
    if (!parsed) {
      return { connected: false, reason: 'unexpected_response', visitors7d: null, pageviews7d: null };
    }
    return { connected: true, reason: null, ...parsed };
  } catch {
    return { connected: false, reason: 'fetch_failed', visitors7d: null, pageviews7d: null };
  }
}
