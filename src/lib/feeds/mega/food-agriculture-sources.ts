// src/lib/feeds/mega/food-agriculture-sources.ts
// NXT//LINK Food & Agriculture Mega-Registry
// Matrices × cross-product expansion = 6,000 unique Google News RSS feeds

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

// ─── MATRIX 1: AGTECH COMPANIES ───────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const AGTECH_COMPANIES: TopicMatrix = {
  prefix: 'food-agtech',
  category: 'General',
  tier: 3,
  region: 'national',
  entities: [
    'John Deere',
    'CNH Industrial',
    'AGCO',
    'Kubota',
    'Trimble Agriculture',
    'Raven Industries',
    'Ag Leader',
    'Climate Corporation',
    'Farmers Business Network',
    'Granular',
    'Indigo Agriculture',
    'Pivot Bio',
    'Sound Agriculture',
    'Joyn Bio',
    'Ginkgo Bioworks',
    'Zymergen',
    'Benson Hill',
    'Inari Agriculture',
    'Pairwise',
    'CoverCrop',
    'Trace Genomics',
    'Arable',
    'Ceres Imaging',
    'PrecisionHawk',
    'Sentera',
    'Taranis',
    'Gamaya',
    'Dagan',
    'CropX',
    'Phytech',
    'Netafim',
    'Rivulis',
    'Lindsay Corporation',
    'Valmont Industries',
    'Rain Bird',
    'Hunter Industries',
    'Toro Company',
    'Husqvarna',
    'iRobot Terra',
    'FarmWise',
    'Blue River Technology',
    'Bear Flag Robotics',
    'Monarch Tractor',
    'Sabanto',
    'Rabbit Tractors',
    'Burro',
    'Harvest CROO',
    'Agrobot',
    'AppHarvest',
    'Bowery Farming',
    'Plenty Unlimited',
    'AeroFarms',
    'Gotham Greens',
    'BrightFarms',
    'Little Leaf Farms',
    'Revol Greens',
    'Village Farms',
    'Mastronardi',
    'NatureFresh',
    'Mucci Farms',
  ],
  contexts: [
    'revenue',
    'technology',
    'precision agriculture',
    'AI',
    'drone',
    'satellite',
    'sensor',
    'irrigation',
    'automation',
    'robot',
    'harvest',
    'planting',
    'fertilizer',
    'pesticide',
    'organic',
    'sustainable',
    'regenerative',
    'carbon credit',
    'supply chain',
    'acquisition',
    'funding',
    'IPO',
    'partnership',
    'patent',
    'expansion',
  ],
};

// ─── MATRIX 2: FOOD COMPANIES ─────────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const FOOD_COMPANIES: TopicMatrix = {
  prefix: 'food-co',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Nestle',
    'PepsiCo',
    'Coca-Cola',
    'Unilever',
    'Danone',
    'General Mills',
    'Kellogg',
    'Mondelez',
    'Mars',
    'Ferrero',
    'Tyson Foods',
    'JBS',
    'Cargill',
    'ADM',
    'Bunge',
    'Louis Dreyfus',
    'COFCO',
    'Wilmar',
    'Olam',
    'Barry Callebaut',
    'Hershey',
    'McCormick',
    'Conagra',
    'Hormel',
    'Smithfield',
    'Perdue',
    'Pilgrim\'s Pride',
    'Sanderson Farms',
    'Cal-Maine',
    'Post Holdings',
    'TreeHouse Foods',
    'Lamb Weston',
    'McCain Foods',
    'Simplot',
    'Dole',
    'Del Monte',
    'Chiquita',
    'Driscoll\'s',
    'Ocean Spray',
    'Sunkist',
    'Blue Diamond',
    'Diamond Foods',
    'Wonderful Company',
    'Taylor Farms',
    'Fresh Del Monte',
    'Bonduelle',
    'Greenyard',
    'Total Produce',
    'Fyffes',
    'Beyond Meat',
    'Impossible Foods',
    'Eat Just',
    'Oatly',
    'Califia Farms',
    'Ripple Foods',
    'Perfect Day',
    'New Culture',
    'Formo',
    'TurtleTree',
    'Meati Foods',
  ],
  contexts: [
    'revenue',
    'earnings',
    'acquisition',
    'product launch',
    'recall',
    'sustainability',
    'ESG',
    'supply chain',
    'packaging',
    'food safety',
    'FDA',
    'USDA',
    'organic',
    'non-GMO',
    'plant-based',
    'alternative protein',
    'cultivated meat',
    'fermentation',
    'food tech',
    'automation',
    'AI',
    'cold chain',
    'distribution',
    'retail',
    'e-commerce',
  ],
};

// ─── MATRIX 3: FOOD SAFETY & REGULATION ──────────────────────────────────────
// 40 entities × 25 contexts = 1,000 entries
const FOOD_SAFETY_REGULATION: TopicMatrix = {
  prefix: 'food-reg',
  category: 'General',
  tier: 4,
  region: 'national',
  entities: [
    'FSMA food safety modernization',
    'HACCP hazard analysis critical control',
    'ISO 22000 food safety management',
    'SQF safe quality food',
    'BRC global standard food safety',
    'GFSI global food safety initiative',
    'GMP good manufacturing practice food',
    'GAP good agricultural practice',
    'organic certification USDA NOP',
    'non-GMO verification project',
    'FDA food inspection program',
    'USDA FSIS meat inspection',
    'food recall contamination',
    'foodborne illness outbreak',
    'Salmonella contamination food',
    'E. coli food outbreak',
    'Listeria food contamination',
    'mycotoxin aflatoxin grain',
    'pesticide residue tolerance food',
    'heavy metal contamination food',
    'allergen labeling compliance',
    'food fraud economically motivated',
    'food defense intentional adulteration',
    'traceability food supply chain',
    'blockchain food traceability',
    'food testing laboratory methods',
    'rapid testing pathogen food',
    'PCR testing food safety',
    'immunoassay food testing',
    'mass spectrometry food analysis',
    'chromatography food contaminant',
    'biosensor food pathogen detection',
    'pathogen detection environmental',
    'environmental monitoring food plant',
    'sanitation CIP cleaning food',
    'cold chain temperature monitoring',
    'shelf life extension technology',
    'food packaging innovation',
    'active packaging antimicrobial',
    'intelligent packaging freshness',
  ],
  contexts: [
    'regulation',
    'compliance',
    'technology',
    'innovation',
    'outbreak',
    'investigation',
    'penalty',
    'recall',
    'testing',
    'certification',
    'standard',
    'audit',
    'training',
    'software',
    'IoT',
    'AI',
    'blockchain',
    'traceability',
    'transparency',
    'consumer',
    'industry',
    'government',
    'international',
    'trade',
    'export',
  ],
};

// ─── MATRIX 4: AGRICULTURE COMMODITIES ───────────────────────────────────────
// 40 entities × 25 contexts = 1,000 entries
const AGRICULTURE_COMMODITIES: TopicMatrix = {
  prefix: 'food-cmd',
  category: 'General',
  tier: 4,
  region: 'global',
  entities: [
    'corn grain markets',
    'soybean commodity markets',
    'wheat grain global',
    'rice commodity food',
    'cotton fiber commodity',
    'sugar commodity markets',
    'coffee commodity arabica',
    'cocoa commodity markets',
    'palm oil commodity',
    'canola rapeseed oil',
    'sunflower oil commodity',
    'olive oil markets',
    'beef cattle markets',
    'pork hog markets',
    'poultry chicken commodity',
    'dairy milk commodity',
    'eggs commodity markets',
    'fish seafood commodity',
    'shrimp aquaculture commodity',
    'salmon aquaculture markets',
    'tuna fishery commodity',
    'lobster crab seafood',
    'almond nut commodity',
    'walnut nut markets',
    'pistachio nut commodity',
    'cashew nut markets',
    'macadamia nut commodity',
    'avocado commodity markets',
    'strawberry berry markets',
    'blueberry berry commodity',
    'raspberry berry markets',
    'grape wine commodity',
    'apple fruit commodity',
    'citrus orange commodity',
    'banana fruit markets',
    'mango tropical commodity',
    'papaya tropical markets',
    'pineapple commodity markets',
    'coconut commodity oil',
    'quinoa grain specialty',
  ],
  contexts: [
    'price',
    'futures',
    'harvest',
    'yield',
    'drought',
    'flood',
    'frost',
    'export',
    'import',
    'tariff',
    'trade war',
    'subsidy',
    'insurance',
    'storage',
    'transport',
    'processing',
    'demand',
    'consumption',
    'forecast',
    'USDA report',
    'FAO report',
    'supply surplus',
    'supply deficit',
    'planting',
    'acreage',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const FOOD_AGRICULTURE_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(AGTECH_COMPANIES),          // 60 × 25 = 1,500
  ...expandMatrix(FOOD_COMPANIES),            // 60 × 25 = 1,500
  ...expandMatrix(FOOD_SAFETY_REGULATION),    // 40 × 25 = 1,000
  ...expandMatrix(AGRICULTURE_COMMODITIES),   // 40 × 25 = 1,000
  // ─────────────────────────────────────────────────────────
  // TOTAL: 5,000 entries
];

export type { FeedSourceEntry };
