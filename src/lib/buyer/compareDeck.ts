// Pure helpers for R4's comparison CARD DECK (design addendum #1) — the new
// side-by-side vendor-card presentation of the SAME rows QuoteCompareTable
// already renders (src/components/marketplace/QuoteCompareTable.tsx). This
// file adds two things the table didn't need: a per-METRIC best-value winner
// (not just "lowest price overall") and the "Show differences only" toggle,
// which hides any metric that is identical across every card. Both are pure
// projections of the same CompareTableRow shape — no new data source.

import { bestValueQuoteId, parseTimelineDays } from './compare';
import type { CompareTableRow } from '@/components/marketplace/QuoteCompareTable';

export const COMPARE_METRIC_KEYS = ['price', 'leadTime', 'validUntil', 'paymentTerms', 'warranty'] as const;
export type CompareMetricKey = (typeof COMPARE_METRIC_KEYS)[number];

/** Which quote id (if any) wins each independently-rankable metric. Only
 * price and lead time are objectively rankable (lowest / shortest); payment
 * terms and warranty are free text a vendor typed, so there is no honest way
 * to rank them — no badge is ever shown for those, by design. */
export interface DeckBestValue {
  priceId: string | null;
  leadTimeId: string | null;
}

export function bestValueByMetric(
  rows: Array<{ id: string; amount: number | null; timeline?: string | null }>,
): DeckBestValue {
  const priceId = bestValueQuoteId(rows.map((r) => ({ id: r.id, quote_amount: r.amount })));
  let leadTimeId: string | null = null;
  let minDays = Number.POSITIVE_INFINITY;
  for (const r of rows) {
    const d = parseTimelineDays(r.timeline);
    if (d != null && d < minDays) {
      minDays = d;
      leadTimeId = r.id;
    }
  }
  return { priceId, leadTimeId };
}

function metricValue(row: CompareTableRow, key: CompareMetricKey): string | number | null {
  switch (key) {
    case 'price': return row.amount ?? null;
    case 'leadTime': return row.timeline ?? null;
    case 'validUntil': return row.validUntil ?? null;
    case 'paymentTerms': return row.paymentTerms ?? null;
    case 'warranty': return row.warranty ?? null;
    default: return null;
  }
}

/**
 * The set of metrics that are IDENTICAL across every row (including "every
 * vendor left it blank" — that's identical too: null === null). "Show
 * differences only" hides exactly this set. Fewer than 2 rows never
 * collapses anything (nothing to compare yet).
 */
export function identicalMetrics(rows: CompareTableRow[]): Set<CompareMetricKey> {
  const identical = new Set<CompareMetricKey>();
  if (rows.length < 2) return identical;
  for (const key of COMPARE_METRIC_KEYS) {
    const values = rows.map((r) => metricValue(r, key));
    const first = values[0];
    if (values.every((v) => v === first)) identical.add(key);
  }
  return identical;
}

/** Convenience: should THIS metric render, given the toggle state? */
export function shouldShowMetric(
  key: CompareMetricKey,
  identical: Set<CompareMetricKey>,
  showDifferencesOnly: boolean,
): boolean {
  return !(showDifferencesOnly && identical.has(key));
}
