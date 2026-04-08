// src/app/api/agents/products/route.ts
// GET: Query the persistent product catalog with filters
// POST: Force a fresh product discovery scan

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getProducts, getProductStats } from '@/db/queries/products';
import { runProductDiscoveryAgent } from '@/lib/agents/agents/product-discovery-agent';

export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `products-get:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const industry = url.searchParams.get('industry') ?? undefined;
  const category = url.searchParams.get('category') ?? undefined;
  const company = url.searchParams.get('company') ?? undefined;
  const product_type = url.searchParams.get('type') ?? undefined;
  const search = url.searchParams.get('q') ?? undefined;
  const limit = url.searchParams.get('limit')
    ? parseInt(url.searchParams.get('limit')!, 10)
    : 100;

  const [products, stats] = await Promise.all([
    getProducts({ industry, category, company, product_type, search, limit }),
    getProductStats(),
  ]);

  return NextResponse.json({
    ok: true,
    ...stats,
    products,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `products-post:${ip}`,
    maxRequests: 3,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many manual triggers. Max 3 per minute.' },
      { status: 429 },
    );
  }

  try {
    const result = await runProductDiscoveryAgent();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Product discovery failed.',
      },
      { status: 500 },
    );
  }
}
