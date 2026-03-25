'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Suppress luma.gl ResizeObserver race condition (maxTextureDimension2D on unmounted device)
if (typeof window !== 'undefined') {
  const origOnError = window.onerror;
  window.onerror = function (msg, ...args) {
    if (typeof msg === 'string' && msg.includes('maxTextureDimension2D')) return true;
    return origOnError ? origOnError.call(this, msg, ...args) : false;
  };
}

import DeckGL from '@deck.gl/react';
import type { Layer, PickingInfo } from '@deck.gl/core';
import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';

import type { PortWaitTime } from '@/app/api/live/border-wait/route';
import { CONFERENCES } from '@/lib/data/conference-intel';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import { buildConferenceClusters } from '@/lib/utils/conference-clusters';
import type { ConferenceCluster } from '@/lib/utils/conference-clusters';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { COUNTRY_TECH_MAP } from '@/lib/data/country-tech-map';
import type { CountryTechProfile } from '@/lib/data/country-tech-map';
import type { IntelSignalMapPoint } from '@/hooks/useMapData';
import MapGL from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Dark raster tile style — inline spec, no external JSON dependency, 100% reliable
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
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
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const INITIAL_VIEW = {
  longitude:  -106.44,
  latitude:   31.77,
  zoom:       4,
  pitch:      30,
  bearing:     0,
};

// Global technology hubs — visible when zoomed out
type GlobalHub = { id: string; lat: number; lon: number; label: string; isHQ: boolean };
const GLOBAL_HUBS: GlobalHub[] = [
  { id: 'silicon-valley', lat: 37.39,  lon: -122.08, label: 'SILICON VALLEY',  isHQ: false },
  { id: 'austin',         lat: 30.27,  lon: -97.74,  label: 'AUSTIN TX',       isHQ: false },
  { id: 'el-paso',        lat: 31.76,  lon: -106.49, label: 'NXT//LINK HQ',    isHQ: true  },
  { id: 'boston',          lat: 42.36,  lon: -71.06,  label: 'BOSTON',           isHQ: false },
  { id: 'seattle',        lat: 47.61,  lon: -122.33, label: 'SEATTLE',         isHQ: false },
  { id: 'shenzhen',       lat: 22.54,  lon: 114.06,  label: 'SHENZHEN',        isHQ: false },
  { id: 'munich',         lat: 48.14,  lon: 11.58,   label: 'MUNICH',          isHQ: false },
  { id: 'tel-aviv',       lat: 32.07,  lon: 34.77,   label: 'TEL AVIV',        isHQ: false },
  { id: 'bangalore',      lat: 12.97,  lon: 77.59,   label: 'BANGALORE',       isHQ: false },
  { id: 'tokyo',          lat: 35.68,  lon: 139.69,  label: 'TOKYO',           isHQ: false },
];

// Pre-computed conference clusters (static data, computed once)
const CONFERENCE_CLUSTERS = buildConferenceClusters(CONFERENCES);

// Layer color palette (RGBA arrays)
const LAYER_COLORS: Record<string, [number, number, number]> = {
  vendors:     [0, 212, 255],
  products:    [0, 168, 204],
  adoption:    [0, 255, 136],
  momentum:    [0, 204, 106],
  funding:     [255, 184, 0],
  patents:     [255, 184, 0],
  hiring:      [255, 100, 0],
  conferences: [255, 150, 50],
  health:      [0, 255, 136],
  risk:        [255, 59, 48],
};

// NAICS prefix → sector color + label for SAM businesses
const NAICS_SECTORS: Record<string, { color: [number, number, number]; label: string }> = {
  '33': { color: [255, 100, 0],   label: 'MANUFACTURING' },
  '31': { color: [255, 100, 0],   label: 'MANUFACTURING' },
  '32': { color: [255, 100, 0],   label: 'MANUFACTURING' },
  '54': { color: [0, 212, 255],   label: 'TECH / PROFESSIONAL' },
  '23': { color: [255, 184, 0],   label: 'CONSTRUCTION' },
  '22': { color: [0, 255, 136],   label: 'UTILITIES / ENERGY' },
  '49': { color: [255, 184, 0],   label: 'LOGISTICS' },
  '48': { color: [255, 184, 0],   label: 'LOGISTICS' },
  '62': { color: [255, 59, 48],   label: 'HEALTHCARE' },
  '61': { color: [0, 204, 255],   label: 'EDUCATION' },
  '56': { color: [120, 120, 140], label: 'ADMIN / SUPPORT' },
  '42': { color: [255, 150, 50],  label: 'WHOLESALE' },
  '52': { color: [255, 215, 0],   label: 'FINANCE' },
  '53': { color: [200, 160, 120], label: 'REAL ESTATE' },
  '44': { color: [180, 120, 60],  label: 'RETAIL' },
  '45': { color: [180, 120, 60],  label: 'RETAIL' },
  '51': { color: [0, 180, 220],   label: 'INFORMATION' },
  '92': { color: [100, 160, 220], label: 'GOVERNMENT' },
  '72': { color: [220, 140, 180], label: 'HOSPITALITY' },
};

// Deduplicated legend entries (unique label+color combos)
const NAICS_LEGEND = Array.from(
  new Map(
    Object.values(NAICS_SECTORS).map((s) => [s.label, s.color])
  ).entries() as Iterable<[string, [number, number, number]]>,
);

// Activity blink color map — distinct colors per activity type
const ACTIVITY_COLORS: Record<string, { color: [number, number, number]; label: string }> = {
  contract: { color: [0, 255, 136], label: 'CONTRACT WON' },    // green
  research: { color: [0, 212, 255], label: 'RESEARCH / SBIR' }, // cyan
};

function getNaicsColor(primaryNaics: string): [number, number, number] {
  const prefix2 = primaryNaics.slice(0, 2);
  return NAICS_SECTORS[prefix2]?.color ?? [100, 180, 255]; // default light blue
}

function getNaicsSectorLabel(primaryNaics: string): string {
  const prefix2 = primaryNaics.slice(0, 2);
  return NAICS_SECTORS[prefix2]?.label ?? 'OTHER';
}

// Re-export shared types for backward compatibility
export type { MapPoint, LayerApiResponse } from '@/types/map';
import type { MapPoint, LayerApiResponse } from '@/types/map';

type Landmark = { id: string; lat: number; lon: number; label: string };

// Named zones — visible from city zoom level
const LANDMARKS: Landmark[] = [
  { id: 'bliss',   lat: 31.822, lon: -106.415, label: 'FORT BLISS' },
  { id: 'utep',    lat: 31.773, lon: -106.502, label: 'UTEP' },
  { id: 'airport', lat: 31.806, lon: -106.378, label: "INT'L AIRPORT" },
  { id: 'border',  lat: 31.746, lon: -106.483, label: 'JUAREZ / BORDER' },
  { id: 'medical', lat: 31.768, lon: -106.498, label: 'MEDICAL CENTER' },
  { id: 'east',    lat: 31.696, lon: -106.174, label: 'HORIZON CITY' },
];

// Auto-generated vendor stubs from the authoritative EL_PASO_VENDORS database.
// Only includes EP-metro vendors (lat 31.5–32.1), excludes national `ind-*` entries.
// Curated multi-layer stubs (products, hiring, news, patents, etc.) are kept below.
const AUTO_VENDOR_STUBS: MapPoint[] = Object.values(EL_PASO_VENDORS)
  .filter(v => v.id.startsWith('ep-') && v.lat >= 31.5 && v.lat <= 32.1)
  .map(v => ({
    id: v.id,
    lat: v.lat,
    lon: v.lon,
    label: v.name,
    category: v.category,
    layer: v.layer,
    weight: v.weight,
    confidence: v.confidence,
    entity_id: v.id,
  }));

// Curated multi-layer stubs — editorial intelligence (products, hiring, news, patents, etc.)
const CURATED_STUBS: MapPoint[] = [
  // ── Products Layer — key product lines / offerings in El Paso ─────────────
  { id: 'ep-prod-patriot',    lat: 31.8130, lon: -106.4080, label: 'Patriot PAC-3 MSE',     category: 'Missile Systems',   layer: 'products', weight: 0.92, confidence: 0.95, entity_id: 'ep-raytheon'    },
  { id: 'ep-prod-c4isr',      lat: 31.8078, lon: -106.4180, label: 'C4ISR Platforms',        category: 'ISR Systems',       layer: 'products', weight: 0.88, confidence: 0.93, entity_id: 'ep-l3harris'    },
  { id: 'ep-prod-ivas',       lat: 31.8095, lon: -106.4128, label: 'IVAS Headset',           category: 'Augmented Reality', layer: 'products', weight: 0.85, confidence: 0.90, entity_id: 'ep-l3harris'    },
  { id: 'ep-prod-benchmark',  lat: 31.7408, lon: -106.5115, label: 'Contract Mfg (EMS)',     category: 'Electronics Mfg',   layer: 'products', weight: 0.72, confidence: 0.82, entity_id: 'ep-benchmark'   },
  { id: 'ep-prod-aptiv',      lat: 31.7360, lon: -106.5158, label: 'Vehicle Wire Harness',   category: 'Auto Components',   layer: 'products', weight: 0.68, confidence: 0.78, entity_id: 'ep-aptiv'       },
  { id: 'ep-prod-honeywell',  lat: 31.7430, lon: -106.5075, label: 'Turbocharger Systems',   category: 'Turbomachinery',    layer: 'products', weight: 0.74, confidence: 0.83, entity_id: 'ep-honeywell'   },
  { id: 'ep-prod-desal',      lat: 31.7588, lon: -106.4535, label: 'Inland Desalination',    category: 'Water Treatment',   layer: 'products', weight: 0.75, confidence: 0.85, entity_id: 'ep-desal'       },
  { id: 'ep-prod-solar',      lat: 31.7220, lon: -106.2478, label: 'Utility-Scale Solar',    category: 'Solar Energy',      layer: 'products', weight: 0.70, confidence: 0.82, entity_id: 'ep-nextera'     },
  { id: 'ep-prod-epe-grid',   lat: 31.7608, lon: -106.4615, label: 'Grid Modernization',     category: 'Grid Tech',         layer: 'products', weight: 0.80, confidence: 0.88, entity_id: 'ep-epe'         },
  { id: 'ep-prod-foxconn',    lat: 31.7388, lon: -106.5135, label: 'PCB Assembly Line',      category: 'Electronics Mfg',   layer: 'products', weight: 0.65, confidence: 0.76, entity_id: 'ep-foxconn'     },
  { id: 'ep-prod-umc-ehr',    lat: 31.7638, lon: -106.4985, label: 'Epic EHR Platform',      category: 'Health IT',         layer: 'products', weight: 0.72, confidence: 0.85, entity_id: 'ep-umc'         },
  { id: 'ep-prod-mesaai',     lat: 31.7588, lon: -106.4845, label: 'Predictive Analytics',   category: 'AI Platform',       layer: 'products', weight: 0.58, confidence: 0.72, entity_id: 'ep-mesaai'      },
  { id: 'ep-prod-rioiot',     lat: 31.7628, lon: -106.4785, label: 'IoT Sensor Mesh',        category: 'IoT Platform',      layer: 'products', weight: 0.55, confidence: 0.68, entity_id: 'ep-rioiot'      },
  { id: 'ep-prod-gdit',       lat: 31.8112, lon: -106.4058, label: 'Army IT Modernization',  category: 'IT Services',       layer: 'products', weight: 0.80, confidence: 0.87, entity_id: 'ep-gdit'        },
  { id: 'ep-prod-saic',       lat: 31.8100, lon: -106.4130, label: 'GCSS-Army Platform',     category: 'Logistics IT',      layer: 'products', weight: 0.85, confidence: 0.90, entity_id: 'ep-saic'        },
  { id: 'ep-prod-leidos',     lat: 31.8068, lon: -106.4148, label: 'Endurance UAV',          category: 'Unmanned Systems',  layer: 'products', weight: 0.82, confidence: 0.88, entity_id: 'ep-leidos'      },
  // ── Hiring Layer — active hiring signals ──────────────────────────────────
  { id: 'ep-hire-l3harris',   lat: 31.8085, lon: -106.4168, label: 'L3Harris — 45 openings', category: 'Defense',       layer: 'hiring', weight: 0.90, confidence: 0.92, entity_id: 'ep-l3harris'  },
  { id: 'ep-hire-raytheon',   lat: 31.8128, lon: -106.4085, label: 'RTX — 32 openings',      category: 'Defense',       layer: 'hiring', weight: 0.88, confidence: 0.91, entity_id: 'ep-raytheon'  },
  { id: 'ep-hire-saic',       lat: 31.8098, lon: -106.4128, label: 'SAIC — 28 openings',     category: 'Defense IT',    layer: 'hiring', weight: 0.85, confidence: 0.89, entity_id: 'ep-saic'      },
  { id: 'ep-hire-leidos',     lat: 31.8070, lon: -106.4148, label: 'Leidos — 22 openings',   category: 'Defense IT',    layer: 'hiring', weight: 0.82, confidence: 0.87, entity_id: 'ep-leidos'    },
  { id: 'ep-hire-boozallen',  lat: 31.8092, lon: -106.4115, label: 'Booz Allen — 18 openings',category: 'Consulting',   layer: 'hiring', weight: 0.84, confidence: 0.88, entity_id: 'ep-boozallen' },
  { id: 'ep-hire-amazon',     lat: 31.6958, lon: -106.1735, label: 'Amazon — 120 openings',  category: 'Logistics',     layer: 'hiring', weight: 0.85, confidence: 0.90, entity_id: 'ep-amazon'    },
  { id: 'ep-hire-fedex',      lat: 31.7970, lon: -106.3775, label: 'FedEx — 35 openings',    category: 'Logistics',     layer: 'hiring', weight: 0.75, confidence: 0.85, entity_id: 'ep-fedex'     },
  { id: 'ep-hire-benchmark',  lat: 31.7405, lon: -106.5118, label: 'Benchmark — 15 openings',category: 'Manufacturing',layer: 'hiring', weight: 0.70, confidence: 0.80, entity_id: 'ep-benchmark' },
  { id: 'ep-hire-umc',        lat: 31.7635, lon: -106.4988, label: 'UMC — 50 openings',      category: 'Healthcare',    layer: 'hiring', weight: 0.78, confidence: 0.88, entity_id: 'ep-umc'       },
  { id: 'ep-hire-tenet',      lat: 31.7682, lon: -106.4918, label: 'Sierra Prov. — 25 open', category: 'Healthcare',    layer: 'hiring', weight: 0.72, confidence: 0.84, entity_id: 'ep-tenet'     },
  { id: 'ep-hire-epe',        lat: 31.7605, lon: -106.4618, label: 'EP Electric — 12 open',  category: 'Energy',        layer: 'hiring', weight: 0.68, confidence: 0.82, entity_id: 'ep-epe'       },
  { id: 'ep-hire-alorica',    lat: 31.7552, lon: -106.4818, label: 'Alorica — 80 openings',  category: 'Enterprise IT', layer: 'hiring', weight: 0.70, confidence: 0.80, entity_id: 'ep-alorica'   },
  { id: 'ep-hire-gdit',       lat: 31.8110, lon: -106.4060, label: 'GDIT — 20 openings',     category: 'Defense IT',    layer: 'hiring', weight: 0.80, confidence: 0.86, entity_id: 'ep-gdit'      },
  // ── News Layer — recent news activity by neighborhood ─────────────────────
  { id: 'ep-news-defense-contract',  lat: 31.8118, lon: -106.4145, label: 'Defense Contract News',       category: 'Defense News',       layer: 'news', weight: 0.78, confidence: 0.82, entity_id: 'ep-l3harris'   },
  { id: 'ep-news-fort-bliss-budget', lat: 31.8075, lon: -106.4200, label: 'Fort Bliss Budget Report',    category: 'Defense News',       layer: 'news', weight: 0.72, confidence: 0.78, entity_id: 'ep-raytheon'   },
  { id: 'ep-news-ivas-milestone',    lat: 31.8092, lon: -106.4102, label: 'IVAS Program Milestone',      category: 'Defense News',       layer: 'news', weight: 0.75, confidence: 0.80, entity_id: 'ep-boeing'     },
  { id: 'ep-news-border-security',   lat: 31.7518, lon: -106.4862, label: 'Border Security Report',      category: 'Border News',        layer: 'news', weight: 0.80, confidence: 0.85, entity_id: 'ep-crossingiq' },
  { id: 'ep-news-trade-volume',      lat: 31.7498, lon: -106.4812, label: 'Cross-Border Trade Volume',   category: 'Border News',        layer: 'news', weight: 0.70, confidence: 0.75, entity_id: 'ep-portlogic'  },
  { id: 'ep-news-utep-grant',        lat: 31.7718, lon: -106.5055, label: 'UTEP Research Grant',         category: 'Tech News',          layer: 'news', weight: 0.65, confidence: 0.72, entity_id: 'ep-utep-ai'    },
  { id: 'ep-news-utep-cyber',        lat: 31.7698, lon: -106.5018, label: 'Cybersecurity Alert',         category: 'Tech News',          layer: 'news', weight: 0.68, confidence: 0.74, entity_id: 'ep-utep-cyber' },
  { id: 'ep-news-energy-grid',       lat: 31.7608, lon: -106.4628, label: 'Energy Grid Update',          category: 'Energy News',        layer: 'news', weight: 0.73, confidence: 0.79, entity_id: 'ep-epe'        },
  { id: 'ep-news-solar-expansion',   lat: 31.7210, lon: -106.2495, label: 'Solar Farm Expansion',        category: 'Energy News',        layer: 'news', weight: 0.70, confidence: 0.76, entity_id: 'ep-nextera'    },
  { id: 'ep-news-mfg-expansion',     lat: 31.7415, lon: -106.5105, label: 'Manufacturing Expansion',     category: 'Manufacturing News', layer: 'news', weight: 0.67, confidence: 0.73, entity_id: 'ep-benchmark'  },
  { id: 'ep-news-supply-chain',      lat: 31.7368, lon: -106.5148, label: 'Supply Chain Disruption',     category: 'Manufacturing News', layer: 'news', weight: 0.72, confidence: 0.77, entity_id: 'ep-aptiv'      },
  { id: 'ep-news-airport-freight',   lat: 31.7975, lon: -106.3768, label: 'Airport Freight Record',      category: 'Logistics News',     layer: 'news', weight: 0.69, confidence: 0.75, entity_id: 'ep-fedex'      },
  { id: 'ep-news-downtown-tech',     lat: 31.7572, lon: -106.4858, label: 'Downtown Tech Hub Funding',   category: 'Tech News',          layer: 'news', weight: 0.62, confidence: 0.70, entity_id: 'ep-mesaai'     },
  { id: 'ep-news-water-accord',      lat: 31.7590, lon: -106.4548, label: 'Water Rights Accord',         category: 'Infrastructure News',layer: 'news', weight: 0.65, confidence: 0.71, entity_id: 'ep-desal'      },
  { id: 'ep-news-amazon-logistics',  lat: 31.6962, lon: -106.1728, label: 'Amazon Logistics Expansion',  category: 'Logistics News',     layer: 'news', weight: 0.76, confidence: 0.83, entity_id: 'ep-amazon'     },
  // ── Patents Layer — USPTO filings from El Paso entities ──────────────────
  { id: 'ep-pat-patriot-guid',  lat: 31.8122, lon: -106.4098, label: 'Patriot Guidance System',    category: 'Defense Patent',    layer: 'patents', weight: 0.88, confidence: 0.90, entity_id: 'ep-raytheon'  },
  { id: 'ep-pat-radar-sig',     lat: 31.8108, lon: -106.4112, label: 'Radar Signal Processing',    category: 'Defense Patent',    layer: 'patents', weight: 0.85, confidence: 0.87, entity_id: 'ep-raytheon'  },
  { id: 'ep-pat-ew-counter',    lat: 31.8075, lon: -106.4188, label: 'EW Countermeasures',         category: 'Defense Patent',    layer: 'patents', weight: 0.82, confidence: 0.86, entity_id: 'ep-l3harris'  },
  { id: 'ep-pat-isr-fusion',    lat: 31.8090, lon: -106.4165, label: 'ISR Data Fusion',            category: 'Defense Patent',    layer: 'patents', weight: 0.80, confidence: 0.84, entity_id: 'ep-l3harris'  },
  { id: 'ep-pat-cyber-threat',  lat: 31.8100, lon: -106.4070, label: 'Cyber Threat Detection',     category: 'Defense Patent',    layer: 'patents', weight: 0.78, confidence: 0.82, entity_id: 'ep-saic'      },
  { id: 'ep-pat-autonav',       lat: 31.8062, lon: -106.4148, label: 'Autonomous Navigation',      category: 'Defense Patent',    layer: 'patents', weight: 0.75, confidence: 0.80, entity_id: 'ep-leidos'    },
  { id: 'ep-pat-desal-mem',     lat: 31.7718, lon: -106.5068, label: 'Desalination Membrane',      category: 'Water Tech Patent', layer: 'patents', weight: 0.72, confidence: 0.78, entity_id: 'ep-utep-mfg' },
  { id: 'ep-pat-ai-drug',       lat: 31.7702, lon: -106.5042, label: 'AI Drug Discovery',          category: 'BioTech Patent',    layer: 'patents', weight: 0.70, confidence: 0.76, entity_id: 'ep-utep-ai'  },
  { id: 'ep-pat-additive-mfg',  lat: 31.7685, lon: -106.5055, label: 'Additive Manufacturing',    category: 'Mfg Patent',        layer: 'patents', weight: 0.68, confidence: 0.74, entity_id: 'ep-utep-mfg' },
  { id: 'ep-pat-water-reclaim', lat: 31.7735, lon: -106.4902, label: 'Water Reclamation Process',  category: 'Water Tech Patent', layer: 'patents', weight: 0.75, confidence: 0.82, entity_id: 'ep-epwater'  },
  { id: 'ep-pat-pcb-assembly',  lat: 31.7395, lon: -106.5125, label: 'PCB Assembly Method',        category: 'Mfg Patent',        layer: 'patents', weight: 0.65, confidence: 0.72, entity_id: 'ep-benchmark'},
  // ── Adoption Layer — active tech adoption programs ────────────────────────
  { id: 'ep-adopt-amazon',     lat: 31.6950, lon: -106.1740, label: 'Amazon FC — Robotics Rollout',    category: 'Robotics',        layer: 'adoption', weight: 0.82, confidence: 0.88, entity_id: 'ep-amazon'    },
  { id: 'ep-adopt-benchmark',  lat: 31.7400, lon: -106.5122, label: 'Benchmark — Industry 4.0',        category: 'Manufacturing',   layer: 'adoption', weight: 0.75, confidence: 0.84, entity_id: 'ep-benchmark' },
  { id: 'ep-adopt-umc',        lat: 31.7630, lon: -106.4990, label: 'UMC — Telemedicine Platform',     category: 'Health Tech',     layer: 'adoption', weight: 0.78, confidence: 0.85, entity_id: 'ep-umc'       },
  { id: 'ep-adopt-epwater',    lat: 31.7730, lon: -106.4910, label: 'EP Water — Smart Meters',         category: 'Water Tech',      layer: 'adoption', weight: 0.72, confidence: 0.82, entity_id: 'ep-epwater'   },
  { id: 'ep-adopt-utep',       lat: 31.7715, lon: -106.5060, label: 'UTEP — AI Lab Expansion',         category: 'AI / ML',         layer: 'adoption', weight: 0.68, confidence: 0.79, entity_id: 'ep-utep-ai'   },
  { id: 'ep-adopt-epe',        lat: 31.7605, lon: -106.4618, label: 'EP Electric — Grid AI Pilot',     category: 'Energy Tech',     layer: 'adoption', weight: 0.76, confidence: 0.83, entity_id: 'ep-epe'       },
  { id: 'ep-adopt-fedex',      lat: 31.7968, lon: -106.3782, label: 'FedEx — Route Optimization AI',   category: 'Logistics Tech',  layer: 'adoption', weight: 0.80, confidence: 0.87, entity_id: 'ep-fedex'     },
  { id: 'ep-adopt-ttuhsc',     lat: 31.7658, lon: -106.5042, label: 'TTUHSC — Clinical AI Rollout',    category: 'Health Tech',     layer: 'adoption', weight: 0.65, confidence: 0.78, entity_id: 'ep-ttuhsc'    },
  { id: 'ep-adopt-cbpass',     lat: 31.7538, lon: -106.4818, label: 'CBPASS — Biometric Expansion',    category: 'Border Tech',     layer: 'adoption', weight: 0.70, confidence: 0.80, entity_id: 'ep-cbpass'    },
  { id: 'ep-adopt-honeywell',  lat: 31.7428, lon: -106.5080, label: 'Honeywell — Connected Factory',   category: 'Manufacturing',   layer: 'adoption', weight: 0.73, confidence: 0.82, entity_id: 'ep-honeywell' },
  // ── Health Layer — IKER health scores (high weight = healthy score) ───────
  { id: 'ep-hlth-l3harris',    lat: 31.8082, lon: -106.4170, label: 'L3Harris — IKER 92',              category: 'Defense',         layer: 'health',   weight: 0.92, confidence: 0.95, entity_id: 'ep-l3harris'  },
  { id: 'ep-hlth-raytheon',    lat: 31.8125, lon: -106.4088, label: 'Raytheon — IKER 90',              category: 'Defense',         layer: 'health',   weight: 0.90, confidence: 0.94, entity_id: 'ep-raytheon'  },
  { id: 'ep-hlth-saic',        lat: 31.8095, lon: -106.4132, label: 'SAIC — IKER 88',                  category: 'Defense IT',      layer: 'health',   weight: 0.88, confidence: 0.91, entity_id: 'ep-saic'      },
  { id: 'ep-hlth-boeing',      lat: 31.8135, lon: -106.4048, label: 'Boeing Defense — IKER 86',        category: 'Defense',         layer: 'health',   weight: 0.86, confidence: 0.92, entity_id: 'ep-boeing'    },
  { id: 'ep-hlth-boozallen',   lat: 31.8090, lon: -106.4118, label: 'Booz Allen — IKER 84',            category: 'Consulting',      layer: 'health',   weight: 0.84, confidence: 0.89, entity_id: 'ep-boozallen' },
  { id: 'ep-hlth-leidos',      lat: 31.8065, lon: -106.4152, label: 'Leidos — IKER 83',                category: 'Defense IT',      layer: 'health',   weight: 0.83, confidence: 0.90, entity_id: 'ep-leidos'    },
  { id: 'ep-hlth-nextera',     lat: 31.7215, lon: -106.2482, label: 'NextEra — IKER 81',               category: 'Energy',          layer: 'health',   weight: 0.81, confidence: 0.87, entity_id: 'ep-nextera'   },
  { id: 'ep-hlth-amazon',      lat: 31.6952, lon: -106.1738, label: 'Amazon FC — IKER 80',             category: 'Logistics',       layer: 'health',   weight: 0.80, confidence: 0.88, entity_id: 'ep-amazon'    },
  { id: 'ep-hlth-epwater',     lat: 31.7732, lon: -106.4908, label: 'EP Water — IKER 78',              category: 'Water Tech',      layer: 'health',   weight: 0.78, confidence: 0.86, entity_id: 'ep-epwater'   },
  { id: 'ep-hlth-umc',         lat: 31.7632, lon: -106.4988, label: 'UMC — IKER 75',                   category: 'Health Tech',     layer: 'health',   weight: 0.75, confidence: 0.85, entity_id: 'ep-umc'       },
  // ── Risk Layer — IKER risk indicators (lower weight = higher risk) ────────
  { id: 'ep-risk-foxconn',     lat: 31.7382, lon: -106.5140, label: 'Foxconn EP — Supply Chain Risk',  category: 'Manufacturing',   layer: 'risk',     weight: 0.62, confidence: 0.76, entity_id: 'ep-foxconn'   },
  { id: 'ep-risk-bordertech',  lat: 31.7525, lon: -106.4880, label: 'BorderTech — Funding Gap',        category: 'Border Tech',     layer: 'risk',     weight: 0.55, confidence: 0.70, entity_id: 'ep-bordertech'},
  { id: 'ep-risk-aptiv',       lat: 31.7355, lon: -106.5162, label: 'Aptiv EP — Labor Turnover',       category: 'Manufacturing',   layer: 'risk',     weight: 0.58, confidence: 0.72, entity_id: 'ep-aptiv'     },
  { id: 'ep-risk-aridtech',    lat: 31.7612, lon: -106.4872, label: 'AridTech — Revenue Shortfall',    category: 'Water Tech',      layer: 'risk',     weight: 0.52, confidence: 0.68, entity_id: 'ep-aridtech'  },
  { id: 'ep-risk-rioiot',      lat: 31.7622, lon: -106.4790, label: 'Rio IoT — Contract Pipeline Thin',category: 'IoT',             layer: 'risk',     weight: 0.50, confidence: 0.65, entity_id: 'ep-rioiot'    },
  { id: 'ep-risk-portlogic',   lat: 31.7490, lon: -106.4750, label: 'PortLogic — Regulatory Exposure', category: 'Logistics',       layer: 'risk',     weight: 0.60, confidence: 0.73, entity_id: 'ep-portlogic' },
  { id: 'ep-risk-cbpass',      lat: 31.7535, lon: -106.4820, label: 'CBPASS — Integration Delays',     category: 'Border Tech',     layer: 'risk',     weight: 0.57, confidence: 0.71, entity_id: 'ep-cbpass'    },
  { id: 'ep-risk-sunpower',    lat: 31.7178, lon: -106.2540, label: 'SunPower — Margin Compression',   category: 'Energy',          layer: 'risk',     weight: 0.65, confidence: 0.75, entity_id: 'ep-sunpower'  },
];

// Combined stubs — auto-generated vendors + curated multi-layer intel
const EL_PASO_STUBS: MapPoint[] = [...AUTO_VENDOR_STUBS, ...CURATED_STUBS];

export type FlyToTarget = { longitude: number; latitude: number; zoom: number };

export type FlightCategory = 'VIP' | 'MILITARY' | 'CARGO' | 'COMMERCIAL' | 'PRIVATE';
export type FlightPhase = 'CLIMBING' | 'DESCENDING' | 'CRUISING';

export type FlightPoint = {
  id: string;          // ICAO24 hex
  callsign: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  velocityKts: number;
  headingDeg: number;
  verticalFpm: number; // ft/min (+ climb, − descend)
  phase: FlightPhase;
  squawk: string;      // transponder code
  country: string;
  isMilitary: boolean;
  category: FlightCategory;
  operator: string;
  approachingELP: boolean;
  trail: Array<[number, number]>;  // recent [lon, lat] positions
};

// Inline airplane SVG — top-down silhouette pointing north, white fill for mask tinting
const AIRPLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 4 L28 24 L12 32 L14 36 L28 34 L30 50 L24 56 L24 60 L32 58 L40 60 L40 56 L34 50 L36 34 L50 36 L52 32 L36 24 Z" fill="white"/></svg>`;
const AIRPLANE_ICON_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AIRPLANE_SVG)}`;

// Per-category colors [R, G, B]
const FLIGHT_COLORS: Record<FlightCategory, [number, number, number]> = {
  VIP:        [255, 0, 128],    // magenta
  MILITARY:   [255, 100, 0],    // orange
  CARGO:      [120, 120, 140],  // muted steel
  COMMERCIAL: [255, 184, 0],    // gold
  PRIVATE:    [80, 80, 100],    // dim slate
};

// Only VIP + military get pulsing rings
const PULSING_CATEGORIES = new Set<FlightCategory>(['VIP', 'MILITARY']);

export type SeismicPoint = {
  id: string;
  lat: number;
  lon: number;
  magnitude: number;
  depth: number;
  place: string;
  time: number;
};

export type BorderCrossingPoint = {
  port: string;
  portCode: string;
  measure: string;
  value: number;
  date: string;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
};

// Enriched border port item — built inside useMemo for deck.gl data arrays
type BorderPortItem = {
  port: string;
  portCode: string;
  trucks: number;
  trend: 'up' | 'down' | 'flat';
  commercialWaitMin: number;
  severity: 'low' | 'moderate' | 'high' | 'unknown';
  commercialLanesOpen: number;
  commercialLanesTotal: number;
};

export type CrimeHotspot = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  activityLevel: 'low' | 'moderate' | 'high';
  articleCount: number;
};

export type ContractPoint = {
  id: string;
  source: 'usaspending' | 'sbir' | 'sam';
  vendor: string;
  title: string;
  amount: number | null;
  agency: string;
  type: 'award' | 'solicitation' | 'grant';
  lat: number;
  lon: number;
};

export type DisruptionMapPoint = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  category: string;
  impact: string;
  date: string;
  companies: string[];
};

export type BusinessActivity = 'none' | 'contract' | 'research';

export type SamBusinessPoint = {
  id: string;              // UEI
  name: string;            // legalBusinessName
  cageCode: string;
  naicsCodes: string[];
  primaryNaics: string;
  naicsDescription: string;
  isSmallBusiness: boolean;
  website: string;
  address: string;         // formatted "123 Main St, El Paso, TX 79901"
  lat: number;
  lon: number;
  activity: BusinessActivity;  // contract = won contract (green blink), research = SBIR/grant (cyan blink)
  activityLabel?: string;      // e.g. "$47M Army Contract" or "Phase II SBIR"
};

type Props = {
  activeLayers: Set<string>;
  timeRange: number;
  onVendorSelect: (point: MapPoint | null) => void;
  onConferenceSelect?: (c: ConferenceRecord | null) => void;
  onClusterSelect?: (cluster: ConferenceCluster) => void;
  onPointCountChange?: (count: number) => void;
  flyTo?: FlyToTarget;
  initialViewState?: { longitude: number; latitude: number; zoom: number };
  onViewStateChange?: (vs: { longitude: number; latitude: number; zoom: number }) => void;
  flights?: FlightPoint[];
  seismicEvents?: SeismicPoint[];
  activeVendorIds?: string[];
  borderCrossings?: BorderCrossingPoint[];
  borderWaitTimes?: PortWaitTime[];
  crimeHotspots?: CrimeHotspot[];
  disruptionPoints?: DisruptionMapPoint[];
  contracts?: ContractPoint[];
  samBusinesses?: SamBusinessPoint[];
  countrySignalCounts?: Record<string, number>;
  intelSignalPoints?: IntelSignalMapPoint[];
};

type ViewState = typeof INITIAL_VIEW;

const SIGNAL_TYPE_COLORS: Record<string, [number, number, number]> = {
  funding_round:      [255, 184, 0],
  merger_acquisition: [249, 115, 22],
  contract_award:     [0, 255, 136],
  patent_filing:      [0, 212, 255],
  research_paper:     [168, 85, 247],
  hiring_signal:      [255, 100, 0],
  product_launch:     [0, 212, 255],
  regulatory_action:  [255, 184, 0],
  facility_expansion: [0, 255, 136],
  case_study:         [100, 180, 255],
};

export function MapCanvas({ activeLayers, timeRange, onVendorSelect, onConferenceSelect, onClusterSelect, onPointCountChange, flyTo, initialViewState, onViewStateChange, flights = [], seismicEvents = [], activeVendorIds = [], borderCrossings = [], borderWaitTimes = [], crimeHotspots = [], disruptionPoints = [], contracts = [], samBusinesses = [], countrySignalCounts = {}, intelSignalPoints = [] }: Props) {
  const [points, setPoints] = useState<MapPoint[]>(EL_PASO_STUBS);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState<ViewState>(() => ({
    ...INITIAL_VIEW,
    ...(initialViewState ?? {}),
  }));
  const viewChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastInteractionRef = useRef(Date.now());
  const isIdleRef = useRef(false);
  const [isIdle, setIsIdle] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: MapPoint } | null>(null);
  const [borderTooltip, setBorderTooltip] = useState<{ x: number; y: number; item: BorderPortItem } | null>(null);
  const [flightTooltip, setFlightTooltip] = useState<{ x: number; y: number; flight: FlightPoint } | null>(null);
  const [contractTooltip, setContractTooltip] = useState<{ x: number; y: number; contract: ContractPoint } | null>(null);
  const [samBizTooltip, setSamBizTooltip] = useState<{ x: number; y: number; biz: SamBusinessPoint } | null>(null);
  const [confTooltip, setConfTooltip] = useState<{
    x: number; y: number;
    cluster?: ConferenceCluster;
    conference?: ConferenceRecord;
  } | null>(null);

  // Fly to preset region when flyTo prop changes reference
  useEffect(() => {
    if (!flyTo) return;
    setViewState((prev) => ({ ...prev, ...flyTo, pitch: 0, bearing: 0 }));
  }, [flyTo]);

  // Pulse animation loop — auto-pauses after 2min idle to save CPU
  const startAnimation = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      if (Date.now() - lastInteractionRef.current > 120_000) {
        isIdleRef.current = true;
        setIsIdle(true);
        return; // stop RAF — restarted by interaction handler
      }
      setPulsePhase(((ts - start) % 2000) / 2000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    startAnimation();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startAnimation]);

  // Restart animation on user interaction
  useEffect(() => {
    const resetIdle = () => {
      lastInteractionRef.current = Date.now();
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
        startAnimation();
      }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const ev of events) window.addEventListener(ev, resetIdle, { passive: true });
    return () => {
      for (const ev of events) window.removeEventListener(ev, resetIdle);
    };
  }, [startAnimation]);

  // Fetch live signals (funding/patents) from Next.js API, always merged with stubs
  useEffect(() => {
    if (activeLayers.size === 0) {
      setPoints([]);
      onPointCountChange?.(0);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const layerList = Array.from(activeLayers).join(',');

    fetch(`/api/map/layers?timeRange=${timeRange}&layers=${layerList}`)
      .then((r) => r.json())
      .then((data: LayerApiResponse) => {
        if (cancelled) return;
        // Always show curated stubs + any live points returned by the API
        const live = Array.isArray(data.points) ? data.points : [];
        const combined = [...EL_PASO_STUBS, ...live];
        setPoints(combined);
        onPointCountChange?.(combined.length);
      })
      .catch(() => {
        if (!cancelled) { setPoints(EL_PASO_STUBS); onPointCountChange?.(EL_PASO_STUBS.length); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeLayers, timeRange, onPointCountChange]);

  const layers = useMemo((): Layer[] => {
    const grouped = new Map<string, MapPoint[]>();
    for (const p of points) {
      if (!activeLayers.has(p.layer)) continue;
      const bucket = grouped.get(p.layer) ?? [];
      bucket.push(p);
      grouped.set(p.layer, bucket);
    }

    const result: Layer[] = [];
    const activeVendorSet = new Set(activeVendorIds);

    // ── Live Flights (classified aircraft with airplane icons) ─────────
    const showFlights  = activeLayers.has('flights');
    const showMilitary = activeLayers.has('military');
    const visibleFlights = flights.filter((f) => {
      if (f.category === 'MILITARY' || f.category === 'VIP') return showMilitary;
      return showFlights;
    });

    if (visibleFlights.length > 0) {
      // Pulse ring for VIP + military only
      const pulsingFlights = visibleFlights.filter((f) => PULSING_CATEGORIES.has(f.category));
      if (pulsingFlights.length > 0) {
        result.push(
          new ScatterplotLayer({
            id: 'flights-pulse',
            data: pulsingFlights,
            getPosition: (d: FlightPoint) => [d.lon, d.lat] as [number, number],
            getRadius: (d: FlightPoint) => d.category === 'VIP' ? 1000 : 800,
            getFillColor: (d: FlightPoint) => {
              const c = FLIGHT_COLORS[d.category];
              return [c[0], c[1], c[2], Math.round(35 * (1 - pulsePhase))] as [number, number, number, number];
            },
            radiusUnits: 'meters',
            pickable: false,
            updateTriggers: { getFillColor: pulsePhase },
          }) as unknown as Layer,
        );
      }

      // Flight trail lines — fading path behind each aircraft
      const trailData = visibleFlights.filter((f) => f.trail.length >= 2);
      if (trailData.length > 0) {
        result.push(
          new PathLayer({
            id: 'flights-trail',
            data: trailData,
            getPath: (d: FlightPoint) => d.trail,
            getColor: (d: FlightPoint) => {
              const c = FLIGHT_COLORS[d.category];
              return [c[0], c[1], c[2], 60] as [number, number, number, number];
            },
            getWidth: 2,
            widthUnits: 'pixels',
            widthMinPixels: 1,
            capRounded: true,
            jointRounded: true,
            pickable: false,
          }) as unknown as Layer,
        );
      }

      // Airplane icon layer — rotates with heading, color-coded by category
      result.push(
        new IconLayer({
          id: 'flights-icon',
          data: visibleFlights,
          getPosition: (d: FlightPoint) => [d.lon, d.lat] as [number, number],
          getIcon: () => ({
            url: AIRPLANE_ICON_URL,
            width: 64,
            height: 64,
            anchorX: 32,
            anchorY: 32,
            mask: true,
          }),
          getSize: (d: FlightPoint) => {
            if (d.category === 'VIP') return 28;
            if (d.category === 'MILITARY') return 24;
            if (d.category === 'CARGO') return 22;
            if (d.category === 'COMMERCIAL') return 20;
            return 16;
          },
          getColor: (d: FlightPoint) => {
            const c = FLIGHT_COLORS[d.category];
            return [c[0], c[1], c[2], 230] as [number, number, number, number];
          },
          getAngle: (d: FlightPoint) => 360 - d.headingDeg,
          sizeUnits: 'pixels',
          sizeMinPixels: 10,
          sizeMaxPixels: 40,
          billboard: true,
          pickable: true,
        }) as unknown as Layer,
      );

      // Enhanced labels: CATEGORY | OPERATOR | CALLSIGN | ALT
      if (viewState.zoom >= 9) {
        result.push(
          new TextLayer({
            id: 'flights-labels',
            data: visibleFlights,
            getPosition: (d: FlightPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: FlightPoint) => {
              const cat = d.category === 'COMMERCIAL' ? 'COMM' : d.category;
              const approach = d.approachingELP ? ' APPROACH ELP' : '';
              return `${cat} · ${d.operator}${approach}\n${d.callsign}  ${d.altitudeFt.toLocaleString()}ft`;
            },
            getSize: 10,
            getColor: (d: FlightPoint) => {
              const c = FLIGHT_COLORS[d.category];
              return [c[0], c[1], c[2], 210] as [number, number, number, number];
            },
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 14] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 180] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── Seismic Events ────────────────────────────────────────────────────
    if (activeLayers.has('seismic') && seismicEvents.length > 0) {
      // Outer ring proportional to magnitude
      result.push(
        new ScatterplotLayer({
          id: 'seismic-ring',
          data: seismicEvents,
          getPosition: (d: SeismicPoint) => [d.lon, d.lat] as [number, number],
          getRadius: (d: SeismicPoint) => Math.pow(2, d.magnitude) * 400,
          getFillColor: () => [255, 59, 48, 20] as [number, number, number, number],
          getLineColor: () => [255, 59, 48, 180] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
        }) as unknown as Layer,
      );
      // Center dot
      result.push(
        new ScatterplotLayer({
          id: 'seismic-dot',
          data: seismicEvents,
          getPosition: (d: SeismicPoint) => [d.lon, d.lat] as [number, number],
          getRadius: () => 350,
          getFillColor: () => [255, 59, 48, 220] as [number, number, number, number],
          radiusUnits: 'meters',
          pickable: false,
        }) as unknown as Layer,
      );
      // Magnitude labels
      if (viewState.zoom >= 8) {
        result.push(
          new TextLayer({
            id: 'seismic-labels',
            data: seismicEvents,
            getPosition: (d: SeismicPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: SeismicPoint) => `M${d.magnitude.toFixed(1)}`,
            getSize: 10,
            getColor: [255, 59, 48, 210] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 10] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 170] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── Border Trade Crossing Volumes ─────────────────────────────────────
    if (activeLayers.has('borderTrade') && borderCrossings.length > 0) {
      const PORT_COORDS: Record<string, [number, number]> = {
        '2404': [-106.4797, 31.7454],
        '2406': [-106.2127, 31.6803],
        '2408': [-106.1495, 31.5013],
      };

      // Build O(1) wait-time lookup: portCode → PortWaitTime
      const waitMap = new Map(borderWaitTimes.map((w) => [w.portCode, w]));

      // Aggregate truck volume per port; enrich with wait info → BorderPortItem[]
      const portVolumes = new Map<string, BorderPortItem>();
      for (const c of borderCrossings) {
        const existing = portVolumes.get(c.portCode);
        const wait = waitMap.get(c.portCode);
        portVolumes.set(c.portCode, {
          port:     c.port,
          portCode: c.portCode,
          trucks:   (existing?.trucks ?? 0) + c.value,
          trend:    c.trend,
          commercialWaitMin:   wait?.commercialWaitMin   ?? 0,
          severity:            wait?.severity            ?? 'unknown',
          commercialLanesOpen: wait?.commercialLanesOpen ?? 0,
          commercialLanesTotal: wait?.commercialLanesTotal ?? 0,
        });
      }
      const portList = Array.from(portVolumes.values()).filter((p) => PORT_COORDS[p.portCode]);
      const maxTrucks = Math.max(...portList.map((p) => p.trucks), 1);

      // Severity → dot color (green / amber / red / default cyan)
      const severityColor = (sev: string, alpha: number): [number, number, number, number] => {
        if (sev === 'high')     return [255, 59,  48,  alpha];
        if (sev === 'moderate') return [255, 184, 0,   alpha];
        if (sev === 'low')      return [0,   255, 136, alpha];
        return [0, 212, 255, alpha];
      };

      // Outer glow ring — sized by truck volume, tinted by severity
      result.push(
        new ScatterplotLayer({
          id: 'border-ring',
          data: portList,
          getPosition: (d: BorderPortItem) => PORT_COORDS[d.portCode] as [number, number],
          getRadius: (d: BorderPortItem) => 800 + (d.trucks / maxTrucks) * 4200,
          getFillColor: (d: BorderPortItem) => severityColor(d.severity, 18),
          getLineColor: (d: BorderPortItem) => severityColor(d.severity, 140),
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
          updateTriggers: { getFillColor: borderWaitTimes, getLineColor: borderWaitTimes },
        }) as unknown as Layer,
      );

      // Solid dot — color-coded by wait severity, pickable for tooltip
      result.push(
        new ScatterplotLayer({
          id: 'border-dot',
          data: portList,
          getPosition: (d: BorderPortItem) => PORT_COORDS[d.portCode] as [number, number],
          getRadius: () => 400,
          getFillColor: (d: BorderPortItem) => severityColor(d.severity, 230),
          getLineColor: [255, 255, 255, 60] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: true,
          updateTriggers: { getFillColor: borderWaitTimes },
        }) as unknown as Layer,
      );

      // Port labels at zoom ≥ 9
      if (viewState.zoom >= 9) {
        result.push(
          new TextLayer({
            id: 'border-labels',
            data: portList,
            getPosition: (d: BorderPortItem) => PORT_COORDS[d.portCode] as [number, number],
            getText: (d: BorderPortItem) => `${(d.port ?? '').toUpperCase()}  ${d.trucks.toLocaleString()} trucks`,
            getSize: 10,
            getColor: [0, 212, 255, 200] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 12] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 180] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── Per-layer visual configuration ────────────────────────────────────
    // Each layer type gets its own dot size, stroke style, pulse behaviour,
    // and label threshold so they read as distinct at a glance.
    type LayerVisual = {
      // Dot geometry
      basePx: number;           // minimum dot radius in pixels
      weightPx: number;         // additional radius per weight unit (×weight)
      radiusUnits: 'pixels' | 'meters';
      filled: boolean;
      stroked: boolean;
      lineWidthPx: number;
      // Fill/stroke color overrides (null = use LAYER_COLORS)
      fillAlpha: number;
      strokeAlpha: number;
      // Pulse behaviour
      pulseType: 'none' | 'slow' | 'fast' | 'breathe' | 'fade';
      pulseScale: number;       // how far the ring expands (multiplier on pulsePhase)
      pulseFillAlpha: number;   // max fill alpha for pulse ring
      pulseStrokeAlpha: number; // max stroke alpha for pulse ring
      // Label zoom threshold
      labelZoom: number;        // zoom at which all labels show
      labelWeightZoom: number;  // zoom at which only weight > labelWeightMin shows
      labelWeightMin: number;   // minimum weight for early labels
    };

    const LAYER_VISUALS: Record<string, LayerVisual> = {
      // Solid cyan filled circles — the primary layer, always clearly identifiable
      vendors: {
        basePx: 5, weightPx: 9, radiusUnits: 'pixels', filled: true, stroked: true, lineWidthPx: 1,
        fillAlpha: 220, strokeAlpha: 80,
        pulseType: 'breathe', pulseScale: 0.6, pulseFillAlpha: 35, pulseStrokeAlpha: 120,
        labelZoom: 14, labelWeightZoom: 10, labelWeightMin: 0.8,
      },
      // Smaller, dimmer cyan ring — clearly sub-vendor, hollow look
      products: {
        basePx: 3, weightPx: 5, radiusUnits: 'pixels', filled: false, stroked: true, lineWidthPx: 1.5,
        fillAlpha: 0, strokeAlpha: 190,
        pulseType: 'none', pulseScale: 0, pulseFillAlpha: 0, pulseStrokeAlpha: 0,
        labelZoom: 14, labelWeightZoom: 12, labelWeightMin: 0.8,
      },
      // Orange hollow ring — clearly "demand signal", different shape from vendors
      hiring: {
        basePx: 4, weightPx: 6, radiusUnits: 'pixels', filled: false, stroked: true, lineWidthPx: 2,
        fillAlpha: 0, strokeAlpha: 200,
        pulseType: 'none', pulseScale: 0, pulseFillAlpha: 0, pulseStrokeAlpha: 0,
        labelZoom: 14, labelWeightZoom: 13, labelWeightMin: 0.85,
      },
      // Small dim cyan square-like dots — background noise layer
      news: {
        basePx: 3, weightPx: 3, radiusUnits: 'pixels', filled: true, stroked: false, lineWidthPx: 0,
        fillAlpha: 140, strokeAlpha: 0,
        pulseType: 'none', pulseScale: 0, pulseFillAlpha: 0, pulseStrokeAlpha: 0,
        labelZoom: 14, labelWeightZoom: 13, labelWeightMin: 0.9,
      },
      // Gold filled circles — funding/money signals, slightly larger than news
      funding: {
        basePx: 4, weightPx: 7, radiusUnits: 'pixels', filled: true, stroked: true, lineWidthPx: 1,
        fillAlpha: 200, strokeAlpha: 60,
        pulseType: 'slow', pulseScale: 1.2, pulseFillAlpha: 25, pulseStrokeAlpha: 100,
        labelZoom: 13, labelWeightZoom: 11, labelWeightMin: 0.7,
      },
      // Purple hollow ring — IP/patent, visually distinct from everything else
      patents: {
        basePx: 4, weightPx: 6, radiusUnits: 'pixels', filled: false, stroked: true, lineWidthPx: 1.5,
        fillAlpha: 0, strokeAlpha: 180,
        pulseType: 'slow', pulseScale: 0.8, pulseFillAlpha: 20, pulseStrokeAlpha: 80,
        labelZoom: 14, labelWeightZoom: 13, labelWeightMin: 0.85,
      },
      // Green-cyan solid dots — momentum/trending vendors
      momentum: {
        basePx: 4, weightPx: 6, radiusUnits: 'pixels', filled: true, stroked: true, lineWidthPx: 1,
        fillAlpha: 200, strokeAlpha: 60,
        pulseType: 'breathe', pulseScale: 0.5, pulseFillAlpha: 30, pulseStrokeAlpha: 100,
        labelZoom: 14, labelWeightZoom: 12, labelWeightMin: 0.75,
      },
      // Green pulsing ring — active adoption events
      adoption: {
        basePx: 4, weightPx: 7, radiusUnits: 'pixels', filled: true, stroked: true, lineWidthPx: 1,
        fillAlpha: 180, strokeAlpha: 100,
        pulseType: 'fade', pulseScale: 1.5, pulseFillAlpha: 50, pulseStrokeAlpha: 150,
        labelZoom: 13, labelWeightZoom: 11, labelWeightMin: 0.75,
      },
      // Traffic-light colored solid — health score encoded in color, not just weight
      health: {
        basePx: 5, weightPx: 8, radiusUnits: 'pixels', filled: true, stroked: true, lineWidthPx: 1,
        fillAlpha: 210, strokeAlpha: 80,
        pulseType: 'none', pulseScale: 0, pulseFillAlpha: 0, pulseStrokeAlpha: 0,
        labelZoom: 13, labelWeightZoom: 11, labelWeightMin: 0.8,
      },
      // Red fast pulse — danger signal, high visual urgency
      risk: {
        basePx: 5, weightPx: 7, radiusUnits: 'pixels', filled: true, stroked: true, lineWidthPx: 1.5,
        fillAlpha: 200, strokeAlpha: 120,
        pulseType: 'fast', pulseScale: 2.0, pulseFillAlpha: 60, pulseStrokeAlpha: 180,
        labelZoom: 12, labelWeightZoom: 10, labelWeightMin: 0.5,
      },
    };

    // Pulse phase derivations — different rhythms from the same 0-1 pulsePhase clock
    // slow: 0.5× speed (use phase squared for ease-out feel)
    // fast: 2× speed (use phase for linear expand)
    // breathe: sine-wave oscillation (no ring, just dot brightness modulation)
    // fade: ring fades from center outward
    const slowPhase  = Math.pow(pulsePhase, 1.5);                         // eased expand
    const fastPhase  = pulsePhase;                                         // linear
    const breatheAmt = 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2);   // 0→1→0
    const fadePhase  = pulsePhase;                                         // same but used for fade-in

    // Helper: get the correct animated phase for a pulse type
    const getPhaseForType = (type: LayerVisual['pulseType']): number => {
      if (type === 'slow')   return slowPhase;
      if (type === 'fast')   return fastPhase;
      if (type === 'fade')   return fadePhase;
      return pulsePhase; // breathe + none both reference base phase for update triggers
    };

    // Health layer: traffic-light color based on weight (>0.75=green, >0.55=amber, else red)
    const healthDotColor = (weight: number): [number, number, number] => {
      if (weight >= 0.75) return [0, 255, 136];    // green — healthy
      if (weight >= 0.55) return [255, 184, 0];    // amber — caution
      return                    [255, 59, 48];     // red — risk
    };

    for (const [layerName, pts] of Array.from(grouped.entries() as Iterable<[string, MapPoint[]]>)) {
      const baseColor = LAYER_COLORS[layerName] ?? ([100, 100, 100] as [number, number, number]);
      const vis = LAYER_VISUALS[layerName] ?? LAYER_VISUALS['vendors'];

      const activePhase = getPhaseForType(vis.pulseType);
      const pulseAlpha  = Math.max(0, 1 - activePhase); // ring fades as it expands

      // ── Active signal vendor strong amber pulse ring ──────────────────
      // Vendors in active signals glow amber with a fast, high-alpha ring
      // regardless of their base layer pulse type.
      const activePts = pts.filter((d) => d.entity_id && activeVendorSet.has(d.entity_id));
      if (activePts.length > 0) {
        result.push(
          new ScatterplotLayer({
            id: `active-signal-pulse-${layerName}`,
            data: activePts,
            getPosition: (d: MapPoint) => [d.lon, d.lat] as [number, number],
            getRadius: (d: MapPoint) => (vis.basePx + d.weight * vis.weightPx) * (1 + pulsePhase * 3.5),
            getFillColor: [255, 200, 0, Math.round(70 * (1 - pulsePhase))] as [number, number, number, number],
            getLineColor: [255, 200, 0, Math.round(220 * (1 - pulsePhase))] as [number, number, number, number],
            lineWidthMinPixels: 1.5,
            stroked: true,
            filled: true,
            radiusUnits: 'pixels',
            pickable: false,
            updateTriggers: { getRadius: pulsePhase, getFillColor: pulsePhase, getLineColor: pulsePhase },
          }) as unknown as Layer,
        );
      }

      // ── Pulse ring for layers that have a pulse type ──────────────────
      if (vis.pulseType !== 'none') {
        result.push(
          new ScatterplotLayer({
            id: `pulse-${layerName}`,
            data: pts,
            getPosition: (d: MapPoint) => [d.lon, d.lat] as [number, number],
            getRadius: (d: MapPoint) =>
              (vis.basePx + d.weight * vis.weightPx) * (1 + activePhase * vis.pulseScale),
            getFillColor: [...baseColor, Math.round(vis.pulseFillAlpha * pulseAlpha)] as [number, number, number, number],
            getLineColor: [...baseColor, Math.round(vis.pulseStrokeAlpha * pulseAlpha)] as [number, number, number, number],
            lineWidthMinPixels: 1,
            stroked: true,
            filled: true,
            radiusUnits: 'pixels',
            pickable: false,
            updateTriggers: { getRadius: activePhase, getFillColor: activePhase, getLineColor: activePhase },
          }) as unknown as Layer,
        );
      }

      // ── Base solid dot / ring ─────────────────────────────────────────
      result.push(
        new ScatterplotLayer({
          id: `base-${layerName}`,
          data: pts,
          getPosition: (d: MapPoint) => [d.lon, d.lat] as [number, number],
          getRadius: (d: MapPoint) => vis.basePx + d.weight * vis.weightPx,
          getFillColor: (d: MapPoint) => {
            // Active signal vendors get amber fill override
            if (d.entity_id && activeVendorSet.has(d.entity_id)) {
              return [255, 200, 0, 255] as [number, number, number, number];
            }
            // Health layer uses traffic-light color encoding
            if (layerName === 'health') {
              const hc = healthDotColor(d.weight);
              return [...hc, vis.fillAlpha] as [number, number, number, number];
            }
            // Breathe pulse modulates dot opacity slightly
            if (vis.pulseType === 'breathe') {
              const breatheAlpha = Math.round(vis.fillAlpha * (0.8 + 0.2 * breatheAmt));
              return [...baseColor, breatheAlpha] as [number, number, number, number];
            }
            return vis.filled
              ? ([...baseColor, vis.fillAlpha] as [number, number, number, number])
              : ([...baseColor, 0] as [number, number, number, number]);
          },
          getLineColor: (d: MapPoint) => {
            if (d.entity_id && activeVendorSet.has(d.entity_id)) {
              return [255, 200, 0, 200] as [number, number, number, number];
            }
            if (layerName === 'health') {
              const hc = healthDotColor(d.weight);
              return [...hc, vis.strokeAlpha] as [number, number, number, number];
            }
            return [...baseColor, vis.strokeAlpha] as [number, number, number, number];
          },
          lineWidthMinPixels: vis.lineWidthPx,
          stroked: vis.stroked,
          filled: true, // ScatterplotLayer requires filled=true; hollow look via getFillColor alpha=0
          radiusUnits: vis.radiusUnits,
          pickable: true,
          updateTriggers: {
            getFillColor: [activeVendorIds, vis.pulseType === 'breathe' ? breatheAmt : 0],
            getLineColor: activeVendorIds,
          },
        }) as unknown as Layer,
      );
    }

    // ── Company name labels — zoom and weight gated ────────────────────
    // Rendered as a single TextLayer per zoom threshold to avoid multiple
    // full-data passes. We bucket visible points into tiers here.
    const allVisible = points.filter((p) => activeLayers.has(p.layer));

    // Tier 1: high-weight labels visible early (zoom 10+, weight > 0.8)
    if (viewState.zoom >= 10) {
      const tier1 = allVisible.filter((p) => {
        const vis = LAYER_VISUALS[p.layer];
        return vis && viewState.zoom >= vis.labelWeightZoom && p.weight >= vis.labelWeightMin;
      });
      if (tier1.length > 0) {
        result.push(
          new TextLayer({
            id: 'labels-tier1',
            data: tier1,
            getPosition: (d: MapPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: MapPoint) => d.label,
            getSize: (d: MapPoint) => Math.round(9 + d.weight * 3), // 9–12px, weight-scaled
            getColor: (d: MapPoint) => {
              const c = LAYER_COLORS[d.layer] ?? [200, 200, 200];
              return [c[0], c[1], c[2], 220] as [number, number, number, number];
            },
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 'bold',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 12] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 200] as [number, number, number, number],
            backgroundPadding: [4, 2, 4, 2] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // Tier 2: medium-weight labels at zoom 12+ (weight 0.6–0.8)
    if (viewState.zoom >= 12) {
      const tier2 = allVisible.filter((p) => {
        const vis = LAYER_VISUALS[p.layer];
        if (!vis) return false;
        // Already shown in tier1, skip to avoid duplicate
        if (viewState.zoom >= vis.labelWeightZoom && p.weight >= vis.labelWeightMin) return false;
        return p.weight >= 0.6;
      });
      if (tier2.length > 0) {
        result.push(
          new TextLayer({
            id: 'labels-tier2',
            data: tier2,
            getPosition: (d: MapPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: MapPoint) => d.label,
            getSize: 10,
            getColor: (d: MapPoint) => {
              const c = LAYER_COLORS[d.layer] ?? [200, 200, 200];
              return [c[0], c[1], c[2], 185] as [number, number, number, number];
            },
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 12] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 195] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // Tier 3: all remaining labels at zoom 14+ (low weight / low-priority layers)
    if (viewState.zoom >= 14) {
      const tier3 = allVisible.filter((p) => {
        const vis = LAYER_VISUALS[p.layer];
        if (!vis) return true;
        // Skip if already shown in tier1 or tier2
        if (viewState.zoom >= vis.labelWeightZoom && p.weight >= vis.labelWeightMin) return false;
        if (p.weight >= 0.6) return false;
        return true;
      });
      if (tier3.length > 0) {
        result.push(
          new TextLayer({
            id: 'labels-tier3',
            data: tier3,
            getPosition: (d: MapPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: MapPoint) => d.label,
            getSize: 9,
            getColor: (d: MapPoint) => {
              const c = LAYER_COLORS[d.layer] ?? [160, 160, 160];
              return [c[0], c[1], c[2], 155] as [number, number, number, number];
            },
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 11] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 185] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── Global Tech Hubs — visible when zoomed out ──────────────────────────
    if (activeLayers.has('globalHubs') && viewState.zoom < 8) {
      // Outer glow ring
      result.push(
        new ScatterplotLayer({
          id: 'global-hubs-ring',
          data: GLOBAL_HUBS,
          getPosition: (d: GlobalHub) => [d.lon, d.lat] as [number, number],
          getRadius: (d: GlobalHub) => d.isHQ ? 180000 : 120000,
          getFillColor: (d: GlobalHub) =>
            d.isHQ
              ? [0, 212, 255, Math.round(18 * (0.5 + 0.5 * breatheAmt))] as [number, number, number, number]
              : [0, 212, 255, 10] as [number, number, number, number],
          getLineColor: (d: GlobalHub) =>
            d.isHQ
              ? [0, 212, 255, Math.round(120 * (0.5 + 0.5 * breatheAmt))] as [number, number, number, number]
              : [0, 212, 255, 35] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
          updateTriggers: { getFillColor: breatheAmt, getLineColor: breatheAmt },
        }) as unknown as Layer,
      );
      // Solid dot
      result.push(
        new ScatterplotLayer({
          id: 'global-hubs-dot',
          data: GLOBAL_HUBS,
          getPosition: (d: GlobalHub) => [d.lon, d.lat] as [number, number],
          getRadius: (d: GlobalHub) => d.isHQ ? 50000 : 35000,
          getFillColor: (d: GlobalHub) =>
            d.isHQ
              ? [0, 212, 255, 200] as [number, number, number, number]
              : [0, 212, 255, 65] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
        }) as unknown as Layer,
      );
      // Hub labels
      result.push(
        new TextLayer({
          id: 'global-hubs-labels',
          data: GLOBAL_HUBS,
          getPosition: (d: GlobalHub) => [d.lon, d.lat] as [number, number],
          getText: (d: GlobalHub) => d.label,
          getSize: (d: GlobalHub) => d.isHQ ? 13 : 11,
          getColor: (d: GlobalHub) =>
            d.isHQ
              ? [0, 212, 255, 230] as [number, number, number, number]
              : [0, 212, 255, 130] as [number, number, number, number],
          fontFamily: '"IBM Plex Mono", monospace',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'top',
          getPixelOffset: [0, 10] as [number, number],
          background: true,
          getBackgroundColor: [0, 0, 0, 180] as [number, number, number, number],
          backgroundPadding: [4, 2, 4, 2] as [number, number, number, number],
          pickable: false,
          sizeUnits: 'pixels',
        }) as unknown as Layer,
      );
    }

    // ── Intel Signals — live global signal events as pulsing dots ─────────
    if (activeLayers.has('intelSignals') && intelSignalPoints.length > 0 && viewState.zoom < 8) {
      result.push(
        new ScatterplotLayer({
          id: 'intel-signals-ring',
          data: intelSignalPoints,
          getPosition: (d: IntelSignalMapPoint) => [d.lon, d.lat] as [number, number],
          getRadius: (d: IntelSignalMapPoint) => 80000 + d.importance * 160000,
          getFillColor: (d: IntelSignalMapPoint) => {
            const [r, g, b] = SIGNAL_TYPE_COLORS[d.signal_type] ?? [0, 212, 255];
            const alpha = Math.round(8 + 18 * (0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2)));
            return [r, g, b, alpha] as [number, number, number, number];
          },
          getLineColor: (d: IntelSignalMapPoint) => {
            const [r, g, b] = SIGNAL_TYPE_COLORS[d.signal_type] ?? [0, 212, 255];
            return [r, g, b, Math.round(120 + 80 * Math.sin(pulsePhase * Math.PI * 2))] as [number, number, number, number];
          },
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
          updateTriggers: { getFillColor: [pulsePhase], getLineColor: [pulsePhase] },
        }) as unknown as Layer,
      );
      result.push(
        new ScatterplotLayer({
          id: 'intel-signals-dot',
          data: intelSignalPoints,
          getPosition: (d: IntelSignalMapPoint) => [d.lon, d.lat] as [number, number],
          getRadius: 20000,
          getFillColor: (d: IntelSignalMapPoint) => {
            const [r, g, b] = SIGNAL_TYPE_COLORS[d.signal_type] ?? [0, 212, 255];
            return [r, g, b, 200] as [number, number, number, number];
          },
          radiusUnits: 'meters',
          pickable: false,
        }) as unknown as Layer,
      );
    }

    // ── Global Tech Countries — heat map with live signal pulsing ──────────
    if (activeLayers.has('globalTech') && viewState.zoom < 7) {
      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };

      const maxSignals = Math.max(1, ...Object.values(countrySignalCounts));
      const pulse = 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2); // 0→1 oscillation

      // ── Layer 1: Soft outer glow halo (pixel-radius, scales with activity)
      result.push(
        new ScatterplotLayer({
          id: 'country-tech-halo',
          data: COUNTRY_TECH_MAP,
          getPosition: (d: CountryTechProfile) => [d.lon, d.lat] as [number, number],
          getRadius: (d: CountryTechProfile) => {
            const liveBoost = (countrySignalCounts[d.code] ?? 0) / maxSignals;
            return Math.round(28 + (d.techScore / 100) * 18 + liveBoost * 20);
          },
          radiusUnits: 'pixels',
          radiusMinPixels: 20,
          radiusMaxPixels: 80,
          getFillColor: (d: CountryTechProfile) => {
            const [r, g, b] = hexToRgb(d.color);
            const liveBoost = (countrySignalCounts[d.code] ?? 0) / maxSignals;
            const alpha = Math.round((18 + liveBoost * 22) * (0.5 + 0.5 * pulse));
            return [r, g, b, alpha] as [number, number, number, number];
          },
          stroked: false,
          filled: true,
          pickable: false,
          updateTriggers: { getFillColor: [pulsePhase, countrySignalCounts], getRadius: countrySignalCounts },
        }) as unknown as Layer,
      );

      // ── Layer 2: Crisp ring border — brighter when signals active
      result.push(
        new ScatterplotLayer({
          id: 'country-tech-ring',
          data: COUNTRY_TECH_MAP,
          getPosition: (d: CountryTechProfile) => [d.lon, d.lat] as [number, number],
          getRadius: (d: CountryTechProfile) => {
            const liveBoost = (countrySignalCounts[d.code] ?? 0) / maxSignals;
            return Math.round(16 + (d.techScore / 100) * 10 + liveBoost * 10);
          },
          radiusUnits: 'pixels',
          radiusMinPixels: 12,
          radiusMaxPixels: 42,
          getFillColor: [0, 0, 0, 0] as [number, number, number, number],
          getLineColor: (d: CountryTechProfile) => {
            const [r, g, b] = hexToRgb(d.color);
            const liveBoost = (countrySignalCounts[d.code] ?? 0) / maxSignals;
            const alpha = Math.round(90 + liveBoost * 120 + 40 * pulse);
            return [r, g, b, Math.min(255, alpha)] as [number, number, number, number];
          },
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          pickable: false,
          updateTriggers: { getLineColor: [pulsePhase, countrySignalCounts], getRadius: countrySignalCounts },
        }) as unknown as Layer,
      );

      // ── Layer 3: Core dot — solid, country color
      result.push(
        new ScatterplotLayer({
          id: 'country-tech-dot',
          data: COUNTRY_TECH_MAP,
          getPosition: (d: CountryTechProfile) => [d.lon, d.lat] as [number, number],
          getRadius: 5,
          radiusUnits: 'pixels',
          radiusMinPixels: 3,
          radiusMaxPixels: 8,
          getFillColor: (d: CountryTechProfile) => {
            const [r, g, b] = hexToRgb(d.color);
            return [r, g, b, 230] as [number, number, number, number];
          },
          stroked: false,
          filled: true,
          pickable: false,
        }) as unknown as Layer,
      );

      // ── Layer 4: Country code + name label
      result.push(
        new TextLayer({
          id: 'country-tech-labels',
          data: COUNTRY_TECH_MAP,
          getPosition: (d: CountryTechProfile) => [d.lon, d.lat] as [number, number],
          getText: (d: CountryTechProfile) => {
            const signals = countrySignalCounts[d.code] ?? 0;
            return signals > 0 ? `${d.code} ◉${signals}` : d.code;
          },
          getSize: 11,
          getColor: (d: CountryTechProfile) => {
            const [r, g, b] = hexToRgb(d.color);
            return [r, g, b, 255] as [number, number, number, number];
          },
          fontFamily: '"IBM Plex Mono", monospace',
          fontWeight: 'bold',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'bottom',
          getPixelOffset: [0, -12] as [number, number],
          background: true,
          getBackgroundColor: [0, 0, 0, 210] as [number, number, number, number],
          backgroundPadding: [4, 2, 4, 2] as [number, number, number, number],
          pickable: false,
          sizeUnits: 'pixels',
          updateTriggers: { getText: countrySignalCounts },
        }) as unknown as Layer,
      );

      // ── Layer 5: Top companies — shown below dot (only at zoom < 4)
      if (viewState.zoom < 4) {
        result.push(
          new TextLayer({
            id: 'country-tech-companies',
            data: COUNTRY_TECH_MAP,
            getPosition: (d: CountryTechProfile) => [d.lon, d.lat] as [number, number],
            getText: (d: CountryTechProfile) => d.keyCompanies.slice(0, 3).join(' · '),
            getSize: 9,
            getColor: [200, 200, 200, 190] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 14] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 180] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── Conferences — World Monitor bubble style (sized circles + count) ──
    if (activeLayers.has('conferences')) {
      // WM color by count: green (few) → yellow → orange → red (many)
      const wmBubbleColor = (count: number): [number, number, number, number] => {
        if (count >= 80) return [255, 59, 48, 200];    // red — massive
        if (count >= 40) return [249, 115, 22, 200];   // orange — large
        if (count >= 15) return [255, 184, 0, 190];    // gold — medium
        if (count >= 5)  return [0, 212, 255, 180];    // cyan — moderate
        return [0, 255, 136, 160];                      // green — small
      };

      // Outer glow ring (WM: soft halo behind bubble)
      result.push(
        new ScatterplotLayer({
          id: 'conf-bubble-glow',
          data: CONFERENCE_CLUSTERS,
          getPosition: (d: ConferenceCluster) => [d.lon, d.lat] as [number, number],
          getRadius: (d: ConferenceCluster) => 8 + Math.min(d.count, 120) * 0.25,
          radiusUnits: 'pixels',
          radiusMinPixels: 8,
          radiusMaxPixels: 45,
          filled: true,
          stroked: false,
          getFillColor: (d: ConferenceCluster) => {
            const c = wmBubbleColor(d.count);
            return [c[0], c[1], c[2], 40] as [number, number, number, number];
          },
          pickable: false,
        }) as unknown as Layer,
      );

      // Solid bubble (WM: filled circle, size = count)
      result.push(
        new ScatterplotLayer({
          id: 'conf-bubble',
          data: CONFERENCE_CLUSTERS,
          getPosition: (d: ConferenceCluster) => [d.lon, d.lat] as [number, number],
          getRadius: (d: ConferenceCluster) => 6 + Math.min(d.count, 120) * 0.18,
          radiusUnits: 'pixels',
          radiusMinPixels: 6,
          radiusMaxPixels: 32,
          filled: true,
          stroked: true,
          getFillColor: (d: ConferenceCluster) => {
            const c = wmBubbleColor(d.count);
            return [c[0], c[1], c[2], Math.round(c[3] * 0.6)] as [number, number, number, number];
          },
          getLineColor: (d: ConferenceCluster) => {
            const c = wmBubbleColor(d.count);
            return [c[0], c[1], c[2], 220] as [number, number, number, number];
          },
          lineWidthMinPixels: 1,
          pickable: true,
        }) as unknown as Layer,
      );

      // Count number inside bubble (WM: bold white number)
      result.push(
        new TextLayer({
          id: 'conf-bubble-count',
          data: CONFERENCE_CLUSTERS,
          getPosition: (d: ConferenceCluster) => [d.lon, d.lat] as [number, number],
          getText: (d: ConferenceCluster) => String(d.count),
          getSize: (d: ConferenceCluster) => d.count >= 100 ? 10 : d.count >= 10 ? 11 : 12,
          fontWeight: 700,
          getColor: [255, 255, 255, 240] as [number, number, number, number],
          fontFamily: '"IBM Plex Mono", monospace',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          pickable: false,
          sizeUnits: 'pixels',
        }) as unknown as Layer,
      );

      // City name label below bubble (zoom >= 4)
      if (viewState.zoom >= 4) {
        const labelClusters = CONFERENCE_CLUSTERS.filter(
          (cl) => cl.count >= 3 || cl.maxRelevance >= 85,
        );
        result.push(
          new TextLayer({
            id: 'conf-city-labels',
            data: labelClusters,
            getPosition: (d: ConferenceCluster) => [d.lon, d.lat] as [number, number],
            getText: (d: ConferenceCluster) => {
              const city = (d.locationLabel ?? '').toUpperCase().split(',')[0].slice(0, 16);
              return city;
            },
            getSize: 9,
            getColor: [255, 255, 255, 120] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: (d: ConferenceCluster) => {
              const r = 6 + Math.min(d.count, 120) * 0.18;
              return [0, Math.max(8, r) + 4] as [number, number];
            },
            background: true,
            getBackgroundColor: [0, 0, 0, 160] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // Landmark zone labels — visible from city zoom level
    if (viewState.zoom >= 9) {
      result.push(
        new TextLayer({
          id: 'landmark-labels',
          data: LANDMARKS,
          getPosition: (d: Landmark) => [d.lon, d.lat] as [number, number],
          getText: (d: Landmark) => d.label,
          getSize: 12,
          getColor: [0, 212, 255, 110] as [number, number, number, number],
          fontFamily: '"IBM Plex Mono", monospace',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          characterSet: 'auto',
          pickable: false,
          sizeUnits: 'pixels',
        }) as unknown as Layer,
      );
    }

    // ── Disruptions ──────────────────────────────────────────────────────
    if (activeLayers.has('disruptions') && disruptionPoints.length > 0) {
      const disruptColor = (cat: string): [number, number, number] => {
        if (cat === 'breakthrough') return [168, 85, 247];
        if (cat === 'funding')      return [249, 115, 22];
        if (cat === 'policy')       return [255, 184, 0];
        if (cat === 'acquisition')  return [0, 212, 255];
        if (cat === 'deployment')   return [0, 255, 136];
        return [168, 85, 247];
      };
      const impactRadius = (imp: string) => imp === 'high' ? 900 : imp === 'medium' ? 650 : 450;

      // Pulsing ring
      result.push(
        new ScatterplotLayer({
          id: 'disruptions-pulse',
          data: disruptionPoints,
          getPosition: (d: DisruptionMapPoint) => [d.lon, d.lat] as [number, number],
          getRadius: (d: DisruptionMapPoint) => impactRadius(d.impact) * (1 + pulsePhase * 1.2),
          getFillColor: (d: DisruptionMapPoint) => [...disruptColor(d.category), Math.round(20 * (1 - pulsePhase))] as [number, number, number, number],
          getLineColor: (d: DisruptionMapPoint) => [...disruptColor(d.category), Math.round(140 * (1 - pulsePhase))] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
          updateTriggers: { getRadius: pulsePhase, getFillColor: pulsePhase, getLineColor: pulsePhase },
        }) as unknown as Layer,
      );
      // Solid dot
      result.push(
        new ScatterplotLayer({
          id: 'disruptions-dot',
          data: disruptionPoints,
          getPosition: (d: DisruptionMapPoint) => [d.lon, d.lat] as [number, number],
          getRadius: () => 250,
          getFillColor: (d: DisruptionMapPoint) => [...disruptColor(d.category), 220] as [number, number, number, number],
          getLineColor: [255, 255, 255, 50] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
        }) as unknown as Layer,
      );
      // Labels at zoom >= 5
      if (viewState.zoom >= 5) {
        result.push(
          new TextLayer({
            id: 'disruptions-labels',
            data: disruptionPoints,
            getPosition: (d: DisruptionMapPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: DisruptionMapPoint) => d.title.length > 25 ? d.title.slice(0, 23) + '..' : d.title,
            getSize: 10,
            getColor: (d: DisruptionMapPoint) => [...disruptColor(d.category), 200] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 10] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 180] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── Crime Hotspots ────────────────────────────────────────────────────
    if (activeLayers.has('crimeNews') && crimeHotspots.length > 0) {
      const crimeColor = (level: string, alpha: number): [number, number, number, number] => {
        if (level === 'high')     return [255, 59,  48,  alpha];
        if (level === 'moderate') return [249, 115, 22,  alpha];
        return                           [107, 114, 128, alpha];
      };
      const crimeRadius = (level: string) =>
        level === 'high' ? 1200 : level === 'moderate' ? 800 : 600;

      // Pulsing glow ring
      result.push(
        new ScatterplotLayer({
          id: 'crime-ring',
          data: crimeHotspots,
          getPosition: (d: CrimeHotspot) => [d.lon, d.lat] as [number, number],
          getRadius: (d: CrimeHotspot) => crimeRadius(d.activityLevel) * (1 + pulsePhase * 1.5),
          getFillColor: (d: CrimeHotspot) => crimeColor(d.activityLevel, Math.round(25 * (1 - pulsePhase))),
          getLineColor: (d: CrimeHotspot) => crimeColor(d.activityLevel, Math.round(160 * (1 - pulsePhase))),
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
          updateTriggers: { getRadius: pulsePhase, getFillColor: pulsePhase, getLineColor: pulsePhase },
        }) as unknown as Layer,
      );
      // Solid dot
      result.push(
        new ScatterplotLayer({
          id: 'crime-dot',
          data: crimeHotspots,
          getPosition: (d: CrimeHotspot) => [d.lon, d.lat] as [number, number],
          getRadius: () => 350,
          getFillColor: (d: CrimeHotspot) => crimeColor(d.activityLevel, 230),
          getLineColor: [255, 255, 255, 60] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
        }) as unknown as Layer,
      );
      // Labels
      if (viewState.zoom >= 9) {
        result.push(
          new TextLayer({
            id: 'crime-labels',
            data: crimeHotspots,
            getPosition: (d: CrimeHotspot) => [d.lon, d.lat] as [number, number],
            getText: (d: CrimeHotspot) => `${d.name}  ${d.articleCount} reports`,
            getSize: 10,
            getColor: (d: CrimeHotspot) => crimeColor(d.activityLevel, 220),
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 10] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 180] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── SAM / USASpending Contract Awards & Solicitations ─────────────────
    const AGENCY_COORDS: Record<string, [number, number]> = {
      'Department of the Army':          [-106.4150, 31.8100],
      'Department of Defense':           [-106.4100, 31.8050],
      'Customs and Border Protection':   [-106.4850, 31.7508],
      'Department of Homeland Security': [-106.4820, 31.7520],
      'Department of the Air Force':     [-106.4200, 31.8150],
      'Department of Energy':            [-106.4622, 31.7602],
      'Department of Health':            [-106.4992, 31.7632],
    };
    const DEFAULT_COORD: [number, number] = [-106.4869, 31.7587];

    const CONTRACT_COLORS: Record<string, [number, number, number]> = {
      award:        [0,   255, 136],
      solicitation: [0,   212, 255],
      grant:        [255, 184, 0  ],
    };

    // Deterministic per-id jitter — avoids stacking markers from same agency
    const contractJitter = (id: string, axis: 0 | 1): number => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
      const seed = axis === 0 ? h : (h ^ 0x9e3779b9);
      return ((seed & 0xffff) / 0xffff - 0.5) * 0.006;
    };

    if (activeLayers.has('samContracts') && contracts.length > 0) {
      const contractPoints = contracts.map((c) => {
        const base = AGENCY_COORDS[c.agency] ?? DEFAULT_COORD;
        return {
          ...c,
          lon: base[0] + contractJitter(c.id, 0),
          lat: base[1] + contractJitter(c.id, 1),
        };
      });

      const contractRadius = (amount: number | null): number => {
        if (amount === null || amount <= 0) return 400;
        return Math.min(2000, Math.max(400, Math.log10(amount / 1000 + 1) * 500));
      };

      // Pulsing ring — expands and fades with pulsePhase
      result.push(
        new ScatterplotLayer({
          id: 'contracts-pulse',
          data: contractPoints,
          getPosition: (d: ContractPoint) => [d.lon, d.lat] as [number, number],
          getRadius: (d: ContractPoint) => contractRadius(d.amount) * (1 + pulsePhase * 2),
          getFillColor: (d: ContractPoint) => {
            const c = CONTRACT_COLORS[d.type] ?? [255, 255, 255];
            return [c[0], c[1], c[2], Math.round(30 * (1 - pulsePhase))] as [number, number, number, number];
          },
          getLineColor: (d: ContractPoint) => {
            const c = CONTRACT_COLORS[d.type] ?? [255, 255, 255];
            return [c[0], c[1], c[2], Math.round(140 * (1 - pulsePhase))] as [number, number, number, number];
          },
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: false,
          updateTriggers: { getRadius: pulsePhase, getFillColor: pulsePhase, getLineColor: pulsePhase },
        }) as unknown as Layer,
      );

      // Solid dot — pickable for tooltip
      result.push(
        new ScatterplotLayer({
          id: 'contracts-dot',
          data: contractPoints,
          getPosition: (d: ContractPoint) => [d.lon, d.lat] as [number, number],
          getRadius: () => 300,
          getFillColor: (d: ContractPoint) => {
            const c = CONTRACT_COLORS[d.type] ?? [255, 255, 255];
            return [c[0], c[1], c[2], 230] as [number, number, number, number];
          },
          getLineColor: [255, 255, 255, 60] as [number, number, number, number],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          pickable: true,
        }) as unknown as Layer,
      );

      // Labels — visible at zoom >= 11, capped to top 15 by amount to avoid clutter
      if (viewState.zoom >= 11) {
        const labelData = [...contractPoints]
          .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
          .slice(0, 15);
        result.push(
          new TextLayer({
            id: 'contracts-labels',
            data: labelData,
            getPosition: (d: ContractPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: ContractPoint) => {
              const amt = d.amount !== null && d.amount > 0
                ? `$${(d.amount / 1_000_000).toFixed(1)}M`
                : '';
              const name = d.vendor.length > 20 ? d.vendor.slice(0, 18) + '..' : d.vendor;
              return amt ? `${name} · ${amt}` : name;
            },
            getSize: 9,
            getColor: [255, 255, 255, 180] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 10] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 200] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    // ── SAM Registered Businesses ─────────────────────────────────────────
    // Default: tiny quiet dots. Active businesses pulse + grow:
    //   contract winner → green blink    research/SBIR → cyan blink
    if (activeLayers.has('samBusinesses') && samBusinesses.length > 0) {
      const activeBiz = samBusinesses.filter((b) => b.activity !== 'none');
      const quietBiz = samBusinesses.filter((b) => b.activity === 'none');

      // Pulsing ring ONLY for active businesses (contract or research)
      if (activeBiz.length > 0) {
        result.push(
          new ScatterplotLayer({
            id: 'sam-biz-pulse',
            data: activeBiz,
            getPosition: (d: SamBusinessPoint) => [d.lon, d.lat] as [number, number],
            getRadius: (d: SamBusinessPoint) => (d.activity === 'contract' ? 500 : 400) * (1 + pulsePhase * 2),
            getFillColor: (d: SamBusinessPoint) => {
              const c = d.activity === 'contract' ? [0, 255, 136] : [0, 212, 255];
              return [c[0], c[1], c[2], Math.round(40 * (1 - pulsePhase))] as [number, number, number, number];
            },
            getLineColor: (d: SamBusinessPoint) => {
              const c = d.activity === 'contract' ? [0, 255, 136] : [0, 212, 255];
              return [c[0], c[1], c[2], Math.round(180 * (1 - pulsePhase))] as [number, number, number, number];
            },
            lineWidthMinPixels: 1,
            stroked: true,
            filled: true,
            radiusUnits: 'meters',
            pickable: false,
            updateTriggers: { getRadius: pulsePhase, getFillColor: pulsePhase, getLineColor: pulsePhase },
          }) as unknown as Layer,
        );
      }

      // Active dots — larger, colored by activity type
      if (activeBiz.length > 0) {
        result.push(
          new ScatterplotLayer({
            id: 'sam-biz-active-dot',
            data: activeBiz,
            getPosition: (d: SamBusinessPoint) => [d.lon, d.lat] as [number, number],
            getRadius: () => 150,
            getFillColor: (d: SamBusinessPoint) =>
              d.activity === 'contract'
                ? [0, 255, 136, 240] as [number, number, number, number]
                : [0, 212, 255, 240] as [number, number, number, number],
            getLineColor: [255, 255, 255, 100] as [number, number, number, number],
            lineWidthMinPixels: 1,
            stroked: true,
            filled: true,
            radiusUnits: 'meters',
            pickable: true,
          }) as unknown as Layer,
        );
      }

      // Quiet dots — small, dim, NAICS-colored
      if (quietBiz.length > 0) {
        result.push(
          new ScatterplotLayer({
            id: 'sam-biz-dot',
            data: quietBiz,
            getPosition: (d: SamBusinessPoint) => [d.lon, d.lat] as [number, number],
            getRadius: () => 60,
            getFillColor: (d: SamBusinessPoint) => {
              const c = getNaicsColor(d.primaryNaics);
              return [c[0], c[1], c[2], 160] as [number, number, number, number];
            },
            getLineColor: [255, 255, 255, 30] as [number, number, number, number],
            lineWidthMinPixels: 1,
            stroked: true,
            filled: true,
            radiusUnits: 'meters',
            pickable: true,
          }) as unknown as Layer,
        );
      }

      // Activity labels for active businesses at zoom >= 10
      if (activeBiz.length > 0 && viewState.zoom >= 10) {
        result.push(
          new TextLayer({
            id: 'sam-biz-activity-labels',
            data: activeBiz,
            getPosition: (d: SamBusinessPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: SamBusinessPoint) => {
              const tag = d.activity === 'contract' ? 'CONTRACT' : 'RESEARCH';
              return `${tag} · ${d.name}\n${d.activityLabel ?? ''}`;
            },
            getSize: 10,
            getColor: (d: SamBusinessPoint) =>
              d.activity === 'contract'
                ? [0, 255, 136, 220] as [number, number, number, number]
                : [0, 212, 255, 220] as [number, number, number, number],
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 12] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 200] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }

      // Business name labels — sector-colored — at zoom >= 12
      if (viewState.zoom >= 12) {
        result.push(
          new TextLayer({
            id: 'sam-biz-labels',
            data: samBusinesses,
            getPosition: (d: SamBusinessPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: SamBusinessPoint) => `${getNaicsSectorLabel(d.primaryNaics)} · ${d.name}`,
            getSize: 10,
            getColor: (d: SamBusinessPoint) => {
              const c = getNaicsColor(d.primaryNaics);
              return [c[0], c[1], c[2], 200] as [number, number, number, number];
            },
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 10] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 200] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }

      // NAICS + CAGE detail labels at zoom >= 13
      if (viewState.zoom >= 13) {
        result.push(
          new TextLayer({
            id: 'sam-biz-detail-labels',
            data: samBusinesses,
            getPosition: (d: SamBusinessPoint) => [d.lon, d.lat] as [number, number],
            getText: (d: SamBusinessPoint) =>
              `NAICS ${d.primaryNaics} · CAGE ${d.cageCode}${d.isSmallBusiness ? ' · SB' : ''}`,
            getSize: 9,
            getColor: (d: SamBusinessPoint) => {
              const c = getNaicsColor(d.primaryNaics);
              return [c[0], c[1], c[2], 150] as [number, number, number, number];
            },
            fontFamily: '"IBM Plex Mono", monospace',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            getPixelOffset: [0, 22] as [number, number],
            background: true,
            getBackgroundColor: [0, 0, 0, 190] as [number, number, number, number],
            backgroundPadding: [3, 1, 3, 1] as [number, number, number, number],
            pickable: false,
            sizeUnits: 'pixels',
          }) as unknown as Layer,
        );
      }
    }

    return result;
  }, [points, activeLayers, pulsePhase, viewState.zoom, flights, seismicEvents, activeVendorIds, borderCrossings, borderWaitTimes, crimeHotspots, disruptionPoints, contracts, samBusinesses, countrySignalCounts, intelSignalPoints]);

  const handleClick = useCallback(
    (info: PickingInfo) => {
      const obj = info.object as Record<string, unknown> | undefined;
      if (!obj) {
        onVendorSelect(null);
        setTooltip(null);
        return;
      }

      // City label click → open cluster in panel
      if ('conferences' in obj && 'count' in obj) {
        const cluster = obj as unknown as ConferenceCluster;
        onClusterSelect?.(cluster);
        setTooltip(null);
        return;
      }

      // Individual conference click (fallback)
      if ('estimatedExhibitors' in obj) {
        onConferenceSelect?.(obj as unknown as ConferenceRecord);
        setTooltip(null);
        return;
      }

      // Default: vendor selection
      onVendorSelect((obj as MapPoint | undefined) ?? null);
      setTooltip(null);
    },
    [onVendorSelect, onConferenceSelect, onClusterSelect],
  );

  const clearAllTooltips = useCallback(() => {
    setTooltip(null);
    setBorderTooltip(null);
    setFlightTooltip(null);
    setContractTooltip(null);
    setSamBizTooltip(null);
    setConfTooltip(null);
  }, []);

  const handleHover = useCallback((info: PickingInfo) => {
    if (!info.object) {
      clearAllTooltips();
      return;
    }
    const obj = info.object as Record<string, unknown>;

    // Conference cluster hover
    if ('conferences' in obj && 'count' in obj) {
      setConfTooltip({ x: info.x, y: info.y, cluster: info.object as unknown as ConferenceCluster });
      setTooltip(null); setBorderTooltip(null); setFlightTooltip(null); setContractTooltip(null); setSamBizTooltip(null);
      return;
    }

    // Individual conference hover
    if ('estimatedExhibitors' in obj && !('agency' in obj)) {
      setConfTooltip({ x: info.x, y: info.y, conference: info.object as unknown as ConferenceRecord });
      setTooltip(null); setBorderTooltip(null); setFlightTooltip(null); setContractTooltip(null); setSamBizTooltip(null);
      return;
    }

    setConfTooltip(null);

    if ('callsign' in obj) {
      setFlightTooltip({ x: info.x, y: info.y, flight: info.object as FlightPoint });
      setTooltip(null); setBorderTooltip(null); setContractTooltip(null); setSamBizTooltip(null);
    } else if ('trucks' in obj) {
      setBorderTooltip({ x: info.x, y: info.y, item: info.object as BorderPortItem });
      setTooltip(null); setFlightTooltip(null); setContractTooltip(null); setSamBizTooltip(null);
    } else if ('agency' in obj && 'vendor' in obj) {
      setContractTooltip({ x: info.x, y: info.y, contract: info.object as ContractPoint });
      setTooltip(null); setBorderTooltip(null); setFlightTooltip(null); setSamBizTooltip(null);
    } else if ('cageCode' in obj) {
      setSamBizTooltip({ x: info.x, y: info.y, biz: info.object as SamBusinessPoint });
      setTooltip(null); setBorderTooltip(null); setFlightTooltip(null); setContractTooltip(null);
    } else {
      setTooltip({ x: info.x, y: info.y, point: info.object as MapPoint });
      setBorderTooltip(null); setFlightTooltip(null); setContractTooltip(null); setSamBizTooltip(null);
    }
  }, [clearAllTooltips]);

  return (
    <div className="absolute inset-0">
      {/* Loading pulse overlay */}
      {loading && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#00ff88' }} />
          <span className="font-mono text-[10px] tracking-widest" style={{ color: '#00ff88' }}>FETCHING SIGNALS</span>
        </div>
      )}

      {/* Idle pause indicator */}
      {isIdle && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-black/70 border border-white/8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="font-mono text-[9px] text-white/25 tracking-widest">PAUSED</span>
        </div>
      )}

      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => {
          const newVs = vs as ViewState;
          setViewState(newVs);
          if (onViewStateChange) {
            if (viewChangeTimer.current) clearTimeout(viewChangeTimer.current);
            viewChangeTimer.current = setTimeout(() => {
              onViewStateChange({
                longitude: Math.round(newVs.longitude * 1000) / 1000,
                latitude: Math.round(newVs.latitude * 1000) / 1000,
                zoom: Math.round(newVs.zoom * 10) / 10,
              });
            }, 500);
          }
        }}
        controller
        layers={layers}
        onClick={handleClick}
        onHover={handleHover}
        getCursor={() => (tooltip || flightTooltip || contractTooltip || samBizTooltip ? 'pointer' : 'grab')}
        onError={(e) => { console.warn('[DeckGL] non-fatal:', e.message); return true; }}
      >
        <MapGL mapStyle={MAP_STYLE} />
      </DeckGL>

      {/* Vendor hover tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none px-3 py-2 bg-black/90 border border-white/10 rounded-sm backdrop-blur-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-mono text-xs text-white font-semibold">{tooltip.point.label}</p>
          <p className="font-mono text-[10px] text-white/40 mt-0.5">{tooltip.point.category}</p>
          <p className="font-mono text-[10px] mt-1" style={{ color: LAYER_COLORS[tooltip.point.layer] ? `rgb(${LAYER_COLORS[tooltip.point.layer].join(',')})` : '#888' }}>
            {(tooltip.point.layer ?? '').toUpperCase()} · {Math.round(tooltip.point.confidence * 100)}% conf
          </p>
        </div>
      )}

      {/* Border port hover tooltip */}
      {borderTooltip && (() => {
        const { item } = borderTooltip;
        const sevColor =
          item.severity === 'high'     ? '#ff3b30' :
          item.severity === 'moderate' ? '#ffb800' :
          item.severity === 'low'      ? '#00ff88' : '#00d4ff';
        const sevLabel =
          item.severity === 'high'     ? '⚠ HIGH' :
          item.severity === 'moderate' ? '⚠ MODERATE' :
          item.severity === 'low'      ? '✓ LOW' : '';
        return (
          <div
            className="absolute z-30 pointer-events-none px-3 py-2 bg-black/90 border border-white/10 rounded-sm backdrop-blur-md"
            style={{ left: borderTooltip.x + 12, top: borderTooltip.y - 10 }}
          >
            <p className="font-mono text-xs text-white font-semibold">{(item.port ?? '').toUpperCase()}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[10px]" style={{ color: sevColor }}>
                COMMERCIAL: {item.commercialWaitMin} min
              </span>
              {sevLabel && (
                <span className="font-mono text-[9px]" style={{ color: sevColor }}>{sevLabel}</span>
              )}
            </div>
            <p className="font-mono text-[9px] text-white/40 mt-0.5">
              Lanes open: {item.commercialLanesOpen}/{item.commercialLanesTotal} · {item.trucks.toLocaleString()} trucks/mo
            </p>
          </div>
        );
      })()}

      {/* Contract hover tooltip */}
      {contractTooltip && (() => {
        const { contract: ct } = contractTooltip;
        const typeColors: Record<string, string> = {
          award:        '#00ff88',
          solicitation: '#00d4ff',
          grant:        '#ffb800',
        };
        const typeColor = typeColors[ct.type] ?? '#ffffff';
        const typeLabel = (ct.type ?? '').toUpperCase();
        const sourceLabel =
          ct.source === 'usaspending' ? 'USASPENDING' :
          ct.source === 'sbir'        ? 'SBIR'        : 'SAM.GOV';
        const amtLabel =
          ct.amount !== null && ct.amount > 0
            ? `$${(ct.amount / 1_000_000).toFixed(1)}M`
            : 'undisclosed';
        return (
          <div
            className="absolute z-30 pointer-events-none px-3 py-2 bg-black/90 border border-white/10 rounded-sm backdrop-blur-md min-w-[200px]"
            style={{ left: contractTooltip.x + 12, top: contractTooltip.y - 10 }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                style={{ backgroundColor: typeColor + '25', color: typeColor }}
              >
                {typeLabel}
              </span>
              <span
                className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
              >
                {sourceLabel}
              </span>
            </div>
            <p className="font-mono text-xs text-white font-semibold leading-tight">{ct.vendor}</p>
            <p className="font-mono text-[9px] text-white/40 mt-0.5 leading-tight">{ct.agency}</p>
            <p className="font-mono text-[10px] mt-1.5 font-bold" style={{ color: typeColor }}>{amtLabel}</p>
            <p className="font-mono text-[8px] text-white/20 mt-1 leading-tight truncate max-w-[220px]">{ct.title}</p>
          </div>
        );
      })()}

      {/* SAM business hover tooltip */}
      {samBizTooltip && (() => {
        const { biz } = samBizTooltip;
        const naicsColor = `rgb(${getNaicsColor(biz.primaryNaics).join(',')})`;
        const sectorLabel = getNaicsSectorLabel(biz.primaryNaics);
        const activityInfo = biz.activity !== 'none' ? ACTIVITY_COLORS[biz.activity] : null;
        const activityColor = activityInfo ? `rgb(${activityInfo.color.join(',')})` : '';
        return (
          <div className="absolute z-30 pointer-events-none px-3 py-2 bg-black/90 border border-white/10 rounded-sm backdrop-blur-md min-w-[220px]"
            style={{ left: samBizTooltip.x + 12, top: samBizTooltip.y - 10 }}>
            <p className="font-mono text-xs text-white font-semibold">{biz.name}</p>
            {activityInfo && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold animate-pulse"
                  style={{ backgroundColor: activityColor + '25', color: activityColor, boxShadow: `0 0 6px ${activityColor}66` }}
                >
                  {activityInfo.label}
                </span>
              </div>
            )}
            {activityInfo && biz.activityLabel && (
              <p className="font-mono text-[8px] font-bold mt-0.5" style={{ color: activityColor }}>
                {biz.activityLabel}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                style={{ backgroundColor: naicsColor + '25', color: naicsColor }}
              >
                {sectorLabel}
              </span>
              <span className="font-mono text-[8px] px-1 py-px rounded-sm" style={{ backgroundColor: naicsColor + '15', color: naicsColor }}>
                NAICS {biz.primaryNaics}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {biz.isSmallBusiness && (
                <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-[#00ff88]/15 text-[#00ff88] font-bold">SMALL BIZ</span>
              )}
              <span className="font-mono text-[8px] text-white/30">CAGE {biz.cageCode}</span>
            </div>
            {biz.naicsDescription && (
              <p className="font-mono text-[9px] text-white/40 mt-1">{biz.naicsDescription}</p>
            )}
            <p className="font-mono text-[8px] text-white/25 mt-1">{biz.address}</p>
            <p className="font-mono text-[7px] text-white/15 mt-0.5">SAM.gov · UEI {biz.id}</p>
          </div>
        );
      })()}

      {/* Flight hover tooltip */}
      {flightTooltip && (() => {
        const { flight: f } = flightTooltip;
        const FCOLORS_HEX: Record<string, string> = {
          VIP: '#ff0080', MILITARY: '#ff6400', CARGO: '#7878a0', COMMERCIAL: '#ffb800', PRIVATE: '#50506e',
        };
        const catColor = FCOLORS_HEX[f.category] ?? '#ffb800';
        const phaseIcon = f.phase === 'CLIMBING' ? '\u2197' : f.phase === 'DESCENDING' ? '\u2198' : '\u2192';
        const phaseColor = f.phase === 'CLIMBING' ? '#00ff88' : f.phase === 'DESCENDING' ? '#ff3b30' : '#ffffff55';
        const isEmergency = f.squawk === '7500' || f.squawk === '7600' || f.squawk === '7700';
        return (
          <div
            className="absolute z-30 pointer-events-none px-3 py-2 bg-black/90 border border-white/10 rounded-sm backdrop-blur-md min-w-[180px]"
            style={{ left: flightTooltip.x + 12, top: flightTooltip.y - 10 }}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold" style={{ backgroundColor: catColor + '25', color: catColor }}>
                {f.category}
              </span>
              <span className="font-mono text-xs font-bold text-white">{f.callsign}</span>
            </div>
            <p className="font-mono text-[9px] text-white/40 mt-0.5">{f.operator}</p>
            {f.approachingELP && (
              <p className="font-mono text-[8px] text-[#00ff88] font-bold mt-1">APPROACH ELP</p>
            )}
            {isEmergency && (
              <p className="font-mono text-[8px] text-red-400 font-bold mt-1">SQUAWK {f.squawk}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 border-t border-white/5 pt-1.5">
              <span className="font-mono text-[9px] text-white/50">{f.altitudeFt.toLocaleString()} ft</span>
              <span className="font-mono text-[9px] text-white/50">{f.velocityKts} kts</span>
              <span className="font-mono text-[9px] text-white/50">{f.headingDeg}°</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[8px]" style={{ color: phaseColor }}>
                {phaseIcon} {f.phase} {f.verticalFpm !== 0 ? `${f.verticalFpm > 0 ? '+' : ''}${f.verticalFpm}fpm` : ''}
              </span>
            </div>
            {f.country && (
              <p className="font-mono text-[8px] text-white/20 mt-1">{f.country} · ICAO {(f.id ?? '').toUpperCase()}</p>
            )}
          </div>
        );
      })()}

      {/* Conference / cluster hover tooltip */}
      {confTooltip && (() => {
        if (confTooltip.cluster) {
          const cl = confTooltip.cluster;
          const domColor = `rgb(${cl.dominantColor.join(',')})`;
          const topCats = Object.entries(cl.categoryBreakdown)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
          return (
            <div
              className="absolute z-30 pointer-events-none px-3 py-2 bg-black/92 border border-white/10 rounded-sm backdrop-blur-md min-w-[180px]"
              style={{ left: confTooltip.x + 12, top: confTooltip.y - 10 }}
            >
              <p className="font-mono text-[11px] text-white font-bold">{(cl.locationLabel ?? '').toUpperCase()}</p>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: domColor }}>
                {cl.count} CONFERENCES
              </p>
              <div className="flex flex-col gap-0.5 mt-1.5">
                {topCats.map(([cat, cnt]) => (
                  <div key={cat} className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[8px] text-white/40">{cat.toUpperCase()}</span>
                    <span className="font-mono text-[8px] text-white/60">{cnt}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/[0.06]">
                <span className="font-mono text-[7px] text-white/25 tracking-wider">AVG RELEVANCE</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: '#00d4ff' }}>
                  {cl.avgRelevance}
                </span>
              </div>
              <p className="font-mono text-[7px] text-white/15 mt-1 tracking-wider">CLICK TO EXPAND</p>
            </div>
          );
        }
        if (confTooltip.conference) {
          const cf = confTooltip.conference;
          const CONF_HEX: Record<string, string> = {
            'Defense': '#ff6400', 'Cybersecurity': '#00d4ff', 'Manufacturing': '#00d4ff',
            'Logistics': '#ffb800', 'Robotics': '#00ff88', 'AI/ML': '#60a5fa',
            'Energy': '#ffd700', 'Border/Gov': '#f97316', 'Construction': '#d97706',
            'Healthcare': '#06b6d4', 'Workforce': '#8b5cf6',
          };
          const catColor = CONF_HEX[cf.category] ?? '#888';
          return (
            <div
              className="absolute z-30 pointer-events-none px-3 py-2 bg-black/92 border border-white/10 rounded-sm backdrop-blur-md"
              style={{ left: confTooltip.x + 12, top: confTooltip.y - 10 }}
            >
              <p className="font-mono text-[11px] text-white font-semibold leading-tight">
                {(cf.name ?? '').slice(0, 30)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[8px]" style={{ color: catColor }}>
                  {(cf.category ?? '').toUpperCase()}
                </span>
                <span className="font-mono text-[8px] text-white/30">{cf.month}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-[8px] text-white/40">
                  REL <span style={{ color: '#00d4ff' }}>{cf.relevanceScore}</span>
                </span>
                <span className="font-mono text-[8px] text-white/40">
                  {cf.estimatedExhibitors.toLocaleString()} exhibitors
                </span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* SAM Businesses — Sector color legend + activity blink legend */}
      {activeLayers.has('samBusinesses') && samBusinesses.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-black/92 border border-white/8 backdrop-blur-md rounded-sm px-3 py-2 min-w-[160px]">
          <p className="font-mono text-[8px] tracking-widest text-white/50 mb-1.5">SECTOR COLORS</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {NAICS_LEGEND.map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `rgb(${color.join(',')})`, boxShadow: `0 0 4px rgb(${color.join(',')})66` }}
                />
                <span className="font-mono text-[7px] tracking-wide" style={{ color: `rgb(${color.join(',')})` }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 mt-2 pt-1.5">
            <p className="font-mono text-[8px] tracking-widest text-white/50 mb-1">ACTIVITY</p>
            {Object.entries(ACTIVITY_COLORS).map(([key, { color, label }]) => (
              <div key={key} className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: `rgb(${color.join(',')})`, boxShadow: `0 0 6px rgb(${color.join(',')})` }}
                />
                <span className="font-mono text-[7px] tracking-wide" style={{ color: `rgb(${color.join(',')})` }}>
                  {label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-white/20" />
              <span className="font-mono text-[7px] tracking-wide text-white/30">NO ACTIVITY</span>
            </div>
          </div>
          <p className="font-mono text-[7px] text-white/15 mt-1.5">{samBusinesses.length} entities · SAM.gov</p>
        </div>
      )}
    </div>
  );
}
