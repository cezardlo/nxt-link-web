// Server-only I/O for RFQ request attachments: upload bytes to the shared
// private Storage bucket + mint short-lived signed URLs for read. Shared by
// GET /api/buyer/dashboard, GET /api/vendor/leads, and POST
// /api/buyer/request-attachments so none of them forks a second copy of this
// logic. Mirrors src/lib/messages/attachmentsServer.ts exactly (same
// force-download + pre-accept name-masking discipline), pointed at
// request_attachments/quote_requests instead of message_attachments/messages.

import type { SupabaseClient } from '@supabase/supabase-js';
import { REQUEST_ATTACHMENTS_BUCKET, buildRequestAttachmentStoragePath, contentTypeForFileName, type RequestAttachment } from './attachments';
import { displayAttachmentName } from '@/lib/messages/attachmentsServer';

const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Loads every attachment for the given quote_request ids, each with a fresh
 * signed URL (the bucket is private — no public URL ever exists) and a
 * forced-download filename. `maskNamesFor(quoteRequestId)` mirrors the exact
 * `buyer_decision !== 'accepted'` check the caller already uses for message
 * text/attachment names on the SAME request (anti-circumvention: a file name
 * is just as much a leak vector as a chat message). Omit it (or return
 * false) for a buyer reading their OWN requests — nothing needs masking from
 * the person who uploaded it. Returns a map keyed by quote_request_id so
 * callers can splice attachments onto each request/lead row.
 */
export async function loadRequestAttachments(
  db: SupabaseClient,
  quoteRequestIds: string[],
  opts: { maskNamesFor?: (quoteRequestId: string) => boolean } = {},
): Promise<Record<string, RequestAttachment[]>> {
  if (quoteRequestIds.length === 0) return {};
  const { data, error } = await db
    .from('request_attachments')
    .select('id, quote_request_id, file_name, file_type, size_bytes, storage_path, created_at')
    .in('quote_request_id', quoteRequestIds)
    .order('created_at');
  if (error || !data) return {};

  const out: Record<string, RequestAttachment[]> = {};
  await Promise.all(
    data.map(async (row) => {
      const qrId = row.quote_request_id as string;
      const maskNames = opts.maskNamesFor ? opts.maskNamesFor(qrId) : false;
      // Force a download (never let the browser render a stored file inline
      // from the storage origin) — same FIX I-1(a) as message attachments.
      const displayName = displayAttachmentName(row.file_name as string, maskNames);
      const { data: signed } = await db.storage
        .from(REQUEST_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path as string, SIGNED_URL_TTL_SECONDS, { download: displayName });
      const item: RequestAttachment = {
        id: row.id as string,
        file_name: displayName,
        file_type: (row.file_type as string) || null,
        size_bytes: row.size_bytes as number,
        created_at: row.created_at as string,
        url: signed?.signedUrl || null,
      };
      (out[qrId] ||= []).push(item);
    }),
  );
  return out;
}

export interface RequestAttachmentUploadInput {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export type RequestAttachmentUploadResult =
  | { ok: true; attachment: RequestAttachment }
  | { ok: false; message: string };

/**
 * Uploads ONE file to Storage under request-attachments/<quoteRequestId>/…
 * and records a request_attachments row. The caller (the API route) has
 * already proven the requester OWNS this request before calling this — this
 * function does no auth itself, matching uploadMessageAttachments's split of
 * responsibilities.
 */
export async function uploadRequestAttachment(
  db: SupabaseClient,
  quoteRequestId: string,
  file: RequestAttachmentUploadInput,
): Promise<RequestAttachmentUploadResult> {
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = buildRequestAttachmentStoragePath(quoteRequestId, file.name, uniquePart);
  // Content-Type is derived ONLY from the already-validated extension — never
  // the browser-declared file.type — same I-1(b) rule as message attachments.
  const contentType = contentTypeForFileName(file.name);

  const { error: upErr } = await db.storage
    .from(REQUEST_ATTACHMENTS_BUCKET)
    .upload(path, file.bytes, { contentType, upsert: false });
  if (upErr) return { ok: false, message: upErr.message };

  const { data: row, error: insErr } = await db
    .from('request_attachments')
    .insert({
      quote_request_id: quoteRequestId,
      storage_path: path,
      file_name: file.name,
      file_type: contentType,
      size_bytes: file.bytes.byteLength,
    })
    .select('id, file_name, file_type, size_bytes, created_at')
    .single();
  if (insErr || !row) return { ok: false, message: insErr?.message || 'Could not save attachment' };

  // The uploader is always the owning buyer (proven by the route before this
  // is called) — never masked in the response echoed straight back to them.
  const { data: signed } = await db.storage
    .from(REQUEST_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: row.file_name as string });
  return {
    ok: true,
    attachment: {
      id: row.id as string,
      file_name: row.file_name as string,
      file_type: (row.file_type as string) || null,
      size_bytes: row.size_bytes as number,
      created_at: row.created_at as string,
      url: signed?.signedUrl || null,
    },
  };
}
