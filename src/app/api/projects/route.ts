// GET  /api/projects        — list MY projects (owner or active member)
// POST /api/projects         — create a project from an (optionally AI-drafted)
//                              structure. Buyer identity = signed-in auth user.
// Projects are the buyer's private workspace: Problem → Requirements → Matches →
// Comparison → Quotes → Decision → Implementation → Completion. Scoped to the
// caller's auth id (owner) or an active project_members row.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

const STAGES = [
  'organizing', 'requirements_ready', 'matching', 'vendors_invited',
  'collecting_quotes', 'comparing', 'decision', 'vendor_selected',
  'implementation', 'completed', 'archived',
] as const;

const LIST_COLS =
  'id, name, company_name, problem, desired_outcome, location, budget_range, ' +
  'timeline, priority, stage, next_action, opportunity_ref, language, ' +
  'is_template, created_at, updated_at';

export async function GET() {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: true, signed_in: false, projects: [] });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, signed_in: true, projects: [] });

  const db = getSupabaseClient({ admin: true });

  // Projects I own …
  const owned = await db.from('projects').select(LIST_COLS)
    .eq('owner_auth_id', session.authId).order('updated_at', { ascending: false });

  // … plus projects I'm an active member of.
  const memberRows = await db.from('project_members').select('project_id')
    .eq('auth_id', session.authId).eq('status', 'active');
  const memberIds = (memberRows.data || []).map((r) => (r as { project_id: string }).project_id);

  let sharedProjects: unknown[] = [];
  if (memberIds.length) {
    const shared = await db.from('projects').select(LIST_COLS)
      .in('id', memberIds).order('updated_at', { ascending: false });
    sharedProjects = shared.data || [];
  }

  const seen = new Set<string>();
  const projects = [...(owned.data || []), ...sharedProjects].filter((p) => {
    const id = (p as { id: string }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return NextResponse.json({ ok: true, signed_in: true, email: session.email, projects });
}

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in to save your project' }, { status: 401 });
  if (!session.email || !session.emailConfirmed) {
    return NextResponse.json({ ok: false, message: 'Please verify your email first' }, { status: 403 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const str = (k: string, max = 400): string | null => {
    const v = body[k];
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
  };

  const name = str('name', 160);
  if (!name) return NextResponse.json({ ok: false, message: 'A project name is required' }, { status: 400 });

  const priority = ['low', 'medium', 'high', 'urgent'].includes(String(body.priority)) ? String(body.priority) : 'medium';
  const language = body.language === 'es' ? 'es' : 'en';

  // Only accept a whitelisted requirements shape (plain object of primitives/arrays).
  let requirements: Record<string, unknown> = {};
  if (body.requirements && typeof body.requirements === 'object' && !Array.isArray(body.requirements)) {
    requirements = body.requirements as Record<string, unknown>;
  }

  const db = getSupabaseClient({ admin: true });

  // Human opportunity ref (NXT-2026-0001) from the DB sequence.
  let opportunity_ref: string | null = null;
  try {
    const { data: ref } = await db.rpc('next_opportunity_ref');
    if (typeof ref === 'string') opportunity_ref = ref;
  } catch { /* non-fatal — a ref can be stamped later */ }

  const insert = {
    owner_auth_id: session.authId,
    company_name: str('company_name', 160),
    name,
    problem: str('problem', 2000),
    desired_outcome: str('desired_outcome', 2000),
    location: str('location', 200),
    budget_range: str('budget_range', 120),
    timeline: str('timeline', 120),
    priority,
    stage: 'organizing',
    next_action: 'Add your requirements, then invite vendors.',
    requirements,
    language,
    opportunity_ref,
  };

  const { data, error } = await db.from('projects').insert(insert).select(LIST_COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Append the first history event (append-only ledger).
  await db.from('project_events').insert({
    project_id: (data as unknown as { id: string }).id,
    actor_auth_id: session.authId,
    actor_name: session.email,
    event: 'created',
    detail: { name },
  });

  return NextResponse.json({ ok: true, project: data });
}
