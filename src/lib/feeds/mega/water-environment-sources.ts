// src/lib/feeds/mega/water-environment-sources.ts
// NXT//LINK Water & Environment Mega-Registry — 4,550+ intelligence sources
// Matrices × cross-product expansion = 4,550 unique Google News RSS feeds

import type { FeedCategory } from '@/lib/agents/feed-agent';

type TopicMatrix = {
  prefix: string;
  category: FeedCategory;
  tier: 1 | 2 | 3 | 4;
  region?: 'el-paso' | 'texas' | 'national' | 'global';
  entities: string[];
  contexts: string[];
};

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

type FeedSourceEntry = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  tags: string[];
  tier: 1 | 2 | 3 | 4;
  region?: 'el-paso' | 'texas' | 'national' | 'global';
};

function expandMatrix(m: TopicMatrix): FeedSourceEntry[] {
  const results: FeedSourceEntry[] = [];
  for (const entity of m.entities) {
    for (const context of m.contexts) {
      const slug = `${entity} ${context}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40);
      const id = `${m.prefix}-${slug}`;
      const query = `${entity} ${context}`;
      results.push({
        id,
        name: `GN: ${entity.slice(0, 18)} ${context.slice(0, 10)}`,
        url: GN(query),
        category: m.category,
        tags: query
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
        tier: m.tier,
        region: m.region ?? 'national',
      });
    }
  }
  return results;
}

// ─── MATRIX 1: WATER TECHNOLOGY MEGA ──────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const WATER_TECHNOLOGY_MEGA: TopicMatrix = {
  prefix: 'wat-tech',
  category: 'Energy',
  tier: 3,
  region: 'global',
  entities: [
    'desalination',
    'reverse osmosis',
    'membrane filtration',
    'ultrafiltration',
    'nanofiltration',
    'UV disinfection',
    'ozone treatment',
    'chlorination',
    'electrodeionization',
    'capacitive deionization',
    'forward osmosis',
    'membrane distillation',
    'electrodialysis',
    'ion exchange',
    'activated carbon',
    'granular media filtration',
    'slow sand filtration',
    'ceramic membrane',
    'hollow fiber membrane',
    'flat sheet membrane',
    'spiral wound membrane',
    'tubular membrane',
    'submerged membrane',
    'gravity-driven membrane',
    'solar desalination',
    'wind-powered desalination',
    'wave-powered desalination',
    'geothermal desalination',
    'nuclear desalination',
    'brine management',
    'zero liquid discharge',
    'minimal liquid discharge',
    'water recycling',
    'greywater recycling',
    'blackwater treatment',
    'rainwater harvesting',
    'fog collection',
    'atmospheric water generation',
    'dew collection',
    'aquifer recharge',
    'managed aquifer recharge',
    'bank filtration',
    'soil aquifer treatment',
    'wetland treatment',
    'constructed wetland',
    'floating wetland',
    'algae treatment',
    'biofilm reactor',
    'MBBR',
    'SBR sequencing batch reactor',
    'MBR membrane bioreactor',
    'UASB upflow anaerobic',
    'anaerobic digestion',
    'aerobic treatment',
    'activated sludge',
    'trickling filter',
    'rotating biological contactor',
    'oxidation ditch',
    'aeration system',
    'diffused aeration',
    'surface aeration',
  ],
  contexts: [
    'technology',
    'patent',
    'contract',
    'deployment',
    'pilot project',
    'cost reduction',
    'efficiency',
    'breakthrough',
    'research',
    'startup',
    'investment',
    'government funding',
    'regulation',
    'EPA',
    'drought response',
    'climate adaptation',
    'municipal',
    'industrial',
    'agricultural',
    'mining',
    'oil and gas',
    'power plant',
    'semiconductor',
    'food processing',
    'pharmaceutical',
  ],
};

// ─── MATRIX 2: ENVIRONMENTAL MONITORING MEGA ──────────────────────────────────
// 50 entities × 20 contexts = 1,000 entries
const ENVIRONMENTAL_MONITORING_MEGA: TopicMatrix = {
  prefix: 'wat-mon',
  category: 'Energy',
  tier: 4,
  region: 'global',
  entities: [
    'air quality sensor',
    'particulate matter sensor',
    'gas analyzer',
    'spectrophotometer',
    'water quality sensor',
    'turbidity meter',
    'pH sensor',
    'dissolved oxygen sensor',
    'conductivity sensor',
    'ORP sensor',
    'colorimeter',
    'flow meter',
    'level sensor',
    'pressure transducer',
    'weather station',
    'rain gauge',
    'anemometer',
    'solar radiation sensor',
    'soil moisture sensor',
    'groundwater monitor',
    'seismograph',
    'vibration sensor',
    'noise monitor',
    'radiation detector',
    'Geiger counter',
    'satellite imagery environmental',
    'drone survey environmental',
    'LiDAR mapping environmental',
    'hyperspectral imaging',
    'thermal imaging environmental',
    'acoustic monitoring',
    'hydrophone',
    'wildlife camera',
    'GPS tracker wildlife',
    'telemetry system',
    'SCADA system',
    'IoT environmental platform',
    'edge computing environmental',
    'cloud analytics environmental',
    'machine learning environmental',
    'AI monitoring environmental',
    'predictive model environmental',
    'digital twin environment',
    'GIS system',
    'remote sensing',
    'citizen science environmental',
    'crowdsourcing environmental',
    'blockchain environmental verification',
    'smart meter',
    'AMI system',
  ],
  contexts: [
    'deployment',
    'innovation',
    'patent',
    'contract',
    'startup',
    'acquisition',
    'market growth',
    'regulation',
    'EPA compliance',
    'climate monitoring',
    'pollution detection',
    'wildfire detection',
    'flood warning',
    'earthquake detection',
    'oil spill detection',
    'methane detection',
    'carbon monitoring',
    'biodiversity tracking',
    'deforestation monitoring',
    'ocean monitoring',
  ],
};

// ─── MATRIX 3: CLIMATE TECH MEGA ──────────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const CLIMATE_TECH_MEGA: TopicMatrix = {
  prefix: 'wat-clim',
  category: 'Energy',
  tier: 4,
  region: 'global',
  entities: [
    'carbon capture',
    'direct air capture',
    'carbon storage',
    'carbon utilization',
    'carbon credit',
    'carbon offset',
    'carbon market',
    'emissions trading',
    'carbon tax',
    'net zero',
    'carbon neutral',
    'climate model',
    'climate prediction',
    'climate adaptation',
    'climate resilience',
    'flood defense',
    'sea level rise',
    'coastal protection',
    'heat island mitigation',
    'urban greening',
    'green building',
    'passive house',
    'net zero building',
    'energy efficiency retrofit',
    'heat pump',
    'geothermal heating',
    'district heating',
    'biomass heating',
    'hydrogen heating',
    'electric vehicle',
    'EV charging',
    'battery recycling',
    'lithium recycling',
    'cobalt recycling',
    'nickel recycling',
    'solid waste management',
    'recycling technology',
    'circular economy',
    'extended producer responsibility',
    'plastic recycling',
    'chemical recycling',
    'mechanical recycling',
    'textile recycling',
    'e-waste recycling',
    'food waste reduction',
    'composting',
    'anaerobic digestion biogas',
    'biogas',
    'biomethane',
    'renewable natural gas',
  ],
  contexts: [
    'technology',
    'investment',
    'startup',
    'policy',
    'regulation',
    'carbon price',
    'market size',
    'deployment',
    'breakthrough',
    'research',
    'government funding',
    'EU policy',
    'US policy',
    'China policy',
    'India policy',
    'corporate commitment',
    'science',
    'IPCC',
    'COP conference',
    'Paris Agreement',
    'UN climate',
    'G7 climate',
    'carbon removal',
    'nature-based solution',
    'reforestation',
  ],
};

// ─── MATRIX 4: MINING & RESOURCES MEGA ────────────────────────────────────────
// 40 entities × 20 contexts = 800 entries
const MINING_RESOURCES_MEGA: TopicMatrix = {
  prefix: 'wat-mine',
  category: 'Energy',
  tier: 3,
  region: 'global',
  entities: [
    'lithium mining',
    'cobalt mining',
    'nickel mining',
    'copper mining',
    'rare earth mining',
    'graphite mining',
    'manganese mining',
    'vanadium mining',
    'silicon mining',
    'gallium mining',
    'germanium mining',
    'indium mining',
    'tellurium mining',
    'selenium mining',
    'platinum mining',
    'palladium mining',
    'rhodium mining',
    'gold mining',
    'silver mining',
    'iron ore mining',
    'bauxite mining',
    'zinc mining',
    'tin mining',
    'tungsten mining',
    'molybdenum mining',
    'tantalum mining',
    'niobium mining',
    'uranium mining',
    'thorium mining',
    'phosphate mining',
    'potash mining',
    'salt mining',
    'diamond mining',
    'emerald mining',
    'sapphire mining',
    'ruby mining',
    'limestone quarrying',
    'granite quarrying',
    'sand mining',
    'gravel mining',
  ],
  contexts: [
    'production',
    'price',
    'supply chain',
    'shortage',
    'discovery',
    'exploration',
    'extraction technology',
    'processing',
    'refining',
    'recycling',
    'environmental impact',
    'regulation',
    'export control',
    'trade restriction',
    'strategic reserve',
    'stockpile',
    'China dominance',
    'US production',
    'Australia production',
    'Chile production',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const WATER_ENVIRONMENT_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(WATER_TECHNOLOGY_MEGA),         // 60 × 25 = 1,500
  ...expandMatrix(ENVIRONMENTAL_MONITORING_MEGA), // 50 × 20 = 1,000
  ...expandMatrix(CLIMATE_TECH_MEGA),             // 50 × 25 = 1,250
  ...expandMatrix(MINING_RESOURCES_MEGA),         // 40 × 20 =   800
  // ─────────────────────────────────────────────────────────
  // TOTAL: 4,550 entries
];

export type { FeedSourceEntry };
