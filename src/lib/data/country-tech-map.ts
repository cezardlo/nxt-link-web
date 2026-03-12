// Country technology profile map for NXT//LINK Global Technology Map
// Used for deck.gl country coloring, tech profile panels, and signal filtering

export type CountryTechProfile = {
  code: string;           // ISO 3166-1 alpha-2
  name: string;
  primarySectors: string[];
  keyCompanies: string[];
  signalKeywords: string[];
  techScore: number;      // 0–100 baseline activity score
  color: string;          // Hex color for map rendering
  lat: number;
  lon: number;
};

export const COUNTRY_TECH_MAP: CountryTechProfile[] = [
  {
    code: 'US',
    name: 'United States',
    primarySectors: ['AI/ML', 'Defense', 'Cybersecurity', 'Robotics', 'Cloud'],
    keyCompanies: [
      'Palantir', 'Anduril', 'Lockheed Martin', 'Raytheon', 'NVIDIA',
      'Google DeepMind', 'Microsoft', 'Amazon Web Services', 'CrowdStrike', 'Boston Dynamics',
    ],
    signalKeywords: [
      'US defense contract', 'Pentagon AI', 'DARPA program', 'DoD procurement',
      'American AI startup', 'Silicon Valley robotics', 'US cybersecurity',
    ],
    techScore: 98,
    color: '#a855f7',
    lat: 38.9,
    lon: -77.0,
  },
  {
    code: 'DE',
    name: 'Germany',
    primarySectors: ['Manufacturing', 'Industrial Automation', 'Automotive', 'Chemicals'],
    keyCompanies: [
      'Siemens', 'KUKA', 'Bosch', 'BASF', 'BMW', 'Volkswagen',
      'SAP', 'Thyssenkrupp', 'Trumpf', 'Festo',
    ],
    signalKeywords: [
      'German industrial automation', 'Industry 4.0', 'Deutsche manufacturing',
      'German automotive tech', 'Mittelstand technology', 'KUKA robotics',
    ],
    techScore: 84,
    color: '#ffd700',
    lat: 52.5,
    lon: 13.4,
  },
  {
    code: 'JP',
    name: 'Japan',
    primarySectors: ['Robotics', 'Sensors', 'Precision Manufacturing', 'Electronics'],
    keyCompanies: [
      'Fanuc', 'Yaskawa', 'Sony', 'Toyota', 'Keyence',
      'Mitsubishi Electric', 'Omron', 'Panasonic', 'Honda Robotics', 'Kawasaki Robotics',
    ],
    signalKeywords: [
      'Japanese robotics', 'Japan precision manufacturing', 'FANUC automation',
      'Toyota production system', 'Japan sensor technology', 'Nippon electronics',
    ],
    techScore: 88,
    color: '#00ff88',
    lat: 35.7,
    lon: 139.7,
  },
  {
    code: 'CN',
    name: 'China',
    primarySectors: ['Robotics Manufacturing', 'AI', 'Drones', 'Semiconductors', 'EVs'],
    keyCompanies: [
      'DJI', 'Huawei', 'SMIC', 'BYD', 'Alibaba DAMO',
      'Baidu AI', 'Horizon Robotics', 'UBTECH', 'Han\'s Laser', 'Hikvision',
    ],
    signalKeywords: [
      'China AI development', 'Chinese drone technology', 'PRC semiconductor',
      'Made in China 2025', 'Chinese EV market', 'Huawei 5G', 'SMIC chip',
    ],
    techScore: 91,
    color: '#a855f7',
    lat: 39.9,
    lon: 116.4,
  },
  {
    code: 'IL',
    name: 'Israel',
    primarySectors: ['Cybersecurity', 'Defense Tech', 'AgTech', 'AI Startups'],
    keyCompanies: [
      'Check Point', 'CyberArk', 'Elbit Systems', 'Rafael', 'IAI',
      'Mobileye', 'WalkMe', 'Waze', 'Netafim', 'IronSource',
    ],
    signalKeywords: [
      'Israeli cybersecurity', 'Israel defense startup', 'Tel Aviv tech',
      'IDF technology spinout', 'Unit 8200 alumni', 'Israel AgTech',
    ],
    techScore: 89,
    color: '#ff3b30',
    lat: 31.8,
    lon: 35.2,
  },
  {
    code: 'KR',
    name: 'South Korea',
    primarySectors: ['Semiconductors', 'Display Tech', 'Robotics', 'EVs'],
    keyCompanies: [
      'Samsung Semiconductor', 'SK Hynix', 'LG Electronics', 'Hyundai Robotics',
      'Kia', 'Doosan Robotics', 'Hanwha', 'POSCO', 'Korea Aerospace Industries', 'Kakao',
    ],
    signalKeywords: [
      'Korean semiconductor', 'Samsung chip', 'SK Hynix memory',
      'Korea display OLED', 'Hyundai EV', 'K-defense export',
    ],
    techScore: 87,
    color: '#00d4ff',
    lat: 37.6,
    lon: 127.0,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    primarySectors: ['FinTech', 'AI Research', 'Defense', 'BioTech'],
    keyCompanies: [
      'DeepMind', 'ARM Holdings', 'BAE Systems', 'Rolls-Royce', 'GSK',
      'Revolut', 'Wise', 'Darktrace', 'Wayve', 'Oxford Nanopore',
    ],
    signalKeywords: [
      'UK fintech', 'British AI research', 'London tech startup',
      'BAE Systems contract', 'UK defense procurement', 'Oxford Cambridge AI',
    ],
    techScore: 85,
    color: '#a855f7',
    lat: 51.5,
    lon: -0.1,
  },
  {
    code: 'FR',
    name: 'France',
    primarySectors: ['Aerospace', 'Nuclear', 'Luxury Tech', 'AI'],
    keyCompanies: [
      'Airbus', 'Thales', 'Safran', 'Dassault Aviation', 'EDF',
      'Mistral AI', 'Ubisoft', 'BNP Paribas Tech', 'Naval Group', 'Renault Software',
    ],
    signalKeywords: [
      'French aerospace', 'Airbus program', 'France nuclear technology',
      'Paris AI startup', 'Mistral AI', 'Thales defense', 'France space agency',
    ],
    techScore: 82,
    color: '#f97316',
    lat: 48.9,
    lon: 2.3,
  },
  {
    code: 'NL',
    name: 'Netherlands',
    primarySectors: ['Semiconductor Equipment', 'AgTech', 'Logistics'],
    keyCompanies: [
      'ASML', 'NXP Semiconductors', 'Philips', 'IMEC', 'Vanderlande',
      'Boskalis', 'Booking.com', 'TomTom', 'Fugro', 'Greenhouse horticulture',
    ],
    signalKeywords: [
      'ASML lithography', 'EUV machine', 'Netherlands semiconductor',
      'Dutch AgTech', 'Holland precision agriculture', 'Rotterdam logistics tech',
    ],
    techScore: 86,
    color: '#00d4ff',
    lat: 52.4,
    lon: 4.9,
  },
  {
    code: 'SE',
    name: 'Sweden',
    primarySectors: ['Robotics', 'Industrial Tech', 'Gaming'],
    keyCompanies: [
      'ABB Robotics', 'Ericsson', 'Volvo Autonomous', 'Scania', 'Spotify',
      'King', 'Mojang', 'Axis Communications', 'Sandvik', 'Husqvarna Robotics',
    ],
    signalKeywords: [
      'ABB robotics Sweden', 'Swedish industrial automation', 'Stockholm gaming',
      'Ericsson 5G', 'Swedish cleantech', 'Nordic deep tech',
    ],
    techScore: 83,
    color: '#00ff88',
    lat: 59.3,
    lon: 18.1,
  },
  {
    code: 'CH',
    name: 'Switzerland',
    primarySectors: ['Precision Engineering', 'MedTech', 'Finance'],
    keyCompanies: [
      'Roche', 'Novartis', 'Zurich Instruments', 'Schindler', 'Georg Fischer',
      'Logitech', 'Straumann', 'Sonova', 'SLM Solutions', 'u-blox',
    ],
    signalKeywords: [
      'Swiss precision engineering', 'Switzerland medtech', 'Basel pharma',
      'Zurich AI research', 'ETH Zurich spinout', 'Swiss finance tech',
    ],
    techScore: 85,
    color: '#ffd700',
    lat: 46.9,
    lon: 7.4,
  },
  {
    code: 'CA',
    name: 'Canada',
    primarySectors: ['AI Research', 'Mining Tech', 'Clean Energy'],
    keyCompanies: [
      'Vector Institute', 'Mila', 'Shopify', 'BlackBerry Security', 'Bombardier',
      'SNC-Lavalin', 'Celestica', 'MDA Space', 'Kinaxis', 'D-Wave',
    ],
    signalKeywords: [
      'Canadian AI research', 'Vector Institute Toronto', 'Mila Montreal AI',
      'Canada mining technology', 'Geoffrey Hinton', 'Canadian quantum computing',
    ],
    techScore: 80,
    color: '#a855f7',
    lat: 45.4,
    lon: -75.7,
  },
  {
    code: 'IN',
    name: 'India',
    primarySectors: ['IT Services', 'Space Tech', 'Defense Manufacturing', 'Pharma'],
    keyCompanies: [
      'Tata Consultancy Services', 'Infosys', 'Wipro', 'ISRO', 'HAL',
      'Sun Pharma', 'Cyient', 'Bharat Electronics', 'L&T Technology', 'Freshworks',
    ],
    signalKeywords: [
      'India IT services', 'ISRO mission', 'Indian defense procurement',
      'Bangalore startup', 'India pharma export', 'Tata technology', 'India AI policy',
    ],
    techScore: 78,
    color: '#f97316',
    lat: 28.6,
    lon: 77.2,
  },
  {
    code: 'BR',
    name: 'Brazil',
    primarySectors: ['AgTech', 'FinTech', 'Clean Energy'],
    keyCompanies: [
      'Embraer', 'Nubank', 'iFood', 'Totvs', 'WEG',
      'Itaú Unibanco Tech', 'Mercado Livre', 'Stone Pagamentos', 'Stefanini', 'Agrorobótica',
    ],
    signalKeywords: [
      'Brazil agtech', 'Brazilian fintech', 'São Paulo startup',
      'Embraer aircraft', 'Brazil clean energy', 'Amazon tech deforestation',
    ],
    techScore: 68,
    color: '#00ff88',
    lat: -15.8,
    lon: -47.9,
  },
  {
    code: 'AU',
    name: 'Australia',
    primarySectors: ['Mining Tech', 'AgTech', 'Defense'],
    keyCompanies: [
      'BHP Technology', 'Rio Tinto AutoHaul', 'Cochlear', 'ResMed', 'Atlassian',
      'Canva', 'Xero', 'CSIRO', 'Austal', 'EOS Defense Systems',
    ],
    signalKeywords: [
      'Australian mining technology', 'AUKUS submarine', 'Australia defense procurement',
      'Sydney tech startup', 'Australian agtech', 'CSIRO research',
    ],
    techScore: 74,
    color: '#ffd700',
    lat: -35.3,
    lon: 149.1,
  },
  {
    code: 'SG',
    name: 'Singapore',
    primarySectors: ['FinTech', 'Logistics', 'Biomedical', 'AI Hub'],
    keyCompanies: [
      'DBS Digital Bank', 'Sea Group', 'Grab', 'ST Engineering', 'A*STAR',
      'Singtel', 'Razer', 'Trax Technology', 'Patsnap', 'Nium',
    ],
    signalKeywords: [
      'Singapore fintech hub', 'SEA AI investment', 'Singapore smart nation',
      'MAS digital bank', 'Singapore logistics tech', 'ASEAN startup Singapore',
    ],
    techScore: 86,
    color: '#00d4ff',
    lat: 1.3,
    lon: 103.8,
  },
  {
    code: 'TW',
    name: 'Taiwan',
    primarySectors: ['Semiconductors', 'Electronics Manufacturing'],
    keyCompanies: [
      'TSMC', 'MediaTek', 'ASE Group', 'Foxconn', 'Delta Electronics',
      'ASUS', 'Acer', 'Realtek', 'Novatek', 'Wistron',
    ],
    signalKeywords: [
      'TSMC fab', 'Taiwan semiconductor', 'Taiwan chip manufacturing',
      'MediaTek SoC', 'Taiwan electronics', 'TSMC Arizona', 'foundry capacity',
    ],
    techScore: 90,
    color: '#00d4ff',
    lat: 25.0,
    lon: 121.5,
  },
  {
    code: 'FI',
    name: 'Finland',
    primarySectors: ['5G/6G', 'Forest Tech', 'Gaming'],
    keyCompanies: [
      'Nokia', 'KONE', 'Wärtsilä', 'Supercell', 'Rovio',
      'Outotec', 'Neste', 'SSH Communications', 'Iceye', 'Haltian',
    ],
    signalKeywords: [
      'Nokia 5G', 'Finland 6G research', 'Finnish gaming studio',
      'Helsinki startup', 'Nordic cyber', 'Oulu technology', 'Finland space tech',
    ],
    techScore: 79,
    color: '#00d4ff',
    lat: 60.2,
    lon: 24.9,
  },
  {
    code: 'DK',
    name: 'Denmark',
    primarySectors: ['Wind Energy', 'MedTech', 'Shipping'],
    keyCompanies: [
      'Vestas', 'Ørsted', 'Maersk Technology', 'Novo Nordisk', 'Coloplast',
      'Universal Robots', 'GN Audio', 'Demant', 'Terma', 'Milestone Systems',
    ],
    signalKeywords: [
      'Denmark wind energy', 'Vestas turbine', 'Danish medtech',
      'Maersk logistics tech', 'Ørsted offshore', 'Copenhagen cleantech',
    ],
    techScore: 80,
    color: '#00ff88',
    lat: 55.7,
    lon: 12.6,
  },
  {
    code: 'NO',
    name: 'Norway',
    primarySectors: ['Maritime Tech', 'Oil & Gas Tech', 'Aquaculture'],
    keyCompanies: [
      'Kongsberg Gruppen', 'Equinor Technology', 'Aker Solutions', 'Yara',
      'Mowi Tech', 'Statkraft', 'Tomra', 'Nordic Semiconductor', 'Hexagon', 'Thin Film Electronics',
    ],
    signalKeywords: [
      'Norway maritime technology', 'Kongsberg defense', 'Norwegian oil tech',
      'North Sea autonomous', 'Norway aquaculture tech', 'Equinor digital',
    ],
    techScore: 77,
    color: '#ffd700',
    lat: 59.9,
    lon: 10.7,
  },
  {
    code: 'PL',
    name: 'Poland',
    primarySectors: ['IT Services', 'Defense', 'Automotive'],
    keyCompanies: [
      'CD Projekt', 'Asseco', 'PGZ', 'Comarch', 'Solaris Bus',
      'WB Electronics', 'Aptiv Poland', 'Borg Warner Poland', 'DataWalk', 'Techland',
    ],
    signalKeywords: [
      'Poland IT outsourcing', 'Polish defense industry', 'Warsaw tech hub',
      'Polish game studio', 'NATO eastern flank Poland', 'Poland automotive supplier',
    ],
    techScore: 70,
    color: '#f97316',
    lat: 52.2,
    lon: 21.0,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    primarySectors: ['Smart City', 'Defense', 'FinTech', 'Space'],
    keyCompanies: [
      'EDGE Group', 'G42 AI', 'Mubadala Technology', 'Careem', 'Bayanat',
      'ADNOC Digital', 'PayBy', 'Presight AI', 'Space42', 'AIQ',
    ],
    signalKeywords: [
      'UAE AI investment', 'Abu Dhabi tech fund', 'Dubai smart city',
      'EDGE defense UAE', 'G42 artificial intelligence', 'UAE space program',
    ],
    techScore: 81,
    color: '#a855f7',
    lat: 24.5,
    lon: 54.4,
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    primarySectors: ['Oil & Gas Tech', 'Smart City', 'AI Investment'],
    keyCompanies: [
      'Saudi Aramco Digital', 'SABIC', 'NEOM', 'stc Ventures', 'Lucid Motors KSA',
      'Saudi Vision AI', "Ma'aden", 'Elm Company', 'Batic', 'Abdul Latif Jameel Tech',
    ],
    signalKeywords: [
      'Saudi Vision 2030 tech', 'NEOM smart city', 'Aramco digital transformation',
      'KSA AI investment', 'Saudi startup', 'Red Sea project technology',
    ],
    techScore: 72,
    color: '#ffd700',
    lat: 24.7,
    lon: 46.7,
  },
  {
    code: 'MX',
    name: 'Mexico',
    primarySectors: ['Manufacturing', 'Maquiladora Tech', 'Aerospace'],
    keyCompanies: [
      'Foxconn Juárez', 'Honeywell Aerospace Mexico', 'Safran Mexico', 'Bombardier Queretaro',
      'General Electric Aviation Mexico', 'Flex Mexico', 'Jabil Mexico', 'Sanmina', 'Kuehne+Nagel Mexico', 'GRUMA',
    ],
    signalKeywords: [
      'Mexico maquiladora technology', 'nearshoring Mexico', 'Juarez manufacturing',
      'Mexico aerospace cluster', 'Queretaro aerospace', 'USMCA supply chain',
    ],
    techScore: 65,
    color: '#ffd700',
    lat: 19.4,
    lon: -99.1,
  },
  {
    code: 'ZA',
    name: 'South Africa',
    primarySectors: ['Mining Tech', 'AgTech', 'FinTech'],
    keyCompanies: [
      'Anglo American Technology', 'Implats Digital', 'Naspers', 'Standard Bank Tech',
      'Aerobotics', 'DataProphet', 'Custos Technologies', 'FNB Digital', 'Vodacom Tech', 'SilverBridge',
    ],
    signalKeywords: [
      'South Africa mining technology', 'Johannesburg fintech', 'African agtech',
      'SA startup ecosystem', 'Cape Town tech', 'Naspers technology venture',
    ],
    techScore: 62,
    color: '#00ff88',
    lat: -25.7,
    lon: 28.2,
  },
];

// O(1) lookup map keyed by ISO2 country code
export const COUNTRY_CODE_MAP: Record<string, CountryTechProfile> = Object.fromEntries(
  COUNTRY_TECH_MAP.map((profile) => [profile.code, profile]),
);

/**
 * Returns the tech profile for a given ISO 3166-1 alpha-2 country code.
 * Returns undefined if the country is not in the map.
 */
export function getCountryByCode(code: string): CountryTechProfile | undefined {
  return COUNTRY_CODE_MAP[code.toUpperCase()];
}

/**
 * Returns all countries whose primarySectors array contains the given sector string.
 * Comparison is case-insensitive.
 */
export function getCountriesBySector(sector: string): CountryTechProfile[] {
  const normalized = sector.toLowerCase();
  return COUNTRY_TECH_MAP.filter((profile) =>
    profile.primarySectors.some((s) => s.toLowerCase().includes(normalized)),
  );
}
