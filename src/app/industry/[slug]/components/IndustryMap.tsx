'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type CountryTechProfile = {
  code: string;
  name: string;
  primarySectors: string[];
  keyCompanies: string[];
  techScore: number;
  color: string;
  lat: number;
  lon: number;
};

interface IndustryMapProps {
  countries: CountryTechProfile[];
  accentColor: string;
  industryCategory: string;
  selectedCountryCode: string | null;
  onCountrySelect: (code: string | null) => void;
  highlightedCodes?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signals?: Record<string, any>[];
}

// ─── Lazy MapLibre import ───────────────────────────────────────────────────

let maplibregl: typeof import('maplibre-gl') | null = null;

async function loadMapLibre() {
  if (maplibregl) return maplibregl;
  maplibregl = await import('maplibre-gl');
  return maplibregl;
}

// ─── Dark tile style ────────────────────────────────────────────────────────

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster' as const,
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────

export function IndustryMap({
  countries,
  accentColor,
  industryCategory,
  selectedCountryCode,
  onCountrySelect,
  highlightedCodes = [],
  signals = [],
}: IndustryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof import('maplibre-gl').Map> | null>(null);
  const markersRef = useRef<Array<InstanceType<typeof import('maplibre-gl').Marker>>>([]);
  const [ready, setReady] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Relevant countries
  const relevantCodes = useMemo(() => {
    const catLower = industryCategory.toLowerCase();
    return new Set(
      countries
        .filter(c => c.primarySectors.some(s =>
          s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase()),
        ))
        .map(c => c.code),
    );
  }, [countries, industryCategory]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadMapLibre().then(ml => {
      if (cancelled || !containerRef.current) return;

      const map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE as unknown as maplibregl.StyleSpecification,
        center: [10, 25],
        zoom: 1.8,
        minZoom: 1,
        maxZoom: 8,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!cancelled) setReady(true);
      });

      return () => {
        cancelled = true;
        map.remove();
        mapRef.current = null;
      };
    });

    return () => { cancelled = true; };
  }, []);

  // Add/update country markers
  useEffect(() => {
    if (!ready || !mapRef.current || !maplibregl) return;
    const ml = maplibregl;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add country dots
    for (const c of countries) {
      const isRelevant = relevantCodes.has(c.code);
      const isHighlighted = highlightedCodes.length === 0 || highlightedCodes.includes(c.code);
      const isSelected = c.code === selectedCountryCode;
      const size = isRelevant ? 10 + (c.techScore / 100) * 12 : 6;
      const opacity = isRelevant ? (isHighlighted ? 0.9 : 0.3) : 0.1;

      const el = document.createElement('div');
      el.style.cssText = `
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: ${isRelevant ? c.color : COLORS.dim};
        opacity: ${opacity};
        border: ${isSelected ? `2px solid ${accentColor}` : isRelevant ? `1px solid ${c.color}44` : 'none'};
        box-shadow: ${isRelevant ? `0 0 ${size}px ${c.color}40` : 'none'};
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      // Hover
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.5)';
        el.style.opacity = '1';
        el.style.boxShadow = `0 0 ${size * 2}px ${c.color}60`;
        setHoveredCountry(c.code);
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.opacity = String(opacity);
        el.style.boxShadow = isRelevant ? `0 0 ${size}px ${c.color}40` : 'none';
        setHoveredCountry(null);
      });

      // Click
      el.addEventListener('click', () => {
        onCountrySelect(isSelected ? null : c.code);
      });

      const marker = new ml.Marker({ element: el })
        .setLngLat([c.lon, c.lat])
        .addTo(map);

      // Label popup
      if (isRelevant) {
        const popup = new ml.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -size / 2 - 4],
          className: 'nxtlink-popup',
        }).setHTML(`
          <div style="font-family:monospace;font-size:9px;color:${COLORS.text};background:${COLORS.card};
            padding:4px 8px;border-radius:6px;border:1px solid ${c.color}33;white-space:nowrap;">
            <strong>${c.name}</strong>
            <span style="color:${c.color};margin-left:6px;">${c.techScore}</span>
          </div>
        `);
        marker.setPopup(popup);
        el.addEventListener('mouseenter', () => marker.togglePopup());
        el.addEventListener('mouseleave', () => marker.togglePopup());
      }

      markersRef.current.push(marker);
    }

    // Add signal dots
    const sigLimit = signals.slice(0, 15);
    let seed = 77;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 5; };

    for (const s of sigLimit) {
      const importance = Number(s.importance ?? 0.5);
      const sigColor = importance >= 0.8 ? COLORS.orange : importance >= 0.6 ? COLORS.gold : COLORS.cyan;
      const sigSize = 6 + importance * 6;

      // Find matching country for placement
      const catLower = industryCategory.toLowerCase();
      const match = countries.find(c =>
        c.primarySectors.some(sec =>
          sec.toLowerCase().includes(catLower) || catLower.includes(sec.toLowerCase()),
        ),
      );
      const lat = match ? match.lat + rand() : 30 + rand();
      const lon = match ? match.lon + rand() : rand() * 10;

      const el = document.createElement('div');
      el.style.cssText = `
        width: ${sigSize}px; height: ${sigSize}px;
        border-radius: 50%;
        background: ${sigColor};
        opacity: 0.7;
        box-shadow: 0 0 ${sigSize}px ${sigColor}80;
        cursor: pointer;
        animation: pulse-sig 2s ease-in-out infinite;
      `;
      el.title = String(s.title ?? '');

      const marker = new ml.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [ready, countries, relevantCodes, highlightedCodes, selectedCountryCode, accentColor, signals, industryCategory, onCountrySelect]);

  // Fly to selected country
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedCountryCode) return;
    const c = countries.find(c => c.code === selectedCountryCode);
    if (c) {
      mapRef.current.flyTo({ center: [c.lon, c.lat], zoom: 4, duration: 1200 });
    }
  }, [ready, selectedCountryCode, countries]);

  // Fly back when deselected
  const prevSelected = useRef(selectedCountryCode);
  useEffect(() => {
    if (prevSelected.current && !selectedCountryCode && mapRef.current) {
      mapRef.current.flyTo({ center: [10, 25], zoom: 1.8, duration: 800 });
    }
    prevSelected.current = selectedCountryCode;
  }, [selectedCountryCode]);

  return (
    <div className="relative">
      {/* Map container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 380,
          borderRadius: 16,
          border: `1px solid ${accentColor}15`,
          overflow: 'hidden',
        }}
      />

      {/* Loading overlay */}
      {!ready && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl"
          style={{ background: COLORS.bg }}
        >
          <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: `${COLORS.text}40` }}>
            <div className="w-4 h-4 border border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor}40`, borderTopColor: 'transparent' }} />
            LOADING MAP
          </div>
        </div>
      )}

      {/* Hovered country label */}
      {hoveredCountry && (
        <div
          className="absolute top-3 left-3 font-mono text-[9px] px-3 py-1.5 rounded-lg"
          style={{
            background: `${COLORS.card}ee`,
            border: `1px solid ${accentColor}20`,
            color: COLORS.text,
            backdropFilter: 'blur(8px)',
          }}
        >
          {countries.find(c => c.code === hoveredCountry)?.name ?? hoveredCountry}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 font-mono text-[7px] tracking-[0.1em]" style={{ color: `${COLORS.text}45` }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: accentColor, opacity: 0.8 }} />
          ACTIVE
        </span>
        {signals.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.orange, opacity: 0.8 }} />
            SIGNALS
          </span>
        )}
        <span style={{ color: `${COLORS.text}25` }}>SCROLL TO ZOOM · CLICK COUNTRY</span>
      </div>

      {/* Popup + pulse styles */}
      <style>{`
        .nxtlink-popup .maplibregl-popup-content {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .nxtlink-popup .maplibregl-popup-tip { display: none !important; }
        @keyframes pulse-sig {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
