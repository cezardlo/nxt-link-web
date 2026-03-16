// src/app/api/agents/status/route.ts
// Returns full multi-agent system status: health, agent roster, last run metadata.

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { checkPlatformHealth } = await import('@/lib/agents/monitor-agent');
  const { sharedMemory } = await import('@/lib/agents/os/shared-memory');
  const { ceoAgent } = await import('@/lib/agents/ceo-agent');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const health = await checkPlatformHealth(baseUrl);

  const ceoStatus = ceoAgent.getStatus();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    health,
    lastRunId: sharedMemory.get<string>('current_run_id') ?? null,
    lastRunStarted: sharedMemory.get<string>('current_run_started') ?? null,
    lastDailyBriefing: sharedMemory.get('last_daily_briefing') ?? null,
    ceo: {
      goals: ceoStatus.goals,
      agenda: ceoStatus.agenda,
      lastUpdated: ceoStatus.lastUpdated,
    },
    agents: {
      ceo: {
        role: 'CEO',
        description: 'Orchestrates all agents, sets intelligence agenda, runs daily briefing',
        status: 'idle',
        library: 'custom',
        color: '#00d4ff',
      },
      researcher: {
        role: 'Researcher',
        description: 'Deep web research via NXT LINK Ask engine + Firecrawl scraping',
        status: ceoStatus.agents.find(a => a.role === 'researcher')?.status ?? 'idle',
        library: 'firecrawl + fetch',
        color: '#60a5fa',
      },
      analyst: {
        role: 'Analyst',
        description: 'Pattern detection, scoring, IKER calculation, opportunity ranking',
        status: ceoStatus.agents.find(a => a.role === 'analyst')?.status ?? 'idle',
        library: 'ask-engine + opportunity-engine',
        color: '#ffd700',
      },
      builder: {
        role: 'Builder',
        description: 'Creates industry profiles, diagrams, and intelligence reports',
        status: ceoStatus.agents.find(a => a.role === 'builder')?.status ?? 'idle',
        library: 'industry-profile + creation-engine',
        color: '#a855f7',
      },
      monitor: {
        role: 'Monitor',
        description: 'Watches for signal spikes, platform health, and anomaly alerts',
        status: 'running',
        library: 'monitor-agent (built-in)',
        color: '#00ff88',
      },
      scraper: {
        role: 'Scraper',
        description: 'Vendor website scraping via Firecrawl for deep product intelligence',
        status: ceoStatus.agents.find(a => a.role === 'scraper')?.status ?? 'idle',
        library: 'firecrawl + @playwright/test',
        color: '#f97316',
      },
    },
  });
}
