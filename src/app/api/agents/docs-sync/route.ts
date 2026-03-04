import { NextResponse } from 'next/server';
import { runDocsAgent } from '@/lib/agents/agents/docs-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await runDocsAgent();
    return NextResponse.json({
      ok: true,
      sectionsWritten: result.sectionsWritten,
      provider: result.provider,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
