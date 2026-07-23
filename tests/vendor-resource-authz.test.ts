import assert from 'node:assert/strict';
import test from 'node:test';

import { decideVendorResourceAccess } from '@/lib/vendor/authz';

// The vendors-plural endpoints (e.g. /api/vendors/brochures) take a
// client-supplied vendor_id. The pure decision must fail closed: only an admin
// or the vendor who OWNS that id is allowed; everyone else is refused.

test('admin is allowed for ANY vendor_id (the admin directory case)', () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: true,
      isAuthenticated: false,
      callerVendorId: null,
      requestedVendorId: 'vendor-999',
    }),
    'allow',
  );
});

test('anonymous caller (no admin, no session) is unauthenticated', () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: false,
      isAuthenticated: false,
      callerVendorId: null,
      requestedVendorId: 'vendor-1',
    }),
    'unauthenticated',
  );
});

test('signed-in vendor acting on their OWN vendor_id is allowed', () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: false,
      isAuthenticated: true,
      callerVendorId: 'vendor-1',
      requestedVendorId: 'vendor-1',
    }),
    'allow',
  );
});

test("signed-in vendor acting on SOMEONE ELSE's vendor_id is forbidden", () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: false,
      isAuthenticated: true,
      callerVendorId: 'vendor-1',
      requestedVendorId: 'vendor-2',
    }),
    'forbidden',
  );
});

test('signed-in vendor with no resolvable profile is forbidden (never null-matches)', () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: false,
      isAuthenticated: true,
      callerVendorId: null,
      requestedVendorId: 'vendor-2',
    }),
    'forbidden',
  );
});

test('empty requestedVendorId never matches, even if callerVendorId is also empty', () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: false,
      isAuthenticated: true,
      callerVendorId: '',
      requestedVendorId: '',
    }),
    'forbidden',
  );
});

test('admin flag wins even when authenticated with a mismatched owner id', () => {
  assert.equal(
    decideVendorResourceAccess({
      isAdmin: true,
      isAuthenticated: true,
      callerVendorId: 'vendor-1',
      requestedVendorId: 'vendor-2',
    }),
    'allow',
  );
});
