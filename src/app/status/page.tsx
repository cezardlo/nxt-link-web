'use client';

import { useEffect, useState, useCallback } from 'react';

type AgentRun = {
  name: string;
  schedule: string;
  last_run: string | null;
  next_run: string;
  status: 'running' | 'success' | 'failed' | 'scheduled';
  description: string;
  color: string;
};

type AgentTeamMember = {
  role: string;
  description: string;
  status: string;
  library: string;
  color: string;
};

type AgentTeamData = {
  agents: Record<string, AgentTeamMember>;
  health?: { status: string; apiResponseTime: number };
  timestamp?: string;
};

type PlatformStat = {
  label: string;
  value: string | number;
  color: string;
};

const AGENTS: AgentRun[] = [
  {
    name: 'Agent Pipeline',
    schedule: 'Every 6 hours',
    last_run: null,
    next_run: 'Next: midnight UTC',
    status: 'scheduled',
    description: 'Full 7-layer intelligence pipeline — signals, predictions, opportunities, vendor scores',
    color: '#00d4ff',
  },
  {
    name: 'ML Observer Pipeline',
    schedule: 'Nightly 3am UTC',
    last_run: null,
    next_run: 'Next: 3:00 AM UTC',
    status: 'scheduled',
    description: 'Python ML pipeline — collect RSS feeds, classify signals, extract deployments, push to Supabase',
    color: '#a855f7',
  },
  {
    name: 'Live Search Engine',
    schedule: 'On demand (cached 5min)',
    last_run: null,
    next_run: 'Triggered by /ask searches',
    status: 'scheduled',
    description: 'Scans 10 sources: Google News, GDELT, Patents, OpenAlex, Grants.gov, SAM.gov, Wikipedia, Hacker News, PubMed, DuckDuckGo',
    color: '#00ff88',
  },
  {
    name: 'Feed Agent',
    schedule: 'Every 5 minutes',
    last_run: null,
    next_run: 'Rolling',
    status: 'scheduled',
    description: 'Fetches 64+ RSS feeds across 8 industries, enriches with Gemini AI, powers FeedBar',
    color: '#f97316',
  },
  {
    name: 'Source Discovery',
    schedule: 'Per /ask query',
    last_run: null,
    next_run: 'On demand',
    status: 'scheduled',
    description: 'Auto-discovers 15 industry-specific RSS feeds per search query',
    color: '#ffd700',
  },
];

const PIPELINE_STEPS = [
  { name: 'Signal Intake', desc: 'RSS feeds, APIs, news sources', color: '#00d4ff', icon: '📡' },
  { name: 'Knowledge Engine', desc: 'Graph updates, entity resolution', color: '#a855f7', icon: '🧠' },
  { name: 'Reasoning', desc: 'Pattern detection, scoring', color: '#00ff88', icon: '⚡' },
  { name: 'Prediction', desc: 'Trajectory forecasts, convergence', color: '#ffd700', icon: '🔮' },
  { name: 'Creation', desc: 'Industry profiles, reports', color: '#f97316', icon: '🏗️' },
  { name: 'Publishing', desc: 'Push to platform, update pages', color: '#34d399', icon: '📤' },
  { name: 'Quality Control', desc: 'Dedup, verify, confidence scoring', color: '#60a5fa', icon: '✅' },
];

const SOURCES = [
  { name: 'Google News RSS', status: 'live', color: '#4285F4' },
  { name: 'GDELT Events', status: 'live', color: '#e53935' },
  { name: 'PatentsView', status: 'live', color: '#a855f7' },
  { name: 'OpenAlex Papers', status: 'live', color: '#60a5fa' },
  { name: 'Grants.gov', status: 'live', color: '#34d399' },
  { name: 'SAM.gov Contracts', status: 'live', color: '#ffd700' },
  { name: 'Wikipedia', status: 'live', color: '#ccc' },
  { name: 'Hacker News', status: 'live', color: '#ff6600' },
  { name: 'PubMed / NCBI', status: 'live', color: '#2196F3' },
  { name: 'DuckDuckGo', status: 'live', color: '#de5833' },
  { name: '64+ RSS Feeds', status: 'live', color: '#00ff88' },
  { name: 'Firecrawl Scraper', status: 'ready', color: '#f97316' },
];

export default function StatusPage() {
  const [now, setNow] = useState(new Date());
  const [pulsePhase, setPulsePhase] = useState(0);
  const [agentTeam, setAgentTeam] = useState<AgentTeamData | null>(null);

  const fetchAgentStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/status');
      if (res.ok) {
        const data = (await res.json()) as AgentTeamData;
        setAgentTeam(data);
      }
    } catch {
      // Non-fatal — status page still works without agent data
    }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    const pulse = setInterval(() => setPulsePhase(p => (p + 0.02) % 1), 50);
    void fetchAgentStatus();
    const agentPoll = setInterval(() => void fetchAgentStatus(), 30_000);
    return () => { clearInterval(tick); clearInterval(pulse); clearInterval(agentPoll); };
  }, [fetchAgentStatus]);

  const stats: PlatformStat[] = [
    { label: 'Data Sources', value: '12 active', color: '#00d4ff' },
    { label: 'Agent Runs / Day', value: '4+ scheduled', color: '#00ff88' },
    { label: 'Industries Tracked', value: '20+', color: '#a855f7' },
    { label: 'RSS Feeds', value: '64+', color: '#f97316' },
    { label: 'Uptime', value: '24/7', color: '#00ff88' },
    { label: 'Deploy', value: 'Vercel Edge', color: '#ffd700' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]"
                style={{ boxShadow: `0 0 ${4 + pulsePhase * 8}px #00ff88` }} />
              <span className="font-mono text-[9px] tracking-[0.3em] text-[#00ff88]/70 uppercase">All Systems Operational</span>
            </div>
            <h1 className="font-mono text-[11px] tracking-[0.4em] text-white/20 uppercase mb-1">NXT//LINK</h1>
            <p className="text-2xl text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Agent Status Dashboard
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] text-white/20">CURRENT TIME</p>
            <p className="font-mono text-lg text-[#00d4ff] tabular-nums">
              {now.toUTCString().slice(17, 25)} UTC
            </p>
            <p className="font-mono text-[9px] text-white/20">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="border border-white/[0.06] rounded-sm p-3 text-center">
              <p className="font-mono text-[9px] text-white/20 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="font-mono text-[13px]" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Agent Team */}
        <div className="border border-white/[0.06] rounded-sm overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">Agent Team</span>
            {agentTeam?.health && (
              <span className="font-mono text-[8px]"
                style={{ color: agentTeam.health.status === 'healthy' ? '#00ff88' : agentTeam.health.status === 'degraded' ? '#ffd700' : '#ff3b30' }}>
                {agentTeam.health.status.toUpperCase()} · {agentTeam.health.apiResponseTime}ms
              </span>
            )}
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {agentTeam
              ? Object.entries(agentTeam.agents).map(([key, agent]) => {
                  const statusColor = agent.status === 'running' ? '#00ff88'
                    : agent.status === 'working' ? '#00d4ff'
                    : agent.status === 'error' ? '#ff3b30'
                    : '#ffffff30';
                  return (
                    <div key={key}
                      className="border rounded-sm p-3 relative overflow-hidden"
                      style={{ borderColor: `${agent.color}20`, background: `${agent.color}06` }}>
                      {/* Status dot */}
                      <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                      {/* Role */}
                      <p className="font-mono text-[13px] font-medium mb-0.5" style={{ color: agent.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                        {agent.role}
                      </p>
                      {/* Description */}
                      <p className="font-mono text-[8px] text-white/30 leading-relaxed mb-2">{agent.description}</p>
                      {/* Library badge */}
                      <span className="font-mono text-[7px] tracking-wide px-1.5 py-0.5 rounded-sm"
                        style={{ color: agent.color, background: `${agent.color}18`, border: `1px solid ${agent.color}30` }}>
                        {agent.library}
                      </span>
                    </div>
                  );
                })
              : Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border border-white/[0.04] rounded-sm p-3 animate-pulse bg-white/[0.02]">
                    <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
                    <div className="h-2 w-full bg-white/[0.04] rounded mb-1" />
                    <div className="h-2 w-3/4 bg-white/[0.04] rounded" />
                  </div>
                ))
            }
          </div>
        </div>

        {/* 7-Layer Pipeline */}
        <div className="border border-white/[0.06] rounded-sm overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">7-Layer Intelligence Pipeline</span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.name} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center min-w-[90px]">
                    <div className="w-10 h-10 rounded-sm border flex items-center justify-center mb-1 text-lg"
                      style={{ borderColor: `${step.color}40`, background: `${step.color}10` }}>
                      {step.icon}
                    </div>
                    <span className="font-mono text-[7px] text-center leading-tight" style={{ color: `${step.color}cc` }}>
                      {step.name}
                    </span>
                    <span className="font-mono text-[6px] text-white/20 text-center leading-tight mt-0.5">
                      {step.desc}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <span className="font-mono text-white/10 mx-1 mb-4">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Agents */}
        <div className="border border-white/[0.06] rounded-sm overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">Running Agents</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {AGENTS.map((agent) => {
              const statusColor = agent.status === 'running' ? '#00ff88'
                : agent.status === 'success' ? '#00d4ff'
                : agent.status === 'failed' ? '#ff3b30'
                : '#ffd700';
              return (
                <div key={agent.name} className="px-4 py-3 flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full"
                      style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-0.5">
                      <span className="font-mono text-[12px]" style={{ color: agent.color }}>{agent.name}</span>
                      <span className="font-mono text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
                        style={{ color: statusColor, background: `${statusColor}15` }}>
                        {agent.status}
                      </span>
                      <span className="font-mono text-[8px] text-white/20">{agent.schedule}</span>
                    </div>
                    <p className="font-mono text-[9px] text-white/30 leading-relaxed">{agent.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-[8px] text-white/20">{agent.next_run}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Sources */}
        <div className="border border-white/[0.06] rounded-sm overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">Intelligence Sources</span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex items-center gap-2 p-2 border border-white/[0.04] rounded-sm">
                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: s.status === 'live' ? s.color : '#334155',
                    boxShadow: s.status === 'live' ? `0 0 4px ${s.color}` : undefined }} />
                <span className="font-mono text-[8px] text-white/40 truncate">{s.name}</span>
                <span className="font-mono text-[6px] ml-auto shrink-0"
                  style={{ color: s.status === 'live' ? '#00ff88' : '#ffd700' }}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* How to monitor */}
        <div className="border border-[#00d4ff]/15 rounded-sm p-4 bg-[#00d4ff]/[0.02]">
          <p className="font-mono text-[9px] tracking-[0.2em] text-[#00d4ff]/50 uppercase mb-3">HOW TO MONITOR OVERNIGHT</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'GitHub Actions',
                desc: 'Check live run logs at github.com → Actions tab. Runs automatically every 6 hours + nightly at 3am UTC.',
                link: 'https://github.com/cezardlos/nxt-link-web/actions',
                color: '#00d4ff',
              },
              {
                title: 'This Page',
                desc: 'Bookmark /status — refreshes every second showing current agent states and source health.',
                link: '/status',
                color: '#00ff88',
              },
              {
                title: 'Production Site',
                desc: 'nxtlinktech.com stays live 24/7 on Vercel Edge Network — globally distributed, zero downtime.',
                link: 'https://www.nxtlinktech.com',
                color: '#ffd700',
              },
            ].map((item) => (
              <div key={item.title} className="space-y-1">
                <p className="font-mono text-[10px]" style={{ color: item.color }}>{item.title}</p>
                <p className="font-mono text-[8px] text-white/30 leading-relaxed">{item.desc}</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[8px] hover:opacity-80 transition-opacity"
                  style={{ color: `${item.color}80` }}>
                  {item.link} ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
