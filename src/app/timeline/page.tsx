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

// ─── Baseline Data ──────────────────────────────────────────────────────────

const TIMELINE_DATA: TimelineEntry[] = [
  {
    year: 2020, title: 'Remote Work Revolution',
    description: 'COVID accelerates cloud, VPN, collaboration tools. Enterprises shift to remote-first overnight.',
    industries: ['Enterprise', 'Cybersecurity', 'AI/ML'], status: 'past',
    keyCompanies: ['Zoom', 'Microsoft', 'Cloudflare', 'Okta'],
  },
  {
    year: 2021, title: 'AI Goes Mainstream',
    description: 'GPT-3, GitHub Copilot, AI-first startups surge. Foundation models prove scale unlocks capability.',
    industries: ['AI/ML', 'Enterprise', 'Defense'], status: 'past',
    keyCompanies: ['OpenAI', 'GitHub', 'Hugging Face', 'Anthropic'],
  },
  {
    year: 2022, title: 'Cybersecurity Reckoning',
    description: 'SolarWinds aftermath, zero-trust becomes standard. Nation-state attacks force architecture rethink.',
    industries: ['Cybersecurity', 'Defense', 'Enterprise'], status: 'past',
    keyCompanies: ['CrowdStrike', 'Palo Alto Networks', 'Zscaler', 'SentinelOne'],
  },
  {
    year: 2023, title: 'Generative AI Explosion',
    description: 'ChatGPT, Midjourney, enterprise AI adoption 10x. Every industry integrates generative AI.',
    industries: ['AI/ML', 'Healthcare', 'Manufacturing', 'Finance'], status: 'past',
    keyCompanies: ['OpenAI', 'Anthropic', 'Midjourney', 'Google DeepMind'],
  },
  {
    year: 2024, title: 'Autonomous Systems Scale',
    description: 'Self-driving trucks, drone delivery, warehouse robots move from pilot to scaled deployments.',
    industries: ['Supply Chain', 'Defense', 'Manufacturing', 'Energy'], status: 'past',
    keyCompanies: ['Aurora', 'Anduril', 'Locus Robotics', 'Wing'],
  },
  {
    year: 2025, title: 'AI Agents Era',
    description: 'Autonomous AI agents handle procurement, analysis, coding. Multi-step reasoning replaces chatbots.',
    industries: ['AI/ML', 'Enterprise', 'Cybersecurity', 'Finance'], status: 'present',
    keyCompanies: ['Anthropic', 'OpenAI', 'Microsoft', 'Salesforce'],
  },
  {
    year: 2026, title: 'Edge AI + 5G Convergence',
    description: 'Real-time AI at the edge, smart cities accelerate. On-device inference + ultra-low-latency 5G.',
    industries: ['AI/ML', 'Energy', 'Manufacturing', 'Defense'], status: 'present',
    keyCompanies: ['NVIDIA', 'Qualcomm', 'Intel', 'Ericsson'],
  },
  {
    year: 2027, title: 'Quantum Computing Practical',
    description: 'First commercial quantum advantage in pharma and materials science.',
    industries: ['Healthcare', 'Energy', 'Finance', 'Defense'], status: 'future',
    keyCompanies: ['IBM', 'Google Quantum', 'IonQ', 'Rigetti'],
  },
  {
    year: 2028, title: 'Digital Twin Everything',
    description: 'Cities, supply chains, human biology all simulated with high-fidelity digital replicas.',
    industries: ['Manufacturing', 'Healthcare', 'Energy', 'Supply Chain'], status: 'future',
    keyCompanies: ['Siemens', 'NVIDIA Omniverse', 'Ansys', 'Dassault'],
  },
  {
    year: 2029, title: 'Autonomous Supply Chains',
    description: 'End-to-end AI-managed logistics, zero-human warehouses.',
    industries: ['Supply Chain', 'Manufacturing', 'AI/ML'], status: 'future',
    keyCompanies: ['Amazon Robotics', 'Flexport', 'AutoStore', 'Covariant'],
  },
  {
    year: 2030, title: 'AGI-Adjacent Systems',
    description: 'AI systems that reason, plan, and execute across domains approach human-level capability.',
    industries: ['AI/ML', 'Defense', 'Healthcare', 'Enterprise'], status: 'future',
    keyCompanies: ['Anthropic', 'OpenAI', 'Google DeepMind', 'Meta AI'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function categoryToIndustries(cat: string): string[] {
  const m: Record<string, string[]> = {
    'AI/ML': ['AI/ML'], Cybersecurity: ['Cybersecurity'], Defense: ['Defense'],
    Enterprise: ['Enterprise'], 'Supply Chain': ['Supply Chain'], Energy: ['Energy'],
    Finance: ['Finance'], Healthcare: ['Healthcare'], Manufacturing: ['Manufacturing'],
  };
  return m[cat] ?? ['General'];
}

function severityColor(s?: string): string {
  switch (s?.toLowerCase()) {
    case 'critical': return '#ff3b30';
    case 'high': return '#ff8c00';
    case 'moderate': case 'medium': return '#ffb800';
    default: return '#00d4ff';
  }
}

function parseTimeframeYear(tf: string): number {
  const now = 2026;
  const m4 = tf.match(/\b(20\d{2})\b/);
  if (m4) return parseInt(m4[1], 10);
  const mM = tf.match(/(\d+)\s*month/i);
  if (mM) return Math.round(now + parseInt(mM[1], 10) / 12);
  const mY = tf.match(/(\d+)\s*year/i);
  if (mY) return now + parseInt(mY[1], 10);
  if (/\bshort/i.test(tf)) return now + 1;
  if (/\bmedium/i.test(tf)) return now + 2;
  if (/\blong/i.test(tf)) return now + 3;
  return now + 1;
}

function buildLiveTimeline(wc: WhatChangedData | null, pred: PredictionsData | null): TimelineEntry[] {
  const base: TimelineEntry[] = TIMELINE_DATA.map((e) => ({ ...e }));
  const live: TimelineEntry[] = [];

  if (wc) {
    const seen = new Set<string>();
    for (const s of [...(wc.topSignals ?? []), ...(wc.signalsToday ?? [])]) {
      const uid = `live-${s.title}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      live.push({
        year: 2026, title: s.title, description: s.description ?? '',
        industries: categoryToIndustries(s.category), status: 'present',
        keyCompanies: [], isLive: true, liveBadge: 'LIVE',
        badgeSeverity: (s.severity as TimelineEntry['badgeSeverity']) ?? 'moderate',
        source: s.source, uid,
      });
    }
  }

  if (pred) {
    for (const t of pred.trajectories ?? []) {
      const year = parseTimeframeYear(t.timeframe ?? '');
      live.push({
        year, title: `${t.industry} — ${t.direction ?? 'Trending'}`,
        description: (t.evidence ?? []).slice(0, 2).join(' ') || `${t.industry} trajectory.`,
        industries: [t.industry], status: 'future', keyCompanies: [],
        isLive: true, liveBadge: 'TRAJECTORY', confidence: t.confidence,
        uid: `traj-${t.industry}-${year}`,
      });
    }
    for (const c of pred.convergences ?? []) {
      const year = parseTimeframeYear(c.timeline ?? '');
      live.push({
        year, title: `Convergence: ${(c.industries ?? []).join(' + ')}`,
        description: c.description ?? '', industries: c.industries ?? [],
        status: 'future', keyCompanies: [], isLive: true, liveBadge: 'CONVERGENCE',
        confidence: Math.round((c.probability ?? 0) * 100),
        uid: `conv-${(c.industries ?? []).join('-')}-${year}`,
      });
    }
    for (const r of pred.risks ?? []) {
      const year = parseTimeframeYear(r.timeframe ?? '');
      live.push({
        year, title: r.title, description: r.description ?? '',
        industries: r.industries ?? [], status: 'future', keyCompanies: [],
        isLive: true, liveBadge: 'RISK',
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
  { key: 'present', label: 'NOW' },
  { key: 'future', label: 'FUTURE' },
];

const NOW_YEAR = 2026;
const COL_W = 260;

// ─── Badge ───────────────────────────────────────────────────────────────────

function Badge({ badge, severity, confidence }: { badge: LiveBadge; severity?: string; confidence?: number }) {
  if (!badge) return null;
  let color = '#00ff88', bg = 'rgba(0,255,136,0.08)', border = 'rgba(0,255,136,0.20)', label: string = badge;
  if (badge === 'RISK') {
    color = severityColor(severity); bg = `${color}14`; border = `${color}35`;
    label = severity ? `${severity.toUpperCase()} RISK` : 'RISK';
  } else if (badge === 'CONVERGENCE') {
    color = '#00d4ff'; bg = 'rgba(0,212,255,0.08)'; border = 'rgba(0,212,255,0.25)';
    label = confidence ? `CONV ${confidence}%` : 'CONVERGENCE';
  } else if (badge === 'TRAJECTORY') {
    color = '#ffb800'; bg = 'rgba(255,184,0,0.08)'; border = 'rgba(255,184,0,0.25)';
    label = confidence ? `TRAJ ${confidence}%` : 'TRAJECTORY';
  }
  return (
    <span className="font-mono text-[6px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm border whitespace-nowrap"
      style={{ color, backgroundColor: bg, borderColor: border }}>{label}</span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

function Card({ entry, expanded, onToggle, dimmed }: {
  entry: TimelineEntry; expanded: boolean; onToggle: () => void; dimmed: boolean;
}) {
  const isFut = entry.status === 'future';
  const isNow = entry.status === 'present';
  const border = isFut ? 'border-dashed border-[#00d4ff]/15'
    : isNow ? 'border-solid border-[#00d4ff]/25' : 'border-solid border-white/[0.06]';

  return (
    <div onClick={onToggle}
      className={`w-[220px] sm:w-[240px] border rounded-sm p-3 cursor-pointer select-none
        transition-all duration-300 hover:bg-white/[0.02] ${border} ${dimmed ? 'opacity-[0.12]' : ''}`}
      style={isNow ? { boxShadow: '0 0 20px rgba(0,212,255,0.06)' } : undefined}>
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="font-mono text-[9px] tracking-[0.25em] font-medium"
          style={{ color: isNow ? '#00d4ff' : isFut ? '#00d4ff80' : '#ffffff40' }}>{entry.year}</span>
        {entry.liveBadge && <Badge badge={entry.liveBadge} severity={entry.badgeSeverity} confidence={entry.confidence} />}
      </div>
      {/* Title */}
      <h3 className={`text-[12px] font-medium mb-1.5 ${isNow ? 'text-white/90' : isFut ? 'text-white/70' : 'text-white/50'}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{entry.title}</h3>
      {/* Description */}
      <p className={`font-mono text-[10px] leading-[1.6] mb-2 ${
        isFut ? 'text-white/35 italic' : isNow ? 'text-white/50' : 'text-white/25'
      } ${expanded ? '' : 'line-clamp-2'}`}>{entry.description}</p>
      {/* Companies on expand */}
      {expanded && entry.keyCompanies.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.keyCompanies.map((c) => (
            <span key={c} className="font-mono text-[8px] text-[#00d4ff]/40 bg-[#00d4ff]/[0.04] px-1.5 py-0.5 rounded-sm border border-[#00d4ff]/10">{c}</span>
          ))}
        </div>
      )}
      {/* Industry tags */}
      <div className="flex flex-wrap gap-1">
        {entry.industries.slice(0, expanded ? undefined : 2).map((ind) => (
          <span key={ind} className="font-mono text-[7px] tracking-[0.12em] text-white/15 border border-white/[0.06] rounded-sm px-1.5 py-0.5 uppercase">{ind}</span>
        ))}
        {!expanded && entry.industries.length > 2 && <span className="font-mono text-[7px] text-white/15">+{entry.industries.length - 2}</span>}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [statusFilter, setStatusFilter] = useState<TimelineStatus | 'all'>('all');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(TIMELINE_DATA);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; sl: number } | null>(null);
  const scrolledToNow = useRef(false);

  // Fetch live data
  const fetchLive = useCallback(async () => {
    setLoading(true);
    try {
      const [wcR, prR] = await Promise.allSettled([fetch('/api/what-changed'), fetch('/api/predictions')]);
      const wc: WhatChangedData | null = wcR.status === 'fulfilled' && wcR.value.ok
        ? await wcR.value.json().then((j: { ok: boolean; data: WhatChangedData }) => j.ok ? j.data : null).catch(() => null) : null;
      const pred: PredictionsData | null = prR.status === 'fulfilled' && prR.value.ok
        ? await prR.value.json().then((j: { ok: boolean; data: PredictionsData }) => j.ok ? j.data : null).catch(() => null) : null;
      setTimeline(buildLiveTimeline(wc, pred));
      setIsLive(wc !== null || pred !== null);
    } catch { /* fallback */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  // Derived
  const allIndustries = useMemo(() => Array.from(new Set(timeline.flatMap((e) => e.industries))).sort(), [timeline]);
  const yearGroups = useMemo(() => {
    const g = new Map<number, TimelineEntry[]>();
    for (const e of timeline) { const arr = g.get(e.year); if (arr) arr.push(e); else g.set(e.year, [e]); }
    return Array.from(g.entries() as Iterable<[number, TimelineEntry[]]>).sort((a, b) => a[0] - b[0]);
  }, [timeline]);
  const years = useMemo(() => yearGroups.map(([y]) => y), [yearGroups]);
  const liveCount = useMemo(() => timeline.filter((e) => e.isLive).length, [timeline]);

  const matches = useCallback((e: TimelineEntry) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (industryFilter && !e.industries.includes(industryFilter)) return false;
    return true;
  }, [statusFilter, industryFilter]);

  // Scroll helpers
  const scrollToYear = useCallback((year: number) => {
    const c = scrollRef.current; if (!c) return;
    const idx = years.indexOf(year); if (idx === -1) return;
    c.scrollTo({ left: Math.max(0, idx * COL_W + 60 - c.clientWidth / 2 + COL_W / 2), behavior: 'smooth' });
  }, [years]);

  useEffect(() => {
    if (!loading && !scrolledToNow.current && years.includes(NOW_YEAR)) {
      scrolledToNow.current = true;
      setTimeout(() => scrollToYear(NOW_YEAR), 300);
    }
  }, [loading, years, scrollToYear]);

  // Wheel → horizontal
  useEffect(() => {
    const c = scrollRef.current; if (!c) return;
    const h = (e: WheelEvent) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); c.scrollLeft += e.deltaY; } };
    c.addEventListener('wheel', h, { passive: false });
    return () => c.removeEventListener('wheel', h);
  }, []);

  // Drag
  const onDown = useCallback((e: React.MouseEvent) => {
    const c = scrollRef.current; if (!c) return;
    setIsDragging(true); dragStart.current = { x: e.pageX, sl: c.scrollLeft };
  }, []);
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const c = scrollRef.current; if (!c) return;
    c.scrollLeft = dragStart.current.sl - (e.pageX - dragStart.current.x);
  }, [isDragging]);
  const onUp = useCallback(() => { setIsDragging(false); dragStart.current = null; }, []);

  const handleStatus = useCallback((k: TimelineStatus | 'all') => {
    setStatusFilter(k);
    if (k === 'all') return;
    for (const [y, ents] of yearGroups) { if (ents.some((e) => e.status === k)) { setTimeout(() => scrollToYear(y), 100); return; } }
  }, [yearGroups, scrollToYear]);

  const handleIndustry = useCallback((ind: string | null) => {
    setIndustryFilter(ind);
    if (!ind) return;
    for (const [y, ents] of yearGroups) { if (ents.some((e) => e.industries.includes(ind))) { setTimeout(() => scrollToYear(y), 100); return; } }
  }, [yearGroups, scrollToYear]);

  const totalW = yearGroups.length * COL_W + 120;
  const nowIdx = years.indexOf(NOW_YEAR);
  const nowPx = nowIdx >= 0 ? 60 + nowIdx * COL_W + COL_W / 2 : totalW / 2;

  return (
    <main className="h-screen bg-black flex flex-col relative overflow-hidden">
      <PageTopBar backHref="/" backLabel="HOME"
        breadcrumbs={[{ label: 'NXT//LINK', href: '/' }, { label: 'TIMELINE' }]}
        rightSlot={
          <div className="flex items-center gap-3">
            {loading && <span className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/40 animate-pulse">FETCHING</span>}
            {!loading && isLive && (
              <span className="flex items-center gap-1.5">
                <span className="relative block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }}>
                  <span className="absolute inset-[-2px] rounded-full animate-ping" style={{ backgroundColor: '#00ff88', opacity: 0.35 }} />
                </span>
                <span className="font-mono text-[8px] tracking-[0.25em]" style={{ color: '#00ff88' }}>LIVE · {liveCount}</span>
              </span>
            )}
            <span className="font-mono text-[8px] tracking-[0.2em] text-white/20">{timeline.length} EVENTS</span>
          </div>
        }
      />

      {/* Filters */}
      <div className="relative z-10 px-4 sm:px-6 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-1 mb-3">
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => handleStatus(f.key)}
              className={`font-mono text-[9px] tracking-[0.25em] uppercase px-3 py-1.5 border rounded-sm transition-all duration-200 ${
                statusFilter === f.key ? 'border-[#00d4ff]/50 text-[#00d4ff] bg-[#00d4ff]/[0.06]' : 'border-white/[0.06] text-white/25 hover:text-white/40'
              }`}>{f.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => handleIndustry(null)}
            className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm border transition-all ${
              !industryFilter ? 'border-[#00d4ff]/40 text-[#00d4ff]/70 bg-[#00d4ff]/[0.05]' : 'border-white/[0.06] text-white/20'
            }`}>ALL</button>
          {allIndustries.map((ind) => (
            <button key={ind} onClick={() => handleIndustry(industryFilter === ind ? null : ind)}
              className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm border transition-all ${
                industryFilter === ind ? 'border-[#00d4ff]/40 text-[#00d4ff]/70 bg-[#00d4ff]/[0.05]' : 'border-white/[0.06] text-white/20'
              }`}>{ind}</button>
          ))}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="relative flex-1 min-h-0">
        {/* Edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none" style={{ background: 'linear-gradient(to right, #0a0a18, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none" style={{ background: 'linear-gradient(to left, #0a0a18, transparent)' }} />

        <div ref={scrollRef} className="timeline-scroll h-full overflow-x-auto overflow-y-hidden"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', scrollSnapType: 'x proximity' }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
          <div className="relative h-full" style={{ width: totalW, minHeight: '100%' }}>
            {/* Scan line */}
            <div className="timeline-scan-line" />

            {/* Wire */}
            <div className="absolute left-0 right-0" style={{ top: '32%', height: 1 }}>
              <div className="absolute top-0 left-0 h-px" style={{ width: nowPx, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.12) 10%, rgba(0,212,255,0.2))' }} />
              <div className="absolute top-0 h-px" style={{ left: nowPx, right: 0, background: 'repeating-linear-gradient(90deg, rgba(0,212,255,0.18) 0px, rgba(0,212,255,0.18) 8px, transparent 8px, transparent 14px)' }} />
              <div className="absolute top-[-1px] left-0 right-0 timeline-wire-pulse" />
            </div>

            {/* NOW marker */}
            {nowIdx >= 0 && (
              <div className="absolute z-30" style={{ left: nowPx, top: '32%' }}>
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="absolute" style={{ width: 180, height: 100, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse, rgba(0,212,255,0.1) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
                  <span className="absolute" style={{ width: 24, height: 24, top: '50%', left: '50%', borderRadius: '50%', border: '1px solid rgba(0,212,255,0.4)', animation: 'now-radiate 3s ease-out infinite' }} />
                  <span className="absolute" style={{ width: 24, height: 24, top: '50%', left: '50%', borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)', animation: 'now-radiate 3s ease-out 1.5s infinite' }} />
                  <span className="relative block w-3 h-3 rounded-full z-10" style={{ backgroundColor: '#00d4ff', boxShadow: '0 0 12px #00d4ffcc, 0 0 28px #00d4ff55' }} />
                  <span className="font-mono text-[8px] tracking-[0.35em] mt-2 z-10" style={{ color: '#00d4ff', textShadow: '0 0 8px rgba(0,212,255,0.6)' }}>NOW</span>
                </div>
              </div>
            )}

            {/* Year columns */}
            <div className="absolute inset-0 flex" style={{ paddingLeft: 60, paddingRight: 60 }}>
              {yearGroups.map(([year, entries]) => {
                const isNow = year === NOW_YEAR;
                const isPast = year < NOW_YEAR;
                return (
                  <div key={year} className="relative shrink-0" style={{ width: COL_W, scrollSnapAlign: 'start' }}>
                    {/* Year label */}
                    <div className="absolute flex flex-col items-center" style={{ top: '32%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="w-px mb-1" style={{ height: isNow ? 14 : 10, marginTop: isNow ? -14 : -10, background: isNow ? '#00d4ff' : isPast ? 'rgba(255,255,255,0.15)' : 'rgba(0,212,255,0.25)' }} />
                      <span className="font-mono tracking-[0.3em] mt-1" style={{ fontSize: isNow ? 11 : 9, color: isNow ? '#00d4ff' : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(0,212,255,0.45)', textShadow: isNow ? '0 0 10px rgba(0,212,255,0.5)' : 'none', fontWeight: isNow ? 600 : 400 }}>
                        {year}
                      </span>
                    </div>

                    {/* Event nodes */}
                    {entries.map((entry, eIdx) => {
                      const uid = entry.uid ?? `${entry.year}-${entry.title}`;
                      const dimmed = !matches(entry) && (statusFilter !== 'all' || industryFilter !== null);
                      const dotColor = entry.isLive
                        ? entry.liveBadge === 'RISK' ? severityColor(entry.badgeSeverity) : entry.liveBadge === 'CONVERGENCE' ? '#00d4ff' : '#00ff88'
                        : entry.status === 'present' ? '#00d4ff' : entry.status === 'future' ? '#00d4ff' : 'rgba(255,255,255,0.30)';
                      const pulsing = entry.status === 'present' || (entry.isLive && entry.liveBadge === 'LIVE');
                      const isFut = entry.status === 'future';
                      const count = entries.length;
                      const spread = Math.min(count - 1, 4) * 30;
                      const offX = count > 1 ? -spread / 2 + eIdx * (spread / Math.max(count - 1, 1)) : 0;

                      return (
                        <div key={uid} className="absolute flex flex-col items-center"
                          style={{ top: '32%', left: `calc(50% + ${offX}px)`, transform: 'translateX(-50%)' }}>
                          {/* Dot */}
                          <div className={`relative z-20 ${dimmed ? 'opacity-[0.15]' : ''}`} style={{ marginTop: -5 }}>
                            {pulsing && !dimmed && <span className="absolute inset-[-3px] rounded-full animate-ping" style={{ backgroundColor: dotColor, opacity: 0.25 }} />}
                            <span className={`relative block w-[10px] h-[10px] rounded-full ${isFut ? 'border border-dashed' : ''} ${pulsing && !dimmed ? 'timeline-node-pulse' : ''}`}
                              style={{ backgroundColor: isFut ? 'transparent' : dotColor, borderColor: isFut ? `${dotColor}60` : undefined, color: dotColor, boxShadow: pulsing && !dimmed ? `0 0 8px ${dotColor}aa` : isFut ? 'none' : `0 0 4px ${dotColor}60` }} />
                          </div>
                          {/* Connector */}
                          <div className={`w-px ${dimmed ? 'opacity-[0.15]' : ''}`} style={{ height: 28, background: `linear-gradient(to bottom, ${dotColor}40, ${dotColor}10)` }} />
                          {/* Card */}
                          <Card entry={entry} expanded={expandedUid === uid} onToggle={() => setExpandedUid(expandedUid === uid ? null : uid)} dimmed={dimmed} />
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

      <footer className="relative z-10 py-3 text-center border-t border-white/[0.04] shrink-0">
        <span className="font-mono text-[7px] tracking-[0.35em] text-white/10 uppercase">NXT//LINK · TIMELINE · SCROLL TO EXPLORE</span>
      </footer>
    </main>
  );
}
