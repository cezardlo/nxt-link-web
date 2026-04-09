/**
 * Keyword-based signal enrichment — no AI API key required.
 * Runs locally on every signal to produce meaning, direction,
 * el_paso_score, and el_paso_angle without external dependencies.
 */

export type EnrichedSignal = {
  meaning: string;
  direction: 'rising' | 'falling' | 'stable' | 'emerging' | 'disrupting';
  el_paso_score: number;
  el_paso_angle: string;
};

// ── Direction detection ──────────────────────────────────────────────────────

const RISING_TERMS = ['raise', 'raised', 'win', 'wins', 'won', 'launch', 'launches', 'launched',
  'deploy', 'deploys', 'deployed', 'expand', 'expands', 'expanded', 'breakthrough', 'record',
  'award', 'awarded', 'milestone', 'growth', 'surge', 'accelerat', 'boost', 'invest', 'fund'];

const FALLING_TERMS = ['layoff', 'layoffs', 'shutdown', 'shuts down', 'fail', 'fails', 'failed',
  'decline', 'declines', 'drop', 'drops', 'lose', 'loses', 'lost', 'cancel', 'cancels',
  'cancelled', 'cut', 'cuts', 'ban', 'banned', 'withdraw', 'halt', 'halts'];

const EMERGING_TERMS = ['new', 'first', 'novel', 'pioneer', 'pioneers', 'announce', 'announces',
  'announced', 'introduce', 'introduces', 'introduced', 'debut', 'debuts', 'unveil', 'unveils',
  'upcoming', 'preview', 'prototype'];

const DISRUPTING_TERMS = ['replace', 'replaces', 'disrupt', 'disrupts', 'transform', 'transforms',
  'revolutionize', 'revolutionizes', 'obsolete', 'reshape', 'reshape', 'overturn', 'challenge',
  'challenges'];

function detectDirection(title: string): EnrichedSignal['direction'] {
  const t = title.toLowerCase();
  if (DISRUPTING_TERMS.some(k => t.includes(k))) return 'disrupting';
  if (RISING_TERMS.some(k => t.includes(k))) return 'rising';
  if (FALLING_TERMS.some(k => t.includes(k))) return 'falling';
  if (EMERGING_TERMS.some(k => t.includes(k))) return 'emerging';
  return 'stable';
}

// ── El Paso score ────────────────────────────────────────────────────────────

const EP_DIRECT_TERMS = [
  'el paso', 'fort bliss', 'utep', 'bota', 'borderplex', 'juarez', 'juárez',
  'cbp', 'horizon city', 'santa teresa', 'el paso electric', 'el paso county',
  'las cruces', 'white sands', 'biggs', 'dona ana',
];

const EP_ADJACENT_INDUSTRIES = new Set(['defense', 'border-tech', 'logistics', 'manufacturing', 'transportation']);
const EP_RELEVANT_INDUSTRIES = new Set(['ai-ml', 'cybersecurity', 'space', 'government']);
const EP_NEARBY_INDUSTRIES = new Set(['robotics', 'energy', 'tech', 'technology']);

function calcElPasoScore(title: string, industry: string, sourceDomain?: string): number {
  let score = 0;
  const t = (title + ' ' + (sourceDomain ?? '')).toLowerCase();

  if (EP_DIRECT_TERMS.some(k => t.includes(k))) score += 65;
  if (EP_ADJACENT_INDUSTRIES.has(industry)) score += 25;
  else if (EP_RELEVANT_INDUSTRIES.has(industry)) score += 15;
  else if (EP_NEARBY_INDUSTRIES.has(industry)) score += 8;

  return Math.min(100, score);
}

// ── El Paso angle text ───────────────────────────────────────────────────────

const INDUSTRY_EP_CONTEXT: Record<string, string> = {
  'defense': 'Fort Bliss and WSMR are major tech buyers in the defense sector',
  'border-tech': 'CBP and border crossing operations directly involve El Paso',
  'logistics': 'El Paso is one of the top US–Mexico trade corridor cities',
  'manufacturing': 'Juárez maquiladoras supply major US manufacturers through El Paso',
  'ai-ml': 'Fort Bliss and UTEP both have active AI research and procurement programs',
  'cybersecurity': 'FORSCOM and Fort Bliss require enterprise-grade cybersecurity solutions',
  'space': 'White Sands Missile Range and SpaceX Starbase are ~90 miles from El Paso',
  'robotics': 'Maquiladora automation is rapidly expanding in the Juárez corridor',
  'energy': 'El Paso Electric and West Texas wind farms anchor the regional energy grid',
  'tech': 'El Paso is building its tech startup corridor around UTEP and HUNT Companies',
  'transportation': 'BOTA and Ysleta ports of entry handle $115B+ in cross-border freight annually',
  'government': 'El Paso is home to multiple federal agencies: CBP, ICE, Army, DHS',
  'finance': 'Cross-border trade financing flows through El Paso banking infrastructure',
};

function buildElPasoAngle(score: number, industry: string, title: string): string {
  if (score >= 65) {
    return `Direct El Paso impact — ${INDUSTRY_EP_CONTEXT[industry] ?? 'affects local operations and economy'}`;
  }
  if (score >= 25) {
    const context = INDUSTRY_EP_CONTEXT[industry];
    return context
      ? `Relevant to El Paso's ${industry} sector — ${context}`
      : `Relevant to the El Paso regional economy`;
  }
  return 'Not directly relevant to El Paso';
}

// ── Meaning generation ───────────────────────────────────────────────────────

const MEANING_MAP: Partial<Record<string, Partial<Record<string, string>>>> = {
  funding_round: {
    defense: 'Defense sector investment accelerating — companies competing for military contracts',
    'ai-ml': 'AI startup funding signals investor confidence in near-term commercial deployment',
    cybersecurity: 'Cybersecurity investment surge reflects growing enterprise threat landscape',
    space: 'Space economy capital inflows indicate commercial launch and satellite demand',
    default: 'Private capital entering this sector — watch for product launches in 12–18 months',
  },
  contract_award: {
    defense: 'Government defense spending signal — indicates budget priority and vendor selection',
    logistics: 'Supply chain contract locks in long-term capacity and routing infrastructure',
    'border-tech': 'Federal border tech procurement accelerating — CBP and DHS are active buyers',
    default: 'Government contract validates vendor capability and secures revenue pipeline',
  },
  patent_filing: {
    'ai-ml': 'AI intellectual property race intensifying — companies protecting core algorithms',
    defense: 'Defense IP filing signals next-gen capability development in progress',
    robotics: 'Robotics patent activity indicates automation wave moving toward commercialization',
    default: 'Intellectual property race heating up — watch for product announcements in 6–18 months',
  },
  product_launch: {
    'ai-ml': 'New AI capability entering market — adoption curve will determine enterprise impact',
    defense: 'New defense product cleared for procurement — watch government contract pipeline',
    cybersecurity: 'New security solution targeting emerging threat vector or compliance requirement',
    default: 'New solution entering market — watch for customer adoption and competitive response',
  },
  research_breakthrough: {
    'ai-ml': 'AI research breakthrough — potential 12–36 month path to commercial deployment',
    space: 'Space technology advance — likely to influence next procurement cycle',
    robotics: 'Robotics capability leap — automation timeline compressing for early adopters',
    default: 'Research advance moving toward commercialization — watch for startup formation',
  },
  merger_acquisition: {
    default: 'Consolidation signal — market thinning as leaders acquire capabilities vs. building',
  },
  market_shift: {
    default: 'Market dynamics shifting — evaluate supply chain and procurement implications',
  },
};

function buildMeaning(signalType: string, industry: string, title: string): string {
  const typeMap = MEANING_MAP[signalType];
  if (typeMap) {
    return typeMap[industry] ?? typeMap['default'] ?? `${industry} sector moving — monitor for downstream effects`;
  }
  // Fallback by industry
  return `${industry.toUpperCase()} sector activity — signals continued investment and attention in this space`;
}

// ── Main export ──────────────────────────────────────────────────────────────

export function enrichSignalLocally(signal: {
  title: string;
  industry: string;
  signal_type: string;
  source_domain?: string;
}): EnrichedSignal {
  const direction = detectDirection(signal.title);
  const el_paso_score = calcElPasoScore(signal.title, signal.industry, signal.source_domain);
  const el_paso_angle = buildElPasoAngle(el_paso_score, signal.industry, signal.title);
  const meaning = buildMeaning(signal.signal_type, signal.industry, signal.title);

  return { meaning, direction, el_paso_score, el_paso_angle };
}
