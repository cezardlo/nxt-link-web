'use client';

import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/utils/format';
import { LoadingSkeleton } from '@/components/right-panel/shared/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
  marketState: string;
};

type MarketApiResponse = { ok?: boolean; quotes?: StockQuote[]; as_of?: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketSection() {
  const [data, setData] = useState<MarketApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    fetch('/api/market')
      .then((r) => r.json())
      .then((d: MarketApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="LOADING MARKET" />;
  }

  const quotes = data?.quotes ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">
          ENTERPRISE WATCHLIST
          {data?.as_of && (
            <span className="ml-1.5 text-white/15">{timeAgo(data.as_of)}</span>
          )}
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '···' : '↻'}
        </button>
      </div>

      {/* Quote list */}
      <div className="flex-1 overflow-y-auto">
        {quotes.length === 0 ? (
          <div className="p-4 flex flex-col gap-2">
            <p className="font-mono text-[10px] text-white/25">Market data unavailable.</p>
            <p className="font-mono text-[9px] text-white/15 leading-relaxed">
              Yahoo Finance may be blocking requests. Try refreshing or check your network.
            </p>
          </div>
        ) : (
          quotes
            .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
            .map((q) => {
              const isUp = q.changePct >= 0;
              const changeColor = isUp ? '#00ff88' : '#ff3b30';
              const bigMover = Math.abs(q.changePct) >= 3;
              return (
                <div
                  key={q.symbol}
                  className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
                  style={{ borderLeft: bigMover ? `2px solid ${changeColor}55` : '2px solid transparent' }}
                >
                  {/* Left: symbol + name */}
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-[11px] font-black text-white/80">{q.symbol}</span>
                    <span className="font-mono text-[7px] text-white/22 truncate max-w-[100px] tracking-wider">{q.name}</span>
                  </div>
                  {/* Right: price + change */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-mono text-[11px] font-bold text-white/65 tabular-nums">
                      {q.currency === 'USD' ? '$' : ''}{q.price.toFixed(2)}
                    </span>
                    <span
                      className="font-mono text-[9px] font-bold tabular-nums"
                      style={{ color: changeColor, textShadow: bigMover ? `0 0 6px ${changeColor}66` : 'none' }}
                    >
                      {isUp ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Market state note */}
      {quotes.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 shrink-0">
          <p className="font-mono text-[8px] text-white/15">
            {quotes[0]?.marketState === 'REGULAR'
              ? 'Markets open · 15-min delay'
              : `Markets ${quotes[0]?.marketState?.toLowerCase() ?? 'closed'} · cached 15min`}
          </p>
        </div>
      )}
    </div>
  );
}
