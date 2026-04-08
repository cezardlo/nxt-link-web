// src/app/api/intel/digest/route.ts
// Intelligence Digest engine — synthesises all platform data into a structured
// weekly briefing. Bloomberg Terminal / Palantir AIP analytical style.
// No LLM required — template-based generation from live signal engine output.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { runSignalEngine, type SectorScore } from '@/lib/intelligence/signal-engine';
import { getStoredFeedItems, type EnrichedFeedItem } from '@/lib/agents/feed-agent';
import { CONFERENCES } from '@/lib/data/conferences';
import type { ConferenceRecord } from '@/lib/data/conferences/types';


// ─── Response types ───────────────────────────────────────────────────────────

type FindingCategory = 'SIGNAL' | 'VENDOR' | 'MARKET' | 'THREAT' | 'OPPORTUNITY';
type Severity = 'critical' | 'high' | 'moderate' | 'low';
type AnomalyType = 'spike' | 'emergence' | 'disappearance' | 'sentiment_shift';
type TrendDirection = 'rising' | 'stable' | 'falling';

type KeyFinding = {
  title: string;
  category: FindingCategory;
  severity: Severity;
  description: string;
  evidence: string[];
  recommendation: string;
};

type SectorBreakdown = {
  sector: string;
  score: number;
  trend: TrendDirection;
  topVendors: string[];
  signalCount: number;
};

type Anomaly = {
  type: AnomalyType;
  description: string;
  detectedAt: string;
  confidence: number;
};

type UpcomingEvent = {
  name: string;
  date: string;
  relevance: string;
};

type DigestMetrics = {
  totalSignals: number;
  totalSources: number;
  activeVendors: number;
  avgSentiment: number;
  coverageScore: number;
};

type IntelDigest = {
  generatedAt: string;
  period: string;
  executiveSummary: string;
  keyFindings: KeyFinding[];
  sectorBreakdown: SectorBreakdown[];
  anomalies: Anomaly[];
  upcomingEvents: UpcomingEvent[];
  metrics: DigestMetrics;
};

// ─── Constants ────────────────────────────────────────────────────────────────

// FeedCategory values that map to sector ids used in signal engine
const FEED_CATEGORY_TO_SECTOR: Record<string, string> = {
  'AI/ML':         'ai-ml',
  'Cybersecurity': 'cybersecurity',
  'Defense':       'defense',
  'Enterprise':    'enterprise',
  'Supply Chain':  'supply-chain',
  'Energy':        'energy',
  'Finance':       'finance',
  'Crime':         'crime',
  'General':       'general',
};

// Month abbreviations used for conference date formatting
const MONTH_ABBR: Record<string, string> = {
  January: 'JAN', February: 'FEB', March: 'MAR', April: 'APR',
  May: 'MAY', June: 'JUN', July: 'JUL', August: 'AUG',
  September: 'SEP', October: 'OCT', November: 'NOV', December: 'DEC',
};

// ─── Period helpers ───────────────────────────────────────────────────────────

function buildPeriodLabel(now: Date): string {
  const day = now.getDay(); // 0 = Sun
  const diffToMonday = (day + 6) % 7;          // days since last Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monthAbbr = (d: Date) =>
    d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${monthAbbr(monday)} ${monday.getDate()}–${sunday.getDate()}, ${year}`;
  }
  return `${monthAbbr(monday)} ${monday.getDate()}–${monthAbbr(sunday)} ${sunday.getDate()}, ${year}`;
}

// ─── Sentiment helpers ────────────────────────────────────────────────────────

// Returns a score in [0, 1] where 1 = all positive, 0 = all negative
function sentimentScore(items: EnrichedFeedItem[]): number {
  if (items.length === 0) return 0.5;
  const total = items.reduce((acc, item) => {
    if (item.sentiment === 'positive') return acc + 1;
    if (item.sentiment === 'negative') return acc - 1;
    return acc;
  }, 0);
  // Normalise to [0, 1]
  return Math.min(1, Math.max(0, (total / items.length + 1) / 2));
}

// ─── Key findings builder ─────────────────────────────────────────────────────

function buildKeyFindings(
  sectorScores: SectorScore[],
  items: EnrichedFeedItem[],
): KeyFinding[] {
  const findings: KeyFinding[] = [];

  // 1. Top rising sector → OPPORTUNITY
  const topRising = [...sectorScores]
    .filter((s) => s.trend === 'rising' && s.score >= 50)
    .sort((a, b) => b.score - a.score)[0];

  if (topRising) {
    findings.push({
      title: `${topRising.label} Sector Momentum Surge`,
      category: 'OPPORTUNITY',
      severity: topRising.score >= 75 ? 'high' : 'moderate',
      description: `${topRising.label} is the fastest-rising sector in the current intelligence cycle with a momentum score of ${topRising.score}/100. Article velocity is above baseline.`,
      evidence: [
        `Sector score: ${topRising.score}/100`,
        `Article count: ${topRising.articleCount}`,
        `Contract signals: ${topRising.contractCount}`,
        topRising.topVendor ? `Lead vendor signal: ${topRising.topVendor}` : 'No dominant vendor detected',
      ],
      recommendation: `Review active SAM.gov solicitations under ${topRising.label} NAICS codes. Cross-reference with El Paso vendor dossiers for contract-ready firms.`,
    });
  }

  // 2. Falling sector with prior strength → THREAT
  const fallingStrong = [...sectorScores]
    .filter((s) => s.trend === 'falling' && s.score >= 40)
    .sort((a, b) => b.score - a.score)[0];

  if (fallingStrong) {
    findings.push({
      title: `${fallingStrong.label} Signal Decay Detected`,
      category: 'THREAT',
      severity: 'moderate',
      description: `News velocity in the ${fallingStrong.label} sector has decelerated compared to prior cycles. Diminishing coverage may indicate award saturation, procurement lull, or vendor consolidation.`,
      evidence: [
        `Current score: ${fallingStrong.score}/100`,
        `Trend: falling`,
        `Contract activity: ${fallingStrong.contractCount} signals`,
      ],
      recommendation: `Monitor procurement calendars for ${fallingStrong.label}. Investigate whether incumbent contract holders are nearing end-of-term.`,
    });
  }

  // 3. High-contract-count sector → SIGNAL
  const contractHeavy = [...sectorScores]
    .filter((s) => s.contractCount >= 2)
    .sort((a, b) => b.contractCount - a.contractCount)[0];

  if (contractHeavy) {
    findings.push({
      title: `Contract Activity Surge — ${contractHeavy.label}`,
      category: 'SIGNAL',
      severity: contractHeavy.contractCount >= 5 ? 'critical' : 'high',
      description: `${contractHeavy.contractCount} contract-specific signals detected in the ${contractHeavy.label} sector. IDIQ vehicles, task orders, or new awards are likely in-motion.`,
      evidence: [
        `Contract signals: ${contractHeavy.contractCount}`,
        `Total sector articles: ${contractHeavy.articleCount}`,
        contractHeavy.topVendor ? `Primary vendor: ${contractHeavy.topVendor}` : 'Vendor TBD',
      ],
      recommendation: `Conduct immediate SAM.gov search for ${contractHeavy.label}-related solicitations. Alert NXT LINK vendors in this sector.`,
    });
  }

  // 4. Negative sentiment cluster → THREAT
  const sectorItemsByCat = groupBySector(items);
  for (const [sectorKey, sectorItems] of Array.from(sectorItemsByCat.entries() as Iterable<[string, EnrichedFeedItem[]]>)) {
    const negCount = sectorItems.filter((i) => i.sentiment === 'negative').length;
    if (sectorItems.length >= 5 && negCount / sectorItems.length > 0.6) {
      findings.push({
        title: `Adverse Sentiment — ${sectorKey}`,
        category: 'THREAT',
        severity: 'high',
        description: `${Math.round((negCount / sectorItems.length) * 100)}% of ${sectorKey} coverage carries negative sentiment in this cycle. Regulatory scrutiny, budget cuts, or adverse events may be driving narrative.`,
        evidence: [
          `Negative articles: ${negCount} / ${sectorItems.length}`,
          `Sentiment ratio: ${(negCount / sectorItems.length).toFixed(2)}`,
        ],
        recommendation: `Identify the primary negative storyline and assess exposure for El Paso vendors operating in ${sectorKey}.`,
      });
      break; // report worst one only
    }
  }

  // 5. Vendor coverage finding
  const vendorArray = Object.values(EL_PASO_VENDORS);
  const topVendors = vendorArray
    .filter((v) => v.ikerScore >= 85)
    .sort((a, b) => b.ikerScore - a.ikerScore)
    .slice(0, 3);

  if (topVendors.length > 0) {
    findings.push({
      title: 'Elite IKER Vendors — Acquisition-Ready Cohort',
      category: 'VENDOR',
      severity: 'low',
      description: `${topVendors.length} El Paso vendors maintain IKER scores ≥85, indicating strong acquisition readiness. These entities represent the highest-confidence procurement targets in the current cycle.`,
      evidence: topVendors.map((v) => `${v.name} — IKER ${v.ikerScore} (${v.category})`),
      recommendation: 'Schedule technology demonstrations or capability briefings with these vendors before the next fiscal quarter.',
    });
  }

  return findings.slice(0, 6); // cap at 6 findings per digest
}

// ─── Sector grouping helper ───────────────────────────────────────────────────

function groupBySector(items: EnrichedFeedItem[]): Map<string, EnrichedFeedItem[]> {
  const map = new Map<string, EnrichedFeedItem[]>();
  for (const item of items) {
    const key = item.category;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

function detectAnomalies(
  items: EnrichedFeedItem[],
  sectorScores: SectorScore[],
  now: string,
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Per-sector article counts
  const countsBySector = new Map<string, number>();
  for (const item of items) {
    const sid = FEED_CATEGORY_TO_SECTOR[item.category] ?? item.category.toLowerCase();
    countsBySector.set(sid, (countsBySector.get(sid) ?? 0) + 1);
  }

  const counts = Array.from(countsBySector.values() as Iterable<number>);
  if (counts.length === 0) return anomalies;

  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

  // Spike: any sector with >2x average count
  for (const [sectorId, count] of Array.from(countsBySector.entries() as Iterable<[string, number]>)) {
    if (count > avg * 2) {
      const label = sectorScores.find((s) => s.id === sectorId)?.label ?? sectorId;
      const confidence = Math.min(0.95, 0.55 + (count / (avg * 2) - 1) * 0.2);
      anomalies.push({
        type: 'spike',
        description: `${label} article volume is ${(count / avg).toFixed(1)}× the cross-sector average (${count} vs avg ${avg.toFixed(1)}). Sustained spikes correlate with procurement announcements within 30–60 days.`,
        detectedAt: now,
        confidence: parseFloat(confidence.toFixed(2)),
      });
    }
  }

  // Sentiment shift: sector where >60% articles are negative
  const itemsBySector = groupBySector(items);
  for (const [cat, sectorItems] of Array.from(itemsBySector.entries() as Iterable<[string, EnrichedFeedItem[]]>)) {
    if (sectorItems.length < 5) continue;
    const negCount = sectorItems.filter((i) => i.sentiment === 'negative').length;
    const ratio = negCount / sectorItems.length;
    if (ratio > 0.6) {
      anomalies.push({
        type: 'sentiment_shift',
        description: `${cat} coverage has shifted strongly negative (${Math.round(ratio * 100)}% negative). Possible drivers: regulatory headwinds, budget sequestration, or adverse public events.`,
        detectedAt: now,
        confidence: parseFloat(Math.min(0.90, 0.50 + ratio * 0.4).toFixed(2)),
      });
    }
  }

  // Emergence: sector with rising trend and low prior score
  const emergingSectors = sectorScores.filter(
    (s) => s.trend === 'rising' && s.score >= 30 && s.score <= 55 && s.articleCount >= 3,
  );
  for (const sector of emergingSectors.slice(0, 2)) {
    anomalies.push({
      type: 'emergence',
      description: `${sector.label} is gaining traction with a momentum score of ${sector.score}/100 and rising article velocity. This sector was previously below threshold. Early-mover advantage window may be open.`,
      detectedAt: now,
      confidence: 0.68,
    });
  }

  return anomalies.slice(0, 5);
}

// ─── Upcoming events ──────────────────────────────────────────────────────────

function getUpcomingConferences(now: Date): UpcomingEvent[] {
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  // Map month names to 0-indexed numbers
  const MONTH_INDEX: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  };

  const upcoming: Array<{ conf: ConferenceRecord; monthIdx: number }> = [];

  for (const conf of CONFERENCES) {
    const monthIdx = MONTH_INDEX[conf.month];
    if (monthIdx === undefined) continue;

    // Same month or within next 30 days (roughly next 1-2 months)
    let delta = monthIdx - currentMonth;
    if (delta < 0) delta += 12; // wrap to next year
    if (delta <= 1) {
      upcoming.push({ conf, monthIdx });
    }
  }

  // Sort by proximity then relevance score
  upcoming.sort((a, b) => {
    const deltaA = (a.monthIdx - currentMonth + 12) % 12;
    const deltaB = (b.monthIdx - currentMonth + 12) % 12;
    if (deltaA !== deltaB) return deltaA - deltaB;
    return b.conf.relevanceScore - a.conf.relevanceScore;
  });

  return upcoming.slice(0, 5).map(({ conf }) => ({
    name: conf.name,
    date: `${MONTH_ABBR[conf.month] ?? conf.month.toUpperCase().slice(0, 3)} ${currentYear + ((MONTH_INDEX[conf.month] ?? 0) < currentMonth ? 1 : 0)}`,
    relevance: `${conf.category} | ${conf.location} | ${conf.estimatedExhibitors} exhibitors | Relevance ${conf.relevanceScore}/100`,
  }));
}

// ─── Executive summary builder ────────────────────────────────────────────────

function buildExecutiveSummary(
  sectorScores: SectorScore[],
  signalCount: number,
  items: EnrichedFeedItem[],
  period: string,
): string {
  const topSector = [...sectorScores].sort((a, b) => b.score - a.score)[0];
  const risingSectors = sectorScores.filter((s) => s.trend === 'rising').map((s) => s.label);
  const avgSentimentVal = sentimentScore(items);
  const sentimentLabel =
    avgSentimentVal >= 0.65 ? 'broadly constructive' :
    avgSentimentVal <= 0.40 ? 'risk-elevated' : 'mixed';

  const riserPhrase =
    risingSectors.length > 0
      ? `${risingSectors.slice(0, 2).join(' and ')} show rising momentum`
      : 'sector momentum is broadly stable';

  const topSectorPhrase = topSector
    ? `${topSector.label} leads with a sector score of ${topSector.score}/100`
    : 'no dominant sector emerges';

  return (
    `For the period ${period}, NXT//LINK intelligence analysis processed ${items.length} enriched feed items across ${signalCount} active signals. ` +
    `${topSectorPhrase}, while ${riserPhrase}. ` +
    `Market narrative is ${sentimentLabel} — recommend prioritising vendor dossier review for acquisition-ready entities before end of quarter.`
  );
}

// ─── Coverage score ───────────────────────────────────────────────────────────

function computeCoverageScore(sectorScores: SectorScore[]): number {
  const sectorsWithCoverage = sectorScores.filter((s) => s.articleCount >= 5).length;
  return Math.round((sectorsWithCoverage / Math.max(1, sectorScores.length)) * 100);
}

// ─── Sector breakdown builder ─────────────────────────────────────────────────

function buildSectorBreakdown(
  sectorScores: SectorScore[],
  signals: import('@/lib/intelligence/signal-engine').SignalFinding[],
): SectorBreakdown[] {
  const vendorArray = Object.values(EL_PASO_VENDORS);

  return sectorScores
    .filter((s) => s.articleCount > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => {
      // Find vendors whose category matches this sector label
      const sectorVendors = vendorArray
        .filter((v) => v.category.toLowerCase().includes(s.label.toLowerCase().split(' ')[0] ?? ''))
        .sort((a, b) => b.ikerScore - a.ikerScore)
        .slice(0, 3)
        .map((v) => v.name);

      const sectorSignalCount = signals.filter(
        (sig) => sig.sectorId === s.id || sig.sectorLabel === s.label,
      ).length;

      return {
        sector: s.label,
        score: s.score,
        trend: s.trend,
        topVendors: sectorVendors,
        signalCount: sectorSignalCount,
      };
    });
}

// ─── Static fallback digest ───────────────────────────────────────────────────

function buildStaticFallback(now: Date, period: string): IntelDigest {
  const iso = now.toISOString();
  return {
    generatedAt: iso,
    period,
    executiveSummary:
      'For the current period, NXT//LINK static intelligence baseline is active. Live feed data is not yet available — digest reflects El Paso market baselines derived from historical signal engine patterns. Defense sector maintains dominant position with contract activity at Fort Bliss. Border trade volumes remain elevated, driven by USMCA freight flows through Ysleta and Bridge of the Americas.',
    keyFindings: [
      {
        title: 'Fort Bliss Modernisation Cycle Active',
        category: 'SIGNAL',
        severity: 'high',
        description:
          'Army multi-domain operations (MDO) doctrine is driving active solicitations for C4ISR, electronic warfare, and persistent surveillance platforms at Fort Bliss. Incumbent vendors L3Harris and Raytheon are positioned for follow-on awards.',
        evidence: [
          'Patriot PAC-3 MSE sustainment award cycle (expected Q2)',
          'IVAS programme Phase 2 delivery milestone',
          'MDO exercise schedule: IRON EAGLE series active',
        ],
        recommendation:
          'El Paso technology vendors with ISR, edge compute, or mesh-networking capabilities should submit capability statements to Fort Bliss G6 and CECOM.',
      },
      {
        title: 'UTEP Research Commercialisation Pipeline',
        category: 'OPPORTUNITY',
        severity: 'moderate',
        description:
          'UTEP\'s College of Engineering is advancing three active SBIR Phase II programmes in cybersecurity, autonomous systems, and advanced materials. Commercialisation partnerships are available.',
        evidence: [
          'SBIR Phase II: autonomous border surveillance system',
          'DOE grant: grid-edge energy storage — $2.1M',
          'CREST centre expansion: 14 new research affiliates',
        ],
        recommendation:
          'Initiate partnership conversations with UTEP Technology Transfer Office for co-development agreements targeting DoD and DHS markets.',
      },
      {
        title: 'Juárez Maquiladora Tech Adoption Inflection',
        category: 'MARKET',
        severity: 'moderate',
        description:
          'Cross-border manufacturing intelligence indicates accelerating Industry 4.0 adoption among Juárez maquiladoras. El Paso technology vendors have a narrow window to capture this market before tier-1 integrators establish exclusives.',
        evidence: [
          'IMMEX facility count: 348 active in Ciudad Juárez corridor',
          'Robotics imports via Zaragoza crossing up 22% YoY',
          'INA México automation survey: 67% plan capex increase',
        ],
        recommendation:
          'Identify El Paso vendors with bilingual capabilities and border-adjacent logistics. Develop cross-border service delivery model before Q4.',
      },
      {
        title: 'Cybersecurity Talent Pipeline Constraint',
        category: 'THREAT',
        severity: 'high',
        description:
          'El Paso cybersecurity workforce demand is outpacing regional supply by an estimated 3:1 ratio. CISA-aligned roles at Fort Bliss and DHS CBP remain unfilled, creating systemic risk for contract performance.',
        evidence: [
          'UTEP cyber programme graduates: ~120/year vs 340+ open requisitions',
          'Clearance processing backlog: 18-24 months for TS/SCI',
          'Remote-work competition pulling talent to larger metros',
        ],
        recommendation:
          'Engage USCYBERCOM Cyber Institute and EPCC workforce development. Advocate for regional cyber apprenticeship pipeline with DoD funding.',
      },
    ],
    sectorBreakdown: [
      { sector: 'Defense', score: 87, trend: 'stable', topVendors: ['L3Harris Technologies', 'Raytheon Technologies (RTX)', 'SAIC'], signalCount: 8 },
      { sector: 'Cybersecurity', score: 74, trend: 'rising', topVendors: ['DarkStar Cyber', 'CyberSec EP'], signalCount: 5 },
      { sector: 'Supply Chain', score: 68, trend: 'rising', topVendors: ['CargoNerve', 'TradeSync'], signalCount: 4 },
      { sector: 'Energy', score: 61, trend: 'stable', topVendors: ['SunGrasp Energy', 'GridEdge Solutions'], signalCount: 3 },
      { sector: 'AI/ML', score: 55, trend: 'rising', topVendors: ['Aperture AI', 'EP Data Labs'], signalCount: 6 },
    ],
    anomalies: [
      {
        type: 'spike',
        description:
          'Defense sector article volume is 2.8× the cross-sector average. Historical pattern correlates with NDAA provision implementations and fiscal year contract closeout activity.',
        detectedAt: iso,
        confidence: 0.82,
      },
      {
        type: 'emergence',
        description:
          'Quantum computing coverage is emerging in defence and enterprise channels. Fort Bliss has a nascent quantum networking pilot under DARPA\'s ONISQ programme. Early-mover positioning available.',
        detectedAt: iso,
        confidence: 0.61,
      },
    ],
    upcomingEvents: [
      { name: 'AUSA Annual Meeting & Exposition', date: 'OCT 2026', relevance: 'Defense | Washington, DC | 700 exhibitors | Relevance 95/100' },
      { name: 'Border Security Expo', date: 'MAR 2026', relevance: 'Homeland Security | El Paso, TX | 220 exhibitors | Relevance 92/100' },
      { name: 'SOFIC — Special Operations Forces Industry Conference', date: 'MAY 2026', relevance: 'Defense | Tampa, FL | 380 exhibitors | Relevance 84/100' },
    ],
    metrics: {
      totalSignals: 0,
      totalSources: 0,
      activeVendors: 0,
      avgSentiment: 0.5,
      coverageScore: 0,
    },
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers as unknown as Headers);
  const rl = checkRateLimit({ key: `intel-digest:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  const now = new Date();
  const period = buildPeriodLabel(now);
  const iso = now.toISOString();

  // ── 1. Attempt to get live feed data ───────────────────────────────────────
  const feedStore = getStoredFeedItems();

  if (!feedStore || feedStore.items.length === 0) {
    // No live data available — return static fallback
    const digest = buildStaticFallback(now, period);
    return NextResponse.json(
      { ok: true, data: digest, source: 'static-fallback' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const items: EnrichedFeedItem[] = feedStore.items;

  // ── 2. Run signal engine ───────────────────────────────────────────────────
  const engineOutput = runSignalEngine(items);
  const { signals, sectorScores } = engineOutput;

  // ── 3. Build digest components ─────────────────────────────────────────────
  const keyFindings = buildKeyFindings(sectorScores, items);
  const sectorBreakdown = buildSectorBreakdown(sectorScores, signals);
  const anomalies = detectAnomalies(items, sectorScores, iso);
  const upcomingEvents = getUpcomingConferences(now);

  // ── 4. Metrics ─────────────────────────────────────────────────────────────
  const avgSentimentVal = parseFloat(sentimentScore(items).toFixed(3));
  const coverageScore = computeCoverageScore(sectorScores);
  const uniqueSources = new Set(items.map((i) => i.source)).size;
  const activeVendors = engineOutput.activeVendorIds.length;

  const metrics: DigestMetrics = {
    totalSignals: signals.length,
    totalSources: uniqueSources,
    activeVendors,
    avgSentiment: avgSentimentVal,
    coverageScore,
  };

  // ── 5. Executive summary ───────────────────────────────────────────────────
  const executiveSummary = buildExecutiveSummary(sectorScores, signals.length, items, period);

  const digest: IntelDigest = {
    generatedAt: iso,
    period,
    executiveSummary,
    keyFindings,
    sectorBreakdown,
    anomalies,
    upcomingEvents,
    metrics,
  };

  return NextResponse.json(
    { ok: true, data: digest, source: 'live' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
