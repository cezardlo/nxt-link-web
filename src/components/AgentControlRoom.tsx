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
  EntityAgent: '#a78bfa',
  IKERAgent: '#ffd700',
  TrendAgent: '#00ff88',
  NarrativeAgent: '#ff8c00',
  AlertAgent: '#ff3b30',
  Orchestrator: '#ffffff',
};

const STATUS_COLORS: Record<AgentRun['status'], string> = {
  idle: '#374151',
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
    <div className="rounded border border-[#1a1a1a] bg-[#0a0a0a] p-4 font-mono">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#00ff88]" />
          <span className="text-xs font-bold tracking-wider text-[#00ff88]">AGENT CONTROL ROOM</span>
        </div>
        <button
          onClick={triggerPipeline}
          disabled={running}
          className="border border-[#00d4ff] px-3 py-1 text-xs text-[#00d4ff] transition-colors hover:bg-[#00d4ff] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? 'RUNNING...' : 'RUN ALL AGENTS'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {agents.map((agentName) => {
          const run = latestByAgent[agentName];
          const color = AGENT_COLORS[agentName] ?? '#ffffff';
          const status = run?.status ?? 'idle';
          const statusColor = STATUS_COLORS[status];
          const isRunning = status === 'running';

          return (
            <div
              key={agentName}
              className="flex items-center gap-3 border border-[#1a1a1a] p-2 transition-colors hover:border-[#2a2a2a]"
            >
              <div
                className={`h-2 w-2 flex-shrink-0 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: statusColor }}
              />

              <span className="w-32 flex-shrink-0 text-xs font-bold" style={{ color }}>
                {agentName}
              </span>

              <span className="w-16 flex-shrink-0 text-xs uppercase" style={{ color: statusColor }}>
                {status}
              </span>

              {run ? (
                <>
                  <span className="flex-1 text-xs text-gray-600">
                    {run.items_in > 0 && `in:${run.items_in} `}
                    {run.items_out > 0 && `out:${run.items_out}`}
                  </span>

                  {run.finished_at && run.started_at ? (
                    <span className="text-xs text-gray-600">
                      {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                    </span>
                  ) : null}

                  {run.error ? (
                    <span className="max-w-32 truncate text-xs text-[#ff3b30]" title={run.error}>
                      WARN {run.error.slice(0, 30)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs text-gray-700">never run</span>
              )}
            </div>
          );
        })}
      </div>

      {lastRun ? <div className="mt-3 text-right text-xs text-gray-600">Last triggered: {lastRun}</div> : null}
    </div>
  );
}
