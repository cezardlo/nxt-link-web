'use client';

import { useEffect, useState } from 'react';

// ─── API response types ───────────────────────────────────────────────────────

type SwarmCommEvent = {
  timestamp: string;
  source_agent: string;
  event_type: string;
  payload?: Record<string, unknown>;
};

type AgentReliability = {
  agent_id: string;
  agent_name: string;
  reliability_score: number; // 0–100
};

type MemoryEntry = {
  id?: string;
  topic: string;
  entry_type: string;
  confidence: number; // 0–1
  created_at: string;
};

type SwarmApiResponse = {
  ok: boolean;
  agent_count?: number;
  is_active?: boolean;
  recent_comms?: SwarmCommEvent[];
  agent_reliability?: AgentReliability[];
  memory_entries?: MemoryEntry[];
};

// ─── Color helpers ────────────────────────────────────────────────────────────

function eventColor(eventType: string): string {
  if (eventType === 'finding_new')     return '#00ff88';
  if (eventType === 'contract_alert')  return '#ffb800';
  if (eventType === 'risk_detected')   return '#ff3b30';
  return 'rgba(255,255,255,0.3)';
}

function reliabilityColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 55) return '#00d4ff';
  if (score >= 35) return '#ffb800';
  return '#ff3b30';
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return '#00ff88';
  if (c >= 0.5) return '#00d4ff';
  if (c >= 0.3) return '#ffb800';
  return '#ff3b30';
}

function entryTypeBg(type: string): { bg: string; fg: string } {
  switch (type.toLowerCase()) {
    case 'finding':   return { bg: '#00ff8820', fg: '#00ff88' };
    case 'alert':     return { bg: '#ff3b3020', fg: '#ff3b30' };
    case 'contract':  return { bg: '#ffb80020', fg: '#ffb800' };
    case 'risk':      return { bg: '#f9731620', fg: '#f97316' };
    default:          return { bg: 'rgba(255,255,255,0.04)', fg: 'rgba(255,255,255,0.35)' };
  }
}

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts.slice(0, 8);
  }
}

function fmtDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  } catch {
    return '--';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score, color, max = 100 }: { score: number; color: string; max?: number }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 5px ${color}66`,
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SwarmStatusPanel() {
  const [data, setData] = useState<SwarmApiResponse | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const poll = () => {
      fetch('/api/agents/swarm')
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<SwarmApiResponse>;
        })
        .then((d) => {
          if (!mounted) return;
          setData(d);
          setOffline(false);
          setLoading(false);
        })
        .catch(() => {
          if (!mounted) return;
          setOffline(true);
          setLoading(false);
        });
    };

    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-3 py-4 flex flex-col gap-3">
        {[80, 55, 70, 40].map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full shimmer"
            style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
    );
  }

  // ── Offline state ─────────────────────────────────────────────────────────
  if (offline || !data) {
    return (
      <div className="px-3 py-6 flex flex-col items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.25em] text-white/15 uppercase">SWARM OFFLINE</span>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#ff3b30', boxShadow: '0 0 6px #ff3b30cc' }}
        />
        <span className="font-mono text-[8px] text-white/10">No response from /api/agents/swarm</span>
      </div>
    );
  }

  const comms     = data.recent_comms?.slice(0, 10)   ?? [];
  const agents    = [...(data.agent_reliability ?? [])].sort((a, b) => b.reliability_score - a.reliability_score);
  const memories  = data.memory_entries?.slice(0, 5)  ?? [];
  const isActive  = data.is_active ?? false;
  const agentCount = data.agent_count ?? 0;

  return (
    <div className="flex flex-col gap-0">

      {/* ── Section 1: SWARM STATUS header ───────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-1.5">
          {/* Live dot */}
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background:  isActive ? '#00ff88' : 'rgba(255,255,255,0.15)',
              boxShadow:   isActive ? '0 0 6px #00ff88cc' : 'none',
            }}
          />
          <span className="font-mono text-[8px] tracking-[0.3em] text-white/25 uppercase flex-1">
            SWARM STATUS
          </span>
          <span
            className="font-mono text-[7px] tracking-wider px-1.5 py-px rounded-sm"
            style={
              isActive
                ? { color: '#00ff88', background: '#00ff8818', border: '1px solid #00ff8830' }
                : { color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)' }
            }
          >
            {isActive ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[20px] font-black tabular-nums leading-none" style={{ color: '#00d4ff' }}>
              {agentCount}
            </span>
            <span className="font-mono text-[8px] text-white/20">agents</span>
          </div>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <span className="font-mono text-[7px] tracking-wider text-white/15">
            POLL 30s
          </span>
        </div>
      </div>

      {/* ── Section 2: RECENT COMMS ──────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1 border-b border-white/[0.04]">
        <span className="font-mono text-[7px] tracking-[0.25em] text-white/20 uppercase">
          RECENT COMMS
        </span>
      </div>

      <div className="flex flex-col border-b border-white/[0.04]">
        {comms.length === 0 ? (
          <div className="px-3 py-3 font-mono text-[8px] text-white/15">
            No recent communications.
          </div>
        ) : (
          comms.map((evt, i) => {
            const color = eventColor(evt.event_type);
            return (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-[5px] border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors"
              >
                {/* Color indicator */}
                <span
                  className="w-1 h-1 rounded-full shrink-0 mt-[3px]"
                  style={{ background: color, boxShadow: `0 0 4px ${color}99` }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  {/* Timestamp */}
                  <span className="font-mono text-[7px] text-white/15 tabular-nums">
                    {fmtTime(evt.timestamp)}
                  </span>
                  {/* Source → event type */}
                  <span
                    className="font-mono text-[9px] leading-tight truncate"
                    style={{ color }}
                  >
                    {evt.source_agent}
                    <span className="text-white/20"> → </span>
                    {evt.event_type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Section 3: AGENT RELIABILITY ────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1">
        <span className="font-mono text-[7px] tracking-[0.25em] text-white/20 uppercase">
          AGENT RELIABILITY
        </span>
      </div>

      <div className="flex flex-col pb-1 border-b border-white/[0.04]">
        {agents.length === 0 ? (
          <div className="px-3 py-3 font-mono text-[8px] text-white/15">
            No agent data available.
          </div>
        ) : (
          agents.map((agent) => {
            const color = reliabilityColor(agent.reliability_score);
            return (
              <div key={agent.agent_id} className="flex flex-col gap-1 px-3 py-[5px] border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-white/50 flex-1 truncate tracking-wide">
                    {agent.agent_name}
                  </span>
                  <span
                    className="font-mono text-[9px] font-bold tabular-nums shrink-0"
                    style={{ color }}
                  >
                    {agent.reliability_score}%
                  </span>
                </div>
                <ScoreBar score={agent.reliability_score} color={color} />
              </div>
            );
          })
        )}
      </div>

      {/* ── Section 4: MEMORY ENTRIES ───────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1">
        <span className="font-mono text-[7px] tracking-[0.25em] text-white/20 uppercase">
          MEMORY ENTRIES
        </span>
      </div>

      <div className="flex flex-col pb-2">
        {memories.length === 0 ? (
          <div className="px-3 py-3 font-mono text-[8px] text-white/15">
            No memory entries.
          </div>
        ) : (
          memories.map((mem, i) => {
            const { bg, fg } = entryTypeBg(mem.entry_type);
            const confColor  = confidenceColor(mem.confidence);
            const confPct    = Math.round(mem.confidence * 100);
            return (
              <div
                key={mem.id ?? i}
                className="flex flex-col gap-1.5 px-3 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors"
              >
                {/* Topic + badge row */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-white/55 flex-1 truncate leading-tight">
                    {mem.topic}
                  </span>
                  <span
                    className="font-mono text-[7px] tracking-wider px-1.5 py-px rounded-sm shrink-0"
                    style={{ background: bg, color: fg, border: `1px solid ${fg}30` }}
                  >
                    {mem.entry_type.toUpperCase()}
                  </span>
                </div>

                {/* Confidence bar + date */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ScoreBar score={confPct} color={confColor} />
                  </div>
                  <span className="font-mono text-[7px] tabular-nums shrink-0" style={{ color: confColor }}>
                    {confPct}%
                  </span>
                  <span className="font-mono text-[7px] text-white/15 tabular-nums shrink-0">
                    {fmtDate(mem.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
