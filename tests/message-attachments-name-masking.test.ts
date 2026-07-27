import assert from 'node:assert/strict';
import test from 'node:test';

import { displayAttachmentName } from '@/lib/messages/attachmentsServer';
import { maskContacts } from '@/lib/guard';

// FIX I-2 (security review 2026-07-27): message TEXT is already
// contact-masked pre-acceptance via maskContacts(); a FILE NAME is just as
// much an anti-circumvention leak vector — "call-me-555-123-4567.pdf" dodges
// the exact rule the body text follows. displayAttachmentName() is what
// both messages routes now call for every attachment shown to the
// counterparty (GET thread list AND the POST response echo), keyed by the
// SAME `buyer_decision !== 'accepted'` check already used for text. It is
// DISPLAY-ONLY — the DB row's file_name and the Storage path are untouched.

test('pre-accept: a file name containing a phone number renders masked for the counterparty', () => {
  const name = 'call-me-555-123-4567.pdf';
  const result = displayAttachmentName(name, true);
  assert.equal(result, maskContacts(name).masked);
  assert.ok(!/555-123-4567/.test(result), 'the phone number must not survive in the pre-accept display name');
  assert.ok(result.includes('[hidden until the quote is accepted]'));
});

test('pre-accept: a file name containing an email renders masked', () => {
  const name = 'quote-buyer@example.com.pdf';
  const result = displayAttachmentName(name, true);
  assert.ok(!result.includes('buyer@example.com'), 'the email must not survive in the pre-accept display name');
});

test('post-accept: the SAME phone-number file name renders verbatim (masking lifts after acceptance, same as text)', () => {
  const name = 'call-me-555-123-4567.pdf';
  const result = displayAttachmentName(name, false);
  assert.equal(result, name);
});

test('a file name with no contact info is unchanged either way (no false-positive masking noise)', () => {
  const name = 'forklift-spec-sheet-v2.pdf';
  assert.equal(displayAttachmentName(name, true), name);
  assert.equal(displayAttachmentName(name, false), name);
});
