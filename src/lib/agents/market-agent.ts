// src/lib/agents/market-agent.ts
// Fetches real-time stock quotes from Yahoo Finance (free, no key required).
// Also exposes a vendor→ticker lookup used by the FEEDS tab for inline context.

// ─── Vendor → ticker map ──────────────────────────────────────────────────────

export const VENDOR_TICKERS: Record<string, string> = {
  // Big Tech
  'NVIDIA':       'NVDA',
  'Microsoft':    'MSFT',
  'Google':       'GOOGL',
  'Alphabet':     'GOOGL',
  'Amazon':       'AMZN',
  'AWS':          'AMZN',
  'Meta':         'META',
  'Apple':        'AAPL',
  'IBM':          'IBM',
  'Oracle':       'ORCL',
  'Intel':        'INTC',
  'AMD':          'AMD',
  'Qualcomm':     'QCOM',
  'Broadcom':     'AVGO',
  // Enterprise SaaS
  'Salesforce':   'CRM',
  'ServiceNow':   'NOW',
  'Workday':      'WDAY',
  'SAP':          'SAP',
  'Palantir':     'PLTR',
  'Snowflake':    'SNOW',
  'Databricks':   'DBRX',
  'UiPath':       'PATH',
  'C3.ai':        'AI',
  // Defense & government
  'Lockheed':     'LMT',
  'Raytheon':     'RTX',
  'Northrop':     'NOC',
  'Boeing':       'BA',
  'L3Harris':     'LHX',
  'SAIC':         'SAIC',
  'Leidos':       'LDOS',
  'Booz Allen':   'BAH',
  // Industrial automation & robotics
  'Siemens':      'SIEGY',
  'Honeywell':    'HON',
  'Emerson':      'EMR',
  'Rockwell':     'ROK',
  'ABB':          'ABB',
  'Fanuc':        'FANUY',
  'Kuka':         'KUKAF',
  'Zebra':        'ZBRA',
  'Cognex':       'CGNX',
  'Teradyne':     'TER',
  'iRobot':       'IRBT',
  // Logistics & supply chain
  'UPS':          'UPS',
  'FedEx':        'FDX',
  'XPO':          'XPO',
  'Flexport':     'FLEX',
  'Manhattan Associates': 'MANH',
  // Water technology
  'Xylem':        'XYL',
  'Veolia':       'VEOEY',
  'Evoqua':       'AQUA',
  'A.O. Smith':   'AOS',
  'Watts Water':  'WTS',
  // Energy tech
  'NextEra':      'NEE',
  'Enphase':      'ENPH',
  'SolarEdge':    'SEDG',
  'First Solar':  'FSLR',
  'GE Vernova':   'GEV',
};

// Watchlist always shown in the MARKET tab (top enterprise tech)
const WATCHLIST_TICKERS = [
  'NVDA', 'MSFT', 'GOOGL', 'PLTR', 'IBM',
  'NOW',  'CRM',  'AMZN',  'INTC', 'AMD',
  'HON',  'ROK',  'XYL',   'LMT',  'RTX',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;       // absolute change
  changePct: number;    // % change
  currency: string;
  marketState: string;  // 'REGULAR' | 'PRE' | 'POST' | 'CLOSED'
};

export type MarketStore = {
  quotes: StockQuote[];
  as_of: string;
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
let cachedStore: MarketStore | null = null;
let storeExpiresAt = 0;
let inFlight: Promise<MarketStore> | null = null;

export function getStoredMarketData(): MarketStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

// ─── Yahoo Finance v7 quote endpoint (no key required) ───────────────────────

async function fetchQuotes(symbols: string[]): Promise<StockQuote[]> {
  const joined = symbols.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName,currency,marketState`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NXTLinkMarketAgent/1.0)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) return [];

  const data = await res.json() as {
    quoteResponse?: {
      result?: Array<{
        symbol?: string;
        shortName?: string;
        regularMarketPrice?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        currency?: string;
        marketState?: string;
      }>;
    };
  };

  return (data.quoteResponse?.result ?? []).map((q) => ({
    symbol: q.symbol ?? '',
    name: q.shortName ?? q.symbol ?? '',
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
    currency: q.currency ?? 'USD',
    marketState: q.marketState ?? 'CLOSED',
  }));
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function doRunMarketAgent(): Promise<MarketStore> {
  const quotes = await fetchQuotes(WATCHLIST_TICKERS).catch(() => []);
  const store: MarketStore = { quotes, as_of: new Date().toISOString() };
  cachedStore = store;
  storeExpiresAt = Date.now() + CACHE_TTL_MS;
  return store;
}

export async function runMarketAgent(): Promise<MarketStore> {
  if (inFlight) return inFlight;
  inFlight = doRunMarketAgent().finally(() => { inFlight = null; });
  return inFlight;
}

// ─── Utility: look up ticker(s) for a vendor name from a feed item ───────────

export function vendorToTicker(vendor: string): string | undefined {
  if (!vendor) return undefined;
  const key = Object.keys(VENDOR_TICKERS).find(
    (k) => vendor.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(vendor.toLowerCase()),
  );
  return key ? VENDOR_TICKERS[key] : undefined;
}
