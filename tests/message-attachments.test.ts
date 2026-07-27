import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAttachmentStoragePath,
  extensionOf,
  formatFileSize,
  isAllowedAttachmentExtension,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_BYTES,
  sanitizeFileNameForStorage,
  validateAttachmentBatch,
} from '@/lib/messages/attachments';

// Message attachments let buyers/vendors share specs, drawings, and POs on a
// thread (Alibaba/Fiverr-style). These are the size/type/count rejections
// enforced server-side (the client mirrors them for instant feedback) and
// the filename-sanitization rule that keeps a browser-supplied name out of
// the Storage path.

test('extensionOf: lowercases and strips the dot', () => {
  assert.equal(extensionOf('Drawing.DXF'), 'dxf');
  assert.equal(extensionOf('spec.PDF'), 'pdf');
});

test('extensionOf: no extension or trailing dot returns empty', () => {
  assert.equal(extensionOf('README'), '');
  assert.equal(extensionOf('file.'), '');
});

test('isAllowedAttachmentExtension: accepts every type in the allow-list', () => {
  for (const ext of ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'csv', 'dwg', 'dxf']) {
    assert.equal(isAllowedAttachmentExtension(`file.${ext}`), true, ext);
    assert.equal(isAllowedAttachmentExtension(`file.${ext.toUpperCase()}`), true, ext.toUpperCase());
  }
});

test('isAllowedAttachmentExtension: rejects executables and scripts', () => {
  for (const name of ['virus.exe', 'hack.js', 'shell.sh', 'archive.zip', 'page.html', 'noext']) {
    assert.equal(isAllowedAttachmentExtension(name), false, name);
  }
});

test('sanitizeFileNameForStorage: strips path separators (no directory traversal into the bucket)', () => {
  assert.equal(sanitizeFileNameForStorage('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFileNameForStorage('..\\..\\windows\\system32\\evil.pdf'), 'evil.pdf');
});

test('sanitizeFileNameForStorage: strips unsafe characters but keeps a readable name', () => {
  assert.equal(sanitizeFileNameForStorage('spec sheet (v2)!.pdf'), 'spec_sheet__v2__.pdf');
});

test('sanitizeFileNameForStorage: never trusts a leading dot (no hidden-file / empty result)', () => {
  assert.equal(sanitizeFileNameForStorage('.hidden'), '_hidden');
  assert.equal(sanitizeFileNameForStorage(''), 'file');
});

test('sanitizeFileNameForStorage: caps length so a pathological name cannot blow up the storage path', () => {
  const long = `${'a'.repeat(300)}.pdf`;
  const safe = sanitizeFileNameForStorage(long);
  assert.ok(safe.length <= 100);
  assert.ok(safe.endsWith('.pdf'));
});

test('buildAttachmentStoragePath: scopes under message-attachments/<quote_request_id>/ with a unique prefix', () => {
  const path = buildAttachmentStoragePath('qr-123', '../secret.pdf', 'unique1');
  assert.equal(path, 'message-attachments/qr-123/unique1_secret.pdf');
});

test('formatFileSize: renders bytes/KB/MB sensibly', () => {
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5 MB');
});

test('validateAttachmentBatch: rejects an empty batch (no_files)', () => {
  const result = validateAttachmentBatch([]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'no_files');
});

test(`validateAttachmentBatch: rejects more than ${MAX_ATTACHMENTS_PER_MESSAGE} files (too_many_files)`, () => {
  const files = Array.from({ length: MAX_ATTACHMENTS_PER_MESSAGE + 1 }, (_, i) => ({ name: `f${i}.pdf`, size: 100 }));
  const result = validateAttachmentBatch(files);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'too_many_files');
});

test(`validateAttachmentBatch: accepts exactly ${MAX_ATTACHMENTS_PER_MESSAGE} valid files`, () => {
  const files = Array.from({ length: MAX_ATTACHMENTS_PER_MESSAGE }, (_, i) => ({ name: `f${i}.pdf`, size: 100 }));
  const result = validateAttachmentBatch(files);
  assert.equal(result.ok, true);
});

test('validateAttachmentBatch: rejects a file over the 10 MB cap (file_too_large)', () => {
  const result = validateAttachmentBatch([{ name: 'huge.pdf', size: MAX_ATTACHMENT_BYTES + 1 }]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'file_too_large');
});

test('validateAttachmentBatch: accepts a file exactly at the 10 MB cap', () => {
  const result = validateAttachmentBatch([{ name: 'exact.pdf', size: MAX_ATTACHMENT_BYTES }]);
  assert.equal(result.ok, true);
});

test('validateAttachmentBatch: rejects an empty (0-byte) file (file_empty)', () => {
  const result = validateAttachmentBatch([{ name: 'empty.pdf', size: 0 }]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'file_empty');
});

test('validateAttachmentBatch: rejects a disallowed extension (file_type_not_allowed)', () => {
  const result = validateAttachmentBatch([{ name: 'installer.exe', size: 100 }]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'file_type_not_allowed');
});

test('validateAttachmentBatch: CAD files (dwg/dxf) are allowed — common in industrial RFQs', () => {
  assert.equal(validateAttachmentBatch([{ name: 'part.dwg', size: 100 }]).ok, true);
  assert.equal(validateAttachmentBatch([{ name: 'part.dxf', size: 100 }]).ok, true);
});

test('validateAttachmentBatch: the FIRST bad file in a batch is reported', () => {
  const result = validateAttachmentBatch([
    { name: 'good.pdf', size: 100 },
    { name: 'bad.exe', size: 100 },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) { assert.equal(result.error.code, 'file_type_not_allowed'); assert.equal(result.error.fileName, 'bad.exe'); }
});
