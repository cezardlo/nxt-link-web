'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalPriority = 'critical' | 'high' | 'medium' | 'low' | 'noise';

type CuratedSignal = {
  id: string;
  type: string;
  industry: string;
  title: string;
  url: string;
  source: string;
  company?: string;
  amountUsd?: number;
  confidence: number;
  discoveredAt: string;
  priority: SignalPriority;
  placement: string[];
  headline: string;
  narrative: string;
  pattern: string;
  geopoliticalContext: string;
  industriesAffected: string[];
  companiesInvolved: string[];
  actionableInsight: string;
  curatorNotes: string;
  importanceScore: number;
};

type IntelBrief = {
  generatedAt: string;
  totalSignalsReviewed: number;
  totalPublished: number;
  hiddenAsNoise: number;
  homepageHero: CuratedSignal[];
  homepageTrending: CuratedSignal[];
  mapEvents: CuratedSignal[];
  industrySignals: Record<string, CuratedSignal[]>;
  signalsFeed: CuratedSignal[];
  topPatterns: string[];
  weeklyNarrative: string;
};

type BriefApiResponse = {
  ok: boolean;
  brief?: IntelBrief;
  source?: string;
  message?: string;
};

type CountryActivity = {
  ok: boolean;
  counts?: Record<string, number>;
};

// ─── Intelligence Operations types ────────────────────────────────────────────

type ConvergenceEvent = {
  id: string;
  industry: string;
  confidence: number;
  signals: string[];
  summary: string;
  signalCount: number;
  detectedAt: string;
  window: string;
};

type TrendingItem = {
  term: string;
  type: string;
  mentions: number;
  spike: number;
  velocity: string;
  relatedIndustries: string[];
};

type IndustryDisruptionScore = {
  industry: string;
  slug: string;
  score: number;
  trend: string;
  trendDelta: number;
  topSignals: string[];
};

type DailyBriefSection = {
  title: string;
  priority: string;
  summary: string;
  keyDevelopments: string[];
  signalCount: number;
  sentiment: string;
};

type DailyBriefData = {
  status: string;
  generatedAt: string;
  executiveSummary: string;
  sections: DailyBriefSection[];
  crossCuttingThemes: string[];
  watchList: string[];
  totalSignalsProcessed: number;
};

type IntelOpsData = {
  convergence: { ok: boolean; convergenceCount?: number; data?: ConvergenceEvent[] } | null;
  trending: { ok: boolean; trending?: TrendingItem[] } | null;
  disruption: { ok: boolean; industries?: IndustryDisruptionScore[] } | null;
  brief: { ok: boolean; data?: DailyBriefData } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<SignalPriority, { color: string; label: string; glow: string }> = {
  critical:  { color: '#ff3b30', label: 'CRITICAL', glow: 'rgba(255,59,48,0.25)' },
  high:      { color: '#f97316', label: 'HIGH',     glow: 'rgba(249,115,22,0.20)' },
  medium:    { color: '#ffd700', label: 'MED',      glow: 'rgba(255,215,0,0.15)'  },
  low:       { color: '#6b7280', label: 'LOW',      glow: 'rgba(107,114,128,0.10)'},
  noise:     { color: '#374151', label: 'NOISE',    glow: 'transparent'            },
};

const SIGNAL_TYPE_META: Record<string, { color: string; short: string }> = {
  funding_round:      { color: '#00ff88', short: 'FUND' },
  merger_acquisition: { color: '#f97316', short: 'M&A'  },
  contract_award:     { color: '#ffd700', short: 'CONT' },
  patent_filing:      { color: '#ffb800', short: 'PAT'  },
  research_paper:     { color: '#00d4ff', short: 'RES'  },
  hiring_signal:      { color: '#a855f7', short: 'HIRE' },
  product_launch:     { color: '#00d4ff', short: 'PROD' },
  regulatory_action:  { color: '#ff3b30', short: 'REG'  },
  facility_expansion: { color: '#00ff88', short: 'EXP'  },
  case_study:         { color: '#6b7280', short: 'CASE' },
};

const SECTOR_CONFIG = [
  { id: 'ai-ml',         label: 'AI / ML',       color: '#00d4ff' },
  { id: 'defense',       label: 'Defense',        color: '#f97316' },
  { id: 'cybersecurity', label: 'Cybersecurity',  color: '#ff3b30' },
  { id: 'manufacturing', label: 'Manufacturing',  color: '#00d4ff' },
  { id: 'energy',        label: 'Energy',         color: '#ffd700' },
  { id: 'healthcare',    label: 'Healthcare',     color: '#00ff88' },
  { id: 'logistics',     label: 'Logistics',      color: '#a855f7' },
  { id: 'fintech',       label: 'Fintech',        color: '#ffb800' },
];

const STATIC_SCORES: Record<string, number> = {
  'ai-ml': 82, 'defense': 79, 'cybersecurity': 74, 'manufacturing': 65,
  'energy': 58, 'healthcare': 55, 'logistics': 61, 'fintech': 52,
};

const SUGGESTIONS = [
  'warehouse automation', 'drone surveillance', 'predictive maintenance',
  'computer vision', 'autonomous robots', 'medical AI', 'smart grid',
  'cybersecurity OT', 'agricultural sensors', 'industrial IoT',
];

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', CN: '🇨🇳', DE: '🇩🇪', JP: '🇯🇵', IL: '🇮🇱',
  GB: '🇬🇧', FR: '🇫🇷', KR: '🇰🇷', TW: '🇹🇼', IN: '🇮🇳',
  SE: '🇸🇪', NL: '🇳🇱', TR: '🇹🇷', CA: '🇨🇦', AU: '🇦🇺',
};

// velocity label to arrow glyphs
const VELOCITY_ARROWS: Record<string, string> = {
  explosive: '↑↑↑',
  surging:   '↑↑',
  rising:    '↑',
  steady:    '→',
};

// IDI trend to color
const IDI_TREND_COLOR: Record<string, string> = {
  surging:   '#ff3b30',
  rising:    '#f97316',
  stable:    '#6b7280',
  declining: '#374151',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1) return `${h}h`;
  if (m >= 1) return `${m}m`;
  return 'now';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[9px] tracking-[0.15em] text-white/40">{time}</span>;
}

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: color }} />
    </span>
  );
}

// Hero Card — large format for CRITICAL/HIGH signals
function HeroCard({ sig }: { sig: CuratedSignal }) {
  const pm = PRIORITY_META[sig.priority] ?? PRIORITY_META.medium;
  const tm = SIGNAL_TYPE_META[sig.type] ?? { color: '#ffffff40', short: 'SIG' };
  const age = timeAgo(sig.discoveredAt);

  return (
    <a
      href={sig.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block group p-4 rounded-sm border border-white/[0.08] hover:border-white/[0.16] transition-all duration-200 cursor-pointer"
      style={{ background: `linear-gradient(135deg, ${pm.glow} 0%, rgba(0,0,0,0) 60%)` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${pm.color}22`, border: `1px solid ${pm.color}44` }}>
            <span className="font-mono text-[7px] tracking-[0.2em] font-medium" style={{ color: pm.color }}>
              {pm.label}
            </span>
          </div>
          <div className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${tm.color}15`, border: `1px solid ${tm.color}33` }}>
            <span className="font-mono text-[6px] tracking-[0.15em]" style={{ color: tm.color }}>
              {tm.short}
            </span>
          </div>
          <span className="font-mono text-[6px] tracking-[0.15em] text-white/30 uppercase">
            {sig.industry.replace(/_/g, '-')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[6px] tabular-nums text-white/25">{age}</span>
          <div className="w-5 h-5 rounded-full flex items-center justify-center border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="font-mono text-[7px] text-white/50">↗</span>
          </div>
        </div>
      </div>

      {/* Headline */}
      <h2 className="font-mono text-[12px] text-white/90 leading-snug mb-1.5 group-hover:text-white transition-colors">
        {sig.headline || sig.title}
      </h2>

      {/* Companies involved */}
      {sig.companiesInvolved.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          {sig.companiesInvolved.slice(0, 3).map(c => (
            <span key={c} className="font-mono text-[7px] text-[#00d4ff]/70 border border-[#00d4ff]/20 px-1.5 py-0.5 rounded-sm">
              {c}
            </span>
          ))}
          {sig.amountUsd && (
            <span className="font-mono text-[7px] text-[#00ff88]/70 border border-[#00ff88]/20 px-1.5 py-0.5 rounded-sm">
              ${(sig.amountUsd / 1e6).toFixed(0)}M
            </span>
          )}
        </div>
      )}

      {/* Narrative */}
      {sig.narrative && (
        <p className="font-mono text-[8px] text-white/50 leading-relaxed mb-2 line-clamp-2">
          {sig.narrative}
        </p>
      )}

      {/* Bottom: pattern + actionable */}
      <div className="flex items-start justify-between gap-3 pt-2 border-t border-white/[0.06]">
        {sig.pattern && (
          <div className="flex items-start gap-1.5 flex-1">
            <span className="font-mono text-[6px] text-white/25 shrink-0 pt-0.5">PATTERN</span>
            <span className="font-mono text-[7px] text-white/40 leading-snug">{sig.pattern}</span>
          </div>
        )}
        {sig.actionableInsight && (
          <div className="flex items-start gap-1.5 flex-1">
            <span className="font-mono text-[6px] text-[#00ff88]/40 shrink-0 pt-0.5">ACTION</span>
            <span className="font-mono text-[7px] text-[#00ff88]/60 leading-snug">{sig.actionableInsight}</span>
          </div>
        )}
      </div>

      {/* Score bar */}
      <div className="mt-2 h-[1px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${sig.importanceScore}%`, backgroundColor: pm.color, boxShadow: `0 0 6px ${pm.color}88` }}
        />
      </div>
    </a>
  );
}

// Trending Card — compact format for HIGH signals
function TrendingCard({ sig }: { sig: CuratedSignal }) {
  const pm = PRIORITY_META[sig.priority] ?? PRIORITY_META.medium;
  const tm = SIGNAL_TYPE_META[sig.type] ?? { color: '#ffffff40', short: 'SIG' };
  const age = timeAgo(sig.discoveredAt);

  return (
    <a
      href={sig.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1.5 p-3 rounded-sm border border-white/[0.06] hover:border-white/[0.12] transition-all duration-150"
      style={{ background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: pm.color, boxShadow: `0 0 4px ${pm.color}` }} />
        <span className="font-mono text-[6px] tracking-[0.15em]" style={{ color: tm.color }}>{tm.short}</span>
        <span className="font-mono text-[6px] text-white/25 flex-1 truncate uppercase">{sig.industry.replace(/_/g, '-')}</span>
        <span className="font-mono text-[6px] tabular-nums text-white/20">{age}</span>
      </div>
      <p className="font-mono text-[8px] text-white/70 leading-snug group-hover:text-white/90 transition-colors line-clamp-2">
        {sig.headline || sig.title}
      </p>
      {sig.companiesInvolved.length > 0 && (
        <div className="flex items-center gap-1">
          {sig.companiesInvolved.slice(0, 2).map(c => (
            <span key={c} className="font-mono text-[6px] text-[#00d4ff]/50">{c}</span>
          ))}
          {sig.companiesInvolved.length > 2 && (
            <span className="font-mono text-[6px] text-white/25">+{sig.companiesInvolved.length - 2}</span>
          )}
        </div>
      )}
    </a>
  );
}

// Feed Row — minimal format for signal feed
function FeedRow({ sig }: { sig: CuratedSignal }) {
  const pm = PRIORITY_META[sig.priority] ?? PRIORITY_META.low;
  const tm = SIGNAL_TYPE_META[sig.type] ?? { color: '#ffffff30', short: 'SIG' };

  return (
    <a
      href={sig.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2.5 px-3 py-2 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-1 w-[46px] shrink-0 pt-0.5">
        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: pm.color, boxShadow: `0 0 4px ${pm.color}88` }} />
        <span className="font-mono text-[5.5px] tracking-[0.08em]" style={{ color: tm.color }}>{tm.short}</span>
      </div>
      <div className="flex-1 min-w-0">
        {sig.company && (
          <span className="font-mono text-[7px] text-white/70 font-medium">{sig.company} · </span>
        )}
        <span className="font-mono text-[7px] text-white/45 leading-snug">{sig.headline || sig.title}</span>
      </div>
      <span className="font-mono text-[6px] tabular-nums text-white/20 shrink-0 pt-0.5">
        {timeAgo(sig.discoveredAt)}
      </span>
    </a>
  );
}

// ─── Intelligence Operations Cards ───────────────────────────────────────────

function ConvergenceCard({ data }: { data: IntelOpsData['convergence'] }) {
  const events = data?.data?.slice(0, 3) ?? [];
  return (
    <div
      className="rounded-sm p-2.5"
      style={{ border: '1px solid rgba(0,212,255,0.12)', background: 'rgba(0,212,255,0.03)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[7px] tracking-[0.25em]" style={{ color: '#00d4ff' }}>CONVERGENCE</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00d4ff', boxShadow: '0 0 4px #00d4ff' }} />
      </div>

      {events.length === 0 ? (
        <span className="font-mono text-[7px] text-white/25 italic">SCANNING...</span>
      ) : (
        <div className="space-y-1.5">
          {events.map((ev) => {
            const pct = Math.round(ev.confidence * 100);
            return (
              <div key={ev.id} className="flex items-center justify-between gap-2">
                <span className="font-mono text-[7px] text-white/65 truncate flex-1 capitalize">
                  {ev.industry.replace(/-/g, ' ')}
                </span>
                <div
                  className="px-1 py-0.5 rounded-sm shrink-0"
                  style={{ backgroundColor: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)' }}
                >
                  <span className="font-mono text-[6px] tabular-nums" style={{ color: '#00d4ff' }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data?.convergenceCount !== undefined && data.convergenceCount > 0 && (
        <div className="mt-2 pt-1.5 border-t border-white/[0.05] flex items-center justify-between">
          <span className="font-mono text-[6px] text-white/25">{data.convergenceCount} events detected</span>
          <Link href="/signals" className="font-mono text-[6px] text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">
            VIEW →
          </Link>
        </div>
      )}
    </div>
  );
}

function TrendingEngineCard({ data }: { data: IntelOpsData['trending'] }) {
  const items = data?.trending?.slice(0, 5) ?? [];
  return (
    <div
      className="rounded-sm p-2.5"
      style={{ border: '1px solid rgba(255,215,0,0.12)', background: 'rgba(255,215,0,0.02)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[7px] tracking-[0.25em]" style={{ color: '#ffd700' }}>TRENDING</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ffd700', boxShadow: '0 0 4px #ffd700' }} />
      </div>

      {items.length === 0 ? (
        <span className="font-mono text-[7px] text-white/25 italic">ANALYZING SIGNAL CLUSTERS...</span>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => {
            const arrows = VELOCITY_ARROWS[item.velocity] ?? '\u2192';
            const arrowColor = item.velocity === 'explosive' ? '#ff3b30'
              : item.velocity === 'surging' ? '#f97316'
              : item.velocity === 'rising'  ? '#00ff88'
              : '#6b7280';
            return (
              <div key={item.term} className="flex items-center gap-1.5">
                <span className="font-mono text-[6px] text-white/20 tabular-nums w-3 shrink-0">{i + 1}</span>
                <span className="font-mono text-[7px] text-white/65 flex-1 truncate capitalize">{item.term}</span>
                <span className="font-mono text-[7px] shrink-0" style={{ color: arrowColor }}>{arrows}</span>
                {item.spike > 1 && (
                  <span className="font-mono text-[6px] tabular-nums text-white/30 shrink-0">{item.spike.toFixed(1)}x</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 pt-1.5 border-t border-white/[0.05] flex justify-end">
        <Link href="/signals" className="font-mono text-[6px] text-[#ffd700]/50 hover:text-[#ffd700] transition-colors">
          ALL TRENDS →
        </Link>
      </div>
    </div>
  );
}

function DisruptionIndexCard({ data }: { data: IntelOpsData['disruption'] }) {
  const industries = (data?.industries ?? [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div
      className="rounded-sm p-2.5"
      style={{ border: '1px solid rgba(249,115,22,0.12)', background: 'rgba(249,115,22,0.02)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[7px] tracking-[0.25em]" style={{ color: '#f97316' }}>DISRUPTION INDEX</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f97316', boxShadow: '0 0 4px #f97316' }} />
      </div>

      {industries.length === 0 ? (
        <span className="font-mono text-[7px] text-white/25 italic">COMPUTING IDI...</span>
      ) : (
        <div className="space-y-2">
          {industries.map((ind) => {
            const trendColor = IDI_TREND_COLOR[ind.trend] ?? '#6b7280';
            return (
              <div key={ind.slug}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[7px] text-white/65 truncate flex-1">{ind.industry}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-[6px] uppercase" style={{ color: trendColor }}>{ind.trend}</span>
                    <span className="font-mono text-[7px] tabular-nums font-medium" style={{ color: '#f97316' }}>{ind.score}</span>
                  </div>
                </div>
                <div className="h-[2px] w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${ind.score}%`, backgroundColor: '#f97316', boxShadow: '0 0 4px rgba(249,115,22,0.5)' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 pt-1.5 border-t border-white/[0.05] flex justify-end">
        <Link href="/industries" className="font-mono text-[6px] text-[#f97316]/50 hover:text-[#f97316] transition-colors">
          ALL SECTORS →
        </Link>
      </div>
    </div>
  );
}

function DailyBriefCard({ data }: { data: IntelOpsData['brief'] }) {
  const brief = data?.data;
  const summary = brief?.executiveSummary ?? '';
  const themes = brief?.crossCuttingThemes?.slice(0, 3) ?? [];

  return (
    <div
      className="rounded-sm p-2.5"
      style={{ border: '1px solid rgba(168,85,247,0.12)', background: 'rgba(168,85,247,0.02)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[7px] tracking-[0.25em]" style={{ color: '#a855f7' }}>DAILY BRIEF</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#a855f7', boxShadow: '0 0 4px #a855f7' }} />
      </div>

      {!brief ? (
        <span className="font-mono text-[7px] text-white/25 italic">BRIEF GENERATING...</span>
      ) : (
        <div className="space-y-1.5">
          {summary && (
            <p className="font-mono text-[7px] text-white/55 leading-relaxed line-clamp-3">
              {summary.slice(0, 120)}{summary.length > 120 ? '...' : ''}
            </p>
          )}
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {themes.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[6px] px-1 py-0.5 rounded-sm"
                  style={{ backgroundColor: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.20)', color: '#a855f7' }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {brief.totalSignalsProcessed > 0 && (
            <span className="font-mono text-[6px] text-white/20 block">
              {brief.totalSignalsProcessed} signals processed
            </span>
          )}
        </div>
      )}

      <div className="mt-2 pt-1.5 border-t border-white/[0.05] flex justify-end">
        <span className="font-mono text-[6px] text-[#a855f7]/50">READ FULL BRIEF →</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Curation brief
  const [brief, setBrief] = useState<IntelBrief | null>(null);
  const [briefSource, setBriefSource] = useState<string>('');
  const [briefLoading, setBriefLoading] = useState(true);

  // Country heat
  const [countryHeat, setCountryHeat] = useState<Record<string, number>>({});

  // Intelligence Operations
  const [intelOps, setIntelOps] = useState<IntelOpsData | null>(null);

  // Fetch curation brief
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/intel-curation');
        if (!res.ok) return;
        const data = (await res.json()) as BriefApiResponse;
        if (cancelled || !data.ok || !data.brief) return;
        setBrief(data.brief);
        setBriefSource(data.source ?? '');
      } catch { /* degrade gracefully */ }
      finally { if (!cancelled) setBriefLoading(false); }
    }
    void load();
    const id = setInterval(load, 5 * 60_000); // refresh every 5 min
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Fetch country activity
  useEffect(() => {
    fetch('/api/country-activity')
      .then(r => r.json())
      .then((d: CountryActivity) => { if (d.ok && d.counts) setCountryHeat(d.counts); })
      .catch(() => {});
  }, []);

  // Fetch Intelligence Operations engines in parallel
  useEffect(() => {
    let cancelled = false;
    async function loadIntelOps() {
      const [convRes, trendRes, disruptRes, briefRes] = await Promise.allSettled([
        fetch('/api/intelligence/convergence?window=24h').then(r => r.ok ? r.json() : null),
        fetch('/api/intelligence/trending').then(r => r.ok ? r.json() : null),
        fetch('/api/intelligence/disruption-index').then(r => r.ok ? r.json() : null),
        fetch('/api/intelligence/daily-brief').then(r => r.ok ? r.json() : null),
      ]);
      if (cancelled) return;
      setIntelOps({
        convergence: convRes.status === 'fulfilled' ? (convRes.value as IntelOpsData['convergence']) : null,
        trending:    trendRes.status === 'fulfilled' ? (trendRes.value as IntelOpsData['trending']) : null,
        disruption:  disruptRes.status === 'fulfilled' ? (disruptRes.value as IntelOpsData['disruption']) : null,
        brief:       briefRes.status === 'fulfilled' ? (briefRes.value as IntelOpsData['brief']) : null,
      });
    }
    void loadIntelOps();
    return () => { cancelled = true; };
  }, []);

  // Typing animation
  useEffect(() => {
    if (isFocused || query) return;
    const suggestion = SUGGESTIONS[suggestionIdx % SUGGESTIONS.length]!;
    if (charIdx <= suggestion.length) {
      const t = setTimeout(() => { setPlaceholder(suggestion.slice(0, charIdx)); setCharIdx(c => c + 1); }, 65);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setCharIdx(0); setSuggestionIdx(i => i + 1); }, 2000);
    return () => clearTimeout(t);
  }, [charIdx, suggestionIdx, isFocused, query]);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  }, [query, router]);

  // Derived
  const topCountries = Object.entries(countryHeat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const isLive = briefSource !== '';
  const tickerSignals = brief?.signalsFeed ?? [];

  // Sector scores derived from industry signals
  const sectorScores = SECTOR_CONFIG.map(s => {
    const industryKey = s.id.replace('-', '_');
    const sigCount = (brief?.industrySignals[s.id]?.length ?? 0)
      + (brief?.industrySignals[industryKey]?.length ?? 0);
    const base = STATIC_SCORES[s.id] ?? 55;
    const score = sigCount > 0 ? Math.min(100, Math.round(base * 0.5 + sigCount * 12)) : base;
    return { ...s, score, count: sigCount };
  });

  return (
    <main
      className="h-screen bg-black flex flex-col overflow-hidden"
      style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}
    >
      {/* ── Ambient glow ──────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 60%)',
        }} />
      </div>

      {/* ── Live Ticker ───────────────────────────────────────────── */}
      {tickerSignals.length > 0 && (
        <div className="relative z-20 overflow-hidden border-b border-[#00d4ff]/12 py-1.5" style={{ background: 'rgba(0,212,255,0.015)' }}>
          <div className="flex whitespace-nowrap" style={{ animation: 'ticker 90s linear infinite' }}>
            {[...tickerSignals.slice(0, 20), ...tickerSignals.slice(0, 20)].map((s, i) => {
              const pm = PRIORITY_META[s.priority];
              const co = s.company ? ` · ${s.company}` : '';
              return (
                <span key={i} className="font-mono text-[7px] tracking-wide mx-10 shrink-0">
                  <span style={{ color: pm?.color ?? '#00d4ff' }}>
                    {pm?.label ?? '◈'}{' '}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {(s.headline || s.title).slice(0, 65)}{co}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Status Bar ────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-5 h-10 border-b border-white/[0.08] bg-black/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] tracking-[0.4em] text-white" style={{ textShadow: '0 0 16px rgba(0,212,255,0.35)' }}>
            NXT<span style={{ color: '#00d4ff' }}>{'//'}</span>LINK
          </span>
          <div className="h-3 w-px bg-white/15" />
          <div className="flex items-center gap-1.5">
            <PulseDot color={isLive ? '#00ff88' : '#00d4ff'} />
            <span className="font-mono text-[7px] tracking-[0.2em] text-white/50">
              {brief
                ? `${brief.totalPublished} SIGNALS · ${brief.hiddenAsNoise} NOISE FILTERED`
                : 'INTELLIGENCE DEPT WARMING'}
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-5">
          {[
            { href: '/industries', label: 'SECTORS'  },
            { href: '/solve',      label: 'PROBLEMS' },
            { href: '/innovation', label: 'TECH'     },
            { href: '/map',        label: 'MAP'      },
            { href: '/ask',        label: 'ASK'      },
            { href: '/trajectory', label: 'TRAJ'     },
            { href: '/rfp',        label: 'RFP'      },
            { href: '/world',      label: 'WORLD'    },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="font-mono text-[7px] tracking-[0.25em] text-white/45 hover:text-[#00d4ff] transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <LiveClock />
      </header>

      {/* ── Main 3-column layout ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* ── LEFT: Sector Radar ────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-52 border-r border-white/[0.07] shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.07]">
            <span className="font-mono text-[7px] tracking-[0.35em] text-white/40 uppercase">Sector Radar</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
            {sectorScores.map(s => (
              <Link key={s.id} href={`/industry/${s.id}`} className="group flex flex-col gap-1 block">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[7px] tracking-[0.12em] text-white/60 group-hover:text-white/90 transition-colors uppercase">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    {s.count > 0 && <span className="font-mono text-[6px] text-white/30">{s.count}</span>}
                    <span className="font-mono text-[7px] tabular-nums" style={{ color: s.color }}>{s.score}</span>
                  </div>
                </div>
                <div className="h-[2px] w-full bg-white/[0.07] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${s.score}%`, backgroundColor: s.color, boxShadow: `0 0 4px ${s.color}60` }}
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* Agent OS */}
          <div className="px-4 py-3 border-t border-white/[0.07]">
            <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase block mb-2.5">Agent OS</span>
            {[
              { label: 'Intel Discovery', color: '#00ff88', status: 'ACTIVE'   },
              { label: 'Curation Dept',   color: '#00d4ff', status: brief ? 'DONE' : 'RUNNING' },
              { label: 'Signal Engine',   color: '#00ff88', status: 'ACTIVE'   },
              { label: 'ML Learning',     color: '#a855f7', status: 'TRAINING' },
            ].map(a => (
              <div key={a.label} className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[6px] text-white/40">{a.label}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: a.color, boxShadow: `0 0 4px ${a.color}` }} />
                  <span className="font-mono text-[5.5px]" style={{ color: a.color }}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── CENTER: Intelligence Feed ──────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Search bar */}
          <div className="px-5 py-3 border-b border-white/[0.07] shrink-0">
            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={isFocused ? 'Search any technology, company, sector, or country...' : (placeholder || 'Search intelligence...')}
                className="w-full bg-white/[0.03] border border-white/[0.10] rounded-sm px-4 py-2.5 font-mono text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-[#00d4ff]/30 focus:bg-white/[0.05] transition-all duration-200"
              />
              {query.trim() && (
                <button onClick={handleSearch} className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[7px] tracking-[0.2em] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors">
                  EXPLORE →
                </button>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {briefLoading ? (
              /* Loading state */
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="flex items-center gap-2">
                  <PulseDot color="#00d4ff" />
                  <span className="font-mono text-[9px] text-white/30">Intelligence Department analyzing signals...</span>
                </div>
                <span className="font-mono text-[7px] text-white/15">Elite agents are curating global intelligence</span>
              </div>
            ) : !brief ? (
              /* No brief yet */
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="flex items-center gap-2">
                  <PulseDot color="#f97316" />
                  <span className="font-mono text-[9px] text-white/30">Department warming up...</span>
                </div>
                <span className="font-mono text-[7px] text-white/15">Run the discovery agent first, then curation will process</span>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-6">

                {/* ── Weekly Narrative ──────────────────────────── */}
                {brief.weeklyNarrative && (
                  <div className="border border-white/[0.07] rounded-sm p-4 bg-white/[0.015]">
                    <div className="flex items-center gap-2 mb-2">
                      <PulseDot color="#00d4ff" />
                      <span className="font-mono text-[7px] tracking-[0.3em] text-[#00d4ff]/70 uppercase">World Intelligence Brief</span>
                      <span className="font-mono text-[6px] text-white/20 ml-auto">
                        {new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} UTC
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-white/65 leading-relaxed">
                      {brief.weeklyNarrative}
                    </p>
                  </div>
                )}

                {/* ── Top Patterns ──────────────────────────────── */}
                {brief.topPatterns.length > 0 && (
                  <div>
                    <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase block mb-2">Detected Patterns</span>
                    <div className="flex flex-wrap gap-2">
                      {brief.topPatterns.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08] bg-white/[0.02]"
                          style={{ maxWidth: '100%' }}
                        >
                          <span className="font-mono text-[7px] text-[#00d4ff]/50 shrink-0 mt-0.5">◈</span>
                          <span className="font-mono text-[7px] text-white/50 leading-snug">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Hero Section ──────────────────────────────── */}
                {brief.homepageHero.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase">Critical Intelligence</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-[#ff3b30]" style={{ boxShadow: '0 0 6px #ff3b30' }} />
                        <span className="font-mono text-[6px] text-[#ff3b30]/70">{brief.homepageHero.length} CRITICAL</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {brief.homepageHero.map(sig => (
                        <HeroCard key={sig.id} sig={sig} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Trending Section ──────────────────────────── */}
                {brief.homepageTrending.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase">Trending Now</span>
                      <span className="font-mono text-[6px] text-[#f97316]/50">{brief.homepageTrending.length} HIGH PRIORITY</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {brief.homepageTrending.map(sig => (
                        <TrendingCard key={sig.id} sig={sig} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Intelligence Operations ────────────────────── */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[8px] tracking-[0.3em] text-white/40">INTELLIGENCE OPERATIONS</span>
                    <PulseDot color="#00d4ff" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ConvergenceCard data={intelOps?.convergence ?? null} />
                    <TrendingEngineCard data={intelOps?.trending ?? null} />
                    <DisruptionIndexCard data={intelOps?.disruption ?? null} />
                    <DailyBriefCard data={intelOps?.brief ?? null} />
                  </div>
                </section>

                {/* ── Signal Feed ───────────────────────────────── */}
                {brief.signalsFeed.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.06]">
                      <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase">Curated Signal Feed</span>
                      <span className="font-mono text-[6px] text-white/20">{brief.signalsFeed.length} signals</span>
                    </div>
                    <div className="border border-white/[0.05] rounded-sm overflow-hidden">
                      {brief.signalsFeed.map(sig => (
                        <FeedRow key={sig.id} sig={sig} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Bottom: quick chips */}
          <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="font-mono text-[6px] tracking-[0.2em] text-white/25 shrink-0">QUICK:</span>
            {SUGGESTIONS.slice(0, 7).map(s => (
              <button
                key={s}
                onClick={() => router.push(`/ask?q=${encodeURIComponent(s)}`)}
                className="font-mono text-[6px] tracking-[0.08em] text-white/40 border border-white/[0.10] rounded-full px-2.5 py-0.5 hover:text-white/70 hover:border-white/[0.20] transition-all whitespace-nowrap shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Intel Stats ────────────────────────────────── */}
        <aside className="hidden xl:flex flex-col w-56 border-l border-white/[0.07] shrink-0 overflow-hidden">

          {/* Curation stats */}
          <div className="px-4 py-4 border-b border-white/[0.07]">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="font-mono tabular-nums text-[22px] text-[#00d4ff] leading-none" style={{ textShadow: '0 0 16px rgba(0,212,255,0.4)' }}>
                  {brief?.totalPublished ?? '—'}
                </div>
                <div className="font-mono text-[5.5px] tracking-[0.2em] text-white/30 mt-0.5">PUBLISHED</div>
              </div>
              <div className="text-center">
                <div className="font-mono tabular-nums text-[22px] text-[#ff3b30] leading-none" style={{ textShadow: '0 0 12px rgba(255,59,48,0.35)' }}>
                  {brief?.hiddenAsNoise ?? '—'}
                </div>
                <div className="font-mono text-[5.5px] tracking-[0.2em] text-white/30 mt-0.5">NOISE FILTERED</div>
              </div>
            </div>
            {brief && (
              <div className="mt-3">
                <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00ff88]"
                    style={{ width: `${Math.round((brief.totalPublished / Math.max(1, brief.totalSignalsReviewed)) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[5.5px] text-white/20 mt-0.5 block text-right">
                  {Math.round((brief.totalPublished / Math.max(1, brief.totalSignalsReviewed)) * 100)}% signal quality
                </span>
              </div>
            )}
          </div>

          {/* Priority breakdown */}
          {brief && (
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase block mb-2.5">By Priority</span>
              {(['critical', 'high', 'medium', 'low'] as SignalPriority[]).map(p => {
                const count = brief.signalsFeed.filter(s => s.priority === p).length;
                const max = brief.signalsFeed.length;
                const pm = PRIORITY_META[p];
                return (
                  <div key={p} className="flex items-center gap-2 mb-1.5">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                    <span className="font-mono text-[6px] text-white/40 flex-1">{pm.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, backgroundColor: pm.color }} />
                      </div>
                      <span className="font-mono text-[6px] tabular-nums text-white/35 w-4 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Country heat */}
          {topCountries.length > 0 && (
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <span className="font-mono text-[6px] tracking-[0.3em] text-white/30 uppercase block mb-2.5">Country Activity</span>
              <div className="space-y-1.5">
                {topCountries.map(([code, count]) => {
                  const max = topCountries[0]?.[1] ?? 1;
                  const flag = COUNTRY_FLAGS[code] ?? '🌐';
                  return (
                    <div key={code} className="flex items-center gap-2">
                      <span className="text-[9px] shrink-0">{flag}</span>
                      <span className="font-mono text-[6px] text-white/50 w-5 shrink-0">{code}</span>
                      <div className="flex-1 h-[2px] bg-white/[0.07] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#00d4ff]" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[6px] tabular-nums text-white/30 w-4 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick nav */}
          <div className="px-4 py-3 flex-1 flex flex-col justify-end">
            <span className="font-mono text-[6px] tracking-[0.3em] text-white/25 uppercase block mb-2.5">Navigate</span>
            <div className="space-y-1">
              {[
                { href: '/map',              label: 'Global Map',            color: '#00d4ff' },
                { href: '/industries',       label: 'All Sectors',           color: '#00ff88' },
                { href: '/solve',            label: 'Problem Solver',        color: '#a855f7' },
                { href: '/innovation',       label: 'Tech Catalog',          color: '#ffb800' },
                { href: '/radar',            label: 'Disruption Radar',      color: '#f97316' },
                { href: '/ask',             label: 'Ask Intelligence',       color: '#00d4ff' },
                { href: '/trajectory',      label: 'Tech Trajectory',        color: '#00ff88' },
                { href: '/products/compare', label: 'Compare Products',      color: '#a855f7' },
                { href: '/rfp',             label: 'Gov Contracts (RFP)',    color: '#ffd700' },
                { href: '/world',           label: 'Global Tech Atlas',      color: '#00d4ff' },
              ].map(({ href, label, color }) => (
                <Link key={href} href={href} className="group flex items-center justify-between py-1 px-2 rounded-sm hover:bg-white/[0.04] transition-colors">
                  <span className="font-mono text-[7px] tracking-[0.1em] text-white/45 group-hover:text-white/80 transition-colors">{label}</span>
                  <span className="font-mono text-[8px] transition-colors" style={{ color }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Ticker animation */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}
