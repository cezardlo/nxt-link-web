'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { COLORS } from '@/lib/tokens';

interface Signal {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  relevance_score: number;
  discovered_at: string;
  source: string;
  company: string | null;
}

interface Region {
  name: string;
  total_signals: number;
  risk_level: string;
  opportunity_score: number;
  industries: string[];
  total_investment_usd: number;
}

interface MergedRegion {
  name: string;
  lat: number;
  lng: number;
  signal_count: number;
  risk_level: string;
  industries: string[];
  total_investment_usd: number;
}

const REGION_GEO: Record<string, { lat: number; lng: number }> = {
  'United States': { lat: 39.8, lng: -98.5 },
  'China': { lat: 35.9, lng: 104.2 },
  'Japan & Korea': { lat: 36.2, lng: 133.0 },
  'Europe': { lat: 50.0, lng: 10.0 },
  'Mexico': { lat: 23.6, lng: -102.6 },
  'Southeast Asia': { lat: 5.0, lng: 110.0 },
  'India': { lat: 20.6, lng: 78.9 },
  'US': { lat: 39.8, lng: -98.5 },
  'EU': { lat: 50.0, lng: 10.0 },
  'Texas': { lat: 31.0, lng: -99.0 },
  'El Paso': { lat: 31.8, lng: -106.4 },
  'US-Mexico Border': { lat: 29.0, lng: -103.0 },
  'Japan': { lat: 35.7, lng: 139.7 },
  'South Korea': { lat: 37.6, lng: 127.0 },
  'Taiwan': { lat: 25.0, lng: 121.5 },
  'Singapore': { lat: 1.3, lng: 103.8 },
  'Australia': { lat: -25.3, lng: 134.0 },
  'Indonesia': { lat: -2.5, lng: 118.0 },
  'Vietnam': { lat: 16.0, lng: 108.0 },
  'Thailand': { lat: 15.0, lng: 101.0 },
  'Philippines': { lat: 12.0, lng: 122.0 },
  'Malaysia': { lat: 4.2, lng: 108.0 },
  'Germany': { lat: 51.2, lng: 10.4 },
  'United Kingdom': { lat: 55.4, lng: -3.4 },
  'France': { lat: 46.6, lng: 2.2 },
  'Italy': { lat: 41.9, lng: 12.6 },
  'Spain': { lat: 40.5, lng: -3.7 },
  'Netherlands': { lat: 52.1, lng: 5.3 },
  'Canada': { lat: 56.1, lng: -106.3 },
  'Brazil': { lat: -14.2, lng: -51.9 },
  'Israel': { lat: 31.0, lng: 34.9 },
  'United Arab Emirates': { lat: 23.4, lng: 53.8 },
  'Saudi Arabia': { lat: 23.9, lng: 45.1 },
  'South Africa': { lat: -30.6, lng: 22.9 },
  'Nigeria': { lat: 9.1, lng: 8.7 },
  'Egypt': { lat: 26.8, lng: 30.8 },
  'Middle East': { lat: 29.0, lng: 47.0 },
  'Africa': { lat: 0.0, lng: 25.0 },
  'South America': { lat: -15.0, lng: -60.0 },
  'Latin America': { lat: 10.0, lng: -70.0 },
  'Central America': { lat: 14.6, lng: -90.5 },
  'Oceania': { lat: -25.0, lng: 135.0 },
};

const REGION_MERGE: Record<string, string> = {
  'US': 'United States',
  'EU': 'Europe',
  'Japan': 'Japan & Korea',
  'South Korea': 'Japan & Korea',
  'Texas': 'United States',
  'El Paso': 'United States',
  'US-Mexico Border': 'United States',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  elevated: '#f59e0b',
  moderate: '#eab308',
  low: '#22c55e',
};

const TYPE_COLORS: Record<string, { label: string; color: string }> = {
  contract_award:   { label: 'Contract',    color: '#22c55e' },
  funding_round:    { label: 'Funding',     color: '#a855f7' },
  patent_filing:    { label: 'Patent',      color: '#06b6d4' },
  partnership:      { label: 'Partnership', color: '#f59e0b' },
  product_launch:   { label: 'Launch',      color: '#f97316' },
  regulation:       { label: 'Regulation',  color: '#ef4444' },
  market_expansion: { label: 'Expansion',   color: '#10b981' },
  market_shift:     { label: 'Market',      color: '#f59e0b' },
  technology:       { label: 'Tech',        color: '#06b6d4' },
  funding:          { label: 'Funding',     color: '#22c55e' },
  merger_acquisition: { label: 'M&A',       color: '#ef4444' },
  facility_expansion: { label: 'Facility',  color: '#eab308' },
  discovery:        { label: 'Discovery',   color: '#f97316' },
};

function formatDate(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatUSD(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [regions, setRegions] = useState<MergedRegion[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<MergedRegion | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    fetch('/api/briefing')
      .then((r) => r.json())
      .then((data) => {
        const b = data.briefing;
        const rMap: Record<string, MergedRegion> = {};
        for (const r of (b.regions || []) as Region[]) {
          const geo = REGION_GEO[r.name];
          if (!geo) continue;
          const key = REGION_MERGE[r.name] || r.name;
          const mergedGeo = REGION_GEO[key] || geo;
          if (!rMap[key]) {
            rMap[key] = {
              name: key, lat: mergedGeo.lat, lng: mergedGeo.lng,
              signal_count: 0, risk_level: r.risk_level || 'low',
              industries: [], total_investment_usd: 0,
            };
          }
          rMap[key].signal_count += r.total_signals;
          rMap[key].total_investment_usd += r.total_investment_usd || 0;
          for (const ind of r.industries || []) {
            if (!rMap[key].industries.includes(ind)) rMap[key].industries.push(ind);
          }
          if (r.risk_level === 'high' || r.risk_level === 'critical') rMap[key].risk_level = r.risk_level;
        }
        setRegions(Object.values(rMap).sort((a, b) => b.signal_count - a.signal_count));
        setSignals(b.recent_signals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Create markers
  const addMarkers = useCallback((map: maplibregl.Map, regionData: MergedRegion[]) => {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const region of regionData) {
      const riskColor = RISK_COLORS[region.risk_level] || RISK_COLORS.low;
      const size = Math.max(24, Math.min(56, 16 + Math.sqrt(region.signal_count) * 5));

      const el = document.createElement('div');
      el.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 50%; cursor: pointer;
        background: radial-gradient(circle, ${riskColor}cc, ${riskColor}40);
        border: 2px solid ${riskColor}aa;
        box-shadow: 0 0 ${size * 0.6}px ${riskColor}44, 0 0 ${size * 0.3}px ${riskColor}22;
        display: flex; align-items: center; justify-content: center;
        font-family: 'IBM Plex Mono', monospace; font-size: ${size > 30 ? 11 : 9}px;
        font-weight: 700; color: white; transition: transform 0.2s, box-shadow 0.2s;
      `;
      el.textContent = String(region.signal_count);
      el.title = region.name;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.boxShadow = `0 0 ${size}px ${riskColor}88, 0 0 ${size * 0.5}px ${riskColor}44`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = `0 0 ${size * 0.6}px ${riskColor}44, 0 0 ${size * 0.3}px ${riskColor}22`;
      });
      el.addEventListener('click', () => {
        setSelectedRegion((prev) => prev?.name === region.name ? null : region);
        map.flyTo({ center: [region.lng, region.lat], zoom: 4, duration: 1200 });
      });

      // Label
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute; top: ${size + 4}px; left: 50%; transform: translateX(-50%);
        white-space: nowrap; font-family: 'IBM Plex Mono', monospace; font-size: 10px;
        color: ${COLORS.secondary}; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        pointer-events: none;
      `;
      label.textContent = region.name;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: center;';
      wrapper.appendChild(el);
      wrapper.appendChild(label);

      const marker = new maplibregl.Marker({ element: wrapper, anchor: 'center' })
        .setLngLat([region.lng, region.lat])
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || loading || mapRef.current) return;

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
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: [20, 20],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      addMarkers(map, regions);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, regions, addMarkers]);

  const filteredSignals = filter === 'all' ? signals : signals.filter((s) => s.signal_type === filter);
  const signalTypes = [...new Set(signals.map((s) => s.signal_type))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nxt-bg">
        <div className="text-nxt-muted text-sm font-mono">Loading map data...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-nxt-bg text-nxt-text">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Selected region panel */}
        {selectedRegion && (
          <div className="absolute bottom-6 left-6 z-10 w-[300px] bg-nxt-surface/95 backdrop-blur-lg border border-nxt-border rounded-nxt-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base font-semibold">{selectedRegion.name}</h3>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-nxt-dim hover:text-nxt-text text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-nxt-card rounded-lg p-3">
                <div className="text-[10px] font-mono text-nxt-dim tracking-wider uppercase mb-1">Signals</div>
                <div className="text-xl font-bold font-mono text-nxt-accent">{selectedRegion.signal_count}</div>
              </div>
              <div className="bg-nxt-card rounded-lg p-3">
                <div className="text-[10px] font-mono text-nxt-dim tracking-wider uppercase mb-1">Risk</div>
                <div
                  className="text-sm font-bold font-mono uppercase"
                  style={{ color: RISK_COLORS[selectedRegion.risk_level] || RISK_COLORS.low }}
                >
                  {selectedRegion.risk_level}
                </div>
              </div>
            </div>
            {selectedRegion.total_investment_usd > 0 && (
              <div className="text-xs font-mono text-nxt-amber mb-2">
                {formatUSD(selectedRegion.total_investment_usd)} tracked investment
              </div>
            )}
            <div className="text-xs text-nxt-muted">
              {selectedRegion.industries.join(' · ')}
            </div>
          </div>
        )}

        {/* Region bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2.5 bg-nxt-surface/90 backdrop-blur-lg border border-nxt-border rounded-full">
          {regions.slice(0, 7).map((r) => (
            <button
              key={r.name}
              onClick={() => {
                setSelectedRegion((prev) => prev?.name === r.name ? null : r);
                mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 4, duration: 1200 });
              }}
              className="flex items-center gap-1.5 transition-opacity"
              style={{ opacity: selectedRegion && selectedRegion.name !== r.name ? 0.35 : 1 }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: RISK_COLORS[r.risk_level] || RISK_COLORS.low }}
              />
              <span className="text-[11px] text-nxt-muted whitespace-nowrap">{r.name}</span>
              <span className="text-[11px] font-mono font-semibold text-nxt-text">{r.signal_count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Signal feed sidebar */}
      <div className="w-[380px] border-l border-nxt-border bg-nxt-surface flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-nxt-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Live Signal Feed</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-nxt-green live-pulse" />
              <span className="text-[10px] font-mono text-nxt-dim">LIVE</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
              style={{
                background: filter === 'all' ? COLORS.accent + '30' : COLORS.card,
                color: filter === 'all' ? COLORS.accentLight : COLORS.muted,
              }}
            >
              ALL
            </button>
            {signalTypes.map((t) => {
              const info = TYPE_COLORS[t] || { label: t, color: COLORS.muted };
              return (
                <button
                  key={t}
                  onClick={() => setFilter(filter === t ? 'all' : t)}
                  className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
                  style={{
                    background: filter === t ? info.color + '30' : COLORS.card,
                    color: filter === t ? info.color : COLORS.muted,
                  }}
                >
                  {info.label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {filteredSignals.map((s) => {
            const info = TYPE_COLORS[s.signal_type] || { label: s.signal_type, color: COLORS.muted };
            return (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-nxt-card border border-nxt-border-subtle card-hover"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: info.color }} />
                  <span
                    className="text-[10px] font-mono uppercase"
                    style={{ color: info.color }}
                  >
                    {info.label}
                  </span>
                  <span className="text-[10px] font-mono text-nxt-dim ml-auto">{formatDate(s.discovered_at)}</span>
                </div>
                <div className="text-[13px] text-nxt-text leading-snug mb-1.5">{s.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-nxt-dim">{s.source} · {s.industry}</span>
                  <span className="text-[10px] font-mono font-semibold text-nxt-amber">
                    {(s.relevance_score * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
