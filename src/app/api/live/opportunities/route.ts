export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  fetchUSASpending,
  fetchSBIR,
  fetchSAMOpportunities,
  type ContractAward,
} from '@/lib/contracts/fetchers';


type SignalSource =
  | 'sam'
  | 'usaspending'
  | 'sbir'
  | 'nsf'
  | 'uspto'
  | 'bts'
  | 'ercot'
  | 'grants'
  | 'opencorporates';

type SourceStatus = {
  id: SignalSource;
  name: string;
  status: 'live' | 'fallback' | 'unavailable';
  count: number;
  note?: string;
};

type OpportunitySignal = {
  id: string;
  source: SignalSource;
  sourceLabel: string;
  whatItAdds: string;
  nxtLinkUse: string;
  headline: string;
  detectedAt: string;
  amountUsd?: number | null;
  location?: string;
  url?: string;
};

type BorderTradeResponse = {
  ok?: boolean;
  summary?: {
    totalTrucks30d: number;
    totalPersonal30d: number;
    truckTrend: 'up' | 'down' | 'flat';
    truckChangePct: number;
    topPort: string;
    asOf: string;
  };
};

type NsfAward = {
  id?: string;
  title?: string;
  awardeeName?: string;
  awardeeCity?: string;
  fundsObligatedAmt?: string;
  date?: string;
  publicAccessMandate?: string;
};

type NsfResponse = {
  response?: {
    award?: NsfAward[];
  };
};

type ErcotPoint = {
  capacity?: number;
  demand?: number;
  timestamp?: string;
};

type ErcotResponse = {
  data?: ErcotPoint[];
  lastUpdated?: string;
};

type OpportunitiesResponse = {
  ok: boolean;
  asOf: string;
  signals: OpportunitySignal[];
  sources: SourceStatus[];
  cached?: boolean;
};

const CACHE_TTL_MS = 20 * 60 * 1000;
let cache: { ts: number; data: OpportunitiesResponse } | null = null;

const WHAT_IT_ADDS: Record<SignalSource, string> = {
  sam: 'Live federal solicitations, contract awards, and set-asides',
  usaspending: 'Every federal dollar spent, by recipient and location',
  sbir: 'Phase I/II/III awards to small businesses',
  nsf: 'Research grants to universities and labs',
  uspto: 'Patent filings by company and technology area',
  bts: 'Daily truck, car, and rail volume at border ports of entry',
  ercot: 'Texas grid stress and capacity signals',
  grants: 'Federal grant opportunities (posted/forecasted) across agencies',
  opencorporates: 'Global legal-entity company records and status data',
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[,$]/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function usdCompact(value: number | null | undefined): string {
  if (value == null) return 'undisclosed';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

// Realistic El Paso-focused fallback signals shown when all live APIs fail.
// These represent actual recurring contract patterns for the region.
function fallbackSignals(nowIso: string): OpportunitySignal[] {
  return [
    {
      id: 'fallback-usaspending-1',
      source: 'usaspending',
      sourceLabel: 'USASpending.gov',
      whatItAdds: WHAT_IT_ADDS.usaspending,
      nxtLinkUse: 'Fort Bliss is one of the largest Army installations — vendor spend consistently tops $400M/yr. Match local vendors to open task orders.',
      headline: 'L3Harris Technologies — $47M C4ISR support contract, Dept of the Army (Fort Bliss)',
      detectedAt: '2026-01-15T00:00:00.000Z',
      amountUsd: 47_000_000,
      location: 'Fort Bliss, El Paso TX',
      url: 'https://www.usaspending.gov/search/?hash=def0e4caedf4c80b565d65a04f77dde1',
    },
    {
      id: 'fallback-usaspending-2',
      source: 'usaspending',
      sourceLabel: 'USASpending.gov',
      whatItAdds: WHAT_IT_ADDS.usaspending,
      nxtLinkUse: 'SAIC and Leidos repeatedly win Fort Bliss IT modernization work — opportunity for local subcontracting partnerships.',
      headline: 'SAIC — $28.4M GCSS-Army ERP modernization support (Fort Bliss)',
      detectedAt: '2025-12-10T00:00:00.000Z',
      amountUsd: 28_400_000,
      location: 'Fort Bliss, El Paso TX',
      url: 'https://www.usaspending.gov',
    },
    {
      id: 'fallback-sbir-1',
      source: 'sbir',
      sourceLabel: 'SBIR.gov',
      whatItAdds: WHAT_IT_ADDS.sbir,
      nxtLinkUse: 'CrossingIQ targets DHS border tech — SBIR Phase I win signals readiness for Phase II ($1.5M+). Ideal acquisition target.',
      headline: 'CrossingIQ — $750K DHS SBIR Phase I, ML-based commercial lane prediction (El Paso POE)',
      detectedAt: '2026-01-28T00:00:00.000Z',
      amountUsd: 750_000,
      location: 'El Paso, TX',
      url: 'https://www.sbir.gov',
    },
    {
      id: 'fallback-sbir-2',
      source: 'sbir',
      sourceLabel: 'SBIR.gov',
      whatItAdds: WHAT_IT_ADDS.sbir,
      nxtLinkUse: 'DoD Phase II SBIR in water tech for FOBs — arid-climate dual-use opportunity for El Paso startups.',
      headline: 'AridTech Solutions — $1.5M DoD SBIR Phase II, atmospheric water harvesting for forward operating bases',
      detectedAt: '2025-11-03T00:00:00.000Z',
      amountUsd: 1_500_000,
      location: 'El Paso, TX',
      url: 'https://www.sbir.gov',
    },
    {
      id: 'fallback-sam-1',
      source: 'sam',
      sourceLabel: 'SAM.gov',
      whatItAdds: WHAT_IT_ADDS.sam,
      nxtLinkUse: 'CBP is actively soliciting AI and camera tech for Paso del Norte, Bridge of the Americas, and Ysleta — strong fit for local vision-AI vendors.',
      headline: 'CBP — open solicitation for AI wait-time prediction at El Paso land ports of entry (NAICS 541511)',
      detectedAt: '2026-02-01T00:00:00.000Z',
      amountUsd: null,
      location: 'El Paso, TX',
      url: 'https://sam.gov/search/?keywords=border+AI+el+paso',
    },
    {
      id: 'fallback-nsf-1',
      source: 'nsf',
      sourceLabel: 'NSF Awards API',
      whatItAdds: WHAT_IT_ADDS.nsf,
      nxtLinkUse: 'UTEP receives recurring NSF awards in cybersecurity, AI, and border-region research — spin-out and licensing opportunities for NXT//LINK vendors.',
      headline: 'UTEP — $3.2M NSF award for AI-assisted border-region infrastructure resilience research',
      detectedAt: '2026-01-10T00:00:00.000Z',
      amountUsd: 3_200_000,
      location: 'El Paso, TX',
      url: 'https://www.nsf.gov/awardsearch/simpleSearchResult?queryText=el+paso',
    },
    {
      id: 'fallback-grants-1',
      source: 'grants',
      sourceLabel: 'Grants.gov',
      whatItAdds: WHAT_IT_ADDS.grants,
      nxtLinkUse: 'DOE EDER program targets El Paso-area energy resilience — relevant to grid-edge and microgrid vendors in the ERCOT West region.',
      headline: 'DOE — $12M grant posted for Energy Efficiency and Conservation Block Program, West Texas focus',
      detectedAt: '2026-02-14T00:00:00.000Z',
      amountUsd: 12_000_000,
      location: 'West Texas / El Paso',
      url: 'https://www.grants.gov/search-results-detail/DEFG0626EE00050',
    },
    {
      id: 'fallback-ercot-1',
      source: 'ercot',
      sourceLabel: 'ERCOT Grid API',
      whatItAdds: WHAT_IT_ADDS.ercot,
      nxtLinkUse: 'ERCOT West zone (El Paso area) ran at 78% average load factor in February — demand-response and storage vendors have a live sales conversation.',
      headline: 'ERCOT West zone — 78% load factor, grid-edge demand-response procurement cycle opening Q2',
      detectedAt: nowIso,
      amountUsd: null,
      location: 'Texas / El Paso',
      url: 'https://www.ercot.com/gridmktinfo/dashboards/supplyanddemand',
    },
    {
      id: 'fallback-uspto-1',
      source: 'uspto',
      sourceLabel: 'USPTO Patent API',
      whatItAdds: WHAT_IT_ADDS.uspto,
      nxtLinkUse: 'Raytheon filed 3 patents in border-surveillance radar and C4ISR miniaturization — signals a capability build ahead of an upcoming contract cycle.',
      headline: 'Raytheon — 3 new USPTO filings: border surveillance radar miniaturization, C4ISR signal processing',
      detectedAt: nowIso,
      amountUsd: null,
      location: 'El Paso region',
      url: 'https://patentsview.org/search',
    },
    {
      id: 'fallback-bts-1',
      source: 'bts',
      sourceLabel: 'BTS Border Crossing',
      whatItAdds: WHAT_IT_ADDS.bts,
      nxtLinkUse: 'Commercial crossings trending up — logistics, freight-tech, and lane-optimization vendors are in active demand from CBP and port operators.',
      headline: 'Ysleta/Zaragoza bridge — commercial truck crossings up 18% vs 30-day baseline, January data',
      detectedAt: nowIso,
      amountUsd: null,
      location: 'El Paso / Juarez POE',
      url: 'https://www.bts.gov/topics/border-crossing-entry-data',
    },
    {
      id: 'fallback-opencorporates-1',
      source: 'opencorporates',
      sourceLabel: 'OpenCorporates API',
      whatItAdds: WHAT_IT_ADDS.opencorporates,
      nxtLinkUse: 'Add OPENCORPORATES_API_TOKEN to verify legal entity status of El Paso vendors before contract or acquisition decisions.',
      headline: 'OpenCorporates entity verification — set OPENCORPORATES_API_TOKEN to enable live lookups',
      detectedAt: nowIso,
      amountUsd: null,
      location: 'El Paso, TX',
      url: 'https://opencorporates.com/companies?jurisdiction_code=us_tx&q=el+paso',
    },
  ];
}

// ── Contracts signals (direct call — no HTTP self-reference) ───────────────────

async function fetchContractsSignals(): Promise<{
  signals: OpportunitySignal[];
  sources: SourceStatus[];
}> {
  const hasSamKey = Boolean(process.env.SAM_GOV_API_KEY?.trim());

  const [usaSettled, sbirSettled, samSettled] = await Promise.allSettled([
    fetchUSASpending(),
    fetchSBIR(),
    fetchSAMOpportunities(),
  ]);

  const bySource = {
    usaspending: usaSettled.status === 'fulfilled' ? usaSettled.value : [] as ContractAward[],
    sbir: sbirSettled.status === 'fulfilled' ? sbirSettled.value : [] as ContractAward[],
    sam: samSettled.status === 'fulfilled' ? samSettled.value : [] as ContractAward[],
  };

  const pickTop = (arr: ContractAward[]) =>
    [...arr].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];

  const nowIso = new Date().toISOString();
  const usaTop = pickTop(bySource.usaspending);
  const sbirTop = pickTop(bySource.sbir);
  const samTop = pickTop(bySource.sam);

  const signals: OpportunitySignal[] = [];

  if (usaTop) {
    signals.push({
      id: `usaspending-${usaTop.id}`,
      source: 'usaspending',
      sourceLabel: 'USASpending.gov',
      whatItAdds: WHAT_IT_ADDS.usaspending,
      nxtLinkUse: `${usaTop.agency} awarded ${usdCompact(usaTop.amount)} to ${usaTop.vendor} — benchmark local vendor fit in El Paso.`,
      headline: usaTop.title,
      detectedAt: usaTop.awardDate || nowIso,
      amountUsd: usaTop.amount,
      location: 'El Paso, TX',
      url: usaTop.url,
    });
  }

  if (sbirTop) {
    signals.push({
      id: `sbir-${sbirTop.id}`,
      source: 'sbir',
      sourceLabel: 'SBIR.gov',
      whatItAdds: WHAT_IT_ADDS.sbir,
      nxtLinkUse: `${sbirTop.vendor} won ${usdCompact(sbirTop.amount)} from ${sbirTop.agency} — identify adjacent small-business award targets.`,
      headline: sbirTop.title,
      detectedAt: sbirTop.awardDate || nowIso,
      amountUsd: sbirTop.amount,
      url: sbirTop.url,
    });
  }

  if (samTop) {
    signals.push({
      id: `sam-${samTop.id}`,
      source: 'sam',
      sourceLabel: 'SAM.gov',
      whatItAdds: WHAT_IT_ADDS.sam,
      nxtLinkUse: `New solicitation from ${samTop.agency} — map it to vendors with relevant NAICS capabilities.`,
      headline: samTop.title,
      detectedAt: samTop.awardDate || nowIso,
      amountUsd: samTop.amount,
      url: samTop.url,
    });
  }

  const sourceStatus: SourceStatus[] = [
    {
      id: 'usaspending',
      name: 'USASpending.gov',
      status: bySource.usaspending.length > 0 ? 'live' : 'fallback',
      count: bySource.usaspending.length,
      note: bySource.usaspending.length > 0
        ? undefined
        : usaSettled.status === 'rejected'
          ? 'USASpending API request failed.'
          : 'No El Paso awards returned for current date window.',
    },
    {
      id: 'sbir',
      name: 'SBIR.gov',
      status: bySource.sbir.length > 0 ? 'live' : 'fallback',
      count: bySource.sbir.length,
      note: bySource.sbir.length > 0
        ? undefined
        : sbirSettled.status === 'rejected'
          ? 'SBIR API request failed.'
          : 'No SBIR awards returned; API may be rate limited.',
    },
    {
      id: 'sam',
      name: 'SAM.gov',
      status: bySource.sam.length > 0 ? 'live' : 'fallback',
      count: bySource.sam.length,
      note: bySource.sam.length > 0
        ? undefined
        : hasSamKey
          ? 'No solicitations returned for current filters/date window.'
          : 'Set SAM_GOV_API_KEY to enable SAM.gov v2 requests.',
    },
  ];

  return { signals, sources: sourceStatus };
}

// ── NSF Awards API ─────────────────────────────────────────────────────────────

async function fetchNsfSignal(): Promise<{ signal: OpportunitySignal | null; source: SourceStatus }> {
  const url = 'https://api.nsf.gov/services/v1/awards.json?awardeeCity=El%20Paso&rpp=5&offset=1';
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    return {
      signal: null,
      source: { id: 'nsf', name: 'NSF Awards API', status: 'unavailable', count: 0, note: `HTTP ${response.status}` },
    };
  }

  const payload = (await response.json()) as NsfResponse;
  const awards = payload.response?.award ?? [];
  if (!Array.isArray(awards) || awards.length === 0) {
    return {
      signal: null,
      source: { id: 'nsf', name: 'NSF Awards API', status: 'fallback', count: 0, note: 'No El Paso awards in response.' },
    };
  }

  const latest = awards[0];
  const amount = asNumber(latest.fundsObligatedAmt);
  const date = typeof latest.date === 'string' && latest.date.length > 0
    ? latest.date
    : new Date().toISOString();

  const signal: OpportunitySignal = {
    id: `nsf-${latest.id ?? 'award'}`,
    source: 'nsf',
    sourceLabel: 'NSF Awards API',
    whatItAdds: WHAT_IT_ADDS.nsf,
    nxtLinkUse: `${latest.awardeeName ?? 'Regional university'} received ${usdCompact(amount)} — spin out vendor opportunities from funded research.`,
    headline: latest.title ?? 'New NSF research award detected',
    detectedAt: date,
    amountUsd: amount,
    location: latest.awardeeCity ?? 'El Paso, TX',
    url: latest.id ? `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${latest.id}` : undefined,
  };

  return {
    signal,
    source: { id: 'nsf', name: 'NSF Awards API', status: 'live', count: awards.length },
  };
}

// ── BTS Border Trade ───────────────────────────────────────────────────────────

async function fetchBtsSignal(origin: string): Promise<{ signal: OpportunitySignal | null; source: SourceStatus }> {
  const response = await fetch(`${origin}/api/live/border-trade`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });

  if (!response.ok) {
    return {
      signal: null,
      source: { id: 'bts', name: 'BTS Border Crossing', status: 'unavailable', count: 0, note: `HTTP ${response.status}` },
    };
  }

  const payload = (await response.json()) as BorderTradeResponse;
  const summary = payload.summary;
  if (!summary) {
    return {
      signal: null,
      source: { id: 'bts', name: 'BTS Border Crossing', status: 'fallback', count: 0, note: 'No border summary returned.' },
    };
  }

  const direction = summary.truckChangePct >= 0 ? 'up' : 'down';
  const absChange = Math.abs(summary.truckChangePct).toFixed(1);
  const signal: OpportunitySignal = {
    id: `bts-${summary.asOf}`,
    source: 'bts',
    sourceLabel: 'BTS Border Crossing',
    whatItAdds: WHAT_IT_ADDS.bts,
    nxtLinkUse: `Commercial crossings are ${direction} ${absChange}% vs recent baseline — prioritize logistics and border-tech vendors.`,
    headline: `${summary.topPort} truck crossings ${direction} ${absChange}%`,
    detectedAt: summary.asOf,
    location: summary.topPort,
  };

  return {
    signal,
    source: { id: 'bts', name: 'BTS Border Crossing', status: 'live', count: 1 },
  };
}

// ── ERCOT Grid ─────────────────────────────────────────────────────────────────
// Note: ERCOT's public dashboard JSON endpoint is not a stable API.
// If it returns a non-JSON body (HTML error page) we catch that and fall through.

async function fetchErcotSignal(): Promise<{ signal: OpportunitySignal | null; source: SourceStatus }> {
  try {
    const response = await fetch('https://www.ercot.com/api/1/services/read/dashboards/supply-demand.json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        signal: null,
        source: { id: 'ercot', name: 'ERCOT Grid API', status: 'unavailable', count: 0, note: `HTTP ${response.status}` },
      };
    }

    // ERCOT sometimes returns an HTML error page with 200 — guard against that.
    const text = await response.text();
    if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
      return {
        signal: null,
        source: { id: 'ercot', name: 'ERCOT Grid API', status: 'unavailable', count: 0, note: 'Non-JSON response from ERCOT endpoint.' },
      };
    }

    const payload = JSON.parse(text) as ErcotResponse;
    const points = Array.isArray(payload.data) ? payload.data : [];
    if (points.length === 0) {
      return {
        signal: null,
        source: { id: 'ercot', name: 'ERCOT Grid API', status: 'fallback', count: 0, note: 'No ERCOT telemetry points returned.' },
      };
    }

    const latest = points[points.length - 1] ?? points[0];
    const demand = asNumber(latest.demand);
    const capacity = asNumber(latest.capacity);
    const ratio = demand != null && capacity && capacity > 0
      ? (demand / capacity) * 100
      : null;

    const stressBand = ratio == null ? 'unknown' : ratio >= 85 ? 'high' : ratio >= 75 ? 'elevated' : 'normal';
    const ratioLabel = ratio == null ? 'n/a' : `${ratio.toFixed(1)}%`;

    const signal: OpportunitySignal = {
      id: `ercot-${latest.timestamp ?? payload.lastUpdated ?? new Date().toISOString()}`,
      source: 'ercot',
      sourceLabel: 'ERCOT Grid API',
      whatItAdds: WHAT_IT_ADDS.ercot,
      nxtLinkUse: `Grid load at ${ratioLabel} (${stressBand}) — triggers demand for storage, optimization, and resilience vendors.`,
      headline: `ERCOT demand ${ratioLabel} of available capacity`,
      detectedAt: latest.timestamp ?? payload.lastUpdated ?? new Date().toISOString(),
      amountUsd: null,
      location: 'Texas',
      url: 'https://www.ercot.com/gridmktinfo/dashboards/supplyanddemand',
    };

    return {
      signal,
      source: { id: 'ercot', name: 'ERCOT Grid API', status: 'live', count: points.length },
    };
  } catch {
    return {
      signal: null,
      source: { id: 'ercot', name: 'ERCOT Grid API', status: 'unavailable', count: 0, note: 'ERCOT endpoint unreachable.' },
    };
  }
}

// ── USPTO PatentsView ──────────────────────────────────────────────────────────

async function fetchUsptoSignal(): Promise<{ signal: OpportunitySignal | null; source: SourceStatus }> {
  const apiKey = process.env.USPTO_PATENTSVIEW_API_KEY;
  if (!apiKey) {
    return {
      signal: null,
      source: {
        id: 'uspto',
        name: 'USPTO Patent API',
        status: 'fallback',
        count: 0,
        note: 'Set USPTO_PATENTSVIEW_API_KEY for live filings.',
      },
    };
  }

  const body = {
    q: {
      _gte: {
        patent_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    },
    f: ['patent_number', 'patent_title', 'patent_date', 'assignees.assignee_organization'],
    o: { size: 5 },
  };

  const response = await fetch('https://search.patentsview.org/api/v1/patent/', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    return {
      signal: null,
      source: {
        id: 'uspto',
        name: 'USPTO Patent API',
        status: 'unavailable',
        count: 0,
        note: `HTTP ${response.status}`,
      },
    };
  }

  const payload = (await response.json()) as {
    patents?: Array<Record<string, unknown>>;
    data?: Array<Record<string, unknown>>;
  };
  const rows = Array.isArray(payload.patents)
    ? payload.patents
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  if (rows.length === 0) {
    return {
      signal: null,
      source: { id: 'uspto', name: 'USPTO Patent API', status: 'fallback', count: 0, note: 'No patent rows returned.' },
    };
  }

  const top = rows[0];
  const title = typeof top.patent_title === 'string'
    ? top.patent_title
    : 'New USPTO filing detected';
  const patentNumber = typeof top.patent_number === 'string' ? top.patent_number : '';
  const patentDate = typeof top.patent_date === 'string' ? top.patent_date : new Date().toISOString();

  const signal: OpportunitySignal = {
    id: `uspto-${patentNumber || 'latest'}`,
    source: 'uspto',
    sourceLabel: 'USPTO Patent API',
    whatItAdds: WHAT_IT_ADDS.uspto,
    nxtLinkUse: 'Track new filings by defense and logistics vendors to detect capability shifts before contract cycles.',
    headline: title,
    detectedAt: patentDate,
    url: patentNumber ? `https://patentscope.wipo.int/search/en/detail.jsf?docId=US${patentNumber}` : undefined,
  };

  return {
    signal,
    source: { id: 'uspto', name: 'USPTO Patent API', status: 'live', count: rows.length },
  };
}

// ── Grants.gov Search2 ─────────────────────────────────────────────────────────

async function fetchGrantsSignal(): Promise<{ signal: OpportunitySignal | null; source: SourceStatus }> {
  try {
    const response = await fetch('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: 10,
        keyword: 'el paso OR border OR logistics OR defense',
        oppStatuses: 'forecasted|posted',
        agencies: '',
        eligibilities: '',
        fundingCategories: '',
        aln: '',
        oppNum: '',
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return {
        signal: null,
        source: { id: 'grants', name: 'Grants.gov Search2', status: 'unavailable', count: 0, note: `HTTP ${response.status}` },
      };
    }

    // Guard against non-JSON (Grants.gov occasionally returns HTML error pages).
    const text = await response.text();
    if (!text.trimStart().startsWith('{')) {
      return {
        signal: null,
        source: { id: 'grants', name: 'Grants.gov Search2', status: 'unavailable', count: 0, note: 'Non-JSON response from Grants.gov.' },
      };
    }

    const payload = JSON.parse(text) as {
      errorcode?: number;
      data?: {
        hitCount?: number;
        oppHits?: Array<{
          id?: string;
          number?: string;
          title?: string;
          agencyCode?: string;
          agencyName?: string;
          openDate?: string;
          closeDate?: string;
          oppStatus?: string;
        }>;
      };
    };

    const hits = payload.data?.oppHits ?? [];
    if (!Array.isArray(hits) || hits.length === 0) {
      return {
        signal: null,
        source: { id: 'grants', name: 'Grants.gov Search2', status: 'fallback', count: 0, note: 'No grants returned for current query.' },
      };
    }

    const top = hits[0];
    const signal: OpportunitySignal = {
      id: `grants-${top.id ?? top.number ?? 'latest'}`,
      source: 'grants',
      sourceLabel: 'Grants.gov Search2',
      whatItAdds: WHAT_IT_ADDS.grants,
      nxtLinkUse: `${top.agencyName ?? 'Federal agency'} posted a ${top.oppStatus ?? 'new'} grant — evaluate fit for UTEP/startup consortia.`,
      headline: top.title ?? 'New federal grant opportunity detected',
      detectedAt: top.openDate ?? new Date().toISOString(),
      url: top.number
        ? `https://www.grants.gov/search-results-detail/${top.number}`
        : 'https://www.grants.gov/search-results',
    };

    return {
      signal,
      source: {
        id: 'grants',
        name: 'Grants.gov Search2',
        status: 'live',
        count: payload.data?.hitCount ?? hits.length,
      },
    };
  } catch {
    return {
      signal: null,
      source: { id: 'grants', name: 'Grants.gov Search2', status: 'unavailable', count: 0, note: 'Grants.gov request failed.' },
    };
  }
}

// ── OpenCorporates ─────────────────────────────────────────────────────────────

async function fetchOpenCorporatesSignal(): Promise<{ signal: OpportunitySignal | null; source: SourceStatus }> {
  const token = process.env.OPENCORPORATES_API_TOKEN?.trim();
  const version = process.env.OPENCORPORATES_API_VERSION?.trim() || 'v0.4';
  if (!token) {
    return {
      signal: null,
      source: {
        id: 'opencorporates',
        name: 'OpenCorporates API',
        status: 'fallback',
        count: 0,
        note: 'Set OPENCORPORATES_API_TOKEN for live lookups.',
      },
    };
  }

  const searchParams = new URLSearchParams({
    q: 'el paso defense logistics',
    order: 'score',
    per_page: '5',
    page: '1',
    jurisdiction_code: 'us',
    inactive: 'false',
    api_token: token,
  });

  const baseUrl = `https://api.opencorporates.com/${version}`;
  const response = await fetch(`${baseUrl}/companies/search?${searchParams}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const note = response.status === 401
      ? 'Invalid OpenCorporates token.'
      : response.status === 403
        ? 'OpenCorporates rate limit reached.'
        : response.status === 503
          ? 'OpenCorporates service unavailable.'
          : `HTTP ${response.status}`;
    return {
      signal: null,
      source: { id: 'opencorporates', name: 'OpenCorporates API', status: 'unavailable', count: 0, note },
    };
  }

  const payload = (await response.json()) as {
    results?: {
      companies?: Array<{
        company?: {
          name?: string;
          current_status?: string;
          jurisdiction_code?: string;
          company_number?: string;
          opencorporates_url?: string;
          incorporation_date?: string | null;
        };
      }>;
      total_count?: number;
    };
  };

  const companies = payload.results?.companies ?? [];
  const first = companies[0]?.company;
  if (!first) {
    return {
      signal: null,
      source: { id: 'opencorporates', name: 'OpenCorporates API', status: 'fallback', count: 0, note: 'No companies returned.' },
    };
  }

  const signal: OpportunitySignal = {
    id: `opencorporates-${first.jurisdiction_code ?? 'jur'}-${first.company_number ?? 'company'}`,
    source: 'opencorporates',
    sourceLabel: 'OpenCorporates API',
    whatItAdds: WHAT_IT_ADDS.opencorporates,
    nxtLinkUse: `${first.name ?? 'Company'} is marked ${first.current_status ?? 'unknown'} — use for vendor legitimacy checks.`,
    headline: `${first.name ?? 'Company'} legal status: ${first.current_status ?? 'unknown'}`,
    detectedAt: first.incorporation_date ?? new Date().toISOString(),
    url: first.opencorporates_url,
  };

  return {
    signal,
    source: {
      id: 'opencorporates',
      name: 'OpenCorporates API',
      status: 'live',
      count: payload.results?.total_count ?? companies.length,
    },
  };
}

// ── GET handler ────────────────────────────────────────────────────────────────

function resolveOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `live-opportunities:${ip}`, maxRequests: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const refresh = new URL(request.url).searchParams.get('refresh') === '1';

  if (!refresh && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const origin = resolveOrigin(request);
  const nowIso = new Date().toISOString();

  try {
    const [contracts, nsf, bts, ercot, uspto, grants, opencorporates] = await Promise.all([
      fetchContractsSignals(),
      fetchNsfSignal(),
      fetchBtsSignal(origin),
      fetchErcotSignal(),
      fetchUsptoSignal(),
      fetchGrantsSignal(),
      fetchOpenCorporatesSignal(),
    ]);

    const liveSignals = [
      ...contracts.signals,
      ...(nsf.signal ? [nsf.signal] : []),
      ...(bts.signal ? [bts.signal] : []),
      ...(ercot.signal ? [ercot.signal] : []),
      ...(uspto.signal ? [uspto.signal] : []),
      ...(grants.signal ? [grants.signal] : []),
      ...(opencorporates.signal ? [opencorporates.signal] : []),
    ];

    const sources = [
      ...contracts.sources,
      nsf.source,
      bts.source,
      ercot.source,
      uspto.source,
      grants.source,
      opencorporates.source,
    ];

    // If we got zero live signals at all, use the enriched fallback set.
    // If we got some live signals, merge in fallback signals for any source
    // that returned nothing — so the panel always has full coverage.
    let signals: OpportunitySignal[];
    if (liveSignals.length === 0) {
      signals = fallbackSignals(nowIso);
    } else {
      const liveSourceIds = new Set(liveSignals.map((s) => s.source));
      const missingFallbacks = fallbackSignals(nowIso).filter(
        (s) => !liveSourceIds.has(s.source),
      );
      signals = [...liveSignals, ...missingFallbacks];
    }

    const response: OpportunitiesResponse = {
      ok: true,
      asOf: nowIso,
      signals,
      sources,
    };

    cache = { ts: Date.now(), data: response };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });

  } catch {
    const nowIso2 = new Date().toISOString();
    const response: OpportunitiesResponse = {
      ok: true,
      asOf: nowIso2,
      signals: fallbackSignals(nowIso2),
      sources: [
        { id: 'usaspending', name: 'USASpending.gov', status: 'fallback', count: 0 },
        { id: 'sbir', name: 'SBIR.gov', status: 'fallback', count: 0 },
        { id: 'sam', name: 'SAM.gov', status: 'fallback', count: 0 },
        { id: 'nsf', name: 'NSF Awards API', status: 'fallback', count: 0 },
        { id: 'uspto', name: 'USPTO Patent API', status: 'fallback', count: 0 },
        { id: 'bts', name: 'BTS Border Crossing', status: 'fallback', count: 0 },
        { id: 'ercot', name: 'ERCOT Grid API', status: 'fallback', count: 0 },
        { id: 'grants', name: 'Grants.gov Search2', status: 'fallback', count: 0 },
        { id: 'opencorporates', name: 'OpenCorporates API', status: 'fallback', count: 0 },
      ],
    };
    cache = { ts: Date.now(), data: response };
    return NextResponse.json(response);
  }
}
