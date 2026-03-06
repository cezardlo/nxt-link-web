'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SignalFinding, SectorScore } from '@/lib/intelligence/signal-engine';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import type { ConferenceCluster } from '@/lib/utils/conference-clusters';

import { FeedBar } from '@/components/FeedBar';
import { MapCanvas } from '@/components/MapCanvas';
import type { FlyToTarget, FlightPoint, MapPoint, SeismicPoint, BorderCrossingPoint, CrimeHotspot, ContractPoint, SamBusinessPoint, DisruptionMapPoint } from '@/components/MapCanvas';
import { ALL_DISRUPTIONS } from '@/lib/data/innovation-dashboard-data';
import type { FilterMode } from '@/components/MapFilterPanel';
import { MapFilterPanel } from '@/components/MapFilterPanel';
import { MapLayerPanel } from '@/components/MapLayerPanel';
import { RightPanel } from '@/components/right-panel/RightPanel';
import type { SelectedPoint } from '@/components/right-panel/RightPanel';
import { MapTopBar } from '@/components/MapTopBar';
import { CmdK } from '@/components/CmdK';
import { BorderCameraOverlay } from '@/components/BorderCameraOverlay';
import { CrimeNewsOverlay } from '@/components/CrimeNewsOverlay';
import type { CrimeFeedItem } from '@/components/CrimeNewsOverlay';
import { LiveTVOverlay } from '@/components/LiveTVOverlay';
import type { PortWaitTime } from '@/app/api/live/border-wait/route';

// TimeRange is in HOURS: 1=1H, 24=24H, 168=7D, 720=30D, 2160=90D, 4320=180D
export type TimeRange = 1 | 24 | 168 | 720 | 2160 | 4320;
export type Mode = 'operator' | 'executive';

export interface LayerState {
  // Global intelligence layers
  globalHubs: boolean;
  conferences: boolean;
  // Vendor layers
  vendors: boolean;
  samBusinesses: boolean;
  products: boolean;
  funding: boolean;
  patents: boolean;
  hiring: boolean;
  news: boolean;
  ikerScores: boolean;
  ikerRisk: boolean;
  momentum: boolean;
  adoption: boolean;
  // Live real-time data layers
  flights:     boolean;
  military:    boolean;
  seismic:     boolean;
  borderTrade: boolean;
  crimeNews:    boolean;
  disruptions:  boolean;
  samContracts: boolean;
  liveTV:       boolean;
}

const DEFAULT_LAYERS: LayerState = {
  globalHubs:    true,
  conferences:   false,
  vendors:       true,
  samBusinesses: false,
  products:      true,
  funding:       false,
  patents:   false,
  hiring:    false,
  news:      false,
  ikerScores: true,
  ikerRisk:  false,
  momentum:  true,
  adoption:  false,
  flights:     false,
  military:    false,
  seismic:     false,
  borderTrade: false,
  crimeNews:    false,
  disruptions:  false,
  samContracts: false,
  liveTV:       false,
};

// CSS filter class + overlay per visual mode
const FILTER_CONFIG: Record<FilterMode, { mapClass: string; overlayClass: string }> = {
  STANDARD: { mapClass: '',           overlayClass: '' },
  CRT:      { mapClass: 'filter-crt', overlayClass: 'scanlines' },
  NVG:      { mapClass: 'filter-nvg', overlayClass: 'nvg-vignette' },
  FLIR:     { mapClass: 'filter-flir', overlayClass: 'flir-vignette' },
};

type FlightApiResponse       = { ok: boolean; aircraft?: FlightPoint[] };
type SeismicApiResponse      = { ok: boolean; events?: SeismicPoint[] };
type BorderTradeApiResponse  = { ok: boolean; crossings?: BorderCrossingPoint[] };
type BorderWaitApiResponse   = { ok: boolean; ports?: PortWaitTime[] };
type FeedsApiResponse        = { all?: CrimeFeedItem[] };
type ContractsApiResponse    = { ok: boolean; awards?: Array<{ id: string; source: string; vendor: string; title: string; amount: number | null; agency: string; type: string }> };
type SamBusinessApiItem      = { uei: string; legalBusinessName: string; cageCode: string; naicsCodes: string[]; naicsDescriptions: string[]; primaryNaics: string; isSmallBusiness: boolean; website: string; address: { line1: string; city: string; state: string; zip: string } };
type SamBusinessesApiResponse = { ok: boolean; businesses?: SamBusinessApiItem[] };

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

export default function MapPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>(168);
  const [mode, setMode] = useState<Mode>('operator');
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [filterMode, setFilterMode] = useState<FilterMode>('STANDARD');
  // Mobile panel drawer state
  const [mobileLayerOpen, setMobileLayerOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedConference, setSelectedConference] = useState<ConferenceRecord | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ConferenceCluster | null>(null);
  const [missionBriefing, setMissionBriefing] = useState<Record<string, unknown> | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [flyTo, setFlyTo] = useState<FlyToTarget | undefined>(undefined);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [flights, setFlights] = useState<FlightPoint[]>([]);
  const [seismicEvents, setSeismicEvents] = useState<SeismicPoint[]>([]);
  const [borderCrossings, setBorderCrossings] = useState<BorderCrossingPoint[]>([]);
  const [borderWaitTimes, setBorderWaitTimes] = useState<PortWaitTime[]>([]);
  const [crimeArticles, setCrimeArticles] = useState<CrimeFeedItem[]>([]);
  const [crimeHotspots, setCrimeHotspots] = useState<CrimeHotspot[]>([]);
  const [contracts, setContracts] = useState<ContractPoint[]>([]);
  const [samBusinesses, setSamBusinesses] = useState<SamBusinessPoint[]>([]);
  const urlInitialized = useRef(false);
  const [initialViewState, setInitialViewState] = useState<
    { longitude: number; latitude: number; zoom: number } | undefined
  >(undefined);
  const [dataFreshness, setDataFreshness] = useState<Record<string, number>>({});
  // Per-source error flags — set true when a fetch fails, cleared on next success
  const [fetchErrors, setFetchErrors] = useState<Record<string, boolean>>({});
  const [, setIntelSignals] = useState<SignalFinding[]>([]);
  const [sectorScores, setSectorScores] = useState<SectorScore[]>([]);
  const [activeVendorIds, setActiveVendorIds] = useState<string[]>([]);

  // ── Disruption points (static, from innovation data) ──────────────────
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

  const disruptionPoints = useMemo<DisruptionMapPoint[]>(() => {
    return ALL_DISRUPTIONS.map((d) => {
      const lower = (d.companies[0] ?? d.title).toLowerCase();
      let coords = DISRUPTION_COORDS['default'];
      for (const [key, c] of Object.entries(DISRUPTION_COORDS)) {
        if (key !== 'default' && lower.includes(key)) { coords = c; break; }
      }
      // Jitter slightly to avoid exact overlap
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

  const markFresh = useCallback((key: string) => {
    setDataFreshness((prev) => ({ ...prev, [key]: Date.now() }));
    setFetchErrors((prev) => ({ ...prev, [key]: false }));
  }, []);

  const markError = useCallback((key: string) => {
    setFetchErrors((prev) => ({ ...prev, [key]: true }));
  }, []);

  // — URL state: read on mount —
  useEffect(() => {
    if (urlInitialized.current) return;
    urlInitialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const tr = Number(params.get('tr'));
    const validTr: TimeRange[] = [1, 24, 168, 720, 2160, 4320];
    if (validTr.includes(tr as TimeRange)) setTimeRange(tr as TimeRange);
    const lat = parseFloat(params.get('lat') ?? '');
    const lon = parseFloat(params.get('lon') ?? '');
    const zoom = parseFloat(params.get('z') ?? '');
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
      setInitialViewState({ latitude: lat, longitude: lon, zoom });
    }
    const rawLayers = params.get('layers');
    if (rawLayers) {
      const keys = rawLayers.split(',');
      setLayers(() => {
        const next = { ...DEFAULT_LAYERS };
        (Object.keys(next) as (keyof LayerState)[]).forEach((k) => { next[k] = false; });
        keys.forEach((k) => {
          if (k in next) next[k as keyof LayerState] = true;
        });
        return next;
      });
    }
  }, []);

  // — URL state: write on change —
  useEffect(() => {
    if (!urlInitialized.current) return;
    const activeLayers = Object.entries(layers).filter(([, v]) => v).map(([k]) => k);
    const params = new URLSearchParams();
    params.set('tr', String(timeRange));
    params.set('layers', activeLayers.join(','));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [timeRange, layers]);

  // — Global ⌘K / Ctrl+K shortcut —
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setCmdkOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // — Live flights: poll every 30s when either flights or military layer active —
  useEffect(() => {
    if (!layers.flights && !layers.military) { setFlights([]); return; }
    const fetchFlights = () => {
      fetch('/api/live/flights')
        .then((r) => r.json())
        .then((data: FlightApiResponse) => { if (data.aircraft) { setFlights(data.aircraft); markFresh('flights'); } })
        .catch((err: unknown) => { console.error('[flights]', err); markError('flights'); });
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
      .catch((err: unknown) => { console.error('[seismic]', err); markError('seismic'); });
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
      .catch((err: unknown) => { console.error('[border-trade]', err); markError('borderTrade'); });
    fetch('/api/live/border-wait')
      .then((r) => r.json())
      .then((data: BorderWaitApiResponse) => { if (data.ports) { setBorderWaitTimes(data.ports); markFresh('borderWait'); } })
      .catch((err: unknown) => { console.error('[border-wait]', err); markError('borderWait'); });
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
      .catch((err: unknown) => { console.error('[crime-news]', err); markError('crimeNews'); });
  }, [layers.crimeNews, markFresh, markError]);

  // — SAM Contracts: fetch when samContracts layer toggled on —
  useEffect(() => {
    if (!layers.samContracts) { setContracts([]); return; }

    // Map agency names to El Paso-area coordinates
    const AGENCY_COORDS: Record<string, [number, number]> = {
      'Department of the Army': [31.8100, -106.4150],
      'Department of Defense': [31.8050, -106.4100],
      'Customs and Border Protection': [31.7508, -106.4850],
      'Department of Homeland Security': [31.7520, -106.4820],
      'Department of the Air Force': [31.8150, -106.4200],
      'Department of Energy': [31.7602, -106.4622],
      'Department of Health': [31.7632, -106.4992],
    };
    const DEFAULT_COORD: [number, number] = [31.7587, -106.4869];

    fetch('/api/live/contracts')
      .then((r) => r.json())
      .then((data: ContractsApiResponse) => {
        if (!data.awards) return;
        const pts: ContractPoint[] = data.awards.map((a) => {
          // Find matching agency coordinate with small jitter
          const agencyKey = Object.keys(AGENCY_COORDS).find((k) => a.agency.includes(k));
          const base = agencyKey ? AGENCY_COORDS[agencyKey] : DEFAULT_COORD;
          // Deterministic jitter from id hash
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
      .catch((err: unknown) => { console.error('[sam-contracts]', err); markError('samContracts'); });
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

          // Build vendor lookup maps from contract awards
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
            // Place by NAICS sector with jitter
            const prefix2 = b.primaryNaics.slice(0, 2);
            const isDefense = ['334511', '334220', '336414', '336411', '336413'].includes(b.primaryNaics);
            const base = isDefense
              ? NAICS_SECTOR_COORDS['33_def']
              : NAICS_SECTOR_COORDS[prefix2] ?? DEFAULT_BIZ_COORD;
            let hash = 0;
            for (let i = 0; i < b.uei.length; i++) hash = ((hash << 5) - hash + b.uei.charCodeAt(i)) | 0;
            const jLat = ((hash & 0xff) / 255 - 0.5) * 0.008;
            const jLon = (((hash >> 8) & 0xff) / 255 - 0.5) * 0.008;

            // Cross-reference with contracts — fuzzy match (includes both directions)
            const bizLower = b.legalBusinessName.toLowerCase();
            let activity: SamBusinessPoint['activity'] = 'none';
            let activityLabel: string | undefined;

            // Check contract awards first (higher priority)
            for (const [vendor, info] of Array.from(contractVendors.entries() as Iterable<[string, { title: string; amount: number | null }]>)) {
              if (bizLower.includes(vendor) || vendor.includes(bizLower)) {
                activity = 'contract';
                activityLabel = info.amount
                  ? `$${(info.amount / 1e6).toFixed(1)}M · ${info.title.slice(0, 40)}`
                  : info.title.slice(0, 50);
                break;
              }
            }

            // Check research/SBIR if no contract match
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
        .catch((err: unknown) => { console.error('[sam-businesses]', err); markError('samBusinesses'); });
    };

    fetchSamBiz();
    const id = setInterval(fetchSamBiz, 600_000); // 10-min auto-refresh
    return () => clearInterval(id);
  }, [layers.samBusinesses, markFresh, markError]);

  const handleViewStateChange = useCallback((vs: { longitude: number; latitude: number; zoom: number }) => {
    const params = new URLSearchParams(window.location.search);
    params.set('lat', String(vs.latitude));
    params.set('lon', String(vs.longitude));
    params.set('z', String(vs.zoom));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const toggleLayer = useCallback((key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleLayerPreset = useCallback((presetLayers: string[]) => {
    setLayers((prev) => {
      const next = { ...prev };
      (Object.keys(next) as (keyof LayerState)[]).forEach((k) => { next[k] = false; });
      presetLayers.forEach((l) => {
        if (l in next) next[l as keyof LayerState] = true;
      });
      return next;
    });
  }, []);

  const handleSignalsLoaded = useCallback(
    (signals: SignalFinding[], scores: SectorScore[], vendorIds: string[]) => {
      setIntelSignals(signals);
      setSectorScores(scores);
      setActiveVendorIds(vendorIds);
    },
    [],
  );

  // Convert LayerState booleans → Set<string> for MapCanvas
  const activeLayers = useMemo(() => new Set(
    Object.entries(layers)
      .filter(([, v]) => v)
      .map(([k]) => {
        const keyMap: Record<string, string> = {
          ikerScores: 'health',
          ikerRisk:   'risk',
          adoption:   'adoption',
        };
        return keyMap[k] ?? k;
      }),
  ), [layers]);

  const handleVendorSelect = useCallback((point: MapPoint | null) => {
    if (!point) { setSelectedPoint(null); return; }
    setSelectedPoint({
      id: point.id,
      label: point.label,
      category: point.category,
      entity_id: point.entity_id,
      layer: point.layer,
    });
  }, []);

  const fetchBriefing = useCallback(async (text: string) => {
    setBriefingLoading(true);
    try {
      const res = await fetch('/api/intel/api/mission/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_text: text, timeRange, layers: Array.from(activeLayers) }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json() as Record<string, unknown>;
      // Validate the response has the expected shape before setting
      if (
        Array.isArray(data.movement) ||
        Array.isArray(data.risk) ||
        Array.isArray(data.opportunity) ||
        typeof data.briefing === 'string'
      ) {
        setMissionBriefing(data);
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch {
      setMissionBriefing({
        briefing: "El Paso technology corridor spans defense (Fort Bliss), border technology, logistics, energy, and health tech. The region hosts 19+ active technology vendors with $600M+ annual DoD procurement. Nearshoring acceleration is driving sustained border tech momentum through 2026.",
        movement: [
          'Fort Bliss defense corridor adding new vendor support contracts in Q1 2026',
          'Border tech sector at 5-year high as nearshoring volumes accelerate',
          'UTEP AI Research Lab NSF grant opens university-to-DoD technology transfer pipeline',
        ],
        risk: [
          'Workforce availability constraining scaling of defense IT vendors in El Paso corridor',
          'Cross-border logistics disruption risk elevated — CBP staffing gaps at Bridge of Americas',
        ],
        opportunity: [
          'El Paso MSA identified as Tier 1 DoD technology hub by Army Futures Command',
          'USMCA compliance technology gap creates $120M+ addressable market',
          'Medical Center district EHR modernization generating $40M in procurement opportunities',
        ],
        _provider: 'static',
      });
    } finally {
      setBriefingLoading(false);
    }
  }, [timeRange, activeLayers]);

  const handleMissionSubmit = useCallback((text: string) => {
    void fetchBriefing(text);
  }, [fetchBriefing]);

  // Auto-load default El Paso briefing on first mount
  useEffect(() => {
    void fetchBriefing('El Paso technology landscape defense border logistics');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { mapClass, overlayClass } = FILTER_CONFIG[filterMode];

  // Derive data status for the freshness indicator
  // Critical sources: flights, borderTrade — amber if any non-critical source fails
  const criticalKeys = ['flights', 'borderTrade', 'borderWait'];
  const criticalFailed = criticalKeys.some((k) => fetchErrors[k]);
  const anyFailed = Object.values(fetchErrors).some(Boolean);
  const dataStatusColor = criticalFailed ? '#ff3b30' : anyFailed ? '#ffb800' : '#00ff88';
  const dataStatusLabel = criticalFailed ? 'DATA: ERR' : anyFailed ? 'DATA: PARTIAL' : 'DATA: OK';
  const hasAnyFreshness = Object.keys(dataFreshness).length > 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* TOP BAR */}
      <MapTopBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onMissionSubmit={handleMissionSubmit}
        loading={briefingLoading}
        activeLayerCount={activeLayers.size}
        pointCount={pointCount}
        mode={mode}
        onModeChange={setMode}
        onFlyTo={setFlyTo}
        onCmdK={() => setCmdkOpen(true)}
        onSignalsLoaded={handleSignalsLoaded}
        onMobileLayerToggle={() => setMobileLayerOpen((v) => !v)}
        onMobileRightToggle={() => setMobileRightOpen((v) => !v)}
      />

      {/* MAIN AREA — 3-column on desktop, full-screen map on mobile */}
      <div className="flex flex-1 min-h-0 relative">

        {/* LEFT — LAYER PANEL: normal column on md+, slide-out drawer on mobile */}
        <div className={`
          md:relative md:flex md:w-40 md:shrink-0
          fixed inset-y-0 left-0 z-30 w-40
          transition-transform duration-200
          ${mobileLayerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <MapLayerPanel
            layers={layers}
            onToggleLayer={(key) => { toggleLayer(key); }}
            dataFreshness={dataFreshness}
          />
        </div>

        {/* Mobile backdrop — tap outside layer panel to close */}
        {mobileLayerOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileLayerOpen(false)}
          />
        )}

        {/* CENTER — MAP with visual filter mode */}
        <div className={`flex-1 relative min-w-0 ${mapClass}`}>
          <MapCanvas
            activeLayers={activeLayers}
            timeRange={timeRange}
            onVendorSelect={(point) => { handleVendorSelect(point); setMobileRightOpen(true); }}
            onConferenceSelect={(conf) => { setSelectedConference(conf); setMobileRightOpen(true); }}
            onClusterSelect={(cluster) => { setSelectedCluster(cluster); setMobileRightOpen(true); }}
            onPointCountChange={setPointCount}
            flyTo={flyTo}
            initialViewState={initialViewState}
            onViewStateChange={handleViewStateChange}
            flights={flights}
            seismicEvents={seismicEvents}
            activeVendorIds={activeVendorIds}
            borderCrossings={borderCrossings}
            borderWaitTimes={borderWaitTimes}
            crimeHotspots={crimeHotspots}
            disruptionPoints={disruptionPoints}
            contracts={contracts}
            samBusinesses={samBusinesses}
          />

          {/* Mode overlay (scanlines / vignette) */}
          {overlayClass && (
            <div className={`absolute inset-0 pointer-events-none z-10 ${overlayClass}`} />
          )}

          {/* Filter mode switcher */}
          <MapFilterPanel mode={filterMode} onChange={setFilterMode} />

          {/* Border wait times + camera overlay */}
          {layers.borderTrade && <BorderCameraOverlay />}

          {/* Crime news overlay */}
          {layers.crimeNews && <CrimeNewsOverlay articles={crimeArticles} />}

          {/* Disruptions overlay */}
          {layers.disruptions && disruptionPoints.length > 0 && (
            <div className="absolute top-12 left-1 z-20 w-[280px] max-h-[400px] bg-black/92 border border-white/[0.08] backdrop-blur-md rounded-sm overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" style={{ boxShadow: '0 0 6px #a855f7cc' }} />
                  <span className="font-mono text-[8px] tracking-[0.2em] text-[#a855f7]">DISRUPTIONS</span>
                </div>
                <span className="font-mono text-[7px] tabular-nums text-white/20">{disruptionPoints.length}</span>
              </div>
              <div className="overflow-y-auto scrollbar-thin flex-1">
                {ALL_DISRUPTIONS.map((d) => {
                  const catColors: Record<string, string> = { breakthrough: '#a855f7', funding: '#f97316', policy: '#ffb800', acquisition: '#00d4ff', deployment: '#00ff88' };
                  const impColors: Record<string, string> = { high: '#ff3b30', medium: '#f97316', low: '#6b7280' };
                  const cc = catColors[d.category] ?? '#a855f7';
                  const ic = impColors[d.impact] ?? '#6b7280';
                  return (
                    <div key={d.id} className="px-3 py-1.5 border-b border-white/[0.03] last:border-0">
                      <div className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full mt-1 shrink-0" style={{ backgroundColor: ic, boxShadow: `0 0 4px ${ic}88` }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[7px] text-white/45 leading-snug line-clamp-1">{d.title}</div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[5px] tracking-[0.12em] uppercase px-1 py-0.5 rounded-sm border" style={{ color: cc, borderColor: `${cc}30`, backgroundColor: `${cc}08` }}>{d.category}</span>
                            <span className="text-[5px] tracking-[0.12em] uppercase px-1 py-0.5 rounded-sm border" style={{ color: ic, borderColor: `${ic}30`, backgroundColor: `${ic}08` }}>{d.impact}</span>
                            <span className="text-[5px] text-white/15 tabular-nums">{d.date.slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live TV overlay */}
          {layers.liveTV && <LiveTVOverlay />}

          {/* Data freshness indicator — bottom-right corner, non-intrusive */}
          {hasAnyFreshness && (
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/80 border border-white/8 rounded-sm backdrop-blur-sm pointer-events-none">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: dataStatusColor, boxShadow: `0 0 4px ${dataStatusColor}` }}
              />
              <span
                className="font-mono tracking-widest"
                style={{ fontSize: '7px', color: dataStatusColor }}
              >
                {dataStatusLabel}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT — INTELLIGENCE PANEL: normal column on md+, slide-out drawer on mobile */}
        <div className={`
          md:relative md:flex md:w-72 md:shrink-0
          fixed inset-y-0 right-0 z-30 w-full max-w-sm
          transition-transform duration-200
          ${mobileRightOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <RightPanel
            selectedPoint={selectedPoint}
            missionBriefing={missionBriefing as Parameters<typeof RightPanel>[0]['missionBriefing']}
            briefingLoading={briefingLoading}
            sectorScores={sectorScores}
            flights={flights}
            selectedConference={selectedConference}
            onConferenceSelect={setSelectedConference}
            selectedCluster={selectedCluster}
            onClusterSelect={setSelectedCluster}
            onMobileClose={() => setMobileRightOpen(false)}
          />
        </div>

        {/* Mobile backdrop — tap outside right panel to close */}
        {mobileRightOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileRightOpen(false)}
          />
        )}

      </div>

      {/* BOTTOM — LIVE FEED BAR */}
      <FeedBar timeRange={timeRange} />

      {/* ⌘K VENDOR SEARCH MODAL */}
      <CmdK
        context="map"
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        timeRange={timeRange}
        onVendorSelect={(point) => { handleVendorSelect(point); setCmdkOpen(false); setMobileRightOpen(true); }}
        onLayerPreset={handleLayerPreset}
        onFlyTo={setFlyTo}
        contracts={contracts}
        samBusinesses={samBusinesses}
        crimeArticles={crimeArticles}
      />
    </div>
  );
}
