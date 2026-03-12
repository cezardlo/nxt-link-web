'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreatLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
type AgentStatus = 'active' | 'idle' | 'error';
type TrendDir = 'rising' | 'stable' | 'falling';

interface SectorBlock {
  id: string;
  label: string;
  color: string;
  score: number;
  trend: TrendDir;
  articleCount: number;
}

interface SignalItem {
  id: string;
  timestamp: string;
  title: string;
  priority: 'critical' | 'high' | 'elevated' | 'normal';
  sector: string;
  type: string;
}

interface AgentCard {
  id: string;
  name: string;
  status: AgentStatus;
  lastRun: string;
  runsToday: number;
  detail: string;
}

interface AnomalyAlert {
  id: string;
  title: string;
  detail: string;
  severity: 'critical' | 'high';
  ts: string;
}

interface UpcomingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  sector: string;
  daysAway: number;
}

interface DigestFinding {
  id: string;
  heading: string;
  body: string;
  tag: string;
  color: string;
}

interface TimelineBlock {
  agentId: string;
  color: string;
  hour: number;
  width: number; // % of hour-slot
}

// ─── Static fallback data ─────────────────────────────────────────────────────

const FALLBACK_SECTORS: SectorBlock[] = [
  { id: 'defense',       label: 'DEFENSE',       color: '#00d4ff', score: 82, trend: 'rising',  articleCount: 34 },
  { id: 'ai_ml',         label: 'AI / ML',        color: '#a855f7', score: 76, trend: 'rising',  articleCount: 51 },
  { id: 'cybersecurity', label: 'CYBERSECURITY',  color: '#ff3b30', score: 63, trend: 'stable',  articleCount: 28 },
  { id: 'energy',        label: 'ENERGY',         color: '#ffd700', score: 48, trend: 'falling', articleCount: 17 },
  { id: 'supply_chain',  label: 'SUPPLY CHAIN',   color: '#f97316', score: 71, trend: 'rising',  articleCount: 22 },
  { id: 'manufacturing', label: 'MANUFACTURING',  color: '#00ff88', score: 55, trend: 'stable',  articleCount: 19 },
];

const FALLBACK_SIGNALS: SignalItem[] = [
  { id: 's1', timestamp: '14:32:07', title: 'Fort Bliss IDIQ task order — $18.4M IT modernization', priority: 'critical', sector: 'DEFENSE', type: 'contract_alert' },
  { id: 's2', timestamp: '14:28:51', title: 'CISA advisory: critical infrastructure CVE-2026-1147', priority: 'high',     sector: 'CYBER',   type: 'security_impact' },
  { id: 's3', timestamp: '14:21:03', title: 'NxtLogix Systems cited across 4 distinct sources',       priority: 'elevated', sector: 'AI/ML',   type: 'vendor_mention' },
  { id: 's4', timestamp: '14:15:44', title: 'Border tech sector velocity spike — 3× hourly average', priority: 'elevated', sector: 'SUPPLY',  type: 'velocity_spike' },
  { id: 's5', timestamp: '14:09:22', title: 'Army Futures Command convergence: 5 tiers aligned',     priority: 'high',     sector: 'DEFENSE', type: 'convergence' },
  { id: 's6', timestamp: '14:02:11', title: 'DoE grid modernization RFP — $6.2M addressable',        priority: 'elevated', sector: 'ENERGY',  type: 'contract_alert' },
  { id: 's7', timestamp: '13:58:34', title: 'UTEP AI Lab NSF grant expansion confirmed',             priority: 'normal',   sector: 'AI/ML',   type: 'sector_spike' },
  { id: 's8', timestamp: '13:44:17', title: 'CBP staffing gap — Bridge of Americas throughput down', priority: 'high',     sector: 'SUPPLY',  type: 'security_impact' },
];

const AGENTS: AgentCard[] = [
  { id: 'feed',    name: 'FEED AGENT',    status: 'active', lastRun: '2m ago',  runsToday: 288, detail: '15 RSS feeds · 5min cycle' },
  { id: 'signal',  name: 'SIGNAL ENGINE', status: 'active', lastRun: '2m ago',  runsToday: 144, detail: '6 detectors · Jaccard 0.3' },
  { id: 'vendor',  name: 'VENDOR INTEL',  status: 'active', lastRun: '14m ago', runsToday:  96, detail: '98 tracked entities' },
  { id: 'product', name: 'PRODUCT SCAN',  status: 'idle',   lastRun: '1h ago',  runsToday:  24, detail: 'Product database sync' },
  { id: 'sources', name: 'SOURCE MGR',    status: 'active', lastRun: '5m ago',  runsToday: 192, detail: '200,000+ indexed sources' },
  { id: 'docs',    name: 'DOC PARSER',    status: 'idle',   lastRun: '3h ago',  runsToday:   8, detail: 'SAM + contract filings' },
];

const FALLBACK_FINDINGS: DigestFinding[] = [
  {
    id: 'f1',
    heading: 'Fort Bliss Defense Corridor Accelerating',
    body: 'DoD procurement volume up 23% QoQ. Three new IDIQ vehicles open for El Paso-area vendors. Army Futures Command designating EP MSA as Tier 1 technology hub.',
    tag: 'DEFENSE',
    color: '#00d4ff',
  },
  {
    id: 'f2',
    heading: 'Nearshoring Surge Driving Border Tech Demand',
    body: 'USMCA compliance technology gap identified at $120M+ addressable market. CBP modernization RFP expected Q2 2026. Cross-border logistics platform vendors gaining traction.',
    tag: 'SUPPLY CHAIN',
    color: '#f97316',
  },
  {
    id: 'f3',
    heading: 'AI / ML Sector at 5-Year Signal High',
    body: 'UTEP AI Research Lab NSF expansion confirmed. Three EP-based AI vendors in active DoD evaluation. Sector velocity 3.1× above 90-day baseline — convergence detected.',
    tag: 'AI / ML',
    color: '#a855f7',
  },
];

const FALLBACK_ANOMALIES: AnomalyAlert[] = [
  {
    id: 'a1',
    title: 'VELOCITY ANOMALY — CYBERSECURITY',
    detail: 'Publication rate 4.2× above hourly baseline. Possible emerging incident. 3 sources converging on CVE-2026-1147.',
    severity: 'critical',
    ts: '14:31',
  },
  {
    id: 'a2',
    title: 'FEED LATENCY SPIKE',
    detail: 'DoD News RSS lag 8min above normal. Possible source disruption. Fallback tier 2 sources active.',
    severity: 'high',
    ts: '14:19',
  },
];

const FALLBACK_EVENTS: UpcomingEvent[] = [
  { id: 'e1', name: 'AUSA Annual Meeting 2026',         date: '2026-03-18', location: 'Washington, DC', sector: 'DEFENSE',    daysAway: 10 },
  { id: 'e2', name: 'RSA Conference 2026',              date: '2026-04-28', location: 'San Francisco',  sector: 'CYBER',      daysAway: 51 },
  { id: 'e3', name: 'Border Security Expo 2026',        date: '2026-05-05', location: 'El Paso, TX',    sector: 'SUPPLY',     daysAway: 58 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUtc(): string {
  return new Date().toISOString().slice(11, 19) + ' UTC';
}

function formatLocal(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function threatColor(level: ThreatLevel): string {
  switch (level) {
    case 'LOW':      return '#00ff88';
    case 'ELEVATED': return '#ffb800';
    case 'HIGH':     return '#f97316';
    case 'CRITICAL': return '#ff3b30';
  }
}

function priorityColor(p: string): string {
  switch (p) {
    case 'critical': return '#ff3b30';
    case 'high':     return '#f97316';
    case 'elevated': return '#ffb800';
    default:         return '#6b7280';
  }
}

function agentStatusColor(s: AgentStatus): string {
  switch (s) {
    case 'active': return '#00ff88';
    case 'idle':   return '#ffb800';
    case 'error':  return '#ff3b30';
  }
}

function trendArrow(t: TrendDir): string {
  switch (t) {
    case 'rising':  return '▲';
    case 'falling': return '▼';
    default:        return '▶';
  }
}

function trendColor(t: TrendDir): string {
  switch (t) {
    case 'rising':  return '#00ff88';
    case 'falling': return '#ff3b30';
    default:        return '#6b7280';
  }
}

// ─── API response types ───────────────────────────────────────────────────────

interface IntelSignalsResponse {
  ok: boolean;
  signals?: Array<{
    id: string;
    type: string;
    priority: string;
    title: string;
    sectorLabel?: string;
    detectedAt: string;
  }>;
  sectorScores?: Array<{
    id: string;
    label: string;
    color: string;
    score: number;
    trend: TrendDir;
    articleCount: number;
  }>;
}

interface FeedsResponse {
  all?: Array<{ id: string; category: string }>;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function LiveDot({ color = '#00ff88', size = 6 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color, boxShadow: `0 0 6px ${color}cc` }}
      />
    </span>
  );
}

function SectionHeader({ label, accent = '#00d4ff', right }: { label: string; accent?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-0.5 h-3 rounded-full" style={{ backgroundColor: accent }} />
        <span className="font-mono text-[8px] tracking-[0.25em] uppercase" style={{ color: accent }}>{label}</span>
      </div>
      {right && <div className="font-mono text-[7px] text-white/25">{right}</div>}
    </div>
  );
}

// ─── Network Pulse (concentric rings) ────────────────────────────────────────

function NetworkPulse() {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.012) 3px, rgba(0,212,255,0.012) 4px)',
        }}
      />

      {/* Concentric rings */}
      <div className="relative flex items-center justify-center" style={{ width: 360, height: 360 }}>
        {/* Ring 4 — outermost */}
        <div
          className="absolute rounded-full border border-[#00d4ff]/10"
          style={{
            width: 340, height: 340,
            animation: 'spin 60s linear infinite',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-mono text-[7px] tracking-[0.3em] text-[#00d4ff]/30 absolute"
              style={{ top: 4, transform: 'translateX(-50%)', left: '50%' }}
            >
              12 SECTORS
            </span>
          </div>
        </div>

        {/* Ring 3 */}
        <div
          className="absolute rounded-full border border-[#a855f7]/15"
          style={{
            width: 270, height: 270,
            animation: 'spin 40s linear infinite reverse',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-mono text-[7px] tracking-[0.3em] text-[#a855f7]/35 absolute"
              style={{ top: 4, transform: 'translateX(-50%)', left: '50%' }}
            >
              959 CONFERENCES
            </span>
          </div>
        </div>

        {/* Ring 2 */}
        <div
          className="absolute rounded-full border border-[#00ff88]/15"
          style={{
            width: 200, height: 200,
            animation: 'spin 28s linear infinite',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-mono text-[7px] tracking-[0.3em] text-[#00ff88]/35 absolute"
              style={{ top: 4, transform: 'translateX(-50%)', left: '50%' }}
            >
              98 VENDORS
            </span>
          </div>
        </div>

        {/* Ring 1 — innermost rotating */}
        <div
          className="absolute rounded-full border border-[#ffd700]/20"
          style={{
            width: 140, height: 140,
            animation: 'spin 18s linear infinite reverse',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-mono text-[6px] tracking-[0.25em] text-[#ffd700]/40 absolute"
              style={{ top: 3, transform: 'translateX(-50%)', left: '50%' }}
            >
              73,526 SOURCES
            </span>
          </div>
        </div>

        {/* Radar ping rings — expand outward */}
        <div
          className="absolute rounded-full border border-[#00d4ff]/20 radar-ring"
          style={{ width: 80, height: 80 }}
        />
        <div
          className="absolute rounded-full border border-[#00d4ff]/15 radar-ring"
          style={{ width: 80, height: 80, animationDelay: '1.2s' }}
        />
        <div
          className="absolute rounded-full border border-[#00d4ff]/10 radar-ring"
          style={{ width: 80, height: 80, animationDelay: '2.4s' }}
        />

        {/* Center node */}
        <div className="relative z-10 flex flex-col items-center justify-center" style={{ width: 88, height: 88 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.04) 60%, transparent 100%)',
              boxShadow: '0 0 32px rgba(0,212,255,0.15)',
            }}
          />
          <span
            className="font-mono text-[9px] tracking-[0.15em] relative z-10"
            style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.8)' }}
          >
            NXT
          </span>
          <span
            className="font-mono text-[9px] tracking-[0.15em] relative z-10"
            style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.8)' }}
          >
            {'//LINK'}
          </span>
          <div className="mt-1 relative z-10">
            <LiveDot color="#00ff88" size={5} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

function ActivityTimeline() {
  const agentColors: Record<string, string> = {
    feed:    '#00d4ff',
    signal:  '#a855f7',
    vendor:  '#00ff88',
    product: '#ffd700',
    sources: '#f97316',
    docs:    '#ffb800',
  };

  // Generate pseudo-timeline blocks for last 24h (static representative data)
  const blocks: TimelineBlock[] = [];
  const agents = ['feed', 'signal', 'vendor', 'product', 'sources', 'docs'];
  const runsPerAgent: Record<string, number[]> = {
    feed:    [0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    signal:  [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    vendor:  [0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
    product: [0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0],
    sources: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    docs:    [0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],
  };

  agents.forEach((agentId) => {
    const hourArr = runsPerAgent[agentId] ?? [];
    hourArr.forEach((active, hour) => {
      if (active) {
        blocks.push({
          agentId,
          color: agentColors[agentId] ?? '#ffffff',
          hour,
          width: 85,
        });
      }
      // Small secondary runs
      if (agentId === 'feed' && hour % 2 === 0) {
        blocks.push({ agentId, color: agentColors[agentId] ?? '#ffffff', hour: hour + 0.5, width: 40 });
      }
    });
  });

  const HOUR_W = 100 / 24; // % per hour on the timeline

  return (
    <div className="flex-1 flex flex-col gap-1 overflow-hidden px-3">
      {/* Hour labels */}
      <div className="flex relative" style={{ height: 10 }}>
        {[0,4,8,12,16,20,23].map((h) => (
          <span
            key={h}
            className="absolute font-mono text-[7px] text-white/20 tabular-nums"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {String(h).padStart(2,'0')}h
          </span>
        ))}
        <span className="absolute right-0 font-mono text-[7px] text-white/20">NOW</span>
      </div>

      {/* Agent rows */}
      {Object.entries(agentColors).map(([agentId, color]) => (
        <div key={agentId} className="flex items-center gap-2" style={{ height: 10 }}>
          <span className="font-mono text-[6px] tracking-[0.15em] text-white/25 w-12 shrink-0 text-right">
            {agentId.toUpperCase()}
          </span>
          <div className="flex-1 relative h-[6px] bg-white/[0.03] rounded-full overflow-hidden">
            {/* Background track */}
            <div className="absolute inset-0 rounded-full" style={{ background: `${color}08` }} />
            {/* Activity blocks */}
            {blocks.filter((b) => b.agentId === agentId).map((b, i) => (
              <div
                key={i}
                className="absolute h-full rounded-sm"
                style={{
                  left:  `${(b.hour / 24) * 100}%`,
                  width: `${(HOUR_W * b.width) / 100}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 4px ${color}88`,
                  opacity: 0.75,
                }}
              />
            ))}
            {/* Current time marker */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/40"
              style={{ right: 0 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// Agent endpoint map — which API route each agent triggers
const AGENT_ENDPOINTS: Record<string, string> = {
  feed:     '/api/feeds',
  signal:   '/api/intel-signals',
  vendor:   '/api/agents/vendor-discovery',
  product:  '/api/agents/product-scanner',
  sources:  '/api/agents/quality-sources',
  docs:     '/api/agents/docs-sync',
  cron:     '/api/agents/cron',
  discover: '/api/agents/auto-discover',
  enrich:   '/api/agents/enrich-entity',
};

export default function CommandCenterPage() {
  const [utcTime, setUtcTime]         = useState(formatUtc());
  const [localTime, setLocalTime]     = useState(formatLocal());
  const [threatLevel]                 = useState<ThreatLevel>('ELEVATED');
  const [activeSessions]              = useState(3);
  const [sectors, setSectors]         = useState<SectorBlock[]>(FALLBACK_SECTORS);
  const [signals, setSignals]         = useState<SignalItem[]>(FALLBACK_SIGNALS);
  const [findings]                    = useState<DigestFinding[]>(FALLBACK_FINDINGS);
  const [anomalies]                   = useState<AnomalyAlert[]>(FALLBACK_ANOMALIES);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_events]                      = useState<UpcomingEvent[]>(FALLBACK_EVENTS);
  const [feedCount, setFeedCount]     = useState(0);
  const [agents, setAgents]           = useState<AgentCard[]>(AGENTS);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pulsePhase, setPulsePhase]   = useState(0);
  const [triggeringAgent, setTriggeringAgent] = useState<string | null>(null);
  const [triggerResult, setTriggerResult]     = useState<{ agent: string; ok: boolean } | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // ── Live clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setUtcTime(formatUtc());
      setLocalTime(formatLocal());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Sine wave pulse phase ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      setPulsePhase(((ts - startRef.current) % 2000) / 2000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [signalsRes, feedsRes, runsRes] = await Promise.allSettled([
        fetch('/api/intel-signals').then((r) => r.json()) as Promise<IntelSignalsResponse>,
        fetch('/api/feeds').then((r) => r.json()) as Promise<FeedsResponse>,
        fetch('/api/agents/runs').then((r) => r.json()) as Promise<{
          runs?: Array<{ agent_type: string; status: string; created_at: string; completed_at?: string }>;
        }>,
      ]);

      if (signalsRes.status === 'fulfilled' && signalsRes.value.ok) {
        const data = signalsRes.value;
        if (data.sectorScores && data.sectorScores.length > 0) {
          setSectors(
            data.sectorScores.map((s) => ({
              id:           s.id,
              label:        s.label,
              color:        s.color,
              score:        s.score,
              trend:        s.trend,
              articleCount: s.articleCount,
            })),
          );
        }
        if (data.signals && data.signals.length > 0) {
          setSignals(
            data.signals.slice(0, 8).map((s) => ({
              id:        s.id,
              timestamp: new Date(s.detectedAt).toISOString().slice(11, 19),
              title:     s.title,
              priority:  s.priority as SignalItem['priority'],
              sector:    s.sectorLabel ?? 'GENERAL',
              type:      s.type,
            })),
          );
        }
      }

      if (feedsRes.status === 'fulfilled' && feedsRes.value.all) {
        setFeedCount(feedsRes.value.all.length);
      }

      // Wire real agent run data to agent cards
      if (runsRes.status === 'fulfilled' && runsRes.value.runs && runsRes.value.runs.length > 0) {
        const runs = runsRes.value.runs;
        // Group by agent type, find most recent run per agent
        const latestByType = new Map<string, { status: string; created_at: string }>();
        for (const run of runs) {
          const existing = latestByType.get(run.agent_type);
          if (!existing || run.created_at > existing.created_at) {
            latestByType.set(run.agent_type, run);
          }
        }
        const runsToday = (agentType: string): number =>
          runs.filter((r) => r.agent_type === agentType &&
            new Date(r.created_at).toDateString() === new Date().toDateString()
          ).length;
        const timeAgo = (iso: string): string => {
          const diffMs = Date.now() - new Date(iso).getTime();
          const mins = Math.floor(diffMs / 60000);
          if (mins < 1) return 'just now';
          if (mins < 60) return `${mins}m ago`;
          return `${Math.floor(mins / 60)}h ago`;
        };
        setAgents(prev => prev.map((card) => {
          const run = latestByType.get(card.id);
          if (!run) return card;
          const status: AgentStatus = run.status === 'completed' ? 'active'
            : run.status === 'failed' ? 'error' : 'idle';
          return {
            ...card,
            status,
            lastRun: timeAgo(run.created_at),
            runsToday: runsToday(card.id),
          };
        }));
      }

      setLastRefresh(new Date());
    } catch {
      // silently fall through to static data
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => { void fetchData(); }, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Manual agent trigger ─────────────────────────────────────────────────────
  const triggerAgent = useCallback(async (agentId: string) => {
    const endpoint = AGENT_ENDPOINTS[agentId];
    if (!endpoint || triggeringAgent) return;
    setTriggeringAgent(agentId);
    try {
      const method = agentId === 'feed' || agentId === 'signal' ? 'GET' : 'POST';
      const res = await fetch(endpoint, { method });
      setTriggerResult({ agent: agentId, ok: res.ok });
      if (res.ok) {
        setAgents(prev => prev.map(a => a.id === agentId
          ? { ...a, status: 'active', lastRun: 'just now' }
          : a,
        ));
        void fetchData();
      }
    } catch {
      setTriggerResult({ agent: agentId, ok: false });
    } finally {
      setTriggeringAgent(null);
      setTimeout(() => setTriggerResult(null), 4000);
    }
  }, [triggeringAgent, fetchData]);

  // ── Heartbeat wave path (SVG) ────────────────────────────────────────────────
  const heartbeatPath = (() => {
    const W = 160;
    const H = 20;
    const mid = H / 2;
    // Generate a pseudo-heartbeat-style path based on current phase
    const phase = pulsePhase * Math.PI * 2;
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 4) {
      const t = (x / W) * Math.PI * 4 + phase;
      // Combine sine + spike shape
      const spike = Math.abs(Math.sin(t * 2)) > 0.85 ? -Math.sin(t * 2) * 8 : 0;
      const y = mid + Math.sin(t) * 3 + spike;
      pts.push(`${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  })();

  const tColor = threatColor(threatLevel);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ fontFamily: 'inherit' }}>
      {/* Scanline overlay — full viewport */}
      <div
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.007) 3px, rgba(0,212,255,0.007) 4px)',
        }}
      />

      {/* ── PageTopBar ─────────────────────────────────────────────────────────── */}
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'COMMAND CENTER' }]}
        showLiveDot
        rightSlot={
          <Link
            href="/map"
            className="font-mono text-[8px] tracking-[0.2em] text-white/30 hover:text-[#00d4ff] transition-colors border border-white/10 hover:border-[#00d4ff]/30 px-2 py-1 rounded-sm"
          >
            OPEN MAP
          </Link>
        }
      />

      {/* ── TOP STATUS STRIP ──────────────────────────────────────────────────── */}
      <div className="h-8 bg-black/92 border-b border-white/[0.06] flex items-center px-3 gap-4 shrink-0 overflow-hidden">
        {/* System clock */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/25">SYS</span>
          <span className="font-mono text-[9px] tabular-nums text-[#00d4ff]" style={{ textShadow: '0 0 8px rgba(0,212,255,0.5)' }}>
            {utcTime}
          </span>
          <span className="font-mono text-[7px] text-white/20">/</span>
          <span className="font-mono text-[9px] tabular-nums text-white/50">{localTime} MST</span>
        </div>

        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Threat level */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/25">THREAT</span>
          <div
            className="px-2 py-0.5 rounded-sm font-mono text-[7px] tracking-[0.2em]"
            style={{
              color: tColor,
              border: `1px solid ${tColor}40`,
              backgroundColor: `${tColor}10`,
              boxShadow: `0 0 8px ${tColor}30`,
              animation: 'threat-pulse 2s ease-in-out infinite',
            }}
          >
            {threatLevel}
          </div>
          <span
            className="w-1.5 h-1.5 rounded-full live-pulse"
            style={{ backgroundColor: tColor, boxShadow: `0 0 6px ${tColor}cc` }}
          />
        </div>

        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Platform heartbeat */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/25">PULSE</span>
          <svg width={160} height={20} className="overflow-visible">
            <path
              d={heartbeatPath}
              fill="none"
              stroke="#00d4ff"
              strokeWidth={1.2}
              opacity={0.7}
              style={{ filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.6))' }}
            />
          </svg>
        </div>

        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Active sessions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/25">SESSIONS</span>
          <span className="font-mono text-[9px] tabular-nums text-[#00ff88]">{activeSessions}</span>
          <span className="font-mono text-[7px] text-white/20">ACTIVE</span>
        </div>

        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Feed count */}
        {feedCount > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[7px] tracking-[0.2em] text-white/25">ITEMS</span>
            <span className="font-mono text-[9px] tabular-nums text-[#ffd700]">{feedCount}</span>
            <span className="font-mono text-[7px] text-white/20">IN FEED</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Data freshness */}
        <div className="flex items-center gap-1.5 shrink-0">
          <LiveDot color="#00ff88" size={5} />
          <span className="font-mono text-[7px] tracking-[0.15em] text-[#00ff88]/60">
            {lastRefresh
              ? `REFRESHED ${lastRefresh.toISOString().slice(11, 16)} UTC`
              : 'LOADING…'}
          </span>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN AREA ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden">

          {/* SECTOR HEATMAP */}
          <div className="shrink-0">
            <SectionHeader label="SECTOR HEATMAP" accent="#00d4ff" right={`${sectors.length} SECTORS`} />
            <div className="p-2 grid grid-cols-2 gap-1.5">
              {sectors.map((s) => (
                <div
                  key={s.id}
                  className="relative rounded-sm p-2 overflow-hidden cursor-default group transition-all duration-150"
                  style={{
                    background: `linear-gradient(135deg, ${s.color}12 0%, ${s.color}05 100%)`,
                    border: `1px solid ${s.color}20`,
                  }}
                >
                  {/* Score fill bar */}
                  <div
                    className="absolute bottom-0 left-0 h-0.5 rounded-b-sm transition-all duration-500"
                    style={{ width: `${s.score}%`, backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}88` }}
                  />
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-sm"
                    style={{ background: `${s.color}08` }}
                  />
                  <div className="relative z-10">
                    <div className="font-mono text-[7px] tracking-[0.2em] text-white/40 mb-1">{s.label}</div>
                    <div className="flex items-end justify-between">
                      <span
                        className="font-mono text-lg tabular-nums leading-none"
                        style={{ color: s.color, textShadow: `0 0 10px ${s.color}60` }}
                      >
                        {s.score}
                      </span>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-[8px]" style={{ color: trendColor(s.trend) }}>
                          {trendArrow(s.trend)}
                        </span>
                        <span className="font-mono text-[6px] text-white/25 tabular-nums">
                          {s.articleCount} art
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="divider-glow mx-3" />

          {/* ACTIVE SIGNALS */}
          <div className="flex flex-col min-h-0 flex-1">
            <SectionHeader label="ACTIVE SIGNALS" accent="#f97316" right={`${signals.length} DETECTED`} />
            <div className="overflow-y-auto scrollbar-thin flex-1">
              {signals.map((sig) => {
                const pc = priorityColor(sig.priority);
                return (
                  <div
                    key={sig.id}
                    className="px-3 py-2 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-default"
                  >
                    <div className="flex items-start gap-2">
                      {/* Priority dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 live-pulse"
                        style={{ backgroundColor: pc, boxShadow: `0 0 5px ${pc}cc` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[8px] text-white/70 leading-snug line-clamp-2">{sig.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[6px] tabular-nums text-white/20">{sig.timestamp}</span>
                          <span
                            className="font-mono text-[6px] tracking-[0.15em] px-1 py-0.5 rounded-sm"
                            style={{ color: pc, backgroundColor: `${pc}12`, border: `1px solid ${pc}25` }}
                          >
                            {sig.priority.toUpperCase()}
                          </span>
                          <span className="font-mono text-[6px] text-white/20 truncate">{sig.sector}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {signals.length === 0 && (
                <div className="p-4 text-center font-mono text-[8px] text-white/20">
                  <div className="loading-dots"><span /><span /><span /></div>
                  <div className="mt-2">WARMING SIGNAL ENGINE</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Network Pulse visualization */}
          <NetworkPulse />

          <div className="divider-glow mx-4" />

          {/* Intelligence digest */}
          <div className="shrink-0 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-0.5 h-3 rounded-full bg-[#ffd700]" />
              <span className="font-mono text-[8px] tracking-[0.25em] text-[#ffd700]">INTELLIGENCE DIGEST</span>
              <span className="font-mono text-[7px] text-white/20">— KEY FINDINGS</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {findings.map((f, i) => (
                <div
                  key={f.id}
                  className="rounded-sm p-3 relative overflow-hidden slide-up"
                  style={{
                    background: `linear-gradient(135deg, ${f.color}0a 0%, ${f.color}04 100%)`,
                    border: `1px solid ${f.color}18`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.color}60, transparent)` }}
                  />
                  <div className="font-mono text-[6px] tracking-[0.2em] mb-1.5" style={{ color: f.color }}>
                    {f.tag}
                  </div>
                  <div className="font-mono text-[8px] text-white/70 leading-snug mb-1.5">{f.heading}</div>
                  <div className="font-mono text-[7px] text-white/35 leading-relaxed line-clamp-4">{f.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-l border-white/[0.06] overflow-hidden">

          {/* AGENT STATUS */}
          <div className="shrink-0">
            <SectionHeader
              label="AGENT STATUS"
              accent="#00ff88"
              right={
                <button
                  onClick={() => void triggerAgent('cron')}
                  disabled={!!triggeringAgent}
                  className="font-mono text-[6px] tracking-[0.15em] text-[#00ff88]/60 hover:text-[#00ff88] border border-[#00ff88]/20 hover:border-[#00ff88]/50 px-1.5 py-0.5 rounded-sm transition-colors disabled:opacity-30"
                >
                  {triggeringAgent === 'cron' ? 'RUNNING…' : 'RUN ALL'}
                </button>
              }
            />
            {/* Trigger result toast */}
            {triggerResult && (
              <div
                className="mx-2 mb-1 px-2 py-1 rounded-sm font-mono text-[7px]"
                style={{
                  backgroundColor: triggerResult.ok ? 'rgba(0,255,136,0.08)' : 'rgba(255,59,48,0.08)',
                  border: `1px solid ${triggerResult.ok ? 'rgba(0,255,136,0.2)' : 'rgba(255,59,48,0.2)'}`,
                  color: triggerResult.ok ? '#00ff88' : '#ff3b30',
                }}
              >
                {triggerResult.ok ? `✓ ${triggerResult.agent.toUpperCase()} triggered` : `✗ ${triggerResult.agent.toUpperCase()} failed`}
              </div>
            )}
            <div className="p-2 space-y-1">
              {agents.map((agent) => {
                const sc = agentStatusColor(agent.status);
                const isRunning = triggeringAgent === agent.id;
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-white/[0.02] transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {/* Status dot */}
                    {(agent.status === 'active' || isRunning) ? (
                      <LiveDot color={isRunning ? '#ffb800' : sc} size={6} />
                    ) : (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: sc, boxShadow: `0 0 4px ${sc}88` }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[8px] text-white/60 tracking-[0.1em]">{agent.name}</span>
                        <span className="font-mono text-[6px] tabular-nums text-white/25">{agent.lastRun}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono text-[6px] text-white/20">{agent.detail}</span>
                        <span className="font-mono text-[6px] tabular-nums" style={{ color: sc }}>{agent.runsToday}×</span>
                      </div>
                    </div>
                    {/* Trigger button */}
                    <button
                      onClick={() => void triggerAgent(agent.id)}
                      disabled={!!triggeringAgent}
                      className="shrink-0 font-mono text-[6px] tracking-[0.1em] text-white/20 hover:text-[#00d4ff] border border-white/[0.06] hover:border-[#00d4ff]/30 px-1.5 py-0.5 rounded-sm transition-colors disabled:opacity-20"
                      title={`Trigger ${agent.name}`}
                    >
                      {isRunning ? '…' : '▶'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divider-glow mx-3" />

          {/* ANOMALY ALERTS */}
          <div className="shrink-0">
            <SectionHeader label="ANOMALY ALERTS" accent="#ff3b30" right={`${anomalies.length} ACTIVE`} />
            <div className="p-2 space-y-1.5">
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  className="rounded-sm p-2.5 critical-pulse"
                  style={{
                    background: 'rgba(255,59,48,0.06)',
                    borderLeft: '2px solid rgba(255,59,48,0.5)',
                    borderTop: '1px solid rgba(255,59,48,0.12)',
                    borderRight: '1px solid rgba(255,59,48,0.08)',
                    borderBottom: '1px solid rgba(255,59,48,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[7px] tracking-[0.15em] text-[#ff3b30]">{a.title}</span>
                    <span className="font-mono text-[6px] tabular-nums text-white/25">{a.ts}</span>
                  </div>
                  <div className="font-mono text-[7px] text-white/40 leading-relaxed">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="divider-glow mx-3" />

          {/* UPCOMING EVENTS */}
          <div className="flex-1 flex flex-col min-h-0">
            <SectionHeader label="UPCOMING EVENTS" accent="#a855f7" right="NEXT 3" />
            <div className="p-2 space-y-1.5 overflow-y-auto scrollbar-thin">
              {FALLBACK_EVENTS.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-sm p-2.5 hover:bg-white/[0.02] transition-colors"
                  style={{ border: '1px solid rgba(168,85,247,0.15)', background: 'rgba(168,85,247,0.04)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[8px] text-white/65 leading-snug line-clamp-2 mb-1">{ev.name}</div>
                      <div className="font-mono text-[6px] text-white/30">{ev.location}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className="font-mono text-[10px] tabular-nums font-bold"
                        style={{ color: '#a855f7', textShadow: '0 0 8px rgba(168,85,247,0.5)' }}
                      >
                        T-{ev.daysAway}
                      </div>
                      <div className="font-mono text-[6px] text-white/20">DAYS</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span
                      className="font-mono text-[5px] tracking-[0.15em] px-1 py-0.5 rounded-sm"
                      style={{ color: '#a855f7', backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}
                    >
                      {ev.sector}
                    </span>
                    <span className="font-mono text-[6px] text-white/20">{ev.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM TIMELINE STRIP ─────────────────────────────────────────────── */}
      <div
        className="h-20 shrink-0 border-t border-white/[0.06] bg-black/92 flex flex-col overflow-hidden"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
          <span className="font-mono text-[7px] tracking-[0.25em] text-white/25">ACTIVITY TIMELINE</span>
          <span className="font-mono text-[6px] text-white/15">— AGENT RUNS LAST 24H</span>
          <div className="flex-1" />
          {/* Legend */}
          {[
            { id: 'feed', color: '#00d4ff', label: 'FEED' },
            { id: 'signal', color: '#a855f7', label: 'SIG' },
            { id: 'vendor', color: '#00ff88', label: 'VND' },
            { id: 'sources', color: '#f97316', label: 'SRC' },
          ].map((l) => (
            <div key={l.id} className="flex items-center gap-1">
              <span className="w-2 h-1 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="font-mono text-[6px] text-white/20">{l.label}</span>
            </div>
          ))}
        </div>
        <ActivityTimeline />
        <div className="h-1.5" />
      </div>

      {/* Inline keyframe for rotating rings and threat pulse */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes threat-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}
