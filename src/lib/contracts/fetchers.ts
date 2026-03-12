// Shared contract-data fetchers used by both:
//   - src/app/api/live/contracts/route.ts  (full list view)
//   - src/app/api/live/opportunities/route.ts (signal aggregation)
//
// Keeping them here avoids the self-referencing HTTP call that the
// opportunities route previously made to /api/live/contracts.

export type ContractAward = {
  id: string;
  source: 'usaspending' | 'sbir' | 'sam';
  vendor: string;
  title: string;
  amount: number | null;
  awardDate: string;
  agency: string;
  naicsCode?: string;
  description: string;
  url?: string;
  phase?: string;
  type: 'award' | 'solicitation' | 'grant';
};

// ── USASpending.gov ────────────────────────────────────────────────────────────

export async function fetchUSASpending(): Promise<ContractAward[]> {
  const body = {
    filters: {
      place_of_performance_locations: [{ country: 'USA', state: 'TX', city: 'El Paso' }],
      time_period: [{ start_date: '2025-10-01', end_date: '2026-09-30' }],
      award_type_codes: ['A', 'B', 'C', 'D'],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Start Date',
      'Awarding Agency',
      'Description',
      'NAICS Code',
      'generated_internal_id',
    ],
    page: 1,
    limit: 20,
    sort: 'Award Amount',
    order: 'desc',
  };

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];

  const json = await res.json() as {
    results?: Array<{
      'Award ID'?: string;
      'Recipient Name'?: string;
      'Award Amount'?: number;
      'Start Date'?: string;
      'Awarding Agency'?: string;
      'Description'?: string;
      'NAICS Code'?: string;
      'generated_internal_id'?: string;
    }>;
  };

  return (json.results ?? []).map((r) => ({
    id: r['generated_internal_id'] ?? r['Award ID'] ?? Math.random().toString(36),
    source: 'usaspending' as const,
    vendor: r['Recipient Name'] ?? 'Unknown',
    title: r['Description'] ?? 'Federal Contract Award',
    amount: r['Award Amount'] ?? null,
    awardDate: r['Start Date'] ?? new Date().toISOString(),
    agency: r['Awarding Agency'] ?? 'Federal Agency',
    naicsCode: r['NAICS Code'],
    description: r['Description'] ?? '',
    url: r['generated_internal_id']
      ? `https://www.usaspending.gov/award/${r['generated_internal_id']}`
      : undefined,
    type: 'award' as const,
  }));
}

// ── SBIR.gov ───────────────────────────────────────────────────────────────────

type SBIRDoc = {
  firm?: string;
  award_title?: string;
  agency?: string;
  branch?: string;
  phase?: string;
  award_amount?: number;
  award_year?: number;
  proposal_award_date?: string;
  abstract?: string;
  award_link?: string;
  city?: string;
  state?: string;
  research_area_keywords?: string;
};

export async function fetchSBIR(): Promise<ContractAward[]> {
  const BASE = 'https://api.www.sbir.gov/public/api/awards';

  const queries = [
    `${BASE}?keyword=El+Paso&rows=100`,
    `${BASE}?keyword=Fort+Bliss&rows=50`,
    `${BASE}?keyword=border+crossing+technology&rows=50`,
  ];

  const settled = await Promise.allSettled(
    queries.map((url) =>
      fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'NXTLinkContractsAgent/1.0' },
        signal: AbortSignal.timeout(10_000),
      }).then(async (res) => {
        if (!res.ok) return [] as SBIRDoc[];
        const data: unknown = await res.json();
        return Array.isArray(data) ? (data as SBIRDoc[]) : [];
      }),
    ),
  );

  const seen = new Set<string>();
  const results: ContractAward[] = [];

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const r of result.value) {
      const key = r.award_link ?? `${r.firm ?? ''}|${r.award_title ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        id: r.award_link ?? key,
        source: 'sbir' as const,
        vendor: r.firm ?? 'Unknown',
        title: r.award_title ?? 'SBIR Award',
        amount: r.award_amount ?? null,
        awardDate: r.proposal_award_date ?? (r.award_year ? `${r.award_year}-01-01` : new Date().toISOString()),
        agency: [r.agency, r.branch].filter(Boolean).join(' — ') || 'Federal Agency',
        description: r.abstract ?? '',
        phase: r.phase ?? undefined,
        url: r.award_link ?? undefined,
        type: 'grant' as const,
      });
    }
  }

  return results;
}

// ── SAM.gov ────────────────────────────────────────────────────────────────────

type SamRow = {
  noticeId?: string;
  title?: string;
  fullParentPathName?: string;
  postedDate?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  description?: string;
  uiLink?: string;
  type?: string;
};

export async function fetchSAMOpportunities(): Promise<ContractAward[]> {
  const samApiKey = process.env.SAM_GOV_API_KEY?.trim();
  if (!samApiKey) return [];

  const formatSamDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  };

  const postedToDate = new Date();
  const postedFromDate = new Date(postedToDate);
  postedFromDate.setDate(postedFromDate.getDate() - 330);

  const fetchRows = async (extraParams: Record<string, string>): Promise<SamRow[]> => {
    const params = new URLSearchParams({
      postedFrom: formatSamDate(postedFromDate),
      postedTo: formatSamDate(postedToDate),
      limit: '50',
      offset: '0',
      active: 'Yes',
      api_key: samApiKey,
      ...extraParams,
    });

    const res = await fetch(`https://api.sam.gov/opportunities/v2/search?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return [];

    const json = await res.json() as {
      opportunitiesData?: SamRow[];
      data?: SamRow[];
    };
    return json.opportunitiesData ?? json.data ?? [];
  };

  const attempts: Array<Record<string, string>> = [
    { q: 'El Paso OR "Fort Bliss" OR border OR logistics', state: 'TX' },
    { q: 'border OR logistics OR defense' },
    {},
  ];

  let rows: SamRow[] = [];
  for (const attempt of attempts) {
    try {
      rows = await fetchRows(attempt);
      if (rows.length > 0) break;
    } catch {
      // Try next attempt.
    }
  }

  return rows.map((r) => ({
    id: r.noticeId ?? Math.random().toString(36),
    source: 'sam' as const,
    vendor: 'Open Solicitation',
    title: r.title ?? 'Federal Solicitation',
    amount: null,
    awardDate: r.postedDate ?? new Date().toISOString(),
    agency: r.fullParentPathName ?? 'Federal Agency',
    naicsCode: r.naicsCode,
    description: r.description ?? '',
    url: r.uiLink,
    type: 'solicitation' as const,
  }));
}

// ── Curated fallback (El Paso, Fort Bliss, UTEP, CBP) ─────────────────────────

export function buildContractsFallback(): ContractAward[] {
  return [
    {
      id: 'fallback-1',
      source: 'usaspending',
      vendor: 'L3Harris Technologies',
      title: 'C4ISR System Maintenance and Support — Fort Bliss',
      amount: 47_000_000,
      awardDate: '2026-01-15',
      agency: 'Department of the Army',
      naicsCode: '334511',
      description: 'Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance system support services at Fort Bliss, TX.',
      url: 'https://www.usaspending.gov',
      type: 'award',
    },
    {
      id: 'fallback-2',
      source: 'sbir',
      vendor: 'AridTech Solutions',
      title: 'Atmospheric Water Harvesting for Forward Operating Bases',
      amount: 1_500_000,
      awardDate: '2025-11-03',
      agency: 'Department of Defense',
      description: 'Phase II SBIR award for scalable atmospheric water generation systems deployable in arid environments.',
      phase: 'Phase II',
      url: 'https://www.sbir.gov',
      type: 'grant',
    },
    {
      id: 'fallback-3',
      source: 'sam',
      vendor: 'Open Solicitation',
      title: 'Border Port of Entry AI Wait-Time Prediction System',
      amount: null,
      awardDate: '2026-02-01',
      agency: 'Customs and Border Protection',
      naicsCode: '541511',
      description: 'CBP seeking AI-powered wait-time prediction and lane optimization at El Paso land ports of entry.',
      type: 'solicitation',
    },
    {
      id: 'fallback-4',
      source: 'usaspending',
      vendor: 'SAIC',
      title: 'GCSS-Army Modernization Support — Fort Bliss',
      amount: 28_400_000,
      awardDate: '2025-12-10',
      agency: 'Department of the Army',
      naicsCode: '541512',
      description: 'Global Combat Support System — Army ERP sustainment, help desk, and modernization services.',
      type: 'award',
    },
    {
      id: 'fallback-5',
      source: 'sbir',
      vendor: 'CrossingIQ',
      title: 'Machine Learning for Commercial Lane Traffic Prediction',
      amount: 750_000,
      awardDate: '2026-01-28',
      agency: 'Department of Homeland Security',
      description: 'Phase I SBIR for ML-based prediction of commercial vehicle wait times at busy US-Mexico land ports.',
      phase: 'Phase I',
      type: 'grant',
    },
  ];
}
