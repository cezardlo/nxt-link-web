// POST /api/agents/vendor-enrichment — Enrich vendors with website + AI extraction
// GET  /api/agents/vendor-enrichment — Query enriched vendors

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  runVendorEnrichment,
  type VendorEnrichmentOptions,
} from '@/lib/agents/agents/vendor-enrichment-agent';
import {

  getEnrichedVendors,
  getEnrichedVendorById,
  getUnenrichedExhibitorNames,
  upsertEnrichedVendors,
  type EnrichedVendorInsert,
} from '@/db/queries/exhibitors';

export async function POST(req: NextRequest) {
  let body: Partial<VendorEnrichmentOptions> & { enrichUnenriched?: boolean; maxVendors?: number } = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  // If no vendors specified, auto-pick unenriched exhibitors
  let vendors = body.vendors;
  if (!vendors || vendors.length === 0) {
    const names = await getUnenrichedExhibitorNames(body.maxVendors ?? 20);
    vendors = names.map((n) => ({ name: n, conference_source: 'database' }));
  }

  if (vendors.length === 0) {
    return NextResponse.json({
      message: 'No vendors to enrich',
      vendors_processed: 0,
    });
  }

  const report = await runVendorEnrichment({
    vendors,
    maxConcurrent: body.maxConcurrent ?? 3,
    skipKnown: body.skipKnown ?? false,
  });

  // Persist results
  const inserts: EnrichedVendorInsert[] = report.results.map((v) => ({
    id: v.id,
    canonical_name: v.canonical_name,
    official_domain: v.official_domain,
    description: v.description,
    products: v.products,
    technologies: v.technologies,
    industries: v.industries,
    country: v.country,
    vendor_type: v.vendor_type,
    use_cases: v.use_cases,
    employee_estimate: v.employee_estimate,
    conference_sources: v.conference_sources,
    confidence: v.confidence,
  }));

  const persisted = await upsertEnrichedVendors(inserts);

  return NextResponse.json({ ...report, vendors_persisted: persisted });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // Single vendor lookup
  const id = sp.get('id');
  if (id) {
    const vendor = await getEnrichedVendorById(id);
    if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(vendor);
  }

  // List query
  const data = await getEnrichedVendors({
    vendor_type: sp.get('vendor_type') ?? undefined,
    industry: sp.get('industry') ?? undefined,
    technology: sp.get('technology') ?? undefined,
    search: sp.get('search') ?? undefined,
    minConfidence: Number(sp.get('minConfidence')) || undefined,
    limit: Number(sp.get('limit')) || 200,
  });

  return NextResponse.json({ vendors: data, total: data.length });
}
