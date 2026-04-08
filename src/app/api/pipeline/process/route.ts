// POST /api/pipeline/process
// Accepts a raw signal and runs it through the 5-stage processing pipeline.
// Protected by X-Pipeline-Key header.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { processSignal } from '@/lib/pipeline';
import type { RawSignal } from '@/lib/pipeline';

export const maxDuration = 30; // Allow up to 30s for full pipeline

const PIPELINE_KEY = process.env.PIPELINE_API_KEY;

export async function POST(request: Request) {
  // Auth check
  if (PIPELINE_KEY) {
    const provided = request.headers.get('X-Pipeline-Key');
    if (provided !== PIPELINE_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing X-Pipeline-Key' },
        { status: 401 },
      );
    }
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  // Validate required fields
  const { id, title, summary } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'Missing required field: id (string)' },
      { status: 400 },
    );
  }
  if (!title || typeof title !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'Missing required field: title (string)' },
      { status: 400 },
    );
  }
  if (!summary || typeof summary !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'Missing required field: summary (string)' },
      { status: 400 },
    );
  }

  const raw: RawSignal = {
    id: id as string,
    title: title as string,
    summary: summary as string,
    source: body.source as string | undefined,
    source_url: body.source_url as string | undefined,
    published_at: body.published_at as string | undefined,
    raw_text: body.raw_text as string | undefined,
  };

  try {
    const result = await processSignal(raw);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    console.error('[pipeline:process] Unhandled error:', err);
    return NextResponse.json(
      { ok: false, error: 'Pipeline processing failed' },
      { status: 500 },
    );
  }
}
