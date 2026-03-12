// src/lib/agents/agents/continent-intel-agent.ts
// Continent Intelligence Agent — buckets signals into 5 regional departments
// Zero extra API calls — pure data routing from already-fetched signals.
// Each continent gets its own report that feeds into Central HQ.

import type { IntelSignal } from './intel-discovery-agent';
import {
  CONTINENT_DEPARTMENTS,
  getContinentByCountryCode,
  type ContinentId,
  type ContinentDepartment,
} from '@/lib/data/continent-departments';

// Company → ISO country code (reused from country-activity.ts pattern)
const COMPANY_COUNTRY: Record<string, string> = {
  // US
  'lockheed martin': 'US', 'raytheon': 'US', 'boeing': 'US', 'northrop grumman': 'US',
  'general dynamics': 'US', 'l3harris': 'US', 'anduril': 'US', 'shield ai': 'US',
  'palantir': 'US', 'crowdstrike': 'US', 'palo alto networks': 'US', 'nvidia': 'US',
  'intel': 'US', 'amd': 'US', 'qualcomm': 'US', 'spacex': 'US', 'google': 'US',
  'microsoft': 'US', 'amazon': 'US', 'apple': 'US', 'meta': 'US', 'openai': 'US',
  'anthropic': 'US', 'boston dynamics': 'US', 'skydio': 'US', 'scale ai': 'US',
  'leidos': 'US', 'saic': 'US', 'booz allen': 'US', 'caci': 'US', 'tesla': 'US',
  'broadcom': 'US', 'texas instruments': 'US', 'moderna': 'US', 'illumina': 'US',
  'ionq': 'US', 'rigetti': 'US', 'rocket lab': 'US', 'figure ai': 'US',
  'kratos': 'US', 'textron': 'US', 'moog': 'US', 'xai': 'US', 'databricks': 'US',
  'snowflake': 'US', 'cloudflare': 'US', 'fortinet': 'US', 'cohere': 'US',
  'first solar': 'US', 'enphase': 'US',
  // Germany
  'siemens': 'DE', 'bosch': 'DE', 'sap': 'DE', 'kuka': 'DE', 'rheinmetall': 'DE',
  'hensoldt': 'DE', 'thyssenkrupp': 'DE', 'airbus': 'DE', 'bmw': 'DE', 'volkswagen': 'DE',
  // UK
  'bae systems': 'GB', 'rolls-royce': 'GB', 'arm': 'GB', 'arm holdings': 'GB',
  'qinetiq': 'GB', 'darktrace': 'GB', 'deepmind': 'GB',
  // France
  'thales': 'FR', 'safran': 'FR', 'dassault': 'FR', 'mistral ai': 'FR', 'naval group': 'FR',
  // Netherlands
  'asml': 'NL', 'philips': 'NL', 'nxp': 'NL',
  // Sweden
  'saab': 'SE', 'ericsson': 'SE', 'volvo': 'SE', 'spotify': 'SE',
  // Norway
  'kongsberg': 'NO', 'nammo': 'NO',
  // Finland
  'nokia': 'FI',
  // Denmark
  'vestas': 'DK', 'universal robots': 'DK',
  // Switzerland
  'abb': 'CH',
  // Italy
  'leonardo': 'IT', 'fincantieri': 'IT',
  // Spain
  'indra': 'ES', 'navantia': 'ES',
  // Poland
  'cd projekt': 'PL',
  // Israel
  'elbit': 'IL', 'rafael': 'IL', 'iai': 'IL', 'cyberark': 'IL', 'check point': 'IL',
  'wiz': 'IL', 'cellebrite': 'IL', 'tower semiconductor': 'IL', 'orca security': 'IL',
  // Turkey
  'baykar': 'TR', 'aselsan': 'TR', 'tusas': 'TR', 'roketsan': 'TR',
  // UAE
  'edge group': 'AE', 'g42': 'AE',
  // Saudi Arabia
  'neom': 'SA', 'aramco': 'SA',
  // Japan
  'keyence': 'JP', 'fanuc': 'JP', 'yaskawa': 'JP', 'honda': 'JP', 'sony': 'JP',
  'toyota': 'JP', 'mitsubishi': 'JP', 'kawasaki': 'JP', 'softbank': 'JP',
  'tokyo electron': 'JP', 'renesas': 'JP', 'preferred networks': 'JP',
  // South Korea
  'samsung': 'KR', 'sk hynix': 'KR', 'hanwha': 'KR', 'hyundai': 'KR', 'lg': 'KR',
  'naver': 'KR', 'korea aerospace': 'KR', 'lg energy': 'KR',
  // China
  'dji': 'CN', 'huawei': 'CN', 'hikvision': 'CN', 'sensetime': 'CN', 'baidu': 'CN',
  'alibaba': 'CN', 'tencent': 'CN', 'catl': 'CN', 'byd': 'CN', 'smic': 'CN',
  'deepseek': 'CN', 'bytedance': 'CN', 'comac': 'CN', 'longi': 'CN',
  // Taiwan
  'tsmc': 'TW', 'foxconn': 'TW', 'mediatek': 'TW', 'asus': 'TW', 'umc': 'TW',
  // India
  'tata': 'IN', 'infosys': 'IN', 'wipro': 'IN', 'hindustan aeronautics': 'IN',
  'reliance': 'IN', 'biocon': 'IN',
  // Singapore
  'st engineering': 'SG', 'grab': 'SG', 'sea group': 'SG',
  // Australia
  'austal': 'AU', 'bhp': 'AU', 'rio tinto': 'AU',
  // Brazil
  'embraer': 'BR', 'nubank': 'BR',
  // South Africa
  'naspers': 'ZA', 'paramount group': 'ZA',
  // Nigeria
  'flutterwave': 'NG',
  // Kenya
  'safaricom': 'KE',
  // Canada
  'cae': 'CA', 'shopify': 'CA', 'd-wave': 'CA',
  // Mexico
  'cemex': 'MX', 'gruma': 'MX',
};

// Country name → ISO code for title/tag matching
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'america': 'US',
  'canada': 'CA', 'mexico': 'MX', 'brazil': 'BR', 'argentina': 'AR',
  'colombia': 'CO', 'chile': 'CL',
  'united kingdom': 'GB', 'uk': 'GB', 'britain': 'GB', 'england': 'GB',
  'germany': 'DE', 'france': 'FR', 'italy': 'IT', 'spain': 'ES',
  'netherlands': 'NL', 'sweden': 'SE', 'norway': 'NO', 'finland': 'FI',
  'denmark': 'DK', 'poland': 'PL', 'switzerland': 'CH', 'austria': 'AT',
  'belgium': 'BE', 'ireland': 'IE', 'portugal': 'PT', 'greece': 'GR',
  'romania': 'RO', 'ukraine': 'UA', 'czech': 'CZ', 'estonia': 'EE',
  'lithuania': 'LT', 'latvia': 'LV',
  'israel': 'IL', 'uae': 'AE', 'emirates': 'AE', 'saudi': 'SA',
  'qatar': 'QA', 'bahrain': 'BH', 'jordan': 'JO', 'turkey': 'TR', 'türkiye': 'TR',
  'china': 'CN', 'chinese': 'CN', 'japan': 'JP', 'japanese': 'JP',
  'south korea': 'KR', 'korean': 'KR', 'taiwan': 'TW', 'india': 'IN', 'indian': 'IN',
  'singapore': 'SG', 'australia': 'AU', 'new zealand': 'NZ',
  'indonesia': 'ID', 'vietnam': 'VN', 'thailand': 'TH', 'malaysia': 'MY',
  'philippines': 'PH', 'pakistan': 'PK', 'bangladesh': 'BD',
  'south africa': 'ZA', 'nigeria': 'NG', 'kenya': 'KE', 'egypt': 'EG',
  'morocco': 'MA', 'ethiopia': 'ET', 'ghana': 'GH', 'rwanda': 'RW', 'tanzania': 'TZ',
};

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContinentIntelReport = {
  continentId: ContinentId;
  label: string;
  color: string;
  generatedAt: string;
  signalsTotal: number;
  signalsByIndustry: Record<string, number>;
  signalsByCountry: Record<string, number>;
  topSignals: IntelSignal[];
  topCompanies: string[];
  topIndustries: string[];
  heatScore: number; // 0–100
  trendDirection: 'rising' | 'stable' | 'declining';
};

export type ContinentHQReport = {
  generatedAt: string;
  continentReports: ContinentIntelReport[];
  globalTopSignals: IntelSignal[];
  totalSignalsProcessed: number;
  totalSignalsRouted: number;
};

// ── Signal → Country Resolution ────────────────────────────────────────────────

function resolveCountryCode(signal: IntelSignal): string | null {
  const companyLower = (signal.company ?? '').toLowerCase();
  const titleLower = signal.title.toLowerCase();
  const tagsLower = signal.tags.map(t => t.toLowerCase());

  // 1. Try company name match
  if (companyLower) {
    for (const [key, iso] of Object.entries(COMPANY_COUNTRY)) {
      if (companyLower.includes(key)) return iso;
    }
  }

  // 2. Try title match against country names
  for (const [name, iso] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (titleLower.includes(name)) return iso;
  }

  // 3. Try tags
  for (const tag of tagsLower) {
    for (const [name, iso] of Object.entries(COUNTRY_NAME_TO_CODE)) {
      if (tag === name || tag === iso.toLowerCase()) return iso;
    }
  }

  // 4. Try title match against company names
  for (const [key, iso] of Object.entries(COMPANY_COUNTRY)) {
    if (titleLower.includes(key)) return iso;
  }

  return null;
}

// ── Build Report for One Continent ────────────────────────────────────────────

function buildContinentReport(
  dept: ContinentDepartment,
  signals: IntelSignal[],
): ContinentIntelReport {
  const signalsByIndustry: Record<string, number> = {};
  const signalsByCountry: Record<string, number> = {};
  const companyMentions: Record<string, number> = {};

  for (const sig of signals) {
    // Count by industry
    const ind = sig.industry ?? 'general';
    signalsByIndustry[ind] = (signalsByIndustry[ind] ?? 0) + 1;

    // Count by country
    const code = resolveCountryCode(sig);
    if (code) {
      signalsByCountry[code] = (signalsByCountry[code] ?? 0) + 1;
    }

    // Count company mentions
    if (sig.company) {
      companyMentions[sig.company] = (companyMentions[sig.company] ?? 0) + 1;
    }
  }

  // Sort industries by signal count
  const topIndustries = Object.entries(signalsByIndustry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ind]) => ind);

  // Sort companies by mention count
  const topCompanies = Object.entries(companyMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);

  // Top signals by confidence
  const topSignals = [...signals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);

  // Heat score: based on signal volume relative to expected baseline
  const baseline = dept.countryCodes.length * 2; // rough expected signals
  const ratio = signals.length / Math.max(1, baseline);
  const heatScore = Math.min(100, Math.round(ratio * 50 + 25));

  // Trend: compare to what we'd expect
  const trendDirection: 'rising' | 'stable' | 'declining' =
    ratio > 1.5 ? 'rising' : ratio < 0.5 ? 'declining' : 'stable';

  return {
    continentId: dept.id,
    label: dept.label,
    color: dept.color,
    generatedAt: new Date().toISOString(),
    signalsTotal: signals.length,
    signalsByIndustry,
    signalsByCountry,
    topSignals,
    topCompanies,
    topIndustries,
    heatScore,
    trendDirection,
  };
}

// ── Main Runner ───────────────────────────────────────────────────────────────

/**
 * Takes all signals from intel-discovery-agent and buckets them by continent.
 * Zero extra API calls — pure data routing.
 */
export function runContinentIntelAgent(
  allSignals: IntelSignal[],
): ContinentHQReport {
  const buckets = new Map<ContinentId, IntelSignal[]>();

  // Initialize empty buckets
  for (const dept of CONTINENT_DEPARTMENTS) {
    buckets.set(dept.id, []);
  }

  let routed = 0;

  // Route each signal to its continent
  for (const signal of allSignals) {
    const countryCode = resolveCountryCode(signal);
    if (!countryCode) continue;

    const continent = getContinentByCountryCode(countryCode);
    if (!continent) continue;

    buckets.get(continent.id)!.push(signal);
    routed++;
  }

  // Build reports
  const continentReports: ContinentIntelReport[] = [];
  for (const dept of CONTINENT_DEPARTMENTS) {
    const signals = buckets.get(dept.id) ?? [];
    continentReports.push(buildContinentReport(dept, signals));
  }

  // Sort by heat score (most active continent first)
  continentReports.sort((a, b) => b.heatScore - a.heatScore);

  // Global top signals across all continents
  const globalTopSignals = [...allSignals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 30);

  return {
    generatedAt: new Date().toISOString(),
    continentReports,
    globalTopSignals,
    totalSignalsProcessed: allSignals.length,
    totalSignalsRouted: routed,
  };
}