// Server-only I/O for message attachments: upload bytes to the shared
// private Storage bucket + mint short-lived signed URLs for read. Shared by
// both src/app/api/buyer/messages/route.ts and .../vendor/messages/route.ts
// so the two symmetric routes never fork a second copy of this logic.

import type { SupabaseClient } from '@supabase/supabase-js';
import { MESSAGE_ATTACHMENTS_BUCKET, buildAttachmentStoragePath, contentTypeForFileName, type MessageAttachment } from './attachments';
import { maskContacts } from '@/lib/guard';

const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Display name for an attachment (FIX I-2): message TEXT is already
 * contact-masked before the buyer accepts (see maskContacts() in both
 * messages routes) — a FILE NAME is just as much a leak vector ("call-me-
 * 555-123-4567.pdf" dodges the same anti-circumvention rule the body text
 * follows), so it gets the identical treatment. Display-only: the DB row's
 * `file_name` and the Storage `storage_path` are never touched — only the
 * name shown to the caller (and used as the forced-download filename) is
 * masked, mirroring exactly how the routes already decide text masking
 * (`buyer_decision !== 'accepted'`).
 */
export function displayAttachmentName(fileName: string, maskNames: boolean): string {
  return maskNames ? maskContacts(fileName).masked : fileName;
}

/**
 * Loads every attachment for the given message ids, each with a fresh
 * signed URL (the bucket is private — no public URL ever exists).
 * `maskNames` mirrors the thread's own accepted/not-accepted state (pass the
 * SAME `buyer_decision !== 'accepted'` check the caller uses for text).
 * Returns a map keyed by message_id so callers can splice attachments onto
 * each message row from the thread GET.
 */
export async function loadMessageAttachments(
  db: SupabaseClient,
  messageIds: string[],
  opts: { maskNames: boolean },
): Promise<Record<string, MessageAttachment[]>> {
  if (messageIds.length === 0) return {};
  const { data, error } = await db
    .from('message_attachments')
    .select('id, message_id, file_name, file_type, size_bytes, storage_path, created_at')
    .in('message_id', messageIds)
    .order('created_at');
  if (error || !data) return {};

  const out: Record<string, MessageAttachment[]> = {};
  await Promise.all(
    data.map(async (row) => {
      // FIX I-1(a): force a download rather than letting the browser render
      // the file inline from the storage origin (an uploaded .html/.svg-like
      // payload served inline could execute as live content). The download
      // filename is the (possibly masked) display name too, so the save
      // dialog never leaks a filename-borne contact detail either.
      const displayName = displayAttachmentName(row.file_name as string, opts.maskNames);
      const { data: signed } = await db.storage
        .from(MESSAGE_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path as string, SIGNED_URL_TTL_SECONDS, { download: displayName });
      const item: MessageAttachment = {
        id: row.id as string,
        file_name: displayName,
        file_type: (row.file_type as string) || null,
        size_bytes: row.size_bytes as number,
        created_at: row.created_at as string,
        url: signed?.signedUrl || null,
      };
      const mid = row.message_id as string;
      (out[mid] ||= []).push(item);
    }),
  );
  return out;
}

export interface AttachmentUploadInput {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export type AttachmentUploadResult =
  | { ok: true; attachments: MessageAttachment[] }
  | { ok: false; message: string };

/**
 * Uploads each file to Storage under message-attachments/<quoteRequestId>/…
 * and records a message_attachments row per file, linked to the given
 * (already-inserted) message. Stops and reports on the first failure —
 * caller decides how to surface it (the message row itself is already
 * committed by then, so a partial-attachment failure never loses the text).
 * `maskNames` mirrors the thread's `buyer_decision !== 'accepted'` check —
 * same as `loadMessageAttachments`, applied to the POST response echo too.
 */
export async function uploadMessageAttachments(
  db: SupabaseClient,
  quoteRequestId: string,
  messageId: string,
  files: AttachmentUploadInput[],
  opts: { maskNames: boolean },
): Promise<AttachmentUploadResult> {
  const attachments: MessageAttachment[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const f = files[i];
    const uniquePart = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
    const path = buildAttachmentStoragePath(quoteRequestId, f.name, uniquePart);
    // FIX I-1(b): Content-Type is derived ONLY from the already-validated
    // extension — never the browser-declared f.type — so a file can't lie
    // its way into being served as e.g. text/html.
    const contentType = contentTypeForFileName(f.name);

    const { error: upErr } = await db.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .upload(path, f.bytes, { contentType, upsert: false });
    if (upErr) return { ok: false, message: upErr.message };

    const { data: row, error: insErr } = await db
      .from('message_attachments')
      .insert({
        message_id: messageId,
        storage_path: path,
        file_name: f.name,
        file_type: contentType,
        size_bytes: f.bytes.byteLength,
      })
      .select('id, file_name, file_type, size_bytes, created_at')
      .single();
    if (insErr || !row) return { ok: false, message: insErr?.message || 'Could not save attachment' };

    // FIX I-1(a) + I-2: forced download, masked display/download name.
    const displayName = displayAttachmentName(row.file_name as string, opts.maskNames);
    const { data: signed } = await db.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: displayName });
    attachments.push({
      id: row.id as string,
      file_name: displayName,
      file_type: (row.file_type as string) || null,
      size_bytes: row.size_bytes as number,
      created_at: row.created_at as string,
      url: signed?.signedUrl || null,
    });
  }
  return { ok: true, attachments };
}
