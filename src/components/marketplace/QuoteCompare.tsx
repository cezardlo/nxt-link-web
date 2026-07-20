'use client';

import type { ReactNode } from 'react';

// Side-by-side quote comparison (design spec §05 "QUOTE COMPARISON").
// One column per quote, spec-style attribute rows (Total / Timeline /
// Expires / Fee / Status). Lowest priced quote gets a "Best price" tag.

export type QuoteColumn = {
  id: string;
  vendor: string;
  amount: number | null;
  currency?: string | null;
  timeline?: string | null;
  validUntil?: string | null;
  feeLabel?: string | null;
  status?: string | null;
  actions?: ReactNode;
};

export const QUOTE_COMPARE_CSS = `
.qcx{overflow-x:auto;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.03);}
.qcx table{border-collapse:collapse;width:100%;min-width:520px;}
.qcx th,.qcx td{padding:11px 14px;text-align:left;font-size:13px;border-bottom:1px solid rgba(255,255,255,.06);}
.qcx thead th{font-size:12.5px;font-weight:700;color:#EDEDEF;border-bottom:1px solid rgba(255,255,255,.1);}
.qcx thead th:first-child{width:110px;}
.qcx tbody tr:last-child th,.qcx tbody tr:last-child td{border-bottom:none;}
.qcx tbody th{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8080A0;white-space:nowrap;}
.qcx td{color:#C9C7D6;}
.qcx td.best{color:#34D399;font-weight:700;}
.qcx .qcx-amt{font-size:15px;font-weight:700;color:#EDEDEF;font-variant-numeric:tabular-nums;}
.qcx td.best .qcx-amt{color:#34D399;}
.qcx .qcx-besttag{display:inline-block;margin-left:7px;font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:rgba(52,211,153,.12);color:#34D399;vertical-align:2px;}
.qcx .qcx-soon{color:#FBBF24;}
.qcx .qcx-expired{color:#F87171;}
.qcx .qcx-status{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
`;

function money(amount: number | null, currency?: string | null): string {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function expiry(validUntil?: string | null): { text: string; cls: string } {
  if (!validUntil) return { text: '—', cls: '' };
  const d = new Date(validUntil);
  if (isNaN(d.getTime())) return { text: validUntil, cls: '' };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days < 0) return { text: `Expired ${date}`, cls: 'qcx-expired' };
  if (days <= 3) return { text: `${date} · in ${days}d`, cls: 'qcx-soon' };
  return { text: date, cls: '' };
}

export function QuoteCompare({ quotes }: { quotes: QuoteColumn[] }) {
  if (quotes.length < 2) return null;
  const amounts = quotes.map((q) => q.amount).filter((a): a is number => a != null);
  const best = amounts.length >= 2 ? Math.min(...amounts) : null;
  const hasTimeline = quotes.some((q) => q.timeline);
  const hasFee = quotes.some((q) => q.feeLabel);
  const hasStatus = quotes.some((q) => q.status);
  const hasActions = quotes.some((q) => q.actions);

  return (
    <div className="qcx">
      <table>
        <thead>
          <tr>
            <th />
            {quotes.map((q) => <th key={q.id}>{q.vendor}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Total</th>
            {quotes.map((q) => (
              <td key={q.id} className={best != null && q.amount === best ? 'best' : ''}>
                <span className="qcx-amt">{money(q.amount, q.currency)}</span>
                {best != null && q.amount === best && <span className="qcx-besttag">Best price</span>}
              </td>
            ))}
          </tr>
          {hasTimeline && (
            <tr>
              <th scope="row">Timeline</th>
              {quotes.map((q) => <td key={q.id}>{q.timeline || '—'}</td>)}
            </tr>
          )}
          <tr>
            <th scope="row">Expires</th>
            {quotes.map((q) => {
              const e = expiry(q.validUntil);
              return <td key={q.id} className={e.cls}>{e.text}</td>;
            })}
          </tr>
          {hasFee && (
            <tr>
              <th scope="row">NXT//LINK fee</th>
              {quotes.map((q) => <td key={q.id}>{q.feeLabel || '—'}</td>)}
            </tr>
          )}
          {hasStatus && (
            <tr>
              <th scope="row">Status</th>
              {quotes.map((q) => (
                <td key={q.id}>{q.status ? <span className="qcx-status">{q.status}</span> : '—'}</td>
              ))}
            </tr>
          )}
          {hasActions && (
            <tr>
              <th scope="row" />
              {quotes.map((q) => <td key={q.id}>{q.actions}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
