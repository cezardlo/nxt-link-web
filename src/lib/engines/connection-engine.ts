// src/lib/engines/connection-engine.ts
// The NXT LINK Connection Engine — the deal pipeline builder.
//
// Maps: Signal → Technology → Products → Industries → Target Companies → Vendors
// Scores each chain 0-100 as an "actionable opportunity" score.
//
// Works with whatever data exists (graceful fallback when Supabase is unavailable).

import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';

// ─── Public types ──────────────────────────────────────────────────────────────

export type ConnectionSignal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;        // 0-1 from signal engine
  discovered_at: string;
  url?: string | null;
  confidence?: number;
};

export type ConnectionProduct = {
  name: string;
  vendor: string;           // Lead vendor name for this product (top IKER score match)
  costRange: string;
  maturity: 'emerging' | 'growing' | 'mature';
};

export type ConnectionVendor = {
  id: string;
  name: string;
  ikerScore: number;
  category: string;
  website: string;
};

export type ConnectionChain = {
  signal: { title: string; type: string };
  technology: { name: string; maturity: string };
  products: ConnectionProduct[];
  industries: string[];
  targetCompanies: string[];
  vendors: ConnectionVendor[];
  opportunity: {
    score: number;
    reasoning: string;
    action: string;
    timing: string;
  };
};

export type ConnectionReport = {
  timestamp: string;
  chains: ConnectionChain[];
  total_signals_processed: number;
  total_opportunities: number;
};

// ─── Technology keyword map ────────────────────────────────────────────────────
// Maps keyword patterns to product definitions.

type ProductDef = {
  name: string;
  costRange: string;
  maturity: 'emerging' | 'growing' | 'mature';
};

type TechMapping = {
  techName: string;
  techMaturity: 'emerging' | 'growing' | 'mature';
  keywords: string[];
  products: ProductDef[];
  industries: string[];
  targetCompanies: string[];
};

const TECH_MAPPINGS: TechMapping[] = [
  {
    techName: 'Computer Vision / AI Vision',
    techMaturity: 'mature',
    keywords: ['computer vision', 'cv system', 'image recogni', 'video analytic', 'automated surveillance', 'facial recognition', 'object detection'],
    products: [
      { name: 'AI Vision Analytics Platform', costRange: '$150K–$800K', maturity: 'mature' },
      { name: 'Edge Camera AI System', costRange: '$25K–$120K per node', maturity: 'growing' },
      { name: 'License Plate Recognition Suite', costRange: '$40K–$200K', maturity: 'mature' },
    ],
    industries: ['Defense', 'Border Security', 'Manufacturing', 'Logistics'],
    targetCompanies: ['Port operators', 'Military installations', 'Manufacturing QA teams', 'Logistics hubs'],
  },
  {
    techName: 'Generative AI / LLM',
    techMaturity: 'growing',
    keywords: ['generative ai', 'llm', 'large language model', 'gpt', 'foundation model', 'ai copilot', 'nlp contract', 'language ai', 'conversational ai'],
    products: [
      { name: 'LLM API Integration Platform', costRange: '$30K–$250K/yr', maturity: 'growing' },
      { name: 'AI Document Intelligence Suite', costRange: '$60K–$400K', maturity: 'growing' },
      { name: 'Conversational AI Copilot', costRange: '$20K–$180K/yr', maturity: 'growing' },
    ],
    industries: ['AI/ML', 'Defense IT', 'Healthcare', 'Government Services'],
    targetCompanies: ['Government agencies', 'Healthcare systems', 'Legal & compliance teams', 'Defense analysts'],
  },
  {
    techName: 'Drone / UAS Systems',
    techMaturity: 'growing',
    keywords: ['drone', 'uas', 'uav', 'unmanned aerial', 'counter-uas', 'c-uas', 'small unmanned'],
    products: [
      { name: 'Counter-UAS Detection System', costRange: '$500K–$5M', maturity: 'growing' },
      { name: 'Tactical ISR Drone Package', costRange: '$80K–$600K', maturity: 'growing' },
      { name: 'Border Surveillance UAS', costRange: '$300K–$2M', maturity: 'mature' },
    ],
    industries: ['Defense', 'Border Security', 'Logistics', 'Agriculture'],
    targetCompanies: ['Military units', 'CBP/DHS agencies', 'Large farm operators', 'Infrastructure inspectors'],
  },
  {
    techName: 'Solar / Renewable Energy',
    techMaturity: 'growing',
    keywords: ['solar', 'renewable energy', 'microgrid', 'battery storage', 'energy storage', 'clean energy', 'photovoltaic'],
    products: [
      { name: 'Utility-Scale Solar Array', costRange: '$2M–$50M', maturity: 'mature' },
      { name: 'Tactical Microgrid System', costRange: '$800K–$8M', maturity: 'growing' },
      { name: 'Battery Energy Storage System', costRange: '$500K–$10M', maturity: 'growing' },
    ],
    industries: ['Energy', 'Defense', 'Manufacturing', 'Construction'],
    targetCompanies: ['Military installations', 'Industrial manufacturers', 'Municipal utilities', 'Data centers'],
  },
  {
    techName: 'Robotics / Automation',
    techMaturity: 'growing',
    keywords: ['robot', 'cobot', 'collaborative robot', 'automation', 'agv', 'autonomous vehicle', 'robotic welding', 'industrial robot'],
    products: [
      { name: 'Collaborative Robot (Cobot)', costRange: '$35K–$150K', maturity: 'growing' },
      { name: 'Automated Guided Vehicle (AGV)', costRange: '$50K–$250K', maturity: 'mature' },
      { name: 'Robotic Process Automation Suite', costRange: '$20K–$120K/yr', maturity: 'mature' },
    ],
    industries: ['Manufacturing', 'Logistics', 'Healthcare', 'Defense'],
    targetCompanies: ['Assembly manufacturers', 'Distribution centers', 'Surgical suites', 'Depot maintenance'],
  },
  {
    techName: 'Cybersecurity',
    techMaturity: 'mature',
    keywords: ['cyber', 'cybersecurity', 'threat detection', 'zero trust', 'soc ', 'security operations', 'endpoint security', 'cmmc', 'siem'],
    products: [
      { name: 'Zero Trust Network Access Platform', costRange: '$100K–$1.2M/yr', maturity: 'mature' },
      { name: 'AI Threat Intelligence Platform', costRange: '$80K–$600K/yr', maturity: 'growing' },
      { name: 'CMMC Compliance Toolkit', costRange: '$40K–$300K', maturity: 'mature' },
    ],
    industries: ['Cybersecurity', 'Defense', 'Healthcare', 'Finance'],
    targetCompanies: ['DoD contractors (CMMC required)', 'Healthcare providers', 'Financial institutions', 'Critical infrastructure'],
  },
  {
    techName: 'Supply Chain / Logistics Tech',
    techMaturity: 'mature',
    keywords: ['supply chain', 'logistics', 'warehouse', 'wms', 'fleet track', 'cold chain', 'last mile', 'freight'],
    products: [
      { name: 'Warehouse Management System (WMS)', costRange: '$80K–$600K', maturity: 'mature' },
      { name: 'Fleet Telematics & Tracking', costRange: '$15K–$100K/yr', maturity: 'mature' },
      { name: 'Cold Chain Monitoring Platform', costRange: '$30K–$200K', maturity: 'growing' },
    ],
    industries: ['Logistics', 'Supply Chain', 'Healthcare', 'Agriculture'],
    targetCompanies: ['3PL providers', 'Cross-border shippers', 'Pharmaceutical distributors', 'Food & beverage producers'],
  },
  {
    techName: 'Healthcare / Medical Technology',
    techMaturity: 'growing',
    keywords: ['medical', 'health', 'surgical robot', 'telemedicine', 'ai diagnostics', 'ehr', 'health it', 'clinical ai'],
    products: [
      { name: 'AI-Powered Diagnostic Imaging', costRange: '$200K–$1.5M', maturity: 'growing' },
      { name: 'Telemedicine Platform', costRange: '$50K–$400K/yr', maturity: 'mature' },
      { name: 'Surgical Robot System', costRange: '$1M–$3M', maturity: 'growing' },
    ],
    industries: ['Healthcare', 'Defense', 'Government Services'],
    targetCompanies: ['Military medical centers', 'Regional hospitals', 'Outpatient clinics', 'VA facilities'],
  },
  {
    techName: 'Edge AI / Tactical Computing',
    techMaturity: 'growing',
    keywords: ['edge ai', 'edge computing', 'tactical ai', 'ddil', 'edge inference', 'battlefield', 'tactical edge'],
    products: [
      { name: 'Tactical Edge AI Compute Node', costRange: '$50K–$300K per unit', maturity: 'growing' },
      { name: 'DDIL-Ready AI Platform', costRange: '$200K–$2M', maturity: 'growing' },
    ],
    industries: ['Defense', 'Border Security', 'Critical Infrastructure'],
    targetCompanies: ['Army units (DDIL environments)', 'Special operations', 'Forward operating bases', 'CBP field operations'],
  },
  {
    techName: 'Biometrics / Identity',
    techMaturity: 'mature',
    keywords: ['biometric', 'facial recog', 'iris scan', 'fingerprint', 'identity verification', 'access control', 'cbp identity'],
    products: [
      { name: 'Multi-Modal Biometric System', costRange: '$100K–$800K', maturity: 'mature' },
      { name: 'Biometric Access Control Platform', costRange: '$40K–$250K', maturity: 'mature' },
    ],
    industries: ['Border Security', 'Defense', 'Cybersecurity', 'Government Services'],
    targetCompanies: ['Ports of entry', 'Military bases', 'Airports', 'Federal facilities'],
  },
  {
    techName: 'Water / Desalination Technology',
    techMaturity: 'growing',
    keywords: ['water', 'desalination', 'desal', 'water treatment', 'water purification', 'wastewater', 'water tech'],
    products: [
      { name: 'Reverse Osmosis Desalination System', costRange: '$2M–$30M', maturity: 'mature' },
      { name: 'Smart Water Monitoring Platform', costRange: '$100K–$1M', maturity: 'growing' },
    ],
    industries: ['Water Technology', 'Energy', 'Construction', 'Agriculture'],
    targetCompanies: ['Municipal water authorities', 'Military base utilities', 'Agricultural operators', 'Industrial facilities'],
  },
  {
    techName: 'Fintech / Financial Technology',
    techMaturity: 'growing',
    keywords: ['fintech', 'payment', 'blockchain', 'crypto', 'digital banking', 'fraud detection', 'remittance'],
    products: [
      { name: 'Cross-Border Payment Platform', costRange: '$50K–$500K', maturity: 'growing' },
      { name: 'AI Fraud Detection Engine', costRange: '$80K–$600K/yr', maturity: 'mature' },
    ],
    industries: ['Finance', 'Supply Chain', 'Government Services'],
    targetCompanies: ['Banks & credit unions', 'Money service businesses', 'Cross-border trade companies', 'Government payment systems'],
  },
  {
    techName: 'Contract / Procurement Award',
    techMaturity: 'mature',
    keywords: ['contract award', 'idiq', 'sbir', 'task order', 'procurement', 'bid award', 'rfp award', 'contract win'],
    products: [
      { name: 'Government Contract Intelligence Tool', costRange: '$15K–$80K/yr', maturity: 'mature' },
      { name: 'Procurement Pipeline CRM', costRange: '$25K–$150K/yr', maturity: 'mature' },
    ],
    industries: ['Defense', 'Government Services', 'Cybersecurity', 'AI/ML'],
    targetCompanies: ['Prime contractors', 'Small business set-aside seekers', 'GovCon consultants'],
  },
  {
    techName: 'Manufacturing / Industry 4.0',
    techMaturity: 'growing',
    keywords: ['manufacturing', 'industry 4.0', 'smart factory', 'digital twin', 'additive manufacturing', '3d print', 'quality inspection'],
    products: [
      { name: 'Digital Twin Simulation Platform', costRange: '$200K–$2M', maturity: 'growing' },
      { name: 'Smart Factory IoT Suite', costRange: '$100K–$800K', maturity: 'growing' },
      { name: 'Additive Manufacturing Cell', costRange: '$150K–$1.2M', maturity: 'growing' },
    ],
    industries: ['Manufacturing', 'Defense', 'Aerospace', 'Logistics'],
    targetCompanies: ['Defense depot maintenance', 'Electronics manufacturers', 'Auto parts suppliers', 'Military sustainment programs'],
  },
];

// ─── Vendor matching ────────────────────────────────────────────────────────────

// Build a category → vendor list index once at module load.
type VendorIndex = Map<string, ConnectionVendor[]>;

function buildVendorIndex(): VendorIndex {
  const index: VendorIndex = new Map<string, ConnectionVendor[]>();

  for (const [vendorId, vendor] of Object.entries(EL_PASO_VENDORS)) {
    const cat = vendor.category.toLowerCase();
    const existing = index.get(cat) ?? [];
    existing.push({
      id: vendorId,
      name: vendor.name,
      ikerScore: vendor.ikerScore,
      category: vendor.category,
      website: vendor.website,
    });
    index.set(cat, existing);

    // Also index by each tag (lower-cased)
    for (const tag of vendor.tags) {
      const tagKey = tag.toLowerCase();
      const tagList = index.get(tagKey) ?? [];
      tagList.push({
        id: vendorId,
        name: vendor.name,
        ikerScore: vendor.ikerScore,
        category: vendor.category,
        website: vendor.website,
      });
      index.set(tagKey, tagList);
    }
  }

  return index;
}

const VENDOR_INDEX: VendorIndex = buildVendorIndex();

/** Find vendors relevant to a technology mapping by matching category + tag keywords. */
function findVendors(mapping: TechMapping): ConnectionVendor[] {
  const seen = new Set<string>();
  const results: ConnectionVendor[] = [];

  const searchTerms = [
    ...mapping.keywords,
    mapping.techName.toLowerCase(),
    ...mapping.industries.map((i) => i.toLowerCase()),
  ];

  for (const term of searchTerms) {
    // Exact key hit
    const byKey = VENDOR_INDEX.get(term) ?? [];
    for (const v of byKey) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        results.push(v);
      }
    }

    // Partial key scan — only worth doing for short lists
    for (const [key, vendors] of Array.from(VENDOR_INDEX.entries() as Iterable<[string, ConnectionVendor[]]>)) {
      if (key.includes(term) || term.includes(key)) {
        for (const v of vendors) {
          if (!seen.has(v.id)) {
            seen.add(v.id);
            results.push(v);
          }
        }
      }
    }
  }

  // Sort by IKER score descending, cap at 6
  return results.sort((a, b) => b.ikerScore - a.ikerScore).slice(0, 6);
}

// ─── Opportunity scoring ────────────────────────────────────────────────────────

function scoreOpportunity(
  signal: ConnectionSignal,
  mapping: TechMapping,
  vendors: ConnectionVendor[],
): { score: number; reasoning: string; action: string; timing: string } {
  let score = 0;

  // Signal importance contributes up to 35 points
  score += Math.round(signal.importance * 35);

  // Vendor availability: more vendors = more actionable
  const vendorBonus = Math.min(vendors.length * 4, 20);
  score += vendorBonus;

  // Tech maturity: mature = actionable now, growing = near-term, emerging = long play
  const maturityScore: Record<string, number> = { mature: 20, growing: 14, emerging: 8 };
  score += maturityScore[mapping.techMaturity] ?? 10;

  // Product count: more options = more deal flow
  score += Math.min(mapping.products.length * 5, 15);

  // Industry breadth: cross-sector = bigger opportunity
  score += Math.min(mapping.industries.length * 2, 10);

  score = Math.min(100, Math.max(0, score));

  // Build reasoning from available context
  const topVendor = vendors[0]?.name ?? 'identified vendors';
  const importancePct = Math.round(signal.importance * 100);

  const reasoning =
    `Signal importance: ${importancePct}%. ` +
    `${vendors.length} active vendors tracked (led by ${topVendor}). ` +
    `Technology maturity: ${mapping.techMaturity}. ` +
    `Addressable in ${mapping.industries.join(', ')} sectors.`;

  const action =
    mapping.techMaturity === 'emerging'
      ? `Research ${mapping.techName} vendors — enter early partnership conversations.`
      : mapping.techMaturity === 'growing'
      ? `Qualify ${topVendor} and peers for a discovery call within 30 days.`
      : `Initiate vendor comparison of ${mapping.products[0]?.name ?? 'leading products'} — market is active.`;

  const timing =
    mapping.techMaturity === 'emerging'
      ? '6–18 months (early mover window)'
      : mapping.techMaturity === 'growing'
      ? '2–6 months (growth phase, act now)'
      : 'Immediate (mature market, active procurement)';

  return { score, reasoning, action, timing };
}

// ─── Core engine ───────────────────────────────────────────────────────────────

/** Match a signal to the best technology mapping via keyword overlap. */
function matchSignalToTech(signal: ConnectionSignal): TechMapping | null {
  const text = (signal.title + ' ' + signal.signal_type + ' ' + signal.industry).toLowerCase();

  let bestMapping: TechMapping | null = null;
  let bestHits = 0;

  for (const mapping of TECH_MAPPINGS) {
    let hits = 0;
    for (const kw of mapping.keywords) {
      if (text.includes(kw)) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestMapping = mapping;
    }
  }

  // Require at least 1 keyword hit to form a chain
  return bestHits > 0 ? bestMapping : null;
}

/** Run the full connection engine against a list of signals. Returns a ConnectionReport. */
export function runConnectionEngine(signals: ConnectionSignal[]): ConnectionReport {
  const timestamp = new Date().toISOString();

  // Only process signals with meaningful importance
  const highValueSignals = signals
    .filter((s) => s.importance >= 0.3)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 60); // cap input to keep latency low

  const chainMap = new Map<string, ConnectionChain>();

  for (const signal of highValueSignals) {
    const mapping = matchSignalToTech(signal);
    if (!mapping) continue;

    // Deduplicate chains by technology name — merge signals into the same chain
    const chainKey = mapping.techName;
    if (chainMap.has(chainKey)) continue;

    const vendors = findVendors(mapping);
    const opportunity = scoreOpportunity(signal, mapping, vendors);

    const leadVendorName = vendors[0]?.name ?? 'NXT LINK Sourced';

    const chain: ConnectionChain = {
      signal: {
        title: signal.title,
        type: signal.signal_type,
      },
      technology: {
        name: mapping.techName,
        maturity: mapping.techMaturity,
      },
      products: mapping.products.map((p) => ({
        name: p.name,
        vendor: leadVendorName,
        costRange: p.costRange,
        maturity: p.maturity,
      })),
      industries: mapping.industries,
      targetCompanies: mapping.targetCompanies,
      vendors,
      opportunity,
    };

    chainMap.set(chainKey, chain);
  }

  // Sort by opportunity score, take top 20
  const chains = Array.from(chainMap.values() as Iterable<ConnectionChain>)
    .sort((a, b) => b.opportunity.score - a.opportunity.score)
    .slice(0, 20);

  return {
    timestamp,
    chains,
    total_signals_processed: highValueSignals.length,
    total_opportunities: chains.length,
  };
}

/** Convenience: build connection chains from raw signal API response objects. */
export function buildConnectionsFromApiResponse(
  apiSignals: Array<{
    title: string;
    signal_type?: string;
    type?: string;
    industry?: string;
    company?: string | null;
    importance?: number;
    importance_score?: number;
    discovered_at?: string;
    url?: string | null;
    confidence?: number;
  }>,
): ConnectionReport {
  const normalized: ConnectionSignal[] = apiSignals.map((s) => ({
    title: s.title,
    signal_type: s.signal_type ?? s.type ?? 'general',
    industry: s.industry ?? 'General',
    company: s.company ?? null,
    importance: s.importance ?? s.importance_score ?? 0.5,
    discovered_at: s.discovered_at ?? new Date().toISOString(),
    url: s.url ?? null,
    confidence: s.confidence ?? 0.7,
  }));

  return runConnectionEngine(normalized);
}
