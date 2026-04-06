'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { COLORS } from '@/lib/tokens';

type MapPoint = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  signalCount: number;
  avgImportance: number;
  topIndustries: string[];
};

type BrainEntity = {
  id: string;
  slug: string;
  type: string;
  name: string;
  metadata?: Record<string, unknown>;
};

type BrainSyncResponse = {
  ok: boolean;
  scannedSignals: number;
  notesScanned: number;
  entities: BrainEntity[];
  relationships: Array<{ source: string; target: string; type: string }>;
  mapPoints: MapPoint[];
  signalAssessments?: Array<{
    id: string;
    title: string;
    industry: string | null;
    el_paso_relevance: number;
    opportunity_score: number;
    urgency_score: number;
    local_pathway: string;
    recommended_actions: string[];
    suggested_targets: string[];
  }>;
  learning?: {
    sourceScores?: Array<{ source: string; trustScore: number; signalCount: number }>;
    industryMomentum?: Array<{ name: string; momentumScore: number; signalCount: number }>;
    locationMomentum?: Array<{ name: string; momentumScore: number; signalCount: number }>;
    companyPriority?: Array<{ slug: string; name: string; priorityScore: number; signalCount: number; industries: string[] }>;
    summary?: {
      strongestSource: string | null;
      hottestIndustry: string | null;
      hottestLocation: string | null;
      highestPriorityCompany: string | null;
    };
  };
  pipeline?: {
    duplicatesFiltered?: number;
    lowEvidenceDiscarded?: number;
    topTrustedSources?: Array<{ source: string; trustScore: number; signalCount: number }>;
    weakestSources?: Array<{ source: string; trustScore: number; signalCount: number }>;
  };
  memory?: {
    recurringCompanies?: Array<{ name: string; repeatCount: number; score: number }>;
    recurringTechnologies?: Array<{ name: string; repeatCount: number; score: number }>;
    risingLocations?: Array<{ name: string; score: number; change: number }>;
  };
  opportunities?: {
    topOpportunities?: Array<{
      signalId: string;
      title: string;
      opportunityType: string;
      opportunityScore: number;
      elPasoRelevance: number;
      urgencyScore: number;
      localPathway: string;
      recommendedActions: string[];
    }>;
  };
  warnings?: string[];
  sources?: {
    obsidian?: {
      enabled: boolean;
      scanned: number;
      vaultPath: string | null;
    };
  };
};

type RecentSignal = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  relevance_score: number;
  discovered_at: string;
  source: string;
  company?: string | null;
};

type BriefingResponse = {
  briefing?: {
    recent_signals?: RecentSignal[];
  };
};

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [entities, setEntities] = useState<BrainEntity[]>([]);
  const [signals, setSignals] = useState<RecentSignal[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [showHighOnly, setShowHighOnly] = useState(false);
  const [includeMemory, setIncludeMemory] = useState(true);
  const [brainStats, setBrainStats] = useState<{ scannedSignals: number; notesScanned: number; warnings: string[]; obsidianReady: boolean }>({
    scannedSignals: 0,
    notesScanned: 0,
    warnings: [],
    obsidianReady: false,
  });
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState<NonNullable<BrainSyncResponse['learning']> | null>(null);
  const [pipeline, setPipeline] = useState<NonNullable<BrainSyncResponse['pipeline']> | null>(null);
  const [signalAssessments, setSignalAssessments] = useState<NonNullable<BrainSyncResponse['signalAssessments']>>([]);
  const [memory, setMemory] = useState<NonNullable<BrainSyncResponse['memory']> | null>(null);
  const [opportunities, setOpportunities] = useState<NonNullable<BrainSyncResponse['opportunities']> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [brainRes, briefingRes] = await Promise.all([
          fetch(`/api/brain/sync?limit=120&includeObsidian=${includeMemory}`),
          fetch('/api/briefing'),
        ]);

        const brainJson = (await brainRes.json()) as BrainSyncResponse;
        const briefingJson = (await briefingRes.json()) as BriefingResponse;
        if (!active) return;

        setPoints(brainJson.mapPoints ?? []);
        setEntities(brainJson.entities ?? []);
        setLearning(brainJson.learning ?? null);
        setPipeline(brainJson.pipeline ?? null);
        setSignalAssessments(brainJson.signalAssessments ?? []);
        setMemory(brainJson.memory ?? null);
        setOpportunities(brainJson.opportunities ?? null);
        setSignals(briefingJson.briefing?.recent_signals?.slice(0, 16) ?? []);
        setBrainStats({
          scannedSignals: brainJson.scannedSignals ?? 0,
          notesScanned: brainJson.notesScanned ?? 0,
          warnings: brainJson.warnings ?? [],
          obsidianReady: Boolean(brainJson.sources?.obsidian?.enabled),
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [includeMemory]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'NXT Dark',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: [-101.5, 28.4],
      zoom: 2.4,
      minZoom: 1.6,
      maxZoom: 9,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const filteredPoints = showHighOnly ? points.filter((point) => point.avgImportance >= 0.75) : points;

    for (const point of filteredPoints) {
      const score = Math.round(point.avgImportance * 100);
      const color = score >= 80 ? COLORS.green : score >= 65 ? COLORS.accent : COLORS.amber;
      const size = Math.max(26, Math.min(58, 20 + Math.sqrt(point.signalCount) * 8));

      const core = document.createElement('button');
      core.style.cssText = `
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        border:1px solid ${color}88;
        background:radial-gradient(circle, ${color}cc, ${color}30);
        box-shadow:0 0 ${size * 0.75}px ${color}40;
        color:white;
        font:600 11px "IBM Plex Mono", monospace;
        cursor:pointer;
      `;
      core.textContent = String(point.signalCount);
      core.onclick = () => {
        setSelectedPoint(point);
        map.flyTo({ center: [point.longitude, point.latitude], zoom: 5, duration: 1000 });
      };

      const label = document.createElement('div');
      label.style.cssText = `
        margin-top:6px;
        text-align:center;
        white-space:nowrap;
        font:500 10px "IBM Plex Mono", monospace;
        color:${COLORS.secondary};
        text-shadow:0 1px 3px rgba(0,0,0,0.9);
      `;
      label.textContent = point.name;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
      wrapper.appendChild(core);
      wrapper.appendChild(label);

      const marker = new maplibregl.Marker({ element: wrapper, anchor: 'center' })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [points, showHighOnly]);

  const filteredPoints = showHighOnly ? points.filter((point) => point.avgImportance >= 0.75) : points;
  const companyCount = entities.filter((entity) => entity.type === 'company').length;
  const noteCount = brainStats.notesScanned;
  const topCompanies = learning?.companyPriority?.slice(0, 6) ?? [];
  const topIndustryMomentum = learning?.industryMomentum?.slice(0, 4) ?? [];
  const topLocationMomentum = learning?.locationMomentum?.slice(0, 4) ?? [];
  const topOpportunities = opportunities?.topOpportunities?.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen bg-nxt-bg text-nxt-text">
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-6">
        <section className="mb-8 border-b border-[rgba(138,160,255,0.12)] pb-8">
          <div className="grid gap-4 xl:grid-cols-[320px_1fr_320px]">
          <div className="p-0">
            <p className="section-kicker mb-3">Brain Map</p>
            <h1 className="max-w-[320px] text-[clamp(2.4rem,4vw,4rem)] font-bold leading-[0.95] tracking-[-0.04em] text-nxt-text">See where the system is clustering.</h1>
            <p className="mt-4 text-sm leading-7 text-nxt-secondary">
              This view now shows where global industry movement turns into El Paso relevance. The map is weighted by trust, local fit, and opportunity pressure.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[18px] border border-nxt-border bg-nxt-surface/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Mapped places</div>
                <div className="mt-2 text-2xl font-mono font-bold">{filteredPoints.length}</div>
              </div>
              <div className="rounded-[18px] border border-nxt-border bg-nxt-surface/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Signals scanned</div>
                <div className="mt-2 text-2xl font-mono font-bold">{brainStats.scannedSignals}</div>
              </div>
              <div className="rounded-[18px] border border-nxt-border bg-nxt-surface/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Memory notes</div>
                <div className="mt-2 text-2xl font-mono font-bold">{noteCount}</div>
              </div>
              <div className="rounded-[18px] border border-nxt-border bg-nxt-surface/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Locally ranked</div>
                <div className="mt-2 text-2xl font-mono font-bold">{signalAssessments.length}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setShowHighOnly((current) => !current)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${showHighOnly ? 'bg-nxt-accent/12 text-nxt-accent-light' : 'border border-nxt-border text-nxt-muted'}`}
              >
                {showHighOnly ? 'Showing strong clusters' : 'Show stronger clusters only'}
              </button>
              <button
                onClick={() => setIncludeMemory((current) => !current)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${includeMemory ? 'bg-nxt-green/12 text-nxt-green' : 'border border-nxt-border text-nxt-muted'}`}
              >
                {includeMemory ? 'Obsidian memory on' : 'Obsidian memory off'}
              </button>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden border border-[rgba(138,160,255,0.16)] bg-[rgba(6,9,16,0.92)]">
            <div ref={mapContainer} className="absolute inset-0" />
            {selectedPoint && (
              <div className="absolute bottom-4 left-4 z-10 w-[280px] rounded-[20px] border border-nxt-border bg-[rgba(9,13,22,0.94)] p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{selectedPoint.name}</div>
                    <div className="mt-1 text-xs text-nxt-dim">{selectedPoint.topIndustries.join(', ') || 'No industries yet'}</div>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="text-nxt-dim">
                    x
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-nxt-card p-3">
                    <div className="text-lg font-mono font-bold">{selectedPoint.signalCount}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">signals</div>
                  </div>
                  <div className="rounded-2xl bg-nxt-card p-3">
                    <div className="text-lg font-mono font-bold">{Math.round(selectedPoint.avgImportance * 100)}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">avg score</div>
                  </div>
                </div>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(6,9,16,0.55)] text-sm font-mono text-nxt-muted">
                Loading map intelligence...
              </div>
            )}
          </div>

          <div className="border border-[rgba(138,160,255,0.12)] bg-[rgba(10,13,22,0.96)] p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Knowledge summary</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] border border-nxt-border bg-nxt-surface/70 p-4">
                <div className="text-xs text-nxt-muted">Tracked companies</div>
                <div className="mt-1 text-2xl font-mono font-bold">{companyCount}</div>
              </div>
              {learning?.summary && (
                <div className="rounded-[18px] border border-[rgba(138,160,255,0.12)] bg-[rgba(9,13,22,0.86)] p-4">
                  <div className="text-xs text-nxt-muted">Brain summary</div>
                  <div className="mt-3 space-y-2 text-sm text-nxt-secondary">
                    <div>Hottest industry: <span className="font-semibold text-nxt-text">{learning.summary.hottestIndustry ?? 'none yet'}</span></div>
                    <div>Hottest place: <span className="font-semibold text-nxt-text">{learning.summary.hottestLocation ?? 'none yet'}</span></div>
                    <div>Top company: <span className="font-semibold text-nxt-text">{learning.summary.highestPriorityCompany ?? 'none yet'}</span></div>
                  </div>
                </div>
              )}
              {topOpportunities[0] && (
                <div className="rounded-[18px] border border-[rgba(39,209,127,0.16)] bg-[rgba(12,30,23,0.42)] p-4">
                  <div className="text-xs text-nxt-muted">Top local opening</div>
                  <div className="mt-2 text-sm font-semibold text-nxt-text">{topOpportunities[0].title}</div>
                  <p className="mt-2 text-xs leading-5 text-nxt-secondary">{topOpportunities[0].localPathway}</p>
                </div>
              )}
              {pipeline && (
                <div className="rounded-[18px] border border-[rgba(138,160,255,0.12)] bg-[rgba(9,13,22,0.86)] p-4">
                  <div className="text-xs text-nxt-muted">Pipeline quality</div>
                  <div className="mt-3 space-y-2 text-sm text-nxt-secondary">
                    <div>Duplicates filtered: <span className="font-semibold text-nxt-text">{pipeline.duplicatesFiltered ?? 0}</span></div>
                    <div>Low evidence discarded: <span className="font-semibold text-nxt-text">{pipeline.lowEvidenceDiscarded ?? 0}</span></div>
                    <div>Best source: <span className="font-semibold text-nxt-text">{pipeline.topTrustedSources?.[0]?.source ?? 'none yet'}</span></div>
                  </div>
                </div>
              )}
              <div className="rounded-[18px] border border-nxt-border bg-nxt-surface/70 p-4">
                <div className="text-xs text-nxt-muted">Obsidian memory</div>
                <div className="mt-1 text-sm font-semibold text-nxt-text">
                  {brainStats.obsidianReady ? 'Connected' : 'Not connected yet'}
                </div>
                <p className="mt-2 text-xs leading-5 text-nxt-secondary">
                  {brainStats.obsidianReady
                    ? 'Notes and wiki-links are feeding the graph alongside live market signals.'
                    : 'The map still works without notes. Add the vault path to merge research memory too.'}
                </p>
              </div>
              {brainStats.warnings.length > 0 && (
                <div className="rounded-[18px] border border-[rgba(242,185,75,0.2)] bg-[rgba(46,30,8,0.56)] p-4 text-xs leading-5 text-nxt-secondary">
                  {brainStats.warnings[0]}
                </div>
              )}
            </div>
          </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Top mapped places</h2>
              <span className="text-[11px] font-mono text-nxt-dim">{filteredPoints.length} visible</span>
            </div>
            <div className="space-y-2">
              {filteredPoints.slice(0, 8).map((point) => (
                <button
                  key={point.slug}
                  onClick={() => {
                    setSelectedPoint(point);
                    mapRef.current?.flyTo({ center: [point.longitude, point.latitude], zoom: 5, duration: 1000 });
                  }}
                  className="flex w-full items-center justify-between rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4 text-left transition-all hover:border-[rgba(138,160,255,0.22)]"
                >
                  <div>
                    <div className="text-sm font-medium text-nxt-text">{point.name}</div>
                    <div className="mt-1 text-xs text-nxt-dim">{point.topIndustries.join(', ') || 'No industries tagged yet'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-nxt-text">{point.signalCount}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">{Math.round(point.avgImportance * 100)} score</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent signals</h2>
                <span className="text-[11px] font-mono text-nxt-dim">why the map moved</span>
              </div>
              <div className="space-y-2">
                {signals.slice(0, 8).map((signal) => (
                  <div key={signal.id} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                    <div className="text-xs text-nxt-dim">{signal.industry} | {relTime(signal.discovered_at)}</div>
                    <div className="mt-1 text-sm font-medium text-nxt-text">{signal.title}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top companies</h2>
                <span className="text-[11px] font-mono text-nxt-dim">brain priority</span>
              </div>
              <div className="space-y-2">
                {topCompanies.length === 0 ? (
                  <div className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4 text-sm text-nxt-dim">
                    Company nodes will show up here as the graph fills in.
                  </div>
                ) : (
                  topCompanies.map((entity) => (
                    <div key={entity.slug} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-nxt-text">{entity.name}</div>
                          <div className="mt-1 text-xs text-nxt-dim">{entity.industries.join(', ') || 'No industry yet'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(entity.priorityScore * 100)}</div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">priority</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-nxt-muted">{entity.signalCount} linked signals</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">El Paso opportunity queue</h2>
              <span className="text-[11px] font-mono text-nxt-dim">map to action</span>
            </div>
            <div className="space-y-2">
              {topOpportunities.map((item) => (
                <div key={item.signalId} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-nxt-text">{item.title}</div>
                      <div className="mt-1 text-xs text-nxt-dim">{item.opportunityType.replace(/-/g, ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.elPasoRelevance * 100)}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">local fit</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] leading-5 text-nxt-secondary">{item.localPathway}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recurring pattern memory</h2>
              <span className="text-[11px] font-mono text-nxt-dim">longitudinal read</span>
            </div>
            <div className="space-y-2">
              {(memory?.recurringCompanies ?? []).slice(0, 3).map((item) => (
                <div key={item.name} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-nxt-text">{item.name}</div>
                    <div className="text-[11px] font-mono text-nxt-dim">{item.repeatCount}x</div>
                  </div>
                </div>
              ))}
              {(memory?.recurringTechnologies ?? []).slice(0, 3).map((item) => (
                <div key={item.name} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-nxt-text">{item.name}</div>
                    <div className="text-[11px] font-mono text-nxt-dim">{item.repeatCount}x</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Industry momentum</h2>
              <span className="text-[11px] font-mono text-nxt-dim">what is heating up</span>
            </div>
            <div className="space-y-2">
              {topIndustryMomentum.map((item) => (
                <div key={item.name} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-nxt-text">{item.name}</div>
                      <div className="mt-1 text-xs text-nxt-dim">{item.signalCount} signals behind this rank</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.momentumScore * 100)}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">momentum</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Location momentum</h2>
              <span className="text-[11px] font-mono text-nxt-dim">where activity is rising</span>
            </div>
            <div className="space-y-2">
              {topLocationMomentum.map((item) => (
                <div key={item.name} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-nxt-text">{item.name}</div>
                      <div className="mt-1 text-xs text-nxt-dim">{item.signalCount} signals behind this rank</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.momentumScore * 100)}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">momentum</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {pipeline && (
          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top trusted sources</h2>
                <span className="text-[11px] font-mono text-nxt-dim">map weighting</span>
              </div>
              <div className="space-y-2">
                {(pipeline.topTrustedSources ?? []).slice(0, 4).map((item) => (
                  <div key={item.source} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-sm font-medium text-nxt-text">{item.source}</div>
                      <div className="text-right">
                        <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.trustScore * 100)}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">trust</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-nxt-border bg-nxt-surface/82 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Weakest sources</h2>
                <span className="text-[11px] font-mono text-nxt-dim">noise watch</span>
              </div>
              <div className="space-y-2">
                {(pipeline.weakestSources ?? []).slice(0, 4).map((item) => (
                  <div key={item.source} className="rounded-[18px] border border-nxt-border bg-nxt-card/85 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-sm font-medium text-nxt-text">{item.source}</div>
                      <div className="text-right">
                        <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.trustScore * 100)}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">trust</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
