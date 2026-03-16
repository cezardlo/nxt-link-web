// src/lib/feeds/mega/automotive-mobility-sources.ts
// NXT//LINK Automotive & Mobility Mega-Registry
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

// ─── MATRIX 1: AUTO MANUFACTURERS ─────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const AUTO_MANUFACTURERS: TopicMatrix = {
  prefix: 'auto-mfr',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Tesla',
    'Toyota',
    'Volkswagen',
    'Hyundai',
    'Kia',
    'BMW',
    'Mercedes-Benz',
    'Audi',
    'Porsche',
    'Volvo Cars',
    'Stellantis',
    'Ford Motor',
    'General Motors',
    'Rivian',
    'Lucid Motors',
    'Fisker',
    'Polestar',
    'NIO',
    'BYD',
    'XPeng',
    'Li Auto',
    'Geely',
    'Great Wall Motors',
    'Chery Automobile',
    'SAIC Motor',
    'Dongfeng Motor',
    'FAW Group',
    'GAC Group',
    'Changan Automobile',
    'Honda',
    'Nissan',
    'Mazda',
    'Subaru',
    'Mitsubishi Motors',
    'Suzuki',
    'Isuzu',
    'Renault',
    'Peugeot Stellantis',
    'Citroen Stellantis',
    'Fiat Stellantis',
    'Alfa Romeo',
    'Maserati',
    'Ferrari',
    'Lamborghini',
    'Bugatti',
    'McLaren Automotive',
    'Aston Martin',
    'Bentley',
    'Rolls-Royce',
    'Range Rover',
    'Jaguar',
    'Tata Motors',
    'Mahindra Automotive',
    'Maruti Suzuki',
    'Proton',
    'VinFast',
    'Foxconn MIH EV',
    'Sony Honda Mobility',
    'Xiaomi Auto',
    'Baidu Apollo auto',
  ],
  contexts: [
    'sales',
    'revenue',
    'EV',
    'hybrid',
    'hydrogen',
    'autonomous',
    'ADAS',
    'recall',
    'safety',
    'NHTSA',
    'factory',
    'expansion',
    'layoff',
    'hiring',
    'supply chain',
    'chip shortage',
    'battery',
    'charging',
    'partnership',
    'technology',
    'design',
    'concept',
    'launch',
    'price',
    'market share',
  ],
};

// ─── MATRIX 2: EV BATTERY & CHARGING ─────────────────────────────────────────
// 50 entities × 30 contexts = 1,500 entries
const EV_BATTERY_CHARGING: TopicMatrix = {
  prefix: 'auto-batt',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'CATL battery',
    'LG Energy Solution',
    'Samsung SDI battery',
    'SK On battery',
    'Panasonic Energy',
    'BYD blade battery',
    'CALB battery',
    'EVE Energy',
    'Gotion High-Tech',
    'Svolt Energy',
    'Farasis Energy',
    'Envision AESC',
    'FREYR Battery',
    'Northvolt',
    'Britishvolt',
    'PowerCo Volkswagen',
    'ACC Stellantis battery',
    'Microvast',
    'Enovix',
    'QuantumScape solid state',
    'Solid Power',
    'SES AI battery',
    'ProLogium solid state',
    'Blue Solutions Bolore',
    'Sila Nanotechnologies',
    'Group14 Technologies',
    'Enevate silicon battery',
    'StoreDot fast charging',
    'Amprius Technologies',
    '24M Technologies',
    'ChargePoint',
    'EVgo',
    'Electrify America',
    'Tesla Supercharger',
    'Blink Charging',
    'Wallbox EV charging',
    'ABB E-mobility',
    'Siemens eMobility',
    'Eaton EV charging',
    'Schneider Electric EV',
    'Delta Electronics EV',
    'StarCharge',
    'TGOOD charging',
    'XCharge',
    'Kempower charging',
    'Tritium charging',
    'BTC Power charging',
    'Beam Global solar charging',
    'FreeWire charging',
    'Greenlots Shell charging',
  ],
  contexts: [
    'capacity',
    'factory',
    'expansion',
    'technology',
    'solid-state',
    'sodium-ion',
    'lithium-iron-phosphate',
    'silicon anode',
    'dry electrode',
    'cell-to-pack',
    'gigafactory',
    'supply chain',
    'lithium',
    'cobalt',
    'nickel',
    'recycling',
    'second life',
    'fast charging',
    'ultra-fast',
    'wireless charging',
    'V2G vehicle-to-grid',
    'battery swap',
    'standard',
    'regulation',
    'investment',
    'partnership',
    'patent',
    'cost',
    'energy density',
    'cycle life',
  ],
};

// ─── MATRIX 3: AUTO SUPPLIERS ─────────────────────────────────────────────────
// 50 entities × 20 contexts = 1,000 entries
const AUTO_SUPPLIERS: TopicMatrix = {
  prefix: 'auto-sup',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Bosch automotive',
    'Continental AG',
    'Denso Corporation',
    'ZF Friedrichshafen',
    'Aisin Corporation',
    'Magna International',
    'Hyundai Mobis',
    'Lear Corporation',
    'BorgWarner',
    'Aptiv',
    'Valeo',
    'Schaeffler',
    'Nidec automotive',
    'Hitachi Astemo',
    'Marelli',
    'Plastic Omnium',
    'Faurecia Forvia',
    'Yanfeng',
    'Mobileye Intel',
    'Luminar Technologies',
    'Velodyne Lidar',
    'Ouster Lidar',
    'Innoviz Technologies',
    'Cepton Lidar',
    'Aeva Technologies',
    'Pioneer automotive',
    'Harman Samsung',
    'Visteon',
    'Gentex',
    'Modine Manufacturing',
    'Dana Incorporated',
    'American Axle',
    'Nexteer Automotive',
    'Martinrea International',
    'Linamar Corporation',
    'Nemak',
    'Brembo brakes',
    'Akebono Brake',
    'Autoliv safety',
    'Joyson Safety Systems',
    'Toyoda Gosei',
    'Tokai Rika',
    'Alps Alpine',
    'TE Connectivity auto',
    'Sensata Technologies',
    'Methode Electronics',
    'Dorman Products',
    'Standard Motor Products',
    'Modivcare',
    'Cooper-Standard',
  ],
  contexts: [
    'revenue',
    'contract',
    'technology',
    'ADAS',
    'LiDAR',
    'radar',
    'camera',
    'sensor fusion',
    'autonomous',
    'EV component',
    'motor',
    'inverter',
    'thermal management',
    'brake-by-wire',
    'steer-by-wire',
    'cockpit',
    'HUD display',
    'lighting LED',
    'chassis',
    'acquisition',
  ],
};

// ─── MATRIX 4: MOBILITY SERVICES ──────────────────────────────────────────────
// 50 entities × 20 contexts = 1,000 entries
const MOBILITY_SERVICES: TopicMatrix = {
  prefix: 'auto-mob',
  category: 'General',
  tier: 3,
  region: 'global',
  entities: [
    'Uber',
    'Lyft',
    'Didi Chuxing',
    'Grab',
    'Gojek',
    'Ola Cabs',
    'Bolt ride',
    'FREE NOW',
    'Cabify',
    'inDrive',
    'Via transportation',
    'Curb taxi',
    'Flywheel taxi',
    'Alto ride',
    'Empower ride',
    'HopSkipDrive',
    'Zum school transport',
    'Turo car sharing',
    'Getaround',
    'Zipcar',
    'Enterprise car rental',
    'Hertz',
    'Avis Budget',
    'Sixt',
    'Europcar',
    'Lime scooter',
    'Bird scooter',
    'Spin scooter',
    'Tier Mobility',
    'Voi scooter',
    'Dott scooter',
    'Helbiz',
    'Superpedestrian',
    'Wheels scooter',
    'BlaBlaCar',
    'FlixBus',
    'Greyhound',
    'Amtrak',
    'Brightline train',
    'Virgin Hyperloop',
    'Lilium eVTOL',
    'Joby Aviation',
    'Archer Aviation',
    'Vertical Aerospace',
    'Wisk Aero',
    'Overair',
    'Supernal Hyundai',
    'Beta Technologies eVTOL',
    'Electra Aero',
    'Whisper Aero',
  ],
  contexts: [
    'revenue',
    'rides',
    'users',
    'funding',
    'IPO',
    'regulation',
    'safety',
    'insurance',
    'autonomous',
    'electric',
    'subscription',
    'fleet',
    'expansion',
    'partnership',
    'acquisition',
    'technology',
    'pricing',
    'competition',
    'labor',
    'driver',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const AUTOMOTIVE_MOBILITY_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(AUTO_MANUFACTURERS),    // 60 × 25 = 1,500
  ...expandMatrix(EV_BATTERY_CHARGING),   // 50 × 30 = 1,500
  ...expandMatrix(AUTO_SUPPLIERS),        // 50 × 20 = 1,000
  ...expandMatrix(MOBILITY_SERVICES),     // 50 × 20 = 1,000
  // ─────────────────────────────────────────────────────────
  // TOTAL: 5,000 entries
];

export type { FeedSourceEntry };
