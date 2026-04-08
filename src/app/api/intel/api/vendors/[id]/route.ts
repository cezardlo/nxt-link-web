export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { computeIndustrialScores } from '@/lib/intelligence/industrial-scoring';
import { getCachedProductScan } from '@/lib/agents/agents/product-scanner-agent';
import type { ProductInfo } from '@/lib/agents/agents/product-scanner-agent';


type RouteContext = { params: Promise<{ id: string }> };

// GET /api/intel/api/vendors/[id]
// Native Vercel replacement for the Python Intel backend vendor detail endpoint.
// Returns VendorDetail matching the shape RightPanel DossierTab expects.
export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-vendor:${ip}`, maxRequests: 60, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { id } = await context.params;
  const vendor = EL_PASO_VENDORS[id];

  if (!vendor) {
    return NextResponse.json(
      { id, name: id, category: 'Unknown', description: 'Vendor record not found.', tags: [], evidence: [] },
      { status: 200 }, // 200 so DossierTab can still render the fallback
    );
  }

  // Product scan — non-blocking: use cache if available, else empty
  let products: ProductInfo[] = [];
  let topCapability = '';
  const productScan = getCachedProductScan();
  if (productScan) {
    const vendorProducts = productScan.vendors.find(v => v.vendorId === id);
    if (vendorProducts) {
      products = vendorProducts.products;
      topCapability = vendorProducts.topCapability;
    }
  }

  // Compute industrial intelligence scores for this vendor
  const scores = computeIndustrialScores({ [vendor.id]: vendor });
  const ind = scores[0];

  // Transform ikerScore (0-100) into the shape IKERPanel expects
  const finalScore = vendor.ikerScore / 100; // 0-1
  const momentumScore = Math.min(1, Math.max(0, vendor.weight + (vendor.confidence - 0.8) * 0.5));
  const momentumState = momentumScore >= 0.75 ? 'ACCELERATING'
    : momentumScore >= 0.5 ? 'EMERGING'
    : momentumScore >= 0.25 ? 'STABLE'
    : 'DECLINING';

  // Derive signal counts from evidence array
  const ev = vendor.evidence.join(' ').toLowerCase();
  const fundingSignals = vendor.evidence.filter((e) => /contract|\$|funding|grant|award/i.test(e)).length;
  const patentSignals = vendor.evidence.filter((e) => /patent|innovation|research|lab/i.test(e)).length;
  const hiringSignals = ev.includes('hiring') || ev.includes('workforce') || ev.includes('jobs') ? 2
    : vendor.weight >= 0.8 ? 1 : 0;

  return NextResponse.json(
    {
      id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      website: vendor.website,
      tags: vendor.tags,
      evidence: vendor.evidence,
      category: vendor.category,
      ikerScore: vendor.ikerScore,
      // IKERPanel-compatible fields
      final_score: finalScore,
      momentum_score: momentumScore,
      state: momentumState,
      signals: { funding: fundingSignals, patents: patentSignals, hiring: hiringSignals },
      briefing: `${vendor.name} scores ${vendor.ikerScore}/100 on the IKER index. ${vendor.description.split('.')[0]}.`,
      // Industrial scoring fields
      growthScore: ind?.growthScore ?? 0,
      automationScore: ind?.automationScore ?? 0,
      opportunityScore: ind?.opportunityScore ?? 0,
      riskScore: ind?.riskScore ?? 0,
      compositeScore: ind?.compositeScore ?? 0,
      grade: ind?.grade ?? 'C',
      industrialSignals: ind?.signals ?? [],
      // Product intelligence fields
      products,
      topCapability,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
