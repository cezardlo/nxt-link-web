// src/lib/intelligence/signal-engine.ts
// World Monitor-style signal intelligence engine, tailored for NXT LINK's
// El Paso defense / border-trade / supply-chain ecosystem.
//
// Detects:
//  • vendor_mention   — known NXT vendor in 2+ sources
//  • contract_alert   — $ amounts, IDIQ, SBIR, task-order language
//  • velocity_spike   — story publishing rate 2× above average
//  • convergence      — 3+ different source tiers cover the same cluster
//  • sector_spike     — sector keyword density doubles baseline
//  • security_impact  — crime/incident → economic disruption signal

import type { EnrichedFeedItem } from '@/lib/agents/feed-agent';
import {
  findEntityByText,
  findSectorsByText,
  isContractSignal,
  isSecuritySignal,
  extractContractAmount,
  NXT_ENTITIES,
  SECTOR_KEYWORDS,
  type NxtEntity,
} from './nxt-entities';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalType =
  | 'vendor_mention'
  | 'contract_alert'
  | 'velocity_spike'
  | 'convergence'
  | 'sector_spike'
  | 'security_impact';

export type SignalPriority = 'critical' | 'high' | 'elevated' | 'normal';

export type SignalFinding = {
  id: string;
  type: SignalType;
  priority: SignalPriority;
  title: string;
  description: string;
  whyItMatters: string;
  actionableInsight: string;
  entityId?: string;
  entityName?: string;
  sectorId?: string;
  sectorLabel?: string;
  contractAmountM?: number;        // $ millions if detected
  articleCount: number;
  sources: string[];               // source names
  confidence: number;              // 0–1
  detectedAt: string;              // ISO timestamp
  articles: Array<{ title: string; source: string; link: string; pubDate: string }>;
};

export type ArticleCluster = {
  id: string;
  headline: string;               // Most authoritative headline (lowest tier source)
  articles: EnrichedFeedItem[];
  sourceTiers: number[];
  topTier: number;
  velocity: number;               // articles per hour
  velocityLevel: 'normal' | 'elevated' | 'spike';
  entities: NxtEntity[];
  sectors: string[];
  hasContractSignal: boolean;
  hasSecuritySignal: boolean;
  similarity: number;             // Max Jaccard similarity within cluster
};

export type SectorScore = {
  id: string;
  label: string;
  color: string;
  score: number;                  // 0–100
  trend: 'rising' | 'stable' | 'falling';
  articleCount: number;
  contractCount: number;
  topVendor?: string;
  topHeadline?: string;
};

// ─── Source tier mapping ──────────────────────────────────────────────────────
// Tier 1 = wire / official (most authoritative)
// Tier 2 = major domain outlets
// Tier 3 = specialist / trade press
// Tier 4 = aggregators / community

const SOURCE_TIERS: Record<string, number> = {
  // Tier 1 — Wire / Official
  'AP Tech':        1,
  'BBC Tech':       1,
  'Defense One':    1,
  'FedScoop':       1,
  'SEC 8-K':        1,
  'DOE':            1,
  'DOT':            1,
  'NASA':           1,
  'CBP Newsroom':   1,
  'DoD News':       1,
  'SBA News':       1,
  'GSA News':       1,
  // Tier 2 — Major outlets
  'MIT AI':         2,
  'Ars Technica':   2,
  'IEEE Spectrum':  2,
  'Dark Reading':   2,
  'BleepingComp':   2,
  'Supply Chain Dive': 2,
  'IndustryWeek':   2,
  'FreightWaves':   2,
  'THN Sec':        2,
  'TechCrunch':     2,
  'The Verge':      2,
  'Defense News':   2,
  'Army Times':     2,
  'Military Times': 2,
  'Military.com':   2,
  'Breaking Defense': 2,
  'TX Tribune':     2,
  'Fed News Network': 2,
  'Utility Dive':   2,
  'EP Times':       2,
  'Nextgov':        2,
  'GovExec':        2,
  // Tier 3 — Specialist / Trade
  'VentureBeat':    3,
  'ZDNet':          3,
  'Robot Report':   3,
  'Automation World': 3,
  'DC Velocity':    3,
  'WaterWorld':     3,
  'Water Digest':   3,
  'Water Online':   3,
  'arXiv AI':       3,
  'Wired':          3,
  'GovCon Wire':    3,
  'FCW':            3,
  'MeriTalk':       3,
  'GovWin':         3,
  'C4ISRNET':       3,
  'DefenseScoop':   3,
  'Task & Purpose': 3,
  'Logistics Mgmt': 3,
  'Energy Dive':    3,
  'Solar Power World': 3,
  'Renewables Now': 3,
  'Power Mag':      3,
  'SC Brain':       3,
  'Transport Topics': 3,
  'UTEP News':      3,
  'EP Herald-Post': 3,
  'TX Monthly':     3,
  // Tier 4 — Aggregators / Community / Local
  'Hacker News':    4,
  'TechRadar':      4,
  'EP Matters':     4,
  'EP Inc':         4,
  'KTSM NBC':       4,
  'KFOX14':         4,
  'KVIA EP':        4,
  'AI Business':    4,
  'GN: Robotics':   4,
  'GN: Logistics':  4,
  'GN: Water Tech': 4,
  'GN: Enterprise AI': 4,
  'GN: Defense Tech': 4,
  'GN: Semicon':    4,
  'GN: Energy Tech': 4,
  'GN: SAM.gov':    4,
  'GN: SBIR':       4,
  'GN: USASpending': 4,
  'GN: GovCon':     4,
  'GN: DHS Contract': 4,
  'GN: EP Chamber': 4,
  'GN: EP Real Estate': 4,
  'GN: Bliss Ops':  4,
  'GN: Bliss Hiring': 4,
  'GN: TX Tech':    4,
  'GN: TX Energy':  4,
  'GN: TX Border Trade': 4,
  'GN: UTEP Research': 4,
  'GN: UTEP Cyber': 4,
};

export function getSourceTier(sourceName: string): number {
  return SOURCE_TIERS[sourceName] ?? 3;
}

// ─── Jaccard clustering ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'is', 'are', 'was', 'were', 'it', 'its', 'as', 'be',
  'has', 'had', 'will', 'from', 'new', 'says', 'said', 'that', 'this',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const CLUSTER_THRESHOLD = 0.22; // Lower than World Monitor's 0.5 — short headlines diverge fast

export function clusterArticles(items: EnrichedFeedItem[]): ArticleCluster[] {
  const tokens = items.map((item) => tokenize(item.title + ' ' + item.description.slice(0, 80)));
  const assigned = new Array<number>(items.length).fill(-1);
  const clusterMembers: number[][] = [];

  // Inverted index for candidate pre-filtering
  const invertedIndex = new Map<string, Set<number>>();
  tokens.forEach((tokenSet, i) => {
    for (const t of tokenSet) {
      if (!invertedIndex.has(t)) invertedIndex.set(t, new Set());
      invertedIndex.get(t)!.add(i);
    }
  });

  for (let i = 0; i < items.length; i++) {
    if (assigned[i] !== -1) continue;

    // Find candidates via inverted index
    const candidates = new Set<number>();
    for (const t of tokens[i]!) {
      for (const j of (invertedIndex.get(t) ?? [])) {
        if (j > i) candidates.add(j);
      }
    }

    const members = [i];
    for (const j of candidates) {
      if (assigned[j] !== -1) continue;
      if (jaccard(tokens[i]!, tokens[j]!) >= CLUSTER_THRESHOLD) {
        members.push(j);
      }
    }

    const clusterId = clusterMembers.length;
    for (const idx of members) assigned[idx] = clusterId;
    clusterMembers.push(members);
  }

  // Build cluster objects
  return clusterMembers.map((memberIdxs, ci) => {
    const clusterItems = memberIdxs.map((i) => items[i]!);
    const tiers = clusterItems.map((it) => getSourceTier(it.source));
    const topTier = Math.min(...tiers);

    // Sort by tier (ascending = most authoritative first)
    clusterItems.sort((a, b) => getSourceTier(a.source) - getSourceTier(b.source));

    // Velocity: articles per hour over the cluster's time span
    const dates = clusterItems.map((it) => new Date(it.pubDate).getTime()).filter(Boolean);
    const spanMs = dates.length > 1 ? Math.max(...dates) - Math.min(...dates) : 3600_000;
    const velocity = clusterItems.length / Math.max(spanMs / 3600_000, 0.5);

    const allText = clusterItems.map((it) => it.title + ' ' + it.description).join(' ');
    const entities = findEntityByText(allText);
    const sectors = findSectorsByText(allText).map((s) => s.id);
    const hasContractSignal = isContractSignal(allText);
    const hasSecuritySignal = isSecuritySignal(allText);

    // Max pairwise Jaccard within cluster
    let maxSim = 0;
    if (memberIdxs.length > 1) {
      const t0 = tokens[memberIdxs[0]!]!;
      for (let k = 1; k < memberIdxs.length; k++) {
        maxSim = Math.max(maxSim, jaccard(t0, tokens[memberIdxs[k]!]!));
      }
    }

    return {
      id: `cluster-${ci}`,
      headline: clusterItems[0]!.title,
      articles: clusterItems,
      sourceTiers: tiers,
      topTier,
      velocity,
      velocityLevel: velocity > 6 ? 'spike' : velocity > 3 ? 'elevated' : 'normal',
      entities,
      sectors,
      hasContractSignal,
      hasSecuritySignal,
      similarity: maxSim,
    };
  });
}

// ─── Signal detectors ─────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function priorityFromConfidence(c: number): SignalPriority {
  if (c >= 0.85) return 'critical';
  if (c >= 0.70) return 'high';
  if (c >= 0.50) return 'elevated';
  return 'normal';
}

function detectVendorMentions(
  clusters: ArticleCluster[],
  now: string,
): SignalFinding[] {
  const signals: SignalFinding[] = [];
  const entityClusters = new Map<string, ArticleCluster[]>();

  for (const cluster of clusters) {
    for (const entity of cluster.entities) {
      if (!entityClusters.has(entity.id)) entityClusters.set(entity.id, []);
      entityClusters.get(entity.id)!.push(cluster);
    }
  }

  for (const [entityId, entityClusterList] of entityClusters) {
    const totalArticles = entityClusterList.reduce((s, c) => s + c.articles.length, 0);
    if (totalArticles < 2) continue;

    const entity = NXT_ENTITIES.find((e) => e.id === entityId)!;
    const sources = [...new Set(entityClusterList.flatMap((c) => c.articles.map((a) => a.source)))];
    const confidence = Math.min(0.95, 0.4 + totalArticles * 0.12 + sources.length * 0.08);
    const allArticles = entityClusterList.flatMap((c) => c.articles).slice(0, 6);
    const topCluster = entityClusterList[0]!;

    signals.push({
      id: `vendor-${entityId}-${uid()}`,
      type: 'vendor_mention',
      priority: priorityFromConfidence(confidence),
      title: `${entity.name} — ${totalArticles} source${totalArticles > 1 ? 's' : ''}`,
      description: topCluster.headline,
      whyItMatters: `${entity.name} is an active NXT LINK vendor. Multiple news sources covering this entity typically precede procurement activity, contract announcements, or market positioning changes.`,
      actionableInsight: `Review ${entity.name}'s DOSSR tab for current IKER score and recent evidence. Cross-reference with SAM.gov for active solicitations.`,
      entityId,
      entityName: entity.name,
      sectorId: entity.category.toLowerCase().replace(/ /g, '-'),
      sectorLabel: entity.category,
      articleCount: totalArticles,
      sources,
      confidence,
      detectedAt: now,
      articles: allArticles.map((a) => ({ title: a.title, source: a.source, link: a.link, pubDate: a.pubDate })),
    });
  }

  return signals;
}

function detectContractAlerts(
  clusters: ArticleCluster[],
  now: string,
): SignalFinding[] {
  const signals: SignalFinding[] = [];

  for (const cluster of clusters) {
    if (!cluster.hasContractSignal) continue;

    const allText = cluster.articles.map((a) => a.title + ' ' + a.description).join(' ');
    const amountM = extractContractAmount(allText);
    const entities = cluster.entities;
    const sectors = cluster.sectors;

    const confidence = Math.min(0.95,
      0.5 +
      (amountM ? 0.2 : 0) +
      (entities.length > 0 ? 0.15 : 0) +
      (cluster.topTier === 1 ? 0.1 : 0),
    );

    const vendorName = entities[0]?.name ?? 'El Paso vendor';
    const sectorLabel = SECTOR_KEYWORDS.find((s) => sectors.includes(s.id))?.label ?? 'Defense Tech';
    const amountStr = amountM
      ? amountM >= 1000
        ? `$${(amountM / 1000).toFixed(1)}B`
        : `$${Math.round(amountM)}M`
      : 'undisclosed amount';

    signals.push({
      id: `contract-${cluster.id}-${uid()}`,
      type: 'contract_alert',
      priority: amountM && amountM >= 100 ? 'critical' : priorityFromConfidence(confidence),
      title: `Contract Signal — ${vendorName} (${amountStr})`,
      description: cluster.headline,
      whyItMatters: `Contract awards and IDIQ vehicles create procurement windows. ${vendorName} winning or competing for a ${amountStr} contract signals downstream subcontracting and services opportunities in the El Paso corridor.`,
      actionableInsight: `Monitor SAM.gov for related solicitations. Check ${vendorName}'s hiring signals — surge hiring within 60 days typically confirms award.`,
      entityId: entities[0]?.id,
      entityName: entities[0]?.name,
      sectorId: sectors[0],
      sectorLabel,
      contractAmountM: amountM ?? undefined,
      articleCount: cluster.articles.length,
      sources: [...new Set(cluster.articles.map((a) => a.source))],
      confidence,
      detectedAt: now,
      articles: cluster.articles.slice(0, 5).map((a) => ({ title: a.title, source: a.source, link: a.link, pubDate: a.pubDate })),
    });
  }

  return signals;
}

function detectVelocitySpikes(
  clusters: ArticleCluster[],
  now: string,
): SignalFinding[] {
  return clusters
    .filter((c) => c.velocityLevel === 'spike' && c.articles.length >= 3)
    .map((cluster) => {
      const sectorLabel = SECTOR_KEYWORDS.find((s) => cluster.sectors.includes(s.id))?.label ?? 'Tech';
      const confidence = Math.min(0.90, 0.5 + cluster.articles.length * 0.08);
      return {
        id: `velocity-${cluster.id}-${uid()}`,
        type: 'velocity_spike' as SignalType,
        priority: priorityFromConfidence(confidence),
        title: `Velocity Spike — ${sectorLabel} (${cluster.articles.length} articles/hr)`,
        description: cluster.headline,
        whyItMatters: 'A story publishing at spike velocity across multiple sources indicates rapid market response, breaking procurement news, or a significant policy/regulatory development affecting the El Paso tech corridor.',
        actionableInsight: 'Monitor for follow-on contract announcements, regulatory filings, or SAM.gov postings within 24–48 hours. Velocity spikes often precede formal procurement announcements.',
        sectorId: cluster.sectors[0],
        sectorLabel,
        articleCount: cluster.articles.length,
        sources: [...new Set(cluster.articles.map((a) => a.source))],
        confidence,
        detectedAt: now,
        articles: cluster.articles.slice(0, 5).map((a) => ({ title: a.title, source: a.source, link: a.link, pubDate: a.pubDate })),
      };
    });
}

function detectConvergence(
  clusters: ArticleCluster[],
  now: string,
): SignalFinding[] {
  // Convergence = cluster covered by 3+ different source tiers
  return clusters
    .filter((c) => {
      const uniqueTiers = new Set(c.sourceTiers);
      return uniqueTiers.size >= 3 && c.articles.length >= 4;
    })
    .map((cluster) => {
      const uniqueTiers = new Set(cluster.sourceTiers);
      const hasAuthority = cluster.topTier === 1;
      const confidence = Math.min(0.92, 0.55 + uniqueTiers.size * 0.12 + (hasAuthority ? 0.1 : 0));
      const sectorLabel = SECTOR_KEYWORDS.find((s) => cluster.sectors.includes(s.id))?.label ?? 'Tech';

      return {
        id: `convergence-${cluster.id}-${uid()}`,
        type: 'convergence' as SignalType,
        priority: hasAuthority ? 'high' : 'elevated',
        title: `Convergence — ${uniqueTiers.size} source tiers, ${cluster.articles.length} articles`,
        description: cluster.headline,
        whyItMatters: `The "authority triangle" — wire services, domain specialists, and trade press all covering the same story — is the gold standard for signal confirmation. This story has crossed ${uniqueTiers.size} independent source tiers.`,
        actionableInsight: 'Cross-reference with SAM.gov and USASpending.gov. Multi-tier convergence on an El Paso story is rare — treat as high-priority procurement intelligence.',
        sectorId: cluster.sectors[0],
        sectorLabel,
        articleCount: cluster.articles.length,
        sources: [...new Set(cluster.articles.map((a) => a.source))],
        confidence,
        detectedAt: now,
        articles: cluster.articles.slice(0, 6).map((a) => ({ title: a.title, source: a.source, link: a.link, pubDate: a.pubDate })),
      };
    });
}

function detectSectorSpikes(
  items: EnrichedFeedItem[],
  now: string,
): SignalFinding[] {
  const signals: SignalFinding[] = [];

  for (const sector of SECTOR_KEYWORDS) {
    const matching = items.filter((item) => {
      const text = (item.title + ' ' + item.description).toLowerCase();
      return sector.keywords.some((kw) => text.includes(kw));
    });

    if (matching.length < 4) continue;

    // Simple baseline: if >6 articles hit a single sector, flag it
    const confidence = Math.min(0.88, 0.45 + matching.length * 0.06);
    const contractArticles = matching.filter((it) =>
      isContractSignal(it.title + ' ' + it.description),
    );

    signals.push({
      id: `sector-${sector.id}-${uid()}`,
      type: 'sector_spike',
      priority: contractArticles.length > 0 ? 'high' : 'elevated',
      title: `${sector.label} Sector Surge — ${matching.length} signals`,
      description: matching[0]!.title,
      whyItMatters: `${sector.label} news volume is elevated in the current feed cycle. Sustained sector-level velocity often precedes RFI/RFP postings, funding announcements, or regulatory changes that affect the El Paso vendor ecosystem.`,
      actionableInsight: contractArticles.length > 0
        ? `${contractArticles.length} contract signal(s) detected within this sector. Review active SAM.gov solicitations under relevant NAICS codes.`
        : `Monitor for contract announcements over the next 30–60 days. Sector spikes align with DoD fiscal year procurement cycles.`,
      sectorId: sector.id,
      sectorLabel: sector.label,
      articleCount: matching.length,
      sources: [...new Set(matching.map((it) => it.source))],
      confidence,
      detectedAt: now,
      articles: matching.slice(0, 5).map((a) => ({ title: a.title, source: a.source, link: a.link, pubDate: a.pubDate })),
    });
  }

  return signals;
}

function detectSecurityImpact(
  clusters: ArticleCluster[],
  now: string,
): SignalFinding[] {
  return clusters
    .filter((c) => c.hasSecuritySignal && c.articles.length >= 2)
    .map((cluster) => {
      const allText = cluster.articles.map((a) => a.title + ' ' + a.description).join(' ');
      const affectedSectors = findSectorsByText(allText);
      const sectorLabel = affectedSectors[0]?.label ?? 'Supply Chain';
      const confidence = Math.min(0.80, 0.45 + cluster.articles.length * 0.1);

      return {
        id: `security-${cluster.id}-${uid()}`,
        type: 'security_impact' as SignalType,
        priority: 'elevated' as SignalPriority,
        title: `Security → Economic Impact — ${sectorLabel}`,
        description: cluster.headline,
        whyItMatters: 'Security incidents near El Paso border crossings or industrial corridors directly affect commercial crossing volumes, maquiladora operations, and freight lane economics. This is a supply chain risk signal, not just a public safety event.',
        actionableInsight: `Check BTS crossing volume data for Paso del Norte and Bridge of Americas. Logistics vendors (FedEx, CargoNerve) and border tech vendors (CrossingIQ, TradeSync) may see short-term volume disruption.`,
        sectorId: affectedSectors[0]?.id,
        sectorLabel,
        articleCount: cluster.articles.length,
        sources: [...new Set(cluster.articles.map((a) => a.source))],
        confidence,
        detectedAt: now,
        articles: cluster.articles.slice(0, 4).map((a) => ({ title: a.title, source: a.source, link: a.link, pubDate: a.pubDate })),
      };
    });
}

// ─── Sector momentum scoring ──────────────────────────────────────────────────

export function computeSectorScores(
  items: EnrichedFeedItem[],
  clusters: ArticleCluster[],
): SectorScore[] {
  return SECTOR_KEYWORDS.map((sector) => {
    const matchingItems = items.filter((item) => {
      const text = (item.title + ' ' + item.description).toLowerCase();
      return (
        sector.keywords.some((kw) => text.includes(kw)) ||
        sector.contractKeywords.some((kw) => text.includes(kw))
      );
    });

    const contractItems = matchingItems.filter((it) =>
      isContractSignal(it.title + ' ' + it.description),
    );

    // Score 0–100: news density (40%), AI score avg (40%), contract signals (20%)
    const densityScore = Math.min(40, matchingItems.length * 4);
    const avgIker = matchingItems.length > 0
      ? matchingItems.reduce((s, it) => s + it.score, 0) / matchingItems.length
      : 5;
    const ikerScore = (avgIker / 10) * 40;
    const contractScore = Math.min(20, contractItems.length * 7);
    const rawScore = Math.round(densityScore + ikerScore + contractScore);

    // Trend: compare first half vs second half of matching items by date
    const sorted = [...matchingItems].sort(
      (a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime(),
    );
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half).length;
    const secondHalf = sorted.slice(half).length;
    const trend: 'rising' | 'stable' | 'falling' =
      secondHalf > firstHalf * 1.3 ? 'rising' :
      secondHalf < firstHalf * 0.7 ? 'falling' : 'stable';

    const topVendorCluster = clusters.find((c) =>
      c.sectors.includes(sector.id) && c.entities.length > 0,
    );

    return {
      id: sector.id,
      label: sector.label,
      color: sector.color,
      score: rawScore,
      trend,
      articleCount: matchingItems.length,
      contractCount: contractItems.length,
      topVendor: topVendorCluster?.entities[0]?.name,
      topHeadline: matchingItems[0]?.title,
    };
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export type SignalEngineOutput = {
  signals: SignalFinding[];
  clusters: ArticleCluster[];
  sectorScores: SectorScore[];
  activeVendorIds: string[];   // vendor IDs with 2+ mentions → pulse on map
  detectedAt: string;
};

export function runSignalEngine(items: EnrichedFeedItem[]): SignalEngineOutput {
  const now = new Date().toISOString();
  const clusters = clusterArticles(items);

  const vendorSignals  = detectVendorMentions(clusters, now);
  const contractAlerts = detectContractAlerts(clusters, now);
  const velocitySpikes = detectVelocitySpikes(clusters, now);
  const convergences   = detectConvergence(clusters, now);
  const sectorSpikes   = detectSectorSpikes(items, now);
  const securityAlerts = detectSecurityImpact(clusters, now);

  // Merge + deduplicate: prefer contract alerts over plain vendor mentions for same entity
  const contractEntityIds = new Set(contractAlerts.map((s) => s.entityId).filter(Boolean));
  const filteredVendor = vendorSignals.filter((s) => !contractEntityIds.has(s.entityId));

  const allSignals: SignalFinding[] = [
    ...contractAlerts,
    ...filteredVendor,
    ...convergences,
    ...velocitySpikes,
    ...sectorSpikes,
    ...securityAlerts,
  ].sort((a, b) => {
    // Priority order: critical > high > elevated > normal
    const order = { critical: 0, high: 1, elevated: 2, normal: 3 };
    return order[a.priority] - order[b.priority];
  });

  const sectorScores = computeSectorScores(items, clusters);

  // Vendors with 2+ article mentions get map pulse
  const activeVendorIds = vendorSignals
    .filter((s) => s.articleCount >= 2 && s.entityId)
    .map((s) => s.entityId!);

  return {
    signals: allSignals,
    clusters,
    sectorScores,
    activeVendorIds,
    detectedAt: now,
  };
}
