'use client';

// R4 design addendum #1 — the comparison CARD DECK: 3-4 side-by-side vendor
// cards (desktop, horizontal scroll for more) / one full-width swipeable card
// per screen (mobile, native scroll-snap — no gesture library, no new deps).
// This is a NEW presentation of the exact same rows QuoteCompareTable already
// renders correctly (fee display, currency handling, best-value pick) — nvr
// a rewrite of that component, which stays available as the "Table" fallback
// via the view toggle below. Swiping/scrolling the deck does nothing
// destructive: Accept stays the existing explicit button + confirm path,
// passed in by the caller as `renderActions`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { QuoteCompareTable, QUOTE_COMPARE_TABLE_CSS, type CompareLabels, type CompareTableRow, type CompareStatus } from './QuoteCompareTable';
import { bestValueByMetric, identicalMetrics, shouldShowMetric, type CompareMetricKey } from '@/lib/buyer/compareDeck';

export interface DeckLabels extends CompareLabels {
  showDifferencesOnly: string;
  cardsView: string;
  tableView: string;
  bestValue: string;
}

export const DEFAULT_DECK_LABELS: DeckLabels = {
  title: 'Compare quotes', vendor: 'Vendor', quote: 'Quote', timeline: 'Timeline', validUntil: 'Valid until',
  feeIfWon: 'Fee if won', paymentTerms: 'Payment terms', warranty: 'Warranty', status: 'Status', lowest: 'Lowest',
  awaiting: 'Awaiting', received: 'Received', accepted: 'Accepted', sort: 'Sort', priceAsc: 'Price ↑', priceDesc: 'Price ↓',
  az: 'A–Z', note: 'Lowest price isn’t always the best value — weigh timeline, warranty, and fit.',
  showDifferencesOnly: 'Show differences only', cardsView: 'Cards', tableView: 'Table', bestValue: 'Best value',
};

function money(amount: number, currency?: string | null, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

const statusLabel = (s: CompareStatus, t: DeckLabels) => (s === 'accepted' ? t.accepted : s === 'received' ? t.received : t.awaiting);

export function QuoteCompareDeck({
  rows,
  labels = DEFAULT_DECK_LABELS,
  locale,
  renderActions,
}: {
  rows: CompareTableRow[];
  labels?: DeckLabels;
  locale?: string;
  /** Optional per-row action buttons (e.g. Accept/Decline) — kept identical
   * to whatever the caller already renders elsewhere; this deck never adds
   * its own accept path. */
  renderActions?: (row: CompareTableRow) => React.ReactNode;
}) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [diffOnly, setDiffOnly] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const best = useMemo(() => bestValueByMetric(rows.map((r) => ({ id: r.id, amount: r.amount, timeline: r.timeline }))), [rows]);
  const identical = useMemo(() => identicalMetrics(rows), [rows]);
  const show = (key: CompareMetricKey) => shouldShowMetric(key, identical, diffOnly);

  // Track which card is centered/active for the mobile dot indicators —
  // IntersectionObserver against the scroll container, no scroll-math needed.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || view !== 'cards') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) {
          const idx = cardRefs.current.findIndex((el) => el === visible[0].target);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      { root, threshold: [0.5, 0.75, 1] },
    );
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [rows, view]);

  function jumpTo(index: number) {
    const el = cardRefs.current[index];
    if (!el) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }

  return (
    <div className="qcd-wrap">
      <div className="qcd-head">
        <b>{labels.title}</b>
        <div className="qcd-controls">
          <label className="qcd-diff">
            <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
            {labels.showDifferencesOnly}
          </label>
          <div className="qcd-viewtoggle" role="group" aria-label={`${labels.cardsView} / ${labels.tableView}`}>
            <button type="button" className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'}>
              <LayoutGrid size={13} strokeWidth={2} aria-hidden="true" />{labels.cardsView}
            </button>
            <button type="button" className={view === 'table' ? 'on' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}>
              <Rows3 size={13} strokeWidth={2} aria-hidden="true" />{labels.tableView}
            </button>
          </div>
        </div>
      </div>

      {view === 'table' ? (
        <QuoteCompareTable rows={rows} labels={labels} locale={locale} />
      ) : (
        <>
          <div className="qcd-scroll" ref={scrollRef}>
            {rows.map((r, i) => {
              const isBestPrice = r.amount != null && r.id === best.priceId;
              const isBestLeadTime = !!r.timeline && r.id === best.leadTimeId;
              const isBest = isBestPrice || isBestLeadTime;
              return (
                <div
                  key={r.id}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  className={'qcd-card' + (isBest ? ' qcd-best' : '') + (r.status === 'accepted' ? ' qcd-accepted' : '')}
                >
                  <div className="qcd-ctop">
                    <b className="qcd-vendor">{r.vendor || labels.vendor}</b>
                    <span className={`qcd-stat qcd-stat-${r.status}`}>{statusLabel(r.status, labels)}</span>
                  </div>
                  {r.ref && <span className="qcd-ref">{r.ref}</span>}

                  <div className="qcd-price">
                    {r.amount != null ? money(r.amount, r.currency, locale) : <span className="qcd-wait">{labels.awaiting}</span>}
                    {isBestPrice && <span className="qcd-badge">{labels.bestValue}</span>}
                  </div>

                  {show('leadTime') && r.timeline && (
                    <div className="qcd-row"><span>{labels.timeline}</span><b>{r.timeline}{isBestLeadTime && <span className="qcd-badge qcd-badge-sm">{labels.bestValue}</span>}</b></div>
                  )}
                  {show('validUntil') && r.validUntil && (
                    <div className="qcd-row"><span>{labels.validUntil}</span><b>{new Date(r.validUntil).toLocaleDateString(locale)}</b></div>
                  )}
                  {show('paymentTerms') && r.paymentTerms && (
                    <div className="qcd-row"><span>{labels.paymentTerms}</span><b>{r.paymentTerms}</b></div>
                  )}
                  {show('warranty') && r.warranty && (
                    <div className="qcd-row"><span>{labels.warranty}</span><b>{r.warranty}</b></div>
                  )}
                  {r.feeAmount != null && (
                    <div className="qcd-row qcd-fee"><span>{labels.feeIfWon}</span><b>{money(r.feeAmount, undefined, locale)}</b></div>
                  )}

                  {renderActions && <div className="qcd-actions">{renderActions(r)}</div>}
                </div>
              );
            })}
          </div>
          {rows.length > 1 && (
            <div className="qcd-dots" role="tablist" aria-label={labels.cardsView}>
              {rows.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={r.vendor || labels.vendor}
                  className={'qcd-dot' + (i === activeIndex ? ' on' : '')}
                  onClick={() => jumpTo(i)}
                />
              ))}
            </div>
          )}
        </>
      )}
      <p className="qcd-note">{labels.note}</p>
    </div>
  );
}

// Namespaced (qcd-). Desktop: horizontal row, wraps to scroll past 3-4 cards.
// Mobile: full-width scroll-snap stack (native touch swipe, no JS gesture
// handling) with violet dot indicators. One violet accent per zone (best-
// value top-border + badge, active dot); soft violet-tinted shadow.
// Includes QuoteCompareTable's own CSS too — the "Table" fallback view
// above renders that component directly, so one import covers both views.
export const QUOTE_COMPARE_DECK_CSS = QUOTE_COMPARE_TABLE_CSS + `
.qcd-wrap{background:#fff;border:1px solid rgba(108,92,224,.25);border-radius:14px;padding:16px 18px;margin-bottom:16px;}
.qcd-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.qcd-head b{font-size:15px;font-weight:800;}
.qcd-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.qcd-diff{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--spec-text-2nd,#615F72);cursor:pointer;}
.qcd-viewtoggle{display:flex;border:1px solid var(--spec-border,#E2DFEC);border-radius:9px;overflow:hidden;}
.qcd-viewtoggle button{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:11.5px;font-weight:600;color:var(--spec-ink,#141320);background:var(--spec-surface,#EFEDF5);border:none;padding:6px 10px;cursor:pointer;}
.qcd-viewtoggle button.on{background:rgba(108,92,224,.12);color:var(--spec-violet-deep,#4A3DB0);}
.qcd-scroll{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x proximity;padding:4px 2px 10px;-webkit-overflow-scrolling:touch;}
.qcd-card{scroll-snap-align:start;flex:0 0 260px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(108,92,224,.06);border-top:3px solid transparent;}
.qcd-card.qcd-best{border-top-color:var(--spec-violet,#6C5CE0);}
.qcd-card.qcd-accepted{background:#F3FAF6;border-color:rgba(31,122,84,.3);}
.qcd-ctop{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.qcd-vendor{font-size:14px;font-weight:800;color:var(--spec-ink,#141320);}
.qcd-ref{display:block;font-size:10.5px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;margin-top:1px;}
.qcd-stat{font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;}
.qcd-stat-accepted{background:#E9F7F0;color:#1F7A54;}
.qcd-stat-received{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.qcd-stat-awaiting{background:#FBF3E7;color:#C68A28;}
.qcd-price{margin-top:10px;font-size:24px;font-weight:800;color:var(--spec-ink,#141320);font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.qcd-wait{font-size:14px;color:var(--spec-text-2nd,#615F72);font-weight:600;}
.qcd-badge{font-size:9px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(108,92,224,.14);color:var(--spec-violet-deep,#4A3DB0);}
.qcd-badge-sm{margin-left:6px;font-size:8.5px;padding:2px 6px;}
.qcd-row{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--spec-text-2nd,#615F72);padding:6px 0;border-top:1px solid var(--spec-border,#E2DFEC);}
.qcd-row b{color:var(--spec-ink,#141320);font-weight:600;text-align:right;}
.qcd-fee b{color:var(--spec-violet-deep,#4A3DB0);}
.qcd-actions{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;}
.qcd-dots{display:flex;justify-content:center;gap:6px;margin-top:2px;}
.qcd-dot{width:7px;height:7px;border-radius:99px;background:var(--spec-border,#E2DFEC);border:none;padding:0;cursor:pointer;}
.qcd-dot.on{background:var(--spec-violet,#6C5CE0);width:16px;border-radius:99px;}
.qcd-note{font-size:11px;color:#706D88;margin:12px 0 0;line-height:1.5;}
@media (max-width:640px){
  .qcd-card{flex:0 0 100%;scroll-snap-align:center;}
}
@media (prefers-reduced-motion: reduce){
  .qcd-scroll{scroll-behavior:auto;}
  .qcd-dot{transition:none!important;}
}
`;
