'use client';

import { useEffect, useState } from 'react';

interface SwarmStatus {
  memory: unknown[];
  events: unknown[];
  reliability: unknown[];
  coordinator: Record<string, unknown>;
}

export function SystemDashboard() {
  const [status, setStatus] = useState<SwarmStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agents/swarm')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: SwarmStatus) => setStatus(d))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="font-mono text-white">
      <h1 className="text-[14px] tracking-widest text-[#00d4ff] mb-6">SYSTEM DASHBOARD</h1>

      {error && (
        <div className="border border-[#ff3b30]/30 bg-[#ff3b30]/10 rounded-sm px-4 py-3 mb-4">
          <p className="text-[10px] text-[#ff3b30]">ERROR: {error}</p>
        </div>
      )}

      {!status && !error && (
        <p className="text-[10px] text-white/30 animate-pulse">Loading system status...</p>
      )}

      {status && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-white/8 bg-black/92 rounded-sm p-4">
            <p className="text-[8px] tracking-widest text-white/30 mb-2">SWARM MEMORY</p>
            <p className="text-[20px] font-bold text-[#00ff88]">{Array.isArray(status.memory) ? status.memory.length : 0}</p>
            <p className="text-[8px] text-white/20 mt-1">ENTRIES</p>
          </div>
          <div className="border border-white/8 bg-black/92 rounded-sm p-4">
            <p className="text-[8px] tracking-widest text-white/30 mb-2">SWARM EVENTS</p>
            <p className="text-[20px] font-bold text-[#00d4ff]">{Array.isArray(status.events) ? status.events.length : 0}</p>
            <p className="text-[8px] text-white/20 mt-1">RECENT</p>
          </div>
          <div className="border border-white/8 bg-black/92 rounded-sm p-4">
            <p className="text-[8px] tracking-widest text-white/30 mb-2">AGENT RELIABILITY</p>
            <p className="text-[20px] font-bold text-[#ffb800]">{Array.isArray(status.reliability) ? status.reliability.length : 0}</p>
            <p className="text-[8px] text-white/20 mt-1">AGENTS SCORED</p>
          </div>
        </div>
      )}
    </div>
  );
}
