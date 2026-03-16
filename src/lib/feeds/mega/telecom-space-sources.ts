// src/lib/feeds/mega/telecom-space-sources.ts
// NXT//LINK Telecom & Space Mega-Registry — 5,000+ intelligence sources
// Matrices × cross-product expansion = 5,000 unique Google News RSS feeds

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

// ─── MATRIX 1: TELECOM COMPANIES MEGA ─────────────────────────────────────────
// 60 entities × 20 contexts = 1,200 entries
const TELECOM_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'tel-co',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'AT&T',
    'Verizon',
    'T-Mobile',
    'Comcast',
    'Charter Communications',
    'Dish Network',
    'Lumen Technologies',
    'Frontier Communications',
    'Windstream',
    'Consolidated Communications',
    'TDS Telecom',
    'US Cellular',
    'C Spire',
    'GCI',
    'Hawaiian Telcom',
    'Cincinnati Bell',
    'Shenandoah Telecom',
    'Atlantic Tele-Network',
    'Liberty Latin America',
    'America Movil',
    'Telefonica',
    'Orange',
    'Deutsche Telekom',
    'Vodafone',
    'BT Group',
    'Swisscom',
    'Telenor',
    'Telia Company',
    'KPN',
    'Proximus',
    'Telstra',
    'Singtel',
    'NTT',
    'KDDI',
    'SoftBank Corp',
    'SK Telecom',
    'KT Corp',
    'LG Uplus',
    'China Mobile',
    'China Telecom',
    'China Unicom',
    'Reliance Jio',
    'Bharti Airtel',
    'Etisalat',
    'STC Saudi Telecom',
    'MTN Group',
    'Safaricom',
    'Turkcell',
    'VEON',
    'Millicom',
    'Liberty Global',
    'Altice',
    'Iliad',
    'Rakuten Mobile',
    'Cellnex Telecom',
    'American Tower',
    'Crown Castle',
    'SBA Communications',
    'Uniti Group',
    'Zayo Group',
  ],
  contexts: [
    '5G',
    'spectrum',
    'fiber',
    'earnings',
    'acquisition',
    'partnership',
    'network',
    'capex',
    'subscriber',
    'churn',
    'ARPU',
    'regulation',
    'FCC',
    'antitrust',
    'rural broadband',
    'BEAD',
    'merger',
    'technology',
    'cybersecurity',
    'outage',
  ],
};

// ─── MATRIX 2: SPACE COMPANIES MEGA ───────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const SPACE_COMPANIES_MEGA: TopicMatrix = {
  prefix: 'tel-space',
  category: 'General',
  tier: 4,
  region: 'global',
  entities: [
    'SpaceX',
    'Blue Origin',
    'Rocket Lab',
    'Relativity Space',
    'Firefly Aerospace',
    'Astra Space',
    'Virgin Orbit',
    'ABL Space Systems',
    'Stoke Space',
    'Impulse Space',
    'Launcher',
    'Terran Orbital',
    'Planet Labs',
    'Spire Global',
    'BlackSky Technology',
    'Satellogic',
    'Capella Space',
    'Umbra Space',
    'ICEYE',
    'Synspective',
    'HawkEye 360',
    'Kleos Space',
    'Pixxel',
    'GHGSat',
    'Muon Space',
    'LeoLabs',
    'ExoAnalytic Solutions',
    'Kayhan Space',
    'Slingshot Aerospace',
    'Privateer Space',
    'True Anomaly',
    'Astroscale',
    'ClearSpace',
    'D-Orbit',
    'Momentus',
    'Spaceflight Industries',
    'Exolaunch',
    'ISILaunch',
    'Dawn Aerospace',
    'Gilmour Space',
    'Skyroot Aerospace',
    'Agnikul Cosmos',
    'Dhruva Space',
    'SatSure',
    'GalaxEye',
    'Bellatrix Aerospace',
    'Axiom Space',
    'Vast Space',
    'Sierra Space',
    'Nanoracks',
    'Voyager Space',
    'Redwire Space',
    'Made In Space',
    'Varda Space Industries',
    'Space Forge',
    'ThinkOrbital',
    'Orbital Reef',
    'Northrop Grumman Space',
    'Lockheed Martin Space',
    'Boeing Space',
  ],
  contexts: [
    'launch',
    'contract',
    'funding',
    'IPO',
    'SPAC',
    'revenue',
    'satellite',
    'constellation',
    'orbit',
    'payload',
    'reusable',
    'propulsion',
    'engine test',
    'NASA',
    'DOD',
    'NRO',
    'ESA',
    'JAXA',
    'ISRO',
    'Space Force',
    'commercial',
    'partnership',
    'technology',
    'acquisition',
    'regulatory',
  ],
};

// ─── MATRIX 3: SEMICONDUCTOR MEGA ─────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const SEMICONDUCTOR_MEGA: TopicMatrix = {
  prefix: 'tel-semi',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'TSMC',
    'Samsung Foundry',
    'Intel Foundry',
    'GlobalFoundries',
    'SMIC',
    'UMC',
    'Tower Semiconductor',
    'Vanguard International Semiconductor',
    'DB HiTek',
    'X-Fab',
    'Skywater Technology',
    'Wolfspeed',
    'onsemi',
    'STMicroelectronics',
    'Infineon Technologies',
    'NXP Semiconductors',
    'Renesas Electronics',
    'Microchip Technology',
    'Texas Instruments',
    'Analog Devices',
    'Maxim Integrated',
    'Marvell Technology',
    'Broadcom',
    'Qualcomm',
    'MediaTek',
    'AMD',
    'NVIDIA',
    'Intel',
    'ARM',
    'RISC-V',
    'SiFive',
    'Tenstorrent',
    'Cerebras Systems',
    'Graphcore',
    'Groq',
    'SambaNova Systems',
    'Mythic AI',
    'Syntiant',
    'Hailo',
    'Kneron',
    'Blaize',
    'Flex Logix',
    'Esperanto Technologies',
    'Rain AI',
    'Lightmatter',
    'Luminous Computing',
    'PsiQuantum',
    'IonQ',
    'Rigetti Computing',
    'D-Wave',
    'Honeywell Quantum',
    'IBM Quantum',
    'Google Quantum AI',
    'Microsoft Quantum',
    'Xanadu',
    'Pasqal',
    'Alpine Quantum Technologies',
    'Atom Computing',
    'QuEra Computing',
    'ColdQuanta',
  ],
  contexts: [
    'fab',
    'process node',
    'EUV',
    'packaging',
    'chiplet',
    'HBM',
    'DRAM',
    'NAND',
    'foundry',
    'capacity',
    'expansion',
    'CHIPS Act',
    'subsidy',
    'export control',
    'China',
    'supply chain',
    'revenue',
    'market share',
    'patent',
    'technology',
    'partnership',
    'acquisition',
    'design win',
    'tape-out',
    'yield',
  ],
};

// ─── MATRIX 4: IOT & CONNECTIVITY MEGA ────────────────────────────────────────
// 40 entities × 20 contexts = 800 entries
const IOT_CONNECTIVITY_MEGA: TopicMatrix = {
  prefix: 'tel-iot',
  category: 'General',
  tier: 4,
  region: 'global',
  entities: [
    'LoRaWAN',
    'NB-IoT',
    'LTE-M',
    'Sigfox',
    'Zigbee',
    'Z-Wave',
    'Thread',
    'Matter',
    'Bluetooth mesh',
    'WiFi HaLow',
    '5G IoT',
    'satellite IoT',
    'LPWAN',
    'mesh network',
    'edge gateway',
    'IoT platform',
    'AWS IoT',
    'Azure IoT',
    'Google Cloud IoT',
    'Particle Industries',
    'Arduino',
    'Raspberry Pi',
    'Sierra Wireless',
    'Telit',
    'Quectel',
    'u-blox',
    'Nordic Semiconductor',
    'Silicon Labs',
    'Espressif',
    'Semtech',
    'Actility',
    'Kerlink',
    'Senet',
    'Helium Network',
    'Amazon Sidewalk',
    'Starlink IoT',
    'Swarm Technologies',
    'Myriota',
    'Astrocast',
    'Lacuna Space',
  ],
  contexts: [
    'deployment',
    'standard',
    'certification',
    'security',
    'vulnerability',
    'patent',
    'market growth',
    'adoption',
    'smart city',
    'agriculture',
    'industrial',
    'healthcare',
    'logistics',
    'energy',
    'building',
    'home',
    'vehicle',
    'wearable',
    'regulation',
    'interoperability',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const TELECOM_SPACE_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(TELECOM_COMPANIES_MEGA),  // 60 × 20 = 1,200
  ...expandMatrix(SPACE_COMPANIES_MEGA),    // 60 × 25 = 1,500
  ...expandMatrix(SEMICONDUCTOR_MEGA),      // 60 × 25 = 1,500
  ...expandMatrix(IOT_CONNECTIVITY_MEGA),   // 40 × 20 =   800
  // ─────────────────────────────────────────────────────────
  // TOTAL: 5,000 entries
];

export type { FeedSourceEntry };
