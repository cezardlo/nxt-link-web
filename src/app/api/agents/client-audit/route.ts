// POST /api/agents/client-audit
// 8 client persona agents scan the USA for intelligence through their buyer lens.
// Body: { persona?: PersonaId, mode: 'scan' | 'sweep' }
// - scan: One persona scans for what matters to them (8-15 intel items)
// - sweep: All 8 personas scan in parallel — full USA intelligence sweep

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  CLIENT_PERSONAS,
  runPersonaScan,
  runFullIntelSweep,
  type PersonaId,
} from '@/lib/agents/agents/client-persona-agent';

export const maxDuration = 120;

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `client-scan:${ip}`, maxRequests: 5, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit: max 5 scans per minute.' }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { persona?: string; mode?: string };
    const mode = body.mode ?? 'sweep';
    const personaId = body.persona as PersonaId | undefined;

    // ── Single Persona Scan ────────────────────────────────────
    if (mode === 'scan') {
      if (!personaId) {
        return NextResponse.json({ ok: false, message: 'Provide persona ID. GET this endpoint for the list.' }, { status: 400 });
      }
      const briefing = await runPersonaScan(personaId);
      return NextResponse.json({ ok: true, mode: 'scan', briefing });
    }

    // ── Full USA Intel Sweep (all 8 personas) ──────────────────
    if (mode === 'sweep') {
      const sweep = await runFullIntelSweep();
      return NextResponse.json({ ok: true, mode: 'sweep', ...sweep });
    }

    return NextResponse.json({ ok: false, message: `Unknown mode: ${mode}. Use scan or sweep.` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Intel scan failed.' },
      { status: 500 },
    );
  }
}

// GET returns persona list + usage
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    description: '8 client persona agents scan the USA for intelligence. Each thinks like a specific buyer — filtering everything through their pain points, budget, and industry.',
    personas: CLIENT_PERSONAS.map((p) => ({
      id: p.id,
      title: p.title,
      company: p.company,
      industry: p.industry,
      urgency: p.urgency,
      budget: p.budget,
      watches_for: p.what_they_search,
      pain_points: p.pain_points,
    })),
    usage: {
      single_scan: 'POST { "mode": "scan", "persona": "ciso" } — one persona scans USA',
      full_sweep: 'POST { "mode": "sweep" } — all 8 personas scan in parallel',
    },
    persona_ids: CLIENT_PERSONAS.map((p) => p.id),
  });
}
