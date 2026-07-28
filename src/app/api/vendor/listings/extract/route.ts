// POST /api/vendor/listings/extract
//   multipart: kind, file            -> brochure/spec-sheet (PDF/text) draft
//   multipart: kind, images (1-4)    -> product-photo draft (vision)
//   JSON: kind, text                 -> pasted-text draft
// Signed-in vendor: AI-draft a product/service listing from a document,
// product photos, or pasted text. The brochure `file` is stored in
// listing-docs and recorded so it can be attached to the listing on create;
// photos sent for `images` are NOT stored anywhere — they are forwarded to
// the AI provider for this one request and then discarded. Draft-only —
// nothing is published here.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { extractTextFromBytes } from '@/lib/vendor/extract';
import { extractListingDraft, extractListingDraftFromImages } from '@/lib/marketplace/extract';
import { logAiDraft } from '@/lib/assistant/llm';

const BUCKET = 'listing-docs';
const MAX_BYTES = 15 * 1024 * 1024;

// Photo path (product photos -> AI draft). Sized against Vercel's Node
// serverless function request-body limit (~4.5 MB, fixed, not configurable
// on any plan) rather than the listing-media route's 8 MB — that limit is
// for a single already-attached image going to Storage, not a multipart
// request that has to arrive in one piece before our code ever runs. The 4
// MB combined cap keeps the whole multipart body safely under the platform
// ceiling with headroom for boundaries/other fields; the client
// (vendor/listings/page.tsx aiFillImages) also downscales photos and
// pre-checks these same numbers before it ever builds the request.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp'];

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

    // Photo path: 1-4 product photos -> vision draft. Checked first and
    // returns early — a request with `images` never falls through to the
    // brochure/text path below.
    const imageFiles = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
    if (imageFiles.length > 0) {
      if (imageFiles.length > MAX_IMAGES) {
        return NextResponse.json({ ok: false, message: `Use up to ${MAX_IMAGES} photos at a time.` }, { status: 400 });
      }
      let totalBytes = 0;
      for (const img of imageFiles) {
        if (!ALLOWED_IMG.includes(img.type)) {
          return NextResponse.json({ ok: false, message: 'Photos must be PNG, JPEG, or WebP.' }, { status: 400 });
        }
        if (img.size > MAX_IMAGE_BYTES) {
          return NextResponse.json({ ok: false, message: 'Each photo must be 3 MB or smaller.' }, { status: 400 });
        }
        totalBytes += img.size;
      }
      if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
        return NextResponse.json({ ok: false, message: 'These photos are too large together — try fewer or smaller photos.' }, { status: 400 });
      }

      const images = await Promise.all(imageFiles.map(async (img) => ({
        base64: Buffer.from(await img.arrayBuffer()).toString('base64'),
        mimeType: img.type,
      })));

      const { draft, provider } = await extractListingDraftFromImages(kind, images);
      logAiDraft({
        ai_mode: 'brochure_extract',
        prompt_input: `listing:${kind} ${imageFiles.length} photo(s)`,
        draft_output: draft,
        provider,
      }).catch(() => {});

      return NextResponse.json({
        ok: true, is_draft: true, kind, draft: draft.fields, summary: draft.summary,
        document_id: null, source_file: `${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''}`,
      });
    }

    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: 'file or images is required' }, { status: 400 });
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
