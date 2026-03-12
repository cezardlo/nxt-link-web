'use client';

import { useMemo } from 'react';
import { timeAgo } from '@/lib/utils/format';

// CrimeFeedItem mirrors EnrichedFeedItem fields that arrive from /api/feeds.
// All extra fields are optional so the type is backward-compatible.
export type CrimeFeedItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category?: string;
  description?: string;
  vendor?: string;
  score?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sourceTier?: number;
};

type Cluster = {
  primary: CrimeFeedItem;
  corroborating: CrimeFeedItem[];
  severity: 'critical' | 'high' | 'moderate' | 'resolved';
  converged: boolean;
};

// Source display-name → tier (matches registry names exactly)
const SOURCE_TIER: Record<string, number> = {
  'KTSM Crime':     2,
  'KFOX14':         2,
  'KTSM NBC':       2,
  'KVIA EP':        2,
  'GN: EP Crime':   2,
  'GN: EP Police':  2,
  'GN: CBP Crime':  2,
  'GN: EP Shooting':2,
  'GN: FBI':        1,
  'GN: DEA':        1,
  'GN: EP Theft':   3,
  'GN: EP DUI':     3,
  'GN: EP Drugs':   2,
  'GN: EP Fire':    3,
};

const TIER_COLOR: Record<number, string> = { 1: '#00ff88', 2: '#00d4ff', 3: '#f97316' };

const CRITICAL_WORDS = new Set([
  'killed','killing','homicide','murder','murdered','shooting','shot','stabbed','stabbing',
  'fatal','fatally','dead','death','bodies','body','execution','executed',
]);
const HIGH_WORDS = new Set([
  'assault','assaulted','robbery','robbed','rape','carjacking','kidnap','kidnapped',
  'hostage','officer','officers','deputy','swat','armed','weapon','gun','firearm',
  'injured','wounded','hospitalized','critical','crash','collision',
]);
const RESOLVED_WORDS = new Set([
  'convicted','sentenced','arrested','arrest','charged','indicted','caught','captured',
  'recovered','rescue','rescued','cleared','acquitted',
]);

function classifySeverity(title: string): Cluster['severity'] {
  const lower = title.toLowerCase();
  if ([...CRITICAL_WORDS].some((w) => lower.includes(w))) return 'critical';
  if ([...HIGH_WORDS].some((w) => lower.includes(w)))    return 'high';
  if ([...RESOLVED_WORDS].some((w) => lower.includes(w))) return 'resolved';
  return 'moderate';
}

const SEV_CONFIG: Record<Cluster['severity'], { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
  critical: { label: 'CRITICAL', color: '#ff3b30', bg: '#ff3b3012', border: '#ff3b3030', pulse: true  },
  high:     { label: 'HIGH',     color: '#f97316', bg: '#f9731612', border: '#f9731630', pulse: false },
  moderate: { label: 'MOD',      color: '#ffb800', bg: '#ffb80012', border: '#ffb80030', pulse: false },
  resolved: { label: 'RESOLVD',  color: '#00ff88', bg: '#00ff8812', border: '#00ff8830', pulse: false },
};

const STOPWORDS = new Set([
  'the','a','an','in','on','at','to','for','of','and','or','is','was',
  'are','were','with','has','have','el','paso','man','woman','police',
]);

function tokenize(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

function jaccardSim(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return a.size + b.size - inter === 0 ? 0 : inter / (a.size + b.size - inter);
}

function clusterItems(items: CrimeFeedItem[]): Cluster[] {
  const tokens = items.map((i) => tokenize(i.title));
  const assigned = new Set<number>();
  const clusters: Cluster[] = [];

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;
    const group: CrimeFeedItem[] = [items[i]!];
    assigned.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;
      if (jaccardSim(tokens[i]!, tokens[j]!) >= 0.3) {
        group.push(items[j]!);
        assigned.add(j);
      }
    }
    group.sort((a, b) => (SOURCE_TIER[a.source] ?? 4) - (SOURCE_TIER[b.source] ?? 4));
    const distinctSources = new Set(group.map((g) => g.source)).size;
    clusters.push({
      primary: group[0]!,
      corroborating: group.slice(1),
      severity: classifySeverity(group[0]!.title),
      converged: distinctSources >= 3,
    });
  }
  const SEV_ORDER = { critical: 0, high: 1, moderate: 2, resolved: 3 };
  return clusters.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

function computeVelocity(items: CrimeFeedItem[]): 'spike' | 'rising' | 'normal' {
  const now = Date.now();
  const in1h = items.filter((i) => { try { return now - new Date(i.pubDate).getTime() < 3_600_000; } catch { return false; } }).length;
  const in3h = items.filter((i) => { try { return now - new Date(i.pubDate).getTime() < 10_800_000; } catch { return false; } }).length;
  if (in1h >= 4) return 'spike';
  if (in3h > 0 && in1h / in3h > 0.55) return 'rising';
  return 'normal';
}


const VEL_CONFIG = {
  spike:  { label: '▲ SPIKE',  bg: '#ff3b3015', color: '#ff3b30', border: '#ff3b3030' },
  rising: { label: '↑ RISING', bg: '#f9731615', color: '#f97316', border: '#f9731630' },
  normal: { label: '● LIVE',   bg: '#00ff8815', color: '#00ff88', border: '#00ff8830' },
};

type Props = { articles: CrimeFeedItem[] };

export function CrimeNewsOverlay({ articles }: Props) {
  const clusters = useMemo(() => clusterItems(articles).slice(0, 8), [articles]);
  const velocity = useMemo(() => computeVelocity(articles), [articles]);
  const vel = VEL_CONFIG[velocity];
  const urgentCount = clusters.filter((c) => c.severity === 'critical' || c.severity === 'high').length;
  const criticalCount = clusters.filter((c) => c.severity === 'critical').length;

  // Don't render if no articles — let the layer toggle be the only gate
  if (articles.length === 0) {
    return (
      <div
        className="absolute top-14 md:top-2 left-2 right-2 md:right-auto z-20 bg-black/92 border border-white/8 rounded-sm backdrop-blur-md px-3 py-2"
        style={{ boxShadow: '0 0 0 1px rgba(249,115,22,0.10)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: '#f97316', boxShadow: '0 0 6px #f97316cc', animation: 'pulse-dot 2s infinite' }}
          />
          <span className="font-mono text-[8px] tracking-[0.2em] text-[#f97316]/60">CRIME INTEL</span>
          <span className="font-mono text-[7px] text-white/20 ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute top-14 md:top-2 left-2 right-2 md:right-auto z-20 md:w-72 bg-black/92 border border-white/8 rounded-sm backdrop-blur-md shadow-2xl max-h-[70vh] overflow-y-auto scrollbar-thin"
      style={{ boxShadow: '0 0 0 1px rgba(249,115,22,0.15), 0 20px 60px rgba(0,0,0,0.8)' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
        {/* Pulsing orange status dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: criticalCount > 0 ? '#ff3b30' : '#f97316',
            boxShadow: criticalCount > 0 ? '0 0 8px #ff3b30cc' : '0 0 6px #f97316cc',
            animation: criticalCount > 0 ? 'pulse-dot 1.5s infinite' : 'pulse-dot 2s infinite',
          }}
        />

        <div className="flex-1 flex items-center gap-1.5">
          <span className="font-mono text-[8px] tracking-[0.25em] text-[#f97316] font-bold">CRIME INTEL</span>
          {urgentCount > 0 && (
            <span
              className="font-mono text-[6px] font-bold px-1 py-px rounded-sm"
              style={{ color: '#ff3b30', background: '#ff3b3015', border: '1px solid #ff3b3030' }}
            >
              {urgentCount} URGENT
            </span>
          )}
        </div>

        <span
          className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded-sm"
          style={{ background: vel.bg, color: vel.color, border: `1px solid ${vel.border}` }}
        >
          {vel.label}
        </span>

        <span className="font-mono text-[7px] text-white/20 tabular-nums w-4 text-right">{articles.length}</span>
      </div>

      {/* Cluster list */}
      <div className="flex flex-col max-h-[340px] overflow-y-auto scrollbar-thin">
        {clusters.map((cluster, i) => {
          const tier      = SOURCE_TIER[cluster.primary.source] ?? 4;
          const tierColor = TIER_COLOR[tier] ?? '#6b7280';
          const ago       = timeAgo(cluster.primary.pubDate);
          const hasCorro  = cluster.corroborating.length > 0;
          const sev       = SEV_CONFIG[cluster.severity];
          const isCritical = cluster.severity === 'critical';

          return (
            <a
              key={i}
              href={cluster.primary.link && cluster.primary.link !== '#' ? cluster.primary.link : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 px-3 py-2 border-b border-white/[0.035] hover:bg-white/[0.025] transition-colors cursor-pointer"
              style={{
                borderLeft: isCritical ? '2px solid #ff3b3055' : '2px solid transparent',
                background: isCritical ? 'rgba(255,59,48,0.025)' : undefined,
              }}
            >
              {/* Row 1: badges + time */}
              <div className="flex items-center gap-1 flex-wrap">
                {/* Severity badge */}
                <span
                  className="font-mono text-[6px] font-bold px-1 py-px rounded-sm shrink-0 tracking-wider"
                  style={{
                    color: sev.color,
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    animation: sev.pulse ? 'pulse-dot 2s infinite' : 'none',
                  }}
                >
                  {sev.label}
                </span>

                {/* Tier badge */}
                <span
                  className="font-mono text-[6px] font-bold px-1 py-px rounded-sm shrink-0"
                  style={{ color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}28` }}
                >
                  T{tier}
                </span>

                {/* Source name */}
                <span className="font-mono text-[7px] font-bold truncate max-w-[80px]" style={{ color: `${tierColor}aa` }}>
                  {(cluster.primary.source ?? '').toUpperCase()}
                </span>

                {/* Convergence badge */}
                {cluster.converged && (
                  <span
                    className="font-mono text-[6px] font-bold px-1 py-px rounded-sm shrink-0"
                    style={{ color: '#00d4ff', background: '#00d4ff15', border: '1px solid #00d4ff28' }}
                  >
                    ◉ CONV
                  </span>
                )}
                {!cluster.converged && hasCorro && (
                  <span
                    className="font-mono text-[6px] px-1 py-px rounded-sm shrink-0"
                    style={{ color: '#00d4ff88', background: '#00d4ff10' }}
                  >
                    +{cluster.corroborating.length}
                  </span>
                )}

                {ago && (
                  <span className="font-mono text-[7px] text-white/20 ml-auto shrink-0 tabular-nums">{ago}</span>
                )}
              </div>

              {/* Headline */}
              <span
                className="font-mono text-[9px] leading-snug line-clamp-2"
                style={{ color: isCritical ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.52)' }}
              >
                {cluster.primary.title}
              </span>

              {/* Corroborating sources */}
              {hasCorro && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-mono text-[6px] text-white/20">+ corroborated by</span>
                  {cluster.corroborating.slice(0, 3).map((s, si) => (
                    <span key={si} className="font-mono text-[6px] text-white/25 italic">{s.source}</span>
                  ))}
                </div>
              )}
            </a>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-white/[0.04] flex items-center gap-2">
        <span className="font-mono text-[7px] text-white/15">
          {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} · Jaccard 0.3
        </span>
        <span className="ml-auto font-mono text-[7px] text-[#f97316]/30">EP CRIME NET</span>
      </div>
    </div>
  );
}
