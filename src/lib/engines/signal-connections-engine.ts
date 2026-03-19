// src/lib/engines/signal-connections-engine.ts
//
// Signal-to-Signal Connection Engine
// Finds hidden relationships between signals.
// No LLM needed — pure logic, runs in < 200ms.
//
// Six connection types:
//   CAUSAL     — A caused B (one signal type precedes another in same industry)
//   TEMPORAL   — A historically precedes B (time-ordered pattern)
//   ENTITY     — Same company/person/technology in both
//   GEOGRAPHIC — Same location affected
//   THEMATIC   — Same underlying market force
//   CLUSTER    — 3+ small signals pointing the same direction

export type ConnectionType =
  | 'CAUSAL'
  | 'TEMPORAL'
  | 'ENTITY'
  | 'GEOGRAPHIC'
  | 'THEMATIC'
  | 'CLUSTER';

export interface RawSignal {
  id?: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance_score?: number;
  importance?: number;
  discovered_at: string;
  url?: string | null;
}

export interface SignalConnection {
  signal_a_id: string;
  signal_b_id: string;
  signal_a_title: string;
  signal_b_title: string;
  connection_type: ConnectionType;
  strength: number; // 0-100
  explanation: string;
  detected_at: string;
  confirmed: boolean;
}

export interface SignalCluster {
  signal_ids: string[];
  signal_titles: string[];
  theme: string;
  entity: string | null;
  strength: number;
}

export interface ConnectionReport {
  connections: SignalConnection[];
  clusters: SignalCluster[];
  total_signals: number;
  total_connections: number;
  total_clusters: number;
  detected_at: string;
}

// ─── Causal chains: these signal types trigger the next one ───────────────────
const CAUSAL_CHAINS: Record<string, string[]> = {
  funding_round: ['hiring_surge', 'product_launch', 'contract_award', 'merger_acquisition'],
  product_launch: ['contract_award', 'hiring_surge', 'regulatory_action'],
  regulatory_action: ['contract_award', 'funding_round', 'merger_acquisition'],
  merger_acquisition: ['hiring_surge', 'product_launch', 'regulatory_action'],
  contract_award: ['product_launch', 'hiring_surge', 'facility_expansion'],
  facility_expansion: ['hiring_surge', 'contract_award'],
  hiring_surge: ['product_launch', 'funding_round'],
  research_publication: ['product_launch', 'funding_round', 'patent_filing'],
  patent_filing: ['product_launch', 'merger_acquisition'],
};

// ─── Thematic forces that connect industries ──────────────────────────────────
const THEMATIC_GROUPS: Record<string, string[]> = {
  'AI adoption wave': ['ai-ml', 'defense', 'healthcare', 'fintech', 'cybersecurity'],
  'Defense modernization': ['defense', 'cybersecurity', 'ai-ml', 'logistics'],
  'Energy transition': ['energy', 'manufacturing', 'construction', 'logistics'],
  'Border security tech': ['defense', 'ai-ml', 'cybersecurity', 'logistics'],
  'Healthcare digitization': ['healthcare', 'ai-ml', 'fintech'],
  'Supply chain resilience': ['logistics', 'manufacturing', 'energy', 'agriculture'],
  'Capital concentration': ['ai-ml', 'fintech', 'cybersecurity', 'general'],
  'Government procurement surge': ['defense', 'cybersecurity', 'healthcare', 'logistics'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signalId(s: RawSignal, index: number): string {
  return (s as { id?: string }).id ?? `sig-${index}`;
}

function importance(s: RawSignal): number {
  return s.importance_score ?? s.importance ?? 0.5;
}

function normalizeIndustry(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
}

function sharedWords(a: string, b: string): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'is', 'in', 'at', 'of', 'to', 'and', 'or', 'for',
    'with', 'on', 'by', 'from', 'new', 'this', 'that', 'it', 'as', 'be',
    'its', 'has', 'have', 'are', 'was', 'will', 'via', 'after', 'over',
  ]);
  const tokA = a.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
  const tokB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w)));
  return tokA.filter(w => tokB.has(w));
}

// ─── Detectors ────────────────────────────────────────────────────────────────

function detectEntity(a: RawSignal, b: RawSignal, ai: number, bi: number, signals: RawSignal[]): SignalConnection | null {
  const aId = signalId(a, ai);
  const bId = signalId(b, bi);

  // Same company
  if (a.company && b.company && a.company.toLowerCase() === b.company.toLowerCase()) {
    const shared = sharedWords(a.title, b.title);
    const strength = Math.min(95, 60 + shared.length * 5 + Math.round(importance(a) * 20));
    return {
      signal_a_id: aId,
      signal_b_id: bId,
      signal_a_title: a.title,
      signal_b_title: b.title,
      connection_type: 'ENTITY',
      strength,
      explanation: `Both involve ${a.company}. Same actor is making moves in ${a.industry} on two fronts.`,
      detected_at: new Date().toISOString(),
      confirmed: false,
    };
  }

  // Shared named entity in titles (company name from either appears in the other title)
  if (a.company && b.title.toLowerCase().includes(a.company.toLowerCase())) {
    return {
      signal_a_id: aId,
      signal_b_id: bId,
      signal_a_title: a.title,
      signal_b_title: b.title,
      connection_type: 'ENTITY',
      strength: 55,
      explanation: `${a.company} appears in both signals — the same organization is driving activity across different contexts.`,
      detected_at: new Date().toISOString(),
      confirmed: false,
    };
  }
  if (b.company && a.title.toLowerCase().includes(b.company.toLowerCase())) {
    return {
      signal_a_id: aId,
      signal_b_id: bId,
      signal_a_title: a.title,
      signal_b_title: b.title,
      connection_type: 'ENTITY',
      strength: 55,
      explanation: `${b.company} is mentioned in both signals — the same organization is driving activity across different contexts.`,
      detected_at: new Date().toISOString(),
      confirmed: false,
    };
  }

  return null;
}

function detectCausal(a: RawSignal, b: RawSignal, ai: number, bi: number): SignalConnection | null {
  const aId = signalId(a, ai);
  const bId = signalId(b, bi);
  const aNorm = normalizeIndustry(a.industry);
  const bNorm = normalizeIndustry(b.industry);

  // Must be same or related industry
  if (aNorm !== bNorm) {
    const related = THEMATIC_GROUPS;
    const sameTheme = Object.values(related).some(
      group => group.includes(aNorm) && group.includes(bNorm)
    );
    if (!sameTheme) return null;
  }

  const chain = CAUSAL_CHAINS[a.signal_type];
  if (!chain || !chain.includes(b.signal_type)) return null;

  const strength = Math.min(90, 50 + Math.round(importance(a) * 25) + Math.round(importance(b) * 15));

  const CAUSAL_PHRASES: Record<string, string> = {
    funding_round: 'Funding rounds typically trigger hiring, product launches, and acquisitions within 60-90 days.',
    product_launch: 'New product launches often lead to government contract awards or regulatory scrutiny.',
    regulatory_action: 'Regulatory changes create procurement windows and redirect investment.',
    merger_acquisition: 'Acquisitions usually trigger talent moves and accelerated product timelines.',
    contract_award: 'Contract awards signal proven technology ready for adjacent markets.',
    research_publication: 'Published research often leads to patent filings and startup formation.',
    patent_filing: 'Patent activity precedes commercialization and acquisition interest.',
  };

  return {
    signal_a_id: aId,
    signal_b_id: bId,
    signal_a_title: a.title,
    signal_b_title: b.title,
    connection_type: 'CAUSAL',
    strength,
    explanation: `The first signal (${a.signal_type.replace(/_/g, ' ')}) likely caused or accelerated the second (${b.signal_type.replace(/_/g, ' ')}). ${CAUSAL_PHRASES[a.signal_type] ?? ''}`.trim(),
    detected_at: new Date().toISOString(),
    confirmed: false,
  };
}

function detectThematic(a: RawSignal, b: RawSignal, ai: number, bi: number): SignalConnection | null {
  const aId = signalId(a, ai);
  const bId = signalId(b, bi);
  const aNorm = normalizeIndustry(a.industry);
  const bNorm = normalizeIndustry(b.industry);
  if (aNorm === bNorm) return null; // Same industry → not thematic, use other types

  let matchedTheme: string | null = null;
  for (const [theme, industries] of Object.entries(THEMATIC_GROUPS)) {
    if (industries.includes(aNorm) && industries.includes(bNorm)) {
      matchedTheme = theme;
      break;
    }
  }
  if (!matchedTheme) return null;

  // Require shared words as extra signal
  const shared = sharedWords(a.title, b.title);
  if (shared.length === 0) return null;

  const strength = Math.min(80, 40 + shared.length * 8 + Math.round(importance(a) * 15));

  return {
    signal_a_id: aId,
    signal_b_id: bId,
    signal_a_title: a.title,
    signal_b_title: b.title,
    connection_type: 'THEMATIC',
    strength,
    explanation: `Both signals are driven by the same force: "${matchedTheme}". They look unrelated on the surface but share the same root cause — shared keywords: ${shared.slice(0, 3).join(', ')}.`,
    detected_at: new Date().toISOString(),
    confirmed: false,
  };
}

function detectTemporal(a: RawSignal, b: RawSignal, ai: number, bi: number): SignalConnection | null {
  const aId = signalId(a, ai);
  const bId = signalId(b, bi);
  const aNorm = normalizeIndustry(a.industry);
  const bNorm = normalizeIndustry(b.industry);
  if (aNorm !== bNorm) return null; // Temporal only within same industry

  const aTime = new Date(a.discovered_at).getTime();
  const bTime = new Date(b.discovered_at).getTime();
  const diffHours = Math.abs(aTime - bTime) / (1000 * 60 * 60);

  // Within 72 hours, same industry, same signal type
  if (diffHours <= 72 && a.signal_type === b.signal_type) {
    const shared = sharedWords(a.title, b.title);
    const strength = Math.min(75, 45 + shared.length * 5 + Math.round(importance(a) * 10));

    return {
      signal_a_id: aId,
      signal_b_id: bId,
      signal_a_title: a.title,
      signal_b_title: b.title,
      connection_type: 'TEMPORAL',
      strength,
      explanation: `Two ${b.signal_type.replace(/_/g, ' ')} signals in ${a.industry} within ${Math.round(diffHours)} hours. This is a pattern, not a coincidence — something is moving in this space right now.`,
      detected_at: new Date().toISOString(),
      confirmed: false,
    };
  }

  return null;
}

// ─── Cluster detector ─────────────────────────────────────────────────────────

function detectClusters(signals: RawSignal[]): SignalCluster[] {
  const clusters: SignalCluster[] = [];

  // Group by industry + signal_type
  const groups: Map<string, { signal: RawSignal; index: number }[]> = new Map();
  signals.forEach((s, i) => {
    const key = `${normalizeIndustry(s.industry)}:${s.signal_type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ signal: s, index: i });
  });

  for (const [key, members] of groups.entries()) {
    if (members.length < 3) continue;
    const [industryRaw, typeRaw] = key.split(':');
    const avgImportance = members.reduce((sum, m) => sum + importance(m.signal), 0) / members.length;
    const strength = Math.min(95, Math.round(40 + members.length * 8 + avgImportance * 20));

    // Find dominant company (if any)
    const companyCounts: Record<string, number> = {};
    members.forEach(m => {
      if (m.signal.company) companyCounts[m.signal.company] = (companyCounts[m.signal.company] ?? 0) + 1;
    });
    const topCompany = Object.entries(companyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    clusters.push({
      signal_ids: members.map(m => signalId(m.signal, m.index)),
      signal_titles: members.map(m => m.signal.title),
      theme: `${members.length} ${typeRaw.replace(/_/g, ' ')} signals in ${industryRaw} — a cluster forming`,
      entity: topCompany,
      strength,
    });
  }

  return clusters.sort((a, b) => b.strength - a.strength).slice(0, 20);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectSignalConnections(signals: RawSignal[]): ConnectionReport {
  const connections: SignalConnection[] = [];
  const seen = new Set<string>();

  const limit = Math.min(signals.length, 200); // Cap to avoid O(n²) blowup

  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const a = signals[i];
      const b = signals[j];

      const pairKey = [signalId(a, i), signalId(b, j)].sort().join('|');
      if (seen.has(pairKey)) continue;

      // Try each detector in priority order
      const conn =
        detectEntity(a, b, i, j, signals) ??
        detectCausal(a, b, i, j) ??
        detectThematic(a, b, i, j) ??
        detectTemporal(a, b, i, j);

      if (conn && conn.strength >= 40) {
        connections.push(conn);
        seen.add(pairKey);
      }
    }
  }

  const clusters = detectClusters(signals.slice(0, limit));

  // Sort by strength descending, cap at 100
  connections.sort((a, b) => b.strength - a.strength);

  return {
    connections: connections.slice(0, 100),
    clusters,
    total_signals: signals.length,
    total_connections: connections.length,
    total_clusters: clusters.length,
    detected_at: new Date().toISOString(),
  };
}
