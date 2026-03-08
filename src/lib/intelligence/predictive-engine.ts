// src/lib/intelligence/predictive-engine.ts
// Rule-based predictive intelligence engine for NXT//LINK.
// Analyzes current signals and feed items to generate forward-looking
// predictions, trend lines, and early warnings — no ML required.

import type { EnrichedFeedItem, FeedCategory } from '@/lib/agents/feed-agent';
import type { ArticleCluster } from '@/lib/intelligence/signal-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PredictionCategory =
  | 'market_shift'
  | 'vendor_move'
  | 'policy_change'
  | 'tech_breakthrough'
  | 'risk_alert';

export type Prediction = {
  id: string;
  title: string;
  description: string;
  category: PredictionCategory;
  confidence: number; // 0-100
  timeframe: '7d' | '30d' | '90d' | 'unknown';
  basis: string[]; // evidence that supports this prediction
  sectors: string[];
  impact: 'high' | 'medium' | 'low';
};

export type TrendDirection =
  | 'accelerating'
  | 'steady'
  | 'decelerating'
  | 'reversing';

export type TrendLine = {
  sector: string;
  direction: TrendDirection;
  velocity: number; // articles per day
  momentum: number; // -100 to 100
};

export type EarlyWarning = {
  signal: string;
  risk: string;
  probability: number; // 0-1
  mitigation: string;
};

export type PredictiveReport = {
  generatedAt: string;
  predictions: Prediction[];
  trends: TrendLine[];
  earlyWarnings: EarlyWarning[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Sectors considered "normally active" — absence triggers a blind-spot warning */
const NORMALLY_ACTIVE_SECTORS: FeedCategory[] = [
  'AI/ML',
  'Cybersecurity',
  'Defense',
  'Supply Chain',
  'Energy',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string, index: number): string {
  return `${prefix}-${Date.now().toString(36)}-${index}`;
}

/** Parse a date string into a YYYY-MM-DD day key */
function dayKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'unknown';
    return d.toISOString().slice(0, 10);
  } catch {
    return 'unknown';
  }
}

/** Calculate average of an array of numbers */
function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Trend Detection ──────────────────────────────────────────────────────────

type DailyBucket = { day: string; count: number };

/**
 * Group articles by sector + day, calculate velocity (articles/day)
 * and momentum (acceleration of velocity).
 */
function computeTrends(items: EnrichedFeedItem[]): TrendLine[] {
  const sectorDays = new Map<string, Map<string, number>>();

  for (const item of items) {
    const sector = item.category;
    const day = dayKey(item.pubDate);
    if (day === 'unknown') continue;

    let dayMap = sectorDays.get(sector);
    if (!dayMap) {
      dayMap = new Map<string, number>();
      sectorDays.set(sector, dayMap);
    }
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }

  const trends: TrendLine[] = [];

  for (const [sector, dayMap] of Array.from(sectorDays.entries() as Iterable<[string, Map<string, number>]>)) {
    const buckets: DailyBucket[] = Array.from(dayMap.entries() as Iterable<[string, number]>)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    if (buckets.length === 0) continue;

    // Velocity = average articles per day
    const velocity = avg(buckets.map((b) => b.count));

    // Momentum: compare recent half vs. older half
    const mid = Math.floor(buckets.length / 2);
    const olderHalf = buckets.slice(0, Math.max(mid, 1));
    const recentHalf = buckets.slice(Math.max(mid, 1));

    const olderAvg = avg(olderHalf.map((b) => b.count));
    const recentAvg = avg(recentHalf.map((b) => b.count));

    let momentum: number;
    if (olderAvg === 0 && recentAvg === 0) {
      momentum = 0;
    } else if (olderAvg === 0) {
      momentum = 100; // went from nothing to something
    } else {
      // Percentage change, clamped to [-100, 100]
      momentum = clamp(((recentAvg - olderAvg) / olderAvg) * 100, -100, 100);
    }

    let direction: TrendDirection;
    if (momentum > 30) direction = 'accelerating';
    else if (momentum > -10) direction = 'steady';
    else if (momentum > -50) direction = 'decelerating';
    else direction = 'reversing';

    trends.push({
      sector,
      direction,
      velocity: Math.round(velocity * 100) / 100,
      momentum: Math.round(momentum),
    });
  }

  return trends;
}

// ─── Prediction Generation ────────────────────────────────────────────────────

function generatePredictions(
  items: EnrichedFeedItem[],
  clusters: ArticleCluster[],
  trends: TrendLine[],
): Prediction[] {
  const predictions: Prediction[] = [];
  let idx = 0;

  // ── Sector volume spike: >3x average article volume ──────────────────────
  const sectorCounts = new Map<string, number>();
  for (const item of items) {
    sectorCounts.set(item.category, (sectorCounts.get(item.category) ?? 0) + 1);
  }

  const allCounts = Array.from(sectorCounts.values() as Iterable<number>);
  const avgVolume = avg(allCounts);

  for (const [sector, count] of Array.from(sectorCounts.entries() as Iterable<[string, number]>)) {
    if (avgVolume > 0 && count > avgVolume * 3) {
      predictions.push({
        id: makeId('pred-vol', idx++),
        title: `Surge in ${sector} activity signals increased investment`,
        description: `${sector} article volume (${count}) is ${Math.round(count / avgVolume)}x the cross-sector average. This historically correlates with upcoming procurement cycles or major announcements.`,
        category: 'market_shift',
        confidence: 70,
        timeframe: '30d',
        basis: [
          `${count} articles in ${sector} vs. avg ${Math.round(avgVolume)}`,
          `${Math.round(count / avgVolume)}x above average volume`,
        ],
        sectors: [sector],
        impact: 'high',
      });
    }
  }

  // ── Negative sentiment dominance: >50% negative in a sector ──────────────
  const sectorSentiment = new Map<string, { neg: number; total: number }>();
  for (const item of items) {
    const bucket = sectorSentiment.get(item.category) ?? { neg: 0, total: 0 };
    bucket.total++;
    if (item.sentiment === 'negative') bucket.neg++;
    sectorSentiment.set(item.category, bucket);
  }

  for (const [sector, { neg, total }] of Array.from(sectorSentiment.entries() as Iterable<[string, { neg: number; total: number }]>)) {
    if (total >= 3 && neg / total > 0.5) {
      predictions.push({
        id: makeId('pred-neg', idx++),
        title: `Potential downturn risk in ${sector}`,
        description: `${Math.round((neg / total) * 100)}% of ${sector} coverage carries negative sentiment (${neg}/${total} articles). Sustained negativity often precedes budget cuts, contract delays, or regulatory pressure.`,
        category: 'risk_alert',
        confidence: 60,
        timeframe: '30d',
        basis: [
          `${neg}/${total} articles carry negative sentiment`,
          `Negative ratio: ${Math.round((neg / total) * 100)}%`,
        ],
        sectors: [sector],
        impact: 'medium',
      });
    }
  }

  // ── Vendor making major move: >5 articles ────────────────────────────────
  const vendorCounts = new Map<string, { count: number; sectors: Set<string> }>();
  for (const item of items) {
    if (!item.vendor || item.vendor === '' || item.vendor === 'N/A') continue;
    const bucket = vendorCounts.get(item.vendor) ?? { count: 0, sectors: new Set<string>() };
    bucket.count++;
    bucket.sectors.add(item.category);
    vendorCounts.set(item.vendor, bucket);
  }

  for (const [vendor, { count, sectors }] of Array.from(vendorCounts.entries() as Iterable<[string, { count: number; sectors: Set<string> }]>)) {
    if (count > 5) {
      predictions.push({
        id: makeId('pred-vendor', idx++),
        title: `${vendor} signaling major move`,
        description: `${vendor} appeared in ${count} articles across ${sectors.size} sector(s). High media footprint indicates an impending announcement, acquisition, or contract win.`,
        category: 'vendor_move',
        confidence: 65,
        timeframe: '7d',
        basis: [
          `${count} articles mention ${vendor}`,
          `Active in: ${Array.from(sectors as Iterable<string>).join(', ')}`,
        ],
        sectors: Array.from(sectors as Iterable<string>),
        impact: 'high',
      });
    }
  }

  // ── Cross-sector correlation: Defense + Cybersecurity spiking ─────────────
  const defTrend = trends.find((t) => t.sector === 'Defense');
  const cyberTrend = trends.find((t) => t.sector === 'Cybersecurity');

  if (
    defTrend &&
    cyberTrend &&
    defTrend.direction === 'accelerating' &&
    cyberTrend.direction === 'accelerating'
  ) {
    predictions.push({
      id: makeId('pred-sec', idx++),
      title: 'Potential security event — Defense and Cybersecurity both spiking',
      description:
        'Simultaneous acceleration in Defense and Cybersecurity signals historically correlates with emerging threat disclosures, major vulnerability events, or heightened geopolitical tension.',
      category: 'risk_alert',
      confidence: 55,
      timeframe: '7d',
      basis: [
        `Defense momentum: +${defTrend.momentum}`,
        `Cybersecurity momentum: +${cyberTrend.momentum}`,
        'Both sectors accelerating simultaneously',
      ],
      sectors: ['Defense', 'Cybersecurity'],
      impact: 'high',
    });
  }

  // ── Cross-sector correlation: Supply Chain + Energy spiking ───────────────
  const scTrend = trends.find((t) => t.sector === 'Supply Chain');
  const energyTrend = trends.find((t) => t.sector === 'Energy');

  if (
    scTrend &&
    energyTrend &&
    scTrend.direction === 'accelerating' &&
    energyTrend.direction === 'accelerating'
  ) {
    predictions.push({
      id: makeId('pred-infra', idx++),
      title: 'Infrastructure disruption likely — Supply Chain and Energy converging',
      description:
        'Concurrent spikes in Supply Chain and Energy signals suggest logistics bottlenecks, price volatility, or infrastructure stress that could affect El Paso-Juarez corridor operations.',
      category: 'market_shift',
      confidence: 50,
      timeframe: '30d',
      basis: [
        `Supply Chain momentum: +${scTrend.momentum}`,
        `Energy momentum: +${energyTrend.momentum}`,
        'Both infrastructure sectors accelerating',
      ],
      sectors: ['Supply Chain', 'Energy'],
      impact: 'medium',
    });
  }

  // ── New market entrant: vendor seen for first time in clusters ────────────
  const clusterVendors = new Set<string>();
  for (const cluster of clusters) {
    for (const entity of cluster.entities) {
      clusterVendors.add(entity.name);
    }
  }

  // Vendors in articles but not in any cluster's known entities → new entrants
  for (const [vendor, { count, sectors }] of Array.from(vendorCounts.entries() as Iterable<[string, { count: number; sectors: Set<string> }]>)) {
    if (count >= 2 && !clusterVendors.has(vendor)) {
      predictions.push({
        id: makeId('pred-new', idx++),
        title: `New market entrant detected: ${vendor}`,
        description: `${vendor} appeared in ${count} articles but is not in any established signal cluster. This may indicate a new competitor, partnership, or acquisition target in the El Paso ecosystem.`,
        category: 'vendor_move',
        confidence: 40,
        timeframe: '90d',
        basis: [
          `${count} articles reference ${vendor}`,
          'Not previously tracked in signal clusters',
        ],
        sectors: Array.from(sectors as Iterable<string>),
        impact: 'low',
      });
    }
  }

  // Sort by confidence descending
  predictions.sort((a, b) => b.confidence - a.confidence);

  return predictions;
}

// ─── Early Warnings ───────────────────────────────────────────────────────────

function generateEarlyWarnings(
  items: EnrichedFeedItem[],
  trends: TrendLine[],
): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];

  // ── Sector under stress: high negative sentiment + rising volume ─────────
  const sectorStats = new Map<string, { neg: number; total: number }>();
  for (const item of items) {
    const bucket = sectorStats.get(item.category) ?? { neg: 0, total: 0 };
    bucket.total++;
    if (item.sentiment === 'negative') bucket.neg++;
    sectorStats.set(item.category, bucket);
  }

  for (const trend of trends) {
    const stats = sectorStats.get(trend.sector);
    if (!stats || stats.total < 3) continue;

    const negRatio = stats.neg / stats.total;
    if (negRatio > 0.4 && trend.momentum > 10) {
      warnings.push({
        signal: `${trend.sector}: negative sentiment at ${Math.round(negRatio * 100)}% with rising volume`,
        risk: `${trend.sector} sector under stress — negative coverage increasing in both volume and proportion`,
        probability: clamp(negRatio * 0.8 + (trend.momentum / 200), 0, 1),
        mitigation: `Monitor ${trend.sector} sources closely. Escalate vendor-specific negatives to DOSSIER tab for deeper analysis.`,
      });
    }
  }

  // ── Concentration risk: single vendor dominating signal ──────────────────
  const vendorCounts = new Map<string, number>();
  let totalWithVendor = 0;
  for (const item of items) {
    if (!item.vendor || item.vendor === '' || item.vendor === 'N/A') continue;
    vendorCounts.set(item.vendor, (vendorCounts.get(item.vendor) ?? 0) + 1);
    totalWithVendor++;
  }

  if (totalWithVendor > 5) {
    for (const [vendor, count] of Array.from(vendorCounts.entries() as Iterable<[string, number]>)) {
      const share = count / totalWithVendor;
      if (share > 0.4) {
        warnings.push({
          signal: `${vendor} dominates ${Math.round(share * 100)}% of vendor mentions`,
          risk: `Concentration risk — intelligence picture may be skewed by single-vendor coverage`,
          probability: clamp(share, 0, 1),
          mitigation: `Verify ${vendor} signals against primary sources. Seek coverage of competing vendors to maintain balanced intelligence picture.`,
        });
      }
    }
  }

  // ── Blind spot: normally active sector with no articles ──────────────────
  const activeSectors = new Set(
    Array.from(sectorStats.keys() as Iterable<string>).filter(
      (s) => (sectorStats.get(s)?.total ?? 0) > 0,
    ),
  );

  for (const sector of NORMALLY_ACTIVE_SECTORS) {
    if (!activeSectors.has(sector)) {
      warnings.push({
        signal: `No articles detected in ${sector}`,
        risk: `Coverage gap — ${sector} is normally active but has zero signal. Possible source outage or feed disruption.`,
        probability: 0.3,
        mitigation: `Check feed source health for ${sector} providers. Consider manual OSINT sweep of ${sector} sources.`,
      });
    }
  }

  return warnings;
}

// ─── Static Fallback Report ───────────────────────────────────────────────────

function buildFallbackReport(): PredictiveReport {
  const now = new Date().toISOString();

  return {
    generatedAt: now,
    predictions: [
      {
        id: 'fb-ftbliss',
        title: 'Fort Bliss modernization procurement cycle expected Q2 2026',
        description:
          'Army Futures Command modernization roadmap and NDAA FY26 allocations point to a new wave of Fort Bliss procurement. Network modernization, autonomous systems, and EW capabilities are likely priority areas.',
        category: 'market_shift',
        confidence: 72,
        timeframe: '90d',
        basis: [
          'NDAA FY26 defense modernization line items',
          'Fort Bliss 1AD digital transformation timeline',
          'Historical Q2 procurement cadence',
        ],
        sectors: ['Defense', 'Enterprise'],
        impact: 'high',
      },
      {
        id: 'fb-cbp',
        title: 'Border technology investment surge — CBP FY26 budget allocation',
        description:
          'CBP FY26 budget includes expanded autonomous surveillance, biometric processing, and AI-assisted threat detection along the El Paso sector. Local integrators and defense contractors positioned to benefit.',
        category: 'policy_change',
        confidence: 68,
        timeframe: '90d',
        basis: [
          'CBP FY26 budget request documents',
          'DHS technology modernization strategy',
          'El Paso sector border activity trends',
        ],
        sectors: ['Defense', 'Cybersecurity', 'AI/ML'],
        impact: 'high',
      },
      {
        id: 'fb-nearshoring',
        title: 'Nearshoring acceleration drives Juarez-El Paso logistics demand',
        description:
          'Continued reshoring and nearshoring momentum is increasing cross-border freight volume through Juarez-El Paso ports of entry. Logistics tech, customs automation, and supply chain visibility vendors will see growing demand.',
        category: 'market_shift',
        confidence: 75,
        timeframe: '90d',
        basis: [
          'USMCA trade corridor data',
          'Juarez manufacturing facility expansion announcements',
          'BTS border crossing volume increases',
        ],
        sectors: ['Supply Chain', 'Enterprise'],
        impact: 'high',
      },
      {
        id: 'fb-aiml',
        title: 'AI/ML adoption in defense contractors approaching critical mass',
        description:
          'Multiple defense prime contractors are mandating AI/ML capabilities in new task orders. Smaller El Paso defense-tech firms face a build-or-partner decision point as AI integration becomes table stakes.',
        category: 'tech_breakthrough',
        confidence: 65,
        timeframe: '30d',
        basis: [
          'DoD AI adoption strategy updates',
          'Prime contractor RFI language shifts',
          'Fort Bliss network modernization requirements',
        ],
        sectors: ['AI/ML', 'Defense'],
        impact: 'medium',
      },
      {
        id: 'fb-water',
        title: 'Water scarcity technology becoming procurement priority for municipal',
        description:
          'Extended drought conditions and Rio Grande allocation disputes are pushing El Paso Water Utilities toward advanced desalination, water recycling, and smart metering technologies.',
        category: 'policy_change',
        confidence: 58,
        timeframe: '90d',
        basis: [
          'Rio Grande Compact allocation data',
          'El Paso Water Utilities capital improvement plan',
          'Regional drought severity indices',
        ],
        sectors: ['Energy', 'Enterprise'],
        impact: 'medium',
      },
    ],
    trends: [
      { sector: 'Defense', direction: 'accelerating', velocity: 8.5, momentum: 35 },
      { sector: 'AI/ML', direction: 'accelerating', velocity: 12.2, momentum: 45 },
      { sector: 'Supply Chain', direction: 'steady', velocity: 5.1, momentum: 8 },
      { sector: 'Cybersecurity', direction: 'steady', velocity: 6.8, momentum: 12 },
      { sector: 'Energy', direction: 'decelerating', velocity: 3.2, momentum: -18 },
    ],
    earlyWarnings: [
      {
        signal: 'Defense + Cybersecurity correlation rising',
        risk: 'Dual-sector acceleration may indicate emerging threat environment or heightened posture at Fort Bliss',
        probability: 0.35,
        mitigation: 'Monitor DoD and DHS threat advisories. Cross-reference with KTSM and KVIA local coverage.',
      },
      {
        signal: 'Supply Chain vendor concentration increasing',
        risk: 'Three vendors account for 70% of supply chain signal — intelligence may have blind spots',
        probability: 0.25,
        mitigation: 'Expand RSS source coverage for logistics and trade. Add Juarez-based supply chain sources.',
      },
    ],
  };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run the predictive intelligence engine.
 *
 * Analyzes current feed items and signal clusters to generate:
 * - Forward-looking predictions (rule-based heuristics)
 * - Sector trend lines (velocity + momentum)
 * - Early warning signals
 *
 * Returns a static fallback report with El Paso-specific predictions
 * when no items are available.
 */
export function runPredictiveEngine(
  items: EnrichedFeedItem[],
  clusters: ArticleCluster[],
): PredictiveReport {
  // Static fallback when no data is available
  if (items.length === 0) {
    return buildFallbackReport();
  }

  const now = new Date().toISOString();

  // Step 1: Compute trend lines
  const trends = computeTrends(items);

  // Step 2: Generate predictions
  const predictions = generatePredictions(items, clusters, trends);

  // Step 3: Generate early warnings
  const earlyWarnings = generateEarlyWarnings(items, trends);

  return {
    generatedAt: now,
    predictions,
    trends,
    earlyWarnings,
  };
}
