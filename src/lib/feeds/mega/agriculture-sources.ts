// src/lib/feeds/mega/agriculture-sources.ts
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
// AGTECH_COMPANIES_MEGA
// 55 entities × 12 contexts = 660 sources
// ---------------------------------------------------------------------------
const AGTECH_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'ag-co',
  category: 'Supply Chain',
  tier: 3,
  region: 'global',
  entities: [
    // AgTech — Precision / Robotics / Vertical
    'John Deere Precision',
    'CNH Industrial AG',
    'AGCO Precision',
    'Trimble Agriculture',
    'Climate Corporation',
    'Farmers Edge',
    'Indigo Agriculture',
    'Pivot Bio',
    'AppHarvest',
    'Plenty Unlimited',
    'AeroFarms',
    'Bowery Farming',
    'Iron Ox',
    'FarmWise',
    'Blue River Technology',
    'Verdant Robotics',
    'Carbon Robotics',
    'Monarch Tractor',
    'Bear Flag Robotics',
    'Sabanto',
    // Biotech / Seeds / Crop Protection
    'Bayer Crop Science',
    'Corteva Agriscience',
    'Syngenta',
    'BASF Agricultural',
    'FMC Corporation',
    'Nufarm',
    'UPL Limited',
    'Certis Biologicals',
    'Marrone Bio Innovations',
    'Bioceres Crop Solutions',
    // Food Processing / Alt-Protein
    'Tyson Foods',
    'Cargill',
    'ADM',
    'Bunge',
    'JBS',
    'Smithfield Foods',
    'Hormel',
    'Conagra',
    'General Mills',
    'Beyond Meat',
    'Impossible Foods',
    // El Paso / Border Region
    'Paso Del Norte Agriculture',
    'El Paso Water Irrigation',
    'Lower Valley Water District',
    'Frontera Produce',
    'El Paso Chile Company',
    // Additional global majors for depth
    'Deere and Company',
    'Nutrien',
    'Mosaic Company',
    'CF Industries',
    'ICL Group',
    'Yara International',
    'OCP Group',
    'Archer Daniels Midland',
    'Kerry Group',
    'Ingredion',
  ],
  contexts: [
    'technology innovation',
    'precision agriculture',
    'patent filing',
    'acquisition deal',
    'funding round',
    'product launch',
    'sustainability initiative',
    'crop yield breakthrough',
    'automation robotics',
    'supply chain',
    'regulatory approval',
    'research partnership',
  ],
};

// ---------------------------------------------------------------------------
// AGTECH_TOPICS_MEGA
// 25 entities × 8 contexts = 200 sources
// ---------------------------------------------------------------------------
const AGTECH_TOPICS_MEGA: TopicMatrix = {
  prefix: 'ag-tp',
  category: 'Supply Chain',
  tier: 4,
  region: 'global',
  entities: [
    'precision agriculture drones',
    'vertical farming technology',
    'agricultural robotics harvesting',
    'soil health monitoring sensors',
    'crop disease AI detection',
    'smart irrigation water management',
    'livestock monitoring IoT',
    'agricultural data analytics',
    'gene editing crops CRISPR',
    'regenerative agriculture technology',
    'food traceability blockchain',
    'cold chain logistics food',
    'alternative protein technology',
    'aquaculture technology',
    'agricultural autonomous vehicles',
    'pollinator drone technology',
    'climate smart agriculture',
    'food waste reduction technology',
    'greenhouse automation',
    'agricultural biologicals',
    'post-harvest technology',
    'agri-fintech farmer lending',
    'rural connectivity broadband',
    'desert agriculture arid farming',
    'border agriculture trade USMCA',
  ],
  contexts: [
    'breakthrough',
    'funding investment',
    'patent',
    'market growth',
    'startup',
    'research',
    'deployment',
    'regulation',
  ],
};

export const AGRICULTURE_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(AGTECH_COMPANIES_MEGA),
  ...expandMatrix(AGTECH_TOPICS_MEGA),
];
