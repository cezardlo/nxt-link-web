import type { IntelSignalRow } from '@/db/queries/intel-signals';

export type FallbackBriefingSignal = IntelSignalRow & {
  vendor_id: string | null;
  problem_category: string | null;
  region: string | null;
};

export const FALLBACK_INTEL_SIGNALS: FallbackBriefingSignal[] = [
  {
    id: 'sig-el-paso-logistics-1',
    signal_type: 'contract_award',
    industry: 'logistics',
    title: 'El Paso logistics automation investment expands cross-border capacity',
    url: 'https://example.com/el-paso-logistics',
    source: 'https://example.com/el-paso-logistics',
    evidence: 'Expansion tied to El Paso and Ciudad Juarez freight movement, with named operators and port-of-entry throughput gains.',
    company: 'BorderFlow Systems',
    amount_usd: null,
    confidence: 0.82,
    importance_score: 0.81,
    tags: ['cross-border', 'logistics', 'automation'],
    discovered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    vendor_id: null,
    problem_category: 'routing',
    region: 'Texas',
  },
  {
    id: 'sig-fort-bliss-defense-1',
    signal_type: 'contract_award',
    industry: 'defense',
    title: 'Fort Bliss awards autonomous convoy support contract',
    url: 'https://example.com/fort-bliss-contract',
    source: 'https://example.com/fort-bliss-contract',
    evidence: 'Contract references Fort Bliss operations, regional testing lanes, and convoy support readiness in West Texas.',
    company: 'Northrop Grumman',
    amount_usd: null,
    confidence: 0.88,
    importance_score: 0.86,
    tags: ['defense', 'autonomy', 'operations'],
    discovered_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    vendor_id: null,
    problem_category: 'routing',
    region: 'Texas',
  },
  {
    id: 'sig-texas-energy-1',
    signal_type: 'product_launch',
    industry: 'energy',
    title: 'Texas supply chain operators adopt new grid resilience tooling',
    url: 'https://example.com/texas-energy',
    source: 'https://example.com/texas-energy',
    evidence: 'Adoption pattern observed across Texas logistics hubs with named distribution sites and reliability targets.',
    company: null,
    amount_usd: null,
    confidence: 0.74,
    importance_score: 0.67,
    tags: ['energy', 'resilience', 'infrastructure'],
    discovered_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    vendor_id: null,
    problem_category: 'cost',
    region: 'Texas',
  },
];
