import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isConfirmationValid,
  isSelfDeleteBlocked,
  deletedEmail,
  buyerThreadAnonymization,
  vendorProfileAnonymization,
  manualDealVendorAnonymization,
  vendorInviteAnonymization,
  DISPOSITION,
  DELETED_DISPLAY,
  DELETED_VENDOR_DISPLAY,
  DELETED_FINANCIAL,
} from '@/lib/account/deletion-rules';

// --- Confirmation validation -------------------------------------------------

test('isConfirmationValid accepts DELETE / ELIMINAR, case-insensitive + trimmed', () => {
  assert.equal(isConfirmationValid('DELETE'), true);
  assert.equal(isConfirmationValid('ELIMINAR'), true);
  assert.equal(isConfirmationValid('delete'), true);
  assert.equal(isConfirmationValid('  Eliminar  '), true);
});

test('isConfirmationValid rejects anything else', () => {
  assert.equal(isConfirmationValid('DELET'), false);
  assert.equal(isConfirmationValid('DELETE ACCOUNT'), false);
  assert.equal(isConfirmationValid('borrar'), false);
  assert.equal(isConfirmationValid(''), false);
  assert.equal(isConfirmationValid('   '), false);
  assert.equal(isConfirmationValid(undefined), false);
  assert.equal(isConfirmationValid(null), false);
  assert.equal(isConfirmationValid(123 as unknown), false);
});

// --- Admin self-delete block -------------------------------------------------

test('isSelfDeleteBlocked blocks admin + super_admin roles', () => {
  assert.equal(isSelfDeleteBlocked({ role: 'admin', email: 'a@b.com', adminEmailsRaw: '' }), true);
  assert.equal(isSelfDeleteBlocked({ role: 'super_admin', email: 'a@b.com', adminEmailsRaw: '' }), true);
  assert.equal(isSelfDeleteBlocked({ role: 'ADMIN', email: 'a@b.com', adminEmailsRaw: '' }), true);
});

test('isSelfDeleteBlocked blocks the ADMIN_EMAILS allowlist regardless of DB role', () => {
  assert.equal(
    isSelfDeleteBlocked({ role: 'client', email: 'owner@nxt.com', adminEmailsRaw: 'owner@nxt.com' }),
    true,
  );
  assert.equal(
    isSelfDeleteBlocked({ role: 'vendor', email: 'Owner@NXT.com', adminEmailsRaw: 'a@x.com, owner@nxt.com' }),
    true,
  );
});

test('isSelfDeleteBlocked allows ordinary buyers + vendors', () => {
  assert.equal(isSelfDeleteBlocked({ role: 'client', email: 'buyer@co.com', adminEmailsRaw: 'owner@nxt.com' }), false);
  assert.equal(isSelfDeleteBlocked({ role: 'vendor', email: 'vendor@co.com', adminEmailsRaw: '' }), false);
  assert.equal(isSelfDeleteBlocked({ role: 'client', email: null, adminEmailsRaw: null }), false);
  assert.equal(isSelfDeleteBlocked({ role: undefined, email: undefined, adminEmailsRaw: undefined }), false);
});

// --- Anonymization field maps ------------------------------------------------

test('deletedEmail is unique-per-user and non-routable', () => {
  assert.equal(deletedEmail('abc-123'), 'deleted-abc-123@deleted.invalid');
  assert.notEqual(deletedEmail('u1'), deletedEmail('u2'));
});

test('buyerThreadAnonymization scrubs contact identity only', () => {
  const a = buyerThreadAnonymization('uid-1');
  assert.equal(a.company, DELETED_DISPLAY);
  assert.equal(a.contact_name, DELETED_DISPLAY);
  assert.equal(a.email, 'deleted-uid-1@deleted.invalid');
  assert.equal(a.phone, null);
  // Must NOT touch message/answers/amount/status columns.
  assert.deepEqual(Object.keys(a).sort(), ['company', 'contact_name', 'email', 'phone']);
});

test('vendorProfileAnonymization hides the storefront, detaches auth, scrubs PII', () => {
  const a = vendorProfileAnonymization('uid-9', '2026-07-23T00:00:00.000Z');
  assert.equal(a.company_name, DELETED_VENDOR_DISPLAY);
  assert.equal(a.email, 'deleted-uid-9@deleted.invalid');
  assert.equal(a.contact_name, null);
  assert.equal(a.phone, null);
  assert.equal(a.website, null);
  assert.equal(a.logo_path, null);
  assert.equal(a.banner_path, null);
  assert.equal(a.signer_email, null);
  // Storefront hidden + row detached from the auth user.
  assert.equal(a.status, 'rejected');
  assert.equal(a.moderation_status, 'banned');
  assert.equal(a.auth_id, null);
  assert.equal(a.platform_user_id, null);
  assert.equal(a.moderated_at, '2026-07-23T00:00:00.000Z');
});

test('manual_deals + vendor_invites anonymization keep only a scrubbed identity', () => {
  assert.deepEqual(manualDealVendorAnonymization(), { vendor_name: DELETED_FINANCIAL });
  const inv = vendorInviteAnonymization();
  assert.equal(inv.contact_name, DELETED_DISPLAY);
  assert.equal(inv.company_name, DELETED_VENDOR_DISPLAY);
  assert.equal(inv.email, null);
  assert.equal(inv.phone, null);
});

// --- Disposition policy ------------------------------------------------------

test('DISPOSITION: financial + legal + audit tables are RETAINED, never deleted', () => {
  for (const table of ['commissions', 'purchases', 'fee_calculations', 'fee_acknowledgments', 'terms_acceptances', 'vendor_moderation_log', 'messages']) {
    assert.equal(DISPOSITION[table].action, 'retained', `${table} must be retained`);
  }
});

test('DISPOSITION: vendor_profiles is ANONYMIZED, never deleted (fee-ledger cascade anchor)', () => {
  assert.equal(DISPOSITION.vendor_profiles.action, 'anonymized');
  assert.equal(DISPOSITION.manual_deals.action, 'anonymized');
});

test('DISPOSITION: personal rows are DELETED', () => {
  for (const table of ['cart_items', 'saved_listings', 'buyer_profiles', 'marketplace_products', 'marketplace_services', 'vendor_gallery']) {
    assert.equal(DISPOSITION[table].action, 'deleted', `${table} must be deleted`);
  }
});
