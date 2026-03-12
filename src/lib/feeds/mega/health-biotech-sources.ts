// src/lib/feeds/mega/health-biotech-sources.ts
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
// HEALTH_COMPANIES_MEGA
// 87 entities × 15 contexts = 1,305 entries
// ---------------------------------------------------------------------------
const HEALTH_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'health-co',
  category: 'Enterprise',
  tier: 3,
  region: 'global',
  entities: [
    // Pharma (20)
    'Pfizer',
    'Moderna',
    'Johnson & Johnson',
    'AbbVie',
    'Merck',
    'Eli Lilly',
    'Roche',
    'Novartis',
    'AstraZeneca',
    'Bristol-Myers Squibb',
    'Gilead Sciences',
    'Amgen',
    'Regeneron',
    'Sanofi',
    'GSK',
    'Bayer',
    'Novo Nordisk',
    'Takeda',
    'Biogen',
    'Vertex Pharmaceuticals',
    // MedTech (10)
    'Medtronic',
    'Abbott Laboratories',
    'Boston Scientific',
    'Stryker',
    'Edwards Lifesciences',
    'Intuitive Surgical',
    'Dexcom',
    'Hologic',
    'Zimmer Biomet',
    'Becton Dickinson',
    // Biotech (10)
    'Illumina',
    'Thermo Fisher Scientific',
    'Genentech',
    'BioNTech',
    'CRISPR Therapeutics',
    'Exact Sciences',
    '10x Genomics',
    'Pacific Biosciences',
    'Twist Bioscience',
    'Alnylam Pharmaceuticals',
    // Digital Health (10)
    'Teladoc Health',
    'Veeva Systems',
    'Cerner Oracle health',
    'Epic Systems',
    'Tempus AI',
    'Butterfly Network',
    'Babylon Health',
    'Oscar Health',
    'Hims Hers Health',
    'Ro Health',
    // El Paso / Texas Regional (7)
    'University Medical Center El Paso',
    'Texas Tech Health Sciences',
    'Emergence Health Network',
    'Sierra Providence Health',
    'Del Sol Medical Center',
    'El Paso Children\'s Hospital',
    'William Beaumont Army Medical Center',
  ],
  contexts: [
    'FDA approval',
    'clinical trial',
    'patent filing',
    'acquisition merger',
    'funding round',
    'partnership deal',
    'product launch',
    'research breakthrough',
    'regulatory update',
    'expansion hiring',
    'earnings revenue',
    'technology innovation',
    'contract award',
    'IPO SPAC',
    'leadership executive',
  ],
};

// ---------------------------------------------------------------------------
// HEALTH_TOPICS_MEGA
// 40 entities × 12 contexts = 480 entries
// ---------------------------------------------------------------------------
const HEALTH_TOPICS_MEGA: TopicMatrix = {
  prefix: 'health-topic',
  category: 'Enterprise',
  tier: 4,
  region: 'global',
  entities: [
    'mRNA vaccine technology',
    'gene therapy CRISPR',
    'precision medicine genomics',
    'AI drug discovery',
    'telehealth remote monitoring',
    'wearable health devices',
    'robotic surgery systems',
    'medical imaging AI',
    'digital therapeutics',
    'biosensors diagnostics',
    'health data interoperability',
    'FDA digital health',
    'clinical trial automation',
    'bioprinting tissue engineering',
    'synthetic biology',
    'neurotechnology brain interface',
    'cell therapy CAR-T',
    'medical device cybersecurity',
    'hospital supply chain',
    'pharmaceutical manufacturing',
    'healthcare AI regulation',
    'mental health technology',
    'elderly care robotics',
    'point of care diagnostics',
    'lab automation',
    'drug delivery systems',
    'population health analytics',
    'EHR electronic health records',
    'surgical navigation',
    'radiation therapy technology',
    'dental technology',
    'optical coherence tomography',
    'pharmaceutical logistics cold chain',
    'antimicrobial resistance technology',
    'rare disease therapeutics',
    'companion diagnostics',
    'liquid biopsy technology',
    'health equity technology',
    'maternal health technology',
    'veterinary technology',
  ],
  contexts: [
    'breakthrough',
    'funding investment',
    'patent',
    'clinical results',
    'market growth',
    'startup',
    'acquisition',
    'regulatory approval',
    'research paper',
    'deployment',
    'partnership',
    'El Paso Texas',
  ],
};

// ---------------------------------------------------------------------------
// Final export — all matrices expanded
// HEALTH_COMPANIES_MEGA: 57 × 15 = 855
// HEALTH_TOPICS_MEGA:    40 × 12 = 480
// TOTAL:                           1,335 (all unique entity×context combinations)
// ---------------------------------------------------------------------------
export const HEALTH_BIOTECH_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(HEALTH_COMPANIES_MEGA),
  ...expandMatrix(HEALTH_TOPICS_MEGA),
];
