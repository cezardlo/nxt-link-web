// src/app/command-center/types/intel.ts
// Shared TypeScript types for the NXT//LINK Command Center.

// ─── Mode ─────────────────────────────────────────────────────────────────────

export type Mode = 'MORNING' | 'WORLD' | 'EL PASO' | 'RESEARCH' | 'CONTRACTS';

// ─── Signals ──────────────────────────────────────────────────────────────────

export type SignalType =
  | 'vendor_mention'
  | 'contract_alert'
  | 'velocity_spike'
  | 'convergence'
  | 'sector_spike'
  | 'security_impact';

export type SignalPriority = 'critical' | 'high' | 'medium' | 'low';

export type IntelSignal = {
  id: string;
  type: SignalType;
  priority: SignalPriority;
  title: string;
  headline: string;
  industry: string;
  company?: string;
  /** 0–1 normalized importance score */
  importance: number;
  discoveredAt: string;
  source: string;
  url: string;
  /** [longitude, latitude] — optional if no geographic anchor */
  coordinates?: [number, number];
  /** 0–100 relevance to El Paso region */
  elPasoRelevance: number;
};

// ─── Morning Brief ────────────────────────────────────────────────────────────

export type BriefPriority = 'URGENT' | 'WATCH' | 'OPPORTUNITY';

export type BriefItem = {
  id: string;
  priority: BriefPriority;
  headline: string;
  /** Two-line context explaining why this matters */
  context: string;
  sourceUrl: string;
  sourceName: string;
  /** 0–100 relevance to El Paso region */
  elPasoRelevance: number;
  industry: string;
};

// ─── Watch List ───────────────────────────────────────────────────────────────

export type WatchItem = {
  id: string;
  /** Display label shown in the panel */
  label: string;
  /** Search query used to match signals */
  query: string;
  signalCount: number;
  lastUpdated: string;
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export type Alert = {
  id: string;
  type: SignalType;
  headline: string;
  detail: string;
  url: string;
  createdAt: string;
  read: boolean;
};

// ─── Sector Scores ────────────────────────────────────────────────────────────

export type SectorScore = {
  industry: string;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  signalCount: number;
};

// ─── Trajectory Report ────────────────────────────────────────────────────────

export type SectorStatus = 'strong' | 'emerging' | 'early' | 'lagging';

export type TrajectoryReport = {
  location: string;
  now: {
    summary: string;
    sectors: Array<{
      name: string;
      status: SectorStatus;
    }>;
  };
  coming: {
    sixMonths: string[];
    twelveMonths: string[];
    twentyFourMonths: string[];
  };
  opportunities: string[];
  windowToAct: 'NOW' | 'SOON' | 'WAIT';
};

// ─── Feed ─────────────────────────────────────────────────────────────────────

export type FeedItemType = 'contract' | 'patent' | 'research' | 'signal';

export type FeedItem = {
  id: string;
  type: FeedItemType;
  headline: string;
  source: string;
  url: string;
  /** 0–100 quality score — items below 70 are filtered from the default feed */
  score: number;
  publishedAt: string;
  industry?: string;
};

// ─── API response shapes (raw, before normalization) ─────────────────────────

/** Shape returned by /api/what-changed */
export type WhatChangedResponse = {
  signals_today: number;
  signals_week: number;
  top_signals: Array<{
    title: string;
    signal_type: string;
    industry: string;
    company: string | null;
    importance: number;
    discovered_at: string;
    url?: string;
  }>;
  active_industries: string[];
  funding_total_30d: number;
};

/** Shape returned by /api/intelligence/daily-brief */
export type DailyBriefResponse = {
  executiveSummary: string;
  sections: Array<{
    title: string;
    priority: 'critical' | 'high' | 'standard';
    summary: string;
    keyDevelopments: string[];
    signalCount: number;
    sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  }>;
  crossCuttingThemes: string[];
  watchList: string[];
  totalSignalsProcessed: number;
  generatedAt: string;
};

/** Shape returned by /api/intel-signals */
export type IntelSignalsResponse = {
  signals?: Array<{
    title: string;
    signal_type: string;
    industry: string;
    company: string | null;
    importance_score: number;
    discovered_at: string;
    url?: string;
    confidence?: number;
  }>;
  sectorScores?: Record<string, number>;
  by_industry?: Record<string, number>;
  source?: 'supabase' | 'memory';
};

/** Shape returned by /api/feeds GET */
export type FeedsResponse = {
  all: Array<{
    id: string;
    title: string;
    source: string;
    category: string;
    link?: string;
    pubDate?: string;
    score?: number;
  }>;
  as_of: string;
  enriched: boolean;
  source_count: number;
};
