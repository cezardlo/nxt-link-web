// GET    /api/events/pipeline?stage=&status=&concept_id= — admin: list pipeline items
//        (ordered by pipeline-stage sequence, then created_at)
// POST   /api/events/pipeline                     — admin: create a pipeline item
// PATCH  /api/events/pipeline    { id, ...fields } — admin: update a pipeline item
// DELETE /api/events/pipeline?id=<uuid>           — admin: delete a pipeline item
// Private admin intelligence (see docs/architecture/event-strategy-platform.md).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, hasSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCurrentUser, isAdminRequest } from '@/lib/assistant/auth';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { pipelineItemInput, pipelineItemUpdate } from '@/lib/events/validation';
import type { EventPipelineItem, PipelineStage } from '@/lib/events/types';

const unauthorized = () =>
  NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
const notConfigured = () =>
  NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
const tooManyRequests = () =>
  NextResponse.json({ ok: false, message: 'Too many requests — try again shortly' }, { status: 429 });
const badRequest = (message: string) =>
  NextResponse.json({ ok: false, message }, { status: 400 });

function supabaseReady(): boolean {
  return isSupabaseConfigured() && hasSupabaseAdmin();
}

function rateLimited(req: Request): boolean {
  const forwarded = req.headers.get('x-forwarded-for');
  const client = forwarded?.split(',')[0]?.trim() || 'local';
  return !checkRateLimit({ key: 'events:pipeline:' + client, maxRequests: 30, windowMs: 60_000 }).allowed;
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input';
  const path = issue.path.map((p) => String(p)).join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Unexpected error';
}

const serverError = (e: unknown) =>
  NextResponse.json({ ok: false, message: errorMessage(e) }, { status: 500 });

// Execution order of the pipeline — used to sort GET results by real stage
// sequence (alphabetical 'stage' text order would scramble the board).
const STAGE_SEQUENCE: readonly PipelineStage[] = [
  'research',
  'selection',
  'partner_outreach',
  'invite_building',
  'vendor_recruitment',
  'demo_planning',
  'marketing',
  'execution',
  'follow_up',
  'pilot_conversion',
];

function stageRank(stage: string): number {
  const index = STAGE_SEQUENCE.indexOf(stage as PipelineStage);
  return index === -1 ? STAGE_SEQUENCE.length : index;
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  if (!supabaseReady()) return notConfigured();

  const sp = new URL(req.url).searchParams;
  const stage = sp.get('stage');
  const status = sp.get('status');
  const conceptId = sp.get('concept_id');
  if (conceptId) {
    const check = z.string().uuid().safeParse(conceptId);
    if (!check.success) return badRequest('concept_id: must be a valid uuid');
  }

  try {
    const db = getSupabaseClient({ admin: true });
    let query = db
      .from('event_pipeline_items')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(500);
    if (stage) query = query.eq('stage', stage);
    if (status) query = query.eq('status', status);
    if (conceptId) query = query.eq('concept_id', conceptId);
    const { data, error } = await query;
    if (error) throw error;
    // Stable sort: stage sequence first; created_at (already ascending) within.
    const items = ((data ?? []) as EventPipelineItem[])
      .slice()
      .sort((a, b) => stageRank(a.stage) - stageRank(b.stage));
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  if (rateLimited(req)) return tooManyRequests();
  if (!supabaseReady()) return notConfigured();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = pipelineItemInput.safeParse(body);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));

  try {
    const db = getSupabaseClient({ admin: true });
    const created_by = (await getCurrentUser())?.authId ?? null;
    const { data, error } = await db
      .from('event_pipeline_items')
      .insert({ ...parsed.data, created_by })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data as EventPipelineItem }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  if (rateLimited(req)) return tooManyRequests();
  if (!supabaseReady()) return notConfigured();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const { id, ...fields } = (body ?? {}) as Record<string, unknown>;
  const idCheck = z.string().uuid().safeParse(id);
  if (!idCheck.success) return badRequest('id: must be a valid uuid');
  const parsed = pipelineItemUpdate.safeParse(fields);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));
  // Zod fills .default() fields even on the partial update schema — only
  // forward keys the caller actually sent so PATCH never resets columns.
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key in fields) patch[key] = value;
  }
  if (!Object.keys(patch).length) return badRequest('No fields to update');

  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from('event_pipeline_items')
      .update(patch)
      .eq('id', idCheck.data)
      .select('*')
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json({ ok: true, item: data as EventPipelineItem });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  if (rateLimited(req)) return tooManyRequests();
  if (!supabaseReady()) return notConfigured();

  const idCheck = z.string().uuid().safeParse(new URL(req.url).searchParams.get('id'));
  if (!idCheck.success) return badRequest('id: must be a valid uuid');

  try {
    const db = getSupabaseClient({ admin: true });
    const { error } = await db.from('event_pipeline_items').delete().eq('id', idCheck.data);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
