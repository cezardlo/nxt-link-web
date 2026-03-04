import { prisma } from '@/lib/prisma';
import {
  listOpsScanRuns,
  listOpsSearchFeedbackBoosts,
  type SearchIntentMode,
  type SourceType,
} from '@/lib/intelligence/ops-store';
import { runIndustryScan } from '@/lib/intelligence/industry-scan';
import {
  ONTOLOGY_INDUSTRIES,
  ONTOLOGY_PROBLEM_CATEGORIES,
  ONTOLOGY_SOLUTION_TYPES,
  type OntologyClassification,
} from '@/lib/intelligence/ontology';
import {
  isBlockedSourceDomain,
  isLowTrustDomain,
  sourceDomainCredibility,
  type SourceTrustType,
} from '@/lib/intelligence/source-quality';

type SearchEntityParse = {
  industries: string[];
  countries: string[];
  companies: string[];
  problems: string[];
  source_types: SourceType[];
};

export type HybridCitation = {
  id: string;
  title: string;
  url: string;
  source_type: SourceType;
  snippet: string;
  credibility: number;
  captured_at: string;
};

export type HybridResultItem = {
  id: string;
  entity_type: 'company' | 'product' | 'challenge' | 'vendor' | 'pilot' | 'funding_signal';
  name: string;
  summary: string;
  problems_solved: string[];
  countries: string[];
  source_type: SourceType;
  score: number;
  confidence: number;
  risk_score: number;
  citations: HybridCitation[];
};

export type HybridSearchOutput = {
  query: string;
  intent_mode: SearchIntentMode;
  parsed_entities: SearchEntityParse;
  answer: {
    summary: string;
    claims: Array<{ text: string; citation_ids: string[] }>;
  };
  citations: HybridCitation[];
  results: HybridResultItem[];
  challenges: Array<{ id: string; title: string; city: string }>;
  vendors: Array<{ id: string; name: string; tags: string }>;
  pilots: Array<{ id: string; challengeTitle: string; vendorName: string }>;
};

type ScanSearchProduct = {
  company_name: string;
  company_url: string;
  source_title: string;
  source_type: SourceType;
  source_snippet: string;
  product_summary: string;
  problems_solved: string[];
  industry_areas: string[];
  countries: string[];
  confidence: number;
  classification?: OntologyClassification;
};
type ScanSearchPayload = {
  products: ScanSearchProduct[];
};

const INDUSTRY_TERMS = ONTOLOGY_INDUSTRIES.map((industry) => industry.toLowerCase());

const COUNTRY_TERMS = [
  'united states',
  'canada',
  'mexico',
  'brazil',
  'united kingdom',
  'germany',
  'france',
  'spain',
  'india',
  'china',
  'japan',
  'singapore',
  'australia',
  'saudi arabia',
  'south africa',
] as const;

const PROBLEM_TERMS = ONTOLOGY_PROBLEM_CATEGORIES.map((problem) => problem.toLowerCase());
const SOLUTION_TERMS = ONTOLOGY_SOLUTION_TYPES.map((solution) => solution.toLowerCase());

const SOURCE_FILTER_KEYWORDS: Array<{ keyword: string; source_type: SourceType }> = [
  { keyword: 'whitepaper', source_type: 'whitepaper' },
  { keyword: 'white paper', source_type: 'whitepaper' },
  { keyword: 'case study', source_type: 'case_study' },
  { keyword: 'company', source_type: 'company' },
  { keyword: 'funding', source_type: 'funding' },
  { keyword: 'news', source_type: 'news' },
];

const SEARCH_STOP_TOKENS = new Set([
  'who',
  'what',
  'is',
  'are',
  'in',
  'on',
  'to',
  'for',
  'with',
  'from',
  'and',
  'the',
  'a',
  'an',
  'of',
  'this',
  'that',
  'show',
  'tell',
  'me',
  'solves',
  'solve',
  'solution',
  'solutions',
]);

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1)
    .filter((token) => !SEARCH_STOP_TOKENS.has(token));
}

function uniqueStrings(input: string[]): string[] {
  return Array.from(new Set(input.map((item) => item.trim()).filter(Boolean)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function taxonomyMatchBoost(parsed: SearchEntityParse, classification?: OntologyClassification): number {
  if (!classification) return 0;
  let boost = 0;
  const clsIndustry = normalizeText(classification.industry);
  const clsProblem = normalizeText(classification.problem_category);
  const clsSolution = normalizeText(classification.solution_type);

  if (parsed.industries.some((industry) => clsIndustry.includes(normalizeText(industry)))) {
    boost += 0.08;
  }
  if (parsed.problems.some((problem) => clsProblem.includes(normalizeText(problem)))) {
    boost += 0.06;
  }
  if (parsed.problems.some((problem) => clsSolution.includes(normalizeText(problem)))) {
    boost += 0.04;
  }
  return Number(boost.toFixed(3));
}

function parseEntities(query: string): SearchEntityParse {
  const normalized = normalizeText(query);
  const industries = INDUSTRY_TERMS.filter((term) => normalized.includes(term));
  const countries = COUNTRY_TERMS.filter((term) => normalized.includes(term));
  const problems = [
    ...PROBLEM_TERMS.filter((term) => normalized.includes(term)),
    ...SOLUTION_TERMS.filter((term) => normalized.includes(term)),
  ];
  const source_types = SOURCE_FILTER_KEYWORDS.filter((item) => normalized.includes(item.keyword)).map((item) => item.source_type);

  const companyPatterns = [
    ...Array.from(query.matchAll(/\b([A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9]{2,}){0,3})\b/g)).map((item) => item[1]),
    ...query
      .split(/\bvs\b|\bversus\b|,/i)
      .map((part) => part.trim())
      .filter((part) => /^[A-Za-z0-9\s&.-]{3,60}$/.test(part) && /[A-Z]/.test(part)),
  ];

  return {
    industries: uniqueStrings(industries),
    countries: uniqueStrings(countries),
    companies: uniqueStrings(companyPatterns).slice(0, 5),
    problems: uniqueStrings(problems),
    source_types: uniqueStrings(source_types) as SourceType[],
  };
}

function canonicalEntityName(input: string): string {
  return normalizeText(input)
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|co|company)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lexicalScore(query: string, text: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const normalizedText = normalizeText(text);
  const matches = queryTokens.filter((token) => normalizedText.includes(token));
  return Number((matches.length / queryTokens.length).toFixed(3));
}

function semanticScore(parsed: SearchEntityParse, text: string): number {
  const normalized = normalizeText(text);
  let score = 0;

  score += parsed.industries.filter((item) => normalized.includes(item)).length * 0.18;
  score += parsed.countries.filter((item) => normalized.includes(item)).length * 0.12;
  score += parsed.problems.filter((item) => normalized.includes(item)).length * 0.14;

  const expanded = [
    ['delay', 'bottleneck', 'slow'],
    ['manual', 'automation', 'workflow'],
    ['cost', 'savings', 'roi'],
    ['visibility', 'tracking', 'traceability'],
    ['routing', 'dispatch', 'fleet'],
  ];

  for (const group of expanded) {
    const hits = group.filter((word) => normalized.includes(word));
    if (hits.length >= 2) score += 0.06;
  }

  return Number(Math.min(1, score).toFixed(3));
}

function industryCoverageScore(industries: string[], text: string): number {
  if (industries.length === 0) return 1;
  const normalizedText = normalizeText(text);
  let best = 0;

  for (const industry of industries) {
    const normalizedIndustry = normalizeText(industry);
    if (!normalizedIndustry) continue;
    if (normalizedText.includes(normalizedIndustry)) {
      best = Math.max(best, 1);
      continue;
    }

    const tokens = tokenize(normalizedIndustry).filter((token) => token.length >= 3);
    if (tokens.length === 0) continue;
    const hits = tokens.filter((token) => normalizedText.includes(token)).length;
    const ratio = hits / tokens.length;
    best = Math.max(best, ratio);
  }

  return Number(best.toFixed(3));
}

function sourceCredibility(sourceType: SourceType): number {
  if (sourceType === 'whitepaper') return 0.91;
  if (sourceType === 'case_study') return 0.86;
  if (sourceType === 'funding') return 0.8;
  if (sourceType === 'company') return 0.74;
  if (sourceType === 'news') return 0.7;
  return 0.58;
}

function blendedSourceCredibility(sourceType: SourceType, urlValue: string): number {
  const sourceTypeCred = sourceCredibility(sourceType);
  const domainCred = sourceDomainCredibility(urlValue, sourceType as SourceTrustType);
  return Number((sourceTypeCred * 0.64 + domainCred * 0.36).toFixed(3));
}

function recencyScore(timestamp: string): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const days = ageMs / 86_400_000;
  if (!Number.isFinite(days)) return 0.3;
  if (days < 3) return 1;
  if (days < 14) return 0.78;
  if (days < 45) return 0.58;
  return 0.35;
}

function detectIntentMode(query: string, explicit?: string | null): SearchIntentMode {
  const normalized = normalizeText(query);
  if (explicit === 'discover' || explicit === 'compare' || explicit === 'who-solves' || explicit === 'funding') {
    return explicit;
  }
  if (/\bvs\b|\bversus\b|\bcompare\b/.test(normalized)) return 'compare';
  if (/who\s+solves|solve\s+this|solutions\s+for/.test(normalized)) return 'who-solves';
  if (/funding|series\s+[a-z]|venture|seed/.test(normalized)) return 'funding';
  return 'discover';
}

function filterByIntent(intent: SearchIntentMode, item: HybridResultItem): boolean {
  if (intent === 'funding') return item.entity_type === 'funding_signal' || item.source_type === 'funding';
  if (intent === 'who-solves') return item.problems_solved.length > 0;
  return true;
}

export async function runHybridAdminSearch(input: {
  query: string;
  intent_mode?: string | null;
  source_types?: SourceType[];
  max_results?: number;
}): Promise<HybridSearchOutput> {
  const query = input.query.trim();
  const parsed = parseEntities(query);
  const intent_mode = detectIntentMode(query, input.intent_mode || null);
  const sourceFilter = input.source_types && input.source_types.length > 0
    ? input.source_types
    : parsed.source_types;
  const requiresStrictIndustryCoverage = parsed.industries.some((industry) => tokenize(industry).length >= 2);
  const minIndustryCoverage = requiresStrictIndustryCoverage ? 0.75 : 0.5;

  const [challenges, vendors, pilots, scanRuns, feedbackBoosts] = await Promise.all([
    prisma.challenge.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 60,
      select: { id: true, title: true, description: true, category: true, city: true },
    }),
    prisma.vendor.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 80,
      select: { id: true, name: true, tags: true, email: true, notes: true },
    }),
    prisma.pilot.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        weeklyUpdates: true,
        challenge: { select: { title: true } },
        match: { select: { vendor: { select: { name: true, tags: true } } } },
      },
    }),
    listOpsScanRuns(50),
    listOpsSearchFeedbackBoosts(1200),
  ]);

  const scanItems: HybridResultItem[] = [];
  const citations: HybridCitation[] = [];

  for (const run of scanRuns) {
    const runContext = `${run.query || ''} ${run.industry || ''} ${run.region || ''}`;
    const runContextScore = lexicalScore(query, runContext);
    if (parsed.industries.length > 0 && runContextScore < 0.08) {
      const industryAligned = parsed.industries.some((industry) =>
        normalizeText(run.industry || '').includes(industry),
      );
      if (!industryAligned) {
        continue;
      }
    }

    const runResult = parseJson<ScanSearchPayload | null>(run.result_json, null);
    if (!runResult || !Array.isArray(runResult.products)) continue;

    for (const product of runResult.products) {
      const sourceType = (product.source_type || 'other') as SourceType;
      if (sourceFilter.length > 0 && !sourceFilter.includes(sourceType)) continue;

      const evidenceText = [
        product.company_name || '',
        product.source_title || '',
        product.source_snippet || '',
        product.product_summary || '',
        ...(Array.isArray(product.countries) ? product.countries : []),
      ].join(' ');

      const lex = lexicalScore(query, evidenceText);
      const sem = semanticScore(parsed, evidenceText);
      const industryCoverage = industryCoverageScore(parsed.industries, evidenceText);
      const queryFit = Number((lex * 0.62 + sem * 0.38).toFixed(3));
      const cred = blendedSourceCredibility(sourceType, product.company_url || '');
      const rec = recencyScore(run.created_at);
      const taxonomyBoost = taxonomyMatchBoost(parsed, product.classification);
      const combined = Number(
        (queryFit * (0.55 + cred * 0.45) * (0.75 + rec * 0.25) * (0.62 + industryCoverage * 0.38)).toFixed(3),
      );
      const boostedCombined = Number(clamp(combined + taxonomyBoost, 0, 0.99).toFixed(3));

      if (queryFit < 0.12) continue;
      if (parsed.industries.length > 0 && industryCoverage < minIndustryCoverage) continue;
      if (isBlockedSourceDomain(product.company_url || '')) continue;
      if (isLowTrustDomain(product.company_url || '')) continue;
      if (boostedCombined < 0.17) continue;

      const citationId = `${run.id}:${product.company_name || 'company'}:${sourceType}`;
      const citation: HybridCitation = {
        id: citationId,
        title: product.source_title || product.company_name || 'Source',
        url: product.company_url || '',
        source_type: sourceType,
        snippet: (product.source_snippet || product.product_summary || '').slice(0, 260),
        credibility: cred,
        captured_at: run.created_at,
      };
      citations.push(citation);

      scanItems.push({
        id: `${run.id}-${product.company_name || 'entity'}-${sourceType}`,
        entity_type: sourceType === 'funding' ? 'funding_signal' : 'company',
        name: product.company_name || 'Unknown company',
        summary: product.product_summary || 'No summary available.',
        problems_solved: Array.isArray(product.problems_solved) ? product.problems_solved.slice(0, 3) : [],
        countries: Array.isArray(product.countries) ? product.countries.slice(0, 3) : [],
        source_type: sourceType,
        score: boostedCombined,
        confidence: Number(Math.min(0.99, (Number(product.confidence || boostedCombined) * 0.55 + boostedCombined * 0.45)).toFixed(2)),
        risk_score: Number((1 - Math.min(0.99, boostedCombined)).toFixed(2)),
        citations: [citation],
      });
    }
  }

  if (scanItems.length === 0 && query.length >= 4) {
    try {
      const fallbackIndustry = parsed.industries[0] || query;
      const fallbackRegion = parsed.countries[0] || 'Global';
      const liveScan = await runIndustryScan({
        industry: fallbackIndustry,
        region: fallbackRegion,
        maxSources: 10,
      });

      for (const product of liveScan.products) {
        const sourceType = (product.source_type || 'other') as SourceType;
        if (sourceFilter.length > 0 && !sourceFilter.includes(sourceType)) continue;

        const evidenceText = [
          product.company_name || '',
          product.source_title || '',
          product.source_snippet || '',
          product.product_summary || '',
          ...(Array.isArray(product.countries) ? product.countries : []),
        ].join(' ');

        const lex = lexicalScore(query, evidenceText);
        const sem = semanticScore(parsed, evidenceText);
        const industryCoverage = industryCoverageScore(parsed.industries, evidenceText);
        const queryFit = Number((lex * 0.62 + sem * 0.38).toFixed(3));
        const cred = blendedSourceCredibility(sourceType, product.company_url || '');
        const taxonomyBoost = taxonomyMatchBoost(parsed, product.classification);
        const combined = Number((queryFit * (0.55 + cred * 0.45) * (0.62 + industryCoverage * 0.38)).toFixed(3));
        const boostedCombined = Number(clamp(combined + taxonomyBoost, 0, 0.99).toFixed(3));

        if (queryFit < 0.12) continue;
        if (parsed.industries.length > 0 && industryCoverage < minIndustryCoverage) continue;
        if (isBlockedSourceDomain(product.company_url || '')) continue;
        if (isLowTrustDomain(product.company_url || '')) continue;
        if (boostedCombined < 0.17) continue;

        const citationId = `live:${fallbackIndustry}:${product.company_name || 'company'}:${sourceType}`;
        const citation: HybridCitation = {
          id: citationId,
          title: product.source_title || product.company_name || 'Source',
          url: product.company_url || '',
          source_type: sourceType,
          snippet: (product.source_snippet || product.product_summary || '').slice(0, 260),
          credibility: cred,
          captured_at: new Date().toISOString(),
        };
        citations.push(citation);

        scanItems.push({
          id: `live-${product.company_name || 'entity'}-${sourceType}`,
          entity_type: sourceType === 'funding' ? 'funding_signal' : 'company',
          name: product.company_name || 'Unknown company',
          summary: product.product_summary || 'No summary available.',
          problems_solved: Array.isArray(product.problems_solved) ? product.problems_solved.slice(0, 3) : [],
          countries: Array.isArray(product.countries) ? product.countries.slice(0, 3) : [],
          source_type: sourceType,
          score: boostedCombined,
          confidence: Number(Math.min(0.99, (Number(product.confidence || boostedCombined) * 0.55 + boostedCombined * 0.45)).toFixed(2)),
          risk_score: Number((1 - Math.min(0.99, boostedCombined)).toFixed(2)),
          citations: [citation],
        });
      }
    } catch {
      // Fall back to local datasets only when live scan fails.
    }
  }

  const challengeItems: HybridResultItem[] = challenges.map((challenge) => {
    const text = `${challenge.title} ${challenge.description} ${challenge.category} ${challenge.city}`;
    const score = Number((lexicalScore(query, text) * 0.65 + semanticScore(parsed, text) * 0.35).toFixed(3));
    return {
      id: challenge.id,
      entity_type: 'challenge',
      name: challenge.title,
      summary: challenge.description,
      problems_solved: [challenge.category],
      countries: [challenge.city],
      source_type: 'other',
      score,
      confidence: Number((0.5 + score * 0.4).toFixed(2)),
      risk_score: Number((1 - score).toFixed(2)),
      citations: [],
    };
  });

  const vendorItems: HybridResultItem[] = vendors.map((vendor) => {
    const text = `${vendor.name} ${vendor.tags} ${vendor.notes || ''}`;
    const score = Number((lexicalScore(query, text) * 0.6 + semanticScore(parsed, text) * 0.4).toFixed(3));
    return {
      id: vendor.id,
      entity_type: 'vendor',
      name: vendor.name,
      summary: vendor.tags || vendor.notes || 'Vendor profile',
      problems_solved: vendor.tags ? vendor.tags.split(',').map((item) => item.trim()).slice(0, 3) : [],
      countries: [],
      source_type: 'company',
      score,
      confidence: Number((0.52 + score * 0.36).toFixed(2)),
      risk_score: Number((1 - score).toFixed(2)),
      citations: [],
    };
  });

  const pilotItems: HybridResultItem[] = pilots.map((pilot) => {
    const text = `${pilot.challenge.title} ${pilot.match.vendor.name} ${pilot.match.vendor.tags} ${pilot.weeklyUpdates}`;
    const score = Number((lexicalScore(query, text) * 0.58 + semanticScore(parsed, text) * 0.42).toFixed(3));
    return {
      id: pilot.id,
      entity_type: 'pilot',
      name: `${pilot.challenge.title} x ${pilot.match.vendor.name}`,
      summary: pilot.weeklyUpdates.slice(0, 220),
      problems_solved: pilot.match.vendor.tags ? pilot.match.vendor.tags.split(',').map((item) => item.trim()).slice(0, 3) : [],
      countries: [],
      source_type: 'other',
      score,
      confidence: Number((0.5 + score * 0.33).toFixed(2)),
      risk_score: Number((1 - score).toFixed(2)),
      citations: [],
    };
  });

  const minScoreFloor = intent_mode === 'discover' ? 0.15 : 0.14;
  const all = [...scanItems, ...challengeItems, ...vendorItems, ...pilotItems]
    .filter((item) => filterByIntent(intent_mode, item))
    .filter((item) => item.score >= minScoreFloor)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(6, Math.min(input.max_results || 20, 40)));

  const dedupedMap = new Map<string, HybridResultItem>();
  for (const item of all) {
    const key = `${item.entity_type}:${canonicalEntityName(item.name)}`;
    const current = dedupedMap.get(key);
    if (!current) {
      dedupedMap.set(key, item);
      continue;
    }

    if (item.score > current.score) {
      dedupedMap.set(key, {
        ...item,
        citations: uniqueByCitation([...current.citations, ...item.citations]),
        problems_solved: uniqueStrings([...current.problems_solved, ...item.problems_solved]).slice(0, 4),
      });
    } else {
      current.citations = uniqueByCitation([...current.citations, ...item.citations]);
      current.problems_solved = uniqueStrings([...current.problems_solved, ...item.problems_solved]).slice(0, 4);
    }
  }

  const feedbackBoostMap = new Map(
    feedbackBoosts.map((row) => [canonicalEntityName(row.canonical_name), row.boost]),
  );
  const deduped = Array.from(dedupedMap.values())
    .map((item) => {
      const feedbackBoost = feedbackBoostMap.get(canonicalEntityName(item.name)) || 0;
      const boostedScore = Number(clamp(item.score + feedbackBoost, 0, 0.99).toFixed(3));
      return {
        ...item,
        score: boostedScore,
        confidence: Number(clamp(item.confidence + Math.max(0, feedbackBoost * 0.8), 0, 0.99).toFixed(2)),
        risk_score: Number(clamp(item.risk_score - Math.max(0, feedbackBoost * 0.7), 0.01, 0.99).toFixed(2)),
      };
    })
    .sort((a, b) => b.score - a.score);
  const top = deduped.slice(0, 20);
  const topCitations = uniqueByCitation(citations).slice(0, 40);

  const claims = top.slice(0, 4).map((item) => ({
    text: `${item.name} appears relevant for ${parsed.problems[0] || 'the requested problem domain'} with score ${Math.round(item.score * 100)}%.`,
    citation_ids: item.citations.slice(0, 2).map((citation) => citation.id),
  }));

  const summary =
    top.length === 0
      ? 'No high-confidence matches were found for this query.'
      : `Found ${top.length} ranked matches for ${query}. Highest-confidence entities emphasize ${top[0]?.problems_solved[0] || 'operational problem solving'} across ${uniqueStrings(top.flatMap((item) => item.countries)).slice(0, 3).join(', ') || 'global regions'}.`;

  return {
    query,
    intent_mode,
    parsed_entities: parsed,
    answer: {
      summary,
      claims,
    },
    citations: topCitations,
    results: top,
    challenges: challenges
      .filter((challenge) => lexicalScore(query, `${challenge.title} ${challenge.description} ${challenge.city}`) > 0)
      .slice(0, 8)
      .map((challenge) => ({ id: challenge.id, title: challenge.title, city: challenge.city })),
    vendors: vendors
      .filter((vendor) => lexicalScore(query, `${vendor.name} ${vendor.tags} ${vendor.notes || ''}`) > 0)
      .slice(0, 8)
      .map((vendor) => ({ id: vendor.id, name: vendor.name, tags: vendor.tags })),
    pilots: pilots
      .filter((pilot) => lexicalScore(query, `${pilot.challenge.title} ${pilot.match.vendor.name} ${pilot.weeklyUpdates}`) > 0)
      .slice(0, 8)
      .map((pilot) => ({ id: pilot.id, challengeTitle: pilot.challenge.title, vendorName: pilot.match.vendor.name })),
  };
}

function uniqueByCitation(citations: HybridCitation[]): HybridCitation[] {
  const seen = new Set<string>();
  const rows: HybridCitation[] = [];
  for (const citation of citations) {
    const key = `${citation.url}::${citation.source_type}::${citation.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(citation);
  }
  return rows;
}

function parseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}
