'use client';

// Side-by-side quote comparison table (FIX 1). Lifted out of the /projects
// Deal Room so the SAME table serves both the Deal Room and the /buyer
// dashboard (the page buyers actually use). One row per competing quote:
// vendor, price (+ length bar + lowest tag), lead time (+ bar), validity,
// optional NXT//LINK fee, and status. Best-value (lowest price / shortest
// lead time) is highlighted in the preserved soft-blue (#3B6EA5, per
// vault/Decisions.md).
//
// Contact-safe by construction: a row only carries the vendor's PUBLIC company
// name and quote figures — never email/phone. Masking (src/lib/guard.ts) is
// unaffected; nothing here reveals contact details pre- or post-accept.

import { useMemo, useState } from 'react';
import { bestValueQuoteId, parseTimelineDays, lowestNumericFieldId } from '@/lib/buyer/compare';
import type { QuoteExtras, ProductQuoteExtras, TechnologyQuoteExtras } from '@/lib/requests/structured';

export type CompareStatus = 'accepted' | 'received' | 'awaiting';
export type CompareSort = 'price_asc' | 'price_desc' | 'name';

export interface CompareTableRow {
  id: string;
  vendor: string;
  amount: number | null;
  currency?: string | null;
  timeline?: string | null;
  validUntil?: string | null;
  /** NXT//LINK fee if this quote is won. Omit to hide the fee column entirely. */
  feeAmount?: number | null;
  /** Slice R3 — additive compare-table rows (trivially additive per the
   * binding spec: the full card-deck redesign is R4, out of scope here).
   * Both are display-only strings the vendor typed; omit/leave null on a row
   * to leave that cell as "—" for it, and the COLUMN itself only renders at
   * all when at least one row in the table actually has a value. */
  paymentTerms?: string | null;
  warranty?: string | null;
  status: CompareStatus;
  ref?: string | null;
  /** Slice R6 (flow-readiness fix) — the vendor's per-kind structured quote
   * extras (quote_requests.quote_extras / quote_proposals.quote_extras).
   * Field names never collide across product/service/technology (see
   * src/lib/requests/structured.ts), so a row can just carry the whole
   * union and every cell below is independently data-gated on its own key —
   * no need to also thread the opportunity's request_kind through here. */
  extras?: QuoteExtras | null;
}

export interface CompareExtrasLabels {
  unitPrice: string; shippingCost: string;
  installation: string; installationIncluded: string; installationExtra: string; installationNone: string;
  training: string; trainingIncluded: string; trainingExtra: string;
  scopeSummary: string; duration: string; teamSize: string; emergencyResponse: string;
  licenseModel: string; licenseSubscription: string; licensePerpetual: string; licenseTiered: string;
  implementationCost: string; annualSupport: string; slaSummary: string; pricingDetails: string;
}

// English defaults mirror the EXACT vendor-side wording (src/app/vendor/leads/page.tsx's
// T dict) so a buyer comparing quotes reads the same terms the vendor filled in.
export const DEFAULT_COMPARE_EXTRAS_LABELS: CompareExtrasLabels = {
  unitPrice: 'Unit price', shippingCost: 'Shipping cost',
  installation: 'Installation', installationIncluded: 'Included', installationExtra: 'Extra cost', installationNone: 'Not available',
  training: 'Training', trainingIncluded: 'Included', trainingExtra: 'Extra cost',
  scopeSummary: 'Scope summary (included / excluded)', duration: 'Duration', teamSize: 'Team size',
  emergencyResponse: 'Emergency response time (if applicable)',
  licenseModel: 'License model', licenseSubscription: 'Subscription', licensePerpetual: 'Perpetual', licenseTiered: 'Tiered',
  implementationCost: 'Implementation cost', annualSupport: 'Annual support / maintenance fee',
  slaSummary: 'SLA summary', pricingDetails: 'Pricing details',
};

/** Shared enum→label mapping for the vendor's installation choice — used by
 * the table, the card deck, and the offer-in-chat card so all three render
 * the identical word for the identical stored value. Returns null for an
 * unset/unknown value (caller renders "—" or omits the row, never a guess). */
export function installationValueLabel(v: ProductQuoteExtras['installation'] | null | undefined, l: CompareExtrasLabels): string | null {
  if (v === 'included') return l.installationIncluded;
  if (v === 'extra') return l.installationExtra;
  if (v === 'not_available') return l.installationNone;
  return null;
}

export function trainingValueLabel(v: ProductQuoteExtras['training'] | null | undefined, l: CompareExtrasLabels): string | null {
  if (v === 'included') return l.trainingIncluded;
  if (v === 'extra') return l.trainingExtra;
  return null;
}

export function licenseModelValueLabel(v: TechnologyQuoteExtras['license_model'] | null | undefined, l: CompareExtrasLabels): string | null {
  if (v === 'subscription') return l.licenseSubscription;
  if (v === 'perpetual') return l.licensePerpetual;
  if (v === 'tiered') return l.licenseTiered;
  return null;
}

export interface CompareLabels {
  title: string;
  vendor: string;
  quote: string;
  timeline: string;
  validUntil: string;
  feeIfWon: string;
  paymentTerms: string;
  warranty: string;
  status: string;
  lowest: string;
  awaiting: string;
  received: string;
  accepted: string;
  sort: string;
  priceAsc: string;
  priceDesc: string;
  az: string;
  note: string;
  extras: CompareExtrasLabels;
}

// Defaults reproduce the Deal Room's original English copy so /projects/[id]
// renders identically after the extraction.
export const DEFAULT_COMPARE_LABELS: CompareLabels = {
  title: 'Compare quotes',
  vendor: 'Vendor',
  quote: 'Quote',
  timeline: 'Timeline',
  validUntil: 'Valid until',
  feeIfWon: 'Fee if won',
  paymentTerms: 'Payment terms',
  warranty: 'Warranty',
  status: 'Status',
  lowest: 'Lowest',
  awaiting: 'Awaiting',
  received: 'Received',
  accepted: 'Accepted',
  sort: 'Sort',
  priceAsc: 'Price ↑',
  priceDesc: 'Price ↓',
  az: 'A–Z',
  note: 'Lowest price isn’t always the best value — weigh timeline, warranty, and fit. The NXT//LINK fee is shown so you see your all-in cost.',
  extras: DEFAULT_COMPARE_EXTRAS_LABELS,
};

function money(amount: number, currency?: string | null): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function QuoteCompareTable({
  rows,
  labels = DEFAULT_COMPARE_LABELS,
  locale,
  initialSort = 'price_asc',
}: {
  rows: CompareTableRow[];
  labels?: CompareLabels;
  locale?: string;
  initialSort?: CompareSort;
}) {
  const [sort, setSort] = useState<CompareSort>(initialSort);
  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(locale); } catch { return s; } };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const pa = a.amount ?? Number.POSITIVE_INFINITY;
      const pb = b.amount ?? Number.POSITIVE_INFINITY;
      if (sort === 'price_asc') return pa - pb;
      if (sort === 'price_desc') return pb - pa;
      return (a.vendor || '').localeCompare(b.vendor || '');
    });
    return copy;
  }, [rows, sort]);

  const priced = rows.filter((q) => q.amount != null);
  const lowId = bestValueQuoteId(rows.map((r) => ({ id: r.id, quote_amount: r.amount })));
  const maxPrice = priced.length ? Math.max(...priced.map((q) => q.amount as number)) : 0;
  const dayVals = rows.map((q) => parseTimelineDays(q.timeline)).filter((n): n is number => n != null);
  const maxDays = dayVals.length ? Math.max(...dayVals) : 0;
  const minDays = dayVals.length ? Math.min(...dayVals) : 0;
  const showFee = rows.some((q) => q.feeAmount != null);
  // Slice R3: additive columns — only take up table width when at least one
  // competing quote actually has the data (old quotes pre-dating these
  // columns stay exactly as compact as they always were).
  const showPaymentTerms = rows.some((q) => q.paymentTerms);
  const showWarranty = rows.some((q) => q.warranty);
  // Slice R6 (flow-readiness fix) — the vendor's per-kind quote extras.
  // Same "only take up width when at least one competing quote has it"
  // pattern as payment terms/warranty above; a real request only ever
  // produces ONE kind's fields, so in practice 3-4 of these show at once,
  // never all thirteen together.
  const showUnitPrice = rows.some((q) => q.extras?.unit_price != null);
  const showShippingCost = rows.some((q) => q.extras?.shipping_cost != null);
  const showInstallation = rows.some((q) => q.extras?.installation);
  const showTraining = rows.some((q) => q.extras?.training);
  const showScopeSummary = rows.some((q) => q.extras?.scope_summary);
  const showDuration = rows.some((q) => q.extras?.duration);
  const showTeamSize = rows.some((q) => q.extras?.team_size != null);
  const showEmergencyResponse = rows.some((q) => q.extras?.emergency_response);
  const showLicenseModel = rows.some((q) => q.extras?.license_model);
  const showImplementationCost = rows.some((q) => q.extras?.implementation_cost != null);
  const showAnnualSupport = rows.some((q) => q.extras?.annual_support != null);
  const showSlaSummary = rows.some((q) => q.extras?.sla_summary);
  const showPricingDetails = rows.some((q) => q.extras?.pricing_details);
  // Best-value tagging is ONLY extended to numeric fields where "lower is
  // better" is objectively true (mirrors the price column) — never to a
  // categorical enum (installation/training/license model) or free text
  // (scope/duration/emergency response/SLA/pricing details), which are the
  // vendor's own subjective description with no honest way to rank.
  const bestUnitPriceId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.unit_price })));
  const bestShippingCostId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.shipping_cost })));
  const bestImplementationCostId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.implementation_cost })));
  const bestAnnualSupportId = lowestNumericFieldId(rows.map((r) => ({ id: r.id, value: r.extras?.annual_support })));

  const statusLabel = (s: CompareStatus) => (s === 'accepted' ? labels.accepted : s === 'received' ? labels.received : labels.awaiting);

  return (
    <div className="qct-wrap">
      <div className="qct-head">
        <b>{labels.title}</b>
        <div className="qct-sort">
          <span>{labels.sort}</span>
          <button className={sort === 'price_asc' ? 'on' : ''} onClick={() => setSort('price_asc')}>{labels.priceAsc}</button>
          <button className={sort === 'price_desc' ? 'on' : ''} onClick={() => setSort('price_desc')}>{labels.priceDesc}</button>
          <button className={sort === 'name' ? 'on' : ''} onClick={() => setSort('name')}>{labels.az}</button>
        </div>
      </div>
      <div className="qct-scroll">
        <table className="qct">
          <thead>
            <tr>
              <th>{labels.vendor}</th>
              <th>{labels.quote}</th>
              <th>{labels.timeline}</th>
              <th>{labels.validUntil}</th>
              {showUnitPrice && <th>{labels.extras.unitPrice}</th>}
              {showShippingCost && <th>{labels.extras.shippingCost}</th>}
              {showInstallation && <th>{labels.extras.installation}</th>}
              {showTraining && <th>{labels.extras.training}</th>}
              {showScopeSummary && <th>{labels.extras.scopeSummary}</th>}
              {showDuration && <th>{labels.extras.duration}</th>}
              {showTeamSize && <th>{labels.extras.teamSize}</th>}
              {showEmergencyResponse && <th>{labels.extras.emergencyResponse}</th>}
              {showLicenseModel && <th>{labels.extras.licenseModel}</th>}
              {showImplementationCost && <th>{labels.extras.implementationCost}</th>}
              {showAnnualSupport && <th>{labels.extras.annualSupport}</th>}
              {showSlaSummary && <th>{labels.extras.slaSummary}</th>}
              {showPricingDetails && <th>{labels.extras.pricingDetails}</th>}
              {showPaymentTerms && <th>{labels.paymentTerms}</th>}
              {showWarranty && <th>{labels.warranty}</th>}
              {showFee && <th>{labels.feeIfWon}</th>}
              <th>{labels.status}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((q) => {
              const d = parseTimelineDays(q.timeline);
              const isLow = q.amount != null && q.id === lowId;
              return (
                <tr key={q.id} className={q.status === 'accepted' ? 'accepted' : ''}>
                  <td>
                    <b>{q.vendor || labels.vendor}</b>
                    {q.ref && <span className="qct-ref">{q.ref}</span>}
                  </td>
                  <td className="qct-amt">
                    <div className="qct-val">
                      {q.amount != null ? money(q.amount, q.currency) : <span className="qct-wait">{labels.awaiting}</span>}
                      {isLow && <span className="qct-lowest">{labels.lowest}</span>}
                    </div>
                    {q.amount != null && maxPrice > 0 && (
                      <div className="qct-bar"><i className={isLow ? 'best' : ''} style={{ width: `${Math.max(6, (q.amount / maxPrice) * 100)}%` }} /></div>
                    )}
                  </td>
                  <td>
                    <div className="qct-val">{q.timeline || '—'}</div>
                    {d != null && maxDays > 0 && (
                      <div className="qct-bar"><i className={d === minDays ? 'best' : ''} style={{ width: `${Math.max(6, (d / maxDays) * 100)}%` }} /></div>
                    )}
                  </td>
                  <td>{q.validUntil ? fmtDate(q.validUntil) : '—'}</td>
                  {showUnitPrice && (
                    <td className="qct-terms">
                      {q.extras?.unit_price != null ? (
                        <>{money(q.extras.unit_price, q.currency)}{q.id === bestUnitPriceId && <span className="qct-lowest">{labels.lowest}</span>}</>
                      ) : '—'}
                    </td>
                  )}
                  {showShippingCost && (
                    <td className="qct-terms">
                      {q.extras?.shipping_cost != null ? (
                        <>{money(q.extras.shipping_cost, q.currency)}{q.id === bestShippingCostId && <span className="qct-lowest">{labels.lowest}</span>}</>
                      ) : '—'}
                    </td>
                  )}
                  {showInstallation && <td className="qct-terms">{installationValueLabel(q.extras?.installation, labels.extras) || '—'}</td>}
                  {showTraining && <td className="qct-terms">{trainingValueLabel(q.extras?.training, labels.extras) || '—'}</td>}
                  {showScopeSummary && <td className="qct-terms">{q.extras?.scope_summary || '—'}</td>}
                  {showDuration && <td className="qct-terms">{q.extras?.duration || '—'}</td>}
                  {showTeamSize && <td className="qct-terms">{q.extras?.team_size != null ? q.extras.team_size : '—'}</td>}
                  {showEmergencyResponse && <td className="qct-terms">{q.extras?.emergency_response || '—'}</td>}
                  {showLicenseModel && <td className="qct-terms">{licenseModelValueLabel(q.extras?.license_model, labels.extras) || '—'}</td>}
                  {showImplementationCost && (
                    <td className="qct-terms">
                      {q.extras?.implementation_cost != null ? (
                        <>{money(q.extras.implementation_cost, q.currency)}{q.id === bestImplementationCostId && <span className="qct-lowest">{labels.lowest}</span>}</>
                      ) : '—'}
                    </td>
                  )}
                  {showAnnualSupport && (
                    <td className="qct-terms">
                      {q.extras?.annual_support != null ? (
                        <>{money(q.extras.annual_support, q.currency)}{q.id === bestAnnualSupportId && <span className="qct-lowest">{labels.lowest}</span>}</>
                      ) : '—'}
                    </td>
                  )}
                  {showSlaSummary && <td className="qct-terms">{q.extras?.sla_summary || '—'}</td>}
                  {showPricingDetails && <td className="qct-terms">{q.extras?.pricing_details || '—'}</td>}
                  {showPaymentTerms && <td className="qct-terms">{q.paymentTerms || '—'}</td>}
                  {showWarranty && <td className="qct-terms">{q.warranty || '—'}</td>}
                  {showFee && <td className="qct-fee">{q.feeAmount != null ? money(q.feeAmount) : '—'}</td>}
                  <td><span className={`qct-stat ${q.status}`}>{statusLabel(q.status)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="qct-note">{labels.note}</p>
    </div>
  );
}

// Namespaced (qct-) so it drops into either page without clashing. Mirrors the
// original Deal Room pd-cmp styling, incl. the preserved soft-blue best bar.
export const QUOTE_COMPARE_TABLE_CSS = `
.qct-wrap{background:#fff;border:1px solid rgba(108,92,224,.25);border-radius:14px;padding:16px 18px;margin-bottom:16px;}
.qct-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.qct-head b{font-size:15px;font-weight:800;}
.qct-sort{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.qct-sort button{font-family:inherit;font-size:11.5px;font-weight:600;color:var(--spec-ink,#141320);background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:8px;padding:5px 9px;cursor:pointer;}
.qct-sort button.on{background:rgba(108,92,224,.12);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.qct-scroll{overflow-x:auto;margin:0 -4px;}
.qct{width:100%;border-collapse:collapse;font-size:13px;min-width:560px;}
.qct th{text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);padding:0 11px 9px;border-bottom:1px solid var(--spec-border,#E2DFEC);}
.qct td{padding:12px 11px;border-bottom:1px solid var(--spec-border,#E2DFEC);vertical-align:top;}
.qct tr:last-child td{border-bottom:none;}
.qct tr.accepted td{background:#F3FAF6;}
.qct-ref{display:block;font-size:11px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;margin-top:2px;}
.qct-amt{font-weight:800;color:var(--spec-ink,#141320);font-variant-numeric:tabular-nums;white-space:nowrap;}
.qct-val{display:flex;align-items:center;gap:6px;}
.qct-bar{height:6px;border-radius:99px;background:var(--spec-border,#E2DFEC);margin-top:6px;overflow:hidden;min-width:60px;}
.qct-bar i{display:block;height:100%;border-radius:99px;background:#6C5CE0;transition:width .3s ease;}
.qct-bar i.best{background:#3B6EA5;}
.qct-fee{color:var(--spec-violet-deep,#4A3DB0);font-variant-numeric:tabular-nums;white-space:nowrap;}
.qct-terms{color:var(--spec-ink,#141320);font-size:12.5px;max-width:180px;}
.qct-wait{color:var(--spec-text-2nd,#615F72);font-weight:600;}
.qct-lowest{display:inline-block;margin-left:7px;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:#E9F7F0;color:#1F7A54;vertical-align:middle;}
.qct-stat{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap;}
.qct-stat.accepted{background:#E9F7F0;color:#1F7A54;}
.qct-stat.received{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.qct-stat.awaiting{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.qct-note{font-size:11px;color:#706D88;margin:12px 0 0;line-height:1.5;}
`;
