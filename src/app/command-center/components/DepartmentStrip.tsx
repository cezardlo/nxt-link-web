'use client';

import { useState, useEffect } from 'react';

type DeptStatus = {
  id: string;
  name: string;
  mission: string;
  agent_count: number;
  last_run: string | null;
  signals_processed: number;
  status: 'active' | 'warming' | 'idle' | 'error';
};

const STATUS_COLOR: Record<string, string> = {
  active: '#00ff88',
  warming: '#ffb800',
  idle: '#3a3f4b',
  error: '#ff3b30',
};

export default function DepartmentStrip() {
  const [depts, setDepts] = useState<DeptStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brain/departments')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.departments) setDepts(data.departments);
      })
      .catch((err) => console.warn('[DepartmentStrip] fetch departments failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const [running, setRunning] = useState(false);

  function runPipeline() {
    setRunning(true);
    fetch('/api/brain/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'brief' }),
    })
      .then(r => r.json())
      .then(() => {
        // Refresh status
        return fetch('/api/brain/departments').then(r => r.json());
      })
      .then(data => { if (data?.departments) setDepts(data.departments); })
      .catch((err) => console.warn('[DepartmentStrip] run pipeline failed:', err))
      .finally(() => setRunning(false));
  }

  if (loading || depts.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 2,
      padding: '2px 2px',
      background: '#03050a',
      overflow: 'hidden',
    }}>
      {/* Run pipeline button */}
      <button
        onClick={runPipeline}
        disabled={running}
        style={{
          width: 60, flexShrink: 0,
          background: running ? '#080c14' : '#0a1a0a',
          border: `1px solid ${running ? '#ffb80030' : '#00ff8820'}`,
          borderRadius: 2,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 7, letterSpacing: '0.15em',
          color: running ? '#ffb800' : '#00ff88',
          cursor: running ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {running ? 'RUNNING' : 'RUN'}
      </button>

      {depts.map(d => {
        const color = STATUS_COLOR[d.status] ?? STATUS_COLOR.idle;
        return (
          <div
            key={d.id}
            style={{
              flex: 1,
              background: '#080c14',
              border: `1px solid ${color}15`,
              borderRadius: 2,
              padding: '6px 10px',
              fontFamily: "'IBM Plex Mono', monospace",
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top glow line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
            }} />

            {/* Header: name + status dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: color,
                boxShadow: d.status === 'active' ? `0 0 6px ${color}88` : 'none',
              }} />
              <span style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)' }}>
                {d.name.replace(/[^\w\s/]/g, '').trim()}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>
                {d.agent_count} agents
              </span>
              {d.signals_processed > 0 && (
                <span style={{ fontSize: 7, color: `${color}99` }}>
                  {d.signals_processed} processed
                </span>
              )}
              <span style={{
                fontSize: 6, marginLeft: 'auto',
                color: color, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              }}>
                {d.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
