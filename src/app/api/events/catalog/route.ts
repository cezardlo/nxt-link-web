// GET    /api/events/catalog?q=&kind=&priority=&view=  — admin: list event intelligence catalog
// POST   /api/events/catalog                            — admin: add an event/organization
// PATCH  /api/events/catalog   { id, ...fields }        — admin: update an event/organization
// DELETE /api/events/catalog?id=<uuid>                  — admin: remove an event/organization
// Table: event_organizations (private admin intelligence — see
// docs/architecture/event-strategy-platform.md).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, hasSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCurrentUser, isAdminRequest } from '@/lib/assistant/auth';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { eventOrganizationInput, eventOrganizationUpdate } from '@/lib/events/validation';
import { priorityWeight, rankEvents, type ScoringView } from '@/lib/events/scoring';
import type { EventOrganization } from '@/lib/events/types';

const TABLE = 'event_organizations';
const VIEWS: ScoringView[] = ['customers', 'vendors', 'global_trends', 'cross_border'];
const uuid = z.string().uuid();

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
}

function notConfigured() {
  return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
}

function rateLimited(req: Request): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const rl = checkRateLimit({ key: `events:catalog:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (rl.allowed) return null;
  return NextResponse.json(
    { ok: false, message: 'Too many requests — try again shortly' },
    { status: 429 },
  );
}

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input';
  const path = issue.path.map(String).join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

function dbError(e: unknown): NextResponse {
  return NextResponse.json(
    { ok: false, message: e instanceof Error ? e.message : 'Database error' },
    { status: 500 },
  );
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  if (!isSupabaseConfigured() || !hasSupabaseAdmin()) return notConfigured();

  const sp = new URL(req.url).searchParams;
  const q = sp.get('q')?.trim() || '';
  const kind = sp.get('kind')?.trim() || '';
  const priority = sp.get('priority')?.trim() || '';
  const view = sp.get('view')?.trim() || '';
  if (view && !(VIEWS as string[]).includes(view)) {
    return NextResponse.json(
      { ok: false, message: `view must be one of: ${VIEWS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseClient({ admin: true });
    let query = db.from(TABLE).select('*').order('name', { ascending: true }).limit(1000);
    if (kind) query = query.eq('kind', kind);
    if (priority) query = query.eq('priority', priority);
    if (q) {
      // Strip characters that would break the PostgREST or() filter syntax.
      const like = `%${q.replace(/[%_,()]/g, ' ').trim()}%`;
      query = query.or(`name.ilike.${like},location.ilike.${like},audience.ilike.${like}`);
    }
    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as EventOrganization[];
    const items = view
      ? rankEvents(rows, view as ScoringView)
      : [...rows].sort(
          (a, b) =>
            priorityWeight(b.priority) - priorityWeight(a.priority) || a.name.localeCompare(b.name),
        );
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return dbError(e);
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const blocked = rateLimited(req);
  if (blocked) return blocked;
  if (!isSupabaseConfigured() || !hasSupabaseAdmin()) return notConfigured();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = eventOrganizationInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const created_by = (await getCurrentUser())?.authId ?? null;
    const { data, error } = await db
      .from(TABLE)
      .insert({ ...parsed.data, created_by })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data }, { status: 201 });
  } catch (e) {
    return dbError(e);
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const blocked = rateLimited(req);
  if (blocked) return blocked;
  if (!isSupabaseConfigured() || !hasSupabaseAdmin()) return notConfigured();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON body' }, { status: 400 });
  }
  const { id, ...fields } = (body ?? {}) as Record<string, unknown>;
  if (!uuid.safeParse(id).success) {
    return NextResponse.json({ ok: false, message: 'id must be a valid uuid' }, { status: 400 });
  }
  const parsed = eventOrganizationUpdate.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  if (!Object.keys(parsed.data).length) {
    return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from(TABLE)
      .update(parsed.data)
      .eq('id', id as string)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    return dbError(e);
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const blocked = rateLimited(req);
  if (blocked) return blocked;
  if (!isSupabaseConfigured() || !hasSupabaseAdmin()) return notConfigured();

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!uuid.safeParse(id).success) {
    return NextResponse.json({ ok: false, message: 'id must be a valid uuid' }, { status: 400 });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const { error } = await db.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
