// src/lib/agents/agents/conference-intel-agent.ts
// Conference Intelligence Agent — extracts companies, products, technology clusters,
// and emerging trends from conference news. Persists to Supabase for historical tracking.

import {
  runConferenceAgent,
  type ConferenceIntelStore,
} from '@/lib/agents/conference-agent';
import {
  persistConferenceIntel,
  type ConferenceIntelInsert,
} from '@/db/queries/conference-intel';

// ─── Company Extraction Patterns ────────────────────────────────────────────────

const COMPANY_RE = /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)\s+(?:Inc|LLC|Corp|Ltd|Technologies|Systems|Robotics|AI|Therapeutics|Pharmaceuticals|Biotech|Sciences|Semiconductor|Aerospace|Aviation|Solutions|Labs?|Group)\b/g;

// ─── Signal Type Detection ──────────────────────────────────────────────────────

const SIGNAL_DETECTORS: Array<{ type: string; patterns: RegExp[] }> = [
  {
    type: 'product_demo',
    patterns: [
      /\b(demo|demonstrat|showcase|exhibit|unveil|reveal|prototype)\b/i,
      /\bnew\s+(product|system|platform|robot|device|machine|tool)\b/i,
    ],
  },
  {
    type: 'partnership',
    patterns: [
      /\b(partner|collaborat|alliance|joint\s+venture|team\s+up|sign\s+agreement)\b/i,
      /\bMOU\b/i,
    ],
  },
  {
    type: 'keynote',
    patterns: [
      /\b(keynot|plenary|main\s+stage|opening\s+session)\b/i,
    ],
  },
  {
    type: 'startup_competition',
    patterns: [
      /\b(startup|pitch|competition|finalist|winner|accelerator|incubator)\b/i,
    ],
  },
  {
    type: 'funding_announcement',
    patterns: [
      /\b(funding|raise|series\s+[A-G]|seed|invest|VC)\b/i,
      /\$[\d.,]+\s*(M|B|million|billion)/i,
    ],
  },
  {
    type: 'hiring',
    patterns: [
      /\b(hiring|recruit|talent|job\s+fair|career|workforce)\b/i,
    ],
  },
  {
    type: 'trend_signal',
    patterns: [
      /\b(trend|emerging|future|next\s+gen|revolution|disrupt|transform)\b/i,
    ],
  },
];

// ─── Technology Cluster Detection ───────────────────────────────────────────────

const TECH_CLUSTERS: Array<{ cluster: string; keywords: RegExp }> = [
  { cluster: 'Warehouse Automation', keywords: /\b(warehouse|fulfillment|picking|sorting|conveyor)\b/i },
  { cluster: 'Robotics', keywords: /\b(robot|autonomous|drone|UAV|unmanned|automated)\b/i },
  { cluster: 'AI & Machine Learning', keywords: /\b(AI|artificial\s+intelligence|machine\s+learning|deep\s+learning|GPT|LLM|neural)\b/i },
  { cluster: 'Cybersecurity', keywords: /\b(cyber|security|zero\s+trust|threat|ransomware|encryption)\b/i },
  { cluster: 'Clean Energy', keywords: /\b(solar|wind|battery|hydrogen|renewable|grid|EV|electric\s+vehicle)\b/i },
  { cluster: 'Biotech & Health', keywords: /\b(biotech|pharma|medical|health|clinical|genomic|CRISPR|therapy)\b/i },
  { cluster: 'Manufacturing Tech', keywords: /\b(3D\s+print|additive|CNC|industrial|manufacturing|factory)\b/i },
  { cluster: 'Supply Chain', keywords: /\b(supply\s+chain|logistics|freight|shipping|last\s+mile|tracking)\b/i },
  { cluster: 'AgTech', keywords: /\b(agriculture|farming|crop|precision\s+ag|irrigation|livestock)\b/i },
  { cluster: 'Construction Tech', keywords: /\b(construction|BIM|modular|prefab|infrastructure|smart\s+building)\b/i },
  { cluster: 'Fintech', keywords: /\b(fintech|blockchain|payment|banking|DeFi|cryptocurrency)\b/i },
  { cluster: 'Space & Aerospace', keywords: /\b(space|satellite|rocket|launch|orbit|aerospace|aviation)\b/i },
];

// ─── Importance Scoring ─────────────────────────────────────────────────────────

const SIGNAL_WEIGHT: Record<string, number> = {
  keynote: 0.95,
  funding_announcement: 0.90,
  partnership: 0.85,
  product_demo: 0.80,
  startup_competition: 0.75,
  hiring: 0.60,
  trend_signal: 0.55,
};

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export type ConferenceIntelResult = {
  total_items_analyzed: number;
  companies_extracted: number;
  signals_detected: number;
  persisted: number;
  technology_clusters: Record<string, number>;
  top_companies: Array<{ name: string; mentions: number }>;
  duration_ms: number;
};

export async function runConferenceIntelAgent(): Promise<ConferenceIntelResult> {
  const startMs = Date.now();

  // 1. Run conference agent to get latest news
  const store: ConferenceIntelStore = await runConferenceAgent();

  // 2. Analyze each news item
  const records: ConferenceIntelInsert[] = [];
  const companyCounts: Record<string, number> = {};
  const clusterCounts: Record<string, number> = {};

  for (const item of store.news) {
    const text = `${item.title} ${item.source}`;

    // Extract companies
    const companies = extractCompanies(text);
    for (const company of companies) {
      companyCounts[company] = (companyCounts[company] ?? 0) + 1;
    }

    // Detect signal type
    const signalType = detectSignalType(text);

    // Detect technology cluster
    const cluster = detectTechCluster(text);
    if (cluster) {
      clusterCounts[cluster] = (clusterCounts[cluster] ?? 0) + 1;
    }

    // Compute importance
    const importance = SIGNAL_WEIGHT[signalType ?? ''] ?? 0.5;

    // Create record for each extracted company (or one generic if none found)
    if (companies.length > 0) {
      for (const company of companies) {
        const id = `conf-${hashCode(item.conferenceId + company + item.title)}`;
        records.push({
          id,
          conference_id: item.conferenceId,
          conference_name: item.conferenceName,
          company_name: company,
          role: signalType === 'keynote' ? 'keynote_speaker' : signalType === 'startup_competition' ? 'startup_finalist' : 'exhibitor',
          signal_type: signalType,
          title: item.title,
          description: null,
          industry: item.industry || null,
          technology_cluster: cluster,
          importance_score: importance,
          source_url: item.link,
          event_date: item.pubDate ? item.pubDate.slice(0, 10) : null,
        });
      }
    } else {
      const id = `conf-${hashCode(item.conferenceId + item.title)}`;
      records.push({
        id,
        conference_id: item.conferenceId,
        conference_name: item.conferenceName,
        company_name: null,
        role: null,
        signal_type: signalType,
        title: item.title,
        description: null,
        industry: item.industry || null,
        technology_cluster: cluster,
        importance_score: importance * 0.8,
        source_url: item.link,
        event_date: item.pubDate ? item.pubDate.slice(0, 10) : null,
      });
    }
  }

  // 3. Persist to Supabase
  const persisted = await persistConferenceIntel(records);

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, mentions]) => ({ name, mentions }));

  return {
    total_items_analyzed: store.news.length,
    companies_extracted: Object.keys(companyCounts).length,
    signals_detected: records.filter(r => r.signal_type).length,
    persisted,
    technology_clusters: clusterCounts,
    top_companies: topCompanies,
    duration_ms: Date.now() - startMs,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function extractCompanies(text: string): string[] {
  COMPANY_RE.lastIndex = 0;
  const companies: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = COMPANY_RE.exec(text)) !== null) {
    const name = match[0].trim();
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      companies.push(name);
    }
  }

  return companies;
}

function detectSignalType(text: string): string | null {
  for (const { type, patterns } of SIGNAL_DETECTORS) {
    if (patterns.some(re => re.test(text))) return type;
  }
  return null;
}

function detectTechCluster(text: string): string | null {
  for (const { cluster, keywords } of TECH_CLUSTERS) {
    if (keywords.test(text)) return cluster;
  }
  return null;
}

function hashCode(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
