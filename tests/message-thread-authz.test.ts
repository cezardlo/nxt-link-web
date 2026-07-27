import assert from 'node:assert/strict';
import test from 'node:test';

import { decideBuyerThreadAccess, decideVendorThreadAccess } from '@/lib/messages/authz';

// Message threads (text AND the new file attachments) are scoped to the two
// parties of a quote_requests opportunity: the buyer who owns it (by
// verified email) and the vendor it was assigned to. These pure decisions
// mirror the exact inline checks the buyer/vendor messages routes used to
// run inline (same order, same fail-closed status per case) — extracted so
// the "only the two thread parties may read/write this thread" rule can be
// exercised without a database, session cookies, or a running server.

test('buyer: signed out is unauthenticated', () => {
  assert.equal(
    decideBuyerThreadAccess({ hasSession: false, emailConfirmed: false, configured: true, ownsRequest: false }),
    'unauthenticated',
  );
});

test('buyer: signed in but email not verified is email_unverified (even if they own the request)', () => {
  assert.equal(
    decideBuyerThreadAccess({ hasSession: true, emailConfirmed: false, configured: true, ownsRequest: true }),
    'email_unverified',
  );
});

test('buyer: Supabase not configured fails closed as not_configured', () => {
  assert.equal(
    decideBuyerThreadAccess({ hasSession: true, emailConfirmed: true, configured: false, ownsRequest: true }),
    'not_configured',
  );
});

test('buyer: NON-PARTY rejection — verified buyer who does not own this quote_request_id is not_found', () => {
  assert.equal(
    decideBuyerThreadAccess({ hasSession: true, emailConfirmed: true, configured: true, ownsRequest: false }),
    'not_found',
  );
});

test('buyer: the owning, verified buyer is allowed', () => {
  assert.equal(
    decideBuyerThreadAccess({ hasSession: true, emailConfirmed: true, configured: true, ownsRequest: true }),
    'allow',
  );
});

test('vendor: signed out is unauthenticated', () => {
  assert.equal(
    decideVendorThreadAccess({ hasSession: false, configured: true, vendorResolved: false, ownsRequest: false }),
    'unauthenticated',
  );
});

test('vendor: Supabase not configured fails closed as not_configured', () => {
  assert.equal(
    decideVendorThreadAccess({ hasSession: true, configured: false, vendorResolved: true, ownsRequest: true }),
    'not_configured',
  );
});

test('vendor: signed in with no resolvable vendor_profiles row is profile_not_found', () => {
  assert.equal(
    decideVendorThreadAccess({ hasSession: true, configured: true, vendorResolved: false, ownsRequest: false }),
    'profile_not_found',
  );
});

test('vendor: NON-PARTY rejection — a real vendor who is NOT the assigned vendor on this lead is lead_not_found', () => {
  assert.equal(
    decideVendorThreadAccess({ hasSession: true, configured: true, vendorResolved: true, ownsRequest: false }),
    'lead_not_found',
  );
});

test('vendor: the assigned vendor is allowed', () => {
  assert.equal(
    decideVendorThreadAccess({ hasSession: true, configured: true, vendorResolved: true, ownsRequest: true }),
    'allow',
  );
});
