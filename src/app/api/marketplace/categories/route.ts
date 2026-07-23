// GET /api/marketplace/categories — the canonical browse taxonomy for the
// marketplace: functional "departments" (Material Handling, Safety, Services…)
// each with their subcategories, plus the industry list for the facet filter.
// Public, cached. Bilingual labels included so the client can localize.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

// Industries used as the "Shop by Industry" facet (matches listing.industries).
const INDUSTRIES = [
  'Warehousing & 3PL', 'Manufacturing', 'Distribution Centers', 'Food & Beverage',
  'Cold Chain', 'Automotive', 'Aerospace & Defense', 'Pharma & Healthcare',
  'Retail & E-commerce', 'Import / Export & Customs', 'Construction', 'General Industrial',
];

// Display order for the departments (products/equipment/tech first, then services).
const DEPT_ORDER = [
  'material_handling', 'storage_racking', 'packaging_shipping', 'safety_security',
  'automation_robotics', 'warehouse_tech', 'manufacturing_quality', 'facility_mro',
  'svc_maintenance', 'svc_facility', 'svc_transportation', 'svc_staffing',
  'svc_technology', 'svc_training',
];

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, departments: [], industries: INDUSTRIES });
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('categories')
    .select('slug, kind, family, label_en, label_es, functional_group, fg_label_en, fg_label_es, sort_order')
    .eq('active', true);

  const rows = (data as Array<Record<string, unknown>>) || [];
  const byGroup = new Map<string, { fg: string; label_en: string; label_es: string; kind: string; items: Array<Record<string, unknown>> }>();
  for (const r of rows) {
    const fg = (r.functional_group as string) || 'other';
    if (!byGroup.has(fg)) {
      byGroup.set(fg, {
        fg,
        label_en: (r.fg_label_en as string) || fg,
        label_es: (r.fg_label_es as string) || fg,
        kind: r.kind as string,
        items: [],
      });
    }
    byGroup.get(fg)!.items.push({ slug: r.slug, label_en: r.label_en, label_es: r.label_es, family: r.family });
  }

  const departments = [...byGroup.values()]
    .map((g) => ({ ...g, is_service: g.fg.startsWith('svc_'), items: g.items.sort((a, b) => String(a.label_en).localeCompare(String(b.label_en))) }))
    .sort((a, b) => {
      const ia = DEPT_ORDER.indexOf(a.fg); const ib = DEPT_ORDER.indexOf(b.fg);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  return NextResponse.json({ ok: true, departments, industries: INDUSTRIES });
}
