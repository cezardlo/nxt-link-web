'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

interface AgentRun {
  id: string;
  agent_name: string;
  status: 'idle' | 'running' | 'done' | 'failed';
  started_at: string;
  finished_at?: string;
  items_in: number;
  items_out: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const AGENT_COLORS: Record<string, string> = {
  FeedAgent: '#00d4ff',
  EntityAgent: '#ffb800',
  IKERAgent: '#ffd700',
  TrendAgent: '#00ff88',
  NarrativeAgent: '#f97316',
  AlertAgent: '#ff3b30',
  Orchestrator: '#ffffff',
};

const STATUS_COLORS: Record<AgentRun['status'], string> = {
  idle: 'rgba(255,255,255,0.2)',
  running: '#00d4ff',
  done: '#00ff88',
  failed: '#ff3b30',
};

export default function AgentControlRoom() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const latestByAgent = useMemo(() => {
    return runs.reduce<Record<string, AgentRun>>((acc, run) => {
      if (!acc[run.agent_name] || new Date(run.started_at) > new Date(acc[run.agent_name].started_at)) {
        acc[run.agent_name] = run;
      }
      return acc;
    }, {});
  }, [runs]);

  const agents = [
    'Orchestrator',
    'FeedAgent',
    'EntityAgent',
    'IKERAgent',
    'TrendAgent',
    'NarrativeAgent',
    'AlertAgent',
  ];

  const fetchRuns = async () => {
    const response = await fetch('/api/agents/run', { cache: 'no-store' });
    const data = await response.json() as { runs?: AgentRun[] };
    setRuns(data.runs ?? []);
  };

  useEffect(() => {
    fetchRuns().catch(() => undefined);

    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: RealtimeChannel | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel('agent_runs_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agent_runs' },
          () => {
            fetchRuns().catch(() => undefined);
          },
        )
        .subscribe();
    } catch {
      // Realtime is optional in local/dev mode.
    }

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const triggerPipeline = async () => {
    setRunning(true);
    try {
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });

      setLastRun(new Date().toLocaleTimeString());
      await fetchRuns();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-sm border border-white/8 bg-black p-4 font-mono">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#00ff88]"
            style={{ boxShadow: '0 0 6px #00ff88cc', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          />
          <span className="text-[8px] tracking-[0.3em] text-white/30 uppercase">Agent Control Room</span>
        </div>
        <button
          onClick={triggerPipeline}
          disabled={running}
          className="font-mono text-[8px] tracking-[0.2em] border border-white/8 rounded-sm px-3 py-1.5 text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? 'RUNNING...' : 'RUN ALL AGENTS'}
        </button>
      </div>

      {/* Agent rows */}
      <div className="grid grid-cols-1 gap-px">
        {agents.map((agentName) => {
          const run = latestByAgent[agentName];
          const color = AGENT_COLORS[agentName] ?? '#ffffff';
          const status = run?.status ?? 'idle';
          const statusColor = STATUS_COLORS[status];
          const isRunning = status === 'running';

          return (
            <div
              key={agentName}
              className="flex items-center gap-3 border border-white/8 px-2.5 py-2 transition-colors hover:bg-white/[0.02]"
            >
              {/* Status dot */}
              <div
                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: statusColor,
                  boxShadow: status !== 'idle' ? `0 0 6px ${statusColor}cc` : undefined,
                }}
              />

              {/* Agent name */}
              <span className="w-28 flex-shrink-0 text-[10px] tracking-wide" style={{ color }}>
                {agentName}
              </span>

              {/* Status label */}
              <span className="w-14 flex-shrink-0 text-[9px] uppercase tracking-[0.15em]" style={{ color: statusColor }}>
                {status}
              </span>

              {/* Metrics / never run */}
              {run ? (
                <>
                  <span className="flex-1 text-[9px] text-white/30">
                    {run.items_in > 0 && `in:${run.items_in} `}
                    {run.items_out > 0 && `out:${run.items_out}`}
                  </span>

                  {run.finished_at && run.started_at ? (
                    <span className="text-[8px] text-white/20">
                      {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                    </span>
                  ) : null}

                  {run.error ? (
                    <span className="max-w-32 truncate text-[8px] text-[#ff3b30]" title={run.error}>
                      WARN {run.error.slice(0, 30)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-[9px] text-white/20">never run</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Last triggered */}
      {lastRun ? (
        <div className="mt-3 text-right text-[8px] tracking-[0.15em] text-white/20">
          LAST TRIGGERED {lastRun}
        </div>
      ) : null}
    </div>
  );
}
