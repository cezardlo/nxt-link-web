import assert from 'node:assert/strict';
import test from 'node:test';

import { decideStorefrontPreview } from '@/lib/vendor/authz';

// The public storefront (GET /api/marketplace/vendor/[id]) hides any vendor
// that isn't approved+active from the public — but the "View as a buyer"
// link in the vendor's OWN portal used to dead-end into that same
// "Vendor not found" while the vendor is still pending review. These tests
// cover the fail-closed preview rule: only the OWNING vendor or an admin may
// see a not-yet-live storefront; a signed-in non-owner and an anonymous
// caller must get the identical not_found everyone else gets.
//
// (Called ONLY when the normal public-visibility check has already failed —
// these tests don't re-prove that an approved+active vendor stays public.)

test('admin gets preview of a pending vendor, regardless of ownership', () => {
  assert.equal(
    decideStorefrontPreview({
      isAdmin: true,
      callerAuthId: null,
      vendorId: 'vendor-1',
      vendorAuthId: 'auth-owner',
    }),
    'preview',
  );
});

test('the vendor who OWNS the profile (auth_id match) gets preview', () => {
  assert.equal(
    decideStorefrontPreview({
      isAdmin: false,
      callerAuthId: 'auth-owner',
      vendorId: 'vendor-1',
      vendorAuthId: 'auth-owner',
    }),
    'preview',
  );
});

test('an authenticated NON-owner still gets not_found for a pending vendor', () => {
  assert.equal(
    decideStorefrontPreview({
      isAdmin: false,
      callerAuthId: 'auth-someone-else',
      vendorId: 'vendor-1',
      vendorAuthId: 'auth-owner',
    }),
    'not_found',
  );
});

test('an anonymous caller (no session) gets not_found for a pending vendor', () => {
  assert.equal(
    decideStorefrontPreview({
      isAdmin: false,
      callerAuthId: null,
      vendorId: 'vendor-1',
      vendorAuthId: 'auth-owner',
    }),
    'not_found',
  );
});

test('a vendor row with no auth_id yet (never claimed) can never be "owned" by anyone', () => {
  assert.equal(
    decideStorefrontPreview({
      isAdmin: false,
      callerAuthId: 'auth-someone',
      vendorId: 'vendor-1',
      vendorAuthId: null,
    }),
    'not_found',
  );
});

test('empty-string ids never falsely match each other', () => {
  assert.equal(
    decideStorefrontPreview({
      isAdmin: false,
      callerAuthId: '',
      vendorId: 'vendor-1',
      vendorAuthId: '',
    }),
    'not_found',
  );
});
