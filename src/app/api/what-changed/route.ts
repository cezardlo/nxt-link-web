import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import { runInsightAgent } from '@/lib/agents/agents/insight-agent';

export const dynamic = 'force-dynamic';

// ── Time window helpers ────────────────────────────────────────────────────────

function msAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

const H48 = 48 * 60 * 60 * 1000;
const D7  =  7 * 24 * 60 * 60 * 1000;
const D30 = 30 * 24 * 60 * 60 * 1000;

// ── Response shape ─────────────────────────────────────────────────────────────

type TopSignal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
};

type TrajectoryChange = {
  industry: string;
  from: string;
  to: string;
};

type WhatChangedData = {
  generated_at: string;
  signals_today: number;
  signals_week: number;
  new_industries: string[];
  trajectory_changes: TrajectoryChange[];
  top_signals: TopSignal[];
  active_industries: string[];
  funding_total_30d: number;
};

// ── Computation helpers ────────────────────────────────────────────────────────

/** Unique non-empty values from a string array */
function unique(arr: (string | null | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((s): s is string => typeof s === 'string' && s.length > 0)));
}

/**
 * Industries whose *earliest* signal across the full dataset falls within
 * the last 7 days — i.e. the industry only started showing signals recently.
 */
function findNewIndustries(all: IntelSignalRow[], cutoff7d: Date): string[] {
  // Build earliest-seen map per industry
  const earliest = new Map<string, number>();
  for (const s of all) {
    const t = new Date(s.discovered_at).getTime();
    const prev = earliest.get(s.industry);
    if (prev === undefined || t < prev) earliest.set(s.industry, t);
  }

  const result: string[] = [];
  for (const [industry, firstSeen] of Array.from(earliest.entries() as Iterable<[string, number]>)) {
    if (firstSeen >= cutoff7d.getTime()) result.push(industry);
  }
  return result;
}

/**
 * Sum amount_usd across funding_round signals in the last 30 days.
 * Non-numeric or null amounts are skipped.
 */
function sumFunding30d(all: IntelSignalRow[], cutoff30d: Date): number {
  return all
    .filter(s =>
      s.signal_type === 'funding_round' &&
      s.amount_usd !== null &&
      new Date(s.discovered_at).getTime() >= cutoff30d.getTime(),
    )
    .reduce((sum, s) => sum + (s.amount_usd ?? 0), 0);
}

// ── GET /api/what-changed ──────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `what-changed:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    // Fetch up to 500 recent signals (ordered by importance_score desc by default)
    const allSignals = await getIntelSignals({ limit: 500 });

    // Pre-compute cutoff timestamps
    const cutoff48h = msAgo(H48);
    const cutoff7d  = msAgo(D7);
    const cutoff30d = msAgo(D30);

    // ── Signals in each window ─────────────────────────────────────────────────
    const signals48h = allSignals.filter(
      s => new Date(s.discovered_at).getTime() >= cutoff48h.getTime(),
    );
    const signals7d = allSignals.filter(
      s => new Date(s.discovered_at).getTime() >= cutoff7d.getTime(),
    );

    // ── signals_today / signals_week ──────────────────────────────────────────
    // "Today" maps to 48 h window for practical freshness;
    // "week" maps to 7-day window.
    const signals_today = signals48h.length;
    const signals_week  = signals7d.length;

    // ── active_industries (48 h) ───────────────────────────────────────────────
    const active_industries = unique(signals48h.map(s => s.industry));

    // ── new_industries (7 d) ──────────────────────────────────────────────────
    // Industries whose FIRST ever signal (within the fetched 500) appeared in
    // the past 7 days. We use allSignals so the earliest-seen reference is as
    // wide as possible within the fetch window.
    const new_industries = findNewIndustries(allSignals, cutoff7d);

    // ── top_signals (from 48 h, importance desc, top 5) ──────────────────────
    const top_signals: TopSignal[] = signals48h
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 5)
      .map(s => ({
        title:        s.title,
        signal_type:  s.signal_type,
        industry:     s.industry,
        company:      s.company,
        importance:   s.importance_score,
        discovered_at: s.discovered_at,
      }));

    // ── funding_total_30d ─────────────────────────────────────────────────────
    const funding_total_30d = sumFunding30d(allSignals, cutoff30d);

    // ── trajectory_changes ────────────────────────────────────────────────────
    // Derived from insight agent momentum data. We compare momentum labels
    // returned by runInsightAgent against a neutral baseline. Since we don't
    // store previous predictions, we treat "cooling" as a downward shift and
    // "accelerating" as an upward shift from "steady". Empty array when
    // insights are unavailable.
    let trajectory_changes: TrajectoryChange[] = [];

    try {
      const insightResult = await runInsightAgent();
      const allInsights = insightResult.insights;

      // Map industry → momentum from the insight layer
      const industryMomentum = new Map<string, string>();
      for (const insight of allInsights) {
        for (const industry of insight.industries) {
          // Keep the highest-confidence momentum per industry
          if (!industryMomentum.has(industry)) {
            industryMomentum.set(industry, insight.momentum);
          }
        }
      }

      // Emit a trajectory change for industries with non-steady momentum
      for (const [industry, momentum] of Array.from(industryMomentum.entries() as Iterable<[string, string]>)) {
        if (momentum === 'accelerating') {
          trajectory_changes.push({ industry, from: 'steady', to: 'accelerating' });
        } else if (momentum === 'cooling') {
          trajectory_changes.push({ industry, from: 'steady', to: 'cooling' });
        } else if (momentum === 'emerging') {
          trajectory_changes.push({ industry, from: 'unknown', to: 'emerging' });
        }
      }
    } catch {
      // Insight agent is best-effort; trajectory_changes stays []
      trajectory_changes = [];
    }

    const data: WhatChangedData = {
      generated_at:      new Date().toISOString(),
      signals_today,
      signals_week,
      new_industries,
      trajectory_changes,
      top_signals,
      active_industries,
      funding_total_30d,
    };

    return NextResponse.json(
      { ok: true, data },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error building what-changed data.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
