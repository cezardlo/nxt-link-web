export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  TECHNOLOGY_CATALOG,
  Technology,
  TechCategory,
  TechMaturity,
  CATALOG_SUMMARY,
} from '@/lib/data/technology-catalog';


const VALID_MATURITIES: TechMaturity[] = ['emerging', 'growing', 'mature'];
const VALID_RELEVANCE = ['high', 'medium', 'low'] as const;
type RelevanceLevel = typeof VALID_RELEVANCE[number];

// All distinct categories from the catalog
const ALL_CATEGORIES: TechCategory[] = [
  'AI/ML',
  'Cybersecurity',
  'Defense',
  'Border Tech',
  'Manufacturing',
  'Energy',
  'Healthcare',
  'Logistics',
];

// GET /api/discover/technologies?category=AI%2FML&maturity=emerging&relevance=high&limit=50
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `discover-technologies:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');
  const maturityParam = url.searchParams.get('maturity');
  const relevanceParam = url.searchParams.get('relevance');
  const minBudgetParam = url.searchParams.get('minBudget');   // USD millions FY25
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(200, Math.max(1, parseInt(limitParam ?? '50', 10) || 50));

  // Validate maturity
  if (maturityParam && !VALID_MATURITIES.includes(maturityParam as TechMaturity)) {
    return NextResponse.json(
      { ok: false, message: `Invalid maturity. Allowed: ${VALID_MATURITIES.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate relevance
  if (relevanceParam && !VALID_RELEVANCE.includes(relevanceParam as RelevanceLevel)) {
    return NextResponse.json(
      { ok: false, message: `Invalid relevance. Allowed: ${VALID_RELEVANCE.join(', ')}` },
      { status: 400 },
    );
  }

  const minBudget = minBudgetParam !== null ? parseFloat(minBudgetParam) : null;
  if (minBudget !== null && (isNaN(minBudget) || minBudget < 0)) {
    return NextResponse.json(
      { ok: false, message: 'minBudget must be a non-negative number (USD millions).' },
      { status: 400 },
    );
  }

  try {
    let technologies = TECHNOLOGY_CATALOG as Technology[];

    // Category filter (case-insensitive exact match against TechCategory values)
    if (categoryParam) {
      const lower = categoryParam.toLowerCase();
      technologies = technologies.filter(
        (t) => t.category.toLowerCase() === lower,
      );
    }

    // Maturity filter
    if (maturityParam) {
      technologies = technologies.filter(
        (t) => t.maturityLevel === (maturityParam as TechMaturity),
      );
    }

    // El Paso relevance filter
    if (relevanceParam) {
      technologies = technologies.filter(
        (t) => t.elPasoRelevance === (relevanceParam as RelevanceLevel),
      );
    }

    // Minimum government FY25 budget filter
    if (minBudget !== null) {
      technologies = technologies.filter(
        (t) => typeof t.governmentBudgetFY25M === 'number' && t.governmentBudgetFY25M >= minBudget,
      );
    }

    // Sort: by governmentBudgetFY25M descending (undefined last), then name
    technologies = technologies
      .sort((a, b) => {
        const aBudget = a.governmentBudgetFY25M ?? -1;
        const bBudget = b.governmentBudgetFY25M ?? -1;
        if (bBudget !== aBudget) return bBudget - aBudget;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        technologies,
        total: technologies.length,
        categories: ALL_CATEGORIES,
        catalogSummary: CATALOG_SUMMARY,
        filters: {
          category: categoryParam ?? null,
          maturity: maturityParam ?? null,
          relevance: relevanceParam ?? null,
          minBudget: minBudget ?? null,
          limit,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Technology catalog query failed.' },
      { status: 500 },
    );
  }
}
