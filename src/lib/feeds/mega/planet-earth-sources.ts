// @ts-nocheck
// src/lib/feeds/mega/planet-earth-sources.ts
// NXT//LINK Planet Earth Feed Registry
// Tracks everything that could change planet Earth and humanity.
// Categories: Agriculture, Renewable Energy, Life Sciences, Climate Tech,
//             Quantum Computing, Neural Tech, Space, Synthetic Biology

// ─── Regional Google News helpers ─────────────────────────────────────────────
const GN_US = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const GN_CN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
const GN_EU = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-GB&gl=GB&ceid=GB:en`;
const GN_IN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
const GN_IL = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=IL&ceid=IL:en`;
const GN_KR = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko-KR&gl=KR&ceid=KR:ko`;
const GN_JP = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja-JP&gl=JP&ceid=JP:ja`;
const GN_DE = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=de-DE&gl=DE&ceid=DE:de`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FeedSourceEntry {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  tier: 1 | 2 | 3 | 4;
  region: string;
  country_code: string;
  humanity_impact: 'transformative' | 'significant' | 'moderate';
}

function makeId(prefix: string, query: string, country: string): string {
  return `${prefix}-${country}-${query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}`;
}

function gnEntry(
  prefix: string,
  query: string,
  url: string,
  category: string,
  country_code: string,
  region: string,
  tags: string[],
  tier: 1 | 2 | 3 | 4,
  humanity_impact: 'transformative' | 'significant' | 'moderate'
): FeedSourceEntry {
  return {
    id: makeId(prefix, query, country_code),
    name: `GN [${country_code}]: ${query.slice(0, 40)}`,
    url,
    category,
    tags,
    tier,
    region,
    country_code,
    humanity_impact,
  };
}

// ─── Helper: expand a query across regions ─────────────────────────────────────
type RegionVariant = { fn: (q: string) => string; code: string; region: string };

const CORE_REGIONS: RegionVariant[] = [
  { fn: GN_US, code: 'US', region: 'United States' },
  { fn: GN_EU, code: 'EU', region: 'Europe' },
  { fn: GN_IN, code: 'IN', region: 'India' },
  { fn: GN_CN, code: 'CN', region: 'China' },
];

function multiRegion(
  prefix: string,
  queries: string[],
  category: string,
  tags: string[],
  tier: 1 | 2 | 3 | 4,
  humanity_impact: 'transformative' | 'significant' | 'moderate',
  regions: RegionVariant[] = CORE_REGIONS
): FeedSourceEntry[] {
  const entries: FeedSourceEntry[] = [];
  for (const q of queries) {
    for (const r of regions) {
      entries.push(gnEntry(prefix, q, r.fn(q), category, r.code, r.region, tags, tier, humanity_impact));
    }
  }
  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AGRICULTURE & FOOD SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

const AG_QUERIES = [
  'precision agriculture AI technology',
  'vertical farming indoor crops',
  'lab grown meat cultivated protein',
  'CRISPR crop gene editing food',
  'food security water scarcity drought',
  'smart irrigation agriculture technology',
  'agricultural robotics automation harvest',
  'insect protein alternative food',
  'seaweed kelp ocean farming',
  'soil microbiome regenerative agriculture',
  'drought resistant crop variety seed',
  'aquaculture fish farming technology',
  'food supply chain disruption',
  'nitrogen fertilizer alternative biologic',
  'urban farming food desert access',
];

const AG_TAGS = ['agriculture', 'food', 'farming', 'crop', 'food-security'];

const AG_GN_FEEDS = multiRegion('ag', AG_QUERIES, 'agriculture', AG_TAGS, 1, 'transformative');

const AG_DIRECT_FEEDS: FeedSourceEntry[] = [
  { id: 'fao-newsroom', name: 'FAO UN Food & Agriculture', url: 'https://www.fao.org/newsroom/rss/en/', category: 'agriculture', tags: ['fao', 'food', 'agriculture', 'un'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'usda-rss', name: 'USDA Official News', url: 'https://www.usda.gov/rss/home.xml', category: 'agriculture', tags: ['usda', 'agriculture', 'policy', 'food'], tier: 1, region: 'United States', country_code: 'US', humanity_impact: 'significant' },
  { id: 'agfunder-news', name: 'AgFunder News', url: 'https://agfundernews.com/feed', category: 'agriculture', tags: ['agtech', 'investment', 'startup', 'farming'], tier: 2, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'food-navigator', name: 'Food Navigator', url: 'https://www.foodnavigator.com/rss/news', category: 'agriculture', tags: ['food', 'innovation', 'nutrition', 'market'], tier: 2, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'significant' },
  { id: 'modern-farmer', name: 'Modern Farmer', url: 'https://modernfarmer.com/feed/', category: 'agriculture', tags: ['farming', 'technology', 'food', 'sustainability'], tier: 3, region: 'United States', country_code: 'US', humanity_impact: 'moderate' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RENEWABLE ENERGY & CLIMATE
// ═══════════════════════════════════════════════════════════════════════════════

const ENERGY_QUERIES = [
  'solar panel efficiency record breakthrough',
  'fusion energy reactor milestone',
  'green hydrogen production electrolysis',
  'solid state battery energy storage',
  'offshore wind turbine installation',
  'carbon capture storage technology',
  'climate tech startup investment',
  'perovskite solar cell breakthrough',
  'nuclear fusion ITER progress',
  'geothermal energy deep drilling',
  'tidal wave ocean energy',
  'long duration energy storage grid',
  'rooftop solar microinverter innovation',
  'green ammonia production renewable',
  'distributed energy resource management',
];

const ENERGY_TAGS = ['renewable', 'energy', 'solar', 'fusion', 'climate', 'storage'];

const ENERGY_GN_FEEDS = multiRegion('energy', ENERGY_QUERIES, 'renewable-energy', ENERGY_TAGS, 1, 'transformative');

const ENERGY_DIRECT_FEEDS: FeedSourceEntry[] = [
  { id: 'irena-news', name: 'IRENA News', url: 'https://www.irena.org/rss/News.xml', category: 'renewable-energy', tags: ['irena', 'renewable', 'energy', 'policy'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'iea-news', name: 'IEA News', url: 'https://www.iea.org/rss/news.xml', category: 'renewable-energy', tags: ['iea', 'energy', 'policy', 'market'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'cleantechnica', name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', category: 'renewable-energy', tags: ['cleantech', 'ev', 'solar', 'wind', 'battery'], tier: 2, region: 'United States', country_code: 'US', humanity_impact: 'transformative' },
  { id: 'electrek', name: 'Electrek', url: 'https://electrek.co/feed/', category: 'renewable-energy', tags: ['ev', 'solar', 'tesla', 'battery', 'clean-energy'], tier: 2, region: 'United States', country_code: 'US', humanity_impact: 'significant' },
  { id: 'pv-magazine', name: 'PV Magazine Solar', url: 'https://www.pv-magazine.com/feed/', category: 'renewable-energy', tags: ['solar', 'pv', 'photovoltaic', 'efficiency'], tier: 2, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3. LIFE SCIENCES & LONGEVITY
// ═══════════════════════════════════════════════════════════════════════════════

const LIFE_QUERIES = [
  'CRISPR gene editing therapy clinical trial',
  'longevity aging reversal research breakthrough',
  'mRNA vaccine new disease application',
  'cancer immunotherapy CAR-T breakthrough',
  'stem cell regenerative medicine',
  'brain organoid neural development',
  'antibiotic resistance new treatment',
  'pandemic preparedness early warning',
  'microbiome gut health discovery',
  'protein structure folding AlphaFold discovery',
  'epigenetic reprogramming age reversal',
  'senolytic drug aging cellular',
  'gene therapy rare disease approval',
  'organ on chip drug discovery',
  'xenotransplantation pig organ human',
];

const LIFE_TAGS = ['life-sciences', 'biotech', 'longevity', 'crispr', 'medicine', 'aging'];

const LIFE_GN_FEEDS = multiRegion(
  'life',
  LIFE_QUERIES,
  'life-sciences',
  LIFE_TAGS,
  1,
  'transformative',
  [
    { fn: GN_US, code: 'US', region: 'United States' },
    { fn: GN_EU, code: 'EU', region: 'Europe' },
    { fn: GN_IN, code: 'IN', region: 'India' },
  ]
);

const LIFE_DIRECT_FEEDS: FeedSourceEntry[] = [
  { id: 'nature-life-sciences', name: 'Nature Life Sciences', url: 'https://www.nature.com/subjects/life-sciences.rss', category: 'life-sciences', tags: ['nature', 'research', 'biology', 'medicine'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'cell-journal', name: 'Cell Journal', url: 'https://www.cell.com/rss/current', category: 'life-sciences', tags: ['cell', 'biology', 'research', 'breakthrough'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'nejm-rss', name: 'New England Journal of Medicine', url: 'https://www.nejm.org/action/showFeed?jc=nejmoa&type=etoc&feed=rss', category: 'life-sciences', tags: ['nejm', 'medicine', 'clinical', 'trial'], tier: 1, region: 'United States', country_code: 'US', humanity_impact: 'transformative' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CLIMATE & OCEAN TECH
// ═══════════════════════════════════════════════════════════════════════════════

const CLIMATE_QUERIES = [
  'ocean plastic cleanup technology solution',
  'desalination technology clean water',
  'coral reef restoration marine',
  'atmospheric carbon removal direct air capture',
  'methane emissions reduction technology',
  'geoengineering solar radiation management',
  'permafrost methane climate feedback',
  'sea level rise adaptation coastal',
  'ocean acidification marine biology',
  'blue carbon mangrove seagrass',
  'wildfire prediction AI satellite',
  'flood early warning system AI',
  'heat pump efficiency breakthrough',
  'circular economy plastic waste',
  'net zero carbon corporate target',
];

const CLIMATE_TAGS = ['climate', 'ocean', 'carbon', 'environment', 'geoengineering'];

const CLIMATE_GN_FEEDS = multiRegion('climate', CLIMATE_QUERIES, 'climate-tech', CLIMATE_TAGS, 1, 'transformative');

const CLIMATE_DIRECT_FEEDS: FeedSourceEntry[] = [
  { id: 'nasa-climate', name: 'NASA Climate News', url: 'https://climate.nasa.gov/news/rss.xml', category: 'climate-tech', tags: ['nasa', 'climate', 'earth', 'satellite'], tier: 1, region: 'United States', country_code: 'US', humanity_impact: 'transformative' },
  { id: 'ipcc-rss', name: 'IPCC Climate', url: 'https://www.ipcc.ch/rss.xml', category: 'climate-tech', tags: ['ipcc', 'climate', 'policy', 'report'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
  { id: 'noaa-ocean', name: 'NOAA Ocean Service', url: 'https://oceanservice.noaa.gov/rss/oceanservice_podcast.xml', category: 'climate-tech', tags: ['noaa', 'ocean', 'marine', 'environment'], tier: 2, region: 'United States', country_code: 'US', humanity_impact: 'significant' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 5. QUANTUM COMPUTING & MATERIALS
// ═══════════════════════════════════════════════════════════════════════════════

const QUANTUM_QUERIES = [
  'quantum computer qubit breakthrough IBM Google',
  'quantum cryptography post-quantum security',
  'graphene 2D material application',
  'topological material quantum',
  'room temperature superconductor discovery',
  'metamaterial cloaking optical breakthrough',
  'photonic chip quantum communication',
  'quantum sensor gravimeter navigation',
  'quantum advantage computation milestone',
  'error correction quantum hardware',
  'quantum network entanglement distribution',
  'quantum simulation chemistry drug discovery',
];

const QUANTUM_TAGS = ['quantum', 'computing', 'qubit', 'superconductor', 'materials'];

const QUANTUM_GN_FEEDS = multiRegion(
  'quantum',
  QUANTUM_QUERIES,
  'quantum',
  QUANTUM_TAGS,
  1,
  'transformative',
  [
    { fn: GN_US, code: 'US', region: 'United States' },
    { fn: GN_EU, code: 'EU', region: 'Europe' },
    { fn: GN_CN, code: 'CN', region: 'China' },
    { fn: GN_KR, code: 'KR', region: 'South Korea' },
    { fn: GN_JP, code: 'JP', region: 'Japan' },
  ]
);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. NEURAL TECH & HUMAN AUGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const NEURAL_QUERIES = [
  'brain computer interface Neuralink BCI',
  'neural implant paralysis restoration',
  'augmented reality brain interface',
  'exoskeleton rehabilitation motor control',
  'consciousness neuroscience discovery',
  'memory enhancement neural circuit',
  'prosthetic limb sensation neural',
  'closed loop neurostimulation depression',
  'EEG wearable brain monitoring consumer',
  'speech decoding brain signal AI',
];

const NEURAL_TAGS = ['neuraltech', 'bci', 'brain', 'neural', 'implant', 'augmentation'];

const NEURAL_GN_FEEDS = multiRegion(
  'neural',
  NEURAL_QUERIES,
  'neural-tech',
  NEURAL_TAGS,
  1,
  'transformative',
  [
    { fn: GN_US, code: 'US', region: 'United States' },
    { fn: GN_EU, code: 'EU', region: 'Europe' },
    { fn: GN_IL, code: 'IL', region: 'Israel' },
  ]
);

const NEURAL_DIRECT_FEEDS: FeedSourceEntry[] = [
  { id: 'neuron-journal', name: 'Neuron Journal', url: 'https://www.cell.com/neuron/rss/current', category: 'neural-tech', tags: ['neuron', 'neuroscience', 'brain', 'research'], tier: 1, region: 'Global', country_code: 'GLOBAL', humanity_impact: 'transformative' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SPACE COLONIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const SPACE_QUERIES = [
  'Mars colonization habitat technology',
  'lunar gateway moon base',
  'asteroid mining space resources',
  'space manufacturing zero gravity',
  'interplanetary propulsion breakthrough',
  'exoplanet discovery habitable',
  'reusable rocket launch cost',
  'satellite internet constellation LEO',
  'space debris removal active',
  'lunar water ice extraction',
  'SpaceX Starship test flight',
  'commercial space station habitation',
];

const SPACE_TAGS = ['space', 'mars', 'moon', 'satellite', 'launch', 'colonization'];

const SPACE_GN_FEEDS = multiRegion(
  'space',
  SPACE_QUERIES,
  'space',
  SPACE_TAGS,
  1,
  'transformative',
  [
    { fn: GN_US, code: 'US', region: 'United States' },
    { fn: GN_CN, code: 'CN', region: 'China' },
    { fn: GN_EU, code: 'EU', region: 'Europe' },
    { fn: GN_IN, code: 'IN', region: 'India' },
    { fn: GN_JP, code: 'JP', region: 'Japan' },
  ]
);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SYNTHETIC BIOLOGY
// ═══════════════════════════════════════════════════════════════════════════════

const SYNBIO_QUERIES = [
  'synthetic biology programmed cells',
  'biofoundry automated biology',
  'DNA data storage information',
  'engineered microorganism CO2',
  'xenobiology artificial life',
  'metabolic engineering bioproduction',
  'cell free protein synthesis',
  'minimal genome synthetic organism',
  'plant factory controlled environment',
  'biological computing living machine',
];

const SYNBIO_TAGS = ['synthetic-biology', 'biotech', 'dna', 'microorganism', 'biofoundry'];

const SYNBIO_GN_FEEDS = multiRegion(
  'synbio',
  SYNBIO_QUERIES,
  'synthetic-bio',
  SYNBIO_TAGS,
  1,
  'transformative',
  [
    { fn: GN_US, code: 'US', region: 'United States' },
    { fn: GN_EU, code: 'EU', region: 'Europe' },
    { fn: GN_CN, code: 'CN', region: 'China' },
  ]
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const PLANET_EARTH_FEEDS: FeedSourceEntry[] = [
  // 1. Agriculture & Food Security
  ...AG_GN_FEEDS,
  ...AG_DIRECT_FEEDS,

  // 2. Renewable Energy & Climate
  ...ENERGY_GN_FEEDS,
  ...ENERGY_DIRECT_FEEDS,

  // 3. Life Sciences & Longevity
  ...LIFE_GN_FEEDS,
  ...LIFE_DIRECT_FEEDS,

  // 4. Climate & Ocean Tech
  ...CLIMATE_GN_FEEDS,
  ...CLIMATE_DIRECT_FEEDS,

  // 5. Quantum Computing & Materials
  ...QUANTUM_GN_FEEDS,

  // 6. Neural Tech & Human Augmentation
  ...NEURAL_GN_FEEDS,
  ...NEURAL_DIRECT_FEEDS,

  // 7. Space Colonization
  ...SPACE_GN_FEEDS,

  // 8. Synthetic Biology
  ...SYNBIO_GN_FEEDS,
];

export const PLANET_EARTH_FEED_COUNT = PLANET_EARTH_FEEDS.length;

// Category summary for UI rendering
export const PLANET_EARTH_CATEGORIES = [
  { id: 'agriculture',     label: 'Agriculture & Food',    emoji: '🌾', color: '#84CC16' },
  { id: 'renewable-energy',label: 'Renewable Energy',      emoji: '☀️', color: '#F97316' },
  { id: 'life-sciences',   label: 'Life Sciences',         emoji: '🧬', color: '#EC4899' },
  { id: 'climate-tech',    label: 'Climate Tech',          emoji: '🌍', color: '#14B8A6' },
  { id: 'quantum',         label: 'Quantum',               emoji: '⚛️', color: '#A78BFA' },
  { id: 'neural-tech',     label: 'Neural Tech',           emoji: '🧠', color: '#F472B6' },
  { id: 'space',           label: 'Space',                 emoji: '🚀', color: '#60A5FA' },
  { id: 'synthetic-bio',   label: 'Synthetic Biology',     emoji: '🔬', color: '#34D399' },
];
