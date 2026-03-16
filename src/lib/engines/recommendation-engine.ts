// ─── Recommendation Engine ────────────────────────────────────────────────────
// Maps problems → technologies → companies → direction for any industry keyword.
// Purely algorithmic — no LLM required.

import { PRODUCT_CATALOG } from '@/lib/data/product-catalog';
import { TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecommendedProblem = {
  problem: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
};

export type RecommendedTechnology = {
  name: string;
  maturity: string;
  fitScore: number; // 0-100
  reason: string;
};

export type RecommendedCompany = {
  name: string;
  ikerScore: number;
  category: string;
  relevance: string;
};

export type IndustryRecommendation = {
  industry: string;
  slug: string;
  problems: RecommendedProblem[];
  technologies: RecommendedTechnology[];
  companies: RecommendedCompany[];
  direction: string;
  confidence: number;
};

// ─── Problem-Technology-Company Mappings ──────────────────────────────────────

type ProblemDef = {
  keywords: string[];
  problem: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  techKeywords: string[];
};

const PROBLEM_DB: ProblemDef[] = [
  { keywords: ['manufacturing', 'factory', 'production', 'fabrication'],
    problem: 'Defect Detection & Quality Control',
    severity: 'critical',
    description: 'Manual inspection misses defects, costing 15-25% in waste and rework.',
    techKeywords: ['computer vision', 'ai', 'inspection', 'quality', 'sensor'] },
  { keywords: ['manufacturing', 'factory', 'production'],
    problem: 'Production Downtime & Maintenance',
    severity: 'high',
    description: 'Unplanned equipment failures cause 5-20% production losses.',
    techKeywords: ['predictive maintenance', 'iot', 'digital twin', 'sensor', 'analytics'] },
  { keywords: ['manufacturing', 'supply chain', 'logistics'],
    problem: 'Supply Chain Visibility',
    severity: 'high',
    description: 'Lack of real-time tracking across multi-tier supply chains creates blind spots.',
    techKeywords: ['rfid', 'blockchain', 'iot', 'tracking', 'visibility', 'supply chain'] },
  { keywords: ['cybersecurity', 'security', 'cyber'],
    problem: 'Ransomware & Advanced Threats',
    severity: 'critical',
    description: 'Sophisticated attacks bypass traditional defenses. Average breach cost: $4.5M.',
    techKeywords: ['zero trust', 'endpoint', 'threat detection', 'siem', 'xdr'] },
  { keywords: ['cybersecurity', 'security', 'cyber'],
    problem: 'Talent Shortage in Security Operations',
    severity: 'high',
    description: '3.5M unfilled cybersecurity positions globally. SOCs overwhelmed.',
    techKeywords: ['automation', 'soar', 'ai', 'managed security'] },
  { keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml'],
    problem: 'AI Model Governance & Safety',
    severity: 'critical',
    description: 'Deploying AI without guardrails creates liability, bias, and regulatory risk.',
    techKeywords: ['ai safety', 'governance', 'guardrails', 'alignment', 'monitoring'] },
  { keywords: ['ai', 'artificial intelligence', 'machine learning'],
    problem: 'Data Quality for AI Training',
    severity: 'high',
    description: 'Poor data quality causes 80% of AI project failures.',
    techKeywords: ['data pipeline', 'data quality', 'labeling', 'synthetic data', 'mlops'] },
  { keywords: ['energy', 'power', 'grid', 'electricity', 'solar', 'wind'],
    problem: 'Grid Stability with Renewables',
    severity: 'critical',
    description: 'Intermittent renewable sources destabilize grids without storage solutions.',
    techKeywords: ['battery', 'storage', 'grid', 'smart grid', 'inverter'] },
  { keywords: ['energy', 'power', 'carbon'],
    problem: 'Carbon Emission Compliance',
    severity: 'high',
    description: 'Tightening regulations require accurate emissions tracking and reduction.',
    techKeywords: ['carbon', 'emissions', 'monitoring', 'carbon capture', 'esg'] },
  { keywords: ['defense', 'military', 'dod'],
    problem: 'Decision Speed in Multi-Domain Operations',
    severity: 'critical',
    description: 'JADC2 requires fusing data from all domains in real-time for decision advantage.',
    techKeywords: ['c4isr', 'sensor fusion', 'ai', 'autonomous', 'command'] },
  { keywords: ['defense', 'military', 'drone'],
    problem: 'Counter-UAS / Counter-Drone',
    severity: 'high',
    description: 'Cheap commercial drones pose asymmetric threat to installations and forces.',
    techKeywords: ['counter-uas', 'drone', 'radar', 'directed energy', 'electronic warfare'] },
  { keywords: ['healthcare', 'health', 'medical', 'hospital'],
    problem: 'Clinical Decision Support',
    severity: 'high',
    description: 'Physicians face information overload. AI can reduce diagnostic errors by 30%.',
    techKeywords: ['clinical ai', 'ehr', 'diagnostic', 'nlp', 'medical imaging'] },
  { keywords: ['healthcare', 'health', 'pharma', 'drug'],
    problem: 'Drug Discovery Speed',
    severity: 'critical',
    description: 'Average drug takes 10 years and $2.6B to develop. AI can cut time by 50%.',
    techKeywords: ['drug discovery', 'protein folding', 'generative chemistry', 'clinical trial'] },
  { keywords: ['logistics', 'shipping', 'freight', 'warehouse'],
    problem: 'Last-Mile Delivery Cost',
    severity: 'high',
    description: 'Last mile accounts for 53% of total shipping cost. Automation is key.',
    techKeywords: ['autonomous delivery', 'drone', 'routing', 'warehouse automation', 'robotics'] },
  { keywords: ['logistics', 'border', 'customs', 'trade'],
    problem: 'Cross-Border Customs Delays',
    severity: 'high',
    description: 'El Paso ports process $100B+ in trade. Hours of wait time cost billions annually.',
    techKeywords: ['customs', 'pre-clearance', 'blockchain', 'rfid', 'ai inspection'] },
  { keywords: ['water', 'desalination', 'irrigation'],
    problem: 'Water Scarcity & Treatment',
    severity: 'critical',
    description: 'Arid regions face 40% water deficit by 2030. Smart treatment is essential.',
    techKeywords: ['desalination', 'membrane', 'water treatment', 'smart irrigation', 'leak detection'] },
  { keywords: ['construction', 'building', 'infrastructure'],
    problem: 'Project Cost Overruns',
    severity: 'high',
    description: '85% of construction projects exceed budget. Digital twins can reduce overruns by 20%.',
    techKeywords: ['bim', 'digital twin', 'project management', 'prefab', 'drone survey'] },
  { keywords: ['fintech', 'banking', 'finance', 'payment'],
    problem: 'Fraud Detection at Scale',
    severity: 'critical',
    description: 'Digital payment fraud exceeds $30B annually. Real-time AI detection is critical.',
    techKeywords: ['fraud detection', 'ml', 'real-time', 'behavioral analytics', 'identity'] },
  { keywords: ['agriculture', 'farming', 'crop'],
    problem: 'Precision Crop Management',
    severity: 'high',
    description: 'Optimizing inputs (water, fertilizer, pesticide) per-acre increases yield 15-20%.',
    techKeywords: ['precision agriculture', 'drone', 'satellite', 'soil sensor', 'ai'] },
];

// ─── Core Functions ────────────────────────────────────────────────────────────

function matchProblems(keyword: string): RecommendedProblem[] {
  const lower = keyword.toLowerCase();
  const words = lower.split(/[\s-]+/);

  return PROBLEM_DB
    .filter(p => p.keywords.some(k => words.some(w => k.includes(w) || w.includes(k))))
    .map(p => ({ problem: p.problem, severity: p.severity, description: p.description }));
}

function matchTechnologies(keyword: string, problems: ProblemDef[]): RecommendedTechnology[] {
  const lower = keyword.toLowerCase();
  const allTechKeywords = new Set(problems.flatMap(p => p.techKeywords));

  const scored = TECHNOLOGY_CATALOG
    .map(t => {
      const nameMatch = t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase());
      const descMatch = t.description.toLowerCase().includes(lower);
      const keywordMatch = allTechKeywords.has(t.name.toLowerCase());
      const catMatch = t.category.toLowerCase().includes(lower);

      let fitScore = 0;
      if (nameMatch) fitScore += 40;
      if (descMatch) fitScore += 20;
      if (keywordMatch) fitScore += 30;
      if (catMatch) fitScore += 10;

      // Boost by maturity
      if (t.maturityLevel === 'emerging') fitScore += 10;
      if (t.maturityLevel === 'growing') fitScore += 5;

      return { ...t, fitScore: Math.min(100, fitScore) };
    })
    .filter(t => t.fitScore > 0)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 8);

  return scored.map(t => ({
    name: t.name,
    maturity: t.maturityLevel,
    fitScore: t.fitScore,
    reason: t.fitScore >= 60 ? 'Directly addresses core industry problems'
      : t.fitScore >= 30 ? 'Relevant supporting technology'
      : 'Emerging technology with potential applications',
  }));
}

function matchCompanies(keyword: string): RecommendedCompany[] {
  const lower = keyword.toLowerCase();
  const vendors = Object.values(EL_PASO_VENDORS);

  return vendors
    .filter(v => {
      const catMatch = v.category.toLowerCase().includes(lower);
      const descMatch = v.description?.toLowerCase().includes(lower);
      const nameMatch = v.name.toLowerCase().includes(lower);
      return catMatch || descMatch || nameMatch;
    })
    .sort((a, b) => b.ikerScore - a.ikerScore)
    .slice(0, 8)
    .map(v => ({
      name: v.name,
      ikerScore: v.ikerScore,
      category: v.category,
      relevance: v.ikerScore >= 70 ? 'Established player with proven capability'
        : v.ikerScore >= 45 ? 'Growing vendor with emerging solutions'
        : 'Specialized niche provider',
    }));
}

function inferDirection(keyword: string, problemCount: number, techCount: number): string {
  if (problemCount >= 3 && techCount >= 5) {
    return `${keyword} is in a rapid innovation phase with multiple unsolved problems driving technology development. Early movers who adopt emerging solutions will gain significant competitive advantage over the next 2-3 years.`;
  }
  if (problemCount >= 2) {
    return `${keyword} faces significant challenges that are attracting technology investment. The market is transitioning from early adoption to mainstream deployment of key solutions.`;
  }
  return `${keyword} is an evolving space with growing technology interest. Monitor for emerging solutions and potential disruption opportunities.`;
}

// ─── Main API ────────────────────────────────────────────────────────────────

export function getRecommendations(keyword: string): IndustryRecommendation {
  const slug = keyword.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

  const problems = matchProblems(keyword);
  const matchedDefs = PROBLEM_DB.filter(p =>
    p.keywords.some(k => keyword.toLowerCase().split(/[\s-]+/).some(w => k.includes(w) || w.includes(k)))
  );
  const technologies = matchTechnologies(keyword, matchedDefs);
  const companies = matchCompanies(keyword);
  const direction = inferDirection(keyword, problems.length, technologies.length);

  const confidence = Math.min(95, 30 + problems.length * 10 + technologies.length * 5 + companies.length * 3);

  return {
    industry: keyword,
    slug,
    problems,
    technologies,
    companies,
    direction,
    confidence,
  };
}

// ─── Product-based recommendations ────────────────────────────────────────────

export function getProductRecommendations(problemKeyword: string): typeof PRODUCT_CATALOG {
  const lower = problemKeyword.toLowerCase();
  return PRODUCT_CATALOG.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(lower);
    const descMatch = p.description?.toLowerCase().includes(lower);
    const catMatch = p.category?.toLowerCase().includes(lower);
    return nameMatch || descMatch || catMatch;
  }).slice(0, 10);
}
