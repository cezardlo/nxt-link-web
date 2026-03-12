import { getDb, isSupabaseConfigured } from '../client';
import { getIntelSignals } from './intel-signals';
import { COUNTRY_TECH_MAP } from '@/lib/data/country-tech-map';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CountryActivityRow = {
  country_code: string;
  country_name: string | null;
  entity_count: number;
  signal_count_30d: number;
  signal_velocity: number;
  funding_total_usd: number;
  avg_iker_score: number | null;
  top_companies: Array<{ name: string; iker_score?: number }> | null;
  top_signal_types: Record<string, number> | null;
  heat_score: number;
  last_updated: string;
};

// Company name → ISO country code lookup (matches ENTITY_COUNTRY_MAP in useMapData.ts)
const COMPANY_COUNTRY: Record<string, string> = {
  // US
  'lockheed martin': 'US', 'raytheon': 'US', 'boeing': 'US', 'northrop grumman': 'US',
  'general dynamics': 'US', 'l3harris': 'US', 'anduril': 'US', 'shield ai': 'US',
  'palantir': 'US', 'crowdstrike': 'US', 'palo alto networks': 'US', 'nvidia': 'US',
  'intel': 'US', 'amd': 'US', 'qualcomm': 'US', 'spacex': 'US', 'google': 'US',
  'microsoft': 'US', 'amazon': 'US', 'apple': 'US', 'meta': 'US', 'openai': 'US',
  'anthropic': 'US', 'boston dynamics': 'US', 'skydio': 'US', 'scale ai': 'US',
  'leidos': 'US', 'saic': 'US', 'booz allen': 'US', 'caci': 'US',
  'aerovironment': 'US', 'kratos': 'US', 'textron': 'US', 'moog': 'US',
  // Germany
  'siemens': 'DE', 'bosch': 'DE', 'sap': 'DE', 'kuka': 'DE', 'rheinmetall': 'DE',
  'diehl': 'DE', 'hensoldt': 'DE', 'thyssenkrupp': 'DE', 'airbus': 'DE',
  // Israel
  'elbit': 'IL', 'rafael': 'IL', 'iai': 'IL', 'cyberark': 'IL', 'check point': 'IL',
  'wiz': 'IL', 'cellebrite': 'IL',
  // Japan
  'keyence': 'JP', 'fanuc': 'JP', 'yaskawa': 'JP', 'honda': 'JP', 'sony': 'JP',
  'mitsubishi': 'JP', 'kawasaki': 'JP', 'nec': 'JP', 'fujitsu': 'JP',
  // South Korea
  'samsung': 'KR', 'sk hynix': 'KR', 'hanwha': 'KR', 'hyundai': 'KR', 'lg': 'KR',
  // China
  'dji': 'CN', 'huawei': 'CN', 'hikvision': 'CN', 'sensetime': 'CN', 'baidu': 'CN',
  'alibaba': 'CN', 'tencent': 'CN',
  // Taiwan
  'tsmc': 'TW', 'foxconn': 'TW', 'mediatek': 'TW', 'asus': 'TW',
  // Netherlands
  'asml': 'NL', 'philips': 'NL', 'nxp': 'NL',
  // UK
  'bae systems': 'GB', 'rolls-royce': 'GB', 'arm': 'GB', 'qinetiq': 'GB', 'darktrace': 'GB',
  // France
  'thales': 'FR', 'safran': 'FR', 'dassault': 'FR', 'mbda': 'FR',
  // Sweden
  'saab': 'SE', 'ericsson': 'SE', 'volvo': 'SE',
  // Switzerland
  'abb': 'CH',
  // Italy
  'leonardo': 'IT', 'finmeccanica': 'IT',
  // Norway
  'kongsberg': 'NO', 'nammo': 'NO',
  // Turkey
  'baykar': 'TR', 'aselsan': 'TR',
  // Canada
  'cae': 'CA', 'magellan aerospace': 'CA',
  // India
  'tata': 'IN', 'infosys': 'IN', 'wipro': 'IN', 'hindustan aeronautics': 'IN',
  // Brazil
  'embraer': 'BR',
  // Australia
  'austal': 'AU',
};

// ─── Updater — builds country_activity from intel signals ─────────────────────

/** Recompute country activity scores from the last 30 days of intel signals */
export async function updateCountryActivity(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const signals = await getIntelSignals({ limit: 1000, since });

  if (signals.length === 0) return 0;

  const db = getDb({ admin: true });

  // Build country buckets from signals
  const countrySignals: Record<string, {
    count: number;
    types: Record<string, number>;
    companies: string[];
    funding: number;
  }> = {};

  for (const sig of signals) {
    const companyLower = (sig.company ?? '').toLowerCase();
    let code: string | null = null;

    // Try exact company match first
    if (companyLower) {
      for (const [key, iso] of Object.entries(COMPANY_COUNTRY)) {
        if (companyLower.includes(key)) { code = iso; break; }
      }
    }

    // Try title match as fallback
    if (!code) {
      const titleLower = sig.title.toLowerCase();
      for (const [key, iso] of Object.entries(COMPANY_COUNTRY)) {
        if (titleLower.includes(key)) { code = iso; break; }
      }
    }

    if (!code) continue;

    if (!countrySignals[code]) {
      countrySignals[code] = { count: 0, types: {}, companies: [], funding: 0 };
    }

    const bucket = countrySignals[code]!;
    bucket.count++;
    bucket.types[sig.signal_type] = (bucket.types[sig.signal_type] ?? 0) + 1;
    if (sig.company && !bucket.companies.includes(sig.company)) {
      bucket.companies.push(sig.company);
    }
    if (sig.amount_usd) bucket.funding += sig.amount_usd;
  }

  // Map ISO codes to names from COUNTRY_TECH_MAP
  const nameMap: Record<string, string> = {};
  for (const c of COUNTRY_TECH_MAP) nameMap[c.code] = c.name;

  // Upsert each country
  let upserted = 0;
  const maxSignals = Math.max(1, ...Object.values(countrySignals).map(b => b.count));

  for (const [code, bucket] of Object.entries(countrySignals)) {
    const signalVelocity = Math.round((bucket.count / 30) * 100) / 100;

    // heat_score: normalized signal count (0–100) blended with base tech score
    const baseTechScore = COUNTRY_TECH_MAP.find(c => c.code === code)?.techScore ?? 30;
    const signalBoost = (bucket.count / maxSignals) * 40; // up to +40 from signals
    const heatScore = Math.min(100, Math.round(baseTechScore * 0.6 + signalBoost));

    const topCompanies = bucket.companies
      .slice(0, 5)
      .map(name => ({ name }));

    const { error } = await db
      .from('country_activity')
      .upsert(
        {
          country_code: code,
          country_name: nameMap[code] ?? code,
          signal_count_30d: bucket.count,
          signal_velocity: signalVelocity,
          funding_total_usd: bucket.funding,
          top_companies: topCompanies,
          top_signal_types: bucket.types,
          heat_score: heatScore,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'country_code' },
      );

    if (!error) upserted++;
  }

  return upserted;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get all country activity rows ordered by heat score */
export async function getCountryActivity(): Promise<CountryActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data, error } = await db
    .from('country_activity')
    .select('*')
    .order('heat_score', { ascending: false });
  if (error || !data) return [];
  return data as CountryActivityRow[];
}

/** Get signal counts as a simple { ISO: count } map for the map layer */
export async function getCountrySignalCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  const db = getDb();
  const { data, error } = await db
    .from('country_activity')
    .select('country_code, signal_count_30d');
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as Array<{ country_code: string; signal_count_30d: number }>) {
    counts[row.country_code] = row.signal_count_30d;
  }
  return counts;
}
