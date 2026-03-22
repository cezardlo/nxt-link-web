import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── STEP 1: Problem aliases → normalized problem ─────────────────────────────
// "mini AI" — maps fuzzy user input to a canonical problem

const PROBLEM_ALIASES: Record<string, string> = {
  // Labor
  'too many workers':       'reduce labor cost',
  'high labor cost':        'reduce labor cost',
  'labor is expensive':     'reduce labor cost',
  'spending too much on staff': 'reduce labor cost',
  'payroll too high':       'reduce labor cost',
  'need fewer employees':   'reduce labor cost',
  'cut headcount':          'reduce labor cost',
  'workforce too large':    'reduce labor cost',

  // Sales
  'not enough sales':       'get more customers',
  'slow business':          'get more customers',
  'need more revenue':      'get more customers',
  'no customers':           'get more customers',
  'business is slow':       'get more customers',
  'losing customers':       'get more customers',
  'low revenue':            'get more customers',
  'need more leads':        'get more customers',
  'nobody is buying':       'get more customers',

  // Automation
  'too much manual work':   'automate operations',
  'everything is manual':   'automate operations',
  'need automation':        'automate operations',
  'repetitive tasks':       'automate operations',
  'wasting time on tasks':  'automate operations',
  'inefficient processes':  'automate operations',
  'streamline operations':  'automate operations',

  // Inventory
  'losing track of stock':  'improve inventory',
  'stock problems':         'improve inventory',
  'running out of product': 'improve inventory',
  'too much inventory':     'improve inventory',
  'inventory is a mess':    'improve inventory',
  'dont know what we have': 'improve inventory',
  'stockouts':              'improve inventory',

  // Warehouse
  'warehouse is slow':      'speed up warehouse',
  'shipping takes too long':'speed up warehouse',
  'picking errors':         'speed up warehouse',
  'fulfillment problems':   'speed up warehouse',
  'packing is slow':        'speed up warehouse',

  // Customer service
  'bad reviews':            'improve customer service',
  'customer complaints':    'improve customer service',
  'slow response time':     'improve customer service',
  'losing repeat customers':'improve customer service',

  // Billing
  'invoicing problems':     'modernize billing',
  'payment collection':     'modernize billing',
  'billing is manual':      'modernize billing',
  'late payments':          'modernize billing',
  'accounting mess':        'modernize billing',

  // Marketing
  'nobody knows about us':  'improve marketing',
  'need visibility':        'improve marketing',
  'no online presence':     'improve marketing',
  'no social media':        'improve marketing',
  'bad website':            'improve marketing',

  // Waste
  'throwing away product':  'reduce waste',
  'food waste':             'reduce waste',
  'material waste':         'reduce waste',
  'spoilage':               'reduce waste',

  // Scheduling
  'scheduling is chaos':    'improve scheduling',
  'cant find workers':      'improve scheduling',
  'no shows':               'improve scheduling',
  'shift management':       'improve scheduling',

  // Security
  'theft':                  'improve security',
  'break ins':              'improve security',
  'need cameras':           'improve security',
  'employee theft':         'improve security',

  // Compliance
  'osha problems':          'improve compliance',
  'safety violations':      'improve compliance',
  'inspection failed':      'improve compliance',
  'need safety system':     'improve compliance',

  // Border/customs
  'customs delays':         'speed up customs',
  'border crossing slow':   'speed up customs',
  'shipment stuck at border':'speed up customs',
  'tariff problems':        'speed up customs',
};

// ── STEP 2: Problem → Industries mapping ─────────────────────────────────────

const PROBLEM_INDUSTRY_MAP: Record<string, string[]> = {
  'reduce labor cost':      ['restaurant', 'warehouse', 'construction', 'window_cleaning'],
  'get more customers':     ['restaurant', 'window_cleaning', 'construction'],
  'automate operations':    ['warehouse', 'logistics', 'restaurant', 'construction'],
  'improve inventory':      ['restaurant', 'warehouse', 'logistics'],
  'speed up warehouse':     ['warehouse', 'logistics'],
  'improve customer service': ['restaurant', 'window_cleaning'],
  'modernize billing':      ['window_cleaning', 'construction', 'restaurant'],
  'improve marketing':      ['restaurant', 'window_cleaning', 'construction'],
  'reduce waste':           ['restaurant', 'warehouse'],
  'improve scheduling':     ['restaurant', 'construction', 'window_cleaning'],
  'improve security':       ['warehouse', 'restaurant', 'construction'],
  'improve compliance':     ['construction', 'restaurant', 'logistics'],
  'speed up customs':       ['border_tech', 'logistics'],
};

// ── STEP 3: Problem → Technology needs mapping ───────────────────────────────

const PROBLEM_TECHNOLOGY_MAP: Record<string, string[]> = {
  'reduce labor cost':      ['Staff scheduling and payroll', 'Emerging: AI ordering and automation', 'Picking and packing automation', 'Workforce scheduling', 'Employee time tracking', 'Emerging: autonomous mobile robots AMR'],
  'get more customers':     ['Customer loyalty programs', 'Marketing and lead generation', 'Online ordering and delivery', 'Customer relationship CRM'],
  'automate operations':    ['Emerging: AI ordering and automation', 'Picking and packing automation', 'Dispatch management system', 'Document automation OCR', 'Emerging: AI customs processing'],
  'improve inventory':      ['Inventory and food management', 'Inventory tracking software', 'Warehouse management system WMS', 'Barcode and RFID scanning'],
  'speed up warehouse':     ['Warehouse management system WMS', 'Picking and packing automation', 'Barcode and RFID scanning', 'Dock and yard management', 'Emerging: autonomous mobile robots AMR'],
  'improve customer service': ['Customer loyalty programs', 'Customer relationship CRM', 'Online ordering and delivery'],
  'modernize billing':      ['Accounting and bookkeeping', 'Invoicing and payment collection', 'Accounting and job costing'],
  'improve marketing':      ['Marketing and lead generation', 'Customer relationship CRM', 'Online ordering and delivery'],
  'reduce waste':           ['Inventory and food management', 'Food safety compliance', 'Inventory tracking software'],
  'improve scheduling':     ['Staff scheduling and payroll', 'Workforce scheduling', 'Job scheduling and dispatch', 'Employee time tracking'],
  'improve security':       ['Security cameras and systems', 'Security and access control', 'Biometric and security systems'],
  'improve compliance':     ['Safety compliance systems', 'Safety compliance tools', 'Food safety compliance', 'ELD and compliance tools'],
  'speed up customs':       ['Customs brokerage software', 'Cross-border customs software', 'Document automation OCR', 'Cargo tracking and visibility', 'Emerging: AI customs processing'],
};

// ── STEP 4: Best regions per problem ─────────────────────────────────────────

const PROBLEM_REGIONS: Record<string, Array<{ region: string; reason: string }>> = {
  'reduce labor cost':      [
    { region: 'China / Shenzhen', reason: 'Lowest-cost automation hardware manufacturing hub' },
    { region: 'USA / Texas', reason: 'Strong systems integration and local support' },
    { region: 'Germany', reason: 'Premium industrial automation with highest reliability' },
  ],
  'get more customers':     [
    { region: 'USA', reason: 'Best marketing technology and CRM ecosystem' },
    { region: 'India / Bangalore', reason: 'Cost-effective digital marketing services' },
  ],
  'automate operations':    [
    { region: 'Japan', reason: 'World leader in process automation and robotics' },
    { region: 'China / Shenzhen', reason: 'Affordable automation hardware at scale' },
    { region: 'USA / Silicon Valley', reason: 'AI-powered software automation platforms' },
  ],
  'improve inventory':      [
    { region: 'USA', reason: 'Dominant inventory management software market' },
    { region: 'China', reason: 'Cheapest barcode/RFID scanning hardware' },
  ],
  'speed up warehouse':     [
    { region: 'USA / Boston', reason: 'Leading warehouse robotics companies (Locus, 6RS)' },
    { region: 'China', reason: 'Low-cost AMR and conveyor systems' },
    { region: 'Germany', reason: 'Premium warehouse automation (KUKA, Dematic)' },
  ],
  'improve customer service': [
    { region: 'USA', reason: 'Best CRM and loyalty platform ecosystem' },
    { region: 'Philippines', reason: 'Cost-effective customer support outsourcing' },
  ],
  'modernize billing':      [
    { region: 'USA', reason: 'QuickBooks, Wave, and Square dominate this space' },
    { region: 'India', reason: 'Custom accounting software development at lower cost' },
  ],
  'improve marketing':      [
    { region: 'USA', reason: 'Google, Meta, and HubSpot are all US-based' },
    { region: 'India', reason: 'Affordable SEO and content marketing agencies' },
  ],
  'reduce waste':           [
    { region: 'USA', reason: 'Leading food waste tracking and compliance software' },
    { region: 'Israel', reason: 'Innovative agri-tech and waste reduction startups' },
  ],
  'improve scheduling':     [
    { region: 'USA', reason: 'Best scheduling software ecosystem (7shifts, Homebase, Jobber)' },
    { region: 'Canada', reason: 'Strong field service management platforms' },
  ],
  'improve security':       [
    { region: 'USA', reason: 'Cloud camera leaders (Verkada, Rhombus)' },
    { region: 'China', reason: 'Cheapest high-quality camera hardware (Hikvision, Dahua)' },
    { region: 'South Korea', reason: 'Advanced biometric and access control systems' },
  ],
  'improve compliance':     [
    { region: 'USA', reason: 'OSHA-specific compliance platforms' },
    { region: 'Australia', reason: 'SafetyCulture (iAuditor) headquartered here' },
  ],
  'speed up customs':       [
    { region: 'USA / El Paso', reason: 'Largest US-Mexico land port, local broker network' },
    { region: 'Netherlands', reason: 'Advanced trade compliance software (Descartes)' },
    { region: 'Singapore', reason: 'Leading customs automation technology' },
  ],
};

// ── STEP 5: Market insight per problem ────────────────────────────────────────

const MARKET_INSIGHTS: Record<string, { growth: string; competition: string; summary: string }> = {
  'reduce labor cost':      { growth: 'high', competition: 'medium', summary: 'Automation adoption is accelerating across all industries. Labor costs in El Paso have risen 18% since 2020, making even small automation investments pay back within 12 months.' },
  'get more customers':     { growth: 'high', competition: 'high', summary: 'Digital marketing and CRM tools are mature and competitive. The winners are businesses that adopt early in underserved local markets like El Paso.' },
  'automate operations':    { growth: 'very high', competition: 'medium', summary: 'AI-powered automation is the fastest-growing category in business tech. Early adopters gain 2-3 years of competitive advantage.' },
  'improve inventory':      { growth: 'medium', competition: 'high', summary: 'Inventory management is a solved problem — the technology is proven and affordable. The challenge is implementation, not finding the right tool.' },
  'speed up warehouse':     { growth: 'very high', competition: 'low', summary: 'Warehouse robotics and optimization are booming. Most El Paso warehouses have not adopted modern WMS, creating a huge opportunity gap.' },
  'improve customer service': { growth: 'medium', competition: 'high', summary: 'CRM and loyalty tools are commoditized. Differentiation comes from how well you use them, not which one you pick.' },
  'modernize billing':      { growth: 'low', competition: 'very high', summary: 'Accounting and billing software is mature and cheap. There is no reason to still use paper invoices — the switch pays for itself immediately.' },
  'improve marketing':      { growth: 'high', competition: 'very high', summary: 'Google Local Services Ads have the best ROI for local businesses. Most El Paso businesses are not using them yet.' },
  'reduce waste':           { growth: 'medium', competition: 'low', summary: 'Food and material waste tracking is underserved in El Paso. Simple temperature and inventory monitoring can cut waste 20-30%.' },
  'improve scheduling':     { growth: 'medium', competition: 'medium', summary: 'Field service scheduling is a competitive market with clear winners (Jobber, 7shifts). Switching from paper saves 5-10 hours per week.' },
  'improve security':       { growth: 'high', competition: 'medium', summary: 'Cloud-based security cameras with AI are replacing traditional CCTV fast. Prices have dropped 40% in 2 years.' },
  'improve compliance':     { growth: 'medium', competition: 'low', summary: 'Digital compliance tools reduce OSHA violation risk by 60%. Most small businesses still use paper, which is an easy win.' },
  'speed up customs':       { growth: 'high', competition: 'low', summary: 'AI customs processing is emerging but not mature. El Paso as the #1 US-Mexico crossing has unique demand for these tools.' },
};

// ── STEP 6: Next steps per problem ───────────────────────────────────────────

const NEXT_STEPS: Record<string, string> = {
  'reduce labor cost':      'Start with time tracking software (free options exist). Measure actual labor hours per task for 2 weeks. Then evaluate automation for your highest-labor-cost process.',
  'get more customers':     'Set up Google Business Profile today (free). Apply for Google Local Services Ads ($25-75/lead). Track which channel brings paying customers, not just clicks.',
  'automate operations':    'List your top 5 most repetitive tasks. Pick the one that takes the most employee hours. Research one software tool that replaces it. Start a free trial this week.',
  'improve inventory':      'Pick one inventory tracking tool and do a free trial. Count your actual stock once manually. Enter it into the system. The software handles everything after that.',
  'speed up warehouse':     'Install barcode scanning first — it is the highest-ROI warehouse improvement. A $350 Bluetooth scanner + free software trial can cut errors 50% in one week.',
  'improve customer service': 'Set up a free CRM (HubSpot). Log every customer interaction for 2 weeks. You will immediately see which customers need attention and which are at risk of leaving.',
  'modernize billing':      'Switch to Square Invoices or Wave today (both free). Send your first digital invoice this week. Set up auto-reminders for late payments. You will get paid 2x faster.',
  'improve marketing':      'Claim and complete your Google Business Profile. Add 10 photos of your work. Ask your best 3 customers for Google reviews. This alone can double your inbound leads.',
  'reduce waste':           'Track what you throw away for 1 week. Write it down. You will find that 80% of waste comes from 2-3 items. Fix those first before buying any technology.',
  'improve scheduling':     'Try Homebase (free) or Jobber ($49/mo) for 2 weeks. Let employees see their schedule on their phone. No-shows will drop immediately.',
  'improve security':       'Get one Reolink camera ($60) and point it at your highest-theft area. Review footage once. You will know within a week if you need a full system.',
  'improve compliance':     'Download the iAuditor app (free trial). Create one safety checklist for your most common task. Have your team fill it out for 1 week. You now have documentation.',
  'speed up customs':       'Talk to El Paso PTAC (free government counseling) about your specific customs bottleneck. They can match you with the right broker software without you paying for a consultant.',
};

// ── Normalize input ──────────────────────────────────────────────────────────

function normalizeInput(raw: string): string {
  const lower = raw.toLowerCase().trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');

  // Direct match to a canonical problem
  for (const canonical of Object.keys(PROBLEM_INDUSTRY_MAP)) {
    if (lower.includes(canonical.replace(/ /g, ' '))) return canonical;
  }

  // Alias match
  for (const [alias, canonical] of Object.entries(PROBLEM_ALIASES)) {
    if (lower.includes(alias)) return canonical;
  }

  // Keyword scoring — find best match
  const keywords: Record<string, string[]> = {
    'reduce labor cost':      ['labor', 'workers', 'staff', 'employee', 'payroll', 'headcount', 'hiring', 'wages', 'overtime'],
    'get more customers':     ['customer', 'sales', 'revenue', 'leads', 'buying', 'clients', 'slow', 'money', 'income', 'profit'],
    'automate operations':    ['automat', 'manual', 'repetitive', 'process', 'streamline', 'efficient', 'workflow', 'task'],
    'improve inventory':      ['inventory', 'stock', 'product', 'supply', 'count', 'tracking', 'warehouse management'],
    'speed up warehouse':     ['warehouse', 'picking', 'packing', 'shipping', 'fulfillment', 'dock', 'forklift'],
    'improve customer service': ['service', 'complaint', 'review', 'support', 'satisfaction', 'repeat'],
    'modernize billing':      ['billing', 'invoice', 'payment', 'accounting', 'bookkeep', 'quickbooks', 'receivable'],
    'improve marketing':      ['marketing', 'advertis', 'social media', 'website', 'seo', 'google', 'online presence', 'brand'],
    'reduce waste':           ['waste', 'spoil', 'throw away', 'expir', 'loss', 'scrap'],
    'improve scheduling':     ['schedul', 'shift', 'no show', 'dispatch', 'calendar', 'time off'],
    'improve security':       ['security', 'camera', 'theft', 'steal', 'break in', 'surveil', 'access control'],
    'improve compliance':     ['compliance', 'osha', 'safety', 'inspection', 'regulation', 'violation', 'permit'],
    'speed up customs':       ['customs', 'border', 'tariff', 'import', 'export', 'cross-border', 'clearance', 'broker'],
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

  return bestMatch || 'automate operations'; // sensible default
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

  // STEP 1: Normalize
  const problem = normalizeInput(raw);

  // STEP 2: Get industries — user-selected industry takes priority
  const allIndustries = PROBLEM_INDUSTRY_MAP[problem] ?? ['restaurant'];
  const industries = userIndustry
    ? [userIndustry, ...allIndustries.filter(i => i !== userIndustry)]
    : allIndustries;

  // STEP 3: Get technology needs
  const techNeeds = PROBLEM_TECHNOLOGY_MAP[problem] ?? [];

  // STEP 4: Query best_sources from Supabase
  let sources: Array<Record<string, unknown>> = [];
  if (techNeeds.length > 0) {
    const { data } = await supabase
      .from('best_sources')
      .select('*')
      .in('technology_need', techNeeds)
      .in('industry', industries)
      .order('buy_now', { ascending: false });
    sources = data ?? [];
  }

  // If no matches, broaden to all needs for the industry
  if (sources.length === 0) {
    const { data } = await supabase
      .from('best_sources')
      .select('*')
      .in('industry', industries)
      .order('technology_need');
    sources = data ?? [];
  }

  // STEP 5: Query vendors from Supabase
  const { data: vendorData } = await supabase
    .from('vendors')
    .select('company_name,sector,iker_score,company_url,description')
    .order('iker_score', { ascending: false })
    .limit(20);
  const allVendors = vendorData ?? [];

  // Filter vendors by keyword relevance to the problem
  const problemWords = problem.split(' ');
  const relevantVendors = allVendors.filter(v => {
    const hay = `${v.sector ?? ''} ${v.description ?? ''}`.toLowerCase();
    return problemWords.some(w => hay.includes(w));
  }).slice(0, 5);

  // If no keyword matches, just return top vendors
  const finalVendors = relevantVendors.length > 0
    ? relevantVendors
    : allVendors.filter(v => (v.iker_score ?? 0) > 70).slice(0, 5);

  // STEP 6: Pick the best recommendation (first source with buy_now=true)
  const topSource = sources.find(s => s.buy_now === true) ?? sources[0];

  // STEP 7: Get regions
  const regions = PROBLEM_REGIONS[problem] ?? [
    { region: 'USA', reason: 'Strongest overall technology ecosystem' },
    { region: 'China', reason: 'Lowest-cost hardware manufacturing' },
  ];

  // STEP 8: Get market insight
  const insight = MARKET_INSIGHTS[problem] ?? {
    growth: 'medium',
    competition: 'medium',
    summary: 'This is an active market with proven solutions available.',
  };

  // STEP 9: Get next step
  const nextStep = NEXT_STEPS[problem] ?? 'Research 2-3 vendors that match your needs. Start a free trial with the one that has the best reviews for your industry.';

  // BUILD RESPONSE
  const response = {
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
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
