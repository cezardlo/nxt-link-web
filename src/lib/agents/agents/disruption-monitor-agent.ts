// src/lib/agents/agents/disruption-monitor-agent.ts
// Global Disruption Monitor — detects geopolitical events, natural disasters,
// cyber attacks, market crashes, regulatory shocks, and conflicts worldwide.
// Assigns P0-P3 priority: P0 = global disruption, P3 = early signal.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed } from '@/lib/rss/parser';
import type { QualityFeedSource } from '@/lib/feeds/quality-source-feeds';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DisruptionPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type DisruptionSignal = {
  id: string;
  title: string;
  url: string;
  source: string;
  disruptionCategory: 'geopolitical' | 'natural_disaster' | 'cyber_attack' | 'market_crash' | 'regulatory_shock' | 'conflict' | 'pandemic' | 'infrastructure' | 'general';
  priority: DisruptionPriority;
  priorityReason: string;
  region?: string;
  affectedIndustries: string[];
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type DisruptionMonitorResult = {
  signals: DisruptionSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  total_disruptions: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  p0_count: number;
  p1_count: number;
  scan_duration_ms: number;
};

// ── Disruption RSS Sources ─────────────────────────────────────────────────────

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const DISRUPTION_FEEDS: QualityFeedSource[] = [
  // Geopolitical
  { id: 'dis-geo', name: 'Geopolitical Risk', url: GN('"geopolitical" OR "sanctions" OR "trade war" OR "diplomatic crisis" technology'), type: 'professional', tier: 1, tags: ['disruption', 'geopolitical'] },
  { id: 'dis-war', name: 'Conflict Monitor', url: GN('war OR conflict OR military OR invasion OR "armed forces" escalation'), type: 'professional', tier: 1, tags: ['disruption', 'conflict'] },
  { id: 'dis-nato', name: 'NATO & Alliance', url: GN('NATO OR AUKUS OR "defense alliance" OR "military buildup"'), type: 'professional', tier: 1, tags: ['disruption', 'defense'] },
  // Cyber attacks
  { id: 'dis-cyber', name: 'Cyber Attacks', url: GN('"cyber attack" OR "data breach" OR "ransomware" OR "nation state hack"'), type: 'professional', tier: 1, tags: ['disruption', 'cyber'] },
  { id: 'dis-infra-hack', name: 'Infrastructure Hacks', url: GN('"critical infrastructure" attack OR hack OR vulnerability'), type: 'professional', tier: 1, tags: ['disruption', 'cyber', 'infrastructure'] },
  // Natural disasters
  { id: 'dis-quake', name: 'Earthquakes', url: GN('earthquake magnitude damage OR tsunami'), type: 'professional', tier: 2, tags: ['disruption', 'earthquake'] },
  { id: 'dis-climate', name: 'Climate Events', url: GN('hurricane OR typhoon OR flood OR wildfire OR "extreme weather" impact'), type: 'professional', tier: 2, tags: ['disruption', 'climate'] },
  { id: 'dis-volcano', name: 'Volcanic Activity', url: GN('volcano eruption OR "volcanic activity" OR ash cloud'), type: 'professional', tier: 3, tags: ['disruption', 'volcano'] },
  // Market & financial
  { id: 'dis-market', name: 'Market Crash', url: GN('"market crash" OR "stock crash" OR "financial crisis" OR "bank failure" OR recession'), type: 'financial', tier: 1, tags: ['disruption', 'market'] },
  { id: 'dis-currency', name: 'Currency Crisis', url: GN('"currency crisis" OR "devaluation" OR "hyperinflation" OR "bond crisis"'), type: 'financial', tier: 2, tags: ['disruption', 'currency'] },
  // Regulatory shocks
  { id: 'dis-reg-ai', name: 'AI Regulation', url: GN('"AI regulation" OR "AI ban" OR "AI moratorium" OR "AI act" government'), type: 'professional', tier: 1, tags: ['disruption', 'regulation', 'ai'] },
  { id: 'dis-reg-tech', name: 'Tech Regulation', url: GN('"tech regulation" OR "antitrust" OR "data protection" fine OR ban technology'), type: 'professional', tier: 2, tags: ['disruption', 'regulation'] },
  { id: 'dis-export', name: 'Export Controls', url: GN('"export control" OR "export ban" OR "technology restriction" chip OR semiconductor'), type: 'professional', tier: 1, tags: ['disruption', 'export'] },
  // Pandemic & health
  { id: 'dis-pandemic', name: 'Pandemic Monitor', url: GN('pandemic OR outbreak OR "public health emergency" OR epidemic'), type: 'professional', tier: 1, tags: ['disruption', 'pandemic'] },
  // Infrastructure
  { id: 'dis-infra', name: 'Infrastructure Failure', url: GN('"power grid failure" OR "internet outage" OR "cable cut" OR "infrastructure collapse"'), type: 'professional', tier: 2, tags: ['disruption', 'infrastructure'] },
  { id: 'dis-space', name: 'Space Events', url: GN('"solar storm" OR "space debris" OR "satellite collision" OR "GPS disruption"'), type: 'professional', tier: 3, tags: ['disruption', 'space'] },
  // Technology disruption
  { id: 'dis-tech', name: 'Tech Disruption', url: GN('"technology disruption" OR "paradigm shift" OR "industry disruption" breakthrough'), type: 'professional', tier: 2, tags: ['disruption', 'technology'] },
  // Regional instability
  { id: 'dis-me', name: 'Middle East Instability', url: GN('Middle East crisis OR conflict OR escalation OR "Red Sea" attack'), type: 'professional', tier: 2, tags: ['disruption', 'middle-east'] },
  { id: 'dis-asia', name: 'Asia-Pacific Tension', url: GN('"Taiwan strait" OR "South China Sea" OR "Korea" tension OR escalation'), type: 'professional', tier: 2, tags: ['disruption', 'asia'] },
  { id: 'dis-africa', name: 'Africa Instability', url: GN('Africa coup OR conflict OR crisis OR instability'), type: 'professional', tier: 3, tags: ['disruption', 'africa'] },
];

// ── Priority Classification ────────────────────────────────────────────────────

type PriorityRule = {
  priority: DisruptionPriority;
  patterns: RegExp[];
  reason: string;
};

const PRIORITY_RULES: PriorityRule[] = [
  // P0 — Global disruption
  { priority: 'P0', patterns: [/\bworld\s+war\b/i, /\bnuclear\s+(strike|war|attack|weapon)/i], reason: 'Nuclear/global conflict threat' },
  { priority: 'P0', patterns: [/\bglobal\s+(pandemic|crisis|recession|financial\s+crisis)/i], reason: 'Global systemic crisis' },
  { priority: 'P0', patterns: [/\bchip\s+shortage\b.*\bglobal\b/i, /\bglobal\s+semiconductor\s+(shortage|crisis)/i], reason: 'Global semiconductor crisis' },
  { priority: 'P0', patterns: [/\binternet\s+(shutdown|blackout)\b.*\b(global|worldwide)/i], reason: 'Global internet disruption' },
  { priority: 'P0', patterns: [/\bsolar\s+storm\b.*\b(massive|catastrophic|extreme)/i], reason: 'Catastrophic space weather' },
  // P1 — Industry disruption
  { priority: 'P1', patterns: [/\b(war|invasion|conflict)\b.*\b(escalat|spread|widen)/i], reason: 'Escalating armed conflict' },
  { priority: 'P1', patterns: [/\bsanction\b.*\b(major|sweeping|comprehensive|new)/i], reason: 'Major new sanctions' },
  { priority: 'P1', patterns: [/\bmarket\s+crash\b/i, /\bstock\s+(crash|plunge|collapse)/i], reason: 'Market crash' },
  { priority: 'P1', patterns: [/\bexport\s+(ban|control)\b.*\b(chip|semiconductor|AI|technology)/i], reason: 'Technology export restriction' },
  { priority: 'P1', patterns: [/\bcyber\s*attack\b.*\b(critical|infrastructure|hospital|grid|pipeline)/i], reason: 'Critical infrastructure cyber attack' },
  { priority: 'P1', patterns: [/\bfactory\s+(explos|fire|flood|destro)/i, /\bfab\s+(fire|flood|destro)/i], reason: 'Major facility destruction' },
  { priority: 'P1', patterns: [/\b(earthquake|tsunami)\b.*\b(magnitude\s+[789]|devastating|catastrophic)/i], reason: 'Major natural disaster' },
  // P2 — Emerging trend / regional disruption
  { priority: 'P2', patterns: [/\btariff\b.*\b(new|increas|impos)/i], reason: 'New trade tariff' },
  { priority: 'P2', patterns: [/\bregulat(ion|ory)\b.*\b(new|proposed|passed|enacted)/i], reason: 'New regulation' },
  { priority: 'P2', patterns: [/\bcurrency\b.*\b(crash|devaluat|plunge|crisis)/i], reason: 'Currency crisis' },
  { priority: 'P2', patterns: [/\bdata\s+breach\b.*\b(million|billion|massive|major)/i], reason: 'Major data breach' },
  { priority: 'P2', patterns: [/\b(drought|flood|hurricane|typhoon)\b.*\b(severe|extreme|record)/i], reason: 'Severe weather event' },
  // P3 — Early signal (default)
];

function classifyPriority(text: string): { priority: DisruptionPriority; reason: string } {
  for (const rule of PRIORITY_RULES) {
    for (const re of rule.patterns) {
      if (re.test(text)) return { priority: rule.priority, reason: rule.reason };
    }
  }
  return { priority: 'P3', reason: 'Early signal detected' };
}

// ── Category Classification ────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<{ category: DisruptionSignal['disruptionCategory']; patterns: RegExp[] }> = [
  { category: 'conflict', patterns: [/\b(war|invasion|conflict|military|strike|bomb|missile|attack)\b/i] },
  { category: 'geopolitical', patterns: [/\b(sanction|diplomat|geopolitic|trade war|embargo|alliance)\b/i] },
  { category: 'cyber_attack', patterns: [/\b(cyber|hack|ransomware|breach|malware|phishing|DDoS)\b/i] },
  { category: 'natural_disaster', patterns: [/\b(earthquake|tsunami|hurricane|typhoon|flood|wildfire|volcano|tornado)\b/i] },
  { category: 'market_crash', patterns: [/\b(market crash|stock crash|recession|financial crisis|bank fail|bond crash)\b/i] },
  { category: 'regulatory_shock', patterns: [/\b(regulat|antitrust|ban|moratorium|legislation|compliance|fine)\b/i] },
  { category: 'pandemic', patterns: [/\b(pandemic|outbreak|epidemic|virus|quarantine|lockdown)\b/i] },
  { category: 'infrastructure', patterns: [/\b(power outage|grid fail|internet outage|cable cut|infrastructure)\b/i] },
];

function classifyCategory(text: string): DisruptionSignal['disruptionCategory'] {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const re of patterns) {
      if (re.test(text)) return category;
    }
  }
  return 'general';
}

function detectAffectedIndustries(text: string): string[] {
  const industries: string[] = [];
  if (/\b(semiconductor|chip|foundry|fab)\b/i.test(text)) industries.push('semiconductor');
  if (/\b(defense|military|weapon|missile)\b/i.test(text)) industries.push('defense');
  if (/\b(energy|oil|gas|solar|nuclear|grid)\b/i.test(text)) industries.push('energy');
  if (/\b(finance|bank|stock|market|crypto)\b/i.test(text)) industries.push('finance');
  if (/\b(healthcare|pharma|hospital|drug)\b/i.test(text)) industries.push('healthcare');
  if (/\b(tech|AI|software|cloud|internet)\b/i.test(text)) industries.push('technology');
  if (/\b(manufacturing|factory|production)\b/i.test(text)) industries.push('manufacturing');
  if (/\b(shipping|logistics|transport|port)\b/i.test(text)) industries.push('logistics');
  if (/\b(agriculture|food|crop|farm)\b/i.test(text)) industries.push('agriculture');
  return industries.length > 0 ? industries : ['general'];
}

// ── Main Runner ───────────────────────────────────────────────────────────────

const CONCURRENCY = 10;
let _cached: DisruptionMonitorResult | null = null;
let _cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min (disruptions need faster refresh)

export async function runDisruptionMonitorAgent(): Promise<DisruptionMonitorResult> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;

  const start = Date.now();
  const feeds = DISRUPTION_FEEDS;
  let feedsOk = 0;
  const allSignals: DisruptionSignal[] = [];
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

        const key = (item.title ?? '').toLowerCase().slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const category = classifyCategory(text);
        const { priority, reason } = classifyPriority(text);
        const affectedIndustries = detectAffectedIndustries(text);

        allSignals.push({
          id: `dis-${Date.now()}-${allSignals.length}`,
          title: (item.title ?? '').slice(0, 200),
          url: item.link ?? feed.url,
          source: feed.name,
          disruptionCategory: category,
          priority,
          priorityReason: reason,
          affectedIndustries,
          confidence: priority === 'P0' ? 0.95 : priority === 'P1' ? 0.85 : priority === 'P2' ? 0.7 : 0.5,
          discoveredAt: item.pubDate ?? new Date().toISOString(),
          tags: [...feed.tags, priority, category],
        });
      }
    }
  }

  // Sort by priority (P0 first)
  const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  allSignals.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const s of allSignals) {
    byCategory[s.disruptionCategory] = (byCategory[s.disruptionCategory] ?? 0) + 1;
    byPriority[s.priority] = (byPriority[s.priority] ?? 0) + 1;
  }

  const result: DisruptionMonitorResult = {
    signals: allSignals,
    as_of: new Date().toISOString(),
    feeds_scanned: feeds.length,
    feeds_ok: feedsOk,
    total_disruptions: allSignals.length,
    by_category: byCategory,
    by_priority: byPriority,
    p0_count: byPriority['P0'] ?? 0,
    p1_count: byPriority['P1'] ?? 0,
    scan_duration_ms: Date.now() - start,
  };

  _cached = result;
  _cachedAt = Date.now();
  return result;
}
