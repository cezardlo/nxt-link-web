/* ------------------------------------------------------------------ */
/*  Signal Prioritization Engine                                      */
/*  Ranks intelligence signals by weighted multi-factor scoring.      */
/* ------------------------------------------------------------------ */

export type PriorityTier = 'P0-CRITICAL' | 'P1-HIGH' | 'P2-MEDIUM' | 'P3-LOW';

export type PriorityFactors = {
  impact: number;     // 0-100 how much does this affect industries
  confidence: number; // 0-100 how sure are we
  novelty: number;    // 0-100 how new is this
  urgency: number;    // 0-100 how time-sensitive
  exposure: number;   // 0-100 how many industries exposed
};

export type SignalPriority = {
  score: number; // 0-100
  tier: PriorityTier;
  color: string;
  factors: PriorityFactors;
};

/* ---------- helpers ---------- */

const TIER_COLORS: Record<PriorityTier, string> = {
  'P0-CRITICAL': '#ff3b30',
  'P1-HIGH':     '#f97316',
  'P2-MEDIUM':   '#ffd700',
  'P3-LOW':      'rgba(255,255,255,0.3)',
};

function tierFromScore(score: number): PriorityTier {
  if (score >= 80) return 'P0-CRITICAL';
  if (score >= 60) return 'P1-HIGH';
  if (score >= 40) return 'P2-MEDIUM';
  return 'P3-LOW';
}

/* ---------- main scorer ---------- */

export function calculatePriority(factors: PriorityFactors): SignalPriority {
  const raw =
    factors.impact     * 0.30 +
    factors.confidence * 0.20 +
    factors.novelty    * 0.20 +
    factors.urgency    * 0.15 +
    factors.exposure   * 0.15;

  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const tier = tierFromScore(score);

  return {
    score,
    tier,
    color: TIER_COLORS[tier],
    factors,
  };
}

export function getPriorityColor(tier: string): string {
  return TIER_COLORS[tier as PriorityTier] ?? 'rgba(255,255,255,0.3)';
}

/* ------------------------------------------------------------------ */
/*  Prioritized Signals                                               */
/* ------------------------------------------------------------------ */

export type PrioritizedSignal = {
  id: string;
  title: string;
  domain: string;
  summary: string;
  priority: SignalPriority;
  timestamp: string;
  industriesImpacted: string[];
};

/* ------------------------------------------------------------------ */
/*  Text-Based P0-P3 Classifier                                       */
/*  Classifies ANY signal text into disruption priority level.         */
/* ------------------------------------------------------------------ */

export type TextPriorityClassification = {
  priority: PriorityTier;
  reason: string;
  urgency: number; // 0-100
};

const P0_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(world\s+war|nuclear\s+(strike|war|attack))\b/i, reason: 'Nuclear/global conflict' },
  { re: /\bglobal\s+(pandemic|financial\s+crisis|recession|collapse)\b/i, reason: 'Global systemic crisis' },
  { re: /\bglobal\s+(chip|semiconductor)\s+(shortage|crisis)\b/i, reason: 'Global chip crisis' },
  { re: /\b(TSMC|ASML)\b.*\b(destroy|attack|shut\s*down|seized)\b/i, reason: 'Critical semiconductor infrastructure threat' },
];

const P1_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(billion|B)\b.*\b(acquisition|merger|takeover)\b/i, reason: 'Billion-dollar M&A' },
  { re: /\bsanction\b.*\b(sweeping|comprehensive|new|major)\b/i, reason: 'Major sanctions' },
  { re: /\bexport\s+(ban|control)\b.*\b(chip|semiconductor|AI|quantum)\b/i, reason: 'Technology export ban' },
  { re: /\b(market|stock)\s+(crash|plunge|collapse)\b/i, reason: 'Market crash' },
  { re: /\bcyber\s*attack\b.*\b(critical|infrastructure|pipeline|grid)\b/i, reason: 'Critical infrastructure attack' },
  { re: /\b(earthquake|tsunami)\b.*\b(magnitude\s+[789]|devastating)\b/i, reason: 'Major natural disaster' },
  { re: /\b(breakthrough|first[- ]ever|world[- ]record)\b.*\b(quantum|fusion|superconductor)\b/i, reason: 'Scientific breakthrough' },
  { re: /\b(war|invasion)\b.*\b(escalat|spread|widen)\b/i, reason: 'Conflict escalation' },
];

const P2_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\braises?\s+\$?\d+\s*(million|M|billion|B)\b/i, reason: 'Significant funding' },
  { re: /\bseries\s+[a-d]\b/i, reason: 'Startup funding stage' },
  { re: /\bpatent\s+(grant|award|fil)\b/i, reason: 'Patent activity' },
  { re: /\bregulat(ion|ory)\b.*\b(new|proposed|passed)\b/i, reason: 'New regulation' },
  { re: /\b(contract|deal)\b.*\b(million|M|billion|B)\b/i, reason: 'Major contract' },
  { re: /\bnew\s+(factory|fab|plant|facility)\b/i, reason: 'Manufacturing expansion' },
  { re: /\bclinical\s+trial\b.*\b(success|positive|phase\s+3)\b/i, reason: 'Positive clinical trial' },
];

/** Classify any text into P0-P3 priority using regex pattern matching */
export function classifyTextPriority(text: string): TextPriorityClassification {
  for (const { re, reason } of P0_PATTERNS) {
    if (re.test(text)) return { priority: 'P0-CRITICAL', reason, urgency: 95 };
  }
  for (const { re, reason } of P1_PATTERNS) {
    if (re.test(text)) return { priority: 'P1-HIGH', reason, urgency: 75 };
  }
  for (const { re, reason } of P2_PATTERNS) {
    if (re.test(text)) return { priority: 'P2-MEDIUM', reason, urgency: 50 };
  }
  return { priority: 'P3-LOW', reason: 'Early signal', urgency: 25 };
}

/** Batch classify signals by their text content */
export function batchClassifyPriority(
  signals: Array<{ id: string; title: string; evidence?: string }>,
): Map<string, TextPriorityClassification> {
  const results = new Map<string, TextPriorityClassification>();
  for (const sig of signals) {
    results.set(sig.id, classifyTextPriority(`${sig.title} ${sig.evidence ?? ''}`));
  }
  return results;
}

/** Returns priority label for display */
export function getPriorityLabel(tier: PriorityTier): string {
  switch (tier) {
    case 'P0-CRITICAL': return 'GLOBAL DISRUPTION';
    case 'P1-HIGH': return 'INDUSTRY DISRUPTION';
    case 'P2-MEDIUM': return 'EMERGING TREND';
    case 'P3-LOW': return 'EARLY SIGNAL';
  }
}

/* ------------------------------------------------------------------ */
/*  Hardcoded Seed Signals (static fallback)                          */
/* ------------------------------------------------------------------ */

export const PRIORITIZED_SIGNALS: PrioritizedSignal[] = [
  {
    id: 'sig-001',
    title: 'US semiconductor export controls expanded to include AI chip derivatives',
    domain: 'Semiconductors',
    summary: 'Commerce Dept broadens export restrictions to cover modified AI accelerator chips, impacting major cloud and AI vendors. Supply chain re-routing expected within 90 days.',
    priority: calculatePriority({ impact: 95, confidence: 90, novelty: 80, urgency: 95, exposure: 90 }),
    timestamp: '2026-03-04T08:00:00Z',
    industriesImpacted: ['Semiconductors', 'AI/ML', 'Cloud Computing', 'Defense'],
  },
  {
    id: 'sig-002',
    title: 'Red Sea shipping disruption enters month 18 with no resolution',
    domain: 'Supply Chain',
    summary: 'Houthi attacks continue to force rerouting around Cape of Good Hope. Insurance premiums up 300%. El Paso-Juarez manufacturing corridor seeing 12-day average delays on Asian components.',
    priority: calculatePriority({ impact: 90, confidence: 95, novelty: 40, urgency: 85, exposure: 95 }),
    timestamp: '2026-03-03T14:00:00Z',
    industriesImpacted: ['Supply Chain', 'Manufacturing', 'Automotive', 'Electronics'],
  },
  {
    id: 'sig-003',
    title: 'TSMC Arizona fab Phase 2 begins volume production',
    domain: 'Semiconductors',
    summary: 'TSMC Phoenix facility starts 3nm process node production for US customers. First domestic advanced-node capacity reduces foreign dependency for defense chips.',
    priority: calculatePriority({ impact: 85, confidence: 88, novelty: 75, urgency: 60, exposure: 70 }),
    timestamp: '2026-03-02T10:00:00Z',
    industriesImpacted: ['Semiconductors', 'Defense', 'AI/ML', 'Automotive'],
  },
  {
    id: 'sig-004',
    title: 'New AI model achieves 94% accuracy in early-stage cancer detection',
    domain: 'Healthcare AI',
    summary: 'Google Health and Mayo Clinic publish multi-modal model detecting 12 cancer types from routine bloodwork. FDA fast-track review initiated.',
    priority: calculatePriority({ impact: 80, confidence: 82, novelty: 90, urgency: 65, exposure: 60 }),
    timestamp: '2026-03-01T09:00:00Z',
    industriesImpacted: ['Healthcare', 'Biotech', 'AI/ML', 'Insurance'],
  },
  {
    id: 'sig-005',
    title: 'Fort Bliss awards $45M cybersecurity modernization contract',
    domain: 'Defense',
    summary: 'Zero Trust Architecture implementation across Fort Bliss networks. Palo Alto Networks and Booz Allen Hamilton named as prime contractors. El Paso cybersecurity workforce demand expected to surge.',
    priority: calculatePriority({ impact: 75, confidence: 92, novelty: 65, urgency: 70, exposure: 50 }),
    timestamp: '2026-02-28T12:00:00Z',
    industriesImpacted: ['Defense', 'Cybersecurity', 'Government'],
  },
  {
    id: 'sig-006',
    title: 'Critical infrastructure cyber mandate effective date approaching',
    domain: 'Cybersecurity',
    summary: 'CISA Directive 23-02 compliance deadline in 45 days. Water utilities, power grids, and transportation systems must implement continuous monitoring. Non-compliance triggers federal funding freeze.',
    priority: calculatePriority({ impact: 85, confidence: 95, novelty: 50, urgency: 95, exposure: 80 }),
    timestamp: '2026-02-27T15:00:00Z',
    industriesImpacted: ['Cybersecurity', 'Utilities', 'Government', 'Transportation'],
  },
  {
    id: 'sig-007',
    title: 'El Paso Water Utilities pilots AI-powered leak detection system',
    domain: 'Water/Utilities',
    summary: 'Machine learning system analyzing acoustic sensor data reduces water loss by 23% in pilot zone. City council considering $8M expansion to full network.',
    priority: calculatePriority({ impact: 55, confidence: 78, novelty: 70, urgency: 40, exposure: 35 }),
    timestamp: '2026-02-25T11:00:00Z',
    industriesImpacted: ['Utilities', 'AI/ML', 'Smart City'],
  },
  {
    id: 'sig-008',
    title: 'EU AI Act enforcement begins with first compliance audits',
    domain: 'Regulation',
    summary: 'European regulators conducting initial audits of high-risk AI systems. US companies with EU operations scrambling for compliance. Extraterritorial provisions could impact El Paso defense contractors.',
    priority: calculatePriority({ impact: 80, confidence: 90, novelty: 70, urgency: 80, exposure: 75 }),
    timestamp: '2026-02-24T08:00:00Z',
    industriesImpacted: ['AI/ML', 'Defense', 'Healthcare', 'Finance', 'Enterprise'],
  },
  {
    id: 'sig-009',
    title: 'Autonomous trucking corridor approved: El Paso to Dallas I-10/I-20',
    domain: 'Transportation',
    summary: 'TxDOT and FMCSA approve Level 4 autonomous freight corridor. Aurora Innovation and TuSimple begin commercial operations. 800-mile route connects border trade to inland distribution.',
    priority: calculatePriority({ impact: 75, confidence: 80, novelty: 85, urgency: 55, exposure: 65 }),
    timestamp: '2026-02-22T10:00:00Z',
    industriesImpacted: ['Transportation', 'Logistics', 'Supply Chain', 'Automotive'],
  },
  {
    id: 'sig-010',
    title: 'DOE announces $2.1B for West Texas green hydrogen hub',
    domain: 'Energy',
    summary: 'Hydrogen production facility leveraging West Texas wind and solar. Expected to create 3,000 jobs. El Paso positioned as hydrogen transit corridor to Mexico industrial zones.',
    priority: calculatePriority({ impact: 70, confidence: 88, novelty: 75, urgency: 50, exposure: 55 }),
    timestamp: '2026-02-20T14:00:00Z',
    industriesImpacted: ['Energy', 'Hydrogen', 'Manufacturing', 'Transportation'],
  },
  {
    id: 'sig-011',
    title: 'CBP deploys AI-powered cargo scanning at Ysleta port of entry',
    domain: 'Border Security',
    summary: 'Machine learning system analyzes X-ray and spectroscopic data to detect contraband. Processing times reduced 40%. Technology from Rapiscan Systems with Palantir analytics integration.',
    priority: calculatePriority({ impact: 65, confidence: 85, novelty: 70, urgency: 60, exposure: 45 }),
    timestamp: '2026-02-18T09:00:00Z',
    industriesImpacted: ['Border Security', 'Defense', 'AI/ML', 'Logistics'],
  },
  {
    id: 'sig-012',
    title: 'Quantum computing achieves first practical advantage in drug simulation',
    domain: 'Quantum Computing',
    summary: 'IBM Quantum and Pfizer demonstrate molecular simulation outperforming classical supercomputers for novel antibiotic compound. Timeline to commercial quantum advantage revised from 2030 to 2027.',
    priority: calculatePriority({ impact: 70, confidence: 72, novelty: 95, urgency: 35, exposure: 50 }),
    timestamp: '2026-02-15T16:00:00Z',
    industriesImpacted: ['Quantum Computing', 'Healthcare', 'Biotech', 'Pharmaceuticals'],
  },
  {
    id: 'sig-013',
    title: 'Mexico nearshoring wave drives record Juarez industrial park demand',
    domain: 'Manufacturing',
    summary: 'Vacancy rates hit 2.1% across Juarez industrial parks. 14 new facilities under construction. Cross-border supply chain integration with El Paso deepening across automotive, electronics, medical devices.',
    priority: calculatePriority({ impact: 75, confidence: 90, novelty: 55, urgency: 65, exposure: 70 }),
    timestamp: '2026-02-12T11:00:00Z',
    industriesImpacted: ['Manufacturing', 'Real Estate', 'Supply Chain', 'Automotive'],
  },
  {
    id: 'sig-014',
    title: 'Solar panel tariff ruling disrupts US renewable energy pipeline',
    domain: 'Energy',
    summary: 'Commerce Dept imposes 35% tariffs on Southeast Asian solar panel imports. $18B in planned US solar installations face cost overruns. West Texas utility-scale projects reassessing economics.',
    priority: calculatePriority({ impact: 80, confidence: 88, novelty: 60, urgency: 75, exposure: 60 }),
    timestamp: '2026-02-10T08:00:00Z',
    industriesImpacted: ['Energy', 'Utilities', 'Manufacturing', 'Real Estate'],
  },
  {
    id: 'sig-015',
    title: 'Starlink Direct-to-Cell achieves first commercial text service',
    domain: 'Telecommunications',
    summary: 'SpaceX and T-Mobile launch SMS service via Starlink satellites in rural areas. Coverage extends to remote West Texas and border regions previously without cellular service.',
    priority: calculatePriority({ impact: 60, confidence: 82, novelty: 80, urgency: 45, exposure: 55 }),
    timestamp: '2026-02-08T13:00:00Z',
    industriesImpacted: ['Telecommunications', 'Aerospace', 'Agriculture', 'Border Security'],
  },
  {
    id: 'sig-016',
    title: 'Foxconn breaks ground on EV battery assembly plant in Juarez',
    domain: 'Manufacturing',
    summary: 'Foxconn investing $800M in EV battery module assembly facility. 2,500 direct jobs. Cross-border logistics with El Paso distribution hub planned for Q4 2026.',
    priority: calculatePriority({ impact: 70, confidence: 80, novelty: 65, urgency: 50, exposure: 55 }),
    timestamp: '2026-02-05T10:00:00Z',
    industriesImpacted: ['Manufacturing', 'Automotive', 'Energy', 'Logistics'],
  },
];
