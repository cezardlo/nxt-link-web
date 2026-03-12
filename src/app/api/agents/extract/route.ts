import { NextResponse } from 'next/server';
import { runEntityExtractionAgent } from '@/lib/agents/agents/entity-extraction-agent';

export const maxDuration = 120;

export async function GET() {
  console.log('[extract] Starting entity extraction...');

  try {
    const result = await runEntityExtractionAgent(10);
    console.log('[extract] Done:', JSON.stringify(result, null, 2));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[extract] FATAL:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
