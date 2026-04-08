import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/products/cleanup
 * Purges low-quality products from the database:
 * - confidence < 0.25
 * - no description AND no company
 * - product_name shorter than 3 chars
 * - duplicate names (keeps highest confidence)
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const db = getDb({ admin: true });
  const removed: Record<string, number> = {};

  // 1. Low confidence
  const { count: lowConf } = await db
    .from('products')
    .delete({ count: 'exact' })
    .lt('confidence', 0.25);
  removed.low_confidence = lowConf ?? 0;

  // 2. No description AND no company (orphaned garbage)
  const { count: orphaned } = await db
    .from('products')
    .delete({ count: 'exact' })
    .is('description', null)
    .is('company', null);
  removed.orphaned = orphaned ?? 0;

  // 3. Short names
  const { data: allProducts } = await db
    .from('products')
    .select('id, product_name');

  if (allProducts) {
    const shortIds = allProducts
      .filter((p: { product_name: string }) => p.product_name.trim().length < 3)
      .map((p: { id: string }) => p.id);

    if (shortIds.length > 0) {
      const { count: shortCount } = await db
        .from('products')
        .delete({ count: 'exact' })
        .in('id', shortIds);
      removed.short_names = shortCount ?? 0;
    }
  }

  // 4. Deduplicate — find products with same normalized name+company, keep highest confidence
  const { data: remaining } = await db
    .from('products')
    .select('id, product_name, company, confidence')
    .order('confidence', { ascending: false });

  if (remaining) {
    const seen = new Map<string, string>();
    const dupeIds: string[] = [];

    for (const row of remaining as Array<{ id: string; product_name: string; company: string | null; confidence: number }>) {
      const key = `${row.product_name.toLowerCase().trim()}::${(row.company ?? '').toLowerCase().trim()}`;
      if (seen.has(key)) {
        dupeIds.push(row.id);
      } else {
        seen.set(key, row.id);
      }
    }

    if (dupeIds.length > 0) {
      // Delete in batches of 100
      for (let i = 0; i < dupeIds.length; i += 100) {
        await db
          .from('products')
          .delete()
          .in('id', dupeIds.slice(i, i + 100));
      }
      removed.duplicates = dupeIds.length;
    }
  }

  const totalRemoved = Object.values(removed).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    cleaned: true,
    total_removed: totalRemoved,
    breakdown: removed,
  });
}
