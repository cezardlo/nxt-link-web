import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 2500;

const BRAIN_BASE = process.env.NEXT_PUBLIC_BRAIN_URL?.replace(/\/+$/, '') ?? '';

type JsonRecord = Record<string, unknown>;

export type BrainSignal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url?: string | null;
  confidence?: number;
};

export type DecisionPayload = {
  type: 'CALL_SOMEONE' | 'WATCH_THIS' | 'ACT_BEFORE_DATE' | 'KEEP_WATCHING';
  headline: string;
  detail: string;
  vendor_name?: string;
  vendor_url?: string;
  vendor_score?: number;
  timeline?: string;
  trigger?: string;
  // brain.py format aliases (normalized on read)
  action?: string;
  why?: string;
  urgency?: string;
};

export type MorningData = {
  one_thing: DecisionPayload;
  top_signals: BrainSignal[];
  industry_movement: Array<{ sector: string; momentum: string; signal_count: number }>;
  morning_brief: JsonRecord | null;
  changed: JsonRecord;
  agent_runs: JsonRecord[];
};

export type WorldData = {
  topic: string;
  global: string;
  heading: string;
  el_paso: string;
  signals: Array<{ title: string; category: string; source: string; published: string; url: string }>;
};

export type MapData = {
  signals: BrainSignal[];
  dots: Array<{ id: string; x: number; y: number; tier: 'P0' | 'P1' | 'P2' }>;
};

export type IndustryData = {
  industry: string;
  trending_sectors: Array<{ name: string; momentum: string; signal_count: number }>;
  resources: {
    technologies: JsonRecord[];
    products: JsonRecord[];
    vendors: JsonRecord[];
    conferences: JsonRecord[];
    intel_signals: JsonRecord[];
  };
};

export type ResourceData = {
  topic: string;
  decision: DecisionPayload;
  results: JsonRecord[];
};

export type SignalsData = {
  signals: BrainSignal[];
  trends: JsonRecord[];
  forecasts: JsonRecord[];
  opportunities: JsonRecord[];
  connections: JsonRecord[];
  enriched_signals: JsonRecord[];
};

export type DecideData = {
  decision: DecisionPayload;
  response: JsonRecord;
};

export type LoadingState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
};

const MORNING_FALLBACK: MorningData = {
  one_thing: {
    type: 'KEEP_WATCHING',
    headline: 'Intelligence pipeline warming up',
    detail: 'Signals are loading from the latest scan. Refresh in a moment.',
    trigger: 'New high-priority signal appears',
  },
  top_signals: [],
  industry_movement: [],
  morning_brief: null,
  changed: {},
  agent_runs: [],
};

const WORLD_FALLBACK: WorldData = {
  topic: 'general',
  global: 'Global intelligence feed is syncing now.',
  heading: 'Momentum is building in multiple sectors.',
  el_paso: 'El Paso outlook will refresh on next sync.',
  signals: [],
};

const MAP_FALLBACK: MapData = {
  signals: [],
  dots: [],
};

const INDUSTRY_FALLBACK: IndustryData = {
  industry: 'all',
  trending_sectors: [],
  resources: {
    technologies: [],
    products: [],
    vendors: [],
    conferences: [],
    intel_signals: [],
  },
};

const RESOURCES_FALLBACK: ResourceData = {
  topic: 'general',
  decision: {
    type: 'KEEP_WATCHING',
    headline: 'No strong signal yet',
    detail: 'Data is still loading for this topic.',
    trigger: 'A new signal crosses threshold',
  },
  results: [],
};

const SIGNALS_FALLBACK: SignalsData = {
  signals: [],
  trends: [],
  forecasts: [],
  opportunities: [],
  connections: [],
  enriched_signals: [],
};

const DECIDE_FALLBACK: DecideData = {
  decision: {
    type: 'KEEP_WATCHING',
    headline: 'Decision engine is warming up',
    detail: 'Try again once the latest intelligence pass completes.',
    trigger: 'Run morning brief',
  },
  response: {},
};

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildCandidates(primaryPath: string, localPaths: string[]): string[] {
  const candidates: string[] = [];
  if (BRAIN_BASE) candidates.push(`${BRAIN_BASE}${primaryPath}`);
  return candidates.concat(localPaths);
}

function toBrainSignal(signal: JsonRecord): BrainSignal {
  return {
    title: String(signal.title ?? ''),
    signal_type: String(signal.signal_type ?? signal.type ?? 'general'),
    industry: String(signal.industry ?? 'General'),
    company: signal.company ? String(signal.company) : null,
    importance: Number(signal.importance ?? signal.importance_score ?? 0),
    discovered_at: String(signal.discovered_at ?? new Date().toISOString()),
    url: signal.url ? String(signal.url) : null,
    confidence: signal.confidence ? Number(signal.confidence) : undefined,
  };
}

function decisionFromSignal(signal: BrainSignal): DecisionPayload {
  if (signal.signal_type === 'regulatory_action') {
    return {
      type: 'ACT_BEFORE_DATE',
      headline: 'A regulation is changing, move within 90 days',
      detail: signal.title.slice(0, 140),
      timeline: '90 days',
    };
  }
  if (signal.importance >= 0.85) {
    return {
      type: 'WATCH_THIS',
      headline: `Watch ${signal.industry}, urgency is rising`,
      detail: signal.title.slice(0, 140),
      timeline: '72 hours',
    };
  }
  return {
    type: 'KEEP_WATCHING',
    headline: `Track ${signal.industry} this week`,
    detail: signal.title.slice(0, 140),
    trigger: 'Contract award or funding round > $50M',
  };
}

async function fetchJson(url: string): Promise<JsonRecord | null> {
  try {
    const response = await fetchWithRetry(
      url,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
      {
        retries: 0,
        cacheTtlMs: FIVE_MINUTES_MS,
        staleIfErrorMs: FIVE_MINUTES_MS,
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as JsonRecord;
  } catch {
    return null;
  }
}

async function postJson(url: string, body: JsonRecord): Promise<JsonRecord | null> {
  try {
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
      { retries: 0 },
    );
    if (!response.ok) return null;
    return (await response.json()) as JsonRecord;
  } catch {
    return null;
  }
}

async function fetchFirst(paths: string[]): Promise<JsonRecord | null> {
  for (const path of paths) {
    const data = await fetchJson(path);
    if (data) return data;
  }
  return null;
}

function toDot(signal: BrainSignal, index: number): { id: string; x: number; y: number; tier: 'P0' | 'P1' | 'P2' } {
  const hash = signal.title.split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
  const x = Math.abs(hash % 100);
  const y = Math.abs((hash >> 7) % 100);
  const tier: 'P0' | 'P1' | 'P2' = signal.importance >= 0.85 ? 'P0' : signal.importance >= 0.65 ? 'P1' : 'P2';
  return { id: `${toSlug(signal.industry)}-${index}`, x, y, tier };
}

function normalizeDecision(raw: JsonRecord): DecisionPayload {
  // brain.py returns {action, why, urgency, vendor_name, vendor_url, vendor_score}
  // Next.js expects {type, headline, detail, vendor_name, vendor_url}
  const headline = String(raw.headline ?? raw.action ?? '');
  const detail = String(raw.detail ?? raw.why ?? '');
  const urgency = String(raw.urgency ?? '');
  let type: DecisionPayload['type'] = 'KEEP_WATCHING';
  if ((raw.contact_type as string | undefined)?.includes('call') || raw.type === 'CALL_SOMEONE') type = 'CALL_SOMEONE';
  else if (urgency && Number(urgency) <= 24) type = 'WATCH_THIS';
  else if (raw.type === 'ACT_BEFORE_DATE') type = 'ACT_BEFORE_DATE';
  else if (raw.type) type = raw.type as DecisionPayload['type'];
  return {
    type,
    headline: headline || 'Check today\'s intelligence',
    detail: detail || '',
    vendor_name: raw.vendor_name ? String(raw.vendor_name) : undefined,
    vendor_url: raw.vendor_url ? String(raw.vendor_url) : undefined,
    vendor_score: raw.vendor_score ? Number(raw.vendor_score) : undefined,
    timeline: raw.timeline ? String(raw.timeline) : undefined,
  };
}

async function getMorningFromLocal(): Promise<MorningData> {
  const [signalsRaw, changedRaw, runsRaw, briefRaw] = await Promise.all([
    fetchJson('/api/intel-signals?limit=20'),
    fetchJson('/api/what-changed'),
    fetchJson('/api/agents/runs'),
    fetchJson('/api/intelligence/morning-brief'),
  ]);

  const top_signals = Array.isArray(signalsRaw?.signals)
    ? (signalsRaw?.signals as JsonRecord[]).slice(0, 10).map(toBrainSignal)
    : [];

  const changedData = ((changedRaw?.data as JsonRecord | undefined) ?? changedRaw ?? {}) as JsonRecord;
  const agentRuns = (Array.isArray(runsRaw?.runs) ? (runsRaw?.runs as JsonRecord[]) : []) ?? [];
  const morningBrief = (briefRaw?.data as JsonRecord | undefined) ?? null;

  const industryMovement = Array.isArray((morningBrief as JsonRecord | null)?.sector_snapshots)
    ? ((morningBrief as JsonRecord).sector_snapshots as JsonRecord[]).map((snapshot) => ({
        sector: String(snapshot.sector ?? 'General'),
        momentum: String(snapshot.momentum ?? 'steady'),
        signal_count: Number(snapshot.signal_count ?? 0),
      }))
    : [];

  return {
    one_thing: top_signals[0] ? decisionFromSignal(top_signals[0]) : MORNING_FALLBACK.one_thing,
    top_signals,
    industry_movement: industryMovement,
    morning_brief: morningBrief,
    changed: changedData,
    agent_runs: agentRuns,
  };
}

async function getSignalsFromLocal(): Promise<SignalsData> {
  const [signalsRaw, trendsRaw, predictionsRaw, opportunitiesRaw, connectionsRaw, enrichedRaw] = await Promise.all([
    fetchJson('/api/intel-signals'),
    fetchJson('/api/trends/reasoning'),
    fetchJson('/api/predictions'),
    fetchJson('/api/opportunities'),
    fetchJson('/api/intelligence/connections'),
    fetchJson('/api/intelligence/enriched-signals'),
  ]);

  const signals = Array.isArray(signalsRaw?.signals) ? (signalsRaw?.signals as JsonRecord[]).map(toBrainSignal) : [];
  const trends = Array.isArray((trendsRaw?.data as JsonRecord | undefined)?.sectors)
    ? (((trendsRaw?.data as JsonRecord).sectors as JsonRecord[]) ?? [])
    : [];
  const forecasts = Array.isArray((predictionsRaw?.data as JsonRecord | undefined)?.trajectories)
    ? (((predictionsRaw?.data as JsonRecord).trajectories as JsonRecord[]) ?? [])
    : [];
  const opportunities = Array.isArray((opportunitiesRaw?.data as JsonRecord | undefined)?.opportunities)
    ? (((opportunitiesRaw?.data as JsonRecord).opportunities as JsonRecord[]) ?? [])
    : [];
  const connections = Array.isArray(connectionsRaw?.chains) ? (connectionsRaw?.chains as JsonRecord[]) : [];
  const enrichedSignals = Array.isArray(enrichedRaw?.data) ? (enrichedRaw?.data as JsonRecord[]) : [];

  return { signals, trends, forecasts, opportunities, connections, enriched_signals: enrichedSignals };
}

export const Brain = {
  baseUrl: BRAIN_BASE,

  async morning(): Promise<MorningData> {
    const external = await fetchFirst(buildCandidates('/api/morning', []));
    if (external && (external.one_thing || external.top_signals)) {
      const top = Array.isArray(external.top_signals) ? (external.top_signals as JsonRecord[]).map(toBrainSignal) : [];
      return {
        one_thing: external.one_thing ? normalizeDecision(external.one_thing as JsonRecord) : (top[0] ? decisionFromSignal(top[0]) : MORNING_FALLBACK.one_thing),
        top_signals: top,
        industry_movement: Array.isArray(external.industry_movement) ? (external.industry_movement as MorningData['industry_movement']) : [],
        morning_brief: (external.morning_brief as JsonRecord | undefined) ?? null,
        changed: (external.changed as JsonRecord | undefined) ?? {},
        agent_runs: Array.isArray(external.agent_runs) ? (external.agent_runs as JsonRecord[]) : [],
      };
    }

    try {
      return await getMorningFromLocal();
    } catch {
      return MORNING_FALLBACK;
    }
  },

  async world(topic: string): Promise<WorldData> {
    const cleanTopic = topic.trim() || 'general';
    const slug = toSlug(cleanTopic);

    const external = await fetchFirst(buildCandidates(`/api/world/${slug}`, []));
    if (external && (external.global || external.heading || external.el_paso)) {
      return {
        topic: cleanTopic,
        global: String(external.global ?? WORLD_FALLBACK.global),
        heading: String(external.heading ?? WORLD_FALLBACK.heading),
        el_paso: String(external.el_paso ?? WORLD_FALLBACK.el_paso),
        signals: Array.isArray(external.signals) ? (external.signals as WorldData['signals']) : [],
      };
    }

    const [searchRaw, raceRaw] = await Promise.all([
      fetchJson(`/api/discover/search?q=${encodeURIComponent(cleanTopic)}&type=all&limit=6`),
      fetchJson(`/api/world/tech-race?tech=${encodeURIComponent(cleanTopic)}`),
    ]);

    const searchResults = Array.isArray(searchRaw?.results) ? (searchRaw?.results as JsonRecord[]) : [];
    const rankings = Array.isArray((raceRaw?.data as JsonRecord | undefined)?.rankings)
      ? (((raceRaw?.data as JsonRecord).rankings as JsonRecord[]) ?? [])
      : [];
    const topCountry = rankings[0];

    if (searchResults.length === 0 && rankings.length === 0) return { ...WORLD_FALLBACK, topic: cleanTopic };

    return {
      topic: cleanTopic,
      global: topCountry
        ? `${String(topCountry.country_name ?? 'Global leader')} is leading this race with a score of ${String(topCountry.score ?? 'n/a')}.`
        : `Global movement is visible around ${cleanTopic}.`,
      heading: searchResults[0]
        ? `Top signal: ${String(searchResults[0].name ?? cleanTopic)}.`
        : `No direct signal headline found for ${cleanTopic}.`,
      el_paso: `Use this signal to evaluate local opportunities in El Paso procurement, vendor readiness, and timing.`,
      signals: [],
    };
  },

  async map(): Promise<MapData> {
    const external = await fetchFirst(buildCandidates('/api/map/world', []));
    if (external && Array.isArray(external.signals)) {
      const signals = (external.signals as JsonRecord[]).map(toBrainSignal);
      return { signals, dots: signals.map(toDot) };
    }

    const local = await fetchJson('/api/intel-signals?limit=80');
    const signals = Array.isArray(local?.signals) ? (local?.signals as JsonRecord[]).map(toBrainSignal) : [];
    if (signals.length === 0) return MAP_FALLBACK;
    return { signals, dots: signals.map(toDot) };
  },

  async industry(industry: string): Promise<IndustryData> {
    const slug = toSlug(industry || 'all');
    const external = await fetchFirst(buildCandidates(`/api/industry/${slug}`, []));
    if (external && (external.resources || external.trending_sectors)) {
      return {
        industry: String(external.industry ?? slug),
        trending_sectors: Array.isArray(external.trending_sectors) ? (external.trending_sectors as IndustryData['trending_sectors']) : [],
        resources: (external.resources as IndustryData['resources'] | undefined) ?? INDUSTRY_FALLBACK.resources,
      };
    }

    const [industryRaw, trendRaw] = await Promise.all([
      fetchJson(`/api/industry/${slug}`),
      fetchJson('/api/trends/reasoning'),
    ]);

    const trendSectors = Array.isArray((trendRaw?.data as JsonRecord | undefined)?.sectors)
      ? ((trendRaw?.data as JsonRecord).sectors as JsonRecord[])
      : [];

    const normalizedTrends = trendSectors.map((s) => ({
      name: String(s.name ?? 'General'),
      momentum: String(s.momentum ?? 'steady'),
      signal_count: Number(s.signal_count ?? 0),
    }));

    if (industryRaw) {
      return {
        industry: slug,
        trending_sectors: normalizedTrends,
        resources: {
          technologies: Array.isArray(industryRaw.technologies) ? (industryRaw.technologies as JsonRecord[]) : [],
          products: Array.isArray(industryRaw.products) ? (industryRaw.products as JsonRecord[]) : [],
          vendors: Array.isArray(industryRaw.vendors) ? (industryRaw.vendors as JsonRecord[]) : [],
          conferences: Array.isArray(industryRaw.conferences) ? (industryRaw.conferences as JsonRecord[]) : [],
          intel_signals: Array.isArray(industryRaw.intelSignals) ? (industryRaw.intelSignals as JsonRecord[]) : [],
        },
      };
    }

    return { ...INDUSTRY_FALLBACK, industry: slug, trending_sectors: normalizedTrends };
  },

  async resources(topic: string): Promise<ResourceData> {
    const slug = toSlug(topic || 'general');
    const external = await fetchFirst(buildCandidates(`/api/resources/${slug}`, []));
    if (external && Array.isArray(external.results)) {
      return {
        topic: String(external.topic ?? topic),
        decision: (external.decision as DecisionPayload | undefined) ?? RESOURCES_FALLBACK.decision,
        results: external.results as JsonRecord[],
      };
    }

    const searchRaw = await fetchJson(`/api/discover/search?q=${encodeURIComponent(topic)}&type=all&limit=12`);
    const results = Array.isArray(searchRaw?.results) ? (searchRaw?.results as JsonRecord[]) : [];

    return {
      topic: topic || RESOURCES_FALLBACK.topic,
      decision: results.length > 0
        ? {
            type: 'WATCH_THIS',
            headline: `Resource map for ${topic}`,
            detail: `Found ${results.length} related entries across vendors, technology, and hubs.`,
          }
        : RESOURCES_FALLBACK.decision,
      results,
    };
  },

  async signals(): Promise<SignalsData> {
    const external = await fetchFirst(buildCandidates('/api/signals', []));
    if (external && Array.isArray(external.signals)) {
      return {
        signals: (external.signals as JsonRecord[]).map(toBrainSignal),
        trends: Array.isArray(external.trends) ? (external.trends as JsonRecord[]) : [],
        forecasts: Array.isArray(external.forecasts) ? (external.forecasts as JsonRecord[]) : [],
        opportunities: Array.isArray(external.opportunities) ? (external.opportunities as JsonRecord[]) : [],
        connections: Array.isArray(external.connections) ? (external.connections as JsonRecord[]) : [],
        enriched_signals: Array.isArray(external.enriched_signals) ? (external.enriched_signals as JsonRecord[]) : [],
      };
    }

    try {
      const local = await getSignalsFromLocal();
      return local.signals.length > 0 ? local : SIGNALS_FALLBACK;
    } catch {
      return SIGNALS_FALLBACK;
    }
  },

  async enrichedSignals(): Promise<JsonRecord[]> {
    const data = await this.signals();
    return data.enriched_signals;
  },

  async decide(question: string): Promise<DecideData> {
    const payload = { question };
    const external = await postJson(`${BRAIN_BASE}/api/decide`, payload);
    if (external) {
      return {
        decision: (external.decision as DecisionPayload | undefined) ?? DECIDE_FALLBACK.decision,
        response: external,
      };
    }

    const local = await postJson('/api/ask', { query: question, location: 'El Paso, TX' });
    if (local) {
      return {
        decision: (local.decision as DecisionPayload | undefined) ?? DECIDE_FALLBACK.decision,
        response: local,
      };
    }

    return DECIDE_FALLBACK;
  },

  async withLoading<T>(promise: Promise<T>, fallback: T): Promise<LoadingState<T>> {
    try {
      const data = await promise;
      return { loading: false, data, error: null };
    } catch (err) {
      return {
        loading: false,
        data: fallback,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

