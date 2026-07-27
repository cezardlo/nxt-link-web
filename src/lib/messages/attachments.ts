// Shared rules for buyer<->vendor message attachments (specs, drawings, POs
// — industrial RFQs live and die on being able to attach files, same as
// Alibaba/Fiverr threads). Pure TS only — no server-only (next/server,
// supabase-js) or DOM-only imports — safe to import from BOTH the API
// routes (server-side validation before touching Storage) and the 'use
// client' chat UI (instant feedback before a network round trip).
//
// Storage: reuses the existing private 'vendor-brochures' Supabase Storage
// bucket under a new 'message-attachments/<quote_request_id>/' prefix — see
// src/lib/messages/attachmentsServer.ts for the upload/read helpers and
// supabase/migrations/20260727_message_attachments.sql for the DB table.

export const MESSAGE_ATTACHMENTS_BUCKET = 'vendor-brochures';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

// Industrial RFQs commonly attach spec sheets, photos, drawings, and part
// lists — CAD (dwg/dxf) is common enough in this vertical to allow explicitly.
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'csv', 'dwg', 'dxf',
] as const;

export type AttachmentErrorCode =
  | 'no_files'
  | 'too_many_files'
  | 'file_empty'
  | 'file_too_large'
  | 'file_type_not_allowed';

export interface AttachmentValidationError {
  code: AttachmentErrorCode;
  /** English detail for logs/fallback display — the UI prefers its own bilingual copy keyed by `code`. */
  message: string;
  /** The specific file that failed, when applicable (not set for no_files/too_many_files). */
  fileName?: string;
}

export interface AttachmentCandidate {
  name: string;
  size: number;
}

/** Client-display shape for an uploaded attachment (server mints a fresh signed `url` on every read — the bucket is private). */
export interface MessageAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  size_bytes: number;
  created_at?: string;
  url: string | null;
}

/** Lowercased extension without the dot, or '' if the name has none. */
export function extensionOf(fileName: string): string {
  const name = fileName.trim();
  const dot = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

export function isAllowedAttachmentExtension(fileName: string): boolean {
  const ext = extensionOf(fileName);
  return (ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext);
}

// A browser's declared Content-Type on a file input is caller-supplied and
// not trustworthy (a .pdf can be uploaded declaring image/svg+xml, etc.). We
// never store or upload with it — Content-Type is derived ONLY from the
// already-validated extension via this fixed map, same stricter pattern the
// vendor brochures route uses. dwg/dxf have no universally-registered MIME
// type, so they fall back to a generic binary type (never executed/rendered
// by a browser either way — see FIX I-1 for why that matters).
const ATTACHMENT_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  dwg: 'application/octet-stream',
  dxf: 'application/octet-stream',
};

/** Fixed extension → MIME mapping — NEVER the browser-declared File.type. */
export function contentTypeForFileName(fileName: string): string {
  const ext = extensionOf(fileName);
  return ATTACHMENT_MIME_BY_EXTENSION[ext] || 'application/octet-stream';
}

/**
 * Storage-path-safe slug for a file name. This is for the STORAGE PATH only
 * — the original name is never trusted there (path traversal, separators,
 * control characters). The real original name is kept separately as
 * display-only metadata in `message_attachments.file_name`.
 */
export function sanitizeFileNameForStorage(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() || 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '_');
  return (cleaned || 'file').slice(-100);
}

// quote_requests.id is a Postgres uuid column — this is a defensive,
// belt-and-suspenders check (M-3) so a malformed/unexpected id can never end
// up baked into a Storage path, even though callers are expected to have
// already resolved qrId through an ownership-scoped DB lookup by this point.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds the Storage object path for one message attachment. `uniquePart` must be unique per file within the request (e.g. `${Date.now()}_${index}_${random}`) so two files with the same name in one send never collide. Throws if `quoteRequestId` is not a well-formed UUID. */
export function buildAttachmentStoragePath(quoteRequestId: string, fileName: string, uniquePart: string): string {
  if (!UUID_RE.test(quoteRequestId)) {
    throw new Error('buildAttachmentStoragePath: quoteRequestId must be a UUID');
  }
  const safe = sanitizeFileNameForStorage(fileName);
  return `message-attachments/${quoteRequestId}/${uniquePart}_${safe}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/**
 * Validates a batch of candidate files before upload. Fails closed on the
 * FIRST problem found (count, then each file's size/type) — same limits are
 * re-checked server-side; this lets the client show an instant error too.
 */
export function validateAttachmentBatch(files: AttachmentCandidate[]): { ok: true } | { ok: false; error: AttachmentValidationError } {
  if (files.length === 0) {
    return { ok: false, error: { code: 'no_files', message: 'Choose at least one file.' } };
  }
  if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return {
      ok: false,
      error: { code: 'too_many_files', message: `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.` },
    };
  }
  for (const f of files) {
    if (!(f.size > 0)) {
      return { ok: false, error: { code: 'file_empty', message: `"${f.name}" is empty.`, fileName: f.name } };
    }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: { code: 'file_too_large', message: `"${f.name}" is too large — max 10 MB per file.`, fileName: f.name } };
    }
    if (!isAllowedAttachmentExtension(f.name)) {
      return { ok: false, error: { code: 'file_type_not_allowed', message: `"${f.name}" isn't a supported file type.`, fileName: f.name } };
    }
  }
  return { ok: true };
}
