// src/lib/feeds/mega/real-estate-proptech-sources.ts
// NXT//LINK Real Estate & PropTech Mega-Registry
// Matrices × cross-product expansion = ~4,000 unique Google News RSS feeds

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

// ─── MATRIX 1: PROPTECH COMPANIES MEGA ────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const PROPTECH_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'prop-co',
  category: 'General',
  tier: 3,
  region: 'national',
  entities: [
    'Zillow',
    'Redfin',
    'Compass',
    'Opendoor',
    'Offerpad',
    'Knock',
    'Flyhomes',
    'Orchard',
    'Homeward',
    'Ribbon Home',
    'Blend Labs',
    'Better.com',
    'Snapdocs',
    'Qualia',
    'States Title Doma',
    'Notarize',
    'Matterport',
    'Reonomy',
    'Cherre',
    'Enodo',
    'Skyline AI',
    'GeoPhy',
    'HouseCanary',
    'CoreLogic',
    'ATTOM Data',
    'Black Knight ICE',
    'Altus Group',
    'RealPage',
    'Yardi Systems',
    'AppFolio',
    'Buildium RealPage',
    'Entrata',
    'MRI Software',
    'RentManager',
    'Propertyware',
    'CoStar Group',
    'LoopNet CoStar',
    'CREXi',
    'Procore Technologies',
    'PlanGrid Autodesk',
    'Fieldwire Hilti',
    'OpenSpace',
    'Doxel',
    'Versatile',
    'Hover Inc',
    'Roofr',
    'EagleView',
    'Nearmap',
    'Propy',
    'Arrived Homes',
  ],
  contexts: [
    'revenue',
    'funding',
    'valuation',
    'IPO',
    'acquisition',
    'partnership',
    'technology',
    'AI',
    'virtual tour',
    '3D model',
    'iBuying',
    'mortgage',
    'title',
    'appraisal',
    'inspection',
    'closing',
    'blockchain',
    'tokenization',
    'fractional',
    'crowdfunding',
    'REIT',
    'smart building',
    'proptech',
    'real estate market',
    'interest rate',
  ],
};

// ─── MATRIX 2: CONSTRUCTION TECH MEGA ─────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const CONSTRUCTION_TECH_MEGA: TopicMatrix = {
  prefix: 'prop-con',
  category: 'General',
  tier: 3,
  region: 'national',
  entities: [
    'Procore Technologies',
    'PlanGrid Autodesk',
    'Fieldwire Hilti',
    'OpenSpace',
    'Doxel',
    'Versatile',
    'Buildots',
    'Naska AI construction',
    'Dusty Robotics',
    'Canvas Construction robots',
    'Built Robotics',
    'Construction Robotics',
    'Fastbrick Robotics',
    'ICON 3D printing homes',
    'Apis Cor 3D printing',
    'Mighty Buildings',
    'Branch Technology',
    'Factory OS',
    'Prescient modular',
    'Blueprint Robotics',
    'Volumetric Building Companies',
    'Full Stack Modular',
    'Plant Prefab',
    'Connect Homes',
    'Module Housing',
    'Blokable',
    'Veev',
    'Cover Technologies',
    'Entekra',
    'BIM 360 Autodesk',
    'Revit Autodesk',
    'ArchiCAD Graphisoft',
    'Tekla Trimble',
    'SketchUp Trimble',
    'Rhino3D',
    'Enscape',
    'Lumion',
    'Twinmotion Epic',
    'Bentley Systems',
    'Hexagon AB',
    'Trimble',
    'Topcon Positioning',
    'Leica Geosystems',
    'FARO Technologies',
    'NavVis',
    'Matterport',
    'Structurae',
    'Autodesk Construction Cloud',
    'Oracle Construction Management',
    'Egnyte Construction',
  ],
  contexts: [
    'project',
    'contract',
    'technology',
    'robotics',
    '3D printing',
    'modular',
    'prefab',
    'BIM',
    'digital twin',
    'drone',
    'LiDAR',
    'AI',
    'machine learning',
    'safety',
    'sustainability',
    'LEED',
    'net zero',
    'mass timber',
    'cross-laminated timber',
    'concrete innovation',
    'steel innovation',
    'labor shortage',
    'supply chain',
    'cost',
    'schedule',
  ],
};

// ─── MATRIX 3: COMMERCIAL REAL ESTATE MEGA ────────────────────────────────────
// 50 entities × 30 contexts = 1,500 entries
const COMMERCIAL_REAL_ESTATE_MEGA: TopicMatrix = {
  prefix: 'prop-cre',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'CBRE Group',
    'JLL Jones Lang LaSalle',
    'Cushman Wakefield',
    'Colliers International',
    'Newmark Group',
    'Savills',
    'Knight Frank',
    'Avison Young',
    'Marcus Millichap',
    'Eastdil Secured',
    'Brookfield Asset Management',
    'Blackstone Real Estate',
    'Starwood Capital',
    'Prologis',
    'Digital Realty',
    'Equinix',
    'CyrusOne',
    'QTS Realty',
    'CoreSite Realty',
    'Vornado Realty',
    'SL Green Realty',
    'Boston Properties',
    'Kilroy Realty',
    'Cousins Properties',
    'Highwoods Properties',
    'Piedmont Office Realty',
    'Brandywine Realty',
    'Paramount Group',
    'Empire State Realty',
    'RXR Realty',
    'Tishman Speyer',
    'Related Companies',
    'Hines',
    'Lendlease',
    'Skanska',
    'Turner Construction',
    'Bechtel',
    'Fluor Corporation',
    'AECOM',
    'Jacobs Engineering',
    'WSP Global',
    'Stantec',
    'HDR',
    'Gensler',
    'SOM Skidmore Owings',
    'HOK',
    'Perkins and Will',
    'HKS Architects',
    'WeWork',
    'IWG Regus',
  ],
  contexts: [
    'lease',
    'vacancy',
    'rent',
    'cap rate',
    'transaction',
    'acquisition',
    'development',
    'construction',
    'renovation',
    'retrofit',
    'conversion',
    'office-to-residential',
    'sustainability',
    'ESG',
    'LEED',
    'WELL certification',
    'Fitwel',
    'smart building',
    'IoT',
    'tenant experience',
    'coworking',
    'flex space',
    'hybrid workplace',
    'data center',
    'industrial',
    'logistics',
    'multifamily',
    'student housing',
    'senior living',
    'healthcare facility',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const REAL_ESTATE_PROPTECH_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(PROPTECH_COMPANIES_MEGA),       // 50 × 25 = 1,250
  ...expandMatrix(CONSTRUCTION_TECH_MEGA),        // 50 × 25 = 1,250
  ...expandMatrix(COMMERCIAL_REAL_ESTATE_MEGA),   // 50 × 30 = 1,500
  // ─────────────────────────────────────────────────────────
  // TOTAL: 4,000 entries
];

export type { FeedSourceEntry };
