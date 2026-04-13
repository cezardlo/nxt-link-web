import { NextResponse } from 'next/server';
import { getTodayQuotaCount } from '@/lib/cache';

export const maxDuration = 60;

async function callEndpoint(base: string, path: string, method = 'GET', body?: object) {
  try {
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(base + path, opts);
    const d = await r.json();
    return { path, ok: d.ok || false, status: r.status };
  } catch (e: unknown) {
    return { path, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== 'Bearer ' + (process.env.CRON_SECRET || 'nxtlink-cron-2024')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-real.vercel.app';
  const quotaUsed = await getTodayQuotaCount();
    if (quotaUsed > 40) {
      return NextResponse.json({ error: 'Daily quota limit reached (' + quotaUsed + ' calls). Skipping cron to save free tier.', ran_at: new Date().toISOString() });
    }
    const results: string[] = [];

  // Step 1: Observer scans for patterns
  results.push(await callEndpoint(base, '/api/observer-v2?fresh=true', 'POST', { industry: 'logistics', limit: 20 }));

  // Step 2: Scrape new sources for vendors (5 at a time)
  results.push(await callEndpoint(base, '/api/scrape-sources', 'POST', { limit: 5 }));

  // Step 3: Connection engine finds matches
  results.push(await callEndpoint(base, '/api/connections?fresh=true', 'POST', { domain: 'logistics' }));

  // Step 4: Generate morning briefing
  results.push(await callEndpoint(base, '/api/jarvis-briefing?fresh=true'));

  return NextResponse.json({
    ok: true,
    ran_at: new Date().toISOString(),
    results,
  });
}
