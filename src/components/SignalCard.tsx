'use client';

import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SignalCardData = {
  id?: string;
  title: string;
  industry: string;
  signal_type: string;
  importance_score?: number;
  importance?: number;
  direction?: string;
  meaning?: string;
  el_paso_score?: number;
  el_paso_angle?: string;
  company?: string;
  url?: string;
  discovered_at: string;
  source_domain?: string;
  source?: string;
  compact?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const INDUSTRY_LABELS: Record<string, string> = {
  'ai-ml': 'AI / ML',
  'border-tech': 'Border Tech',
  'defense': 'Defense',
  'cybersecurity': 'Cybersecurity',
  'logistics': 'Logistics',
  'manufacturing': 'Manufacturing',
  'robotics': 'Robotics',
  'energy': 'Energy',
  'space': 'Space',
  'finance': 'Finance',
  'healthcare': 'Healthcare',
  'government': 'Government',
  'tech': 'Tech',
  'technology': 'Technology',
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  funding_round: 'FUNDING',
  contract_award: 'CONTRACT',
  patent_filing: 'PATENT',
  product_launch: 'LAUNCH',
  research_breakthrough: 'RESEARCH',
  merger_acquisition: 'M&A',
  market_shift: 'MARKET',
  technology: 'TECH',
  regulation: 'POLICY',
};

function DirectionBadge({ direction }: { direction: string }) {
  const map: Record<string, { label: string; color: string }> = {
    rising:     { label: '↑ RISING',     color: 'text-emerald-400' },
    falling:    { label: '↓ FALLING',    color: 'text-red-400' },
    emerging:   { label: '◆ EMERGING',   color: 'text-cyan-400' },
    disrupting: { label: '⚡ DISRUPTING', color: 'text-orange-400' },
    stable:     { label: '→ STABLE',     color: 'text-gray-500' },
  };
  const d = map[direction] ?? map.stable;
  return (
    <span className={`text-[10px] font-bold tracking-wide ${d.color}`}>{d.label}</span>
  );
}

function EPBadge({ score }: { score: number }) {
  if (score >= 60) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 tracking-wide">
        EP DIRECT
      </span>
    );
  }
  if (score >= 25) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 tracking-wide">
        EP RELEVANT
      </span>
    );
  }
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SignalCard({ title, industry, signal_type, importance_score, importance,
  direction, meaning, el_paso_score, el_paso_angle, company, url, discovered_at,
  source_domain, compact = false }: SignalCardData) {

  const score = importance_score ?? importance ?? 0;
  const industryLabel = INDUSTRY_LABELS[industry] ?? industry;
  const typeLabel = SIGNAL_TYPE_LABELS[signal_type] ?? signal_type?.toUpperCase() ?? 'SIGNAL';
  const ago = timeAgo(discovered_at);

  const card = (
    <div className={`
      group bg-gray-900 border border-gray-800 rounded-xl transition-all duration-200
      hover:border-gray-700 hover:bg-gray-800/50
      ${compact ? 'p-3' : 'p-4'}
      ${url ? 'cursor-pointer' : ''}
    `}>
      {/* Row 1: badges + time */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tracking-wide">
          {industryLabel}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 tracking-wider">
          {typeLabel}
        </span>
        {direction && direction !== 'stable' && <DirectionBadge direction={direction} />}
        {typeof el_paso_score === 'number' && <EPBadge score={el_paso_score} />}
        <span className="ml-auto text-[10px] text-gray-600 tabular-nums shrink-0">{ago}</span>
      </div>

      {/* Title */}
      <p className={`font-semibold text-white leading-snug mt-2 ${compact ? 'text-[12px] line-clamp-2' : 'text-[13px] line-clamp-2'}`}>
        {title}
      </p>

      {/* Meaning */}
      {meaning && !compact && (
        <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">{meaning}</p>
      )}

      {/* EP angle */}
      {el_paso_angle && el_paso_score && el_paso_score >= 25 && !compact && (
        <p className="text-[11px] text-cyan-600/70 mt-1 line-clamp-1">{el_paso_angle}</p>
      )}

      {/* Bottom row */}
      {!compact && (
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-800/60">
          <div className="flex items-center gap-2">
            {company && (
              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[140px]">{company}</span>
            )}
            {score > 0 && (
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${score >= 70 ? 'bg-red-400' : score >= 40 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-[10px] text-gray-600">{Math.round(score)}</span>
              </div>
            )}
          </div>
          {url && (
            <span className="text-[11px] text-cyan-500 font-medium group-hover:text-cyan-400 transition-colors">
              Read →
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {card}
      </a>
    );
  }
  return card;
}
