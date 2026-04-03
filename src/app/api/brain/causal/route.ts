/**
 * GET /api/brain/causal — List all causal maps
 * POST /api/brain/causal — Add a new causal map
 * PUT /api/brain/causal — Update an existing causal map
 *
 * This is the API for managing the system's "memory" —
 * structured causal maps that come from Obsidian notes.
 */

import { NextResponse } from 'next/server';
import { getAllCausalMaps, addCausalMap, updateCausalMap, type CausalMap } from '@/lib/causal-engine';

export const dynamic = 'force-dynamic';

// GET: List all active causal maps
export async function GET() {
  const maps = await getAllCausalMaps();
  return NextResponse.json({
    ok: true,
    count: maps.length,
    maps,
  });
}

// POST: Add a new causal map
export async function POST(request: Request) {
  const body = await request.json() as Partial<CausalMap>;

  if (!body.problem || !body.event_type || !body.keywords?.length) {
    return NextResponse.json(
      { ok: false, error: 'Required: problem, event_type, keywords[]' },
      { status: 400 },
    );
  }

  const result = await addCausalMap({
    problem: body.problem,
    description: body.description || null,
    event_type: body.event_type,
    causes: body.causes || [],
    effects: body.effects || [],
    solutions: body.solutions || [],
    technologies: body.technologies || [],
    keywords: body.keywords,
    industries: body.industries || [],
    regions: body.regions || [],
    confidence: body.confidence ?? 1.0,
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create causal map' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}

// PUT: Update an existing causal map
export async function PUT(request: Request) {
  const body = await request.json() as { id: string } & Partial<CausalMap>;

  if (!body.id) {
    return NextResponse.json(
      { ok: false, error: 'Required: id' },
      { status: 400 },
    );
  }

  const success = await updateCausalMap(body.id, body);

  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Failed to update causal map' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
