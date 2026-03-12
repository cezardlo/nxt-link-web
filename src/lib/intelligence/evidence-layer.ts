/* ------------------------------------------------------------------ */
/*  Evidence & Confidence Scoring System                              */
/*  Every claim in NXT LINK carries a confidence score backed by      */
/*  traceable evidence items.                                         */
/* ------------------------------------------------------------------ */

export type EvidenceType =
  | 'research-paper'
  | 'news-article'
  | 'conference-demo'
  | 'company-announcement'
  | 'patent'
  | 'government-report'
  | 'industry-analysis';

export type EvidenceItem = {
  type: EvidenceType;
  source: string;
  url?: string;
  date?: string;
  reliability: number; // 0-1 source reliability
};

export type ConfidenceGrade = 'VERIFIED' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNVERIFIED';

export type ConfidenceScore = {
  score: number; // 0-100
  grade: ConfidenceGrade;
  color: string;
  evidence: EvidenceItem[];
  reasoning: string;
};

/* ---------- helpers ---------- */

const GRADE_COLORS: Record<ConfidenceGrade, string> = {
  VERIFIED:   '#00ff88',
  HIGH:       '#00d4ff',
  MODERATE:   '#ffd700',
  LOW:        '#f97316',
  UNVERIFIED: '#ff3b30',
};

export function getConfidenceColor(grade: string): string {
  return GRADE_COLORS[grade as ConfidenceGrade] ?? '#ff3b30';
}

function gradeFromScore(score: number): ConfidenceGrade {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MODERATE';
  if (score >= 30) return 'LOW';
  return 'UNVERIFIED';
}

/**
 * How many days old is the evidence item?
 * Returns 0 when no date is provided (treated as "unknown age").
 */
function daysAgo(dateStr?: string): number {
  if (!dateStr) return 365; // unknown = treat as 1yr old
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/**
 * Recency multiplier: brand-new items get 1.0, items >1yr old get ~0.5.
 */
function recencyFactor(dateStr?: string): number {
  const age = daysAgo(dateStr);
  return Math.max(0.5, 1 - age / 730); // linear decay over 2 years, floor 0.5
}

/* ---------- main scorer ---------- */

export function calculateConfidence(evidence: EvidenceItem[]): ConfidenceScore {
  if (evidence.length === 0) {
    return {
      score: 0,
      grade: 'UNVERIFIED',
      color: GRADE_COLORS.UNVERIFIED,
      evidence: [],
      reasoning: 'No supporting evidence found.',
    };
  }

  // 1. Volume score (more sources = higher, diminishing returns)
  const volumeScore = Math.min(100, evidence.length * 18); // 6 sources -> 100

  // 2. Diversity score (different evidence types = higher)
  const uniqueTypes = new Set(evidence.map((e) => e.type));
  const diversityScore = Math.min(100, (uniqueTypes.size / 4) * 100); // 4 types -> 100

  // 3. Reliability score (weighted average * 100)
  const totalReliability = evidence.reduce((sum, e) => sum + e.reliability, 0);
  const reliabilityScore = (totalReliability / evidence.length) * 100;

  // 4. Recency score (average recency factor * 100)
  const totalRecency = evidence.reduce((sum, e) => sum + recencyFactor(e.date), 0);
  const recencyScore = (totalRecency / evidence.length) * 100;

  // Weighted combination
  const raw =
    volumeScore * 0.2 +
    diversityScore * 0.2 +
    reliabilityScore * 0.35 +
    recencyScore * 0.25;

  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const grade = gradeFromScore(score);

  const parts: string[] = [];
  parts.push(`${evidence.length} source(s) across ${uniqueTypes.size} type(s)`);
  parts.push(`avg reliability ${(reliabilityScore / 100).toFixed(2)}`);
  if (recencyScore >= 80) parts.push('recent data');

  return {
    score,
    grade,
    color: GRADE_COLORS[grade],
    evidence,
    reasoning: parts.join('; ') + '.',
  };
}

/* ---------- Claim type ---------- */

export type ClaimPredicate =
  | 'uses'
  | 'discovered'
  | 'builds'
  | 'researches'
  | 'showcased_at'
  | 'impacts'
  | 'funds';

export type Claim = {
  id: string;
  subject: string;
  predicate: ClaimPredicate;
  object: string;
  confidence: ConfidenceScore;
  industries: string[];
  technologies: string[];
  timestamp: string;
};

/* ------------------------------------------------------------------ */
/*  Sample Claims                                                     */
/* ------------------------------------------------------------------ */

export const SAMPLE_CLAIMS: Claim[] = [
  {
    id: 'cl-001',
    subject: 'DHL',
    predicate: 'uses',
    object: 'Locus Robotics AMR',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'DHL Press', url: 'https://dhl.com/press/amr', date: '2026-01-15', reliability: 0.9 },
      { type: 'news-article', source: 'Reuters', date: '2026-01-16', reliability: 0.92 },
      { type: 'industry-analysis', source: 'Gartner', date: '2025-12-20', reliability: 0.88 },
    ]),
    industries: ['Logistics', 'Supply Chain'],
    technologies: ['AMR', 'Warehouse Automation'],
    timestamp: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cl-002',
    subject: 'MIT CSAIL',
    predicate: 'discovered',
    object: 'Robotic Gripping Technique',
    confidence: calculateConfidence([
      { type: 'research-paper', source: 'MIT CSAIL', url: 'https://csail.mit.edu/gripping', date: '2025-11-08', reliability: 0.95 },
      { type: 'news-article', source: 'TechCrunch', date: '2025-11-10', reliability: 0.78 },
    ]),
    industries: ['Manufacturing', 'Robotics'],
    technologies: ['Soft Robotics', 'Computer Vision'],
    timestamp: '2025-11-08T08:00:00Z',
  },
  {
    id: 'cl-003',
    subject: 'MODEX 2026',
    predicate: 'showcased_at',
    object: 'Warehouse Robotics',
    confidence: calculateConfidence([
      { type: 'conference-demo', source: 'MODEX Official', url: 'https://modexshow.com', date: '2026-03-01', reliability: 0.85 },
      { type: 'news-article', source: 'Supply Chain Dive', date: '2026-03-02', reliability: 0.82 },
      { type: 'industry-analysis', source: 'MHI Report', date: '2026-02-28', reliability: 0.87 },
    ]),
    industries: ['Logistics', 'Manufacturing'],
    technologies: ['AMR', 'Warehouse Automation', 'AI'],
    timestamp: '2026-03-01T09:00:00Z',
  },
  {
    id: 'cl-004',
    subject: 'CBP El Paso',
    predicate: 'uses',
    object: 'Computer Vision Surveillance',
    confidence: calculateConfidence([
      { type: 'government-report', source: 'CBP.gov', url: 'https://cbp.gov/tech-report', date: '2025-09-15', reliability: 0.93 },
      { type: 'news-article', source: 'El Paso Times', date: '2025-10-02', reliability: 0.75 },
      { type: 'patent', source: 'USPTO', date: '2025-06-20', reliability: 0.97 },
    ]),
    industries: ['Defense', 'Government'],
    technologies: ['Computer Vision', 'Edge AI', 'Surveillance'],
    timestamp: '2025-09-15T14:00:00Z',
  },
  {
    id: 'cl-005',
    subject: 'Fort Bliss',
    predicate: 'uses',
    object: 'Zero Trust Architecture',
    confidence: calculateConfidence([
      { type: 'government-report', source: 'DoD CIO', url: 'https://dod.mil/zta', date: '2025-12-01', reliability: 0.94 },
      { type: 'news-article', source: 'Defense One', date: '2025-12-05', reliability: 0.85 },
      { type: 'company-announcement', source: 'Palo Alto Networks', date: '2025-11-20', reliability: 0.8 },
      { type: 'industry-analysis', source: 'Forrester', date: '2025-10-15', reliability: 0.9 },
    ]),
    industries: ['Defense', 'Cybersecurity'],
    technologies: ['Zero Trust', 'IAM', 'SASE'],
    timestamp: '2025-12-01T12:00:00Z',
  },
  {
    id: 'cl-006',
    subject: 'UTEP',
    predicate: 'researches',
    object: 'Desalination Membrane Technology',
    confidence: calculateConfidence([
      { type: 'research-paper', source: 'UTEP Engineering', date: '2025-08-20', reliability: 0.88 },
      { type: 'news-article', source: 'El Paso Herald-Post', date: '2025-09-01', reliability: 0.7 },
    ]),
    industries: ['Water', 'Energy'],
    technologies: ['Desalination', 'Nanotechnology'],
    timestamp: '2025-08-20T09:00:00Z',
  },
  {
    id: 'cl-007',
    subject: 'Raytheon',
    predicate: 'builds',
    object: 'Directed Energy Weapon System',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'RTX Newsroom', date: '2026-01-20', reliability: 0.88 },
      { type: 'government-report', source: 'DoD Acquisition', date: '2025-11-10', reliability: 0.95 },
      { type: 'patent', source: 'USPTO', date: '2025-07-15', reliability: 0.97 },
      { type: 'news-article', source: 'Breaking Defense', date: '2026-01-22', reliability: 0.86 },
    ]),
    industries: ['Defense', 'Aerospace'],
    technologies: ['Directed Energy', 'Laser Systems'],
    timestamp: '2026-01-20T11:00:00Z',
  },
  {
    id: 'cl-008',
    subject: 'Tesla',
    predicate: 'builds',
    object: 'Megapack Battery Storage',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'Tesla IR', date: '2026-02-10', reliability: 0.9 },
      { type: 'news-article', source: 'Bloomberg', date: '2026-02-11', reliability: 0.93 },
      { type: 'industry-analysis', source: 'BloombergNEF', date: '2026-01-30', reliability: 0.91 },
    ]),
    industries: ['Energy', 'Utilities'],
    technologies: ['Battery Storage', 'Grid Modernization'],
    timestamp: '2026-02-10T15:00:00Z',
  },
  {
    id: 'cl-009',
    subject: 'Palantir',
    predicate: 'uses',
    object: 'AIP for DoD Mission Planning',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'Palantir Blog', date: '2026-02-01', reliability: 0.85 },
      { type: 'government-report', source: 'CDAO', date: '2025-12-15', reliability: 0.93 },
      { type: 'news-article', source: 'C4ISRNET', date: '2026-02-03', reliability: 0.84 },
    ]),
    industries: ['Defense', 'Intelligence'],
    technologies: ['AIP', 'LLM', 'Decision Intelligence'],
    timestamp: '2026-02-01T08:00:00Z',
  },
  {
    id: 'cl-010',
    subject: 'El Paso Electric',
    predicate: 'uses',
    object: 'Smart Grid Sensors',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'EP Electric', date: '2025-10-05', reliability: 0.8 },
      { type: 'news-article', source: 'KTSM', date: '2025-10-07', reliability: 0.72 },
    ]),
    industries: ['Energy', 'Utilities'],
    technologies: ['IoT', 'Smart Grid', 'SCADA'],
    timestamp: '2025-10-05T10:00:00Z',
  },
  {
    id: 'cl-011',
    subject: 'Amazon',
    predicate: 'funds',
    object: 'El Paso Fulfillment Center Expansion',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'Amazon Press', date: '2026-01-08', reliability: 0.92 },
      { type: 'news-article', source: 'El Paso Times', date: '2026-01-09', reliability: 0.75 },
      { type: 'government-report', source: 'City of El Paso', date: '2025-12-20', reliability: 0.88 },
    ]),
    industries: ['Logistics', 'Real Estate'],
    technologies: ['Warehouse Automation', 'Robotics'],
    timestamp: '2026-01-08T14:00:00Z',
  },
  {
    id: 'cl-012',
    subject: 'Lockheed Martin',
    predicate: 'builds',
    object: 'Autonomous Drone Swarm Platform',
    confidence: calculateConfidence([
      { type: 'patent', source: 'USPTO', date: '2025-08-01', reliability: 0.97 },
      { type: 'company-announcement', source: 'LM Newsroom', date: '2025-09-15', reliability: 0.88 },
      { type: 'government-report', source: 'DARPA', date: '2025-07-20', reliability: 0.96 },
      { type: 'research-paper', source: 'IEEE', date: '2025-06-10', reliability: 0.92 },
    ]),
    industries: ['Defense', 'Aerospace'],
    technologies: ['UAV', 'Swarm AI', 'Edge Computing'],
    timestamp: '2025-09-15T09:00:00Z',
  },
  {
    id: 'cl-013',
    subject: 'NVIDIA',
    predicate: 'impacts',
    object: 'AI Chip Supply Chain Bottleneck',
    confidence: calculateConfidence([
      { type: 'news-article', source: 'Bloomberg', date: '2026-02-20', reliability: 0.93 },
      { type: 'industry-analysis', source: 'IDC', date: '2026-02-18', reliability: 0.9 },
      { type: 'company-announcement', source: 'NVIDIA IR', date: '2026-02-15', reliability: 0.91 },
    ]),
    industries: ['Semiconductors', 'AI/ML'],
    technologies: ['GPU', 'AI Accelerators', 'HBM'],
    timestamp: '2026-02-20T16:00:00Z',
  },
  {
    id: 'cl-014',
    subject: 'Siemens',
    predicate: 'showcased_at',
    object: 'Digital Twin for Manufacturing',
    confidence: calculateConfidence([
      { type: 'conference-demo', source: 'Hannover Messe', date: '2026-02-25', reliability: 0.86 },
      { type: 'company-announcement', source: 'Siemens Press', date: '2026-02-24', reliability: 0.88 },
    ]),
    industries: ['Manufacturing', 'Industrial IoT'],
    technologies: ['Digital Twin', 'Simulation', 'PLC'],
    timestamp: '2026-02-25T08:00:00Z',
  },
  {
    id: 'cl-015',
    subject: 'Anduril',
    predicate: 'builds',
    object: 'Lattice Autonomous Sentry Tower',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'Anduril', date: '2025-11-01', reliability: 0.85 },
      { type: 'government-report', source: 'CBP RFI', date: '2025-10-15', reliability: 0.92 },
      { type: 'news-article', source: 'Wired', date: '2025-11-05', reliability: 0.8 },
    ]),
    industries: ['Defense', 'Border Security'],
    technologies: ['Computer Vision', 'Edge AI', 'Autonomous Systems'],
    timestamp: '2025-11-01T10:00:00Z',
  },
  {
    id: 'cl-016',
    subject: 'Google DeepMind',
    predicate: 'discovered',
    object: 'Protein Folding Prediction v3',
    confidence: calculateConfidence([
      { type: 'research-paper', source: 'Nature', date: '2026-01-25', reliability: 0.98 },
      { type: 'news-article', source: 'MIT Technology Review', date: '2026-01-26', reliability: 0.88 },
      { type: 'company-announcement', source: 'DeepMind Blog', date: '2026-01-25', reliability: 0.9 },
    ]),
    industries: ['Healthcare', 'Biotech'],
    technologies: ['AI/ML', 'Protein Engineering', 'Drug Discovery'],
    timestamp: '2026-01-25T12:00:00Z',
  },
  {
    id: 'cl-017',
    subject: 'US DOE',
    predicate: 'funds',
    object: 'West Texas Green Hydrogen Hub',
    confidence: calculateConfidence([
      { type: 'government-report', source: 'DOE.gov', date: '2025-12-10', reliability: 0.96 },
      { type: 'news-article', source: 'Reuters', date: '2025-12-12', reliability: 0.92 },
    ]),
    industries: ['Energy', 'Hydrogen'],
    technologies: ['Green Hydrogen', 'Electrolysis'],
    timestamp: '2025-12-10T11:00:00Z',
  },
  {
    id: 'cl-018',
    subject: 'SpaceX',
    predicate: 'impacts',
    object: 'Starlink Direct-to-Cell Coverage',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'SpaceX', date: '2026-02-05', reliability: 0.87 },
      { type: 'news-article', source: 'Ars Technica', date: '2026-02-06', reliability: 0.82 },
      { type: 'patent', source: 'FCC Filing', date: '2025-11-30', reliability: 0.94 },
    ]),
    industries: ['Telecommunications', 'Aerospace'],
    technologies: ['LEO Satellite', 'Direct-to-Cell', '5G NTN'],
    timestamp: '2026-02-05T13:00:00Z',
  },
  {
    id: 'cl-019',
    subject: 'CISA',
    predicate: 'impacts',
    object: 'Critical Infrastructure Cyber Mandate',
    confidence: calculateConfidence([
      { type: 'government-report', source: 'CISA.gov', date: '2026-02-15', reliability: 0.97 },
      { type: 'news-article', source: 'CyberScoop', date: '2026-02-16', reliability: 0.84 },
      { type: 'industry-analysis', source: 'Mandiant', date: '2026-02-17', reliability: 0.89 },
    ]),
    industries: ['Cybersecurity', 'Utilities', 'Government'],
    technologies: ['Zero Trust', 'OT Security', 'SBOM'],
    timestamp: '2026-02-15T09:00:00Z',
  },
  {
    id: 'cl-020',
    subject: 'Foxconn',
    predicate: 'builds',
    object: 'EV Battery Assembly Plant (Juarez)',
    confidence: calculateConfidence([
      { type: 'company-announcement', source: 'Foxconn', date: '2026-01-28', reliability: 0.84 },
      { type: 'news-article', source: 'El Paso Times', date: '2026-01-30', reliability: 0.75 },
      { type: 'government-report', source: 'Chihuahua Econ Dev', date: '2026-01-25', reliability: 0.78 },
    ]),
    industries: ['Manufacturing', 'Automotive'],
    technologies: ['EV Battery', 'Assembly Automation'],
    timestamp: '2026-01-28T10:00:00Z',
  },
  {
    id: 'cl-021',
    subject: 'Anthropic',
    predicate: 'discovered',
    object: 'Constitutional AI Safety Framework v2',
    confidence: calculateConfidence([
      { type: 'research-paper', source: 'Anthropic Research', date: '2026-02-12', reliability: 0.94 },
      { type: 'news-article', source: 'The Verge', date: '2026-02-13', reliability: 0.79 },
    ]),
    industries: ['AI/ML', 'Enterprise'],
    technologies: ['LLM', 'AI Safety', 'RLHF'],
    timestamp: '2026-02-12T10:00:00Z',
  },
];
