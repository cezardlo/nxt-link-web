// src/lib/feeds/mega/legal-govtech-sources.ts
// NXT//LINK Legal & GovTech Mega-Registry
// Matrices × cross-product expansion = ~4,500 unique Google News RSS feeds

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

// ─── MATRIX 1: LEGAL TECH MEGA ─────────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const LEGAL_TECH_MEGA: TopicMatrix = {
  prefix: 'leg-tech',
  category: 'General',
  tier: 3,
  region: 'national',
  entities: [
    'Clio',
    'MyCase',
    'PracticePanther',
    'Smokeball',
    'Rocket Lawyer',
    'LegalZoom',
    'DoNotPay',
    'Ironclad',
    'Juro',
    'Agiloft',
    'Icertis',
    'DocuSign CLM',
    'ContractPodAi',
    'Evisort',
    'Luminance',
    'Kira Systems',
    'Diligen',
    'Relativity',
    'Nuix',
    'Exterro',
    'Epiq',
    'Consilio',
    'Disco',
    'Logikcull',
    'Everlaw',
    'CaseText',
    'vLex',
    'Westlaw Thomson Reuters',
    'LexisNexis',
    'Bloomberg Law',
    'Fastcase',
    'Ross Intelligence',
    'Harvey AI',
    'Spellbook AI',
    'EvenUp',
    'Darrow',
    'Lex Machina',
    'Ravel Law',
    'Premonition',
    'Gavelytics',
    'Thomson Reuters Legal',
    'Wolters Kluwer Legal',
    'Litera',
    'NetDocuments',
    'iManage',
    'HighQ Thomson Reuters',
    'Practical Law',
    'ContractWorks',
    'Concord',
    'SimpleLegal',
    'BusyLamp',
    'Brightflag',
    'CounselLink',
    'LegalTracker',
    'Mitratech',
    'Onit',
    'Bodhala',
    'Apperio',
    'Xakia',
    'LawVu',
  ],
  contexts: [
    'AI',
    'GPT',
    'contract analysis',
    'document review',
    'e-discovery',
    'litigation',
    'court filing',
    'patent search',
    'trademark',
    'compliance',
    'regulation',
    'funding',
    'acquisition',
    'partnership',
    'revenue',
    'market share',
    'legal operations',
    'in-house counsel',
    'law firm',
    'access to justice',
    'automation',
    'workflow',
    'CLM',
    'billing',
    'matter management',
  ],
};

// ─── MATRIX 2: GOVTECH COMPANIES MEGA ─────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const GOVTECH_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'gov-co',
  category: 'General',
  tier: 3,
  region: 'national',
  entities: [
    'Palantir',
    'Anduril Industries',
    'Shield AI',
    'Rebellion Defense',
    'Second Front Systems',
    'Primer AI',
    'Recorded Future',
    'Babel Street',
    'Dataminr',
    'Zignal Labs',
    'Premise Data',
    'CACI International',
    'Leidos',
    'SAIC',
    'Booz Allen Hamilton',
    'General Dynamics IT',
    'Peraton',
    'Maximus',
    'ICF International',
    'Unison',
    'Carahsoft',
    'Govini',
    'GovWin IQ',
    'Deltek',
    'Tyler Technologies',
    'Accela',
    'CentralSquare Technologies',
    'Mark43',
    'Axon Enterprise',
    'Motorola Solutions',
    'L3Harris',
    'Northrop Grumman IT',
    'Raytheon Intelligence Space',
    'BAE Systems Digital Intelligence',
    'CGI Group',
    'Deloitte Government',
    'Accenture Federal',
    'IBM Federal',
    'Microsoft Government',
    'AWS GovCloud',
    'Google Public Sector',
    'Oracle Government',
    'Salesforce Government',
    'ServiceNow Government',
    'Workday Government',
    'SAP Government',
    'Tableau Government',
    'Esri',
    'Socrata Tyler',
    'OpenGov',
    'Clearview AI',
    'Voyager Labs',
    'Cognyte',
    'Cellebrite',
    'SS8 Networks',
    'Pen-Link',
    'TrueData',
    'Ntrepid',
    'Anomali',
    'Axonius',
  ],
  contexts: [
    'contract',
    'award',
    'protest',
    'IDIQ',
    'BPA',
    'GSA schedule',
    'SBIR',
    'STTR',
    'OTA',
    'procurement',
    'FedRAMP',
    'ATO',
    'zero trust',
    'cloud',
    'AI',
    'data analytics',
    'cybersecurity',
    'intelligence',
    'surveillance',
    'border',
    'defense',
    'civilian',
    'state local',
    'international',
    'partnership',
  ],
};

// ─── MATRIX 3: SMART CITY MEGA ─────────────────────────────────────────────────
// 50 entities × 30 contexts = 1,500 entries
const SMART_CITY_MEGA: TopicMatrix = {
  prefix: 'gov-city',
  category: 'General',
  tier: 4,
  region: 'global',
  entities: [
    'smart traffic management',
    'intelligent transport system',
    'connected vehicle technology',
    'V2X vehicle-to-everything',
    'smart parking system',
    'electric bus fleet',
    'autonomous shuttle deployment',
    'mobility-as-a-service MaaS',
    'ride sharing platform',
    'bike sharing system',
    'scooter sharing micromobility',
    'smart street lighting',
    'LED upgrade municipal',
    'smart meter AMI',
    'demand response energy',
    'distributed energy resources',
    'microgrid community',
    'community solar program',
    'EV charging infrastructure',
    'smart waste management',
    'pneumatic waste collection',
    'recycling automation',
    'smart water meter',
    'leak detection water',
    'pressure management water',
    'water quality monitoring',
    'stormwater management',
    'green infrastructure',
    'permeable pavement',
    'urban forest program',
    'heat island mitigation',
    'cool roof program',
    'green roof installation',
    'air quality monitoring',
    'noise monitoring urban',
    'environmental sensor network',
    'smart building automation',
    'building automation system',
    'HVAC optimization AI',
    'occupancy sensing IoT',
    'digital twin city',
    'urban planning technology',
    '3D mapping urban',
    'GIS analytics city',
    'citizen engagement platform',
    'participatory budgeting',
    'e-government services',
    'smart governance platform',
    'open data portal',
    'public safety technology',
  ],
  contexts: [
    'deployment',
    'pilot',
    'contract',
    'technology',
    'vendor',
    'partnership',
    'funding',
    'grant',
    'federal',
    'state',
    'city',
    'adoption',
    'ROI',
    'cost saving',
    'sustainability',
    'equity',
    'privacy',
    'surveillance',
    'cybersecurity',
    'interoperability',
    'standard',
    'regulation',
    'innovation',
    'citizen',
    'community',
    'accessibility',
    'resilience',
    'disaster',
    'emergency',
    'public safety',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const LEGAL_GOVTECH_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(LEGAL_TECH_MEGA),         // 60 × 25 = 1,500
  ...expandMatrix(GOVTECH_COMPANIES_MEGA),  // 60 × 25 = 1,500
  ...expandMatrix(SMART_CITY_MEGA),         // 50 × 30 = 1,500
  // ─────────────────────────────────────────────────────────
  // TOTAL: 4,500 entries
];

export type { FeedSourceEntry };
