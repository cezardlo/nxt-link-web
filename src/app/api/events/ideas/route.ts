// GET    /api/events/ideas?q=&difficulty=       — admin: list wow ideas
// POST   /api/events/ideas                      — admin: create a wow idea
// PATCH  /api/events/ideas    { id, ...fields } — admin: update a wow idea
// DELETE /api/events/ideas?id=<uuid>            — admin: delete a wow idea
// Private admin intelligence (see docs/architecture/event-strategy-platform.md).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, hasSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCurrentUser, isAdminRequest } from '@/lib/assistant/auth';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { wowIdeaInput, wowIdeaUpdate } from '@/lib/events/validation';
import type { WowIdea } from '@/lib/events/types';

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
  return !checkRateLimit({ key: 'events:ideas:' + client, maxRequests: 30, windowMs: 60_000 }).allowed;
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

/** Strip characters that break PostgREST or()/ilike filter syntax. */
function sanitizeSearch(q: string): string {
  return q.replace(/[%_,()]/g, ' ').trim();
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  if (!supabaseReady()) return notConfigured();

  const sp = new URL(req.url).searchParams;
  const q = sp.get('q');
  const difficulty = sp.get('difficulty');

  try {
    const db = getSupabaseClient({ admin: true });
    let query = db
      .from('wow_ideas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        query = query.or(
          `idea.ilike.%${term}%,where_used.ilike.%${term}%,target_local_company.ilike.%${term}%`,
        );
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, items: (data ?? []) as WowIdea[] });
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
  const parsed = wowIdeaInput.safeParse(body);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));

  try {
    const db = getSupabaseClient({ admin: true });
    const created_by = (await getCurrentUser())?.authId ?? null;
    const { data, error } = await db
      .from('wow_ideas')
      .insert({ ...parsed.data, created_by })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data as WowIdea }, { status: 201 });
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
  const parsed = wowIdeaUpdate.safeParse(fields);
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
      .from('wow_ideas')
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
    return NextResponse.json({ ok: true, item: data as WowIdea });
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
    const { error } = await db.from('wow_ideas').delete().eq('id', idCheck.data);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
