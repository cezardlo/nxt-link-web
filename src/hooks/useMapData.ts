'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LayerState } from './useMapLayers';
import type {
  FlightPoint,
  SeismicPoint,
  BorderCrossingPoint,
  CrimeHotspot,
  ContractPoint,
  SamBusinessPoint,
  DisruptionMapPoint,
} from '@/components/MapCanvas';
import type { CrimeFeedItem } from '@/components/CrimeNewsOverlay';
import type { PortWaitTime } from '@/app/api/live/border-wait/route';
import { ALL_DISRUPTIONS } from '@/lib/data/innovation-dashboard-data';
import { COUNTRY_TECH_MAP } from '@/lib/data/country-tech-map';

export type IntelSignalMapPoint = {
  id: string;
  lat: number;
  lon: number;
  title: string;
  signal_type: string;
  country_code: string;
  importance: number;
};

// ── API response shapes ────────────────────────────────────────────────────
type FlightApiResponse       = { ok: boolean; aircraft?: FlightPoint[] };
type SeismicApiResponse      = { ok: boolean; events?: SeismicPoint[] };
type BorderTradeApiResponse  = { ok: boolean; crossings?: BorderCrossingPoint[] };
type BorderWaitApiResponse   = { ok: boolean; ports?: PortWaitTime[] };
type FeedsApiResponse        = { all?: CrimeFeedItem[] };
type ContractsApiResponse    = { ok: boolean; awards?: Array<{ id: string; source: string; vendor: string; title: string; amount: number | null; agency: string; type: string }> };
type SamBusinessApiItem      = { uei: string; legalBusinessName: string; cageCode: string; naicsCodes: string[]; naicsDescriptions: string[]; primaryNaics: string; isSmallBusiness: boolean; website: string; address: { line1: string; city: string; state: string; zip: string } };
type SamBusinessesApiResponse = { ok: boolean; businesses?: SamBusinessApiItem[] };

// ── Static coordinate tables ───────────────────────────────────────────────

// NAICS prefix → El Paso sector coordinates for map placement
const NAICS_SECTOR_COORDS: Record<string, [number, number]> = {
  '33': [31.7400, -106.5120],  // Manufacturing — maquiladora zone
  '54': [31.7580, -106.4850],  // Professional/Tech — downtown
  '23': [31.7700, -106.4600],  // Construction — midtown
  '22': [31.7600, -106.4620],  // Utilities — near EPE
  '49': [31.7960, -106.3780],  // Transportation — airport area
  '62': [31.7650, -106.4990],  // Health Care — medical center
  '61': [31.7710, -106.5060],  // Education — UTEP area
  '56': [31.7550, -106.4780],  // Admin/Support — downtown
  '42': [31.7880, -106.3850],  // Wholesale Trade — industrial
  '48': [31.7960, -106.3780],  // Transportation — airport
  '33_def': [31.8090, -106.4150], // Defense mfg — Fort Bliss cluster
};
const DEFAULT_BIZ_COORD: [number, number] = [31.7587, -106.4869]; // Downtown

// El Paso neighborhood hotspots for crime activity mapping
const EP_HOTSPOTS = [
  { id: 'downtown',  name: 'DOWNTOWN',  lat: 31.7587, lon: -106.4869, keywords: ['downtown', 'central', 'mesa hills'] },
  { id: 'eastside',  name: 'EAST EP',   lat: 31.7800, lon: -106.3700, keywords: ['eastside', 'east el paso', 'montwood', 'pellicano'] },
  { id: 'westside',  name: 'WEST EP',   lat: 31.7700, lon: -106.5400, keywords: ['westside', 'west el paso', 'sunland park', 'kern'] },
  { id: 'northeast', name: 'NE EP',     lat: 31.8400, lon: -106.4200, keywords: ['northeast', 'fort bliss', 'bliss', 'military'] },
  { id: 'socorro',   name: 'SOCORRO',   lat: 31.6540, lon: -106.2900, keywords: ['socorro', 'san elizario', 'clint'] },
  { id: 'horizon',   name: 'HORIZON',   lat: 31.6900, lon: -106.1700, keywords: ['horizon city', 'horizon'] },
  { id: 'border',    name: 'BORDER',    lat: 31.7450, lon: -106.4850, keywords: ['border', 'port of entry', 'bridge', 'juarez', 'bota', 'ysleta'] },
  { id: 'midtown',   name: 'MIDTOWN',   lat: 31.7650, lon: -106.4600, keywords: ['midtown', 'near east', 'five points'] },
] as const;

// Disruption entity → geo coordinates
const DISRUPTION_COORDS: Record<string, [number, number]> = {
  'mit': [42.3601, -71.0942], 'stanford': [37.4275, -122.1697], 'berkeley': [37.8716, -122.2727],
  'darpa': [38.8816, -77.1064], 'dhs': [38.8951, -77.0364], 'congress': [38.8899, -77.0091],
  'openai': [37.7749, -122.4194], 'anthropic': [37.7849, -122.4094], 'meta': [37.4848, -122.1484],
  'google': [37.4220, -122.0841], 'microsoft': [47.6401, -122.1268], 'aws': [47.6062, -122.3321],
  'palantir': [39.7392, -104.9903], 'anduril': [33.6634, -117.9034],
  'fort bliss': [31.8100, -106.4150], 'cbp': [31.7508, -106.4850], 'utep': [31.7710, -106.5060],
  'el paso': [31.7587, -106.4869], 'lockheed': [38.9072, -77.0369], 'raytheon': [38.8816, -77.1064],
  'l3harris': [28.2417, -80.7322], 'boeing': [38.8048, -77.0469], 'northrop': [38.9531, -77.1488],
  'crowdstrike': [37.3861, -122.0839], 'palo alto': [37.3861, -122.0839],
  'default': [37.0902, -95.7129],
};

// SAM agency → El Paso coordinates
const AGENCY_COORDS: Record<string, [number, number]> = {
  'Department of the Army': [31.8100, -106.4150],
  'Department of Defense': [31.8050, -106.4100],
  'Customs and Border Protection': [31.7508, -106.4850],
  'Department of Homeland Security': [31.7520, -106.4820],
  'Department of the Air Force': [31.8150, -106.4200],
  'Department of Energy': [31.7602, -106.4622],
  'Department of Health': [31.7632, -106.4992],
};
const DEFAULT_CONTRACT_COORD: [number, number] = [31.7587, -106.4869];

// ── Public return type ─────────────────────────────────────────────────────
export interface UseMapDataReturn {
  flights: FlightPoint[];
  seismicEvents: SeismicPoint[];
  borderCrossings: BorderCrossingPoint[];
  borderWaitTimes: PortWaitTime[];
  crimeArticles: CrimeFeedItem[];
  crimeHotspots: CrimeHotspot[];
  contracts: ContractPoint[];
  samBusinesses: SamBusinessPoint[];
  disruptionPoints: DisruptionMapPoint[];
  countrySignalCounts: Record<string, number>;
  intelSignalPoints: IntelSignalMapPoint[];
  dataFreshness: Record<string, number>;
  fetchErrors: Record<string, boolean>;
}

export function useMapData(layers: LayerState): UseMapDataReturn {
  const [flights, setFlights] = useState<FlightPoint[]>([]);
  const [seismicEvents, setSeismicEvents] = useState<SeismicPoint[]>([]);
  const [borderCrossings, setBorderCrossings] = useState<BorderCrossingPoint[]>([]);
  const [borderWaitTimes, setBorderWaitTimes] = useState<PortWaitTime[]>([]);
  const [crimeArticles, setCrimeArticles] = useState<CrimeFeedItem[]>([]);
  const [crimeHotspots, setCrimeHotspots] = useState<CrimeHotspot[]>([]);
  const [contracts, setContracts] = useState<ContractPoint[]>([]);
  const [samBusinesses, setSamBusinesses] = useState<SamBusinessPoint[]>([]);
  const [countrySignalCounts, setCountrySignalCounts] = useState<Record<string, number>>({});
  const [intelSignalPoints, setIntelSignalPoints] = useState<IntelSignalMapPoint[]>([]);
  const [dataFreshness, setDataFreshness] = useState<Record<string, number>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, boolean>>({});

  const markFresh = useCallback((key: string) => {
    setDataFreshness((prev) => ({ ...prev, [key]: Date.now() }));
    setFetchErrors((prev) => ({ ...prev, [key]: false }));
  }, []);

  const markError = useCallback((key: string) => {
    setFetchErrors((prev) => ({ ...prev, [key]: true }));
  }, []);

  // ── Disruption points (static, from innovation data) ──────────────────
  const disruptionPoints = useMemo<DisruptionMapPoint[]>(() => {
    return ALL_DISRUPTIONS.map((d) => {
      const lower = (d.companies[0] ?? d.title).toLowerCase();
      let coords = DISRUPTION_COORDS['default'];
      for (const [key, c] of Object.entries(DISRUPTION_COORDS)) {
        if (key !== 'default' && lower.includes(key)) { coords = c; break; }
      }
      const jitter = () => (Math.random() - 0.5) * 0.08;
      return {
        id: d.id,
        title: d.title,
        lat: coords[0] + jitter(),
        lon: coords[1] + jitter(),
        category: d.category,
        impact: d.impact,
        date: d.date,
        companies: d.companies,
      };
    });
  }, []);

  // — Live flights: poll every 30s when either flights or military layer active —
  useEffect(() => {
    if (!layers.flights && !layers.military) { setFlights([]); return; }
    const fetchFlights = () => {
      fetch('/api/live/flights')
        .then((r) => r.json())
        .then((data: FlightApiResponse) => { if (data.aircraft) { setFlights(data.aircraft); markFresh('flights'); } })
        .catch(() => { markError('flights'); });
    };
    fetchFlights();
    const id = setInterval(fetchFlights, 30_000);
    return () => clearInterval(id);
  }, [layers.flights, layers.military, markFresh, markError]);

  // — Seismic: fetch once when layer toggled on —
  useEffect(() => {
    if (!layers.seismic) { setSeismicEvents([]); return; }
    fetch('/api/live/seismic')
      .then((r) => r.json())
      .then((data: SeismicApiResponse) => { if (data.events) { setSeismicEvents(data.events); markFresh('seismic'); } })
      .catch(() => { markError('seismic'); });
  }, [layers.seismic, markFresh, markError]);

  // — Border Trade + Wait Times: fetch both when layer toggled on —
  useEffect(() => {
    if (!layers.borderTrade) {
      setBorderCrossings([]);
      setBorderWaitTimes([]);
      return;
    }
    fetch('/api/live/border-trade')
      .then((r) => r.json())
      .then((data: BorderTradeApiResponse) => { if (data.crossings) { setBorderCrossings(data.crossings); markFresh('borderTrade'); } })
      .catch(() => { markError('borderTrade'); });
    fetch('/api/live/border-wait')
      .then((r) => r.json())
      .then((data: BorderWaitApiResponse) => { if (data.ports) { setBorderWaitTimes(data.ports); markFresh('borderWait'); } })
      .catch(() => { markError('borderWait'); });
  }, [layers.borderTrade, markFresh, markError]);

  // — Crime news: fetch feed, filter Crime articles, compute hotspot activity —
  useEffect(() => {
    if (!layers.crimeNews) { setCrimeArticles([]); setCrimeHotspots([]); return; }
    fetch('/api/feeds')
      .then((r) => r.json())
      .then((data: FeedsApiResponse) => {
        const articles = (data.all ?? []).filter((a) => a.category === 'Crime');
        setCrimeArticles(articles);
        const hotspots = EP_HOTSPOTS
          .map((h) => {
            const count = articles.filter((a) =>
              h.keywords.some((kw) => a.title.toLowerCase().includes(kw)),
            ).length;
            const activityLevel = count >= 5 ? 'high' : count >= 2 ? 'moderate' : 'low';
            return { id: h.id, name: h.name, lat: h.lat, lon: h.lon, activityLevel, articleCount: count } as CrimeHotspot;
          })
          .filter((h) => h.articleCount > 0);
        setCrimeHotspots(hotspots);
        markFresh('crimeNews');
      })
      .catch(() => { markError('crimeNews'); });
  }, [layers.crimeNews, markFresh, markError]);

  // — SAM Contracts: fetch when samContracts layer toggled on —
  useEffect(() => {
    if (!layers.samContracts) { setContracts([]); return; }

    fetch('/api/live/contracts')
      .then((r) => r.json())
      .then((data: ContractsApiResponse) => {
        if (!data.awards) return;
        const pts: ContractPoint[] = data.awards.map((a) => {
          const agencyKey = Object.keys(AGENCY_COORDS).find((k) => a.agency.includes(k));
          const base = agencyKey ? AGENCY_COORDS[agencyKey] : DEFAULT_CONTRACT_COORD;
          let hash = 0;
          for (let i = 0; i < a.id.length; i++) hash = ((hash << 5) - hash + a.id.charCodeAt(i)) | 0;
          const jitterLat = ((hash & 0xff) / 255 - 0.5) * 0.006;
          const jitterLon = (((hash >> 8) & 0xff) / 255 - 0.5) * 0.006;
          return {
            id: a.id,
            source: a.source as ContractPoint['source'],
            vendor: a.vendor,
            title: a.title,
            amount: a.amount,
            agency: a.agency,
            type: a.type as ContractPoint['type'],
            lat: base[0] + jitterLat,
            lon: base[1] + jitterLon,
          };
        });
        setContracts(pts);
        markFresh('samContracts');
      })
      .catch(() => { markError('samContracts'); });
  }, [layers.samContracts, markFresh, markError]);

  // — SAM Businesses: fetch + cross-ref contracts, auto-refresh every 10 min —
  useEffect(() => {
    if (!layers.samBusinesses) { setSamBusinesses([]); return; }

    const fetchSamBiz = () => {
      Promise.all([
        fetch('/api/sam/businesses').then((r) => r.json()) as Promise<SamBusinessesApiResponse>,
        fetch('/api/live/contracts').then((r) => r.json()).catch(() => ({ ok: false })) as Promise<ContractsApiResponse>,
      ])
        .then(([bizData, contractData]) => {
          if (!bizData.businesses) return;

          const contractVendors = new Map<string, { title: string; amount: number | null }>();
          const researchVendors = new Map<string, { title: string }>();

          for (const award of contractData.awards ?? []) {
            const vLower = award.vendor.toLowerCase();
            const isResearch = award.type.toLowerCase().includes('sbir') || award.type.toLowerCase().includes('grant');
            if (isResearch) {
              researchVendors.set(vLower, { title: award.title });
            } else {
              contractVendors.set(vLower, { title: award.title, amount: award.amount });
            }
          }

          const pts: SamBusinessPoint[] = bizData.businesses.map((b) => {
            const prefix2 = b.primaryNaics.slice(0, 2);
            const isDefense = ['334511', '334220', '336414', '336411', '336413'].includes(b.primaryNaics);
            const base = isDefense
              ? NAICS_SECTOR_COORDS['33_def']
              : NAICS_SECTOR_COORDS[prefix2] ?? DEFAULT_BIZ_COORD;
            let hash = 0;
            for (let i = 0; i < b.uei.length; i++) hash = ((hash << 5) - hash + b.uei.charCodeAt(i)) | 0;
            const jLat = ((hash & 0xff) / 255 - 0.5) * 0.008;
            const jLon = (((hash >> 8) & 0xff) / 255 - 0.5) * 0.008;

            const bizLower = b.legalBusinessName.toLowerCase();
            let activity: SamBusinessPoint['activity'] = 'none';
            let activityLabel: string | undefined;

            for (const [vendor, info] of Array.from(contractVendors.entries() as Iterable<[string, { title: string; amount: number | null }]>)) {
              if (bizLower.includes(vendor) || vendor.includes(bizLower)) {
                activity = 'contract';
                activityLabel = info.amount
                  ? `$${(info.amount / 1e6).toFixed(1)}M · ${info.title.slice(0, 40)}`
                  : info.title.slice(0, 50);
                break;
              }
            }

            if (activity === 'none') {
              for (const [vendor, info] of Array.from(researchVendors.entries() as Iterable<[string, { title: string }]>)) {
                if (bizLower.includes(vendor) || vendor.includes(bizLower)) {
                  activity = 'research';
                  activityLabel = info.title.slice(0, 50);
                  break;
                }
              }
            }

            return {
              id: b.uei,
              name: b.legalBusinessName,
              cageCode: b.cageCode,
              naicsCodes: b.naicsCodes,
              primaryNaics: b.primaryNaics,
              naicsDescription: b.naicsDescriptions[0] ?? '',
              isSmallBusiness: b.isSmallBusiness,
              website: b.website,
              address: `${b.address.line1}, ${b.address.city}, ${b.address.state} ${b.address.zip}`,
              lat: base[0] + jLat,
              lon: base[1] + jLon,
              activity,
              activityLabel,
            };
          });
          setSamBusinesses(pts);
          markFresh('samBusinesses');
        })
        .catch(() => { markError('samBusinesses'); });
    };

    fetchSamBiz();
    const id = setInterval(fetchSamBiz, 600_000); // 10-min auto-refresh
    return () => clearInterval(id);
  }, [layers.samBusinesses, markFresh, markError]);

  // ── Country signal heat map — maps intel signals to ISO country codes ──────
  // Entity name → ISO country code mapping for major global companies
  const ENTITY_COUNTRY_MAP: Record<string, string> = {
    // US
    'lockheed martin': 'US', 'raytheon': 'US', 'boeing': 'US', 'northrop grumman': 'US',
    'general dynamics': 'US', 'l3harris': 'US', 'anduril': 'US', 'shield ai': 'US',
    'palantir': 'US', 'crowdstrike': 'US', 'palo alto networks': 'US', 'nvidia': 'US',
    'intel': 'US', 'amd': 'US', 'qualcomm': 'US', 'spacex': 'US', 'google': 'US',
    'microsoft': 'US', 'amazon': 'US', 'apple': 'US', 'meta': 'US', 'openai': 'US',
    'anthropic': 'US', 'boston dynamics': 'US', 'skydio': 'US', 'scale ai': 'US',
    'c3.ai': 'US', 'leidos': 'US', 'saic': 'US', 'booz allen': 'US', 'caci': 'US',
    // Germany
    'siemens': 'DE', 'bosch': 'DE', 'sap': 'DE', 'kuka': 'DE', 'rheinmetall': 'DE',
    'diehl': 'DE', 'hensoldt': 'DE', 'thyssenkrupp': 'DE', 'airbus': 'DE',
    // Israel
    'elbit': 'IL', 'rafael': 'IL', 'iai': 'IL', 'cyberark': 'IL', 'check point': 'IL',
    'wiz': 'IL', 'cellebrite': 'IL', 'checkpoint': 'IL',
    // Japan
    'keyence': 'JP', 'fanuc': 'JP', 'yaskawa': 'JP', 'honda': 'JP', 'sony': 'JP',
    'mitsubishi': 'JP', 'kawasaki': 'JP', 'nec': 'JP', 'fujitsu': 'JP',
    // South Korea
    'samsung': 'KR', 'sk hynix': 'KR', 'hanwha': 'KR', 'hyundai': 'KR', 'lg': 'KR',
    // China
    'dji': 'CN', 'huawei': 'CN', 'hikvision': 'CN', 'sensetime': 'CN', 'baidu': 'CN',
    'alibaba': 'CN', 'tencent': 'CN',
    // Taiwan
    'tsmc': 'TW', 'foxconn': 'TW', 'mediatek': 'TW', 'asus': 'TW',
    // Netherlands
    'asml': 'NL', 'philips': 'NL', 'nxp': 'NL',
    // UK
    'bae systems': 'GB', 'rolls-royce': 'GB', 'arm': 'GB', 'qinetiq': 'GB', 'darktrace': 'GB',
    // France
    'thales': 'FR', 'safran': 'FR', 'dassault': 'FR', 'mbda': 'FR',
    // Sweden / Switzerland
    'saab': 'SE', 'saab ab': 'SE', 'ericsson': 'SE', 'volvo': 'SE',
    'abb': 'CH',
    // Italy
    'leonardo': 'IT', 'finmeccanica': 'IT', 'agustawestland': 'IT',
    // Spain
    'indra': 'ES', 'navantia': 'ES',
    // Poland
    'pge': 'PL', 'pzl': 'PL',
    // Australia
    'asx': 'AU', 'bae systems australia': 'AU', 'austal': 'AU',
    // India
    'tata': 'IN', 'infosys': 'IN', 'wipro': 'IN', 'hindustan aeronautics': 'IN',
    'hal': 'IN', 'drdo': 'IN', 'mahindra defence': 'IN',
    // Brazil
    'embraer': 'BR', 'embraer defense': 'BR',
    // UAE
    'edge group': 'AE', 'calidus': 'AE',
    // Norway
    'kongsberg': 'NO', 'nammo': 'NO',
    // Canada
    'cae': 'CA', 'magellan aerospace': 'CA', 'l3 mps': 'CA',
    // Singapore
    'st engineering': 'SG', 'dsta': 'SG',
    // Turkey
    'baykar': 'TR', 'aselsan': 'TR', 'tusas': 'TR', 'roketsan': 'TR',
    // Finland
    'nokia': 'FI', 'patria': 'FI',
    // Czech Republic
    'tatra': 'CZ',
  };

  useEffect(() => {
    async function fetchCountrySignals() {
      try {
        // Always fetch intel signals (needed for signal dots layer)
        const res = await fetch('/api/intel-signals');
        if (!res.ok) return;
        const data = await res.json() as {
          signals?: Array<{ company?: string; title?: string; signal_type?: string; importance?: number }>;
        };
        const signals = data.signals ?? [];

        // Build country → coordinate lookup
        const countryCoords: Record<string, [number, number]> = {};
        for (const c of COUNTRY_TECH_MAP) countryCoords[c.code] = [c.lat, c.lon];

        // Map signals to countries + build signal map points
        const counts: Record<string, number> = {};
        const sigPoints: IntelSignalMapPoint[] = [];

        signals.forEach((sig, idx) => {
          const text = ((sig.company ?? '') + ' ' + (sig.title ?? '')).toLowerCase();
          let code: string | null = null;
          for (const [entity, iso] of Object.entries(ENTITY_COUNTRY_MAP)) {
            if (text.includes(entity)) { code = iso; break; }
          }
          if (!code) return;
          counts[code] = (counts[code] ?? 0) + 1;

          const base = countryCoords[code];
          if (!base) return;
          // Deterministic jitter from index
          const seed = idx * 2654435761;
          const jLat = (((seed & 0xff) / 255) - 0.5) * 10;
          const jLon = ((((seed >> 8) & 0xff) / 255) - 0.5) * 14;
          sigPoints.push({
            id: `sig-${idx}`,
            lat: base[0] + jLat,
            lon: base[1] + jLon,
            title: sig.title ?? '',
            signal_type: sig.signal_type ?? 'general',
            country_code: code,
            importance: sig.importance ?? 0.5,
          });
        });

        setIntelSignalPoints(sigPoints);

        // Country heat: prefer dedicated endpoint, fallback to derived counts
        const caRes = await fetch('/api/country-activity');
        if (caRes.ok) {
          const caData = await caRes.json() as { ok: boolean; counts?: Record<string, number> };
          if (caData.ok && caData.counts && Object.keys(caData.counts).length > 0) {
            setCountrySignalCounts(caData.counts);
            return;
          }
        }
        if (Object.keys(counts).length > 0) setCountrySignalCounts(counts);
      } catch { /* silent */ }
    }
    void fetchCountrySignals();
    const id = setInterval(fetchCountrySignals, 300_000); // refresh every 5 min
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    flights,
    seismicEvents,
    borderCrossings,
    borderWaitTimes,
    crimeArticles,
    crimeHotspots,
    contracts,
    samBusinesses,
    disruptionPoints,
    countrySignalCounts,
    intelSignalPoints,
    dataFreshness,
    fetchErrors,
  };
}
