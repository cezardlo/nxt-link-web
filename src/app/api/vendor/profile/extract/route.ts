// POST /api/vendor/profile/extract  { brochure_id }
// Signed-in vendor: run AI extraction on one of MY uploaded brochures and get
// back a DRAFT profile. Nothing is saved — the vendor reviews the draft in the
// portal and saves via PATCH /api/vendor/profile.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { extractTextFromBytes, extractProfileDraft } from '@/lib/vendor/extract';
import { logAiDraft } from '@/lib/assistant/llm';

const BUCKET = 'vendor-brochures';

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Storage not configured' }, { status: 503 });

  let body: { brochure_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const brochureId = String(body.brochure_id || '');
  if (!brochureId) return NextResponse.json({ ok: false, message: 'brochure_id is required' }, { status: 400 });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  // Own-scoped: the brochure must belong to the caller's vendor row.
  const db = getSupabaseClient({ admin: true });
  const { data: row } = await db.from('vendor_brochures')
    .select('id, file_name, file_type, storage_path')
    .eq('id', brochureId).eq('vendor_id', vendor.id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, message: 'Brochure not found' }, { status: 404 });

  const { data: blob, error: dlErr } = await db.storage.from(BUCKET).download(row.storage_path);
  if (dlErr || !blob) return NextResponse.json({ ok: false, message: 'Could not read the file' }, { status: 500 });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = await extractTextFromBytes(bytes, row.file_type || '', row.file_name || '');
  if (!text || text.trim().length < 40) {
    return NextResponse.json({
      ok: false,
      message: 'No readable text found in this file. PDFs with real text work best; scanned images are not supported yet.',
    }, { status: 422 });
  }

  const { draft, provider } = await extractProfileDraft(text);

  logAiDraft({
    ai_mode: 'brochure_extract',
    prompt_input: `${row.file_name} (${text.length} chars)`,
    draft_output: draft,
    provider,
  }).catch(() => {});

  return NextResponse.json({ ok: true, is_draft: true, draft, source_file: row.file_name });
}
