import { runIndustryScan } from '@/lib/intelligence/industry-scan';
import { type SearchIntentMode, saveOpsScanRun, type SourceType } from '@/lib/intelligence/ops-store';

export type NeuralMapNode = {
  id: string;
  label: string;
  kind: 'industry' | 'company' | 'problem' | 'area' | 'country' | 'trend';
  score: number;
};

export type NeuralMapEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  relation: string;
};

export type NeuralTechDirection = {
  theme: string;
  momentum: number;
  rationale: string;
};

export type NeuralMapResult = {
  industry: string;
  region: string;
  scanned_at: string;
  quality_gate_status: 'pass' | 'warning' | 'fail';
  quality_gate_reasons: string[];
  high_quality_sources: number;
  total_sources: number;
  confidence_floor: number;
  directions: NeuralTechDirection[];
  nodes: NeuralMapNode[];
  edges: NeuralMapEdge[];
  citations: Array<{
    id: string;
    title: string;
    url: string;
    source_type: SourceType;
    confidence: number;
    snippet: string;
  }>;
  narrative: string;
};

type BuildInput = {
  industry: string;
  region: string;
  max_sources: number;
  min_confidence: number;
  intent_mode?: SearchIntentMode;
};

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

function normalizeProblem(problem: string): string {
  return problem
    .replace(/\s+/g, ' ')
    .replace(/[.;:]+$/g, '')
    .trim()
    .slice(0, 120);
}

function isReadableLabel(value: string): boolean {
  const label = value.replace(/\s+/g, ' ').trim();
  if (label.length < 3 || label.length > 90) return false;
  if (/^(show:|read full story|sign in|skip to main content)/i.test(label)) return false;
  const letters = label.replace(/[^a-zA-Z]/g, '').length;
  if (letters < 3) return false;
  const punctuationRatio = label.replace(/[a-zA-Z0-9 ]/g, '').length / label.length;
  return punctuationRatio <= 0.14;
}

function topDirections(areas: Array<{ area: string; score: number }>, productsCount: number): NeuralTechDirection[] {
  const maxScore = Math.max(1, ...areas.map((area) => area.score));
  return areas.slice(0, 5).map((area) => {
    const normalized = area.score / maxScore;
    const momentum = Number(Math.min(0.92, 0.34 + normalized * 0.44 + Math.min(0.08, productsCount * 0.01)).toFixed(2));
    return {
      theme: area.area,
      momentum,
      rationale: `${area.area} appears repeatedly in high-confidence source material and product/problem associations.`,
    };
  });
}

function buildNarrative(params: {
  industry: string;
  region: string;
  directions: NeuralTechDirection[];
  qualitySources: number;
  totalSources: number;
  qualityStatus: 'pass' | 'warning' | 'fail';
}): string {
  const topTheme = params.directions[0]?.theme || 'General Industry Technology';
  return `Scanned ${params.qualitySources}/${params.totalSources} high-quality sources for ${params.industry} in ${params.region}. Quality gate: ${params.qualityStatus.toUpperCase()}. The strongest directional signal points to ${topTheme}, with connected company, problem, and geography clusters forming the near-term technology path.`;
}

export async function generateNeuralMindMap(input: BuildInput): Promise<NeuralMapResult> {
  const scan = await runIndustryScan({
    industry: input.industry,
    region: input.region,
    maxSources: input.max_sources,
  });

  const minConfidence = Math.max(0.2, Math.min(0.95, input.min_confidence));
  const qualityProducts = scan.products.filter((product) => product.confidence >= minConfidence);

  const nodes = new Map<string, NeuralMapNode>();
  const edges = new Map<string, NeuralMapEdge>();

  const industryNodeId = `industry:${slug(scan.industry)}`;
  nodes.set(industryNodeId, {
    id: industryNodeId,
    label: scan.industry,
    kind: 'industry',
    score: 1,
  });

  qualityProducts.forEach((product) => {
    if (!isReadableLabel(product.company_name)) return;
    const companyId = `company:${slug(product.company_name)}`;
    nodes.set(companyId, {
      id: companyId,
      label: product.company_name,
      kind: 'company',
      score: product.confidence,
    });

    const companyEdgeId = `${industryNodeId}->${companyId}`;
    edges.set(companyEdgeId, {
      id: companyEdgeId,
      source: industryNodeId,
      target: companyId,
      weight: Number((0.5 + product.confidence * 0.5).toFixed(2)),
      relation: 'industry-company',
    });

    product.industry_areas.slice(0, 2).forEach((area) => {
      if (!isReadableLabel(area)) return;
      const areaId = `area:${slug(area)}`;
      if (!nodes.has(areaId)) {
        nodes.set(areaId, { id: areaId, label: area, kind: 'area', score: 0.65 });
      }
      const edgeId = `${companyId}->${areaId}`;
      edges.set(edgeId, {
        id: edgeId,
        source: companyId,
        target: areaId,
        weight: Number((0.45 + product.confidence * 0.4).toFixed(2)),
        relation: 'company-area',
      });
    });

    product.countries.slice(0, 2).forEach((country) => {
      if (!isReadableLabel(country)) return;
      const countryId = `country:${slug(country)}`;
      if (!nodes.has(countryId)) {
        nodes.set(countryId, { id: countryId, label: country, kind: 'country', score: 0.58 });
      }
      const edgeId = `${companyId}->${countryId}`;
      edges.set(edgeId, {
        id: edgeId,
        source: companyId,
        target: countryId,
        weight: Number((0.35 + product.confidence * 0.3).toFixed(2)),
        relation: 'company-country',
      });
    });

    product.problems_solved.slice(0, 2).forEach((problem) => {
      const normalized = normalizeProblem(problem);
      if (!isReadableLabel(normalized)) return;
      const problemId = `problem:${slug(normalized)}`;
      if (!nodes.has(problemId)) {
        nodes.set(problemId, { id: problemId, label: normalized, kind: 'problem', score: 0.62 });
      }
      const edgeId = `${companyId}->${problemId}`;
      edges.set(edgeId, {
        id: edgeId,
        source: companyId,
        target: problemId,
        weight: Number((0.42 + product.confidence * 0.34).toFixed(2)),
        relation: 'company-problem',
      });
    });
  });

  const directions = topDirections(scan.industry_areas, Math.max(1, qualityProducts.length));
  directions.forEach((direction) => {
    const trendId = `trend:${slug(direction.theme)}`;
    nodes.set(trendId, {
      id: trendId,
      label: direction.theme,
      kind: 'trend',
      score: direction.momentum,
    });
    edges.set(`${industryNodeId}->${trendId}`, {
      id: `${industryNodeId}->${trendId}`,
      source: industryNodeId,
      target: trendId,
      weight: direction.momentum,
      relation: 'industry-trend',
    });
  });

  const citations = qualityProducts
    .filter((product) => isReadableLabel(product.source_title || '') && isReadableLabel(product.product_summary || ''))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 16)
    .map((product, index) => ({
    id: `citation-${index + 1}`,
    title: product.source_title || product.company_name,
    url: product.company_url,
    source_type: product.source_type,
    confidence: product.confidence,
    snippet: product.source_snippet || product.product_summary,
  }));

  const avgConfidence = qualityProducts.length
    ? Number((qualityProducts.reduce((sum, item) => sum + item.confidence, 0) / qualityProducts.length).toFixed(2))
    : 0.25;

  await saveOpsScanRun({
    query: `${input.industry} ${input.region} neural map`,
    industry: input.industry,
    region: input.region,
    intent_mode: input.intent_mode || 'discover',
    source_types: Array.from(new Set(citations.map((item) => item.source_type))),
    avg_confidence: avgConfidence,
    risk_score: Number((1 - avgConfidence).toFixed(2)),
    result_json: JSON.stringify(scan),
    citations_json: JSON.stringify(citations),
  });

  return {
    industry: input.industry,
    region: input.region,
    scanned_at: scan.scanned_at,
    quality_gate_status: scan.quality_gate.status,
    quality_gate_reasons: scan.quality_gate.reasons,
    high_quality_sources: qualityProducts.length,
    total_sources: scan.products.length,
    confidence_floor: minConfidence,
    directions,
    nodes: Array.from(nodes.values()).slice(0, 90),
    edges: Array.from(edges.values()).slice(0, 140),
    citations,
    narrative: buildNarrative({
      industry: input.industry,
      region: input.region,
      directions,
      qualitySources: qualityProducts.length,
      totalSources: scan.products.length,
      qualityStatus: scan.quality_gate.status,
    }),
  };
}
