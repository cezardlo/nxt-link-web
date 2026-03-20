// ═══════════════════════════════════════════════════════════════════════════════
// EL PASO BRAIN — The connective intelligence layer
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is the Obsidian-like brain for El Paso. It doesn't just collect signals —
// it CONNECTS them, EXPLAINS them in plain English, and PREDICTS where things
// are heading. Every entity, signal, and trend is a node in the graph.
//
// Signal flows through 4 stages:
//   1. DETECT  — raw signal from feeds/APIs
//   2. CONNECT — link to entities, sectors, and other signals
//   3. EXPLAIN — what does this mean in plain English?
//   4. PREDICT — based on patterns, where is this heading?
//
// The brain maintains a living model of El Paso's economy:
//   - WHO: companies, agencies, people, institutions
//   - WHAT: products, contracts, technologies, regulations
//   - WHERE: Fort Bliss, UTEP, downtown, maquiladoras, border crossings
//   - WHY: market forces, policy shifts, competitive pressure
//   - WHEN: timelines, deadlines, seasonal patterns

import type { EnrichedFeedItem } from '@/lib/agents/feed-agent';
import { getStoredFeedItems } from '@/lib/agents/feed-agent';

// ── El Paso Entity Model ────────────────────────────────────────────────────

export type EPEntityType =
  | 'company'      // Raytheon, L3Harris, Benchmark, Foxconn
  | 'agency'       // CBP, Army, City of EP, TXDOT
  | 'institution'  // UTEP, EPCC, UMC, Emergence Health Network
  | 'facility'     // Fort Bliss, Biggs AAF, BOTA crossing, El Paso Airport
  | 'project'      // IVAS program, grid modernization, desal plant
  | 'sector'       // Defense, Manufacturing, Healthcare, Energy
  | 'technology'   // AI/ML, IoT, Solar, Cybersecurity
  | 'regulation';  // CMMC, CTPAT, FedRAMP, ITAR

export type EPEntity = {
  id: string;
  name: string;
  type: EPEntityType;
  aliases: string[];
  sector: string;
  zone: string;          // Fort Bliss cluster, Downtown, Maquiladora zone, East side, etc.
  importance: number;    // 0-100
  connections: string[]; // IDs of connected entities
  signals: string[];     // recent signal IDs
  trend: 'rising' | 'stable' | 'declining' | 'emerging';
  last_signal: string;   // ISO timestamp
};

// ── El Paso Knowledge Graph ─────────────────────────────────────────────────

export type BrainConnection = {
  from: string;
  to: string;
  relationship: string;     // "supplies_to", "competes_with", "regulated_by", "located_at", "funds", "hires_from"
  strength: number;          // 0-1
  evidence: string;          // why we think this connection exists
  last_seen: string;
};

export type BrainSignal = {
  id: string;
  raw_title: string;
  plain_english: string;       // "Here's what this means for you..."
  why_it_matters: string;      // "This matters because..."
  who_affected: string[];      // entity IDs
  sector: string;
  zone: string;
  urgency: 'breaking' | 'this_week' | 'this_month' | 'background';
  signal_type: string;
  source: string;
  timestamp: string;
  connected_signals: string[]; // IDs of related signals
  prediction: string | null;   // "Based on this, expect..."
};

export type BrainPrediction = {
  id: string;
  headline: string;
  explanation: string;         // plain English
  confidence: number;          // 0-100
  timeframe: string;           // "next 30 days", "Q3 2026", "by end of year"
  based_on: string[];          // signal IDs that support this
  sector: string;
  affects: string[];           // entity IDs
  category: 'market_shift' | 'hiring_wave' | 'contract_pipeline' | 'regulatory_change' | 'infrastructure' | 'competition' | 'technology_adoption';
};

// ── The El Paso Knowledge Base ──────────────────────────────────────────────
// Static seed data — the baseline entities that define El Paso's tech economy.
// The brain grows this dynamically as new signals arrive.

export const EP_ENTITIES: EPEntity[] = [
  // ── Defense Cluster (Fort Bliss) ──────────────────────────
  { id: 'fort-bliss', name: 'Fort Bliss', type: 'facility', aliases: ['Bliss', 'FORSCOM'], sector: 'Defense', zone: 'Fort Bliss', importance: 98, connections: ['1ad', 'raytheon-ep', 'l3harris-ep', 'saic-ep', 'leidos-ep'], signals: [], trend: 'stable', last_signal: '' },
  { id: '1ad', name: '1st Armored Division', type: 'agency', aliases: ['1AD', 'Iron Soldiers', 'Old Ironsides'], sector: 'Defense', zone: 'Fort Bliss', importance: 95, connections: ['fort-bliss'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'raytheon-ep', name: 'RTX / Raytheon El Paso', type: 'company', aliases: ['Raytheon', 'RTX', 'Raytheon Missiles'], sector: 'Defense', zone: 'Fort Bliss', importance: 92, connections: ['fort-bliss', 'patriot-pac3'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'l3harris-ep', name: 'L3Harris El Paso', type: 'company', aliases: ['L3Harris', 'L3 Technologies'], sector: 'Defense', zone: 'Fort Bliss', importance: 90, connections: ['fort-bliss', 'ivas-program'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'saic-ep', name: 'SAIC El Paso', type: 'company', aliases: ['SAIC'], sector: 'Defense', zone: 'Fort Bliss', importance: 85, connections: ['fort-bliss'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'leidos-ep', name: 'Leidos El Paso', type: 'company', aliases: ['Leidos'], sector: 'Defense', zone: 'Fort Bliss', importance: 84, connections: ['fort-bliss'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'gdit-ep', name: 'GDIT El Paso', type: 'company', aliases: ['General Dynamics IT', 'GDIT'], sector: 'Defense', zone: 'Fort Bliss', importance: 82, connections: ['fort-bliss'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'booz-ep', name: 'Booz Allen Hamilton El Paso', type: 'company', aliases: ['Booz Allen', 'BAH'], sector: 'Defense', zone: 'Fort Bliss', importance: 80, connections: ['fort-bliss'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'patriot-pac3', name: 'Patriot PAC-3 MSE Program', type: 'project', aliases: ['Patriot', 'PAC-3', 'IBCS'], sector: 'Defense', zone: 'Fort Bliss', importance: 93, connections: ['raytheon-ep', 'fort-bliss'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'ivas-program', name: 'IVAS Headset Program', type: 'project', aliases: ['IVAS', 'HoloLens Army'], sector: 'Defense', zone: 'Fort Bliss', importance: 85, connections: ['l3harris-ep', 'fort-bliss'], signals: [], trend: 'stable', last_signal: '' },

  // ── Border & Trade ────────────────────────────────────────
  { id: 'cbp-ep', name: 'CBP El Paso Sector', type: 'agency', aliases: ['CBP', 'Border Patrol', 'Customs'], sector: 'Border Tech', zone: 'Border', importance: 94, connections: ['bota', 'ysleta-poe'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'bota', name: 'Bridge of the Americas', type: 'facility', aliases: ['BOTA', 'Free Bridge'], sector: 'Logistics', zone: 'Border', importance: 88, connections: ['cbp-ep'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'ysleta-poe', name: 'Ysleta Port of Entry', type: 'facility', aliases: ['Ysleta', 'Zaragoza Bridge'], sector: 'Logistics', zone: 'Border', importance: 85, connections: ['cbp-ep'], signals: [], trend: 'stable', last_signal: '' },

  // ── Manufacturing (Maquiladora Zone) ──────────────────────
  { id: 'foxconn-ep', name: 'Foxconn El Paso', type: 'company', aliases: ['Foxconn', 'Hon Hai'], sector: 'Manufacturing', zone: 'Maquiladora', importance: 75, connections: [], signals: [], trend: 'stable', last_signal: '' },
  { id: 'benchmark-ep', name: 'Benchmark Electronics', type: 'company', aliases: ['Benchmark', 'BHE'], sector: 'Manufacturing', zone: 'Maquiladora', importance: 78, connections: [], signals: [], trend: 'rising', last_signal: '' },
  { id: 'aptiv-ep', name: 'Aptiv / Delphi El Paso', type: 'company', aliases: ['Aptiv', 'Delphi'], sector: 'Manufacturing', zone: 'Maquiladora', importance: 72, connections: [], signals: [], trend: 'stable', last_signal: '' },
  { id: 'honeywell-ep', name: 'Honeywell Turbo El Paso', type: 'company', aliases: ['Honeywell'], sector: 'Manufacturing', zone: 'Maquiladora', importance: 76, connections: [], signals: [], trend: 'stable', last_signal: '' },

  // ── Education & Research ──────────────────────────────────
  { id: 'utep', name: 'UT El Paso', type: 'institution', aliases: ['UTEP', 'University of Texas at El Paso'], sector: 'AI/ML', zone: 'UTEP', importance: 88, connections: ['utep-ai-lab'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'utep-ai-lab', name: 'UTEP AI & Data Science Lab', type: 'institution', aliases: ['UTEP AI'], sector: 'AI/ML', zone: 'UTEP', importance: 75, connections: ['utep'], signals: [], trend: 'rising', last_signal: '' },

  // ── Energy ────────────────────────────────────────────────
  { id: 'epe', name: 'El Paso Electric', type: 'company', aliases: ['EPE', 'EP Electric'], sector: 'Energy', zone: 'Citywide', importance: 90, connections: ['grid-mod'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'grid-mod', name: 'Grid Modernization Program', type: 'project', aliases: ['Smart Grid EP'], sector: 'Energy', zone: 'Citywide', importance: 82, connections: ['epe'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'nextera-ep', name: 'NextEra Energy EP', type: 'company', aliases: ['NextEra', 'FPL Group'], sector: 'Energy', zone: 'East', importance: 72, connections: [], signals: [], trend: 'rising', last_signal: '' },

  // ── Healthcare ────────────────────────────────────────────
  { id: 'umc', name: 'University Medical Center', type: 'institution', aliases: ['UMC', 'UMC EP'], sector: 'Healthcare', zone: 'Medical Center', importance: 88, connections: [], signals: [], trend: 'stable', last_signal: '' },
  { id: 'sierra-prov', name: 'Sierra Providence Health', type: 'company', aliases: ['Sierra Providence', 'Tenet EP'], sector: 'Healthcare', zone: 'East', importance: 78, connections: [], signals: [], trend: 'stable', last_signal: '' },

  // ── Logistics & Commerce ──────────────────────────────────
  { id: 'amazon-ep', name: 'Amazon El Paso', type: 'company', aliases: ['Amazon', 'AWS EP'], sector: 'Logistics', zone: 'East', importance: 82, connections: [], signals: [], trend: 'rising', last_signal: '' },
  { id: 'fedex-ep', name: 'FedEx El Paso', type: 'company', aliases: ['FedEx'], sector: 'Logistics', zone: 'Airport', importance: 75, connections: [], signals: [], trend: 'stable', last_signal: '' },

  // ── Government ────────────────────────────────────────────
  { id: 'city-ep', name: 'City of El Paso', type: 'agency', aliases: ['CoEP', 'City Government'], sector: 'Government', zone: 'Downtown', importance: 90, connections: ['ep-water'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'ep-water', name: 'El Paso Water', type: 'agency', aliases: ['EPWater', 'EP Water Utilities'], sector: 'Government', zone: 'Citywide', importance: 80, connections: ['city-ep', 'desal-plant'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'desal-plant', name: 'Kay Bailey Hutchison Desal Plant', type: 'facility', aliases: ['KBH Desal', 'Desalination Plant'], sector: 'Energy', zone: 'East', importance: 78, connections: ['ep-water'], signals: [], trend: 'rising', last_signal: '' },

  // ── Sectors ───────────────────────────────────────────────
  { id: 'sec-defense', name: 'Defense & Aerospace', type: 'sector', aliases: [], sector: 'Defense', zone: 'Citywide', importance: 98, connections: ['fort-bliss', 'raytheon-ep', 'l3harris-ep'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'sec-manufacturing', name: 'Manufacturing & Maquiladora', type: 'sector', aliases: [], sector: 'Manufacturing', zone: 'Maquiladora', importance: 85, connections: ['foxconn-ep', 'benchmark-ep', 'aptiv-ep'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'sec-energy', name: 'Energy & Sustainability', type: 'sector', aliases: [], sector: 'Energy', zone: 'Citywide', importance: 82, connections: ['epe', 'nextera-ep'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'sec-border', name: 'Border & Trade', type: 'sector', aliases: [], sector: 'Border Tech', zone: 'Border', importance: 92, connections: ['cbp-ep', 'bota'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'sec-health', name: 'Healthcare & Biotech', type: 'sector', aliases: [], sector: 'Healthcare', zone: 'Medical Center', importance: 78, connections: ['umc', 'sierra-prov'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'sec-logistics', name: 'Logistics & Cross-Border Freight', type: 'sector', aliases: [], sector: 'Logistics', zone: 'Citywide', importance: 80, connections: ['amazon-ep', 'fedex-ep', 'bota'], signals: [], trend: 'rising', last_signal: '' },

  // ── Key Technologies ──────────────────────────────────────
  { id: 'tech-ai', name: 'AI / Machine Learning', type: 'technology', aliases: ['AI', 'ML', 'artificial intelligence'], sector: 'AI/ML', zone: 'Citywide', importance: 90, connections: ['utep-ai-lab'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'tech-cyber', name: 'Cybersecurity', type: 'technology', aliases: ['cyber', 'infosec', 'endpoint protection'], sector: 'Cybersecurity', zone: 'Citywide', importance: 88, connections: [], signals: [], trend: 'rising', last_signal: '' },
  { id: 'tech-solar', name: 'Solar & Renewables', type: 'technology', aliases: ['solar', 'renewable energy', 'photovoltaic'], sector: 'Energy', zone: 'East', importance: 78, connections: ['nextera-ep', 'epe'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'tech-iot', name: 'IoT & Sensors', type: 'technology', aliases: ['IoT', 'internet of things', 'smart sensors'], sector: 'Manufacturing', zone: 'Maquiladora', importance: 72, connections: [], signals: [], trend: 'rising', last_signal: '' },
  { id: 'tech-autonomous', name: 'Autonomous Systems', type: 'technology', aliases: ['drones', 'unmanned', 'autonomous vehicles', 'UAV'], sector: 'Defense', zone: 'Fort Bliss', importance: 82, connections: ['fort-bliss'], signals: [], trend: 'rising', last_signal: '' },

  // ── Regulations ───────────────────────────────────────────
  { id: 'reg-cmmc', name: 'CMMC Compliance', type: 'regulation', aliases: ['CMMC', 'Cybersecurity Maturity Model'], sector: 'Defense', zone: 'Citywide', importance: 85, connections: ['sec-defense'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'reg-ctpat', name: 'C-TPAT Compliance', type: 'regulation', aliases: ['CTPAT', 'C-TPAT', 'Customs-Trade Partnership'], sector: 'Logistics', zone: 'Border', importance: 78, connections: ['cbp-ep'], signals: [], trend: 'stable', last_signal: '' },
  { id: 'reg-fedramp', name: 'FedRAMP Authorization', type: 'regulation', aliases: ['FedRAMP'], sector: 'Defense', zone: 'Citywide', importance: 82, connections: ['fort-bliss'], signals: [], trend: 'rising', last_signal: '' },
  { id: 'reg-itar', name: 'ITAR Export Controls', type: 'regulation', aliases: ['ITAR', 'export controls'], sector: 'Defense', zone: 'Citywide', importance: 88, connections: ['sec-defense'], signals: [], trend: 'stable', last_signal: '' },
];

// ── Entity Lookup ───────────────────────────────────────────────────────────

const entityIndex = new Map<string, EPEntity>();
const aliasIndex = new Map<string, string>(); // alias → entity ID

function buildIndex() {
  if (entityIndex.size > 0) return;
  for (const e of EP_ENTITIES) {
    entityIndex.set(e.id, e);
    aliasIndex.set(e.name.toLowerCase(), e.id);
    for (const alias of e.aliases) {
      aliasIndex.set(alias.toLowerCase(), e.id);
    }
  }
}

export function findEntity(text: string): EPEntity | null {
  buildIndex();
  const lower = text.toLowerCase();
  const id = aliasIndex.get(lower);
  if (id) return entityIndex.get(id) ?? null;
  // Fuzzy: check if any alias appears in the text
  for (const [alias, entityId] of aliasIndex) {
    if (alias.length > 3 && lower.includes(alias)) {
      return entityIndex.get(entityId) ?? null;
    }
  }
  return null;
}

export function findEntitiesInText(text: string): EPEntity[] {
  buildIndex();
  const lower = text.toLowerCase();
  const found = new Set<string>();
  const results: EPEntity[] = [];
  for (const [alias, entityId] of aliasIndex) {
    if (alias.length > 3 && lower.includes(alias) && !found.has(entityId)) {
      found.add(entityId);
      const entity = entityIndex.get(entityId);
      if (entity) results.push(entity);
    }
  }
  return results;
}

export function getEntity(id: string): EPEntity | null {
  buildIndex();
  return entityIndex.get(id) ?? null;
}

export function getConnected(id: string): EPEntity[] {
  buildIndex();
  const entity = entityIndex.get(id);
  if (!entity) return [];
  return entity.connections
    .map((cid) => entityIndex.get(cid))
    .filter((e): e is EPEntity => !!e);
}

// ── Signal Processing — Detect + Connect ────────────────────────────────────

export type ProcessedSignal = {
  id: string;
  raw_title: string;
  plain_english: string;
  entities_found: EPEntity[];
  sector: string;
  zone: string;
  urgency: 'breaking' | 'this_week' | 'this_month' | 'background';
  connections: Array<{ from: string; to: string; reason: string }>;
  prediction: string | null;
};

function classifyUrgency(item: EnrichedFeedItem): ProcessedSignal['urgency'] {
  const title = item.title.toLowerCase();
  const score = item.score;
  if (score >= 9 || title.includes('breaking') || title.includes('emergency')) return 'breaking';
  if (score >= 7 || title.includes('award') || title.includes('announce')) return 'this_week';
  if (score >= 5) return 'this_month';
  return 'background';
}

function inferZone(entities: EPEntity[]): string {
  const zones = entities.map((e) => e.zone).filter(Boolean);
  if (zones.includes('Fort Bliss')) return 'Fort Bliss';
  if (zones.includes('Border')) return 'Border';
  if (zones.includes('Maquiladora')) return 'Maquiladora';
  if (zones.includes('UTEP')) return 'UTEP';
  if (zones.includes('Downtown')) return 'Downtown';
  return zones[0] ?? 'Citywide';
}

function makePlainEnglish(item: EnrichedFeedItem, entities: EPEntity[]): string {
  const names = entities.map((e) => e.name).slice(0, 3).join(', ');
  if (entities.length === 0) return item.title;
  return `${item.title} — This involves ${names} and could affect the ${entities[0].sector} sector in El Paso.`;
}

function inferPrediction(item: EnrichedFeedItem, entities: EPEntity[]): string | null {
  const title = item.title.toLowerCase();
  const sector = entities[0]?.sector ?? '';

  // Contract signals → hiring prediction
  if (title.includes('contract') || title.includes('award')) {
    const company = entities.find((e) => e.type === 'company');
    if (company) return `Expect ${company.name} to increase hiring in El Paso within 60 days. Watch for facility expansion announcements.`;
  }

  // Regulation signals → compliance rush
  if (title.includes('compliance') || title.includes('regulation') || title.includes('mandate')) {
    return `Companies in ${sector} will scramble to comply. Expect a wave of vendor evaluations and RFPs in the next 90 days.`;
  }

  // Funding signals → growth
  if (title.includes('funding') || title.includes('grant') || title.includes('investment')) {
    return `This funding will translate to new programs and hiring in El Paso. Defense contractors should position for subcontract opportunities.`;
  }

  // Expansion signals → real estate + jobs
  if (title.includes('expansion') || title.includes('new facility') || title.includes('opens')) {
    return `Commercial real estate in the affected zone will tighten. Local suppliers should prepare capacity for increased demand.`;
  }

  // Technology adoption signals
  if (title.includes('deploy') || title.includes('adoption') || title.includes('rollout')) {
    return `This tech adoption will create a domino effect. Companies that don't adopt similar tech within 12 months risk falling behind competitors.`;
  }

  return null;
}

function inferConnections(entities: EPEntity[]): Array<{ from: string; to: string; reason: string }> {
  const connections: Array<{ from: string; to: string; reason: string }> = [];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      connections.push({
        from: entities[i].id,
        to: entities[j].id,
        reason: `Both mentioned in the same signal — ${entities[i].name} and ${entities[j].name} are connected in this context.`,
      });
    }
  }
  return connections;
}

export function processSignal(item: EnrichedFeedItem, index: number): ProcessedSignal {
  const entities = findEntitiesInText(`${item.title} ${item.description}`);
  const urgency = classifyUrgency(item);
  const zone = inferZone(entities);
  const plainEnglish = makePlainEnglish(item, entities);
  const prediction = inferPrediction(item, entities);
  const connections = inferConnections(entities);

  return {
    id: `sig-${Date.now()}-${index}`,
    raw_title: item.title,
    plain_english: plainEnglish,
    entities_found: entities,
    sector: entities[0]?.sector ?? item.category,
    zone,
    urgency,
    connections,
    prediction,
  };
}

// ── Brain Snapshot — current state of El Paso intelligence ───────────────────

export type BrainSnapshot = {
  generated_at: string;
  entity_count: number;
  signal_count: number;
  signals: ProcessedSignal[];
  sector_summary: Array<{
    sector: string;
    signal_count: number;
    urgency_breakdown: Record<string, number>;
    trend: string;
    top_entities: string[];
    plain_summary: string;
  }>;
  predictions: Array<{
    prediction: string;
    based_on: string;
    sector: string;
    confidence: string;
  }>;
  connections_discovered: number;
  zones: Array<{
    zone: string;
    activity_level: 'hot' | 'active' | 'quiet';
    signal_count: number;
  }>;
  one_liner: string;
};

export function generateBrainSnapshot(): BrainSnapshot {
  const store = getStoredFeedItems();
  const feedItems = store?.items ?? [];

  // Process all feed items through the brain
  const signals = feedItems
    .slice(0, 200)
    .map((item, i) => processSignal(item, i))
    .filter((s) => s.entities_found.length > 0); // Only keep signals we can connect to EP entities

  // Sector aggregation
  const sectorMap = new Map<string, ProcessedSignal[]>();
  for (const sig of signals) {
    const arr = sectorMap.get(sig.sector) ?? [];
    arr.push(sig);
    sectorMap.set(sig.sector, arr);
  }

  const sector_summary = [...sectorMap.entries()].map(([sector, sigs]) => {
    const urgency_breakdown: Record<string, number> = {};
    for (const s of sigs) {
      urgency_breakdown[s.urgency] = (urgency_breakdown[s.urgency] ?? 0) + 1;
    }
    const topEntities = [...new Set(sigs.flatMap((s) => s.entities_found.map((e) => e.name)))].slice(0, 5);
    const breaking = urgency_breakdown['breaking'] ?? 0;
    const thisWeek = urgency_breakdown['this_week'] ?? 0;
    const trend = breaking > 0 || thisWeek > 2 ? 'surging' : thisWeek > 0 ? 'active' : 'steady';

    return {
      sector,
      signal_count: sigs.length,
      urgency_breakdown,
      trend,
      top_entities: topEntities,
      plain_summary: `${sector} has ${sigs.length} active signals. ${breaking > 0 ? `${breaking} breaking.` : ''} Key players: ${topEntities.slice(0, 3).join(', ')}.`,
    };
  }).sort((a, b) => b.signal_count - a.signal_count);

  // Collect all predictions
  const predictions = signals
    .filter((s) => s.prediction)
    .map((s) => ({
      prediction: s.prediction!,
      based_on: s.raw_title,
      sector: s.sector,
      confidence: s.urgency === 'breaking' ? 'high' : s.urgency === 'this_week' ? 'medium' : 'speculative',
    }))
    .slice(0, 15);

  // Zone activity
  const zoneMap = new Map<string, number>();
  for (const sig of signals) {
    zoneMap.set(sig.zone, (zoneMap.get(sig.zone) ?? 0) + 1);
  }
  const zones = [...zoneMap.entries()]
    .map(([zone, count]) => ({
      zone,
      signal_count: count,
      activity_level: (count >= 5 ? 'hot' : count >= 2 ? 'active' : 'quiet') as 'hot' | 'active' | 'quiet',
    }))
    .sort((a, b) => b.signal_count - a.signal_count);

  // Connection count
  const connections_discovered = signals.reduce((sum, s) => sum + s.connections.length, 0);

  // One liner
  const topSector = sector_summary[0];
  const one_liner = topSector
    ? `${topSector.sector} is the most active sector with ${topSector.signal_count} signals. ${predictions[0]?.prediction ?? 'Watching for emerging patterns.'}`
    : 'Intelligence pipeline warming up. Signals will populate as feeds are processed.';

  return {
    generated_at: new Date().toISOString(),
    entity_count: EP_ENTITIES.length,
    signal_count: signals.length,
    signals: signals.slice(0, 50), // Top 50 for API response
    sector_summary,
    predictions,
    connections_discovered,
    zones,
    one_liner,
  };
}
