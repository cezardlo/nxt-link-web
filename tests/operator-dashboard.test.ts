import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOperatorDashboard,
  emptyOperatorDashboard,
  parseVercelAnalytics,
  trafficEnvConfigured,
  QUOTE_SENT_STATUSES,
  RESTRICTED_MODERATION_STATUSES,
  type DashboardSourceRows,
} from '@/lib/admin/dashboard';

// 2026-08-04 Batch C — operator dashboard. Pins that every number is a real
// computation over real rows (nothing fabricated), the funnel counts
// DISTINCT vendors with a published listing, and the traffic parser accepts
// only verifiable API payloads (any doubt → null → honest empty state).

const NOW = new Date('2026-08-04T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function rows(partial: Partial<DashboardSourceRows>): DashboardSourceRows {
  return {
    platformUsers: [],
    applications: [],
    vendorProfiles: [],
    products: [],
    services: [],
    requests: [],
    quotes: [],
    deals: [],
    ...partial,
  };
}

// ---- accounts + signup windows ---------------------------------------------

test('accounts: total, role split, and 7/30-day windows come from platform_users.created_at', () => {
  const d = buildOperatorDashboard(rows({
    platformUsers: [
      { role: 'client', created_at: daysAgo(1) },   // new7d + new30d
      { role: 'vendor', created_at: daysAgo(3) },   // new7d + new30d
      { role: 'client', created_at: daysAgo(10) },  // prev7d window (7–14), new30d
      { role: 'client', created_at: daysAgo(20) },  // new30d only
      { role: 'admin', created_at: daysAgo(90) },   // outside every window
      { role: 'vendor', created_at: null },          // unparseable → counted in total only
    ],
  }), NOW);
  assert.equal(d.accounts.total, 6);
  assert.equal(d.accounts.new7d, 2);
  assert.equal(d.accounts.prev7d, 1);
  assert.equal(d.accounts.new30d, 4);
  assert.equal(d.accounts.buyers, 3);
  assert.equal(d.accounts.vendors, 2);
});

// ---- vendors by status -------------------------------------------------------

test('vendorsByStatus: application statuses counted individually, restricted comes from moderation_status', () => {
  const d = buildOperatorDashboard(rows({
    applications: [
      { status: 'pending' }, { status: 'pending' },
      { status: 'approved' }, { status: 'needs_info' }, { status: 'rejected' },
    ],
    vendorProfiles: [
      { status: 'approved', moderation_status: 'suspended' },
      { status: 'approved', moderation_status: 'banned' },
      { status: 'approved', moderation_status: 'active' },
    ],
  }), NOW);
  assert.deepEqual(d.vendorsByStatus, { pending: 2, approved: 1, needsInfo: 1, rejected: 1, restricted: 2 });
  assert.ok((RESTRICTED_MODERATION_STATUSES as readonly string[]).includes('suspended'));
  assert.ok((RESTRICTED_MODERATION_STATUSES as readonly string[]).includes('banned'));
});

// ---- the funnel ----------------------------------------------------------------

test('funnel: signedUp = vendor profiles, approved = approved profiles, published = DISTINCT vendors with a live listing', () => {
  const d = buildOperatorDashboard(rows({
    vendorProfiles: [
      { status: 'approved' }, { status: 'approved' }, { status: 'pending' }, { status: 'pending' },
    ],
    applications: [{ status: 'pending' }],
    products: [
      { status: 'published', vendor_id: 'v1' },
      { status: 'published', vendor_id: 'v1' }, // same vendor, two listings → counts once
      { status: 'draft', vendor_id: 'v2' },
      { status: 'needs_review', vendor_id: 'v3' },
    ],
    services: [
      { status: 'published', vendor_id: 'v2' },
      { status: 'archived', vendor_id: 'v4' },
    ],
  }), NOW);
  assert.deepEqual(d.funnel, { signedUp: 4, applicationSubmitted: 1, approved: 2, publishedListing: 2 });
  assert.equal(d.activity.listingsPublished, 3);
});

test('funnel: approved can exceed applications (invite lane) and is shown honestly', () => {
  const d = buildOperatorDashboard(rows({
    vendorProfiles: [{ status: 'approved' }, { status: 'approved' }],
    applications: [],
  }), NOW);
  assert.equal(d.funnel.applicationSubmitted, 0);
  assert.equal(d.funnel.approved, 2);
});

// ---- activity -------------------------------------------------------------------

test('activity: quotes sent = responded/won/lost only; deals exclude cancelled', () => {
  const d = buildOperatorDashboard(rows({
    requests: [{ id: 'r1' }, { id: 'r2' }],
    quotes: [
      { status: 'new' }, { status: 'viewed' }, { status: 'spam' },
      { status: 'responded' }, { status: 'won' }, { status: 'lost' },
    ],
    deals: [{ status: 'won' }, { status: 'paid' }, { status: 'cancelled' }],
  }), NOW);
  assert.equal(d.activity.requestsPosted, 2);
  assert.equal(d.activity.quotesSent, 3);
  assert.equal(d.activity.deals, 2);
  assert.deepEqual([...QUOTE_SENT_STATUSES], ['responded', 'won', 'lost']);
});

test('empty database yields an all-zero dashboard, not an error', () => {
  const d = buildOperatorDashboard(rows({}), NOW);
  assert.equal(d.accounts.total, 0);
  assert.equal(d.funnel.publishedListing, 0);
  assert.equal(d.generatedAt, NOW.toISOString());
  const empty = emptyOperatorDashboard(NOW);
  assert.equal(empty.traffic.connected, false);
  assert.equal(empty.traffic.reason, 'env_unset');
});

// ---- traffic: env gate + strict parser ------------------------------------------

test('trafficEnvConfigured: needs BOTH env vars', () => {
  assert.equal(trafficEnvConfigured({}), false);
  assert.equal(trafficEnvConfigured({ VERCEL_WEB_ANALYTICS_PROJECT_ID: 'prj_1' }), false);
  assert.equal(trafficEnvConfigured({ VERCEL_WEB_ANALYTICS_TOKEN: 'tok' }), false);
  assert.equal(trafficEnvConfigured({ VERCEL_WEB_ANALYTICS_PROJECT_ID: 'prj_1', VERCEL_WEB_ANALYTICS_TOKEN: 'tok' }), true);
});

test('parseVercelAnalytics: accepts flat and wrapped totals', () => {
  assert.deepEqual(parseVercelAnalytics({ visitors: 12, pageviews: 40 }), { visitors7d: 12, pageviews7d: 40 });
  assert.deepEqual(parseVercelAnalytics({ total: { visitors: 3, pageViews: 9 } }), { visitors7d: 3, pageviews7d: 9 });
});

test('parseVercelAnalytics: sums per-day buckets', () => {
  const json = { data: [{ visitors: 2, pageviews: 5 }, { visitors: 3, pageviews: 7 }] };
  assert.deepEqual(parseVercelAnalytics(json), { visitors7d: 5, pageviews7d: 12 });
});

test('parseVercelAnalytics: REJECTS anything not verifiably real (never a wrong number)', () => {
  assert.equal(parseVercelAnalytics(null), null);
  assert.equal(parseVercelAnalytics({}), null);
  assert.equal(parseVercelAnalytics({ visitors: 'lots' }), null);
  assert.equal(parseVercelAnalytics({ visitors: -1, pageviews: 5 }), null);
  assert.equal(parseVercelAnalytics({ visitors: NaN, pageviews: 5 }), null);
  assert.equal(parseVercelAnalytics({ data: [{ visitors: 2 }] }), null); // bucket missing pageviews
  assert.equal(parseVercelAnalytics({ data: [] }), null);
});
