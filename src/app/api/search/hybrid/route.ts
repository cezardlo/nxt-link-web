export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { hybridSearch, searchCapabilities } from '@/lib/search';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const severity = searchParams.get('severity')?.split(',').filter(Boolean);
  const industries = searchParams.get('industries')?.split(',').filter(Boolean);

  if (!query || query.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const results = await hybridSearch(query, { limit, severity, industries });
    const capabilities = searchCapabilities();

    return NextResponse.json({
      ok: true,
      query,
      results,
      count: results.length,
      capabilities,
    });
  } catch (err) {
    console.error('[hybrid-search] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
