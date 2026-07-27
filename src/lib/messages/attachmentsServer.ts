// Server-only I/O for message attachments: upload bytes to the shared
// private Storage bucket + mint short-lived signed URLs for read. Shared by
// both src/app/api/buyer/messages/route.ts and .../vendor/messages/route.ts
// so the two symmetric routes never fork a second copy of this logic.

import type { SupabaseClient } from '@supabase/supabase-js';
import { MESSAGE_ATTACHMENTS_BUCKET, buildAttachmentStoragePath, type MessageAttachment } from './attachments';

const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Loads every attachment for the given message ids, each with a fresh
 * signed URL (the bucket is private — no public URL ever exists). Returns a
 * map keyed by message_id so callers can splice attachments onto each
 * message row from the thread GET.
 */
export async function loadMessageAttachments(
  db: SupabaseClient,
  messageIds: string[],
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
      const { data: signed } = await db.storage
        .from(MESSAGE_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path as string, SIGNED_URL_TTL_SECONDS);
      const item: MessageAttachment = {
        id: row.id as string,
        file_name: row.file_name as string,
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
 */
export async function uploadMessageAttachments(
  db: SupabaseClient,
  quoteRequestId: string,
  messageId: string,
  files: AttachmentUploadInput[],
): Promise<AttachmentUploadResult> {
  const attachments: MessageAttachment[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const f = files[i];
    const uniquePart = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
    const path = buildAttachmentStoragePath(quoteRequestId, f.name, uniquePart);

    const { error: upErr } = await db.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .upload(path, f.bytes, { contentType: f.type || 'application/octet-stream', upsert: false });
    if (upErr) return { ok: false, message: upErr.message };

    const { data: row, error: insErr } = await db
      .from('message_attachments')
      .insert({
        message_id: messageId,
        storage_path: path,
        file_name: f.name,
        file_type: f.type || null,
        size_bytes: f.bytes.byteLength,
      })
      .select('id, file_name, file_type, size_bytes, created_at')
      .single();
    if (insErr || !row) return { ok: false, message: insErr?.message || 'Could not save attachment' };

    const { data: signed } = await db.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    attachments.push({
      id: row.id as string,
      file_name: row.file_name as string,
      file_type: (row.file_type as string) || null,
      size_bytes: row.size_bytes as number,
      created_at: row.created_at as string,
      url: signed?.signedUrl || null,
    });
  }
  return { ok: true, attachments };
}
