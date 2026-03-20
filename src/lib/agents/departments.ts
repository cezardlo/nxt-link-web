// ═══════════════════════════════════════════════════════════════════════════════
// AGENT DEPARTMENTS — Organized intelligence teams for El Paso
// ═══════════════════════════════════════════════════════════════════════════════
//
// Not individual agents — DEPARTMENTS. Each has a mission, runs multiple agents,
// and produces structured output that feeds into the next department.
//
// Pipeline: COLLECT → CONNECT → ANALYZE → PREDICT → BRIEF

import { getStoredFeedItems, type EnrichedFeedItem } from '@/lib/agents/feed-agent';
import {
  EP_ENTITIES,
  findEntitiesInText,
  processSignal,
  generateBrainSnapshot,
  type EPEntity,
  type ProcessedSignal,
} from '@/lib/intelligence/el-paso-brain';

// ── Department Types ────────────────────────────────────────────────────────

export type DepartmentId =
  | 'signal-collection'
  | 'entity-registry'
  | 'analysis'
  | 'prediction'
  | 'client-lens'
  | 'daily-brief';

export type DepartmentStatus = {
  id: DepartmentId;
  name: string;
  mission: string;
  agent_count: number;
  last_run: string | null;
  signals_processed: number;
  status: 'active' | 'warming' | 'idle' | 'error';
};

// ── Signal Collection Department ────────────────────────────────────────────

export type CollectionResult = {
  department: 'signal-collection';
  raw_signals: number;
  el_paso_relevant: number;
  sources_active: number;
  top_sources: string[];
  feed_items: EnrichedFeedItem[];
};

export function runSignalCollection(): CollectionResult {
  const store = getStoredFeedItems();
  const items = store?.items ?? [];

  // Filter for EP-relevant signals
  const epRelevant = items.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const epKeywords = [
      'el paso', 'fort bliss', 'border', 'cbp', 'juarez', 'utep',
      'raytheon', 'l3harris', 'saic', 'leidos', 'palantir',
      'maquiladora', 'bota', 'white sands', 'wsmr',
      'texas', 'army', 'defense contract', 'dod',
      'benchmark electronics', 'foxconn', 'aptiv',
      'ep electric', 'el paso electric', 'nextera',
      'cmmc', 'fedramp', 'itar', 'ctpat',
    ];
    return epKeywords.some((kw) => text.includes(kw));
  });

  const sourceCounts = new Map<string, number>();
  for (const item of items) {
    sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source]) => source);

  return {
    department: 'signal-collection',
    raw_signals: items.length,
    el_paso_relevant: epRelevant.length,
    sources_active: sourceCounts.size,
    top_sources: topSources,
    feed_items: epRelevant.slice(0, 100),
  };
}

// ── Entity Registry Department ──────────────────────────────────────────────

export type EntityRegistryResult = {
  department: 'entity-registry';
  total_entities: number;
  entities_with_signals: number;
  new_connections_found: number;
  entity_activity: Array<{
    entity: EPEntity;
    signal_count: number;
    recent_mentions: string[];
  }>;
  zones: Array<{
    zone: string;
    entity_count: number;
    total_signals: number;
    hottest_entity: string;
  }>;
};

export function runEntityRegistry(feedItems: EnrichedFeedItem[]): EntityRegistryResult {
  const entitySignals = new Map<string, { count: number; mentions: string[] }>();

  for (const item of feedItems) {
    const entities = findEntitiesInText(`${item.title} ${item.description}`);
    for (const entity of entities) {
      const existing = entitySignals.get(entity.id) ?? { count: 0, mentions: [] };
      existing.count++;
      if (existing.mentions.length < 5) existing.mentions.push(item.title);
      entitySignals.set(entity.id, existing);
    }
  }

  const entityActivity = EP_ENTITIES
    .map((entity) => {
      const signals = entitySignals.get(entity.id) ?? { count: 0, mentions: [] };
      return { entity, signal_count: signals.count, recent_mentions: signals.mentions };
    })
    .filter((e) => e.signal_count > 0)
    .sort((a, b) => b.signal_count - a.signal_count);

  // Count new connections discovered (entities mentioned together)
  let newConnections = 0;
  for (const item of feedItems) {
    const entities = findEntitiesInText(`${item.title} ${item.description}`);
    if (entities.length >= 2) {
      newConnections += entities.length * (entities.length - 1) / 2;
    }
  }

  // Zone aggregation
  const zoneMap = new Map<string, { entities: Set<string>; signals: number; hottest: string; hottestCount: number }>();
  for (const ea of entityActivity) {
    const zone = ea.entity.zone;
    const existing = zoneMap.get(zone) ?? { entities: new Set(), signals: 0, hottest: '', hottestCount: 0 };
    existing.entities.add(ea.entity.id);
    existing.signals += ea.signal_count;
    if (ea.signal_count > existing.hottestCount) {
      existing.hottest = ea.entity.name;
      existing.hottestCount = ea.signal_count;
    }
    zoneMap.set(zone, existing);
  }

  const zones = [...zoneMap.entries()]
    .map(([zone, data]) => ({
      zone,
      entity_count: data.entities.size,
      total_signals: data.signals,
      hottest_entity: data.hottest,
    }))
    .sort((a, b) => b.total_signals - a.total_signals);

  return {
    department: 'entity-registry',
    total_entities: EP_ENTITIES.length,
    entities_with_signals: entityActivity.length,
    new_connections_found: newConnections,
    entity_activity: entityActivity.slice(0, 20),
    zones,
  };
}

// ── Analysis Department ─────────────────────────────────────────────────────

export type AnalysisResult = {
  department: 'analysis';
  signals_analyzed: number;
  sector_breakdown: Array<{
    sector: string;
    signal_count: number;
    trend: 'surging' | 'active' | 'steady' | 'quiet';
    plain_summary: string;
    top_entities: string[];
    key_signals: string[];
  }>;
  patterns_detected: Array<{
    pattern: string;
    evidence: string[];
    confidence: 'high' | 'medium' | 'speculative';
  }>;
  contradictions: string[];
};

export function runAnalysis(signals: ProcessedSignal[]): AnalysisResult {
  // Sector aggregation
  const sectorMap = new Map<string, ProcessedSignal[]>();
  for (const sig of signals) {
    const arr = sectorMap.get(sig.sector) ?? [];
    arr.push(sig);
    sectorMap.set(sig.sector, arr);
  }

  const sectorBreakdown = [...sectorMap.entries()].map(([sector, sigs]) => {
    const breaking = sigs.filter((s) => s.urgency === 'breaking').length;
    const thisWeek = sigs.filter((s) => s.urgency === 'this_week').length;
    const trend: AnalysisResult['sector_breakdown'][0]['trend'] =
      breaking > 0 ? 'surging' : thisWeek > 2 ? 'active' : thisWeek > 0 ? 'steady' : 'quiet';

    const entities = [...new Set(sigs.flatMap((s) => s.entities_found.map((e) => e.name)))];
    const keySigs = sigs
      .filter((s) => s.urgency === 'breaking' || s.urgency === 'this_week')
      .map((s) => s.raw_title)
      .slice(0, 3);

    return {
      sector,
      signal_count: sigs.length,
      trend,
      plain_summary: `${sector}: ${sigs.length} signals detected. ${breaking > 0 ? `${breaking} breaking. ` : ''}${trend === 'surging' ? 'High activity — something big is moving.' : trend === 'active' ? 'Steady flow of developments.' : 'Quiet period.'}`,
      top_entities: entities.slice(0, 5),
      key_signals: keySigs,
    };
  }).sort((a, b) => b.signal_count - a.signal_count);

  // Pattern detection: entities mentioned 3+ times
  const entityMentions = new Map<string, number>();
  for (const sig of signals) {
    for (const e of sig.entities_found) {
      entityMentions.set(e.name, (entityMentions.get(e.name) ?? 0) + 1);
    }
  }

  const patterns = [...entityMentions.entries()]
    .filter(([, count]) => count >= 3)
    .map(([name, count]) => ({
      pattern: `${name} mentioned ${count} times — elevated activity`,
      evidence: signals
        .filter((s) => s.entities_found.some((e) => e.name === name))
        .map((s) => s.raw_title)
        .slice(0, 3),
      confidence: (count >= 5 ? 'high' : 'medium') as 'high' | 'medium' | 'speculative',
    }));

  return {
    department: 'analysis',
    signals_analyzed: signals.length,
    sector_breakdown: sectorBreakdown,
    patterns_detected: patterns,
    contradictions: [], // TODO: LLM-powered contradiction detection
  };
}

// ── Prediction Department ───────────────────────────────────────────────────

export type PredictionResult = {
  department: 'prediction';
  predictions: Array<{
    headline: string;
    explanation: string;
    confidence: 'high' | 'medium' | 'speculative';
    timeframe: string;
    sector: string;
    based_on: string[];
    affects: string[];
  }>;
  sector_momentum: Array<{
    sector: string;
    direction: 'accelerating' | 'steady' | 'decelerating';
    signal_velocity: number;
    prediction: string;
  }>;
};

export function runPredictions(signals: ProcessedSignal[], analysis: AnalysisResult): PredictionResult {
  const predictions: PredictionResult['predictions'] = [];

  // Generate predictions from signals with predictions
  for (const sig of signals) {
    if (sig.prediction) {
      predictions.push({
        headline: sig.prediction,
        explanation: `Based on: "${sig.raw_title}"`,
        confidence: sig.urgency === 'breaking' ? 'high' : sig.urgency === 'this_week' ? 'medium' : 'speculative',
        timeframe: sig.urgency === 'breaking' ? '30 days' : sig.urgency === 'this_week' ? '60 days' : '90 days',
        sector: sig.sector,
        based_on: [sig.raw_title],
        affects: sig.entities_found.map((e) => e.name),
      });
    }
  }

  // Generate predictions from patterns
  for (const pattern of analysis.patterns_detected) {
    if (pattern.confidence === 'high') {
      predictions.push({
        headline: `${pattern.pattern} — expect increased activity and possible announcements`,
        explanation: `Multiple signals converging on the same entity suggests something significant is developing.`,
        confidence: 'medium',
        timeframe: '30-60 days',
        sector: '',
        based_on: pattern.evidence,
        affects: [pattern.pattern.split(' mentioned')[0]],
      });
    }
  }

  // Sector momentum
  const sectorMomentum = analysis.sector_breakdown.map((sb) => ({
    sector: sb.sector,
    direction: (sb.trend === 'surging' ? 'accelerating' : sb.trend === 'active' ? 'steady' : 'decelerating') as PredictionResult['sector_momentum'][0]['direction'],
    signal_velocity: sb.signal_count,
    prediction: sb.trend === 'surging'
      ? `${sb.sector} is accelerating. Expect contract awards, hiring announcements, and vendor activity to increase over the next 60 days.`
      : sb.trend === 'active'
      ? `${sb.sector} has steady activity. No major shifts expected but stay alert for emerging patterns.`
      : `${sb.sector} is quiet. Either a lull between cycles or activity has shifted elsewhere.`,
  }));

  return {
    department: 'prediction',
    predictions: predictions.slice(0, 15),
    sector_momentum: sectorMomentum,
  };
}

// ── Daily Brief Department ──────────────────────────────────────────────────

export type DailyBriefResult = {
  department: 'daily-brief';
  generated_at: string;
  one_thing: {
    headline: string;
    explanation: string;
    action: string;
  };
  sector_status: Array<{
    sector: string;
    status: '🟢' | '🟡' | '🔴';
    label: string;
    signal_count: number;
  }>;
  top_signals: Array<{
    title: string;
    plain_english: string;
    sector: string;
    urgency: string;
  }>;
  predictions: Array<{
    headline: string;
    timeframe: string;
    confidence: string;
  }>;
  blind_spots: string[];
  actions: string[];
  entity_count: number;
  signal_count: number;
  connection_count: number;
};

export function generateDailyBrief(): DailyBriefResult {
  // Run the full pipeline
  const collection = runSignalCollection();
  const processed = collection.feed_items.map((item, i) => processSignal(item, i)).filter((s) => s.entities_found.length > 0);
  const entityResult = runEntityRegistry(collection.feed_items);
  const analysis = runAnalysis(processed);
  const predictions = runPredictions(processed, analysis);
  const snapshot = generateBrainSnapshot();

  // One thing — the most important signal
  const topSignal = processed.find((s) => s.urgency === 'breaking') ?? processed[0];
  const one_thing = topSignal
    ? {
        headline: topSignal.raw_title,
        explanation: topSignal.plain_english,
        action: topSignal.prediction ?? 'Monitor this development and assess impact on current operations.',
      }
    : {
        headline: 'Intelligence pipeline is warming up',
        explanation: 'Signals are being collected and processed. Check back in a few minutes.',
        action: 'Run POST /api/feeds to warm up the feed pipeline.',
      };

  // Sector status
  const sectorStatus = analysis.sector_breakdown.map((sb) => ({
    sector: sb.sector,
    status: (sb.trend === 'surging' ? '🟢' : sb.trend === 'active' ? '🟡' : '🔴') as '🟢' | '🟡' | '🔴',
    label: sb.trend === 'surging' ? 'Rising' : sb.trend === 'active' ? 'Active' : sb.trend === 'steady' ? 'Steady' : 'Quiet',
    signal_count: sb.signal_count,
  }));

  // Top signals
  const topSignals = processed
    .filter((s) => s.urgency === 'breaking' || s.urgency === 'this_week')
    .slice(0, 8)
    .map((s) => ({
      title: s.raw_title,
      plain_english: s.plain_english,
      sector: s.sector,
      urgency: s.urgency,
    }));

  // Blind spots — sectors or zones with LOW activity (you might be missing something)
  const allZones = new Set(EP_ENTITIES.map((e) => e.zone));
  const activeZones = new Set(processed.map((s) => s.zone));
  const quietZones = [...allZones].filter((z) => !activeZones.has(z));
  const blindSpots = [
    ...quietZones.map((z) => `No signals from ${z} zone — check if something is being missed`),
    ...analysis.sector_breakdown
      .filter((sb) => sb.trend === 'quiet')
      .map((sb) => `${sb.sector} is unusually quiet — verify if activity has shifted or if sources are stale`),
  ];

  // Actions
  const actions: string[] = [];
  if (topSignal?.prediction) actions.push(topSignal.prediction);
  for (const p of predictions.predictions.slice(0, 3)) {
    actions.push(`${p.headline} (${p.timeframe})`);
  }
  if (actions.length === 0) actions.push('No urgent actions. Review sector dashboard for emerging patterns.');

  return {
    department: 'daily-brief',
    generated_at: new Date().toISOString(),
    one_thing,
    sector_status: sectorStatus,
    top_signals: topSignals,
    predictions: predictions.predictions.slice(0, 5).map((p) => ({
      headline: p.headline,
      timeframe: p.timeframe,
      confidence: p.confidence,
    })),
    blind_spots: blindSpots,
    actions,
    entity_count: entityResult.total_entities,
    signal_count: snapshot.signal_count,
    connection_count: snapshot.connections_discovered,
  };
}

// ── Department Status Dashboard ─────────────────────────────────────────────

export function getDepartmentStatus(): DepartmentStatus[] {
  const store = getStoredFeedItems();
  const hasData = !!store && store.items.length > 0;

  return [
    { id: 'signal-collection', name: '📡 Signal Collection', mission: 'Find every signal in El Paso from 70K+ sources', agent_count: 6, last_run: store?.as_of ?? null, signals_processed: store?.items.length ?? 0, status: hasData ? 'active' : 'warming' },
    { id: 'entity-registry', name: '🏢 Entity Registry', mission: 'Track every company, agency, project in EP', agent_count: 3, last_run: hasData ? new Date().toISOString() : null, signals_processed: EP_ENTITIES.length, status: 'active' },
    { id: 'analysis', name: '🧠 Analysis', mission: 'Explain signals in plain English, find patterns', agent_count: 5, last_run: hasData ? new Date().toISOString() : null, signals_processed: 0, status: hasData ? 'active' : 'idle' },
    { id: 'prediction', name: '🔮 Prediction', mission: 'Where are things heading?', agent_count: 6, last_run: null, signals_processed: 0, status: hasData ? 'active' : 'idle' },
    { id: 'client-lens', name: '👁️ Client Lens', mission: 'See through 8 buyer eyes', agent_count: 8, last_run: null, signals_processed: 0, status: 'idle' },
    { id: 'daily-brief', name: '📋 Daily Brief', mission: 'Morning intelligence report', agent_count: 3, last_run: null, signals_processed: 0, status: hasData ? 'active' : 'idle' },
  ];
}

// ── Full Pipeline Run ───────────────────────────────────────────────────────

export type FullPipelineResult = {
  departments: DepartmentStatus[];
  collection: CollectionResult;
  entities: EntityRegistryResult;
  analysis: AnalysisResult;
  predictions: PredictionResult;
  brief: DailyBriefResult;
};

export function runFullPipeline(): FullPipelineResult {
  const collection = runSignalCollection();
  const processed = collection.feed_items.map((item, i) => processSignal(item, i)).filter((s) => s.entities_found.length > 0);
  const entities = runEntityRegistry(collection.feed_items);
  const analysis = runAnalysis(processed);
  const predictions = runPredictions(processed, analysis);
  const brief = generateDailyBrief();
  const departments = getDepartmentStatus();

  return { departments, collection, entities, analysis, predictions, brief };
}
