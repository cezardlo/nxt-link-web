import { z } from 'zod';

export const ONTOLOGY_INDUSTRIES = [
  'Warehousing',
  'Manufacturing',
  'Energy',
  'Construction',
  'Healthcare',
  'Logistics',
  'Agriculture',
  'Smart Cities',
] as const;

export const ONTOLOGY_PROBLEM_CATEGORIES = [
  'Labor shortage',
  'Inventory inaccuracy',
  'High energy cost',
  'Equipment downtime',
  'Quality defects',
  'Low automation',
  'Manual paperwork',
  'Safety risk',
] as const;

export const ONTOLOGY_SOLUTION_TYPES = [
  'Robotics',
  'AI software',
  'Vision systems',
  'IoT sensors',
  'Workflow automation',
  'Analytics',
  'ERP extensions',
] as const;

export const ONTOLOGY_MATURITY_STAGES = ['Early', 'Growth', 'Enterprise'] as const;

export type OntologyIndustry = (typeof ONTOLOGY_INDUSTRIES)[number];
export type OntologyProblemCategory = (typeof ONTOLOGY_PROBLEM_CATEGORIES)[number];
export type OntologySolutionType = (typeof ONTOLOGY_SOLUTION_TYPES)[number];
export type OntologyMaturityStage = (typeof ONTOLOGY_MATURITY_STAGES)[number];

const INDUSTRY_KEYWORDS: Record<OntologyIndustry, string[]> = {
  Warehousing: ['warehouse', 'fulfillment', 'distribution center', 'pick pack'],
  Manufacturing: ['manufacturing', 'factory', 'production line', 'industrial'],
  Energy: ['energy', 'grid', 'power', 'utility', 'renewable'],
  Construction: ['construction', 'jobsite', 'contractor', 'building'],
  Healthcare: ['healthcare', 'hospital', 'clinical', 'patient'],
  Logistics: ['logistics', 'fleet', 'dispatch', 'route', 'shipment'],
  Agriculture: ['agriculture', 'farm', 'crop', 'agri', 'livestock'],
  'Smart Cities': ['smart city', 'municipal', 'public infrastructure', 'urban systems'],
};

const PROBLEM_KEYWORDS: Record<OntologyProblemCategory, string[]> = {
  'Labor shortage': ['labor shortage', 'staff shortage', 'workforce gap', 'hiring constraints'],
  'Inventory inaccuracy': ['inventory inaccuracy', 'stock mismatch', 'inventory error', 'shrinkage'],
  'High energy cost': ['energy cost', 'power spend', 'high utility bill', 'energy waste'],
  'Equipment downtime': ['downtime', 'outage', 'equipment failure', 'asset reliability'],
  'Quality defects': ['quality defects', 'defect rate', 'quality issues', 'rejects'],
  'Low automation': ['low automation', 'manual process', 'limited automation'],
  'Manual paperwork': ['manual paperwork', 'paper forms', 'manual data entry', 'spreadsheet workflow'],
  'Safety risk': ['safety risk', 'incident risk', 'osha', 'unsafe conditions'],
};

const SOLUTION_KEYWORDS: Record<OntologySolutionType, string[]> = {
  Robotics: ['robotics', 'robot', 'autonomous mobile robot', 'amr', 'cobot'],
  'AI software': ['ai software', 'machine learning', 'llm', 'predictive ai'],
  'Vision systems': ['vision system', 'computer vision', 'image recognition', 'inspection camera'],
  'IoT sensors': ['iot sensor', 'sensor network', 'telematics', 'edge sensor'],
  'Workflow automation': ['workflow automation', 'orchestration', 'automated workflow', 'process automation'],
  Analytics: ['analytics', 'dashboards', 'bi', 'insights'],
  'ERP extensions': ['erp extension', 'sap', 'oracle erp', 'netsuite', 'erp integration'],
};

export const ontologyClassificationSchema = z.object({
  industry: z.union([z.enum(ONTOLOGY_INDUSTRIES), z.literal('Unknown')]),
  problem_category: z.union([z.enum(ONTOLOGY_PROBLEM_CATEGORIES), z.literal('Unknown')]),
  solution_type: z.union([z.enum(ONTOLOGY_SOLUTION_TYPES), z.literal('Unknown')]),
  automation_level: z.number().int().min(1).max(5),
  maturity_stage: z.union([z.enum(ONTOLOGY_MATURITY_STAGES), z.literal('Unknown')]),
  confidence: z.number().min(0).max(1),
  unknown_label_candidate: z.string().nullable(),
});

export type OntologyClassification = z.infer<typeof ontologyClassificationSchema>;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function bestMatch<T extends string>(text: string, dictionary: Record<T, string[]>): {
  label: T | 'Unknown';
  score: number;
} {
  let bestLabel: T | 'Unknown' = 'Unknown';
  let bestScore = 0;
  for (const [label, keywords] of Object.entries(dictionary) as Array<[T, string[]]>) {
    const hits = keywords.reduce((sum, keyword) => {
      return sum + (text.includes(keyword) ? 1 : 0);
    }, 0);
    const score = hits / Math.max(1, keywords.length);
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  }
  return { label: bestLabel, score: Number(bestScore.toFixed(3)) };
}

function inferAutomationLevel(text: string): number {
  const high = ['autonomous', 'fully automated', 'hands-free', 'self-optimizing'];
  const medium = ['automation', 'workflow', 'assistive', 'semi-automated', 'ai'];
  if (high.some((term) => text.includes(term))) return 5;
  if (medium.some((term) => text.includes(term))) return 4;
  if (text.includes('manual')) return 2;
  return 3;
}

function inferMaturity(text: string): OntologyMaturityStage | 'Unknown' {
  if (/(enterprise|fortune 500|global deployment|at scale)/i.test(text)) return 'Enterprise';
  if (/(series b|series c|growth|scaleup|expanding)/i.test(text)) return 'Growth';
  if (/(pilot|beta|prototype|early stage|seed)/i.test(text)) return 'Early';
  return 'Unknown';
}

function buildUnknownLabelCandidate(input: string): string | null {
  const tokens = normalizeText(input)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5)
    .slice(0, 3);
  if (tokens.length < 2) return null;
  return tokens.join(' ');
}

export function classifyOntology(input: string): OntologyClassification {
  const normalized = normalizeText(input);
  const industry = bestMatch(normalized, INDUSTRY_KEYWORDS);
  const problem = bestMatch(normalized, PROBLEM_KEYWORDS);
  const solution = bestMatch(normalized, SOLUTION_KEYWORDS);
  const confidence = Number(
    Math.min(
      0.99,
      Math.max(0.2, industry.score * 0.34 + problem.score * 0.33 + solution.score * 0.33 + 0.15),
    ).toFixed(2),
  );

  const result: OntologyClassification = {
    industry: industry.score >= 0.12 ? industry.label : 'Unknown',
    problem_category: problem.score >= 0.12 ? problem.label : 'Unknown',
    solution_type: solution.score >= 0.12 ? solution.label : 'Unknown',
    automation_level: inferAutomationLevel(normalized),
    maturity_stage: inferMaturity(normalized),
    confidence,
    unknown_label_candidate:
      confidence < 0.7 ? buildUnknownLabelCandidate(input) : null,
  };

  return ontologyClassificationSchema.parse(result);
}
