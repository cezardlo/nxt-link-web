'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageTopBar } from '@/components/PageTopBar';

// ── Types ────────────────────────────────────────────────────────────────────

type RadarDomain = {
  id: string;
  name: string;
  icon: string;
  color: string;
  activityLevel: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  signals: string[];
  impactedIndustries: string[];
};

type LiveSectorScore = {
  id: string;
  label: string;
  color: string;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  articleCount: number;
  contractCount: number;
  topVendor?: string;
  topHeadline?: string;
};

type IntelResponse = {
  ok: boolean;
  sectorScores?: LiveSectorScore[];
  by_industry?: Record<string, number>;
  detectedAt?: string;
  feedAsOf?: string;
};

// ── Sector-to-Domain mapping ─────────────────────────────────────────────────
// Maps signal engine sector IDs → radar domain IDs
const SECTOR_TO_DOMAIN: Record<string, string> = {
  'defense':              'geopolitics',
  'border-trade':         'supply-chain',
  'logistics':            'supply-chain',
  'energy':               'energy',
  'water':                'natural-resources',
  'robotics':             'tech-trends',
  'warehouse-automation': 'industrial',
  'manufacturing-tech':   'industrial',
  'industrial-ai':        'tech-trends',
  'supply-chain-software':'supply-chain',
};

// ── Industry-slug-to-Domain mapping (Supabase path) ──────────────────────────
// Maps intel_signals.industry slugs → radar domain IDs
const INDUSTRY_TO_DOMAIN: Record<string, string> = {
  'defense':       'geopolitics',
  'cybersecurity': 'cybersecurity',
  'ai-ml':         'tech-trends',
  'healthcare':    'research',
  'manufacturing': 'industrial',
  'energy':        'energy',
  'logistics':     'supply-chain',
  'border-tech':   'supply-chain',
  'fintech':       'capital',
  // Legacy slugs still in DB
  'aerospace_defense': 'geopolitics',
  'ai_ml':             'tech-trends',
  'health_biotech':    'research',
  'supply_chain':      'supply-chain',
};

// ── Static Data (March 2026) ─────────────────────────────────────────────────

const RADAR_DOMAINS: RadarDomain[] = [
  {
    id: 'geopolitics',
    name: 'GEOPOLITICS & CONFLICT',
    icon: '\u2694',
    color: '#ff3b30',
    activityLevel: 82,
    trend: 'increasing',
    signals: [
      'Red Sea shipping disruptions continue into Q1 2026',
      'US-China tech export controls tightening on AI chips',
      'NATO border surveillance procurement cycle opens',
    ],
    impactedIndustries: ['Defense', 'Supply Chain', 'Border Tech'],
  },
  {
    id: 'policy',
    name: 'POLICY & REGULATION',
    icon: '\ud83d\udcdc',
    color: '#f97316',
    activityLevel: 68,
    trend: 'increasing',
    signals: [
      'EU AI Act enforcement begins affecting US exports',
      'CFIUS expands review scope for cross-border tech deals',
      'New CMMC 2.0 deadlines accelerate defense compliance',
    ],
    impactedIndustries: ['AI/ML', 'Defense', 'Cybersecurity'],
  },
  {
    id: 'supply-chain',
    name: 'SUPPLY CHAIN',
    icon: '\ud83d\udea2',
    color: '#00d4ff',
    activityLevel: 74,
    trend: 'increasing',
    signals: [
      'Panama Canal drought reducing throughput 18% YoY',
      'TSMC Arizona fab expansion on track for Q3 production',
      'Nearshoring wave drives Juarez manufacturing +12%',
    ],
    impactedIndustries: ['Logistics', 'Manufacturing', 'Border Tech'],
  },
  {
    id: 'natural-resources',
    name: 'NATURAL RESOURCES',
    icon: '\u26a1',
    color: '#ffd700',
    activityLevel: 55,
    trend: 'stable',
    signals: [
      'Lithium reserves discovered in West Texas salt flats',
      'Rio Grande water levels at 40-year seasonal low',
      'Rare earth recycling tech gains DOE funding boost',
    ],
    impactedIndustries: ['Energy', 'Manufacturing', 'Defense'],
  },
  {
    id: 'energy',
    name: 'ENERGY SYSTEMS',
    icon: '\ud83d\udd2c',
    color: '#00ff88',
    activityLevel: 71,
    trend: 'increasing',
    signals: [
      'Grid-scale battery costs drop below $100/kWh milestone',
      'Permian Basin operators adopt AI-driven drilling optimization',
      'Solar capacity in West Texas surpasses 8 GW installed',
    ],
    impactedIndustries: ['Energy', 'Manufacturing', 'AI/ML'],
  },
  {
    id: 'research',
    name: 'RESEARCH & DISCOVERY',
    icon: '\ud83d\udd2c',
    color: '#a855f7',
    activityLevel: 63,
    trend: 'stable',
    signals: [
      'UTEP secures $14M DARPA grant for border sensor networks',
      'Quantum error correction breakthrough at Sandia Labs',
      'NIH funds 3 El Paso biodefense research initiatives',
    ],
    impactedIndustries: ['Defense', 'Healthcare', 'AI/ML'],
  },
  {
    id: 'capital',
    name: 'CAPITAL & VENTURE',
    icon: '\ud83d\udcb0',
    color: '#ffb800',
    activityLevel: 77,
    trend: 'increasing',
    signals: [
      'AI startup funding reaches $45B in Q1 2026 globally',
      'Defense tech VC investment up 32% YoY',
      'El Paso Borderplex Alliance launches $50M tech fund',
    ],
    impactedIndustries: ['AI/ML', 'Defense', 'Enterprise'],
  },
  {
    id: 'industrial',
    name: 'INDUSTRIAL PRODUCTION',
    icon: '\ud83c\udfed',
    color: '#6366f1',
    activityLevel: 58,
    trend: 'stable',
    signals: [
      'US reshoring index hits record high in manufacturing',
      'Foxconn Juarez expansion adds 2,400 jobs',
      'Industrial robotics adoption up 28% in border region',
    ],
    impactedIndustries: ['Manufacturing', 'Logistics', 'Supply Chain'],
  },
  {
    id: 'cybersecurity',
    name: 'CYBERSECURITY',
    icon: '\ud83d\udee1',
    color: '#ff6b6b',
    activityLevel: 85,
    trend: 'increasing',
    signals: [
      'State-sponsored attacks on US infrastructure up 40%',
      'Zero-trust adoption mandated for federal contractors',
      'Ransomware targeting municipal systems in border cities',
    ],
    impactedIndustries: ['Cybersecurity', 'Defense', 'Enterprise'],
  },
  {
    id: 'conferences',
    name: 'CONFERENCES & EVENTS',
    icon: '\ud83c\udfa4',
    color: '#00d4ff',
    activityLevel: 46,
    trend: 'stable',
    signals: [
      'AUSA Global Force Symposium procurement signals strong',
      'RSA Conference 2026 sees record border-tech exhibitors',
      'El Paso TechCrawl draws 1,200+ attendees in March',
    ],
    impactedIndustries: ['Defense', 'Cybersecurity', 'Enterprise'],
  },
  {
    id: 'tech-trends',
    name: 'TECHNOLOGY TRENDS',
    icon: '\ud83d\ude80',
    color: '#00ff88',
    activityLevel: 91,
    trend: 'increasing',
    signals: [
      'Agentic AI systems deployed in 30% of Fortune 500',
      'Edge computing market grows 35% in defense applications',
      'Computer vision accuracy hits 99.2% on border surveillance',
    ],
    impactedIndustries: ['AI/ML', 'Defense', 'Border Tech'],
  },
  {
    id: 'workforce',
    name: 'WORKFORCE & TALENT',
    icon: '\ud83e\udde9',
    color: '#f97316',
    activityLevel: 52,
    trend: 'decreasing',
    signals: [
      'STEM talent gap widens in El Paso metro area',
      'Remote work enables cross-border tech collaboration',
      'DOD launches cybersecurity apprenticeship program',
    ],
    impactedIndustries: ['Enterprise', 'Defense', 'AI/ML'],
  },
];

const RIPPLE_EFFECTS = [
  'Semiconductor export controls \u2192 chip shortage \u2192 defense production delays \u2192 border tech procurement shifts',
  'AI breakthrough \u2192 automation costs drop \u2192 manufacturing adoption rises \u2192 warehouse labor restructuring',
  'Red Sea disruption \u2192 shipping delays \u2192 retail inventory shortages \u2192 supply chain tech investment surge',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function trendArrow(trend: RadarDomain['trend']): string {
  if (trend === 'increasing') return '\u2191';
  if (trend === 'decreasing') return '\u2193';
  return '\u2192';
}

function trendColor(trend: RadarDomain['trend']): string {
  if (trend === 'increasing') return '#00ff88';
  if (trend === 'decreasing') return '#ff3b30';
  return 'rgba(255,255,255,0.3)';
}

function trendLabel(trend: RadarDomain['trend']): string {
  if (trend === 'increasing') return 'INCREASING';
  if (trend === 'decreasing') return 'DECREASING';
  return 'STABLE';
}

// ── Live data helpers ────────────────────────────────────────────────────────

function mapSectorTrend(t: 'rising' | 'stable' | 'falling'): RadarDomain['trend'] {
  if (t === 'rising') return 'increasing';
  if (t === 'falling') return 'decreasing';
  return 'stable';
}

/** Build synthetic sector scores from by_industry counts (Supabase path) */
function buildSectorScoresFromByIndustry(
  byIndustry: Record<string, number>,
): LiveSectorScore[] {
  const maxCount = Math.max(1, ...Object.values(byIndustry));
  return Object.entries(byIndustry)
    .filter(([, count]) => count > 0)
    .map(([industry, count]) => ({
      id: industry,
      label: industry,
      color: '#00d4ff',
      // Normalize: highest bucket → 85, scale rest proportionally, floor at 30
      score: Math.round(30 + (count / maxCount) * 55),
      trend: count >= 10 ? 'rising' : count >= 4 ? 'stable' : 'falling',
      articleCount: count,
      contractCount: 0,
    } as LiveSectorScore));
}

/** Merge live sector scores into the static domain list */
function applyLiveScores(
  domains: RadarDomain[],
  sectors: LiveSectorScore[],
): RadarDomain[] {
  // Build domain → aggregated scores map
  const domainScores = new Map<string, { totalScore: number; count: number; trend: RadarDomain['trend']; headlines: string[] }>();

  for (const sector of sectors) {
    const domainId = SECTOR_TO_DOMAIN[sector.id] ?? INDUSTRY_TO_DOMAIN[sector.id];
    if (!domainId) continue;

    const existing = domainScores.get(domainId);
    if (existing) {
      existing.totalScore += sector.score;
      existing.count += 1;
      // Prefer 'increasing' trend if any sector is rising
      if (sector.trend === 'rising') existing.trend = 'increasing';
      if (sector.topHeadline) existing.headlines.push(sector.topHeadline);
    } else {
      domainScores.set(domainId, {
        totalScore: sector.score,
        count: 1,
        trend: mapSectorTrend(sector.trend),
        headlines: sector.topHeadline ? [sector.topHeadline] : [],
      });
    }
  }

  return domains.map((domain) => {
    const live = domainScores.get(domain.id);
    if (!live) return domain;

    const avgScore = Math.round(live.totalScore / live.count);
    // Clamp to 0-100
    const activityLevel = Math.max(0, Math.min(100, avgScore));

    return {
      ...domain,
      activityLevel,
      trend: live.trend,
    };
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RadarPage() {
  const [domains, setDomains] = useState<RadarDomain[]>(RADAR_DOMAINS);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch('/api/intel-signals');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: IntelResponse = await res.json();

      if (data.ok) {
        // Supabase path returns by_industry counts; memory path returns sectorScores
        const sectors = data.sectorScores && data.sectorScores.length > 0
          ? data.sectorScores
          : data.by_industry && Object.keys(data.by_industry).length > 0
            ? buildSectorScoresFromByIndustry(data.by_industry)
            : null;

        if (sectors && sectors.length > 0) {
          const merged = applyLiveScores(RADAR_DOMAINS, sectors);
          setDomains(merged);
          setIsLive(true);
          setLastUpdated(data.detectedAt ?? new Date().toISOString());
        }
      }
    } catch {
      // Keep static fallback — no-op
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const now = new Date();
  const dateStr = now
    .toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
    .toUpperCase();

  const avgActivity = Math.round(
    domains.reduce((s, d) => s + d.activityLevel, 0) /
      domains.length,
  );

  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <div className="bg-black min-h-screen font-mono">
      {/* TOP BAR */}
      <PageTopBar
        backHref="/"
        backLabel="HOME"
        breadcrumbs={[{ label: 'GLOBAL RADAR' }]}
        rightSlot={
          <div className="flex items-center gap-3">
            {isLive && (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-[5px] h-[5px] rounded-full animate-pulse"
                  style={{
                    backgroundColor: '#00ff88',
                    boxShadow: '0 0 6px #00ff88cc',
                  }}
                />
                <span className="font-mono text-[7px] tracking-[0.2em] text-[#00ff88]/60">
                  LIVE
                </span>
              </span>
            )}
            <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
              {domains.length} DOMAINS
            </span>
          </div>
        }
      />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border border-[#00d4ff]/40 border-t-[#00d4ff] rounded-full animate-spin" />
            <span className="text-[9px] tracking-[0.3em] text-white/30 uppercase">
              Loading signal intelligence
            </span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6">
        {/* HEADER */}
        <div className="py-6 border-b border-white/[0.05]">
          <h1 className="text-[14px] tracking-[0.3em] text-white/60 uppercase leading-none">
            Global Radar
          </h1>
          <p className="text-[10px] text-white/30 mt-1.5 tracking-wide max-w-2xl">
            Real-time monitoring of forces shaping technology and industry
          </p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-[8px] tracking-[0.2em] text-white/20 tabular-nums">
              {dateStr}
            </span>
            <span className="text-[8px] text-white/10">|</span>
            <span className="text-[8px] tracking-[0.2em] text-white/20 tabular-nums">
              AVG ACTIVITY {avgActivity}/100
            </span>
            <span className="text-[8px] text-white/10">|</span>
            <span className="text-[8px] tracking-[0.2em] text-white/20 tabular-nums">
              {domains.filter((d) => d.trend === 'increasing').length}{' '}
              DOMAINS RISING
            </span>
            {lastUpdatedStr && (
              <>
                <span className="text-[8px] text-white/10">|</span>
                <span className="text-[8px] tracking-[0.2em] text-white/15 tabular-nums">
                  UPDATED {lastUpdatedStr}
                </span>
              </>
            )}
          </div>
        </div>

        {/* DOMAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="border border-white/[0.08] rounded-sm p-4 bg-black hover:border-white/20 transition-all duration-200 group"
            >
              {/* Icon + Name + Trend */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] leading-none">{domain.icon}</span>
                  <span
                    className="text-[11px] tracking-[0.12em] uppercase"
                    style={{ color: `${domain.color}cc` }}
                  >
                    {domain.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-[14px] font-bold leading-none"
                    style={{ color: trendColor(domain.trend) }}
                  >
                    {trendArrow(domain.trend)}
                  </span>
                  <span
                    className="text-[7px] tracking-[0.15em] uppercase"
                    style={{ color: trendColor(domain.trend) }}
                  >
                    {trendLabel(domain.trend)}
                  </span>
                </div>
              </div>

              {/* Activity Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] tracking-[0.2em] text-white/25 uppercase">
                    ACTIVITY LEVEL
                  </span>
                  <span
                    className="text-[10px] tabular-nums font-bold"
                    style={{ color: domain.color }}
                  >
                    {domain.activityLevel}
                  </span>
                </div>
                <div className="h-[3px] w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${domain.activityLevel}%`,
                      backgroundColor: domain.color,
                      boxShadow: `0 0 6px ${domain.color}80`,
                    }}
                  />
                </div>
              </div>

              {/* Signal Summaries */}
              <div className="mt-3 space-y-1.5">
                {domain.signals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span
                      className="w-[3px] h-[3px] rounded-full mt-[4px] shrink-0"
                      style={{
                        backgroundColor: domain.color,
                        boxShadow: `0 0 4px ${domain.color}88`,
                      }}
                    />
                    <span className="text-[8px] text-white/40 leading-relaxed">
                      {signal}
                    </span>
                  </div>
                ))}
              </div>

              {/* Impacted Industries */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex flex-wrap gap-1">
                {domain.impactedIndustries.map((ind) => (
                  <span
                    key={ind}
                    className="text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-white/[0.06] text-white/25"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIPPLE EFFECTS */}
        <div className="mt-8 mb-8 border border-white/[0.08] rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#00d4ff',
                boxShadow: '0 0 6px #00d4ffcc',
              }}
            />
            <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase">
              RIPPLE EFFECTS
            </span>
            <span className="text-[7px] text-white/15 tracking-wide ml-1">
              CAUSE \u2192 EFFECT CHAINS
            </span>
          </div>

          <div className="space-y-3">
            {RIPPLE_EFFECTS.map((chain, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 border border-white/[0.04] rounded-sm hover:border-white/[0.10] transition-colors"
              >
                <span className="text-[10px] text-[#00d4ff]/40 tabular-nums shrink-0 mt-px">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-white/35 leading-relaxed tracking-wide">
                  {chain}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
