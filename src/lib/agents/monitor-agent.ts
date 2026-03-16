// src/lib/agents/monitor-agent.ts
// Monitor Agent — watches for anomalies, signal spikes, and platform health.
// Runs as part of the CEO agent's daily briefing cycle.

// ─── Types ───────────────────────────────────────────────────────────────────

export type MonitorAlertType =
  | 'signal_spike'
  | 'new_company'
  | 'funding_event'
  | 'platform_error'
  | 'new_technology';

export type MonitorSeverity = 'critical' | 'high' | 'medium' | 'low';

export type MonitorAlert = {
  id: string;
  type: MonitorAlertType;
  severity: MonitorSeverity;
  title: string;
  description: string;
  industry?: string;
  detectedAt: string;
  acknowledged: boolean;
};

export type AgentStatusEntry = 'running' | 'idle' | 'error';

export type PlatformHealth = {
  status: 'healthy' | 'degraded' | 'down';
  apiResponseTime: number;
  lastSignalUpdate: string;
  activeAlerts: MonitorAlert[];
  agentStatuses: Record<string, AgentStatusEntry>;
};

// ─── What-Changed data shape (from /api/what-changed) ────────────────────────

type WhatChangedData = {
  signalsToday?: number;
  signalsWeek?: number;
  topIndustries?: string[];
};

// ─── Platform Health Check ────────────────────────────────────────────────────

/**
 * Pings all key API endpoints and reports overall platform health.
 * Response time is the sum of parallel checks (wall-clock time).
 */
export async function checkPlatformHealth(baseUrl: string): Promise<PlatformHealth> {
  const start = Date.now();
  const alerts: MonitorAlert[] = [];

  const endpoints = ['/api/feeds', '/api/what-changed', '/api/opportunities'];

  const checks = await Promise.allSettled(
    endpoints.map(ep =>
      fetch(`${baseUrl}${ep}`, { signal: AbortSignal.timeout(5_000) }),
    ),
  );

  const responseTime = Date.now() - start;

  const failedEndpoints = endpoints.filter((_, i) => checks[i].status === 'rejected');
  const failedCount = failedEndpoints.length;

  if (failedCount > 0) {
    alerts.push({
      id: `alert-${Date.now()}`,
      type: 'platform_error',
      severity: failedCount >= 2 ? 'critical' : 'high',
      title: `${failedCount} API endpoint(s) not responding`,
      description: `${failedEndpoints.join(', ')} did not respond within 5s`,
      detectedAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  const platformStatus: PlatformHealth['status'] =
    failedCount === 0 ? 'healthy'
    : failedCount >= 2 ? 'down'
    : 'degraded';

  return {
    status: platformStatus,
    apiResponseTime: responseTime,
    lastSignalUpdate: new Date().toISOString(),
    activeAlerts: alerts,
    agentStatuses: {
      ceo: 'idle',
      researcher: 'idle',
      analyst: 'idle',
      builder: 'idle',
      monitor: 'running',
      scraper: 'idle',
    },
  };
}

// ─── Signal Spike Detection ───────────────────────────────────────────────────

/**
 * Detects whether today's signal volume is 2x above the 7-day daily average.
 * Returns an array of alerts (empty if no spikes detected).
 */
export async function detectSignalSpikes(whatChangedData: unknown): Promise<MonitorAlert[]> {
  const alerts: MonitorAlert[] = [];
  const data = whatChangedData as WhatChangedData;

  if (data?.signalsToday !== undefined && data?.signalsWeek !== undefined) {
    const dailyAvg = data.signalsWeek / 7;
    if (dailyAvg > 0 && data.signalsToday > dailyAvg * 2) {
      const multiplier = Math.round(data.signalsToday / dailyAvg);
      alerts.push({
        id: `spike-${Date.now()}`,
        type: 'signal_spike',
        severity: multiplier >= 4 ? 'critical' : 'high',
        title: `Signal spike: ${data.signalsToday} signals today`,
        description: `${multiplier}x above daily average. Top industries: ${(data.topIndustries ?? []).join(', ')}`,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
      });
    }
  }

  return alerts;
}

// ─── New Company Detection ────────────────────────────────────────────────────

/**
 * Creates a monitoring alert when a new company is detected in the graph.
 */
export function createNewCompanyAlert(
  companyName: string,
  industry: string,
): MonitorAlert {
  return {
    id: `company-${Date.now()}`,
    type: 'new_company',
    severity: 'medium',
    title: `New company detected: ${companyName}`,
    description: `${companyName} was discovered in the ${industry} sector`,
    industry,
    detectedAt: new Date().toISOString(),
    acknowledged: false,
  };
}

// ─── Funding Event Detection ──────────────────────────────────────────────────

/**
 * Creates a high-severity alert when a significant funding event is found.
 */
export function createFundingAlert(
  companyName: string,
  amountStr: string,
  industry: string,
): MonitorAlert {
  return {
    id: `funding-${Date.now()}`,
    type: 'funding_event',
    severity: 'high',
    title: `Funding event: ${companyName} raised ${amountStr}`,
    description: `Significant capital deployment detected in ${industry}`,
    industry,
    detectedAt: new Date().toISOString(),
    acknowledged: false,
  };
}
