'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PageTopBar } from '@/components/PageTopBar';

// ─── Types ──────────────────────────────────────────────────────────────────

type TimelineStatus = 'past' | 'present' | 'future';

type LiveBadge = 'LIVE' | 'CONVERGENCE' | 'RISK' | 'TRAJECTORY' | null;

type TimelineEntry = {
  year: number;
  title: string;
  description: string;
  industries: string[];
  status: TimelineStatus;
  keyCompanies: string[];
  isLive?: boolean;
  liveBadge?: LiveBadge;
  badgeSeverity?: 'critical' | 'high' | 'moderate' | 'low';
  confidence?: number;
  source?: string;
  uid?: string;
};

// ─── API response shapes ─────────────────────────────────────────────────────

type WhatChangedSignal = {
  title: string;
  description: string;
  category: string;
  severity?: string;
  source?: string;
  url?: string;
  timestamp?: string;
};

type WhatChangedData = {
  signalsToday: WhatChangedSignal[];
  signalsThisWeek: WhatChangedSignal[];
  topSignals: WhatChangedSignal[];
  activeIndustries: string[];
};

type Trajectory = {
  industry: string;
  direction: string;
  confidence: number;
  timeframe: string;
  evidence: string[];
};

type Convergence = {
  industries: string[];
  description: string;
  timeline: string;
  probability: number;
};

type RiskEntry = {
  title: string;
  description: string;
  severity: string;
  industries: string[];
  timeframe: string;
};

type PredictionsData = {
  trajectories: Trajectory[];
  convergences: Convergence[];
  risks: RiskEntry[];
};

// ─── Timeline Data (baseline / fallback) ────────────────────────────────────

const TIMELINE_DATA: TimelineEntry[] = [
  {
    year: 2020,
    title: 'Remote Work Revolution',
    description:
      'COVID accelerates cloud, VPN, collaboration tools. Enterprises shift to remote-first overnight, driving massive adoption of video conferencing, cloud infrastructure, and zero-trust networking.',
    industries: ['Enterprise', 'Cybersecurity', 'AI/ML'],
    status: 'past',
    keyCompanies: ['Zoom', 'Microsoft', 'Cloudflare', 'Okta'],
  },
  {
    year: 2021,
    title: 'AI Goes Mainstream',
    description:
      'GPT-3, GitHub Copilot, AI-first startups surge. Foundation models prove that scale unlocks capability, sparking a wave of AI-native companies across every sector.',
    industries: ['AI/ML', 'Enterprise', 'Defense'],
    status: 'past',
    keyCompanies: ['OpenAI', 'GitHub', 'Hugging Face', 'Anthropic'],
  },
  {
    year: 2022,
    title: 'Cybersecurity Reckoning',
    description:
      'SolarWinds aftermath, zero-trust becomes standard. Nation-state attacks force enterprises and governments to rethink security architecture from the ground up.',
    industries: ['Cybersecurity', 'Defense', 'Enterprise'],
    status: 'past',
    keyCompanies: ['CrowdStrike', 'Palo Alto Networks', 'Zscaler', 'SentinelOne'],
  },
  {
    year: 2023,
    title: 'Generative AI Explosion',
    description:
      'ChatGPT, Midjourney, enterprise AI adoption 10x. Every industry begins integrating generative AI into workflows — from code generation to content creation to drug discovery.',
    industries: ['AI/ML', 'Healthcare', 'Manufacturing', 'Finance'],
    status: 'past',
    keyCompanies: ['OpenAI', 'Anthropic', 'Midjourney', 'Google DeepMind'],
  },
  {
    year: 2024,
    title: 'Autonomous Systems Scale',
    description:
      'Self-driving trucks, drone delivery, warehouse robots. Autonomous systems move from pilot programs to scaled deployments across logistics, agriculture, and defense.',
    industries: ['Supply Chain', 'Defense', 'Manufacturing', 'Energy'],
    status: 'past',
    keyCompanies: ['Aurora', 'Anduril', 'Locus Robotics', 'Wing'],
  },
  {
    year: 2025,
    title: 'AI Agents Era',
    description:
      'Autonomous AI agents handle procurement, analysis, coding. Multi-step reasoning systems replace simple chatbots, orchestrating complex workflows across enterprise operations.',
    industries: ['AI/ML', 'Enterprise', 'Cybersecurity', 'Finance'],
    status: 'present',
    keyCompanies: ['Anthropic', 'OpenAI', 'Microsoft', 'Salesforce'],
  },
  {
    year: 2026,
    title: 'Edge AI + 5G Convergence',
    description:
      'Real-time AI at the edge, smart cities accelerate. On-device inference combined with ultra-low-latency 5G enables autonomous vehicles, smart infrastructure, and real-time analytics.',
    industries: ['AI/ML', 'Energy', 'Manufacturing', 'Defense'],
    status: 'present',
    keyCompanies: ['NVIDIA', 'Qualcomm', 'Intel', 'Ericsson'],
  },
  {
    year: 2027,
    title: 'Quantum Computing Practical',
    description:
      'First commercial quantum advantage in pharma, materials. Quantum computers solve optimization and simulation problems that classical computers cannot.',
    industries: ['Healthcare', 'Energy', 'Finance', 'Defense'],
    status: 'future',
    keyCompanies: ['IBM', 'Google Quantum', 'IonQ', 'Rigetti'],
  },
  {
    year: 2028,
    title: 'Digital Twin Everything',
    description:
      'Cities, supply chains, human biology all simulated. High-fidelity digital replicas enable predictive maintenance, urban planning, and personalized medicine.',
    industries: ['Manufacturing', 'Healthcare', 'Energy', 'Supply Chain'],
    status: 'future',
    keyCompanies: ['Siemens', 'NVIDIA Omniverse', 'Ansys', 'Dassault'],
  },
  {
    year: 2029,
    title: 'Autonomous Supply Chains',
    description:
      'End-to-end AI-managed logistics, zero-human warehouses. Entire supply chains operate with minimal human intervention.',
    industries: ['Supply Chain', 'Manufacturing', 'AI/ML'],
    status: 'future',
    keyCompanies: ['Amazon Robotics', 'Flexport', 'AutoStore', 'Covariant'],
  },
  {
    year: 2030,
    title: 'AGI-Adjacent Systems',
    description:
      'AI systems that reason, plan, and execute across domains. General-purpose AI agents approach human-level capability.',
    industries: ['AI/ML', 'Defense', 'Healthcare', 'Enterprise'],
    status: 'future',
    keyCompanies: ['Anthropic', 'OpenAI', 'Google DeepMind', 'Meta AI'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function categoryToIndustries(category: string): string[] {
  const map: Record<string, string[]> = {
    'AI/ML': ['AI/ML'],
    Cybersecurity: ['Cybersecurity'],
    Defense: ['Defense'],
    Enterprise: ['Enterprise'],
    'Supply Chain': ['Supply Chain'],
    Energy: ['Energy'],
    Finance: ['Finance'],
    Healthcare: ['Healthcare'],
    Manufacturing: ['Manufacturing'],
  };
  return map[category] ?? ['General'];
}

function severityColor(severity?: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return '#ff3b30';
    case 'high':
      return '#ff8c00';
    case 'moderate':
    case 'medium':
      return '#ffb800';
    default:
      return '#00d4ff';
  }
}

function parseTimeframeYear(timeframe: string): number {
  const now = 2026;
  const match4digit = timeframe.match(/\b(20\d{2})\b/);
  if (match4digit) return parseInt(match4digit[1], 10);
  const matchMonths = timeframe.match(/(\d+)\s*month/i);
  if (matchMonths) return Math.round(now + parseInt(matchMonths[1], 10) / 12);
  const matchYears = timeframe.match(/(\d+)\s*year/i);
  if (matchYears) return now + parseInt(matchYears[1], 10);
  if (/\bshort/i.test(timeframe)) return now + 1;
  if (/\bmedium/i.test(timeframe)) return now + 2;
  if (/\blong/i.test(timeframe)) return now + 3;
  return now + 1;
}

// ─── buildLiveTimeline ───────────────────────────────────────────────────────

function buildLiveTimeline(
  wc: WhatChangedData | null,
  pred: PredictionsData | null
): TimelineEntry[] {
  const base: TimelineEntry[] = TIMELINE_DATA.map((e) => ({ ...e }));
  const live: TimelineEntry[] = [];

  if (wc) {
    const seen = new Set<string>();
    const signals = [...(wc.topSignals ?? []), ...(wc.signalsToday ?? [])];
    for (const s of signals) {
      const uid = `live-${s.title}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      live.push({
        year: 2026,
        title: s.title,
        description: s.description ?? '',
        industries: categoryToIndustries(s.category),
        status: 'present',
        keyCompanies: [],
        isLive: true,
        liveBadge: 'LIVE',
        badgeSeverity:
          (s.severity as TimelineEntry['badgeSeverity']) ?? 'moderate',
        source: s.source,
        uid,
      });
    }
  }

  if (pred) {
    for (const t of pred.trajectories ?? []) {
      const year = parseTimeframeYear(t.timeframe ?? '');
      live.push({
        year,
        title: `${t.industry} — ${t.direction ?? 'Trending'}`,
        description:
          (t.evidence ?? []).slice(0, 2).join(' ') ||
          `${t.industry} trajectory tracked by NXT//LINK intelligence.`,
        industries: [t.industry],
        status: 'future',
        keyCompanies: [],
        isLive: true,
        liveBadge: 'TRAJECTORY',
        confidence: t.confidence,
        uid: `traj-${t.industry}-${year}`,
      });
    }

    for (const c of pred.convergences ?? []) {
      const year = parseTimeframeYear(c.timeline ?? '');
      live.push({
        year,
        title: `Convergence: ${(c.industries ?? []).join(' + ')}`,
        description: c.description ?? '',
        industries: c.industries ?? [],
        status: 'future',
        keyCompanies: [],
        isLive: true,
        liveBadge: 'CONVERGENCE',
        confidence: Math.round((c.probability ?? 0) * 100),
        uid: `conv-${(c.industries ?? []).join('-')}-${year}`,
      });
    }

    for (const r of pred.risks ?? []) {
      const year = parseTimeframeYear(r.timeframe ?? '');
      live.push({
        year,
        title: r.title,
        description: r.description ?? '',
        industries: r.industries ?? [],
        status: 'future',
        keyCompanies: [],
        isLive: true,
        liveBadge: 'RISK',
        badgeSeverity: r.severity as TimelineEntry['badgeSeverity'],
        uid: `risk-${r.title}-${year}`,
      });
    }
  }

  const all = [...base, ...live];
  const seen = new Set<string>();
  const deduped = all.filter((e) => {
    const key = e.uid ?? `${e.year}-${e.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => a.year - b.year || (a.isLive ? 1 : -1));
  return deduped;
}

const STATUS_FILTERS: { key: TimelineStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'past', label: 'PAST' },
  { key: 'present', label: 'PRESENT' },
  { key: 'future', label: 'FUTURE' },
];

const NOW_YEAR = 2026;
const COL_WIDTH = 260;
const COL_WIDTH_MOBILE = 210;

// ─── Badge chip ──────────────────────────────────────────────────────────────

function LiveBadgeChip({
  badge,
  severity,
  confidence,
}: {
  badge: LiveBadge;
  severity?: string;
  confidence?: number;
}) {
  if (!badge) return null;

  let color = '#00ff88';
  let bg = 'rgba(0,255,136,0.08)';
  let border = 'rgba(0,255,136,0.20)';
  let label: string = badge;

  if (badge === 'RISK') {
    color = severityColor(severity);
    bg = `${color}14`;
    border = `${color}35`;
    label = severity ? `${severity.toUpperCase()} RISK` : 'RISK';
  } else if (badge === 'CONVERGENCE') {
    color = '#00d4ff';
    bg = 'rgba(0,212,255,0.08)';
    border = 'rgba(0,212,255,0.25)';
    label = confidence ? `CONV ${confidence}%` : 'CONVERGENCE';
  } else if (badge === 'TRAJECTORY') {
    color = '#ffb800';
    bg = 'rgba(255,184,0,0.08)';
    border = 'rgba(255,184,0,0.25)';
    label = confidence ? `TRAJ ${confidence}%` : 'TRAJECTORY';
  } else if (badge === 'LIVE') {
    label = 'LIVE';
  }

  return (
    <span
      className="font-mono text-[6px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm border whitespace-nowrap"
      style={{ color, backgroundColor: bg, borderColor: border }}
    >
      {label}
    </span>
  );
}

// ─── Timeline Card (horizontal layout — compact, vertical) ───────────────────

function TimelineCard({
  entry,
  isExpanded,
  onToggle,
  isDimmed,
}: {
  entry: TimelineEntry;
  isExpanded: boolean;
  onToggle: () => void;
  isDimmed: boolean;
}) {
  const isFuture = entry.status === 'future';
  const isPresent = entry.status === 'present';

  const borderStyle = isFuture
    ? 'border-dashed border-[#00d4ff]/15'
    : isPresent
    ? 'border-solid border-[#00d4ff]/25'
    : 'border-solid border-white/[0.06]';

  const glowStyle: React.CSSProperties = isPresent
    ? { boxShadow: '0 0 20px rgba(0,212,255,0.06), inset 0 0 20px rgba(0,212,255,0.03)' }
    : {};

  const liveAccentStyle: React.CSSProperties =
    entry.liveBadge === 'RISK'
      ? { borderLeftColor: severityColor(entry.badgeSeverity), borderLeftWidth: 2 }
      : entry.liveBadge === 'CONVERGENCE'
      ? { borderLeftColor: '#00d4ff', borderLeftWidth: 2 }
      : {};

  return (
    <div
      onClick={onToggle}
      className={`
        w-[220px] sm:w-[240px] border rounded-sm p-3 cursor-pointer select-none
        transition-all duration-300 hover:bg-white/[0.02]
        ${borderStyle}
        ${isDimmed ? 'opacity-[0.12]' : ''}
      `}
      style={{
        ...glowStyle,
        ...liveAccentStyle,
        transform: isDimmed ? 'none' : undefined,
      }}
    >
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className="font-mono text-[9px] tracking-[0.25em] font-medium"
          style={{
            color: isPresent ? '#00d4ff' : isFuture ? '#00d4ff80' : '#ffffff40',
          }}
        >
          {entry.year}
        </span>
        <span
          className="font-mono text-[6px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm border"
          style={{
            color: isPresent ? '#00d4ff80' : isFuture ? '#00d4ff50' : '#ffffff25',
            borderColor: isPresent ? '#00d4ff20' : isFuture ? '#00d4ff15' : '#ffffff10',
          }}
        >
          {entry.status}
        </span>
        {entry.liveBadge && (
          <LiveBadgeChip
            badge={entry.liveBadge}
            severity={entry.badgeSeverity}
            confidence={entry.confidence}
          />
        )}
      </div>

      {/* Title */}
      <h3
        className={`text-[12px] font-medium mb-1.5 transition-colors ${
          entry.status === 'past' ? 'text-white/50' : isPresent ? 'text-white/90' : 'text-white/70'
        }`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {entry.title}
      </h3>

      {/* Description — clamped unless expanded */}
      <p
        className={`font-mono text-[10px] leading-[1.6] mb-2 transition-all duration-300 ${
          entry.status === 'past'
            ? 'text-white/25'
            : isFuture
            ? 'text-white/35 italic'
            : 'text-white/50'
        } ${isExpanded ? '' : 'line-clamp-2'}`}
      >
        {entry.description}
      </p>

      {/* Companies — show on expand */}
      {isExpanded && entry.keyCompanies.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.keyCompanies.map((c) => (
            <span
              key={c}
              className="font-mono text-[8px] text-[#00d4ff]/40 bg-[#00d4ff]/[0.04] px-1.5 py-0.5 rounded-sm border border-[#00d4ff]/10"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Industry tags */}
      <div className="flex flex-wrap gap-1">
        {entry.industries.slice(0, isExpanded ? undefined : 2).map((ind) => (
          <span
            key={ind}
            className="font-mono text-[7px] tracking-[0.12em] text-white/15 border border-white/[0.06] rounded-sm px-1.5 py-0.5 uppercase"
          >
            {ind}
          </span>
        ))}
        {!isExpanded && entry.industries.length > 2 && (
          <span className="font-mono text-[7px] text-white/15">
            +{entry.industries.length - 2}
          </span>
        )}
      </div>

      {/* Future shimmer overlay */}
      {isFuture && !isDimmed && (
        <div className="absolute inset-0 rounded-sm timeline-future-shimmer pointer-events-none" />
      )}
    </div>
  );
}

// ─── NOW Marker ──────────────────────────────────────────────────────────────

function NowMarker() {
  return (
    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
      {/* Ambient glow */}
      <div
        className="absolute"
        style={{
          width: 180,
          height: 100,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.1) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />
      {/* Radiating ring 1 */}
      <span
        className="absolute"
        style={{
          width: 24,
          height: 24,
          top: '50%',
          left: '50%',
          borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.4)',
          animation: 'now-radiate 3s ease-out infinite',
        }}
      />
      {/* Radiating ring 2 (offset) */}
      <span
        className="absolute"
        style={{
          width: 24,
          height: 24,
          top: '50%',
          left: '50%',
          borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.3)',
          animation: 'now-radiate 3s ease-out 1.5s infinite',
        }}
      />
      {/* Core dot */}
      <span
        className="relative block w-3 h-3 rounded-full z-10"
        style={{
          backgroundColor: '#00d4ff',
          boxShadow: '0 0 12px #00d4ffcc, 0 0 28px #00d4ff55',
        }}
      />
      {/* NOW label */}
      <span
        className="font-mono text-[8px] tracking-[0.35em] mt-2 z-10"
        style={{ color: '#00d4ff', textShadow: '0 0 8px rgba(0,212,255,0.6)' }}
      >
        NOW
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [statusFilter, setStatusFilter] = useState<TimelineStatus | 'all'>('all');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(TIMELINE_DATA);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const hasScrolledToNow = useRef(false);

  // ─── Fetch live data ─────────────────────────────────────────
  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    try {
      const [wcRes, predRes] = await Promise.allSettled([
        fetch('/api/what-changed'),
        fetch('/api/predictions'),
      ]);

      const wc: WhatChangedData | null =
        wcRes.status === 'fulfilled' && wcRes.value.ok
          ? await wcRes.value
              .json()
              .then((j: { ok: boolean; data: WhatChangedData }) =>
                j.ok ? j.data : null
              )
              .catch(() => null)
          : null;

      const pred: PredictionsData | null =
        predRes.status === 'fulfilled' && predRes.value.ok
          ? await predRes.value
              .json()
              .then((j: { ok: boolean; data: PredictionsData }) =>
                j.ok ? j.data : null
              )
              .catch(() => null)
          : null;

      const merged = buildLiveTimeline(wc, pred);
      setTimeline(merged);
      setIsLive(wc !== null || pred !== null);
    } catch {
      // fall back to baseline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // ─── Derived data ────────────────────────────────────────────
  const allIndustries = useMemo(
    () => Array.from(new Set(timeline.flatMap((e) => e.industries))).sort(),
    [timeline]
  );

  // Group entries by year
  const yearGroups = useMemo(() => {
    const groups = new Map<number, TimelineEntry[]>();
    for (const entry of timeline) {
      const existing = groups.get(entry.year);
      if (existing) existing.push(entry);
      else groups.set(entry.year, [entry]);
    }
    return Array.from(groups.entries() as Iterable<[number, TimelineEntry[]]>).sort(
      (a, b) => a[0] - b[0]
    );
  }, [timeline]);

  const years = useMemo(() => yearGroups.map(([y]) => y), [yearGroups]);
  const liveCount = useMemo(() => timeline.filter((e) => e.isLive).length, [timeline]);

  // Check if an entry matches current filters
  const matchesFilter = useCallback(
    (entry: TimelineEntry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (industryFilter && !entry.industries.includes(industryFilter)) return false;
      return true;
    },
    [statusFilter, industryFilter]
  );

  // ─── Column width (responsive) ──────────────────────────────
  const getColWidth = useCallback(() => {
    if (typeof window === 'undefined') return COL_WIDTH;
    return window.innerWidth < 640 ? COL_WIDTH_MOBILE : COL_WIDTH;
  }, []);

  // ─── Scroll to a year ───────────────────────────────────────
  const scrollToYear = useCallback(
    (year: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const idx = years.indexOf(year);
      if (idx === -1) return;
      const colW = getColWidth();
      const padding = 60;
      // Center the year in view
      const targetLeft = idx * colW + padding - container.clientWidth / 2 + colW / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    },
    [years, getColWidth]
  );

  // ─── Auto-scroll to NOW on first load ───────────────────────
  useEffect(() => {
    if (!loading && !hasScrolledToNow.current && years.includes(NOW_YEAR)) {
      hasScrolledToNow.current = true;
      // Small delay so DOM is painted
      setTimeout(() => scrollToYear(NOW_YEAR), 300);
    }
  }, [loading, years, scrollToYear]);

  // ─── Mouse wheel → horizontal scroll ───────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, []);

  // ─── Drag to scroll ────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = scrollRef.current;
    if (!container) return;
    setIsDragging(true);
    dragStart.current = { x: e.pageX, scrollLeft: container.scrollLeft };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart.current) return;
      const container = scrollRef.current;
      if (!container) return;
      const dx = e.pageX - dragStart.current.x;
      container.scrollLeft = dragStart.current.scrollLeft - dx;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // ─── Filter click → scroll to first match ──────────────────
  const handleStatusFilter = useCallback(
    (key: TimelineStatus | 'all') => {
      setStatusFilter(key);
      if (key === 'all') return;
      // Find first year with a matching entry
      for (const [year, entries] of yearGroups) {
        if (entries.some((e) => e.status === key)) {
          setTimeout(() => scrollToYear(year), 100);
          return;
        }
      }
    },
    [yearGroups, scrollToYear]
  );

  const handleIndustryFilter = useCallback(
    (ind: string | null) => {
      setIndustryFilter(ind);
      if (!ind) return;
      for (const [year, entries] of yearGroups) {
        if (entries.some((e) => e.industries.includes(ind))) {
          setTimeout(() => scrollToYear(year), 100);
          return;
        }
      }
    },
    [yearGroups, scrollToYear]
  );

  // ─── Compute column width for layout ───────────────────────
  const colW = typeof window !== 'undefined' && window.innerWidth < 640 ? COL_WIDTH_MOBILE : COL_WIDTH;
  const totalWidth = yearGroups.length * colW + 120; // 60px padding each side

  // Find NOW index for wire split
  const nowIdx = years.indexOf(NOW_YEAR);
  const nowOffsetPx = nowIdx >= 0 ? 60 + nowIdx * colW + colW / 2 : totalWidth / 2;

  return (
    <main className="h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Top bar */}
      <PageTopBar
        backHref="/"
        backLabel="HOME"
        breadcrumbs={[
          { label: 'NXT//LINK', href: '/' },
          { label: 'TIMELINE' },
        ]}
        rightSlot={
          <div className="flex items-center gap-3">
            {loading && (
              <span className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/40 animate-pulse">
                FETCHING
              </span>
            )}
            {!loading && isLive && (
              <span className="flex items-center gap-1.5">
                <span
                  className="relative block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }}
                >
                  <span
                    className="absolute inset-[-2px] rounded-full animate-ping"
                    style={{ backgroundColor: '#00ff88', opacity: 0.35 }}
                  />
                </span>
                <span className="font-mono text-[8px] tracking-[0.25em]" style={{ color: '#00ff88' }}>
                  LIVE · {liveCount} SIGNALS
                </span>
              </span>
            )}
            <span className="font-mono text-[8px] tracking-[0.2em] text-white/20">
              {timeline.length} EVENTS
            </span>
          </div>
        }
      />

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-4 sm:px-6 pt-4 pb-2 shrink-0">
        {/* Status toggle */}
        <div className="flex items-center gap-1 mb-3">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleStatusFilter(f.key)}
              className={`font-mono text-[9px] tracking-[0.25em] uppercase px-3 py-1.5 border rounded-sm transition-all duration-200 ${
                statusFilter === f.key
                  ? 'border-[#00d4ff]/50 text-[#00d4ff] bg-[#00d4ff]/[0.06]'
                  : 'border-white/[0.06] text-white/25 hover:text-white/40 hover:border-white/[0.12]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Industry chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleIndustryFilter(null)}
            className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm border transition-all duration-200 ${
              industryFilter === null
                ? 'border-[#00d4ff]/40 text-[#00d4ff]/70 bg-[#00d4ff]/[0.05]'
                : 'border-white/[0.06] text-white/20 hover:text-white/35 hover:border-white/[0.10]'
            }`}
          >
            ALL
          </button>
          {allIndustries.map((ind) => (
            <button
              key={ind}
              onClick={() => handleIndustryFilter(industryFilter === ind ? null : ind)}
              className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm border transition-all duration-200 ${
                industryFilter === ind
                  ? 'border-[#00d4ff]/40 text-[#00d4ff]/70 bg-[#00d4ff]/[0.05]'
                  : 'border-white/[0.06] text-white/20 hover:text-white/35 hover:border-white/[0.10]'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* ── Horizontal Timeline ─────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {/* Edge fade left */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #0a0a18, transparent)' }}
        />
        {/* Edge fade right */}
        <div
          className="absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #0a0a18, transparent)' }}
        />

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="timeline-scroll h-full overflow-x-auto overflow-y-hidden"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            scrollSnapType: 'x proximity',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Inner content — positioned for the wire at ~38% from top */}
          <div className="relative h-full" style={{ width: totalWidth, minHeight: '100%' }}>
            {/* ── Scan line ─────────────────────────────────────── */}
            <div className="timeline-scan-line" />

            {/* ── Wire (solid past + dashed future) ─────────────── */}
            <div
              className="absolute left-0 right-0"
              style={{ top: '32%', height: 1 }}
            >
              {/* Solid wire (past → NOW) */}
              <div
                className="absolute top-0 left-0 h-px"
                style={{
                  width: nowOffsetPx,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.12) 10%, rgba(0,212,255,0.2) 100%)',
                }}
              />
              {/* Dashed wire (NOW → future) */}
              <div
                className="absolute top-0 h-px"
                style={{
                  left: nowOffsetPx,
                  right: 0,
                  background:
                    'repeating-linear-gradient(90deg, rgba(0,212,255,0.18) 0px, rgba(0,212,255,0.18) 8px, transparent 8px, transparent 14px)',
                }}
              />
              {/* Pulse energy wave on top */}
              <div
                className="absolute top-[-1px] left-0 right-0 timeline-wire-pulse"
              />
            </div>

            {/* ── NOW marker ──────────────────────────────────── */}
            {nowIdx >= 0 && (
              <div
                className="absolute z-30"
                style={{ left: nowOffsetPx, top: '32%' }}
              >
                <NowMarker />
              </div>
            )}

            {/* ── Year columns ─────────────────────────────────── */}
            <div className="absolute inset-0 flex" style={{ paddingLeft: 60, paddingRight: 60 }}>
              {yearGroups.map(([year, entries]) => {
                const isNow = year === NOW_YEAR;
                const isPast = year < NOW_YEAR;

                return (
                  <div
                    key={year}
                    className="relative shrink-0 flex flex-col"
                    style={{
                      width: colW,
                      scrollSnapAlign: 'start',
                    }}
                  >
                    {/* Year label on the wire */}
                    <div
                      className="absolute flex flex-col items-center"
                      style={{
                        top: '32%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {/* Tick mark */}
                      <div
                        className="w-px mb-1"
                        style={{
                          height: isNow ? 14 : 10,
                          marginTop: isNow ? -14 : -10,
                          background: isNow
                            ? '#00d4ff'
                            : isPast
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,212,255,0.25)',
                        }}
                      />
                      {/* Year text */}
                      <span
                        className="font-mono tracking-[0.3em] mt-1"
                        style={{
                          fontSize: isNow ? 11 : 9,
                          color: isNow
                            ? '#00d4ff'
                            : isPast
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(0,212,255,0.45)',
                          textShadow: isNow ? '0 0 10px rgba(0,212,255,0.5)' : 'none',
                          fontWeight: isNow ? 600 : 400,
                        }}
                      >
                        {year}
                      </span>
                    </div>

                    {/* Event nodes on the wire */}
                    {entries.map((entry, eIdx) => {
                      const uid = entry.uid ?? `${entry.year}-${entry.title}`;
                      const matches = matchesFilter(entry);
                      const isDimmed = !matches && (statusFilter !== 'all' || industryFilter !== null);

                      // Dot color
                      const dotColor = entry.isLive
                        ? entry.liveBadge === 'RISK'
                          ? severityColor(entry.badgeSeverity)
                          : entry.liveBadge === 'CONVERGENCE'
                          ? '#00d4ff'
                          : '#00ff88'
                        : entry.status === 'present'
                        ? '#00d4ff'
                        : entry.status === 'future'
                        ? '#00d4ff'
                        : 'rgba(255,255,255,0.30)';

                      const isPulsing =
                        entry.status === 'present' || (entry.isLive && entry.liveBadge === 'LIVE');
                      const isFutureEntry = entry.status === 'future';

                      // Offset multiple entries within the same year
                      const count = entries.length;
                      const spread = Math.min(count - 1, 4) * 30;
                      const offsetX = count > 1 ? -spread / 2 + eIdx * (spread / Math.max(count - 1, 1)) : 0;

                      return (
                        <div
                          key={uid}
                          className="absolute flex flex-col items-center"
                          style={{
                            top: '32%',
                            left: `calc(50% + ${offsetX}px)`,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {/* Node dot on wire */}
                          <div
                            className={`relative z-20 ${isDimmed ? 'opacity-[0.15]' : ''}`}
                            style={{ marginTop: -5 }}
                          >
                            {isPulsing && !isDimmed && (
                              <span
                                className="absolute inset-[-3px] rounded-full animate-ping"
                                style={{ backgroundColor: dotColor, opacity: 0.25 }}
                              />
                            )}
                            <span
                              className={`relative block w-[10px] h-[10px] rounded-full ${
                                isFutureEntry ? 'border border-dashed' : ''
                              } ${isPulsing && !isDimmed ? 'timeline-node-pulse' : ''}`}
                              style={{
                                backgroundColor: isFutureEntry ? 'transparent' : dotColor,
                                borderColor: isFutureEntry ? `${dotColor}60` : undefined,
                                color: dotColor,
                                boxShadow:
                                  isPulsing && !isDimmed
                                    ? `0 0 8px ${dotColor}aa`
                                    : isFutureEntry
                                    ? 'none'
                                    : `0 0 4px ${dotColor}60`,
                              }}
                            />
                          </div>

                          {/* Vertical connector line */}
                          <div
                            className={`w-px ${isDimmed ? 'opacity-[0.15]' : ''}`}
                            style={{
                              height: 28,
                              background: `linear-gradient(to bottom, ${dotColor}40, ${dotColor}10)`,
                            }}
                          />

                          {/* Card */}
                          <TimelineCard
                            entry={entry}
                            isExpanded={expandedUid === uid}
                            onToggle={() =>
                              setExpandedUid(expandedUid === uid ? null : uid)
                            }
                            isDimmed={isDimmed}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 py-3 text-center border-t border-white/[0.04] shrink-0">
        <span className="font-mono text-[7px] tracking-[0.35em] text-white/10 uppercase">
          NXT//LINK · TECHNOLOGY TIMELINE · SCROLL TO EXPLORE
        </span>
      </footer>
    </main>
  );
}
