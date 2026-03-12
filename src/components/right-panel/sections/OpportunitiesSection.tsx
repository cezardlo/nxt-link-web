'use client';

import { useEffect, useState } from 'react';
import { formatUsd, timeAgo } from '@/lib/utils/format';
import { OPPORTUNITY_SOURCE_COLORS } from '@/lib/utils/design-tokens';
import { LoadingSkeleton } from '@/components/right-panel/shared/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

type OpportunitySourceId =
  | 'sam'
  | 'usaspending'
  | 'sbir'
  | 'nsf'
  | 'uspto'
  | 'bts'
  | 'ercot'
  | 'grants'
  | 'opencorporates';

type OpportunitySignal = {
  id: string;
  source: OpportunitySourceId;
  sourceLabel: string;
  whatItAdds: string;
  nxtLinkUse: string;
  headline: string;
  detectedAt: string;
  amountUsd?: number | null;
  location?: string;
  url?: string;
};

type OpportunitySourceStatus = {
  id: OpportunitySourceId;
  name: string;
  status: 'live' | 'fallback' | 'unavailable';
  count: number;
  note?: string;
};

type OpportunitiesApiResponse = {
  ok?: boolean;
  asOf?: string;
  signals?: OpportunitySignal[];
  sources?: OpportunitySourceStatus[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OpportunitiesSection() {
  const [data, setData] = useState<OpportunitiesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    fetch('/api/live/opportunities')
      .then((r) => r.json())
      .then((d: OpportunitiesApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="LOADING OPPORTUNITIES" />;
  }

  const signals = data?.signals ?? [];
  const sources = data?.sources ?? [];
  const liveCount = sources.filter((s) => s.status === 'live').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">
          OPPORTUNITY SIGNALS
          {data?.asOf && <span className="ml-1.5 text-white/15">{timeAgo(data.asOf)}</span>}
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '...' : 'REFRESH'}
        </button>
      </div>

      {sources.length > 0 && (
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <p className="font-mono text-[9px] text-white/20">
            LIVE SOURCES: <span style={{ color: '#00ff88' }}>{liveCount}</span>/{sources.length}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {sources.map((src) => (
              <span
                key={src.id}
                className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm border"
                style={{
                  color: src.status === 'live' ? '#00ff88' : src.status === 'fallback' ? '#ffd700' : '#ff3b30',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                title={src.note}
              >
                {src.name} {src.count > 0 ? src.count : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-4">
            <p className="font-mono text-[10px] text-white/25">No opportunity signals available.</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div key={signal.id} className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: OPPORTUNITY_SOURCE_COLORS[signal.source] ?? '#00d4ff' }}
                />
                <span className="font-mono text-[8px] text-white/35">{signal.sourceLabel}</span>
                <span className="ml-auto font-mono text-[8px] text-white/15">{timeAgo(signal.detectedAt)}</span>
              </div>
              <p className="font-mono text-[10px] text-white/60 mt-1 leading-snug">{signal.headline}</p>
              <p className="font-mono text-[9px] text-white/35 mt-1">{signal.nxtLinkUse}</p>
              <div className="mt-1 flex items-center gap-2">
                {signal.amountUsd != null && (
                  <span className="font-mono text-[8px]" style={{ color: '#00ff88', opacity: 0.8 }}>
                    {formatUsd(signal.amountUsd)}
                  </span>
                )}
                {signal.location && (
                  <span className="font-mono text-[8px] text-white/25">{signal.location}</span>
                )}
                {signal.url && (
                  <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-mono text-[8px] text-[#00d4ff]/60 hover:text-[#00d4ff]"
                  >
                    OPEN
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
