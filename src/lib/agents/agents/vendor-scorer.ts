// src/lib/agents/agents/vendor-scorer.ts
// Vendor Scorer — computes a quality score for enriched vendors and tags them.
// Score determines marketplace visibility: only top vendors get shown.
// Runs after cleaning, before marketplace sync.

import { getDb, isSupabaseConfigured } from '@/db/client';
import type { EnrichedVendorRow } from '@/db/queries/exhibitors';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type VendorScore = {
  vendor_id: string;
  vendor_name: string;
  score: number;         // 0-100 composite
  tier: 'nxt_pick' | 'recommended' | 'notable' | 'low';
  signals: string[];     // reasons for score
};

export type ScoringReport = {
  vendors_scored: number;
  tier_counts: Record<string, number>;
  avg_score: number;
  duration_ms: number;
};

// ─── Scoring Rules ──────────────────────────────────────────────────────────────

function scoreVendor(v: EnrichedVendorRow, conferenceAppearances: number): VendorScore {
  let score = 0;
  const signals: string[] = [];

  // ── Has products (+20)
  const productCount = v.products?.length ?? 0;
  if (productCount >= 3) {
    score += 20;
    signals.push(`${productCount} products identified`);
  } else if (productCount >= 1) {
    score += 10;
    signals.push(`${productCount} product(s) identified`);
  }

  // ── Has technologies (+15)
  const techCount = v.technologies?.length ?? 0;
  if (techCount >= 3) {
    score += 15;
    signals.push(`${techCount} technologies`);
  } else if (techCount >= 1) {
    score += 8;
    signals.push(`${techCount} technology`);
  }

  // ── Multi-conference presence (+25)
  if (conferenceAppearances >= 5) {
    score += 25;
    signals.push(`Appears in ${conferenceAppearances} conferences`);
  } else if (conferenceAppearances >= 3) {
    score += 20;
    signals.push(`Appears in ${conferenceAppearances} conferences`);
  } else if (conferenceAppearances >= 2) {
    score += 12;
    signals.push(`Appears in ${conferenceAppearances} conferences`);
  }

  // ── Strong website (+10)
  if (v.official_domain && v.official_domain.length > 5) {
    score += 10;
    signals.push('Official website verified');
  }

  // ── Description quality (+10)
  const descLen = v.description?.length ?? 0;
  if (descLen > 200) {
    score += 10;
    signals.push('Rich description');
  } else if (descLen > 50) {
    score += 5;
    signals.push('Has description');
  }

  // ── Industry coverage (+10)
  const industryCount = v.industries?.length ?? 0;
  if (industryCount >= 3) {
    score += 10;
    signals.push(`Serves ${industryCount} industries`);
  } else if (industryCount >= 1) {
    score += 5;
    signals.push(`Serves ${industryCount} industry`);
  }

  // ── Use cases (+5)
  if ((v.use_cases?.length ?? 0) >= 2) {
    score += 5;
    signals.push('Clear use cases');
  }

  // ── Employee size (enterprise bonus +5)
  if (v.employee_estimate && /1000|\d{4,}|enterprise/i.test(v.employee_estimate)) {
    score += 5;
    signals.push('Enterprise-scale vendor');
  }

  // Clamp to 100
  score = Math.min(100, Math.max(0, score));

  // Determine tier
  let tier: VendorScore['tier'];
  if (score >= 75) tier = 'nxt_pick';
  else if (score >= 55) tier = 'recommended';
  else if (score >= 35) tier = 'notable';
  else tier = 'low';

  return { vendor_id: v.id, vendor_name: v.canonical_name, score, tier, signals };
}

// ─── Main Scorer ────────────────────────────────────────────────────────────────

export async function runVendorScorer(): Promise<ScoringReport> {
  const start = Date.now();

  if (!isSupabaseConfigured()) {
    return { vendors_scored: 0, tier_counts: {}, avg_score: 0, duration_ms: Date.now() - start };
  }

  const db = getDb({ admin: true });

  // Fetch all enriched vendors
  const { data: vendors } = await db
    .from('enriched_vendors')
    .select('*')
    .order('canonical_name');

  if (!vendors || vendors.length === 0) {
    return { vendors_scored: 0, tier_counts: {}, avg_score: 0, duration_ms: Date.now() - start };
  }

  // Count conference appearances per vendor (from exhibitors table)
  const { data: exhibitors } = await db
    .from('exhibitors')
    .select('normalized_name, conference_id');

  const confCounts = new Map<string, Set<string>>();
  if (exhibitors) {
    for (const e of exhibitors as Array<{ normalized_name: string; conference_id: string }>) {
      const key = e.normalized_name.toLowerCase();
      const set = confCounts.get(key) ?? new Set();
      set.add(e.conference_id);
      confCounts.set(key, set);
    }
  }

  // Score each vendor
  const scores: VendorScore[] = [];
  const tierCounts: Record<string, number> = {};

  for (const v of vendors as EnrichedVendorRow[]) {
    const appearances = confCounts.get(v.canonical_name.toLowerCase())?.size ?? 1;
    const vs = scoreVendor(v, appearances);
    scores.push(vs);
    tierCounts[vs.tier] = (tierCounts[vs.tier] ?? 0) + 1;
  }

  // Persist scores back to enriched_vendors table (confidence field + metadata)
  for (let i = 0; i < scores.length; i += 50) {
    const batch = scores.slice(i, i + 50);
    await Promise.all(
      batch.map((vs) =>
        db
          .from('enriched_vendors')
          .update({ confidence: vs.score / 100 })
          .eq('id', vs.vendor_id),
      ),
    );
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return {
    vendors_scored: scores.length,
    tier_counts: tierCounts,
    avg_score: avgScore,
    duration_ms: Date.now() - start,
  };
}
