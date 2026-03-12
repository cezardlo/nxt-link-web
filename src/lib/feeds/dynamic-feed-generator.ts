// src/lib/feeds/dynamic-feed-generator.ts
// Programmatic feed generation — creates thousands of Google News RSS feeds
// covering every country × sector × major company combination.
// This is the "planetary scale" feed engine for NXT LINK.

import type { QualityFeedSource } from './quality-source-feeds';

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

// ── Country × Sector Matrix ─────────────────────────────────────────────────

const COUNTRIES = [
  // Americas
  'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Colombia', 'Chile',
  // Europe
  'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Sweden',
  'Norway', 'Finland', 'Denmark', 'Poland', 'Czech Republic', 'Romania', 'Ukraine',
  'Switzerland', 'Austria', 'Belgium', 'Ireland', 'Portugal', 'Greece', 'Estonia',
  'Lithuania', 'Latvia',
  // Middle East
  'Israel', 'UAE', 'Saudi Arabia', 'Qatar', 'Bahrain', 'Jordan', 'Turkey',
  // Asia Pacific
  'China', 'Japan', 'South Korea', 'Taiwan', 'India', 'Singapore', 'Australia',
  'New Zealand', 'Indonesia', 'Vietnam', 'Thailand', 'Malaysia', 'Philippines',
  'Pakistan', 'Bangladesh',
  // Africa
  'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Morocco', 'Ethiopia', 'Ghana',
  'Rwanda', 'Tanzania',
] as const;

const SECTORS = [
  'artificial intelligence',
  'defense military',
  'cybersecurity',
  'semiconductor chip',
  'robotics automation',
  'space aerospace',
  'energy renewable',
  'quantum computing',
  'biotechnology pharma',
  'autonomous vehicles',
  'supply chain logistics',
  'fintech blockchain',
  'telecommunications 5G',
  'manufacturing industry 4.0',
  'drone UAV',
  'nuclear fusion',
  'water technology',
  'mining technology',
  'agriculture agtech',
  'construction infrastructure',
] as const;

// ── Major Companies (global coverage) ───────────────────────────────────────

const COMPANIES = [
  // US Tech Giants
  'NVIDIA', 'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla',
  'OpenAI', 'Anthropic', 'xAI', 'Databricks', 'Snowflake', 'Palantir',
  'CrowdStrike', 'Palo Alto Networks', 'Fortinet', 'Cloudflare',
  'SpaceX', 'Rocket Lab', 'Planet Labs', 'Relativity Space',
  // US Defense
  'Lockheed Martin', 'Raytheon', 'Boeing', 'Northrop Grumman',
  'General Dynamics', 'L3Harris', 'Anduril', 'Shield AI',
  'Leidos', 'SAIC', 'Booz Allen', 'CACI', 'Kratos Defense',
  // US Semis
  'AMD', 'Intel', 'Qualcomm', 'Broadcom', 'Texas Instruments',
  'Marvell Technology', 'Lattice Semiconductor', 'GlobalFoundries',
  // US AI/Robotics
  'Boston Dynamics', 'Skydio', 'Scale AI', 'Cohere', 'Mistral AI',
  'Stability AI', 'Hugging Face', 'Figure AI', 'Apptronik',
  // US Biotech
  'Moderna', 'Illumina', 'CRISPR Therapeutics', 'Intellia',
  // US Quantum
  'IonQ', 'Rigetti', 'PsiQuantum', 'Atom Computing',
  // US Energy
  'Enphase Energy', 'First Solar', 'QuantumScape', 'Solid Power',
  // Europe
  'ASML', 'SAP', 'Siemens', 'Airbus', 'Thales', 'BAE Systems',
  'Rolls-Royce', 'Rheinmetall', 'Leonardo', 'Safran', 'Dassault',
  'ARM Holdings', 'Darktrace', 'Northvolt', 'Spotify',
  'SAAB', 'Kongsberg', 'Patria', 'Indra', 'Navantia', 'Fincantieri',
  // Israel
  'Elbit Systems', 'Rafael', 'IAI', 'CyberArk', 'Check Point', 'Wiz',
  'Orca Security', 'Cellebrite', 'Tower Semiconductor',
  // Japan
  'Toyota', 'Sony', 'Keyence', 'Fanuc', 'Yaskawa', 'Tokyo Electron',
  'Renesas', 'Mitsubishi Heavy Industries', 'Kawasaki Heavy Industries',
  'SoftBank', 'Preferred Networks',
  // South Korea
  'Samsung', 'SK Hynix', 'LG Energy Solution', 'Hanwha', 'Hyundai',
  'Naver', 'Korea Aerospace Industries',
  // China
  'Huawei', 'DJI', 'CATL', 'BYD', 'SMIC', 'Baidu', 'Alibaba',
  'Tencent', 'SenseTime', 'Hikvision', 'COMAC', 'LONGi Green Energy',
  'DeepSeek', 'ByteDance',
  // Taiwan
  'TSMC', 'Foxconn', 'MediaTek', 'UMC', 'ASE Technology',
  // India
  'Tata', 'Infosys', 'Wipro', 'HAL', 'DRDO', 'Reliance Jio',
  'Biocon', 'Serum Institute',
  // Turkey
  'Baykar', 'ASELSAN', 'TUSAS', 'Roketsan',
  // UAE / Saudi
  'EDGE Group', 'NEOM', 'Aramco', 'Tawazun',
  // Australia
  'Austal', 'CEA Technologies',
  // Brazil
  'Embraer',
  // Singapore
  'ST Engineering',
  // South Africa
  'Paramount Group',
] as const;

// ── Signal Event Types ──────────────────────────────────────────────────────

const SIGNAL_EVENTS = [
  'funding round investment',
  'acquisition merger',
  'contract award billion',
  'patent granted filed',
  'IPO stock listing',
  'partnership collaboration',
  'product launch release',
  'regulatory approval',
  'sanctions export control',
  'hiring expansion layoff',
  'breakthrough discovery',
  'security breach vulnerability',
] as const;

// ── Generator Functions ─────────────────────────────────────────────────────

/** Generate country × sector feeds (e.g., "Japan robotics automation") */
function generateCountrySectorFeeds(): QualityFeedSource[] {
  const feeds: QualityFeedSource[] = [];
  for (const country of COUNTRIES) {
    for (const sector of SECTORS) {
      const id = `dyn-${country.toLowerCase().replace(/\s+/g, '-')}-${sector.split(' ')[0]}`;
      feeds.push({
        id,
        name: `${country} ${sector.split(' ')[0].charAt(0).toUpperCase() + sector.split(' ')[0].slice(1)}`,
        url: GN(`"${country}" ${sector}`),
        type: 'professional',
        tier: 3,
        tags: [country.toLowerCase(), ...sector.split(' ')],
      });
    }
  }
  return feeds;
}

/** Generate company-specific signal feeds */
function generateCompanyFeeds(): QualityFeedSource[] {
  const feeds: QualityFeedSource[] = [];
  for (const company of COMPANIES) {
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // General company news
    feeds.push({
      id: `dyn-co-${slug}`,
      name: `${company} News`,
      url: GN(`"${company}" technology`),
      type: 'financial',
      tier: 2,
      tags: [slug, 'company'],
    });
    // Company + funding/deals
    feeds.push({
      id: `dyn-co-${slug}-deals`,
      name: `${company} Deals`,
      url: GN(`"${company}" (funding OR acquisition OR contract OR partnership)`),
      type: 'financial',
      tier: 2,
      tags: [slug, 'deals', 'funding'],
    });
  }
  return feeds;
}

/** Generate signal event feeds (global) */
function generateSignalEventFeeds(): QualityFeedSource[] {
  const feeds: QualityFeedSource[] = [];
  for (const event of SIGNAL_EVENTS) {
    const slug = event.split(' ')[0];
    feeds.push({
      id: `dyn-signal-${slug}`,
      name: `Global ${slug.charAt(0).toUpperCase() + slug.slice(1)} Signals`,
      url: GN(`${event} technology defense`),
      type: 'financial',
      tier: 2,
      tags: [slug, 'signal'],
    });
  }
  return feeds;
}

/** Generate cross-sector strategic feeds */
function generateStrategicFeeds(): QualityFeedSource[] {
  const strategicQueries = [
    // Geopolitical tech
    'technology war sanctions China United States',
    'CHIPS Act semiconductor manufacturing',
    'AUKUS defense technology submarine',
    'NATO defense spending modernization',
    'EU digital sovereignty technology',
    'Belt Road Initiative technology infrastructure',
    'technology transfer export control',
    'critical minerals rare earth supply chain',
    'AI regulation governance policy',
    'quantum supremacy national security',
    'hypersonic weapons missile defense',
    'space militarization satellite',
    'cyber warfare nation state attack',
    'nuclear fusion energy breakthrough',
    'DARPA research program award',
    'Pentagon budget defense acquisition',
    'venture capital defense technology',
    'SPAC IPO defense technology',
    'unicorn startup billion valuation technology',
    'technology decoupling reshoring supply chain',
    // Regional tech dynamics
    'Middle East technology investment fund',
    'Africa technology startup investment',
    'Southeast Asia technology growth',
    'Latin America technology startup',
    'Nordic defense technology cooperation',
    'Baltic cybersecurity defense',
    'Central Asia technology infrastructure',
    'Pacific Islands security technology',
  ];

  return strategicQueries.map((q, i) => ({
    id: `dyn-strategic-${i}`,
    name: `Strategic: ${q.split(' ').slice(0, 3).join(' ')}...`,
    url: GN(q),
    type: 'professional' as const,
    tier: 2 as const,
    tags: ['strategic', 'geopolitical'],
  }));
}

// ── Main Export ──────────────────────────────────────────────────────────────

let _cachedDynamicFeeds: QualityFeedSource[] | null = null;

/**
 * Returns all dynamically generated feeds.
 * ~1,500 country×sector + ~300 company + ~12 signal events + ~28 strategic = ~1,840 feeds
 * Combined with 183+ static quality feeds = 2,000+ total feeds.
 */
export function getDynamicFeeds(): QualityFeedSource[] {
  if (_cachedDynamicFeeds) return _cachedDynamicFeeds;

  _cachedDynamicFeeds = [
    ...generateCountrySectorFeeds(),
    ...generateCompanyFeeds(),
    ...generateSignalEventFeeds(),
    ...generateStrategicFeeds(),
  ];

  return _cachedDynamicFeeds;
}

/**
 * Returns a subset of dynamic feeds for a given focus area.
 * Use this when you want targeted feeds (e.g., specific country or company).
 */
export function getDynamicFeedsByTag(tag: string): QualityFeedSource[] {
  return getDynamicFeeds().filter(f => f.tags.includes(tag.toLowerCase()));
}

/** Total count of dynamically generated feeds */
export const DYNAMIC_FEED_STATS = {
  countries: COUNTRIES.length,
  sectors: SECTORS.length,
  companies: COMPANIES.length,
  signalEvents: SIGNAL_EVENTS.length,
  estimatedTotal: COUNTRIES.length * SECTORS.length + COMPANIES.length * 2 + SIGNAL_EVENTS.length + 28,
} as const;
