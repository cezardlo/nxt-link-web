import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNewVendorApplicationEmail, buildNewListingReviewEmail } from '@/lib/admin/notify';

// buildNewVendorApplicationEmail — pure email-copy builder for the admin
// notification fired from POST /api/apply/submit. No I/O, no mail provider
// involved — just proving the exact copy shape.

test('buildNewVendorApplicationEmail: subject carries the company name', () => {
  const { subject } = buildNewVendorApplicationEmail({
    companyName: 'Acme Forklifts',
    contactName: 'Jane Doe',
    contactEmail: 'jane@acme.example',
    category: 'Forklifts',
  });
  assert.equal(subject, 'New vendor application: Acme Forklifts');
});

test('buildNewVendorApplicationEmail: body includes contact, category, and the review-queue link', () => {
  const { body } = buildNewVendorApplicationEmail({
    companyName: 'Acme Forklifts',
    contactName: 'Jane Doe',
    contactEmail: 'jane@acme.example',
    category: 'Forklifts',
  });
  assert.match(body, /Acme Forklifts/);
  assert.match(body, /Jane Doe <jane@acme\.example>/);
  assert.match(body, /Category: Forklifts/);
  assert.match(body, /\/admin\/vendor-applications/);
});

test('buildNewVendorApplicationEmail: missing optional fields degrade to an em dash, never blank/undefined text', () => {
  const { subject, body } = buildNewVendorApplicationEmail({
    companyName: '',
    contactName: null,
    contactEmail: 'someone@example.com',
    category: null,
  });
  assert.equal(subject, 'New vendor application: A new company');
  assert.match(body, /Contact: — <someone@example\.com>/);
  assert.match(body, /Category: —/);
  assert.doesNotMatch(body, /undefined/);
  assert.doesNotMatch(body, /null/);
});

// buildNewListingReviewEmail — pure email-copy builder for the admin
// notification fired from POST /api/vendor/listings when an AI-drafted
// listing lands in needs_review.

test('buildNewListingReviewEmail: subject carries the listing name', () => {
  const { subject } = buildNewListingReviewEmail({
    listingName: 'Heavy-Duty Forklift Rental',
    vendorName: 'Acme Forklifts',
    kind: 'product',
  });
  assert.equal(subject, 'New listing awaiting review: Heavy-Duty Forklift Rental');
});

test('buildNewListingReviewEmail: body names the vendor, the kind, and links to the review queue anchor', () => {
  const { body } = buildNewListingReviewEmail({
    listingName: 'Fleet Maintenance Plan',
    vendorName: 'Acme Forklifts',
    kind: 'service',
  });
  assert.match(body, /AI-drafted service listing/);
  assert.match(body, /Vendor: Acme Forklifts/);
  assert.match(body, /\/admin\/marketplace#listings-review/);
});

test('buildNewListingReviewEmail: missing vendor name degrades to an em dash', () => {
  const { body } = buildNewListingReviewEmail({
    listingName: 'Untitled listing',
    vendorName: null,
    kind: 'product',
  });
  assert.match(body, /Vendor: —/);
});
