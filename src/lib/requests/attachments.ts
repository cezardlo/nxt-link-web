// Shared rules for RFQ REQUEST attachments (spec sheets, drawings, POs,
// photos the buyer attaches to a request itself — distinct from a chat
// MESSAGE attachment, src/lib/messages/attachments.ts, though it reuses that
// module's file-type/MIME/sanitization primitives so the allow-list can never
// drift between the two features). Pure TS only — no server-only
// (next/server, supabase-js) or DOM-only imports — safe to import from BOTH
// the API route (server-side validation before touching Storage) and the
// 'use client' upload UI (instant feedback before a network round trip).
//
// Storage: reuses the existing private 'vendor-brochures' Supabase Storage
// bucket (same one message attachments use) under a NEW
// 'request-attachments/<quote_request_id>/' prefix — see
// src/lib/requests/attachmentsServer.ts for the upload/read helpers and
// supabase/migrations/20260730_rfq_attachments_r5.sql for the DB table.
//
// Vercel note: a Serverless Function request body is capped around ~4.5 MB.
// The upload endpoint accepts exactly ONE file per POST (the UI uploads a
// multi-file selection sequentially), and MAX_REQUEST_ATTACHMENT_BYTES is set
// well under that ceiling so a single-file request body always fits — no
// batch-bytes math needed, unlike a multi-file-per-call design would require.

import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  contentTypeForFileName,
  extensionOf,
  formatFileSize,
  isAllowedAttachmentExtension,
  sanitizeFileNameForStorage,
  MESSAGE_ATTACHMENTS_BUCKET,
} from '@/lib/messages/attachments';

export {
  ALLOWED_ATTACHMENT_EXTENSIONS as ALLOWED_REQUEST_ATTACHMENT_EXTENSIONS,
  contentTypeForFileName,
  extensionOf,
  formatFileSize,
  isAllowedAttachmentExtension,
};

export const REQUEST_ATTACHMENTS_BUCKET = MESSAGE_ATTACHMENTS_BUCKET; // 'vendor-brochures' — same private bucket, new prefix below

// 4 MB per file — safely under Vercel's ~4.5 MB Serverless Function body cap
// even with one file per upload call (see the file-level note above).
export const MAX_REQUEST_ATTACHMENT_BYTES = 4 * 1024 * 1024;
// Lifetime cap per request (a request can accumulate files across several
// separate uploads, e.g. one at creation + more later from the dashboard —
// slightly higher than MAX_ATTACHMENTS_PER_MESSAGE=5 since it covers the
// WHOLE request, not one chat message).
export const MAX_REQUEST_ATTACHMENTS_PER_REQUEST = 8;

export type RequestAttachmentErrorCode =
  | 'no_file'
  | 'too_many_files'
  | 'file_empty'
  | 'file_too_large'
  | 'file_type_not_allowed';

export interface RequestAttachmentValidationError {
  code: RequestAttachmentErrorCode;
  /** English detail for logs/fallback display — the UI prefers its own bilingual copy keyed by `code`. */
  message: string;
}

export interface AttachmentCandidate {
  name: string;
  size: number;
}

/** Client-display shape for an uploaded request attachment (server mints a fresh signed `url` on every read — the bucket is private). */
export interface RequestAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  size_bytes: number;
  created_at?: string;
  url: string | null;
}

// quote_requests.id is a Postgres uuid column — belt-and-suspenders check
// (mirrors the identical guard in src/lib/messages/attachments.ts) so a
// malformed id can never end up baked into a Storage path.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds the Storage object path for one request attachment. `uniquePart` must be unique per file (e.g. `${Date.now()}_${random}`) so two files with the same name never collide. Throws if `quoteRequestId` is not a well-formed UUID. */
export function buildRequestAttachmentStoragePath(quoteRequestId: string, fileName: string, uniquePart: string): string {
  if (!UUID_RE.test(quoteRequestId)) {
    throw new Error('buildRequestAttachmentStoragePath: quoteRequestId must be a UUID');
  }
  const safe = sanitizeFileNameForStorage(fileName);
  return `request-attachments/${quoteRequestId}/${uniquePart}_${safe}`;
}

/**
 * Validates ONE candidate file before upload (the endpoint accepts a single
 * file per call — see the file-level Vercel note). `existingCount` is the
 * number of attachments already stored on this request, so the lifetime cap
 * is enforced across multiple separate upload calls, not just one batch.
 */
export function validateRequestAttachment(
  file: AttachmentCandidate,
  existingCount: number,
): { ok: true } | { ok: false; error: RequestAttachmentValidationError } {
  if (!file) {
    return { ok: false, error: { code: 'no_file', message: 'Choose a file.' } };
  }
  if (existingCount >= MAX_REQUEST_ATTACHMENTS_PER_REQUEST) {
    return {
      ok: false,
      error: { code: 'too_many_files', message: `You can attach up to ${MAX_REQUEST_ATTACHMENTS_PER_REQUEST} files per request.` },
    };
  }
  if (!(file.size > 0)) {
    return { ok: false, error: { code: 'file_empty', message: `"${file.name}" is empty.` } };
  }
  if (file.size > MAX_REQUEST_ATTACHMENT_BYTES) {
    return { ok: false, error: { code: 'file_too_large', message: `"${file.name}" is too large — max ${formatFileSize(MAX_REQUEST_ATTACHMENT_BYTES)} per file.` } };
  }
  if (!isAllowedAttachmentExtension(file.name)) {
    return { ok: false, error: { code: 'file_type_not_allowed', message: `"${file.name}" isn't a supported file type.` } };
  }
  return { ok: true };
}
