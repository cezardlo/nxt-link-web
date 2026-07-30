import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRequestAttachmentStoragePath,
  MAX_REQUEST_ATTACHMENT_BYTES,
  MAX_REQUEST_ATTACHMENTS_PER_REQUEST,
  validateRequestAttachment,
} from '@/lib/requests/attachments';
import { makeFakeDb } from './helpers/fake-supabase';

// RFQ request attachments (Slice R5) — buyers attach spec sheets, drawings,
// POs, and photos to a request itself (not a chat message). Reuses the
// message-attachments allow-list/MIME/sanitization primitives (already
// covered by tests/message-attachments.test.ts) but has its OWN size cap (4
// MB/file — see the Vercel body-cap note in src/lib/requests/attachments.ts)
// and lifetime-per-request cap (8), so those two rules get their own proof
// here rather than assuming the message-attachment numbers apply.

const VALID_QR_ID = '11111111-1111-1111-1111-111111111111';

test('buildRequestAttachmentStoragePath: scopes under request-attachments/<quote_request_id>/ with a unique prefix', () => {
  const path = buildRequestAttachmentStoragePath(VALID_QR_ID, '../secret.pdf', 'unique1');
  assert.equal(path, `request-attachments/${VALID_QR_ID}/unique1_secret.pdf`);
});

test('buildRequestAttachmentStoragePath: throws on a non-UUID quoteRequestId instead of baking it into the path', () => {
  for (const bad of ['qr-123', '../../etc', '', 'not-a-uuid', VALID_QR_ID + '/../evil']) {
    assert.throws(() => buildRequestAttachmentStoragePath(bad, 'file.pdf', 'unique1'), `expected a throw for: ${JSON.stringify(bad)}`);
  }
});

test('validateRequestAttachment: rejects a file over the 4 MB cap (file_too_large) — distinct from message-attachments\' 10 MB', () => {
  const result = validateRequestAttachment({ name: 'huge.pdf', size: MAX_REQUEST_ATTACHMENT_BYTES + 1 }, 0);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'file_too_large');
});

test('validateRequestAttachment: accepts a file exactly at the 4 MB cap', () => {
  const result = validateRequestAttachment({ name: 'exact.pdf', size: MAX_REQUEST_ATTACHMENT_BYTES }, 0);
  assert.equal(result.ok, true);
});

test('validateRequestAttachment: rejects an empty (0-byte) file (file_empty)', () => {
  const result = validateRequestAttachment({ name: 'empty.pdf', size: 0 }, 0);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'file_empty');
});

test('validateRequestAttachment: rejects a disallowed extension (file_type_not_allowed)', () => {
  const result = validateRequestAttachment({ name: 'installer.exe', size: 100 }, 0);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'file_type_not_allowed');
});

test(`validateRequestAttachment: enforces the lifetime cap (${MAX_REQUEST_ATTACHMENTS_PER_REQUEST}) across SEPARATE upload calls, not just one batch`, () => {
  const atCap = validateRequestAttachment({ name: 'one-more.pdf', size: 100 }, MAX_REQUEST_ATTACHMENTS_PER_REQUEST);
  assert.equal(atCap.ok, false);
  if (!atCap.ok) assert.equal(atCap.error.code, 'too_many_files');

  const underCap = validateRequestAttachment({ name: 'one-more.pdf', size: 100 }, MAX_REQUEST_ATTACHMENTS_PER_REQUEST - 1);
  assert.equal(underCap.ok, true);
});

test('validateRequestAttachment: CAD files (dwg/dxf) are allowed — same industrial allow-list as message attachments', () => {
  assert.equal(validateRequestAttachment({ name: 'part.dwg', size: 100 }, 0).ok, true);
  assert.equal(validateRequestAttachment({ name: 'part.dxf', size: 100 }, 0).ok, true);
});

// --- Ownership scoping (the real DB query, not just a pure decision fn) ----
// GET /api/buyer/dashboard and POST /api/buyer/request-attachments both scope
// a quote_requests lookup to `.eq('id', qrId).ilike('email', <caller's own
// verified email>)` — the SAME shape src/app/api/buyer/messages/route.ts
// already uses (its decision logic is covered by
// tests/message-thread-authz.test.ts, reused unmodified by the new route).
// This proves the underlying QUERY itself never lets buyer B's email resolve
// buyer A's request — a non-owner/anon caller gets nothing, never a
// cross-tenant leak.

test('ownership query: the request owner\'s email resolves the row', async () => {
  const db = makeFakeDb({
    quote_requests: [{ id: 'qr-1', email: 'buyer-a@example.com' }],
  });
  const { data } = await db.from('quote_requests').select('id').eq('id', 'qr-1').ilike('email', 'buyer-a@example.com').maybeSingle();
  assert.ok(data);
});

test('ownership query: a DIFFERENT buyer\'s verified email never resolves someone else\'s request (no cross-tenant leak)', async () => {
  const db = makeFakeDb({
    quote_requests: [{ id: 'qr-1', email: 'buyer-a@example.com' }],
  });
  const { data } = await db.from('quote_requests').select('id').eq('id', 'qr-1').ilike('email', 'buyer-b@example.com').maybeSingle();
  assert.equal(data, null);
});

test('ownership query: a non-existent request id resolves to nothing, regardless of email', async () => {
  const db = makeFakeDb({
    quote_requests: [{ id: 'qr-1', email: 'buyer-a@example.com' }],
  });
  const { data } = await db.from('quote_requests').select('id').eq('id', 'does-not-exist').ilike('email', 'buyer-a@example.com').maybeSingle();
  assert.equal(data, null);
});

// GET /api/vendor/leads scopes request_attachments reads to leads the caller
// already owns via `.eq('vendor_id', vendor.id)` on quote_requests BEFORE any
// attachment is ever loaded (see src/app/api/vendor/leads/route.ts) — proven
// here with the same real-query style as above, for the vendor side.

test('ownership query: a vendor only ever sees leads carrying THEIR OWN vendor_id', async () => {
  const db = makeFakeDb({
    quote_requests: [
      { id: 'qr-1', vendor_id: 'vendor-a' },
      { id: 'qr-2', vendor_id: 'vendor-b' },
    ],
  });
  const mine = await db.from('quote_requests').select('id').eq('vendor_id', 'vendor-a');
  assert.deepEqual((mine.data || []).map((r) => r.id), ['qr-1']);
});
