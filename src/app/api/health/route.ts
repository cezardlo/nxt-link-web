import { NextResponse } from 'next/server';

import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase/client';
import { getStoredFeedItems } from '@/lib/agents/feed-agent';

export const dynamic = 'force-dynamic';

type SourceCheck = {
  name: string;
  status: 'ok' | 'error' | 'empty' | 'no-key';
  count?: number;
  latency_ms?: number;
  error?: string;
};

type HealthReport = {
  ok: boolean;
  timestamp: string;
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  supabase: { connected: boolean; vendors?: number; signals?: number; entities?: number };
  feeds: { cached: boolean; article_count: number; source_count: number; age_minutes: number | null };
  apis: SourceCheck[];
  summary: string;
};

async function checkApi(name: string, url: string): Promise<SourceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const latency = Date.now() - start;
    if (!res.ok) return { name, status: 'error', latency_ms: latency, error: `HTTP ${res.status}` };
    const json = await res.json() as Record<string, unknown>;
    // Try to count items from common response shapes
    let count = 0;
    if (Array.isArray(json.data)) count = json.data.length;
    else if (json.data && typeof json.data === 'object' && 'patents' in json.data) count = (json.data as { patents: unknown[] }).patents?.length ?? 0;
    else if (json.data && typeof json.data === 'object' && 'jobs' in json.data) count = (json.data as { jobs: unknown[] }).jobs?.length ?? 0;
    else if (Array.isArray(json.all)) count = json.all.length;
    else if (Array.isArray(json.signals)) count = json.signals.length;
    else if (Array.isArray(json.items)) count = json.items.length;
    else if (typeof json.total === 'number') count = json.total as number;
    return { name, status: count > 0 ? 'ok' : 'empty', count, latency_ms: latency };
  } catch (err) {
    return { name, status: 'error', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

export async function GET(): Promise<NextResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://www.nxtlinktech.com';

  // Check Supabase
  let supabase = { connected: false, vendors: 0, signals: 0, entities: 0 };
  if (isSupabaseConfigured()) {
    try {
      const db = getSupabaseClient();
      const [v, s, e] = await Promise.all([
        db.from('vendors').select('id', { count: 'exact', head: true }),
        db.from('intel_signals').select('id', { count: 'exact', head: true }),
        db.from('kg_entities').select('id', { count: 'exact', head: true }),
      ]);
      supabase = {
        connected: true,
        vendors: v.count ?? 0,
        signals: s.count ?? 0,
        entities: e.count ?? 0,
      };
    } catch {
      supabase.connected = false;
    }
  }

  // Check feed cache
  const feedCache = getStoredFeedItems();
  const feedAge = feedCache
    ? Math.round((Date.now() - new Date(feedCache.as_of).getTime()) / 60_000)
    : null;
  const feeds = {
    cached: !!feedCache,
    article_count: feedCache?.items.length ?? 0,
    source_count: feedCache?.source_count ?? 0,
    age_minutes: feedAge,
  };

  // Check all external APIs in parallel
  const apis = await Promise.all([
    checkApi('intel-signals', `${siteUrl}/api/intel-signals`),
    checkApi('what-changed', `${siteUrl}/api/what-changed`),
    checkApi('patents', `${siteUrl}/api/intel/patents`),
    checkApi('research', `${siteUrl}/api/intel/research`),
    checkApi('cyber', `${siteUrl}/api/intel/cyber`),
    checkApi('hackernews', `${siteUrl}/api/intel/hackernews`),
    checkApi('federal-jobs', `${siteUrl}/api/intel/federal-jobs`),
    checkApi('opportunities', `${siteUrl}/api/opportunities`),
    checkApi('predictions', `${siteUrl}/api/predictions`),
  ]);

  // Calculate grade
  const okCount = apis.filter(a => a.status === 'ok').length;
  const totalChecks = apis.length + (supabase.connected ? 1 : 0) + (feeds.cached ? 1 : 0);
  const passCount = okCount + (supabase.connected ? 1 : 0) + (feeds.cached ? 1 : 0);
  const pct = totalChecks > 0 ? passCount / totalChecks : 0;

  let grade: HealthReport['overall_grade'] = 'F';
  if (pct >= 0.9) grade = 'A';
  else if (pct >= 0.75) grade = 'B';
  else if (pct >= 0.6) grade = 'C';
  else if (pct >= 0.4) grade = 'D';

  const problems: string[] = [];
  if (!supabase.connected) problems.push('Supabase disconnected');
  if (!feeds.cached) problems.push('Feed cache cold');
  for (const api of apis) {
    if (api.status === 'error') problems.push(`${api.name}: ${api.error}`);
    else if (api.status === 'empty') problems.push(`${api.name}: returning 0 items`);
  }

  const report: HealthReport = {
    ok: grade !== 'F',
    timestamp: new Date().toISOString(),
    overall_grade: grade,
    supabase,
    feeds,
    apis,
    summary: problems.length === 0
      ? `All ${totalChecks} checks passed. Platform healthy.`
      : `${problems.length} issue(s): ${problems.join('; ')}`,
  };

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
    status: report.ok ? 200 : 503,
  });
}
