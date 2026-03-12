// src/lib/agents/agents/supply-chain-agent.ts
// Supply Chain Monitoring Agent — tracks shipping disruptions, port congestion,
// raw material shortages, factory closures, trade restrictions, and logistics shifts.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed } from '@/lib/rss/parser';
import type { QualityFeedSource } from '@/lib/feeds/quality-source-feeds';

// ── Types ──────────────────────────────────────────────────────────────────────

export type SupplyChainSignal = {
  id: string;
  title: string;
  url: string;
  source: string;
  disruptionType: 'shipping' | 'shortage' | 'port_congestion' | 'factory_closure' | 'tariff' | 'sanction' | 'rerouting' | 'expansion' | 'price_spike' | 'general';
  commodity?: string;
  region?: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  industry: string;
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type SupplyChainResult = {
  signals: SupplyChainSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  total_disruptions_detected: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  critical_count: number;
  scan_duration_ms: number;
};

// ── Supply Chain RSS Sources ───────────────────────────────────────────────────

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const SC_FEEDS: QualityFeedSource[] = [
  // Core supply chain news
  { id: 'sc-dive', name: 'Supply Chain Dive', url: GN('supply chain disruption OR shortage site:supplychaindive.com'), type: 'professional', tier: 1, tags: ['supply-chain'] },
  { id: 'sc-freightwaves', name: 'FreightWaves', url: GN('shipping freight disruption site:freightwaves.com'), type: 'professional', tier: 1, tags: ['supply-chain', 'shipping'] },
  { id: 'sc-logistics', name: 'Logistics Management', url: GN('logistics supply chain disruption delay'), type: 'professional', tier: 2, tags: ['supply-chain', 'logistics'] },
  // Shipping & ports
  { id: 'sc-ship', name: 'Shipping Disruptions', url: GN('shipping disruption OR "port congestion" OR "vessel delay" OR blockage'), type: 'professional', tier: 2, tags: ['supply-chain', 'shipping'] },
  { id: 'sc-suez', name: 'Trade Routes', url: GN('"Suez Canal" OR "Panama Canal" OR "Strait of Malacca" OR "Red Sea" shipping'), type: 'professional', tier: 2, tags: ['supply-chain', 'routes'] },
  { id: 'sc-container', name: 'Container Shipping', url: GN('container shipping rate OR shortage OR delay'), type: 'professional', tier: 2, tags: ['supply-chain', 'container'] },
  // Raw materials & commodities
  { id: 'sc-rare', name: 'Rare Earth', url: GN('"rare earth" OR "critical minerals" supply shortage OR restriction'), type: 'professional', tier: 2, tags: ['supply-chain', 'minerals'] },
  { id: 'sc-lithium', name: 'Lithium & Battery', url: GN('lithium OR cobalt OR nickel supply shortage OR price'), type: 'professional', tier: 2, tags: ['supply-chain', 'battery'] },
  { id: 'sc-steel', name: 'Steel & Metals', url: GN('steel OR aluminum OR copper supply shortage OR tariff OR price surge'), type: 'professional', tier: 2, tags: ['supply-chain', 'metals'] },
  { id: 'sc-chip', name: 'Chip Shortage', url: GN('semiconductor shortage OR "chip shortage" OR wafer supply'), type: 'professional', tier: 1, tags: ['supply-chain', 'semiconductor'] },
  // Trade & sanctions
  { id: 'sc-tariff', name: 'Tariffs & Trade', url: GN('tariff OR "trade war" OR "import duty" OR "export control" technology'), type: 'professional', tier: 2, tags: ['supply-chain', 'tariff'] },
  { id: 'sc-sanction', name: 'Sanctions', url: GN('sanctions OR "export ban" OR "entity list" technology'), type: 'professional', tier: 1, tags: ['supply-chain', 'sanction'] },
  { id: 'sc-reshoring', name: 'Reshoring', url: GN('reshoring OR nearshoring OR "supply chain diversification" OR "friend-shoring"'), type: 'professional', tier: 2, tags: ['supply-chain', 'reshoring'] },
  // Factory & manufacturing
  { id: 'sc-factory', name: 'Factory Disruptions', url: GN('factory closure OR "production halt" OR "plant shutdown" OR "manufacturing disruption"'), type: 'professional', tier: 2, tags: ['supply-chain', 'factory'] },
  { id: 'sc-expansion', name: 'Factory Expansion', url: GN('new factory OR "manufacturing facility" OR "fab construction" OR "gigafactory"'), type: 'professional', tier: 2, tags: ['supply-chain', 'expansion'] },
  // Energy supply
  { id: 'sc-energy', name: 'Energy Supply', url: GN('energy supply disruption OR "oil shortage" OR "gas pipeline" OR "power outage" OR blackout'), type: 'professional', tier: 2, tags: ['supply-chain', 'energy'] },
  // Food & agriculture
  { id: 'sc-food', name: 'Food Supply', url: GN('food supply chain disruption OR shortage OR "crop failure" OR "food security"'), type: 'professional', tier: 2, tags: ['supply-chain', 'food'] },
  // Regional disruptions
  { id: 'sc-china', name: 'China Supply Chain', url: GN('China supply chain disruption OR lockdown OR factory OR export'), type: 'professional', tier: 2, tags: ['supply-chain', 'china'] },
  { id: 'sc-eu-sc', name: 'EU Supply Chain', url: GN('Europe supply chain disruption OR shortage OR logistics'), type: 'professional', tier: 2, tags: ['supply-chain', 'europe'] },
];

// ── Detection Patterns ─────────────────────────────────────────────────────────

const DISRUPTION_PATTERNS: Array<{ type: SupplyChainSignal['disruptionType']; patterns: RegExp[]; severity: SupplyChainSignal['severity'] }> = [
  { type: 'shipping', patterns: [/ship(ping|ment)\s+(delay|disrupt|block|strand)/i, /vessel\s+(strand|block|delay)/i, /maritime\s+disrupt/i], severity: 'high' },
  { type: 'port_congestion', patterns: [/port\s+(congest|backlog|delay|closure)/i, /container\s+(backlog|shortage|pile)/i], severity: 'high' },
  { type: 'shortage', patterns: [/\bshortage\b/i, /\bscarcity\b/i, /supply\s+(crunch|squeeze|deficit)/i, /\bout\s+of\s+stock\b/i], severity: 'high' },
  { type: 'factory_closure', patterns: [/factory\s+(clos|shut|halt)/i, /production\s+(halt|stop|suspend)/i, /plant\s+(clos|shut)/i], severity: 'critical' },
  { type: 'tariff', patterns: [/\btariff\b/i, /\bimport\s+dut/i, /\btrade\s+war\b/i, /\bduty\b.*\b(impos|increas|rais)/i], severity: 'moderate' },
  { type: 'sanction', patterns: [/\bsanction/i, /\bexport\s+(ban|control|restrict)/i, /\bentity\s+list\b/i, /\bembargo\b/i], severity: 'critical' },
  { type: 'rerouting', patterns: [/\breroute/i, /\balternative\s+route/i, /\bdivert/i, /\bbypass/i], severity: 'moderate' },
  { type: 'expansion', patterns: [/new\s+factory/i, /new\s+fab\b/i, /\bgigafactory\b/i, /manufacturing\s+facility\s+(open|build|construct)/i], severity: 'low' },
  { type: 'price_spike', patterns: [/price\s+(surge|spike|soar|jump|skyrocket)/i, /cost\s+(surge|spike|soar)/i, /\brecord\s+(high|price)\b/i], severity: 'high' },
];

const COMMODITY_KEYWORDS: Record<string, RegExp> = {
  'semiconductors': /\b(semiconductor|chip|wafer|foundry|TSMC|Intel|Samsung)\b/i,
  'rare-earth': /\b(rare earth|lithium|cobalt|nickel|manganese|gallium|germanium)\b/i,
  'steel-metals': /\b(steel|aluminum|copper|titanium|tungsten)\b/i,
  'energy': /\b(oil|gas|coal|LNG|uranium|solar panel)\b/i,
  'food': /\b(wheat|grain|rice|corn|fertilizer|food)\b/i,
  'electronics': /\b(electronics|PCB|component|capacitor|resistor)\b/i,
};

function classifyDisruption(text: string): { type: SupplyChainSignal['disruptionType']; severity: SupplyChainSignal['severity'] } {
  for (const { type, patterns, severity } of DISRUPTION_PATTERNS) {
    for (const re of patterns) {
      if (re.test(text)) return { type, severity };
    }
  }
  return { type: 'general', severity: 'low' };
}

function extractCommodity(text: string): string | undefined {
  for (const [name, re] of Object.entries(COMMODITY_KEYWORDS)) {
    if (re.test(text)) return name;
  }
  return undefined;
}

function classifyIndustry(text: string): string {
  if (/\b(semiconductor|chip|wafer|fab)\b/i.test(text)) return 'semiconductor';
  if (/\b(auto|vehicle|EV|battery)\b/i.test(text)) return 'automotive';
  if (/\b(pharma|drug|medical|health)\b/i.test(text)) return 'healthcare';
  if (/\b(defense|military|weapon)\b/i.test(text)) return 'defense';
  if (/\b(food|agriculture|farm|crop)\b/i.test(text)) return 'agriculture';
  if (/\b(energy|oil|gas|solar|wind)\b/i.test(text)) return 'energy';
  if (/\b(electronics|tech|computing)\b/i.test(text)) return 'technology';
  return 'general';
}

// ── Main Runner ───────────────────────────────────────────────────────────────

const CONCURRENCY = 10;
let _cached: SupplyChainResult | null = null;
let _cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

export async function runSupplyChainAgent(): Promise<SupplyChainResult> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;

  const start = Date.now();
  const feeds = SC_FEEDS;
  let feedsOk = 0;
  const allSignals: SupplyChainSignal[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const batch = feeds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (feed) => {
        const res = await fetchWithRetry(feed.url, {}, { retries: 1 });
        if (!res.ok) return [];
        const xml = await res.text();
        const items = parseAnyFeed(xml, feed.name);
        return items.map((item) => ({ item, feed }));
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      feedsOk++;
      for (const { item, feed } of result.value) {
        const text = `${item.title ?? ''} ${item.description ?? ''}`;
        if (!/\b(supply|chain|shipping|shortage|tariff|sanction|factory|port|logistics|disruption|commodity)\b/i.test(text)) continue;

        const key = (item.title ?? '').toLowerCase().slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const { type: disruptionType, severity } = classifyDisruption(text);

        allSignals.push({
          id: `sc-${Date.now()}-${allSignals.length}`,
          title: (item.title ?? '').slice(0, 200),
          url: item.link ?? feed.url,
          source: feed.name,
          disruptionType,
          commodity: extractCommodity(text),
          severity,
          industry: classifyIndustry(text),
          confidence: severity === 'critical' ? 0.9 : severity === 'high' ? 0.8 : 0.6,
          discoveredAt: item.pubDate ?? new Date().toISOString(),
          tags: [...feed.tags, disruptionType, severity],
        });
      }
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
  allSignals.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const s of allSignals) {
    byType[s.disruptionType] = (byType[s.disruptionType] ?? 0) + 1;
    bySeverity[s.severity] = (bySeverity[s.severity] ?? 0) + 1;
  }

  const result: SupplyChainResult = {
    signals: allSignals,
    as_of: new Date().toISOString(),
    feeds_scanned: feeds.length,
    feeds_ok: feedsOk,
    total_disruptions_detected: allSignals.length,
    by_type: byType,
    by_severity: bySeverity,
    critical_count: bySeverity['critical'] ?? 0,
    scan_duration_ms: Date.now() - start,
  };

  _cached = result;
  _cachedAt = Date.now();
  return result;
}
