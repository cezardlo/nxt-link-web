import { NextRequest, NextResponse } from 'next/server';
import { getAllMarketplaceProductsWithVendors } from '@/lib/data/marketplace-adapter';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const all = await getAllMarketplaceProductsWithVendors();
  const product = all.find((p) => p.id === id);

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Resolve alternatives to full objects
  const alternatives = product.alternatives
    .map((altId) => all.find((p) => p.id === altId))
    .filter(Boolean);

  return NextResponse.json({ product, alternatives });
}
