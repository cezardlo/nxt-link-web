import assert from 'node:assert/strict';
import test from 'node:test';

import { isVendorFacingRole } from '@/lib/vendor/auth';

// Backend-correctness #4: a signed-in buyer calling /api/vendor/* must not
// auto-create a blank vendor_profiles row. The gate is a pure role check.

test('vendor-facing roles are allowed', () => {
  assert.equal(isVendorFacingRole('vendor'), true);
  assert.equal(isVendorFacingRole('admin'), true);
  assert.equal(isVendorFacingRole('super_admin'), true);
});

test("buyer ('client') role is rejected", () => {
  assert.equal(isVendorFacingRole('client'), false);
});

test('missing or public role is rejected', () => {
  assert.equal(isVendorFacingRole(null), false);
  assert.equal(isVendorFacingRole(undefined), false);
  assert.equal(isVendorFacingRole('public'), false);
});
