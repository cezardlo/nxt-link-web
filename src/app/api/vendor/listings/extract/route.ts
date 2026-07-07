// POST /api/vendor/listings/extract  (multipart: kind, file)  OR  (JSON: kind, text)
// Signed-in vendor: AI-draft a product/service listing from a document or
// pasted text. The file is stored in listing-docs and recorded so it can be
// attached to the listing on create. Draft-only — nothing is published here.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { extractTextFromBytes } from '@/lib/vendor/extract';
import { extractListingDraft } from '@/lib/marketplace/extract';
import { logAiDraft } from '@/lib/assistant/llm';

const BUCKET = 'listing-docs';
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  let kind: 'product' | 'service' = 'product';
  let text: string | null = null;
  let documentId: string | null = null;
  let sourceName = 'pasted text';

  const ctype = req.headers.get('content-type') || '';
  if (ctype.includes('multipart/form-data')) {
    let form: FormData;
    try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Bad form data' }, { status: 400 }); }
    if (String(form.get('kind')) === 'service') kind = 'service';
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'File exceeds 15 MB' }, { status: 400 });
    sourceName = file.name;

    const bytes = new Uint8Array(await file.arrayBuffer());
    text = await extractTextFromBytes(bytes, file.type || '', file.name);

    // Store the document so it can be attached to the listing on create.
    const db = getSupabaseClient({ admin: true });
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const path = `${vendor.id}/${Date.now()}_${safe}`;
    const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type || 'application/octet-stream' });
    if (!upErr) {
      const { data: doc } = await db.from('listing_documents')
        .insert({ vendor_id: vendor.id, file_name: file.name, file_type: file.type, size_bytes: file.size, storage_path: path, title: file.name, extracted_text_chars: text?.length || 0 })
        .select('id').single();
      documentId = (doc?.id as string) || null;
    }
  } else {
    let body: { kind?: string; text?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
    if (body.kind === 'service') kind = 'service';
    text = String(body.text || '').slice(0, 20000) || null;
  }

  if (!text || text.trim().length < 40) {
    return NextResponse.json({
      ok: false, document_id: documentId,
      message: 'No readable text found. PDFs with real text or pasted text work best; scanned images are not supported yet.',
    }, { status: 422 });
  }

  const { draft, provider } = await extractListingDraft(kind, text);

  if (documentId && draft.summary) {
    const db = getSupabaseClient({ admin: true });
    await db.from('listing_documents').update({ ai_summary: draft.summary }).eq('id', documentId).eq('vendor_id', vendor.id);
  }

  logAiDraft({ ai_mode: 'brochure_extract', prompt_input: `listing:${kind} ${sourceName} (${text.length} chars)`, draft_output: draft, provider }).catch(() => {});

  return NextResponse.json({ ok: true, is_draft: true, kind, draft: draft.fields, summary: draft.summary, document_id: documentId, source_file: sourceName });
}
