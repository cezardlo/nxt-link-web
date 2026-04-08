// GET /api/signals/[id]
// Returns full detail for a single intel signal by ID.
// Used by the signal detail modal/page.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';


export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database not configured' }, { status: 503 });
  }

  const db = getDb();
  const { data, error } = await db
    .from('intel_signals')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, message: 'Signal not found' }, { status: 404 });
  }

  // Also fetch related signals (same company or industry, last 7 days)
  const signal = data as Record<string, unknown>;
  const { data: related } = await db
    .from('intel_signals')
    .select('id, signal_type, title, company, industry, confidence, discovered_at')
    .neq('id', id)
    .or(`company.eq.${signal.company ?? ''},industry.eq.${signal.industry ?? ''}`)
    .order('discovered_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    ok: true,
    signal,
    related: related ?? [],
  });
}
