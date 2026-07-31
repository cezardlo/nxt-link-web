// Pure helpers for R4's comparison CARD DECK (design addendum #1) — the new
// side-by-side vendor-card presentation of the SAME rows QuoteCompareTable
// already renders (src/components/marketplace/QuoteCompareTable.tsx). This
// file adds two things the table didn't need: a per-METRIC best-value winner
// (not just "lowest price overall") and the "Show differences only" toggle,
// which hides any metric that is identical across every card. Both are pure
// projections of the same CompareTableRow shape — no new data source.

import { bestValueQuoteId, parseTimelineDays, lowestNumericFieldId } from './compare';
import type { CompareTableRow } from '@/components/marketplace/QuoteCompareTable';

export const COMPARE_METRIC_KEYS = [
  'price', 'leadTime', 'validUntil', 'paymentTerms', 'warranty',
  // Slice R6 (flow-readiness fix) — per-kind quote extras join the same
  // "show differences only" mechanism as the fields above (REUSE, not a
  // second toggle). A metric a request's kind never produces (e.g.
  // 'licenseModel' on a product request) is simply always null across every
  // row — identical, so it stays hidden under the toggle same as any other
  // universally-blank field, and its column/row never renders at all
  // regardless of the toggle (see the show*/showX gates in the components).
  'unitPrice', 'shippingCost', 'installation', 'training',
  'scopeSummary', 'duration', 'teamSize', 'emergencyResponse',
  'licenseModel', 'implementationCost', 'annualSupport', 'slaSummary', 'pricingDetails',
] as const;
export type CompareMetricKey = (typeof COMPARE_METRIC_KEYS)[number];

/** Which quote id (if any) wins each independently-rankable metric. Only
 * price, lead time, and the numeric money extras (unit price / shipping /
 * implementation cost / annual support) are objectively rankable (lowest /
 * shortest); payment terms, warranty, and every text/categorical extra
 * (installation, training, license model, scope, duration, team size,
 * emergency response, SLA summary, pricing details) are the vendor's own
 * description with no honest way to rank — no badge is ever shown for
 * those, by design. */
export interface DeckBestValue {
  priceId: string | null;
  leadTimeId: string | null;
  unitPriceId: string | null;
  shippingCostId: string | null;
  implementationCostId: string | null;
  annualSupportId: string | null;
}

export function bestValueByMetric(
  rows: Array<{ id: string; amount: number | null; timeline?: string | null; extras?: CompareTableRow['extras'] }>,
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
  const unitPriceId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.unit_price })));
  const shippingCostId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.shipping_cost })));
  const implementationCostId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.implementation_cost })));
  const annualSupportId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.annual_support })));
  return { priceId, leadTimeId, unitPriceId, shippingCostId, implementationCostId, annualSupportId };
}

function metricValue(row: CompareTableRow, key: CompareMetricKey): string | number | null {
  switch (key) {
    case 'price': return row.amount ?? null;
    case 'leadTime': return row.timeline ?? null;
    case 'validUntil': return row.validUntil ?? null;
    case 'paymentTerms': return row.paymentTerms ?? null;
    case 'warranty': return row.warranty ?? null;
    case 'unitPrice': return row.extras?.unit_price ?? null;
    case 'shippingCost': return row.extras?.shipping_cost ?? null;
    case 'installation': return row.extras?.installation ?? null;
    case 'training': return row.extras?.training ?? null;
    case 'scopeSummary': return row.extras?.scope_summary ?? null;
    case 'duration': return row.extras?.duration ?? null;
    case 'teamSize': return row.extras?.team_size ?? null;
    case 'emergencyResponse': return row.extras?.emergency_response ?? null;
    case 'licenseModel': return row.extras?.license_model ?? null;
    case 'implementationCost': return row.extras?.implementation_cost ?? null;
    case 'annualSupport': return row.extras?.annual_support ?? null;
    case 'slaSummary': return row.extras?.sla_summary ?? null;
    case 'pricingDetails': return row.extras?.pricing_details ?? null;
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
