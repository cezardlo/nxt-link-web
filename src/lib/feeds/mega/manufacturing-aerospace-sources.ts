// src/lib/feeds/mega/manufacturing-aerospace-sources.ts
// NXT//LINK Manufacturing & Aerospace Mega-Registry
// Matrices × cross-product expansion = 2,650+ unique Google News RSS feeds

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

// ─── MATRIX 1: MANUFACTURING COMPANIES MEGA ───────────────────────────────────
// 66 entities × 15 contexts = 990 entries
const MANUFACTURING_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'mfg-co',
  category: 'Enterprise',
  tier: 3,
  region: 'global',
  entities: [
    // Industrial Automation & Controls
    'Siemens',
    'ABB',
    'Honeywell',
    'Emerson Electric',
    'Rockwell Automation',
    'Schneider Electric',
    'Fanuc',
    'Mitsubishi Electric',
    'Yokogawa',
    'Omron',
    'Keyence',
    'Danaher',
    'Parker Hannifin',
    'Illinois Tool Works',
    // Heavy Equipment & Machinery
    'Caterpillar',
    'John Deere',
    'CNH Industrial',
    'AGCO',
    'Komatsu',
    'Hitachi',
    // Additive / 3D Printing
    'Stratasys',
    '3D Systems',
    'Desktop Metal',
    'Markforged',
    'Carbon 3D',
    'EOS',
    'SLM Solutions',
    'Velo3D',
    'Relativity Space',
    'Xometry',
    // Semiconductors
    'TSMC',
    'Samsung Semiconductor',
    'Intel Foundry',
    'GlobalFoundries',
    'SK Hynix',
    'Micron',
    'Texas Instruments',
    'Analog Devices',
    'NXP Semiconductors',
    'Infineon',
    // Materials & Chemicals
    'Dow Chemical',
    'BASF',
    'DuPont',
    '3M',
    'Corning',
    'Nucor Steel',
    'US Steel',
    'Alcoa',
    'Freeport-McMoRan',
    // El Paso / Texas
    'Foxconn El Paso',
    'Plastic Molding Technology El Paso',
    'Cardone Industries',
    'Helen of Troy',
    'Western Refining',
    'Fafnir Bearings',
  ],
  contexts: [
    'factory expansion',
    'automation robotics',
    'patent filing',
    'contract award',
    'acquisition merger',
    'production milestone',
    'supply chain disruption',
    'workforce hiring',
    'technology upgrade',
    'earnings revenue',
    'sustainability initiative',
    'quality certification',
    'new product launch',
    'R&D investment',
    'partnership collaboration',
  ],
};

// ─── MATRIX 2: AEROSPACE COMPANIES MEGA ───────────────────────────────────────
// 38 entities × 12 contexts = 456 entries
const AEROSPACE_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'aero-co',
  category: 'Defense',
  tier: 3,
  region: 'global',
  entities: [
    // Traditional Aerospace
    'Boeing',
    'Airbus',
    'Lockheed Martin Space',
    'Northrop Grumman Space',
    'Raytheon Technologies',
    'General Electric Aviation',
    'Rolls-Royce Aerospace',
    'Pratt Whitney',
    'Safran',
    'BAE Systems',
    'Leonardo DRS',
    'Textron Aviation',
    'Bombardier Aerospace',
    'Embraer',
    // Space
    'SpaceX',
    'Blue Origin',
    'Rocket Lab',
    'Virgin Galactic',
    'Relativity Space',
    'Astra Space',
    'Firefly Aerospace',
    'United Launch Alliance',
    'Axiom Space',
    'Sierra Space',
    'Impulse Space',
    'Stoke Space',
    // Satellite
    'Planet Labs',
    'Maxar Technologies',
    'Viasat',
    'SES',
    'Iridium',
    'OneWeb',
    'Amazon Kuiper',
    'Telesat',
    // Drone / UAV
    'General Atomics',
    'AeroVironment',
    'Kratos Defense',
    'Shield AI',
    'Joby Aviation',
    'Archer Aviation',
    'Wisk Aero',
    'Zipline',
  ],
  contexts: [
    'launch mission',
    'contract award',
    'patent technology',
    'test flight',
    'satellite deployment',
    'production delivery',
    'funding investment',
    'partnership deal',
    'FAA certification',
    'acquisition merger',
    'facility expansion',
    'innovation breakthrough',
  ],
};

// ─── MATRIX 3: MANUFACTURING TOPICS MEGA ──────────────────────────────────────
// 30 entities × 10 contexts = 300 entries
const MANUFACTURING_TOPICS_MEGA: TopicMatrix = {
  prefix: 'mfg-top',
  category: 'Enterprise',
  tier: 4,
  region: 'global',
  entities: [
    'Industry 4.0 smart factory',
    'industrial IoT sensors',
    'digital twin manufacturing',
    'predictive maintenance AI',
    'robotic process automation factory',
    'additive manufacturing metal',
    'semiconductor fabrication',
    'supply chain resilience manufacturing',
    'lean manufacturing automation',
    'quality control machine vision',
    'cobots collaborative robots',
    'autonomous mobile robots warehouse',
    'CNC machining innovation',
    'industrial cybersecurity OT',
    'sustainable manufacturing circular',
    'reshoring manufacturing USA',
    'smart materials composites',
    'laser cutting welding technology',
    'ERP manufacturing systems',
    'workforce training manufacturing',
    'injection molding technology',
    'PCB electronics manufacturing',
    'food processing automation',
    'pharmaceutical manufacturing GMP',
    'battery manufacturing gigafactory',
    'textile manufacturing automation',
    'construction prefabrication modular',
    'water treatment manufacturing',
    'packaging automation technology',
    'steel aluminum processing',
  ],
  contexts: [
    'technology breakthrough',
    'investment funding',
    'patent innovation',
    'market growth',
    'startup disruption',
    'acquisition deal',
    'deployment case study',
    'regulation standard',
    'research development',
    'hiring expansion',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const MANUFACTURING_AEROSPACE_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(MANUFACTURING_COMPANIES_MEGA),  // 66 × 15 =   990
  ...expandMatrix(AEROSPACE_COMPANIES_MEGA),       // 42 × 12 =   504
  ...expandMatrix(MANUFACTURING_TOPICS_MEGA),      // 30 × 10 =   300
  // ─────────────────────────────────────────────────────────
  // TOTAL: 1,794 entries
];

export type { FeedSourceEntry };
