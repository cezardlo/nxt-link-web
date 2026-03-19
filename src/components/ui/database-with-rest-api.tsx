'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Server, Globe, Lock, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type Endpoint = {
  method: EndpointMethod;
  path: string;
  description: string;
};

type Props = {
  title?: string;
  description?: string;
  endpoints?: Endpoint[];
  className?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<EndpointMethod, string> = {
  GET:    '#00d4ff',
  POST:   '#00ff88',
  PUT:    '#ffd700',
  PATCH:  '#ffb800',
  DELETE: '#ff3b30',
};

const DEFAULT_ENDPOINTS: Endpoint[] = [
  { method: 'GET',    path: '/api/intel-signals',    description: 'Live intelligence signals' },
  { method: 'POST',   path: '/api/ask',              description: 'AI-powered intelligence search' },
  { method: 'GET',    path: '/api/feeds',            description: 'Enriched RSS feed articles' },
  { method: 'GET',    path: '/api/predictions',      description: '30d/90d trajectory forecasts' },
  { method: 'POST',   path: '/api/agents/cron',      description: 'Agent OS pipeline trigger' },
  { method: 'GET',    path: '/api/opportunities',    description: 'Algorithmic opportunity scan' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataPacket({ delay, pathClass }: { delay: number; pathClass: string }) {
  return (
    <motion.div
      className={cn('database absolute w-2 h-2 rounded-full', pathClass)}
      style={{
        backgroundColor: '#ff6600',
        boxShadow: '0 0 6px #ff660088',
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function MethodBadge({ method }: { method: EndpointMethod }) {
  const color = METHOD_COLORS[method];
  return (
    <span
      style={{
        fontSize: 7,
        letterSpacing: '0.15em',
        padding: '2px 6px',
        border: `1px solid ${color}40`,
        backgroundColor: `${color}12`,
        color,
        borderRadius: 2,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        minWidth: 48,
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {method}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DatabaseWithRestApi({
  title = 'NXT LINK DATA LAYER',
  description = 'Supabase + agent pipelines powering all intelligence screens',
  endpoints = DEFAULT_ENDPOINTS,
  className,
}: Props) {
  return (
    <div
      className={cn('w-full rounded-sm overflow-hidden', className)}
      style={{
        backgroundColor: '#050505',
        border: '1px solid #1a1a1a',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b"
        style={{ borderColor: '#1a1a1a', backgroundColor: 'rgba(255,102,0,0.04)' }}
      >
        <Database size={14} color="#ff6600" />
        <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#ff6600', fontWeight: 700 }}>
          {title}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ fontSize: 7, letterSpacing: '0.15em', color: '#00ff88' }}>LIVE</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Left — Database + REST diagram */}
        <div className="flex-shrink-0 p-6 flex flex-col items-center justify-center" style={{ minWidth: 240 }}>
          {/* SVG Architecture diagram */}
          <div className="relative" style={{ width: 200, height: 160 }}>
            <svg width={200} height={160} viewBox="0 0 200 160">
              {/* Paths for data packets */}
              <path
                d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 25"
                fill="none"
                stroke="rgba(255,102,0,0.15)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <path
                d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 25"
                fill="none"
                stroke="rgba(255,102,0,0.15)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <path
                d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 25"
                fill="none"
                stroke="rgba(255,102,0,0.15)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <path
                d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 25"
                fill="none"
                stroke="rgba(255,102,0,0.15)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />

              {/* Data source nodes at top */}
              {[
                { x: 24, label: 'RSS', icon: Globe },
                { x: 70, label: 'API', icon: Zap },
                { x: 117, label: 'DB', icon: Database },
                { x: 163, label: 'AI', icon: Server },
              ].map(({ x, label }) => (
                <g key={label}>
                  <rect x={x - 12} y={0} width={24} height={14} rx={2}
                    fill="rgba(0,0,0,0.8)" stroke="rgba(0,212,255,0.25)" strokeWidth={0.8}
                  />
                  <text x={x} y={10} textAnchor="middle"
                    fill="rgba(0,212,255,0.7)"
                    style={{ fontSize: 6, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  >
                    {label}
                  </text>
                </g>
              ))}

              {/* Central API gateway */}
              <rect x={60} y={55} width={80} height={32} rx={3}
                fill="rgba(255,102,0,0.08)" stroke="rgba(255,102,0,0.40)" strokeWidth={1}
              />
              <text x={100} y={68} textAnchor="middle"
                fill="#ff6600" style={{ fontSize: 7, fontFamily: 'monospace', letterSpacing: '0.1em' }}
              >
                REST API
              </text>
              <text x={100} y={80} textAnchor="middle"
                fill="rgba(255,255,255,0.30)" style={{ fontSize: 5.5, fontFamily: 'monospace' }}
              >
                /api/*
              </text>

              {/* Line to database */}
              <line x1={100} y1={87} x2={100} y2={108} stroke="rgba(0,212,255,0.20)" strokeWidth={1} strokeDasharray="2 3" />

              {/* Database cylinder */}
              <ellipse cx={100} cy={112} rx={28} ry={6} fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.30)" strokeWidth={0.8} />
              <rect x={72} y={112} width={56} height={22} fill="rgba(0,212,255,0.04)" stroke="rgba(0,212,255,0.20)" strokeWidth={0.8} />
              <ellipse cx={100} cy={134} rx={28} ry={6} fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.20)" strokeWidth={0.8} />
              <text x={100} y={126} textAnchor="middle"
                fill="rgba(0,212,255,0.6)" style={{ fontSize: 5.5, fontFamily: 'monospace', letterSpacing: '0.1em' }}
              >
                SUPABASE
              </text>

              {/* Lock icon area */}
              <circle cx={155} cy={125} r={8} fill="rgba(0,255,136,0.06)" stroke="rgba(0,255,136,0.20)" strokeWidth={0.8} />
              <text x={155} y={129} textAnchor="middle"
                fill="rgba(0,255,136,0.5)" style={{ fontSize: 8 }}
              >
                🔒
              </text>
            </svg>

            {/* Animated data packets (CSS animation) */}
            <DataPacket delay={1} pathClass="db-light-1" />
            <DataPacket delay={2} pathClass="db-light-2" />
            <DataPacket delay={3} pathClass="db-light-3" />
            <DataPacket delay={1.5} pathClass="db-light-4" />
          </div>

          {/* Description */}
          <p style={{ fontSize: 8, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.30)', textAlign: 'center', marginTop: 12, lineHeight: 1.7, maxWidth: 180 }}>
            {description}
          </p>
        </div>

        {/* Right — endpoint list */}
        <div
          className="flex-1 border-t md:border-t-0 md:border-l flex flex-col"
          style={{ borderColor: '#1a1a1a' }}
        >
          {/* Column header */}
          <div
            className="flex items-center gap-3 px-5 py-2 border-b"
            style={{ borderColor: '#1a1a1a', backgroundColor: 'rgba(255,255,255,0.015)' }}
          >
            <Lock size={10} color="rgba(255,255,255,0.25)" />
            <span style={{ fontSize: 7, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)' }}>ENDPOINTS</span>
            <div className="flex-1" />
            <span style={{ fontSize: 7, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.15)' }}>
              {endpoints.length} ROUTES
            </span>
          </div>

          {/* Endpoint rows */}
          <div className="flex-1 flex flex-col divide-y" style={{ borderColor: '#111' }}>
            {endpoints.map((ep, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-center gap-3 px-5 py-2.5 group"
                style={{
                  borderBottom: i < endpoints.length - 1 ? '1px solid #111' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.018)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <MethodBadge method={ep.method} />
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.65)',
                    fontFamily: "'JetBrains Mono', monospace",
                    flex: 1,
                  }}
                >
                  {ep.path}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.28)',
                    display: 'none',
                  }}
                  className="group-hover:block hidden"
                >
                  {ep.description}
                </span>
                <ArrowRight size={10} color="rgba(255,255,255,0.12)" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-4 px-5 py-2 border-t"
        style={{ borderColor: '#1a1a1a', backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        {[
          { icon: Server,   label: 'Next.js 14',  color: '#00d4ff' },
          { icon: Database, label: 'Supabase',     color: '#00ff88' },
          { icon: Lock,     label: 'RLS Enabled',  color: '#ffd700' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={9} color={color} />
            <span style={{ fontSize: 7, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.30)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
