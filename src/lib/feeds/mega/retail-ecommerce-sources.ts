// src/lib/feeds/mega/retail-ecommerce-sources.ts
// NXT//LINK Retail & E-Commerce Mega-Registry
// Matrices × cross-product expansion = 4,000+ unique Google News RSS feeds

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

// ─── MATRIX 1: RETAIL COMPANIES ───────────────────────────────────────────────
// 60 entities × 25 contexts = 1,500 entries
const RETAIL_COMPANIES: TopicMatrix = {
  prefix: 'ret-co',
  category: 'Enterprise',
  tier: 3,
  region: 'national',
  entities: [
    'Amazon retail',
    'Walmart',
    'Target',
    'Costco',
    'Kroger',
    'Albertsons',
    'Ahold Delhaize',
    'Publix',
    'HEB',
    'Meijer',
    'Aldi',
    'Lidl',
    'Trader Joe\'s',
    'Whole Foods',
    'Sprouts Farmers Market',
    'Dollar General',
    'Dollar Tree',
    'Five Below',
    'TJX Companies',
    'Ross Stores',
    'Burlington Coat Factory',
    'Nordstrom',
    'Macy\'s',
    'Kohl\'s',
    'JCPenney',
    'Dillard\'s',
    'Neiman Marcus',
    'Saks Fifth Avenue',
    'Bloomingdale\'s',
    'Lululemon',
    'Nike retail',
    'Adidas retail',
    'Under Armour',
    'LVMH',
    'Kering',
    'Hermes luxury',
    'Chanel',
    'Prada',
    'Burberry',
    'Ralph Lauren',
    'Tapestry Coach',
    'Capri Holdings',
    'VF Corporation',
    'Hanesbrands',
    'PVH Corp',
    'Kontoor Brands',
    'G-III Apparel',
    'Levi Strauss',
    'Gap Inc',
    'Abercrombie Fitch',
    'American Eagle Outfitters',
    'Urban Outfitters',
    'Hot Topic',
    'Bath Body Works',
    'Ulta Beauty',
    'Sephora',
    'Home Depot',
    'Lowe\'s',
    'Wayfair',
    'RH Restoration Hardware',
  ],
  contexts: [
    'revenue',
    'earnings',
    'same-store sales',
    'e-commerce',
    'omnichannel',
    'store opening',
    'store closing',
    'inventory',
    'supply chain',
    'pricing',
    'promotion',
    'loyalty',
    'membership',
    'technology',
    'AI',
    'personalization',
    'checkout',
    'payment',
    'delivery',
    'returns',
    'sustainability',
    'ESG',
    'labor',
    'union',
    'acquisition',
  ],
};

// ─── MATRIX 2: ECOMMERCE TECH ─────────────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const ECOMMERCE_TECH: TopicMatrix = {
  prefix: 'ret-ecom',
  category: 'Enterprise',
  tier: 3,
  region: 'global',
  entities: [
    'Shopify',
    'BigCommerce',
    'WooCommerce',
    'Magento Adobe Commerce',
    'Salesforce Commerce Cloud',
    'SAP Commerce',
    'Oracle Commerce',
    'VTEX',
    'commercetools',
    'Fabric commerce',
    'Elastic Path',
    'Nacelle headless',
    'Swell commerce',
    'Medusa commerce',
    'Saleor',
    'Spree Commerce',
    'PrestaShop',
    'Ecwid',
    'Squarespace Commerce',
    'Wix eCommerce',
    'Volusion',
    'Lightspeed commerce',
    'Clover POS',
    'Toast POS',
    'Square for Retail',
    'Stripe Checkout',
    'Bolt checkout',
    'Skipify checkout',
    'Forter fraud',
    'Riskified fraud prevention',
    'Signifyd fraud',
    'Kount fraud detection',
    'Sift fraud',
    'Narvar shipping',
    'Aftership tracking',
    'Route package protection',
    'Loop Returns',
    'Returnly',
    'Happy Returns',
    'Optoro returns',
    'Goat Group sneakers',
    'StockX marketplace',
    'Poshmark resale',
    'ThredUp',
    'The RealReal',
    'Mercari',
    'OfferUp',
    'Letgo',
    'Reverb marketplace',
    'Depop fashion resale',
  ],
  contexts: [
    'GMV',
    'revenue',
    'funding',
    'IPO',
    'acquisition',
    'partnership',
    'technology',
    'AI',
    'personalization',
    'recommendation',
    'search',
    'checkout',
    'payment',
    'fraud',
    'returns',
    'logistics',
    'fulfillment',
    'marketplace',
    'D2C',
    'subscription',
    'headless commerce',
    'composable commerce',
    'API',
    'integration',
    'international',
  ],
};

// ─── MATRIX 3: RETAIL TECHNOLOGY ──────────────────────────────────────────────
// 50 entities × 25 contexts = 1,250 entries
const RETAIL_TECHNOLOGY: TopicMatrix = {
  prefix: 'ret-tech',
  category: 'Enterprise',
  tier: 4,
  region: 'national',
  entities: [
    'self-checkout retail',
    'smart cart retail',
    'computer vision retail shelf',
    'shelf monitoring planogram',
    'electronic shelf label',
    'digital signage retail',
    'in-store analytics heat mapping',
    'people counting retail',
    'queue management retail',
    'clienteling retail associate',
    'virtual try-on augmented reality',
    'augmented reality retail store',
    'smart mirror fitting room',
    'RFID retail inventory',
    'NFC contactless retail',
    'beacon geofencing retail',
    'mobile POS system',
    'contactless payment retail',
    'biometric payment retail',
    'buy now pay later BNPL',
    'subscription commerce retail',
    'live shopping commerce',
    'social commerce retail',
    'influencer commerce',
    'voice commerce shopping',
    'conversational commerce chatbot',
    'visual search retail',
    'inventory robot retail',
    'Simbe Robotics retail',
    'Bossa Nova retail robot',
    'Badger Technologies retail',
    'Brain Corp floor cleaning',
    'Zebra Technologies retail',
    'Honeywell Retail solutions',
    'NCR retail technology',
    'Diebold Nixdorf retail',
    'Toshiba Global Commerce',
    'Fujitsu Retail solutions',
    'Datalogic barcode scanner',
    'Scandit mobile scanning',
    'Cognex machine vision retail',
    'Pricer electronic shelf',
    'SES-imagotag digital price',
    'Hanshow electronic label',
    'Displaydata shelf label',
    'last mile delivery retail',
    'same-day delivery technology',
    'curbside pickup technology',
    'micro-fulfillment center',
    'dark store retail',
  ],
  contexts: [
    'deployment',
    'pilot',
    'ROI',
    'store',
    'mall',
    'grocery',
    'convenience',
    'pharmacy',
    'fashion',
    'luxury',
    'electronics',
    'furniture',
    'home improvement',
    'sporting goods',
    'pet',
    'beauty',
    'dollar',
    'discount',
    'warehouse club',
    'department store',
    'specialty',
    'franchise',
    'adoption',
    'innovation',
    'patent',
  ],
};

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const RETAIL_ECOMMERCE_MEGA_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(RETAIL_COMPANIES),    // 60 × 25 = 1,500
  ...expandMatrix(ECOMMERCE_TECH),      // 50 × 25 = 1,250
  ...expandMatrix(RETAIL_TECHNOLOGY),   // 50 × 25 = 1,250
  // ─────────────────────────────────────────────────────────
  // TOTAL: 4,000 entries
];

export type { FeedSourceEntry };
