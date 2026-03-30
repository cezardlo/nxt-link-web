import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── STEP 1: Problem aliases → normalized problem ─────────────────────────────
// Focused on trucking, logistics, freight, warehousing, supply chain

const PROBLEM_ALIASES: Record<string, string> = {
  // Fleet & Transportation
  'trucks breaking down':     'reduce fleet downtime',
  'vehicle maintenance':      'reduce fleet downtime',
  'fleet costs too high':     'reduce fleet downtime',
  'truck repairs':            'reduce fleet downtime',
  'vehicles are old':         'reduce fleet downtime',
  'breakdowns on route':      'reduce fleet downtime',

  'bad routes':               'optimize fleet routes',
  'drivers waste fuel':       'optimize fleet routes',
  'fuel costs too high':      'optimize fleet routes',
  'too many empty miles':     'optimize fleet routes',
  'deadhead miles':           'optimize fleet routes',
  'inefficient routing':      'optimize fleet routes',

  'cant find drivers':        'solve driver shortage',
  'driver turnover':          'solve driver shortage',
  'losing drivers':           'solve driver shortage',
  'driver retention':         'solve driver shortage',
  'hiring drivers is hard':   'solve driver shortage',
  'need more drivers':        'solve driver shortage',

  'late deliveries':          'improve on-time delivery',
  'missed delivery windows':  'improve on-time delivery',
  'customers complaining about delays': 'improve on-time delivery',
  'delivery takes too long':  'improve on-time delivery',
  'last mile is slow':        'improve on-time delivery',

  // Warehouse & Fulfillment
  'warehouse is slow':        'speed up warehouse',
  'shipping takes too long':  'speed up warehouse',
  'picking errors':           'speed up warehouse',
  'fulfillment problems':     'speed up warehouse',
  'packing is slow':          'speed up warehouse',
  'dock congestion':          'speed up warehouse',

  'losing track of stock':    'improve inventory',
  'stock problems':           'improve inventory',
  'running out of product':   'improve inventory',
  'too much inventory':       'improve inventory',
  'inventory is a mess':      'improve inventory',
  'dont know what we have':   'improve inventory',
  'stockouts':                'improve inventory',

  // Freight & Shipping
  'freight costs too high':   'reduce freight costs',
  'shipping is expensive':    'reduce freight costs',
  'paying too much for freight': 'reduce freight costs',
  'carrier rates are up':     'reduce freight costs',
  'need cheaper shipping':    'reduce freight costs',

  'cant track shipments':     'improve shipment visibility',
  'where is my freight':      'improve shipment visibility',
  'lost shipments':           'improve shipment visibility',
  'no tracking':              'improve shipment visibility',
  'blind spots in supply chain': 'improve shipment visibility',

  'too many carriers':        'streamline carrier management',
  'carrier selection':        'streamline carrier management',
  'broker takes too much':    'streamline carrier management',
  'need better carriers':     'streamline carrier management',

  // Operations & Compliance
  'too much paperwork':       'automate operations',
  'everything is manual':     'automate operations',
  'need automation':          'automate operations',
  'repetitive tasks':         'automate operations',
  'wasting time on tasks':    'automate operations',
  'manual data entry':        'automate operations',

  'eld problems':             'improve compliance',
  'hos violations':           'improve compliance',
  'dot audit':                'improve compliance',
  'safety violations':        'improve compliance',
  'fmcsa compliance':         'improve compliance',
  'inspection failed':        'improve compliance',
  'csa scores':               'improve compliance',

  // Cross-border
  'customs delays':           'speed up customs',
  'border crossing slow':     'speed up customs',
  'shipment stuck at border': 'speed up customs',
  'tariff problems':          'speed up customs',
  'maquiladora logistics':    'speed up customs',
  'cross border shipments':   'speed up customs',

  // Labor
  'too many workers':         'reduce labor cost',
  'high labor cost':          'reduce labor cost',
  'labor is expensive':       'reduce labor cost',
  'payroll too high':         'reduce labor cost',
  'overtime costs':           'reduce labor cost',
};

// ── STEP 2: Problem → Industries mapping ─────────────────────────────────────

const PROBLEM_INDUSTRY_MAP: Record<string, string[]> = {
  'reduce fleet downtime':       ['logistics', 'manufacturing'],
  'optimize fleet routes':       ['logistics', 'manufacturing'],
  'solve driver shortage':       ['logistics'],
  'improve on-time delivery':    ['logistics', 'manufacturing'],
  'speed up warehouse':          ['warehouse', 'logistics'],
  'improve inventory':           ['warehouse', 'logistics', 'manufacturing'],
  'reduce freight costs':        ['logistics', 'manufacturing'],
  'improve shipment visibility': ['logistics', 'manufacturing'],
  'streamline carrier management': ['logistics'],
  'automate operations':         ['warehouse', 'logistics', 'manufacturing'],
  'improve compliance':          ['logistics', 'manufacturing'],
  'speed up customs':            ['logistics', 'border_tech'],
  'reduce labor cost':           ['warehouse', 'logistics', 'manufacturing'],
};

// ── STEP 3: Problem → Technology needs mapping ───────────────────────────────

const PROBLEM_TECHNOLOGY_MAP: Record<string, string[]> = {
  'reduce fleet downtime':       ['Fleet maintenance software', 'Telematics and diagnostics', 'Predictive maintenance AI', 'Vehicle inspection tools'],
  'optimize fleet routes':       ['Route optimization software', 'GPS fleet tracking', 'Fuel management systems', 'Transportation management system TMS'],
  'solve driver shortage':       ['Driver recruiting platforms', 'Driver retention tools', 'Workforce scheduling', 'Employee time tracking'],
  'improve on-time delivery':    ['Transportation management system TMS', 'Route optimization software', 'Last-mile delivery software', 'Dispatch management system'],
  'speed up warehouse':          ['Warehouse management system WMS', 'Picking and packing automation', 'Barcode and RFID scanning', 'Dock and yard management', 'Emerging: autonomous mobile robots AMR'],
  'improve inventory':           ['Inventory tracking software', 'Warehouse management system WMS', 'Barcode and RFID scanning', 'Demand forecasting tools'],
  'reduce freight costs':        ['Freight rate benchmarking', 'Load board platforms', 'Transportation management system TMS', 'Freight audit and payment'],
  'improve shipment visibility': ['Cargo tracking and visibility', 'Transportation management system TMS', 'IoT tracking devices', 'Supply chain visibility platforms'],
  'streamline carrier management': ['Carrier management platforms', 'Freight broker software', 'Load board platforms', 'Carrier compliance screening'],
  'automate operations':         ['Document automation OCR', 'Dispatch management system', 'Robotic process automation', 'Emerging: AI logistics automation'],
  'improve compliance':          ['ELD and compliance tools', 'Safety compliance tools', 'DOT inspection software', 'Driver qualification file management'],
  'speed up customs':            ['Customs brokerage software', 'Cross-border customs software', 'Document automation OCR', 'Cargo tracking and visibility', 'Emerging: AI customs processing'],
  'reduce labor cost':           ['Picking and packing automation', 'Workforce scheduling', 'Employee time tracking', 'Emerging: autonomous mobile robots AMR'],
};

// ── STEP 4: Best regions per problem ─────────────────────────────────────────

const PROBLEM_REGIONS: Record<string, Array<{ region: string; reason: string }>> = {
  'reduce fleet downtime':       [
    { region: 'USA / Texas', reason: 'Major trucking corridor with strong fleet service networks' },
    { region: 'Germany', reason: 'Premium telematics and predictive maintenance technology' },
    { region: 'Israel', reason: 'Leading AI-powered vehicle diagnostics startups' },
  ],
  'optimize fleet routes':       [
    { region: 'USA', reason: 'Dominant route optimization and TMS ecosystem (Samsara, Motive, Trimble)' },
    { region: 'Europe', reason: 'Advanced green logistics and multi-modal routing' },
  ],
  'solve driver shortage':       [
    { region: 'USA / Sun Belt', reason: 'Fastest-growing freight markets, highest driver demand' },
    { region: 'Mexico', reason: 'Cross-border driver programs for nearshoring growth' },
  ],
  'improve on-time delivery':    [
    { region: 'USA', reason: 'Leading last-mile and TMS platforms' },
    { region: 'China / Shenzhen', reason: 'Low-cost IoT tracking hardware at scale' },
  ],
  'speed up warehouse':          [
    { region: 'USA / Boston', reason: 'Leading warehouse robotics companies (Locus, 6RS)' },
    { region: 'China', reason: 'Low-cost AMR and conveyor systems' },
    { region: 'Germany', reason: 'Premium warehouse automation (KUKA, Dematic)' },
  ],
  'improve inventory':           [
    { region: 'USA', reason: 'Dominant inventory management software market' },
    { region: 'China', reason: 'Cheapest barcode/RFID scanning hardware' },
  ],
  'reduce freight costs':        [
    { region: 'USA', reason: 'DAT, Truckstop, and FreightWaves provide rate intelligence' },
    { region: 'Mexico', reason: 'Nearshoring driving competitive cross-border rates' },
  ],
  'improve shipment visibility': [
    { region: 'USA', reason: 'FourKites, project44, and Descartes lead visibility' },
    { region: 'Europe', reason: 'Strong multi-modal tracking across borders' },
  ],
  'streamline carrier management': [
    { region: 'USA', reason: 'Largest carrier network and load board ecosystem' },
    { region: 'Canada', reason: 'Strong cross-border carrier management platforms' },
  ],
  'automate operations':         [
    { region: 'USA / Silicon Valley', reason: 'AI-powered logistics automation platforms' },
    { region: 'Japan', reason: 'World leader in process automation and robotics' },
    { region: 'China / Shenzhen', reason: 'Affordable automation hardware at scale' },
  ],
  'improve compliance':          [
    { region: 'USA', reason: 'FMCSA-specific ELD and compliance platforms' },
    { region: 'Canada', reason: 'Cross-border compliance technology' },
  ],
  'speed up customs':            [
    { region: 'USA / El Paso', reason: 'Largest US-Mexico land port, local broker network' },
    { region: 'Netherlands', reason: 'Advanced trade compliance software (Descartes)' },
    { region: 'Singapore', reason: 'Leading customs automation technology' },
  ],
  'reduce labor cost':           [
    { region: 'USA / Texas', reason: 'Strong systems integration and warehouse automation vendors' },
    { region: 'China / Shenzhen', reason: 'Lowest-cost automation hardware manufacturing hub' },
    { region: 'Germany', reason: 'Premium industrial automation with highest reliability' },
  ],
};

// ── STEP 5: Market insight per problem ────────────────────────────────────────

const MARKET_INSIGHTS: Record<string, { growth: string; competition: string; summary: string }> = {
  'reduce fleet downtime':       { growth: 'high', competition: 'medium', summary: 'Predictive maintenance is cutting unplanned downtime by 30-50%. Telematics adoption in trucking has doubled since 2022, with most ROI coming from preventing roadside breakdowns.' },
  'optimize fleet routes':       { growth: 'very high', competition: 'medium', summary: 'AI-powered route optimization can reduce fuel costs 10-15%. The shift to real-time dynamic routing is the biggest efficiency gain in trucking right now.' },
  'solve driver shortage':       { growth: 'high', competition: 'low', summary: 'The ATA estimates a shortage of 80,000+ drivers. Companies with better technology, scheduling flexibility, and retention programs are winning the talent war.' },
  'improve on-time delivery':    { growth: 'high', competition: 'medium', summary: 'On-time delivery rates directly impact customer retention. Real-time visibility and dynamic ETAs are becoming table stakes for shippers.' },
  'speed up warehouse':          { growth: 'very high', competition: 'low', summary: 'Warehouse robotics and optimization are booming. Most warehouses have not adopted modern WMS, creating a huge opportunity gap.' },
  'improve inventory':           { growth: 'medium', competition: 'high', summary: 'Inventory management is a solved problem — the technology is proven and affordable. The challenge is implementation, not finding the right tool.' },
  'reduce freight costs':        { growth: 'high', competition: 'high', summary: 'Freight rate volatility makes benchmarking critical. Companies using rate intelligence tools save 8-12% on average freight spend.' },
  'improve shipment visibility': { growth: 'very high', competition: 'medium', summary: 'Real-time visibility is the fastest-growing logistics tech category. Shippers now expect tracking as standard — carriers without it lose business.' },
  'streamline carrier management': { growth: 'medium', competition: 'medium', summary: 'Digital freight matching is replacing phone-and-email brokerage. Platforms that automate carrier selection and compliance save 15-20 hours per week.' },
  'automate operations':         { growth: 'very high', competition: 'medium', summary: 'AI-powered automation is the fastest-growing category in logistics tech. Early adopters gain 2-3 years of competitive advantage.' },
  'improve compliance':          { growth: 'medium', competition: 'low', summary: 'ELD mandates drove initial adoption, but CSA score management and driver qualification file automation are the next wave. Non-compliance costs $16,000+ per violation.' },
  'speed up customs':            { growth: 'high', competition: 'low', summary: 'AI customs processing is emerging. The US-Mexico trade corridor ($779B annually) has unique demand for these tools, especially with nearshoring growth.' },
  'reduce labor cost':           { growth: 'high', competition: 'medium', summary: 'Warehouse and logistics labor costs have risen significantly. Even small automation investments in picking, packing, or sorting pay back within 12 months.' },
};

// ── STEP 6: Next steps per problem ───────────────────────────────────────────

const NEXT_STEPS: Record<string, string> = {
  'reduce fleet downtime':       'Start with a telematics provider like Samsara or Motive (most offer 30-day trials). Track fault codes and maintenance intervals for your top 5 breakdown-prone vehicles first.',
  'optimize fleet routes':       'Install GPS tracking on your fleet if you haven\'t already. Run your current routes through a free route optimization trial (OptimoRoute, Route4Me). Compare actual vs. optimized fuel costs.',
  'solve driver shortage':       'Survey your current drivers on why they stay. Fix the top 2 complaints first. Then use a platform like CDLLife or Tenstreet to source new drivers — referral bonuses outperform job boards 3:1.',
  'improve on-time delivery':    'Track your current on-time rate for 2 weeks. Identify whether delays come from dispatch, routing, loading, or traffic. A TMS with real-time ETA updates addresses most causes.',
  'speed up warehouse':          'Install barcode scanning first — it\'s the highest-ROI warehouse improvement. A $350 Bluetooth scanner + free WMS trial can cut errors 50% in one week.',
  'improve inventory':           'Pick one inventory tracking tool and do a free trial. Count your actual stock once manually. Enter it into the system. The software handles everything after that.',
  'reduce freight costs':        'Run your last 3 months of freight invoices through a rate benchmarking tool (DAT RateView, Greenscreens). You\'ll immediately see which lanes are overpriced.',
  'improve shipment visibility': 'Start with one visibility platform trial (FourKites, project44, or Descartes MacroPoint). Connect your top 5 carriers. You\'ll have full visibility within a week.',
  'streamline carrier management': 'List your top 10 carriers and rate them on price, reliability, and communication. A carrier management platform can automate scoring and compliance checks across all of them.',
  'automate operations':         'List your top 5 most time-consuming manual processes. Pick the one with the most hours. Research one software tool that replaces it. Start a free trial this week.',
  'improve compliance':          'Run a CSA score check on your DOT number today (free at ai.fmcsa.dot.gov). If any BASICs are above threshold, prioritize those areas. An ELD with built-in compliance alerts prevents most violations.',
  'speed up customs':            'Talk to El Paso PTAC (free government counseling) about your specific customs bottleneck. They can match you with the right broker software without paying for a consultant.',
  'reduce labor cost':           'Start with time tracking software (free options exist). Measure actual labor hours per task for 2 weeks. Then evaluate automation for your highest-labor-cost process.',
};

// ── Normalize input ──────────────────────────────────────────────────────────

function normalizeInput(raw: string): string {
  const lower = raw.toLowerCase().trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');

  for (const canonical of Object.keys(PROBLEM_INDUSTRY_MAP)) {
    if (lower.includes(canonical.replace(/ /g, ' '))) return canonical;
  }

  for (const [alias, canonical] of Object.entries(PROBLEM_ALIASES)) {
    if (lower.includes(alias)) return canonical;
  }

  const keywords: Record<string, string[]> = {
    'reduce fleet downtime':       ['fleet', 'truck', 'breakdown', 'maintenance', 'repair', 'vehicle', 'mechanic', 'downtime'],
    'optimize fleet routes':       ['route', 'fuel', 'miles', 'gps', 'deadhead', 'empty', 'routing', 'mileage'],
    'solve driver shortage':       ['driver', 'cdl', 'trucker', 'retention', 'turnover', 'hiring', 'recruit'],
    'improve on-time delivery':    ['delivery', 'late', 'delay', 'window', 'eta', 'on time', 'last mile'],
    'speed up warehouse':          ['warehouse', 'picking', 'packing', 'shipping', 'fulfillment', 'dock', 'forklift', 'loading'],
    'improve inventory':           ['inventory', 'stock', 'supply', 'count', 'tracking', 'wms', 'sku'],
    'reduce freight costs':        ['freight', 'rate', 'carrier cost', 'shipping cost', 'lane', 'ltl', 'ftl', 'truckload'],
    'improve shipment visibility': ['visibility', 'track', 'shipment', 'where is', 'blind spot', 'iot', 'sensor'],
    'streamline carrier management': ['carrier', 'broker', 'load board', 'capacity', 'tender'],
    'automate operations':         ['automat', 'manual', 'repetitive', 'process', 'streamline', 'paperwork', 'data entry'],
    'improve compliance':          ['compliance', 'eld', 'hos', 'dot', 'fmcsa', 'csa', 'inspection', 'violation', 'safety'],
    'speed up customs':            ['customs', 'border', 'tariff', 'import', 'export', 'cross-border', 'clearance', 'maquiladora'],
    'reduce labor cost':           ['labor', 'workers', 'staff', 'employee', 'payroll', 'headcount', 'overtime', 'wages'],
  };

  let bestMatch = '';
  let bestScore = 0;

  for (const [problem, words] of Object.entries(keywords)) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = problem;
    }
  }

  return bestMatch || 'automate operations';
}

// ── POST /api/decide ─────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json() as { problem: string; industry?: string };
  const raw = body.problem;
  const userIndustry = body.industry ?? null;

  if (!raw || typeof raw !== 'string' || raw.trim().length < 3) {
    return NextResponse.json(
      { ok: false, error: 'Please describe your problem (at least 3 characters).' },
      { status: 400 },
    );
  }

  const problem = normalizeInput(raw);

  const allIndustries = PROBLEM_INDUSTRY_MAP[problem] ?? ['logistics'];
  const industries = userIndustry
    ? [userIndustry, ...allIndustries.filter(i => i !== userIndustry)]
    : allIndustries;

  const techNeeds = PROBLEM_TECHNOLOGY_MAP[problem] ?? [];

  let sources: Array<Record<string, unknown>> = [];
  if (techNeeds.length > 0) {
    const { data } = await getSupabase()
      .from('best_sources')
      .select('*')
      .in('technology_need', techNeeds)
      .in('industry', industries)
      .order('buy_now', { ascending: false });
    sources = data ?? [];
  }

  if (sources.length === 0) {
    const { data } = await getSupabase()
      .from('best_sources')
      .select('*')
      .in('industry', industries)
      .order('technology_need');
    sources = data ?? [];
  }

  const { data: vendorData } = await getSupabase()
    .from('vendors')
    .select('company_name,sector,iker_score,company_url,description')
    .order('iker_score', { ascending: false })
    .limit(20);
  const allVendors = vendorData ?? [];

  const problemWords = problem.split(' ');
  const relevantVendors = allVendors.filter(v => {
    const hay = `${v.sector ?? ''} ${v.description ?? ''}`.toLowerCase();
    return problemWords.some(w => hay.includes(w));
  }).slice(0, 5);

  const finalVendors = relevantVendors.length > 0
    ? relevantVendors
    : allVendors.filter(v => (v.iker_score ?? 0) > 70).slice(0, 5);

  const topSource = sources.find(s => s.buy_now === true) ?? sources[0];

  const regions = PROBLEM_REGIONS[problem] ?? [
    { region: 'USA', reason: 'Largest trucking and logistics technology ecosystem' },
    { region: 'Mexico', reason: 'Growing nearshoring and cross-border freight corridor' },
  ];

  const insight = MARKET_INSIGHTS[problem] ?? {
    growth: 'medium',
    competition: 'medium',
    summary: 'This is an active market with proven logistics solutions available.',
  };

  const nextStep = NEXT_STEPS[problem] ?? 'Research 2-3 vendors that match your needs. Start a free trial with the one that has the best reviews for logistics and trucking.';

  return NextResponse.json({
    ok: true,
    problem,
    user_input: raw.trim(),
    matched_industries: industries,
    recommended_solution: topSource ? {
      technology: topSource.technology_need as string,
      product: topSource.best_global_name as string,
      price: topSource.best_global_price as string,
      website: topSource.best_global_website as string,
      reason: topSource.best_global_why as string,
      local_option: topSource.best_local_name as string | null,
      local_phone: topSource.best_local_phone as string | null,
      value_pick: topSource.best_value_name as string | null,
      value_price: topSource.best_value_price as string | null,
      value_why: topSource.best_value_why as string | null,
      avoid: topSource.avoid_what as string | null,
      avoid_why: topSource.avoid_why as string | null,
    } : null,
    all_solutions: sources.slice(0, 5).map(s => ({
      technology: s.technology_need,
      product: s.best_global_name,
      price: s.best_global_price,
      buy_now: s.buy_now,
      industry: s.industry,
    })),
    best_regions: regions,
    market_insight: insight,
    vendors: finalVendors.map(v => ({
      name: v.company_name,
      sector: v.sector,
      score: v.iker_score,
      website: v.company_url,
    })),
    next_step: nextStep,
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
