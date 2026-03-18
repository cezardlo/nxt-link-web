'use client';
// src/app/command-center/hooks/useSignals.ts
// Fetches from 8 sources in parallel, normalizes everything into IntelSignal[].
// Sources: intel-signals, what-changed, patents, research, cyber, hackernews, federal-jobs, economic

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  IntelSignal,
  IntelSignalsResponse,
  SectorScore,
  SignalType,
  SignalPriority,
} from '../types/intel';

const REFRESH_MS = 5 * 60 * 1000;
const EP_LNG = -106.485;
const EP_LAT = 31.762;

export const SIGNAL_COLORS: Record<SignalType, [number, number, number]> = {
  research_paper:     [0,   212, 255],
  patent_filing:      [255, 215,   0],
  funding_round:      [168,  85, 247],
  contract_award:     [255, 215,   0],
  merger_acquisition: [0,   255, 136],
  product_launch:     [0,   255, 136],
  facility_expansion: [0,   255, 136],
  regulatory_action:  [255,  59,  48],
  hiring_signal:      [0,   212, 255],
  case_study:         [0,   212, 255],
};

const EP_KEYWORDS = [
  'el paso', 'juarez', 'border', 'utep', 'fort bliss',
  'west texas', 'chihuahua', 'dona ana', 'santa teresa',
  'sunland park', 'cbp', 'customs', 'bwc',
];

const COMPANY_COORDS: Record<string, [number, number]> = {
  'google': [-122.084, 37.422], 'alphabet': [-122.084, 37.422],
  'apple': [-122.009, 37.335], 'microsoft': [-122.126, 47.640],
  'amazon': [-122.339, 47.616], 'meta': [-122.149, 37.485],
  'nvidia': [-121.977, 37.370], 'tesla': [-97.751, 30.228],
  'openai': [-122.399, 37.776], 'spacex': [-118.343, 33.921],
  'lockheed': [-77.449, 38.888], 'raytheon': [-71.268, 42.363],
  'boeing': [-87.636, 41.879], 'northrop': [-118.369, 34.201],
  'palantir': [-104.993, 39.740], 'anduril': [-117.824, 33.685],
  'cloudflare': [-122.399, 37.776], 'crowdstrike': [-78.786, 35.841],
  'samsung': [127.060, 37.514], 'tsmc': [120.981, 24.787],
  'arm': [-1.258, 52.254], 'asml': [5.482, 51.441],
  'intel': [-121.960, 37.388], 'amd': [-121.987, 37.376],
  'wiz': [-73.985, 40.748], 'databricks': [-122.399, 37.776],
  // New major vendors
  'jacobs': [-96.797, 32.777], 'deloitte': [-73.985, 40.748],
  'kpmg': [-73.985, 40.748], 'booz allen': [-77.037, 38.907],
  'leidos': [-77.037, 38.907], 'saic': [-77.037, 38.907],
  'general dynamics': [-77.037, 38.907], 'bae systems': [-1.258, 52.254],
  'l3harris': [-80.604, 28.084], 'accenture': [-73.985, 40.748],
};

const INDUSTRY_HUBS: Record<string, [number, number]> = {
  'cybersecurity': [-77.037, 38.907], 'defense': [-77.037, 38.907],
  'ai': [-122.399, 37.776], 'semiconductor': [-121.960, 37.388],
  'energy': [-95.370, 29.760], 'biotech': [-71.059, 42.360],
  'fintech': [-73.985, 40.748], 'logistics': [-90.049, 35.149],
  'manufacturing': [-83.046, 42.332], 'aerospace': [-118.243, 34.052],
  'agriculture': [-93.621, 41.588], 'healthcare': [-86.158, 39.769],
  'general': [-98.500, 39.500],
};

function elPasoRelevance(text: string): number {
  const lower = text.toLowerCase();
  return Math.min(100, EP_KEYWORDS.filter(kw => lower.includes(kw)).length * 35);
}

export function signalToCoord(
  index: number, company?: string, industry?: string, epRelevance?: number,
): [number, number] {
  const scatter = (bLng: number, bLat: number, spread: number): [number, number] => {
    const angle = (index * 137.508) % 360;
    const radius = spread * 0.3 + (index % 7) * spread * 0.1;
    return [
      parseFloat((bLng + radius * Math.cos((angle * Math.PI) / 180)).toFixed(4)),
      parseFloat((bLat + radius * Math.sin((angle * Math.PI) / 180)).toFixed(4)),
    ];
  };

  if (epRelevance && epRelevance > 0) return scatter(EP_LNG, EP_LAT, 0.08);

  if (company) {
    const key = company.toLowerCase();
    for (const [name, coords] of Object.entries(COMPANY_COORDS)) {
      if (key.includes(name) || name.includes(key)) return scatter(coords[0], coords[1], 0.15);
    }
  }

  if (industry) {
    const key = industry.toLowerCase();
    for (const [name, coords] of Object.entries(INDUSTRY_HUBS)) {
      if (key.includes(name) || name.includes(key)) return scatter(coords[0], coords[1], 0.4);
    }
  }

  return scatter(-98.5, 39.5, 8);
}

function toSignalType(raw: string): SignalType {
  const valid: SignalType[] = [
    'merger_acquisition', 'funding_round', 'contract_award',
    'research_paper', 'patent_filing', 'facility_expansion',
    'regulatory_action', 'product_launch', 'hiring_signal', 'case_study',
  ];
  return valid.includes(raw as SignalType) ? (raw as SignalType) : 'research_paper';
}

function toPriority(imp: number): SignalPriority {
  if (imp >= 0.85) return 'critical';
  if (imp >= 0.65) return 'high';
  if (imp >= 0.40) return 'medium';
  return 'low';
}

function normalizeSignal(
  raw: { title?: string; signal_type?: string; industry?: string; company?: string | null;
    importance?: number; importance_score?: number; discovered_at?: string; url?: string; },
  index: number, sourceTag = 'intel-signals',
): IntelSignal {
  const importance = raw.importance ?? raw.importance_score ?? 0.5;
  const title = raw.title ?? 'Untitled Signal';
  const type = toSignalType(raw.signal_type ?? '');
  const epScore = elPasoRelevance(title + ' ' + (raw.industry ?? '') + ' ' + (raw.company ?? ''));

  return {
    id: `${sourceTag}-${index}-${Date.now()}`,
    type, priority: toPriority(importance), title, headline: title,
    industry: raw.industry ?? 'General',
    company: raw.company ?? undefined,
    importance, discoveredAt: raw.discovered_at ?? new Date().toISOString(),
    source: sourceTag, url: raw.url ?? '',
    coordinates: signalToCoord(index, raw.company ?? undefined, raw.industry ?? undefined, epScore),
    elPasoRelevance: epScore,
  };
}

function toSectorScores(raw: Record<string, number>): SectorScore[] {
  return Object.entries(raw).sort(([, a], [, b]) => b - a).slice(0, 12)
    .map(([industry, score]) => ({
      industry, score: Math.round(score),
      trend: score > 60 ? 'rising' as const : score < 30 ? 'falling' as const : 'stable' as const,
      signalCount: Math.round(score / 5),
    }));
}

// ─── Multi-source fetchers ─────────────────────────────────────────────────

async function fetchPatents(): Promise<IntelSignal[]> {
  try {
    const res = await fetch('/api/intel/patents');
    const json = await res.json();
    const patents = json?.data?.patents ?? [];
    return patents.map((p: { title: string; assignee: string; abstract: string; date: string; category: string }, i: number) =>
      normalizeSignal({
        title: p.title, signal_type: 'patent_filing',
        industry: p.category || 'technology', company: p.assignee,
        importance: 0.6, discovered_at: p.date,
      }, i + 500, 'patents')
    );
  } catch { return []; }
}

async function fetchResearch(): Promise<IntelSignal[]> {
  try {
    const res = await fetch('/api/intel/research');
    const json = await res.json();
    const papers = json?.data?.papers ?? [];
    return papers.map((p: { title: string; summary: string; published: string; link: string; category: string }, i: number) =>
      normalizeSignal({
        title: p.title, signal_type: 'research_paper',
        industry: p.category || 'research', importance: 0.55,
        discovered_at: p.published, url: p.link,
      }, i + 600, 'arxiv')
    );
  } catch { return []; }
}

async function fetchCyber(): Promise<IntelSignal[]> {
  try {
    const res = await fetch('/api/intel/cyber');
    const json = await res.json();
    const vulns = json?.data?.vulnerabilities ?? [];
    return vulns.slice(0, 10).map((v: { cveID: string; vendorProject: string; product: string; name: string; dateAdded: string; severity: string }, i: number) =>
      normalizeSignal({
        title: `${v.severity}: ${v.name} (${v.cveID})`,
        signal_type: 'regulatory_action', industry: 'cybersecurity',
        company: v.vendorProject,
        importance: v.severity === 'CRITICAL' ? 0.95 : v.severity === 'HIGH' ? 0.8 : 0.6,
        discovered_at: v.dateAdded,
      }, i + 700, 'cisa')
    );
  } catch { return []; }
}

async function fetchHackerNews(): Promise<IntelSignal[]> {
  try {
    const res = await fetch('/api/intel/hackernews');
    const json = await res.json();
    const stories = json?.data?.stories ?? [];
    return stories.slice(0, 10).map((s: { title: string; url: string; score: number; time: number }, i: number) =>
      normalizeSignal({
        title: s.title, signal_type: 'case_study',
        industry: 'technology', importance: Math.min(1, s.score / 500),
        discovered_at: new Date(s.time * 1000).toISOString(), url: s.url,
      }, i + 800, 'hackernews')
    );
  } catch { return []; }
}

async function fetchFederalJobs(): Promise<IntelSignal[]> {
  try {
    const res = await fetch('/api/intel/federal-jobs');
    const json = await res.json();
    const jobs = json?.data?.jobs ?? [];
    return jobs.slice(0, 10).map((j: { title: string; organization: string; location: string; url: string; openDate: string; salary: string }, i: number) =>
      normalizeSignal({
        title: `HIRING: ${j.title} — ${j.organization}`,
        signal_type: 'hiring_signal', industry: 'government',
        company: j.organization, importance: 0.5,
        discovered_at: j.openDate, url: j.url,
      }, i + 900, 'usajobs')
    );
  } catch { return []; }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type SignalsState = {
  signals: IntelSignal[];
  sectors: SectorScore[];
  signalsToday: number;
  signalsWeek: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

export function useSignals(): SignalsState {
  const [signals, setSignals]           = useState<IntelSignal[]>([]);
  const [sectors, setSectors]           = useState<SectorScore[]>([]);
  const [signalsToday, setSignalsToday] = useState(0);
  const [signalsWeek, setSignalsWeek]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    setError(null);
    try {
      // Fetch ALL sources in parallel
      const [signalRes, changedRes, patents, research, cyber, hn, jobs] = await Promise.allSettled([
        fetch('/api/intel-signals').then(r => r.json()),
        fetch('/api/what-changed').then(r => r.json()),
        fetchPatents(),
        fetchResearch(),
        fetchCyber(),
        fetchHackerNews(),
        fetchFederalJobs(),
      ]);

      let allSignals: IntelSignal[] = [];

      // Core intel signals
      if (signalRes.status === 'fulfilled') {
        const data = signalRes.value as { ok?: boolean; data?: IntelSignalsResponse } & IntelSignalsResponse;
        const payload: IntelSignalsResponse = data.data ?? data;
        const rawSignals = payload.signals ?? [];
        if (rawSignals.length > 0) {
          const seen = new Set<string>();
          const unique = rawSignals.filter(s => {
            const key = (s.title ?? '').slice(0, 60).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          allSignals = unique.map((s, i) => normalizeSignal(s, i));
        }

        const scoreMap = payload.sectorScores ?? payload.by_industry;
        if (scoreMap && Object.keys(scoreMap).length > 0) {
          setSectors(toSectorScores(scoreMap));
        }
      }

      // What changed
      if (changedRes.status === 'fulfilled') {
        const body = changedRes.value as Record<string, unknown>;
        setSignalsToday(typeof body.signals_today === 'number' ? body.signals_today : 0);
        setSignalsWeek(typeof body.signals_week === 'number' ? body.signals_week : 0);

        if (allSignals.length === 0) {
          const topSigs = body.top_signals as Array<Record<string, unknown>> | undefined;
          if (topSigs?.length) {
            allSignals = topSigs.map((s, i) => normalizeSignal(s as Parameters<typeof normalizeSignal>[0], i));
          }
        }
      }

      // Merge in all supplementary sources
      const extras: IntelSignal[] = [
        ...(patents.status === 'fulfilled' ? patents.value : []),
        ...(research.status === 'fulfilled' ? research.value : []),
        ...(cyber.status === 'fulfilled' ? cyber.value : []),
        ...(hn.status === 'fulfilled' ? hn.value : []),
        ...(jobs.status === 'fulfilled' ? jobs.value : []),
      ];

      // Dedup across all sources by title prefix
      const seen = new Set<string>();
      allSignals.forEach(s => seen.add(s.title.slice(0, 50).toLowerCase()));
      extras.forEach(s => {
        const key = s.title.slice(0, 50).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allSignals.push(s);
        }
      });

      // Sort: highest importance first
      allSignals.sort((a, b) => b.importance - a.importance);

      setSignals(allSignals);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetch_]);

  return { signals, sectors, signalsToday, signalsWeek, loading, error, lastUpdated, refresh: fetch_ };
}
