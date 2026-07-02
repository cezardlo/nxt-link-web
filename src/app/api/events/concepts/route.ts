// GET    /api/events/concepts?q=&status=          — admin: list event concepts
// GET    /api/events/concepts?templates=1         — admin: the concept templates (no DB)
// POST   /api/events/concepts                     — admin: create a concept
//        (body.template_key prefills missing fields from the matching template)
// PATCH  /api/events/concepts    { id, ...fields } — admin: update a concept
// DELETE /api/events/concepts?id=<uuid>           — admin: delete a concept
// Private admin intelligence (see docs/architecture/event-strategy-platform.md).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, hasSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCurrentUser, isAdminRequest } from '@/lib/assistant/auth';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { eventConceptInput, eventConceptUpdate } from '@/lib/events/validation';
import { EVENT_CONCEPT_TEMPLATES, getTemplate } from '@/lib/events/templates';
import type { EventConceptTemplate } from '@/lib/events/templates';
import type { EventConcept } from '@/lib/events/types';

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
  return !checkRateLimit({ key: 'events:concepts:' + client, maxRequests: 30, windowMs: 60_000 }).allowed;
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

// Concept fields that a template may prefill when absent from a POST body.
const TEMPLATE_PREFILL_FIELDS: readonly (keyof EventConceptTemplate)[] = [
  'audience',
  'theme',
  'speakers',
  'vendors',
  'demos',
  'venue',
  'sponsors',
  'value_statement',
  'anti_sales_safeguards',
  'follow_up_plan',
  'revenue_model',
];

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();

  const sp = new URL(req.url).searchParams;
  if (sp.get('templates') === '1') {
    return NextResponse.json({ ok: true, templates: EVENT_CONCEPT_TEMPLATES });
  }

  if (!supabaseReady()) return notConfigured();
  const q = sp.get('q');
  const status = sp.get('status');

  try {
    const db = getSupabaseClient({ admin: true });
    let query = db
      .from('event_concepts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (status) query = query.eq('status', status);
    if (q) {
      const term = sanitizeSearch(q);
      if (term) query = query.or(`title.ilike.%${term}%,theme.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, items: (data ?? []) as EventConcept[] });
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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return badRequest('Expected a JSON object body');
  }

  // Template prefill: when template_key matches a known template, fill any
  // concept field the caller did not send before validation runs.
  const raw = { ...(body as Record<string, unknown>) };
  if (typeof raw.template_key === 'string') {
    const template = getTemplate(raw.template_key);
    if (template) {
      for (const field of TEMPLATE_PREFILL_FIELDS) {
        if (raw[field] === undefined) raw[field] = template[field];
      }
    }
  }

  const parsed = eventConceptInput.safeParse(raw);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));

  try {
    const db = getSupabaseClient({ admin: true });
    const created_by = (await getCurrentUser())?.authId ?? null;
    const { data, error } = await db
      .from('event_concepts')
      .insert({ ...parsed.data, created_by })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data as EventConcept }, { status: 201 });
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
  const parsed = eventConceptUpdate.safeParse(fields);
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
      .from('event_concepts')
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
    return NextResponse.json({ ok: true, item: data as EventConcept });
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
    const { error } = await db.from('event_concepts').delete().eq('id', idCheck.data);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
