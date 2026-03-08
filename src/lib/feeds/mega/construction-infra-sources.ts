// src/lib/feeds/mega/construction-infra-sources.ts
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
      const slug = `${entity} ${context}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const id = `${m.prefix}-${slug}`;
      const query = `${entity} ${context}`;
      results.push({
        id,
        name: `GN: ${entity.slice(0, 18)} ${context.slice(0, 10)}`,
        url: GN(query),
        category: m.category,
        tags: query.toLowerCase().split(/\s+/).filter(w => w.length > 2),
        tier: m.tier,
        region: m.region ?? 'national',
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// CONSTRUCTION_COMPANIES_MEGA
// 53 entities × 12 contexts = 636 sources
// ---------------------------------------------------------------------------
const CONSTRUCTION_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'ci-co',
  category: 'Enterprise',
  tier: 3,
  region: 'global',
  entities: [
    // Construction / EPC
    'Bechtel',
    'Fluor Corporation',
    'AECOM',
    'Jacobs Engineering',
    'Kiewit',
    'Turner Construction',
    'Skanska',
    'Granite Construction',
    'Vulcan Materials',
    'Martin Marietta',
    'Summit Materials',
    'US Concrete',
    'Eagle Materials',
    // Smart Building / Controls
    'Johnson Controls',
    'Siemens Smart Infrastructure',
    'Schneider Electric Buildings',
    'Honeywell Building Technologies',
    'Carrier Global',
    'Trane Technologies',
    'Lutron Electronics',
    'Crestron',
    // Infrastructure Engineering
    'HNTB',
    'WSP Global',
    'Arcadis',
    'Stantec',
    'HDR Inc',
    'Black and Veatch',
    'Burns McDonnell',
    'Parsons Corporation',
    'Quanta Services',
    'MasTec',
    // PropTech / Construction Tech
    'Procore Technologies',
    'PlanGrid',
    'Autodesk Construction',
    'Bluebeam',
    'Buildertrend',
    'CoStar Group',
    'Matterport',
    'OpenSpace AI',
    // El Paso / Texas
    'Hunt Companies El Paso',
    'Sunland Park Construction',
    'El Paso Electric',
    'Paso del Norte Bridge',
    'El Paso Water Utilities',
    'WestStar Tower',
    'Medical Center of the Americas',
    // Additional global for depth
    'Vinci SA',
    'Balfour Beatty',
    'Ferrovial',
    'ACS Group',
    'Bouygues Construction',
    'Layne Christensen',
    'Dycom Industries',
  ],
  contexts: [
    'contract award',
    'project milestone',
    'technology innovation',
    'patent filing',
    'acquisition merger',
    'sustainability green',
    'workforce hiring',
    'safety technology',
    'smart building IoT',
    'modular construction',
    'infrastructure bill funding',
    'expansion development',
  ],
};

// ---------------------------------------------------------------------------
// CONSTRUCTION_TOPICS_MEGA
// 25 entities × 8 contexts = 200 sources
// ---------------------------------------------------------------------------
const CONSTRUCTION_TOPICS_MEGA: TopicMatrix = {
  prefix: 'ci-tp',
  category: 'Enterprise',
  tier: 4,
  region: 'global',
  entities: [
    'construction robotics automation',
    '3D printing construction',
    'BIM building information modeling',
    'smart building IoT sensors',
    'green building LEED technology',
    'construction drone surveying',
    'modular prefab construction',
    'construction safety wearables',
    'autonomous construction equipment',
    'digital twin buildings',
    'concrete technology innovation',
    'structural health monitoring',
    'construction project management AI',
    'building energy management',
    'water infrastructure smart',
    'electric vehicle charging infrastructure',
    '5G infrastructure deployment',
    'smart city technology',
    'road bridge monitoring sensors',
    'geotechnical monitoring',
    'HVAC innovation',
    'solar building integrated',
    'resilient infrastructure climate',
    'affordable housing technology',
    'border wall infrastructure technology',
  ],
  contexts: [
    'breakthrough',
    'funding investment',
    'patent',
    'market growth',
    'startup',
    'deployment',
    'case study',
    'regulation standard',
  ],
};

export const CONSTRUCTION_INFRA_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(CONSTRUCTION_COMPANIES_MEGA),
  ...expandMatrix(CONSTRUCTION_TOPICS_MEGA),
];
