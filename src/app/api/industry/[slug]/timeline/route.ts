export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { TECHNOLOGY_CATALOG, getIndustryBySlug } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';


// Vendor categories that map to each TechCategory for local vendor counting.
// A vendor's category field is a loose keyword — we check if any entry in the
// set is a case-insensitive substring of (or exact match for) the vendor's category.
const VENDOR_CATEGORY_MAP: Record<string, string[]> = {
  'AI/ML':         ['AI / ML', 'IoT', 'Analytics', 'AI/R&D'],
  'Cybersecurity': ['Cybersecurity'],
  'Defense':       ['Defense', 'Defense IT'],
  'Border Tech':   ['Border Tech'],
  'Manufacturing': ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing', 'Robotics & Automation', 'Warehouse Automation'],
  'Energy':        ['Energy', 'Water Tech', 'Energy Tech'],
  'Healthcare':    ['Health Tech', 'Healthcare'],
  'Logistics':     ['Logistics', 'Warehousing', 'Trucking', 'Supply Chain Software'],
};

/** Count vendors whose category loosely matches one of the allowed category strings. */
function countLocalVendors(techCategory: string): number {
  const allowed = VENDOR_CATEGORY_MAP[techCategory] ?? [];
  if (allowed.length === 0) return 0;

  const allowedLower = allowed.map((s) => s.toLowerCase());

  return Object.values(EL_PASO_VENDORS).filter((vendor) => {
    const vendorCatLower = vendor.category.toLowerCase();
    return allowedLower.some(
      (match) => vendorCatLower === match || vendorCatLower.includes(match) || match.includes(vendorCatLower),
    );
  }).length;
}

type RouteContext = { params: Promise<{ slug: string }> };

// GET /api/industry/[slug]/timeline
// Returns all technologies in the catalog for the given industry slug,
// augmented with a localVendorCount field derived from EL_PASO_VENDORS.
export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industry-timeline:${ip}`, maxRequests: 60, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { slug } = await context.params;
  const industry = getIndustryBySlug(slug);

  if (!industry) {
    return NextResponse.json({ ok: false, error: 'Unknown industry' }, { status: 404 });
  }

  const localVendorCount = countLocalVendors(industry.category);

  const technologies = TECHNOLOGY_CATALOG
    .filter((tech) => tech.category === industry.category)
    .map((tech) => ({ ...tech, localVendorCount }));

  const data = {
    industry: {
      slug: industry.slug,
      label: industry.label,
      color: industry.color,
    },
    technologies,
  };

  return NextResponse.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } });
}
