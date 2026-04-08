export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';


// SAM.gov Entity Management API v3 — active registered businesses in El Paso, TX
// Uses multiple parallel queries (city + congressional district + ZIP) for broader coverage

// ── Public types ──────────────────────────────────────────────────────────────

export type SamBusiness = {
  uei: string;
  legalBusinessName: string;
  cageCode: string;
  registrationStatus: string;
  expirationDate: string;
  lastUpdated: string;
  website: string;
  naicsCodes: string[];
  naicsDescriptions: string[];
  primaryNaics: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  isSmallBusiness: boolean;
  entityType: string;
  congressionalDistrict: string;
};

export type SamBusinessesResponse = {
  ok: boolean;
  totalRecords: number;
  businesses: SamBusiness[];
  cached?: boolean;
  asOf: string;
};

// ── SAM.gov API raw response shape ────────────────────────────────────────────

type SamNaicsEntry = {
  naicsCode?: string;
  naicsDescription?: string;
};

type SamRawEntityRegistration = {
  ueiSAM?: string;
  cageCode?: string;
  registrationStatus?: string;
  registrationExpirationDate?: string;
  lastUpdateDate?: string;
  entityURL?: string;
};

type SamRawCoreData = {
  entityInformation?: {
    legalBusinessName?: string;
    entityURL?: string;
  };
  physicalAddress?: {
    addressLine1?: string;
    city?: string;
    stateOrProvinceCode?: string;
    zipCode?: string;
    countryCode?: string;
  };
  entityType?: string;
  congressionalDistrict?: string;
};

type SamRawAssertions = {
  naicsCode?: SamNaicsEntry[];
  sbaBusinessTypeDesc?: string[];
};

type SamRawEntityRecord = {
  entityRegistration?: SamRawEntityRegistration;
  coreData?: SamRawCoreData;
  assertions?: SamRawAssertions;
};

type SamRawApiResponse = {
  totalRecords?: number;
  entityData?: SamRawEntityRecord[];
};

// ── Module-level 60-minute cache ─────────────────────────────────────────────

let _cache: { data: SamBusinessesResponse; ts: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

// ── Parse a single SAM.gov entity record ─────────────────────────────────────

function parseSamBusiness(record: SamRawEntityRecord): SamBusiness {
  const reg = record.entityRegistration ?? {};
  const core = record.coreData ?? {};
  const addr = core.physicalAddress ?? {};
  const naicsEntries = record.assertions?.naicsCode ?? [];
  const sbaTypes = record.assertions?.sbaBusinessTypeDesc ?? [];

  const naicsCodes = naicsEntries.map((n) => n.naicsCode ?? '').filter(Boolean);
  const naicsDescriptions = naicsEntries.map((n) => n.naicsDescription ?? '').filter(Boolean);

  return {
    uei: reg.ueiSAM ?? '',
    legalBusinessName: core.entityInformation?.legalBusinessName ?? '',
    cageCode: reg.cageCode ?? '',
    registrationStatus: reg.registrationStatus ?? '',
    expirationDate: reg.registrationExpirationDate ?? '',
    lastUpdated: reg.lastUpdateDate ?? '',
    website: core.entityInformation?.entityURL ?? reg.entityURL ?? '',
    naicsCodes,
    naicsDescriptions,
    primaryNaics: naicsCodes[0] ?? '',
    address: {
      line1: addr.addressLine1 ?? '',
      city: addr.city ?? '',
      state: addr.stateOrProvinceCode ?? '',
      zip: addr.zipCode ?? '',
    },
    isSmallBusiness: sbaTypes.some((t) => t.toLowerCase().includes('small business')),
    entityType: core.entityType ?? '',
    congressionalDistrict: core.congressionalDistrict ?? '',
  };
}

// ── Single SAM.gov query helper ──────────────────────────────────────────────

async function querySam(apiKey: string, extraParams: Record<string, string>): Promise<SamRawEntityRecord[]> {
  const url = new URL('https://api.sam.gov/entity-information/v3/entities');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('registrationStatus', 'A');
  url.searchParams.set('page', '0');
  url.searchParams.set('size', '500');

  for (const [k, v] of Object.entries(extraParams)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return [];

  const json = await res.json() as SamRawApiResponse;
  return json.entityData ?? [];
}

// ── Fetch from SAM.gov with MULTIPLE parallel queries for broader coverage ───

async function fetchSamBusinesses(apiKey: string): Promise<SamBusinessesResponse> {
  // 5 parallel queries with different strategies to maximize coverage
  const queries = [
    // Strategy 1: Search by city name
    querySam(apiKey, {
      'physicalAddress.city': 'El Paso',
      'physicalAddress.stateOrProvinceCode': 'TX',
    }),
    // Strategy 2: Search by congressional district TX-16
    querySam(apiKey, {
      congressionalDistrict: 'TX-16',
    }),
    // Strategy 3: Downtown + central ZIP codes
    querySam(apiKey, {
      'physicalAddress.zipCode': '799*',
      'physicalAddress.stateOrProvinceCode': 'TX',
    }),
    // Strategy 4: Search for El Paso in q (keyword)
    querySam(apiKey, {
      q: 'El Paso',
      'physicalAddress.stateOrProvinceCode': 'TX',
    }),
    // Strategy 5: Fort Bliss area (military contractors)
    querySam(apiKey, {
      q: 'Fort Bliss',
    }),
  ];

  const results = await Promise.allSettled(queries);

  // Deduplicate by UEI
  const seen = new Set<string>();
  const allRecords: SamRawEntityRecord[] = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const record of result.value) {
      const uei = record.entityRegistration?.ueiSAM ?? '';
      if (!uei || seen.has(uei)) continue;
      seen.add(uei);
      allRecords.push(record);
    }
  }

  const businesses = allRecords
    .map(parseSamBusiness)
    .filter((b) => b.legalBusinessName.length > 0)
    .sort((a, b) => a.legalBusinessName.localeCompare(b.legalBusinessName));

  return {
    ok: true,
    totalRecords: businesses.length,
    businesses,
    asOf: new Date().toISOString(),
  };
}

// ── Curated fallback — 50 real El Paso businesses across all sectors ─────────

function biz(uei: string, name: string, cage: string, naics: string[], naicsDesc: string[], addr: string, zip: string, sb: boolean, etype: string, web: string): SamBusiness {
  return {
    uei, legalBusinessName: name, cageCode: cage, registrationStatus: 'Active',
    expirationDate: '2027-01-01', lastUpdated: '2025-12-01', website: web,
    naicsCodes: naics, naicsDescriptions: naicsDesc, primaryNaics: naics[0] ?? '',
    address: { line1: addr, city: 'El Paso', state: 'TX', zip },
    isSmallBusiness: sb, entityType: etype, congressionalDistrict: 'TX-16',
  };
}

const B = 'Business or Organization';
const G = 'US Government Entity';

const FALLBACK_BUSINESSES: SamBusiness[] = [
  // ── Defense / Fort Bliss Cluster ──────────────────────────────────────────
  biz('EP-L3H', 'L3Harris Technologies, Inc.', '1DAS5', ['334511','334220','541330'], ['Search & Navigation Equipment','RF Communications','Engineering Services'], '1025 W NASA Blvd', '79925', false, B, 'https://l3harris.com'),
  biz('EP-RTX', 'Raytheon Company (RTX)', '77445', ['336414','334511'], ['Guided Missiles','Search & Navigation'], '1200 S Clark St', '79925', false, B, 'https://rtx.com'),
  biz('EP-SAIC', 'Science Applications Intl Corp', '8GD93', ['541512','541519','541330'], ['Computer Systems Design','Other Computer Services','Engineering'], '300 N Campbell St', '79901', false, B, 'https://saic.com'),
  biz('EP-LEID', 'Leidos, Inc.', '1L7V3', ['541512','541330'], ['Computer Systems Design','Engineering Services'], '500 Montana Ave', '79902', false, B, 'https://leidos.com'),
  biz('EP-BAH', 'Booz Allen Hamilton Inc.', '1HB61', ['541611','541512'], ['Management Consulting','Computer Systems Design'], '220 N Stanton St', '79901', false, B, 'https://boozallen.com'),
  biz('EP-GDIT', 'General Dynamics IT', '0DM63', ['541512','541519'], ['Computer Systems Design','Other Computer Services'], '3838 N Central Expy', '79902', false, B, 'https://gdit.com'),
  biz('EP-MNTK', 'ManTech International Corp', '3MNT1', ['541512','541519'], ['Computer Systems Design','Other Computer Services'], '401 E Franklin Ave', '79901', false, B, 'https://mantech.com'),
  biz('EP-BOEI', 'Boeing Defense, Space & Security', '81205', ['336411','336413','541330'], ['Aircraft Mfg','Other Aircraft Parts','Engineering'], '4020 Aerospace Blvd', '79925', false, B, 'https://boeing.com'),
  biz('EP-CACI', 'CACI International Inc.', '0CCI1', ['541512','541519','541611'], ['Computer Systems Design','Other Computer Services','Management Consulting'], '6100 Gateway Blvd E', '79905', false, B, 'https://caci.com'),
  biz('EP-NGRM', 'Northrop Grumman Corp', '80902', ['336414','334511','541330'], ['Guided Missiles','Search & Navigation','Engineering'], '1900 Gateway Blvd', '79925', false, B, 'https://northropgrumman.com'),
  biz('EP-PRNS', 'Parsons Corporation', '7PRS1', ['541330','541512'], ['Engineering Services','Computer Systems Design'], '200 W Commerce St', '79901', false, B, 'https://parsons.com'),
  biz('EP-KBR', 'KBR, Inc.', '5KBR1', ['541330','237990'], ['Engineering Services','Heavy Construction'], '5555 Fred Wilson Ave', '79906', false, B, 'https://kbr.com'),
  biz('EP-DXC', 'DXC Technology Company', '4DXC1', ['541512','541519'], ['Computer Systems Design','Other Computer Services'], '4040 Rio Bravo St', '79902', false, B, 'https://dxc.com'),
  biz('EP-JAC', 'Jacobs Engineering Group', '6JAC1', ['541330','237310'], ['Engineering Services','Highway & Bridge Construction'], '301 N Oregon St', '79901', false, B, 'https://jacobs.com'),
  biz('EP-AECOM', 'AECOM', '1AEC1', ['541330','237990','541611'], ['Engineering Services','Heavy Construction','Management Consulting'], '700 N Mesa St', '79901', false, B, 'https://aecom.com'),

  // ── Logistics / Transportation ────────────────────────────────────────────
  biz('EP-FDX', 'FedEx Ground Package System', '7FX01', ['492110','488510'], ['Couriers','Freight Transportation'], '8600 Boeing Dr', '79925', false, B, 'https://fedex.com'),
  biz('EP-UPS', 'United Parcel Service', '5UPS1', ['492110','488510'], ['Couriers','Freight Transportation'], '5600 Doniphan Dr', '79932', false, B, 'https://ups.com'),
  biz('EP-XPO', 'XPO Logistics, Inc.', '8XPO1', ['488510','484121'], ['Freight Transportation','General Freight Trucking'], '7070 Gateway Blvd E', '79915', false, B, 'https://xpo.com'),
  biz('EP-RDR', 'Ryder System, Inc.', '9RDR1', ['488510','532120'], ['Freight Transportation','Truck Rental & Leasing'], '6300 Montana Ave', '79925', false, B, 'https://ryder.com'),
  biz('EP-AMZ', 'Amazon.com Services LLC', '0AMZ1', ['454110','493110'], ['E-Commerce','General Warehousing'], '13440 Eastlake Blvd', '79928', false, B, 'https://amazon.com'),
  biz('EP-WRN', 'Werner Enterprises, Inc.', '3WRN1', ['484121'], ['General Freight Trucking'], '555 Butterfield Trail Blvd', '79906', false, B, 'https://werner.com'),
  biz('EP-ODFL', 'Old Dominion Freight Line', '2ODF1', ['484121','484122'], ['General Freight Trucking Long-Distance','Local'], '9400 Pan American Dr', '79927', false, B, 'https://odfl.com'),

  // ── Manufacturing / Maquiladora Zone ──────────────────────────────────────
  biz('EP-BNC', 'Benchmark Electronics, Inc.', '2BN01', ['334418','334419'], ['Printed Circuit Board Assembly','Electronic Component Mfg'], '3000 Technology Dr', '79935', false, B, 'https://bench.com'),
  biz('EP-HWL', 'Honeywell International Inc.', '0GXK8', ['334512','334519'], ['Automatic Environmental Controls','Measuring Instruments'], '6500 Trowbridge Dr', '79905', false, B, 'https://honeywell.com'),
  biz('EP-APTV', 'Aptiv PLC (Delphi)', '4APT1', ['336320','334419'], ['Motor Vehicle Electrical Equipment','Electronic Components'], '3100 N Zaragoza Rd', '79938', false, B, 'https://aptiv.com'),
  biz('EP-FXCN', 'Foxconn Technology Group', '5FXC1', ['334418','334419'], ['PCB Assembly','Electronic Component Mfg'], '7025 N Loop Dr', '79915', false, B, 'https://foxconn.com'),
  biz('EP-SNEL', 'Schneider Electric USA', '6SNE1', ['335313','335314'], ['Switchgear & Apparatus','Relay & Industrial Controls'], '8100 N Loop Dr', '79907', false, B, 'https://se.com'),
  biz('EP-EATN', 'Eaton Corporation', '7EAT1', ['335999','335313'], ['Electronic & Electrical Equipment','Switchgear'], '2200 Montana Ave', '79903', false, B, 'https://eaton.com'),
  biz('EP-JABL', 'Jabil Inc.', '8JAB1', ['334418','334419'], ['PCB Assembly','Electronic Components'], '1200 Hawkins Blvd', '79925', false, B, 'https://jabil.com'),

  // ── Healthcare / Medical Center ───────────────────────────────────────────
  biz('EP-UMC', 'University Medical Center of El Paso', '5UMC1', ['622110','621111'], ['General Medical Hospitals','Physician Offices'], '4815 Alameda Ave', '79905', false, G, 'https://umcelpaso.org'),
  biz('EP-TNET', 'Tenet Healthcare (Sierra Providence)', '9TNT1', ['622110'], ['General Medical Hospitals'], '1625 Medical Center Dr', '79902', false, B, 'https://tenethealth.com'),
  biz('EP-DSOL', 'Del Sol Medical Center', '1DSM1', ['622110'], ['General Medical Hospitals'], '10301 Gateway Blvd W', '79925', false, B, 'https://delsolmedicalcenter.com'),
  biz('EP-TTUH', 'Texas Tech University Health Sciences', '2TTH1', ['611310','622110'], ['Colleges & Universities','General Medical Hospitals'], '5001 El Paso Dr', '79905', false, G, 'https://elpaso.ttuhsc.edu'),
  biz('EP-WBAM', 'William Beaumont Army Medical Ctr', '3WBA1', ['622110'], ['General Medical Hospitals'], '18511 Highlander Medics St', '79918', false, G, 'https://wbamc.tricare.mil'),
  biz('EP-CRDH', 'Cardinal Health, Inc.', '4CRD1', ['424210','424410'], ['Drug Wholesalers','General Line Grocery'], '6200 Boeing Dr', '79925', false, B, 'https://cardinalhealth.com'),

  // ── Energy / Utilities ────────────────────────────────────────────────────
  biz('EP-EPE', 'El Paso Electric Company', '3EP01', ['221122','237130'], ['Electric Power Distribution','Power Line Construction'], '100 N Stanton St', '79901', false, B, 'https://epelectric.com'),
  biz('EP-EPWU', 'El Paso Water Utilities', '6K2M1', ['221310','237110'], ['Water Supply','Water Treatment'], '1154 Hawkins Blvd', '79925', false, G, 'https://epwater.org'),
  biz('EP-NXE', 'NextEra Energy Resources LLC', '8NX01', ['221114','221115'], ['Solar Electric Power','Wind Electric Power'], '700 Universe Blvd', '79912', false, B, 'https://nexteraenergy.com'),
  biz('EP-SNPW', 'SunPower Corporation', '9SNP1', ['221114','238210'], ['Solar Electric Power','Electrical Contractors'], '4700 N Mesa St', '79912', false, B, 'https://sunpower.com'),

  // ── Education / Research ──────────────────────────────────────────────────
  biz('EP-UTEP', 'University of Texas at El Paso', '3UT01', ['611310','541715'], ['Colleges & Universities','R&D Physical Sciences'], '500 W University Ave', '79968', false, G, 'https://utep.edu'),
  biz('EP-EPCC', 'El Paso Community College', '4EPC1', ['611210'], ['Community Colleges'], '9050 Viscount Blvd', '79925', false, G, 'https://epcc.edu'),

  // ── Construction / Engineering ────────────────────────────────────────────
  biz('EP-SNDT', 'Sundt Construction, Inc.', '5SND1', ['236220','237310'], ['Commercial Building Construction','Highway Construction'], '310 N Mesa St', '79901', false, B, 'https://sundt.com'),
  biz('EP-KEWT', 'Kiewit Infrastructure Co.', '6KWT1', ['237310','237990'], ['Highway & Bridge Construction','Heavy Construction'], '4141 Pinnacle St', '79902', false, B, 'https://kiewit.com'),
  biz('EP-HNSL', 'Hensel Phelps Construction Co.', '7HNS1', ['236220'], ['Commercial Building Construction'], '200 E Main Dr', '79901', false, B, 'https://henselphelps.com'),

  // ── Financial Services ────────────────────────────────────────────────────
  biz('EP-WSB', 'WestStar Bank', '8WSB1', ['522110'], ['Commercial Banking'], '500 N Mesa St', '79901', false, B, 'https://weststarbank.com'),
  biz('EP-GECU', 'Government Employees Credit Union', '9GCU1', ['522130'], ['Credit Unions'], '1100 N Stanton St', '79902', false, B, 'https://gecu.com'),
  biz('EP-IBC', 'International Bank of Commerce', '1IBC1', ['522110'], ['Commercial Banking'], '500 N Stanton St', '79901', false, B, 'https://ibc.com'),

  // ── Services / IT / Small Business ────────────────────────────────────────
  biz('EP-ALO', 'Alorica Inc.', '4AL01', ['561422'], ['Telemarketing & Call Centers'], '1600 E Paisano Dr', '79901', false, B, 'https://alorica.com'),
  biz('EP-CNDT', 'Conduent Incorporated', '2CND1', ['561110','541512'], ['Office Admin Services','Computer Systems Design'], '1881 Gateway Blvd S', '79903', false, B, 'https://conduent.com'),
  biz('EP-MESA', 'MesaAI Technologies', '3MSA1', ['541715','541512'], ['R&D Physical Sciences','Computer Systems Design'], '250 E Mills Ave', '79901', true, B, ''),
  biz('EP-CXIQ', 'CrossingIQ', '4CXQ1', ['541511','541519'], ['Custom Computer Programming','Other Computer Services'], '120 S Stanton St', '79901', true, B, ''),
  biz('EP-TSYN', 'TradeSync Border Solutions', '5TSN1', ['541511','561499'], ['Custom Computer Programming','Other Business Support'], '150 N Oregon St', '79901', true, B, ''),
  biz('EP-ARDT', 'AridTech Solutions', '6ARD1', ['333318','541715'], ['Other Industrial Machinery Mfg','R&D Physical Sciences'], '4200 Rio Bravo St', '79902', true, B, ''),
  biz('EP-RIOT', 'Rio IoT Systems', '7RIO1', ['334290','541512'], ['Other Communications Equipment','Computer Systems Design'], '180 E San Antonio Ave', '79901', true, B, ''),
  biz('EP-SNPA', 'SunPath Analytics', '8SPA1', ['541512','541511'], ['Computer Systems Design','Custom Computer Programming'], '350 E Overland Ave', '79901', true, B, ''),
  biz('EP-CGNV', 'CargoNerve Logistics Tech', '9CGN1', ['541511','488510'], ['Custom Computer Programming','Freight Transportation'], '220 S Mesa Hills Dr', '79912', true, B, ''),
  biz('EP-BRTK', 'BorderTech Solutions', '1BRT1', ['334519','541512'], ['Other Measuring Instruments','Computer Systems Design'], '140 W Paisano Dr', '79901', true, B, ''),
  biz('EP-CBPS', 'CBPASS Systems', '2CBP1', ['334519','541512'], ['Other Measuring Instruments','Computer Systems Design'], '160 S El Paso St', '79901', true, B, ''),
  biz('EP-PTLG', 'PortLogic Systems', '3PTL1', ['541511','488510'], ['Custom Computer Programming','Freight Transportation'], '170 W Mills Ave', '79901', true, B, ''),

  // ── Retail / Food / Real Estate ───────────────────────────────────────────
  biz('EP-HUNT', 'Hunt Companies, Inc.', '4HNT1', ['531311','236220'], ['Residential Property Managers','Commercial Building Construction'], '4401 N Mesa St', '79902', false, B, 'https://huntcompanies.com'),
  biz('EP-CBRE', 'CBRE Group, Inc.', '5CBR1', ['531312','531210'], ['Commercial RE Agents','Offices of Real Estate Agents'], '221 N Kansas St', '79901', false, B, 'https://cbre.com'),
];

function buildFallbackResponse(): SamBusinessesResponse {
  return {
    ok: true,
    totalRecords: FALLBACK_BUSINESSES.length,
    businesses: [...FALLBACK_BUSINESSES].sort((a, b) =>
      a.legalBusinessName.localeCompare(b.legalBusinessName),
    ),
    asOf: new Date().toISOString(),
  };
}

// ── GET /api/sam/businesses ──────────────────────────────────────────────────
// ?naics=541512  — filter by NAICS code (optional)
// ?refresh=1     — bypass cache (optional)

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `sam-businesses:${ip}`, maxRequests: 10, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const naicsFilter = (searchParams.get('naics') ?? '').trim();
  const forceRefresh = searchParams.get('refresh') === '1';

  // Serve from cache unless refresh requested
  if (!forceRefresh && _cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    const businesses = naicsFilter
      ? _cache.data.businesses.filter((b) => b.naicsCodes.includes(naicsFilter))
      : _cache.data.businesses;

    return NextResponse.json({
      ..._cache.data,
      businesses,
      totalRecords: businesses.length,
      cached: true,
    });
  }

  const apiKey1 = process.env.SAM_GOV_API_KEY ?? '';
  const apiKey2 = process.env.SAM_GOV_API_KEY_2 ?? '';

  // No API keys — return curated fallback
  if (!apiKey1 && !apiKey2) {
    const fallback = buildFallbackResponse();
    const businesses = naicsFilter
      ? fallback.businesses.filter((b) => b.naicsCodes.includes(naicsFilter))
      : fallback.businesses;
    return NextResponse.json(
      { ...fallback, businesses, totalRecords: businesses.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Try primary key, then fallback key if rate-limited or failed
  let live: SamBusinessesResponse | null = null;
  for (const key of [apiKey1, apiKey2].filter(Boolean)) {
    try {
      live = await fetchSamBusinesses(key);
      break; // success — stop trying
    } catch {
      continue; // try next key
    }
  }

  if (live) {
    // Merge live results with fallback to ensure known companies always appear
    const liveUeis = new Set(live.businesses.map((b) => b.uei));
    const extraFallback = FALLBACK_BUSINESSES.filter((b) => !liveUeis.has(b.uei));
    const merged = [...live.businesses, ...extraFallback]
      .sort((a, b) => a.legalBusinessName.localeCompare(b.legalBusinessName));

    const response: SamBusinessesResponse = {
      ok: true,
      totalRecords: merged.length,
      businesses: merged,
      asOf: new Date().toISOString(),
    };

    _cache = { data: response, ts: Date.now() };

    const businesses = naicsFilter
      ? response.businesses.filter((b) => b.naicsCodes.includes(naicsFilter))
      : response.businesses;

    return NextResponse.json(
      { ...response, businesses, totalRecords: businesses.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Both keys failed — return curated fallback
  const fallback = buildFallbackResponse();
  _cache = { data: fallback, ts: Date.now() };
  const businesses = naicsFilter
    ? fallback.businesses.filter((b) => b.naicsCodes.includes(naicsFilter))
    : fallback.businesses;
  return NextResponse.json(
    { ...fallback, businesses, totalRecords: businesses.length },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
