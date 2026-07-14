// GET   /api/projects/[id]  — one project + members, shortlist, documents,
//                             tasks, decisions, and the full history timeline.
// PATCH /api/projects/[id]  — update project fields / advance the stage.
// POST  /api/projects/[id]  — add a sub-item { kind: 'vendor'|'task'|'note'|
//                             'document'|'decision' }.
// Every mutation appends a project_events row. Access = owner OR active member.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession, type BuyerSession } from '@/lib/buyer/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

const STAGES = [
  'organizing', 'requirements_ready', 'matching', 'vendors_invited',
  'collecting_quotes', 'comparing', 'decision', 'vendor_selected',
  'implementation', 'completed', 'archived',
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/** Owner or active member may access; returns the project row or null. */
async function authorize(db: SupabaseClient, id: string, session: BuyerSession) {
  const { data: project } = await db.from('projects').select('*').eq('id', id).maybeSingle();
  if (!project) return { project: null, allowed: false };
  if ((project as { owner_auth_id: string }).owner_auth_id === session.authId) return { project, allowed: true };
  const { data: member } = await db.from('project_members').select('id')
    .eq('project_id', id).eq('auth_id', session.authId).eq('status', 'active').maybeSingle();
  return { project, allowed: Boolean(member) };
}

async function logEvent(db: SupabaseClient, id: string, session: BuyerSession, event: string, detail: unknown) {
  await db.from('project_events').insert({
    project_id: id, actor_auth_id: session.authId, actor_name: session.email, event, detail: detail || {},
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  const { project, allowed } = await authorize(db, params.id, session);
  if (!project) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ ok: false, message: 'You do not have access to this project' }, { status: 403 });

  const id = params.id;
  const [members, vendors, documents, tasks, decisions, events] = await Promise.all([
    db.from('project_members').select('id, auth_id, invited_email, display_name, role, status').eq('project_id', id),
    db.from('project_vendors').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    db.from('project_documents').select('id, kind, title, storage_path, external_url, vendor_id, note, created_at').eq('project_id', id).order('created_at', { ascending: false }),
    db.from('project_tasks').select('*').eq('project_id', id).order('sort_order', { ascending: true }),
    db.from('project_decisions').select('*').eq('project_id', id).order('decided_at', { ascending: false }),
    db.from('project_events').select('id, actor_name, event, detail, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(100),
  ]);

  return NextResponse.json({
    ok: true,
    is_owner: (project as { owner_auth_id: string }).owner_auth_id === session.authId,
    project,
    members: members.data || [],
    vendors: vendors.data || [],
    documents: documents.data || [],
    tasks: tasks.data || [],
    decisions: decisions.data || [],
    events: events.data || [],
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const db = getSupabaseClient({ admin: true });
  const { project, allowed } = await authorize(db, params.id, session);
  if (!project) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ ok: false, message: 'No access' }, { status: 403 });

  const patch: Record<string, unknown> = {};
  const str = (k: string, max = 2000) => { if (typeof body[k] === 'string') patch[k] = (body[k] as string).trim().slice(0, max) || null; };
  str('name', 160); str('company_name', 160); str('problem'); str('desired_outcome');
  str('location', 200); str('budget_range', 120); str('timeline', 120); str('next_action', 300);
  if (PRIORITIES.includes(String(body.priority))) patch.priority = String(body.priority);
  if (STAGES.includes(String(body.stage))) patch.stage = String(body.stage);
  if (body.requirements && typeof body.requirements === 'object' && !Array.isArray(body.requirements)) patch.requirements = body.requirements;
  if (Array.isArray(body.comparison_criteria)) patch.comparison_criteria = body.comparison_criteria;
  if (String(body.stage) === 'completed') patch.completed_at = new Date().toISOString();

  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  const { data, error } = await db.from('projects').update(patch).eq('id', params.id).select('*').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const stageChanged = patch.stage && patch.stage !== (project as { stage: string }).stage;
  await logEvent(db, params.id, session, stageChanged ? 'stage_changed' : 'updated',
    stageChanged ? { from: (project as { stage: string }).stage, to: patch.stage } : { fields: Object.keys(patch) });

  return NextResponse.json({ ok: true, project: data });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const db = getSupabaseClient({ admin: true });
  const { project, allowed } = await authorize(db, params.id, session);
  if (!project) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ ok: false, message: 'No access' }, { status: 403 });

  const kind = String(body.kind || '');
  const s = (k: string, max = 500): string | null => (typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim().slice(0, max) : null);
  const id = params.id;

  if (kind === 'vendor') {
    const row = {
      project_id: id,
      vendor_id: s('vendor_id', 60),
      listing_kind: body.listing_kind === 'service' ? 'service' : body.listing_kind === 'product' ? 'product' : null,
      listing_id: s('listing_id', 60),
      source: ['recommended', 'saved', 'invited'].includes(String(body.source)) ? String(body.source) : 'saved',
      status: 'saved',
      fit_note: s('fit_note', 400),
      private_note: s('private_note', 1000),
    };
    const { data, error } = await db.from('project_vendors').insert(row).select('*').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logEvent(db, id, session, 'vendor_saved', { vendor_id: row.vendor_id, listing_id: row.listing_id });
    return NextResponse.json({ ok: true, vendor: data });
  }

  if (kind === 'task') {
    const title = s('title', 200);
    if (!title) return NextResponse.json({ ok: false, message: 'Task title required' }, { status: 400 });
    const row = { project_id: id, title, detail: s('detail', 1000), due_date: s('due_date', 10), stage: s('stage', 60), created_by: session.authId };
    const { data, error } = await db.from('project_tasks').insert(row).select('*').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logEvent(db, id, session, 'task_added', { title });
    return NextResponse.json({ ok: true, task: data });
  }

  if (kind === 'note') {
    const noteBody = s('body', 4000);
    if (!noteBody) return NextResponse.json({ ok: false, message: 'Note body required' }, { status: 400 });
    const row = { project_id: id, author_auth_id: session.authId, author_name: session.email, body: noteBody };
    const { data, error } = await db.from('project_notes').insert(row).select('*').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logEvent(db, id, session, 'note_added', {});
    return NextResponse.json({ ok: true, note: data });
  }

  if (kind === 'decision') {
    const decision = s('decision', 400);
    if (!decision) return NextResponse.json({ ok: false, message: 'Decision required' }, { status: 400 });
    const row = { project_id: id, decision, reason: s('reason', 2000), vendor_id: s('vendor_id', 60), stage: s('stage', 60), decided_by: session.authId };
    const { data, error } = await db.from('project_decisions').insert(row).select('*').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logEvent(db, id, session, 'decision_recorded', { decision });
    return NextResponse.json({ ok: true, decision: data });
  }

  if (kind === 'document') {
    const title = s('title', 200);
    if (!title) return NextResponse.json({ ok: false, message: 'Document title required' }, { status: 400 });
    const DOC_KINDS = ['requirement', 'photo', 'drawing', 'brochure', 'quote', 'contract', 'purchase_order', 'invoice', 'installation', 'training', 'warranty', 'meeting_notes', 'other'];
    const row = {
      project_id: id,
      kind: DOC_KINDS.includes(String(body.doc_kind)) ? String(body.doc_kind) : 'other',
      title,
      storage_path: s('storage_path', 400),
      external_url: s('external_url', 800),
      vendor_id: s('vendor_id', 60),
      uploaded_by: session.authId,
      note: s('note', 1000),
    };
    const { data, error } = await db.from('project_documents').insert(row).select('*').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logEvent(db, id, session, 'document_added', { title, kind: row.kind });
    return NextResponse.json({ ok: true, document: data });
  }

  if (kind === 'task_status') {
    const taskId = s('task_id', 60);
    const status = ['open', 'done', 'skipped'].includes(String(body.status)) ? String(body.status) : null;
    if (!taskId || !status) return NextResponse.json({ ok: false, message: 'task_id and status required' }, { status: 400 });
    const patch: Record<string, unknown> = { status, completed_at: status === 'done' ? new Date().toISOString() : null };
    const { data, error } = await db.from('project_tasks').update(patch).eq('id', taskId).eq('project_id', id).select('*').single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    await logEvent(db, id, session, 'task_' + status, { task_id: taskId });
    return NextResponse.json({ ok: true, task: data });
  }

  return NextResponse.json({ ok: false, message: 'Unknown item kind' }, { status: 400 });
}
