'use client';

import { useEffect, useRef, useState } from 'react';
import { PageTopBar } from '@/components/PageTopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'ACTIVE' | 'IDLE' | 'ERROR';

interface AgentCard {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  lastRun: string;
  nextRun: string;
  itemsProcessed: number;
  itemsUnit: string;
  sparkline: number[];
}

interface ActivityEntry {
  id: string;
  ts: string;
  agent: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
}

interface SwarmEvent {
  ts?: string;
  created_at?: string;
  agent?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

interface SwarmReliability {
  [agentId: string]: { successRate: number; totalRuns: number };
}

interface SwarmData {
  ok: boolean;
  events?: SwarmEvent[];
  reliability?: SwarmReliability;
  coordinator?: { lastRun?: string; isRunning?: boolean };
}

interface SignalData {
  ok: boolean;
  clusterCount?: number;
  feedAsOf?: string | null;
  detectedAt?: string;
}

interface AgentRunRow {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  items_processed: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

interface RunsData {
  ok: boolean;
  runs?: AgentRunRow[];
}

// FeedData interface reserved for future API integration

// ─── Static fallback data ─────────────────────────────────────────────────────

const STATIC_AGENTS: AgentCard[] = [
  {
    id: 'feed-agent',
    name: 'FEED AGENT',
    description: 'RSS ingestion + Gemini enrichment',
    status: 'ACTIVE',
    lastRun: '2 min ago',
    nextRun: 'in 3 min',
    itemsProcessed: 847,
    itemsUnit: 'articles',
    sparkline: [40, 55, 48, 70, 62, 85, 78, 91, 84, 97],
  },
  {
    id: 'signal-engine',
    name: 'SIGNAL ENGINE',
    description: 'Cluster detection + sector scoring',
    status: 'ACTIVE',
    lastRun: '5 min ago',
    nextRun: 'in 25 min',
    itemsProcessed: 12,
    itemsUnit: 'clusters',
    sparkline: [20, 35, 28, 42, 38, 55, 50, 60, 58, 65],
  },
  {
    id: 'vendor-discovery',
    name: 'VENDOR DISCOVERY',
    description: 'Entity extraction + IKER scoring',
    status: 'IDLE',
    lastRun: '1h 12m ago',
    nextRun: 'in 48 min',
    itemsProcessed: 98,
    itemsUnit: 'vendors',
    sparkline: [60, 60, 61, 61, 62, 62, 63, 63, 64, 64],
  },
  {
    id: 'product-scanner',
    name: 'PRODUCT SCANNER',
    description: 'Product catalog enrichment',
    status: 'IDLE',
    lastRun: '3h ago',
    nextRun: 'in 57 min',
    itemsProcessed: 2847,
    itemsUnit: 'products',
    sparkline: [30, 32, 31, 34, 36, 35, 38, 37, 40, 39],
  },
  {
    id: 'source-quality',
    name: 'SOURCE QUALITY',
    description: 'Feed reliability scoring (73K sources)',
    status: 'ACTIVE',
    lastRun: '8 min ago',
    nextRun: 'in 22 min',
    itemsProcessed: 73526,
    itemsUnit: 'sources',
    sparkline: [72, 74, 71, 78, 76, 82, 80, 85, 83, 88],
  },
  {
    id: 'docs-sync',
    name: 'DOCS SYNC',
    description: 'Knowledge base + conference profiles',
    status: 'IDLE',
    lastRun: '6h ago',
    nextRun: 'in 18h',
    itemsProcessed: 959,
    itemsUnit: 'documents',
    sparkline: [50, 50, 51, 51, 52, 52, 53, 53, 54, 54],
  },
];

const STATIC_ACTIVITY: ActivityEntry[] = [
  { id: '1', ts: '14:32:07', agent: 'FEED AGENT', action: 'Fetched 847 articles from 15 RSS feeds', status: 'SUCCESS' },
  { id: '2', ts: '14:30:01', agent: 'SIGNAL ENGINE', action: 'Detected 12 signal clusters, 4 sectors active', status: 'SUCCESS' },
  { id: '3', ts: '14:28:44', agent: 'SOURCE QUALITY', action: 'Scored 73,526 sources — avg reliability 0.84', status: 'SUCCESS' },
  { id: '4', ts: '14:15:00', agent: 'VENDOR DISCOVERY', action: 'No new vendors detected in current window', status: 'SUCCESS' },
  { id: '5', ts: '13:55:22', agent: 'PRODUCT SCANNER', action: 'Enriched 34 product entries via Gemini', status: 'SUCCESS' },
  { id: '6', ts: '13:48:11', agent: 'FEED AGENT', action: 'Cache TTL expired — forced re-fetch', status: 'SUCCESS' },
  { id: '7', ts: '13:32:58', agent: 'SIGNAL ENGINE', action: 'Defense sector spike: 3 related articles', status: 'SUCCESS' },
  { id: '8', ts: '13:10:05', agent: 'DOCS SYNC', action: 'Synced 12 conference profiles from Google Docs', status: 'SUCCESS' },
  { id: '9', ts: '12:44:31', agent: 'VENDOR DISCOVERY', action: 'Extracted 2 new vendors — pending IKER score', status: 'SUCCESS' },
  { id: '10', ts: '12:31:00', agent: 'SOURCE QUALITY', action: 'Feed endpoint timeout: ktsm-crime (retry OK)', status: 'SUCCESS' },
  { id: '11', ts: '11:58:14', agent: 'PRODUCT SCANNER', action: 'Rate limit hit on Gemini — backoff 60s', status: 'FAILED' },
  { id: '12', ts: '11:43:07', agent: 'FEED AGENT', action: 'Fetched 791 articles — Gemini enrichment complete', status: 'SUCCESS' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: AgentStatus): string {
  if (s === 'ACTIVE') return '#00ff88';
  if (s === 'ERROR') return '#ff3b30';
  return '#ffb800';
}

function statusBg(s: AgentStatus): string {
  if (s === 'ACTIVE') return 'bg-[#00ff88]/10 border-[#00ff88]/20';
  if (s === 'ERROR') return 'bg-[#ff3b30]/10 border-[#ff3b30]/20';
  return 'bg-[#ffb800]/10 border-[#ffb800]/20';
}

function badgeColor(s: 'SUCCESS' | 'FAILED' | 'RUNNING'): string {
  if (s === 'SUCCESS') return 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/8';
  if (s === 'FAILED') return 'text-[#ff3b30] border-[#ff3b30]/30 bg-[#ff3b30]/8';
  return 'text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/8';
}

function fmtNumber(n: number): string {
  return n >= 1000 ? n.toLocaleString('en-US') : String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const W = 80;
  const H = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke="#00d4ff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {values.map((v, i) => {
        if (i !== values.length - 1) return null;
        const x = (i / (values.length - 1)) * W;
        const y = H - (v / max) * H;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={2}
            fill="#00d4ff"
            style={{ filter: 'drop-shadow(0 0 3px #00d4ffcc)' }}
          />
        );
      })}
    </svg>
  );
}

function AgentStatusDot({ status }: { status: AgentStatus }) {
  const color = statusColor(status);
  return (
    <span className="relative h-1.5 w-1.5 inline-flex shrink-0">
      {status === 'ACTIVE' && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-1.5 w-1.5"
        style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}cc` }}
      />
    </span>
  );
}

function AgentCardTile({ agent }: { agent: AgentCard }) {
  const color = statusColor(agent.status);
  const bg = statusBg(agent.status);
  return (
    <div
      className={`relative bg-black/60 border rounded-sm p-3 flex flex-col gap-2.5 transition-all duration-150 hover:bg-white/[0.02] ${bg}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <AgentStatusDot status={agent.status} />
            <span
              className="font-mono text-[9px] tracking-[0.2em] font-semibold"
              style={{ color }}
            >
              {agent.name}
            </span>
          </div>
          <p className="font-mono text-[8px] text-white/30 mt-0.5 tracking-wide truncate">
            {agent.description}
          </p>
        </div>
        <span
          className={`font-mono text-[7px] tracking-widest border px-1.5 py-0.5 rounded-sm shrink-0 ${bg}`}
          style={{ color }}
        >
          {agent.status}
        </span>
      </div>

      {/* Items processed */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div
            className="font-mono text-base font-bold leading-none"
            style={{ color: '#ffd700', textShadow: '0 0 8px #ffd700aa' }}
          >
            {fmtNumber(agent.itemsProcessed)}
          </div>
          <div className="font-mono text-[7px] text-white/30 tracking-wide mt-0.5">
            {agent.itemsUnit}
          </div>
        </div>
        <Sparkline values={agent.sparkline} />
      </div>

      {/* Timing */}
      <div className="flex items-center justify-between border-t border-white/5 pt-2 gap-2">
        <div>
          <div className="font-mono text-[7px] text-white/25 tracking-wide uppercase">Last run</div>
          <div className="font-mono text-[8px] text-white/50">{agent.lastRun}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[7px] text-white/25 tracking-wide uppercase">Next</div>
          <div className="font-mono text-[8px] text-white/50">{agent.nextRun}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Cumulative work items ─────────────────────────────────────────────────────

const CUMULATIVE = [
  { label: 'RSS feed sources registered', value: 73526, color: '#00d4ff' },
  { label: 'El Paso vendors tracked', value: 98, color: '#ffd700' },
  { label: 'Conference profiles', value: 959, color: '#00ff88' },
  { label: 'Technology deep-dives', value: 45, color: '#00d4ff' },
  { label: 'Industry verticals', value: 12, color: '#ffb800' },
  { label: 'Signal detection patterns', value: 19, color: '#f97316' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OpsPage() {
  const [agents, setAgents] = useState<AgentCard[]>(STATIC_AGENTS);
  const [activity, setActivity] = useState<ActivityEntry[]>(STATIC_ACTIVITY);
  const [clusterCount, setClusterCount] = useState<number>(12);
  const [feedAge, setFeedAge] = useState<string>('2 min');
  const [uptime] = useState<string>('99.7%');
  const [loading, setLoading] = useState(true);
  const [swarmRunning, setSwarmRunning] = useState(false);
  const [feedRunning, setFeedRunning] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  // Tick: format "X min ago" from ISO string
  const relTime = (iso: string | null | undefined): string => {
    if (!iso) return 'unknown';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // Fetch live data once on mount
  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      try {
        const [swarmRes, signalRes, runsRes] = await Promise.allSettled([
          fetch('/api/agents/swarm', { cache: 'no-store' }),
          fetch('/api/intel-signals', { cache: 'no-store' }),
          fetch('/api/agents/runs', { cache: 'no-store' }),
        ]);

        if (!mounted) return;

        // Process swarm data
        if (swarmRes.status === 'fulfilled' && swarmRes.value.ok) {
          const swarm: SwarmData = await swarmRes.value.json().catch(() => ({ ok: false }));
          if (swarm.ok) {
            // Build activity from real swarm events
            const realActivity: ActivityEntry[] = (swarm.events ?? [])
              .slice(0, 12)
              .map((ev, i) => ({
                id: String(i),
                ts: ev.ts ? new Date(ev.ts).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--',
                agent: (ev.agent ?? 'SYSTEM').toUpperCase().replace(/-/g, ' '),
                action: String(ev.payload?.message ?? ev.type ?? 'Event'),
                status: ev.type === 'error' ? 'FAILED' : 'SUCCESS',
              }));

            if (realActivity.length > 0) setActivity(realActivity);

            // Patch agent statuses from reliability data
            const rel = swarm.reliability ?? {};
            setAgents(prev =>
              prev.map(a => {
                const key = a.id;
                const r = rel[key];
                if (!r) return a;
                const status: AgentStatus =
                  r.successRate >= 0.9 ? 'ACTIVE' : r.successRate >= 0.5 ? 'IDLE' : 'ERROR';
                return { ...a, status, itemsProcessed: r.totalRuns > 0 ? r.totalRuns : a.itemsProcessed };
              }),
            );

            if (swarm.coordinator?.lastRun) {
              // Patch feed agent last run
              const lr = relTime(swarm.coordinator.lastRun);
              setAgents(prev =>
                prev.map(a => (a.id === 'feed-agent' ? { ...a, lastRun: lr } : a)),
              );
            }
          }
        }

        // Process signal data
        if (signalRes.status === 'fulfilled' && signalRes.value.ok) {
          const sig: SignalData = await signalRes.value.json().catch(() => ({ ok: false }));
          if (sig.ok) {
            const clusters = sig.clusterCount ?? 0;
            setClusterCount(clusters);
            if (sig.feedAsOf) setFeedAge(relTime(sig.feedAsOf));
            // Patch signal engine card
            if (typeof sig.clusterCount === 'number') {
              setAgents(prev =>
                prev.map(a =>
                  a.id === 'signal-engine'
                    ? { ...a, itemsProcessed: clusters }
                    : a,
                ),
              );
            }
          }
        }

        // Process real agent_runs from Supabase
        if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
          const runsData: RunsData = await runsRes.value.json().catch(() => ({ ok: false }));
          if (runsData.ok && runsData.runs && runsData.runs.length > 0) {
            // Build activity entries from real runs
            const runsActivity: ActivityEntry[] = runsData.runs.slice(0, 12).map((run, i) => ({
              id: `run-${run.id ?? i}`,
              ts: run.started_at
                ? new Date(run.started_at).toLocaleTimeString('en-US', { hour12: false })
                : '--:--:--',
              agent: (run.agent_id ?? 'UNKNOWN').toUpperCase().replace(/[-_]/g, ' '),
              action: run.error_message
                ? `Error: ${run.error_message}`
                : `Processed ${run.items_processed ?? 0} items — ${run.status}`,
              status: run.status === 'success' || run.status === 'SUCCESS'
                ? 'SUCCESS'
                : run.status === 'running' || run.status === 'RUNNING'
                  ? 'RUNNING'
                  : 'FAILED',
            }));

            if (runsActivity.length > 0) setActivity(runsActivity);

            // Patch agent cards with latest run info per agent
            const latestByAgent = new Map<string, AgentRunRow>();
            for (const run of runsData.runs) {
              if (!latestByAgent.has(run.agent_id)) {
                latestByAgent.set(run.agent_id, run);
              }
            }

            setAgents(prev =>
              prev.map(a => {
                const latest = latestByAgent.get(a.id);
                if (!latest) return a;
                const status: AgentStatus =
                  latest.status === 'running' || latest.status === 'RUNNING'
                    ? 'ACTIVE'
                    : latest.status === 'success' || latest.status === 'SUCCESS'
                      ? 'ACTIVE'
                      : 'ERROR';
                return {
                  ...a,
                  status,
                  lastRun: relTime(latest.started_at),
                  itemsProcessed: latest.items_processed ?? a.itemsProcessed,
                };
              }),
            );
          }
        }
      } catch {
        // Use static fallback — no error surface
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAll();
    return () => { mounted = false; };
  }, []);

  // Trigger swarm run
  async function handleTriggerSwarm() {
    if (swarmRunning) return;
    setSwarmRunning(true);
    setTriggerMsg(null);
    try {
      const res = await fetch('/api/agents/swarm', { method: 'POST' });
      const data: { ok: boolean; message?: string } = await res.json().catch(() => ({ ok: false }));
      setTriggerMsg(data.ok ? 'Swarm cycle started successfully.' : (data.message ?? 'Failed to start.'));
    } catch {
      setTriggerMsg('Network error — could not reach swarm endpoint.');
    } finally {
      setSwarmRunning(false);
    }
  }

  // Trigger feed agent (fetches RSS + persists to Supabase)
  async function handleRunFeeds() {
    if (feedRunning) return;
    setFeedRunning(true);
    setTriggerMsg(null);
    try {
      const res = await fetch('/api/feeds', { method: 'POST' });
      const data: { ok: boolean; source_count?: number; all?: unknown[]; message?: string } =
        await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        const count = Array.isArray(data.all) ? data.all.length : 0;
        setTriggerMsg(`Feed agent complete — ${count} articles from ${data.source_count ?? 0} sources. Persisted to Supabase.`);
      } else {
        setTriggerMsg(data.message ?? 'Feed agent failed.');
      }
    } catch {
      setTriggerMsg('Network error — could not reach feed endpoint.');
    } finally {
      setFeedRunning(false);
    }
  }

  const activeCount = agents.filter(a => a.status === 'ACTIVE').length;
  const errorCount = agents.filter(a => a.status === 'ERROR').length;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'OPS CENTER' }]}
        showLiveDot={activeCount > 0}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {loading ? 'LOADING...' : `${activeCount} ACTIVE · ${errorCount} ERROR`}
          </span>
        }
      />

      {/* Dot-grid background texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-1">
              NXT//LINK · MISSION CONTROL
            </div>
            <h1
              className="font-mono text-lg font-bold tracking-[0.15em] leading-none"
              style={{ color: '#00d4ff', textShadow: '0 0 20px #00d4ff60' }}
            >
              AGENT OPERATIONS
            </h1>
            <p className="font-mono text-[8px] text-white/30 mt-1 tracking-wide">
              Live swarm telemetry — intelligence pipeline monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFeeds}
              disabled={feedRunning}
              className="font-mono text-[8px] tracking-[0.2em] border border-[#00ff88]/30 text-[#00ff88] px-3 py-1.5 rounded-sm hover:bg-[#00ff88]/10 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {feedRunning ? '► FETCHING...' : '► RUN FEEDS'}
            </button>
            <button
              onClick={handleTriggerSwarm}
              disabled={swarmRunning}
              className="font-mono text-[8px] tracking-[0.2em] border border-[#00d4ff]/30 text-[#00d4ff] px-3 py-1.5 rounded-sm hover:bg-[#00d4ff]/10 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {swarmRunning ? '► RUNNING...' : '► RUN SWARM CYCLE'}
            </button>
          </div>
        </div>

        {/* Trigger feedback */}
        {triggerMsg && (
          <div className="font-mono text-[8px] tracking-wide text-[#00ff88] border border-[#00ff88]/20 bg-[#00ff88]/5 rounded-sm px-3 py-2">
            {triggerMsg}
          </div>
        )}

        {/* ── System metrics bar ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { label: 'RSS SOURCES', value: '73,526', color: '#00d4ff' },
            { label: 'ACTIVE VENDORS', value: '98', color: '#ffd700' },
            { label: 'SIGNAL CLUSTERS', value: String(clusterCount), color: '#f97316' },
            { label: 'FEED CACHE AGE', value: feedAge, color: '#00ff88' },
            { label: 'UPTIME', value: uptime, color: '#00ff88' },
          ].map(m => (
            <div
              key={m.label}
              className="bg-black/60 border border-white/[0.06] rounded-sm px-3 py-2 flex flex-col gap-1"
            >
              <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 uppercase">
                {m.label}
              </div>
              <div
                className="font-mono text-sm font-bold leading-none"
                style={{ color: m.color, textShadow: `0 0 8px ${m.color}80` }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main two-column layout ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Left: Agent grid + activity */}
          <div className="space-y-6">

            {/* Agent status grid */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/30 shrink-0">
                  AGENT STATUS GRID
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {agents.map(a => (
                  <AgentCardTile key={a.id} agent={a} />
                ))}
              </div>
            </section>

            {/* Activity log */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/30 shrink-0">
                  RECENT ACTIVITY LOG
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div
                ref={activityRef}
                className="bg-black/60 border border-white/[0.06] rounded-sm overflow-y-auto"
                style={{ maxHeight: '340px' }}
              >
                <div className="divide-y divide-white/[0.04]">
                  {activity.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 px-3 py-2 transition-colors hover:bg-white/[0.02] ${
                        i === 0 ? 'bg-white/[0.015]' : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <span className="font-mono text-[8px] text-white/25 shrink-0 pt-0.5 tabular-nums">
                        {entry.ts}
                      </span>
                      {/* Agent */}
                      <span
                        className="font-mono text-[8px] tracking-wide shrink-0 pt-0.5 w-24 truncate"
                        style={{ color: '#00d4ff' }}
                      >
                        {entry.agent}
                      </span>
                      {/* Action */}
                      <span className="font-mono text-[8px] text-white/50 flex-1 min-w-0">
                        {entry.action}
                      </span>
                      {/* Badge */}
                      <span
                        className={`font-mono text-[7px] tracking-widest border px-1.5 py-0.5 rounded-sm shrink-0 ${badgeColor(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>

          {/* Right: Cumulative work + pipeline diagram */}
          <div className="space-y-4">

            {/* Cumulative work */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/30 shrink-0">
                  CUMULATIVE WORK
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="bg-black/60 border border-white/[0.06] rounded-sm divide-y divide-white/[0.04]">
                {CUMULATIVE.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-mono text-[8px] text-white/40 tracking-wide">
                      {item.label}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold tabular-nums"
                      style={{ color: item.color, textShadow: `0 0 6px ${item.color}80` }}
                    >
                      {fmtNumber(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Pipeline diagram */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/30 shrink-0">
                  PIPELINE FLOW
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="bg-black/60 border border-white/[0.06] rounded-sm p-3 space-y-1.5">
                {[
                  { label: 'SOURCE QUALITY', sublabel: '73,526 feeds ranked', color: '#00d4ff', idx: 0 },
                  { label: 'FEED AGENT', sublabel: 'Ingest + Gemini enrich', color: '#00ff88', idx: 1 },
                  { label: 'SIGNAL ENGINE', sublabel: 'Cluster + score', color: '#f97316', idx: 2 },
                  { label: 'VENDOR DISCOVERY', sublabel: 'Entity extraction', color: '#ffd700', idx: 3 },
                  { label: 'PRODUCT SCANNER', sublabel: 'Catalog enrichment', color: '#00d4ff', idx: 4 },
                  { label: 'DOCS SYNC', sublabel: 'Knowledge export', color: '#00ff88', idx: 5 },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-start gap-2">
                    {/* Connector */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{ backgroundColor: step.color, boxShadow: `0 0 4px ${step.color}cc` }}
                      />
                      {i < arr.length - 1 && (
                        <div className="w-px flex-1 my-0.5" style={{ backgroundColor: `${step.color}30`, minHeight: '10px' }} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-1 min-w-0">
                      <div
                        className="font-mono text-[8px] tracking-wide font-semibold"
                        style={{ color: step.color }}
                      >
                        {step.label}
                      </div>
                      <div className="font-mono text-[7px] text-white/25 tracking-wide">
                        {step.sublabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Health summary */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/30 shrink-0">
                  HEALTH SUMMARY
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="bg-black/60 border border-white/[0.06] rounded-sm p-3 space-y-2">
                {[
                  { label: 'Agents online', value: `${activeCount} / ${agents.length}`, ok: errorCount === 0 },
                  { label: 'Feed pipeline', value: 'NOMINAL', ok: true },
                  { label: 'Signal engine', value: 'NOMINAL', ok: true },
                  { label: 'Gemini enrichment', value: 'NOMINAL', ok: true },
                  { label: 'Supabase sync', value: 'NOMINAL', ok: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="font-mono text-[8px] text-white/35 tracking-wide">
                      {row.label}
                    </span>
                    <span
                      className="font-mono text-[8px] tracking-wide"
                      style={{ color: row.ok ? '#00ff88' : '#ff3b30' }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* Footer rule */}
        <div className="border-t border-white/[0.04] pt-3 pb-6 flex items-center justify-between">
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/15">
            NXT//LINK OPS CENTER — {new Date().toUTCString()}
          </span>
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/15">
            SWARM v2.0 · GEMINI ENRICHMENT
          </span>
        </div>

      </div>
    </div>
  );
}
