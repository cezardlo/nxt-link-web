import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreVendors, splitIndustryList, type MatchableVendor } from '@/lib/matching';
import { dispatchRequestToVendors } from '@/lib/requests/dispatch';
import { makeFakeDb } from './helpers/fake-supabase';

// Honest matching consumption (2026-07-30 buyer progressive-enrichment card,
// workplace/plans/matching-and-onboarding-2026-07-30.md item A). scoreVendors
// gained two OPTIONAL inputs (buyerIndustries, requestedCertifications) — both
// must be no-ops unless BOTH sides have real, overlapping data (never a
// fabricated signal), and every caller that doesn't pass them must score
// EXACTLY as it did before this slice existed.

// ── splitIndustryList: the shared parser for buyer_profiles.industry's
//    "up to 3, comma-separated" storage shape (zero-migration, item 4 of the
//    coordinator triage note) ─────────────────────────────────────────────

test('splitIndustryList: null/undefined/empty all parse to []', () => {
  assert.deepEqual(splitIndustryList(null), []);
  assert.deepEqual(splitIndustryList(undefined), []);
  assert.deepEqual(splitIndustryList(''), []);
  assert.deepEqual(splitIndustryList('   '), []);
});

test('splitIndustryList: trims, dedupes case-insensitively, caps at 3', () => {
  assert.deepEqual(splitIndustryList('Manufacturing,  Retail ,manufacturing, Construction, Pharma'), [
    'Manufacturing', 'Retail', 'Construction',
  ]);
});

test('splitIndustryList: a single value round-trips unchanged', () => {
  assert.deepEqual(splitIndustryList('Manufacturing'), ['Manufacturing']);
});

// ── scoreVendors: byte-identical when no enrichment data is supplied ───────

test('scoreVendors: omitting buyerIndustries/requestedCertifications scores identically even when vendors carry industries/certifications data', () => {
  const vendors: MatchableVendor[] = [
    {
      id: 'v1', company_name: 'Forklift Co', categories: ['Forklifts'], service_areas: ['El Paso'],
      status: 'approved', industries: ['Manufacturing'], certifications: ['ISO 9001'],
    },
  ];
  const withExtraFieldsButNoInput = scoreVendors({ category: 'Forklifts', location: 'El Paso' }, vendors);
  const bareVendors: MatchableVendor[] = [
    { id: 'v1', company_name: 'Forklift Co', categories: ['Forklifts'], service_areas: ['El Paso'], status: 'approved' },
  ];
  const withoutExtraFieldsAtAll = scoreVendors({ category: 'Forklifts', location: 'El Paso' }, bareVendors);
  assert.equal(withExtraFieldsButNoInput[0].score, withoutExtraFieldsAtAll[0].score);
  assert.deepEqual(withExtraFieldsButNoInput[0].reasons, withoutExtraFieldsAtAll[0].reasons);
});

test('scoreVendors: an empty buyerIndustries/requestedCertifications array is also a no-op', () => {
  const vendors: MatchableVendor[] = [
    { id: 'v1', company_name: 'Forklift Co', status: 'approved', industries: ['Manufacturing'], certifications: ['ISO 9001'] },
  ];
  const base = scoreVendors({}, vendors);
  const withEmptyArrays = scoreVendors({ buyerIndustries: [], requestedCertifications: [] }, vendors);
  assert.equal(base[0].score, withEmptyArrays[0].score);
});

// ── Industry boost: real overlap only ──────────────────────────────────────

test('scoreVendors: buyer industry overlapping a vendor industry adds +10 and an honest reason', () => {
  const vendors: MatchableVendor[] = [
    { id: 'v1', company_name: 'Match Co', status: 'approved', industries: ['Manufacturing', 'Retail'] },
  ];
  const withoutBoost = scoreVendors({}, vendors);
  const withBoost = scoreVendors({ buyerIndustries: ['Manufacturing'] }, vendors);
  assert.equal(withBoost[0].score - withoutBoost[0].score, 10);
  assert.ok(withBoost[0].reasons.some((r) => /serves your industry/i.test(r)));
});

test('scoreVendors: NO overlap never adds points or a reason — no fabricated signal', () => {
  const vendors: MatchableVendor[] = [
    { id: 'v1', company_name: 'No Match Co', status: 'approved', industries: ['Automotive'] },
  ];
  const withoutBoost = scoreVendors({}, vendors);
  const withBuyerIndustry = scoreVendors({ buyerIndustries: ['Pharma'] }, vendors);
  assert.equal(withBuyerIndustry[0].score, withoutBoost[0].score);
  assert.ok(!withBuyerIndustry[0].reasons.some((r) => /industry/i.test(r)));
});

test('scoreVendors: a vendor with no industries at all never gets the boost even if the buyer supplied some', () => {
  const vendors: MatchableVendor[] = [{ id: 'v1', company_name: 'Bare Co', status: 'approved' }];
  const scored = scoreVendors({ buyerIndustries: ['Manufacturing'] }, vendors);
  assert.ok(!scored[0].reasons.some((r) => /industry/i.test(r)));
});

// ── Certification boost: same honesty rule, +5 ─────────────────────────────

test('scoreVendors: a requested certification the vendor holds adds +5 and an honest reason', () => {
  const vendors: MatchableVendor[] = [
    { id: 'v1', company_name: 'Certified Co', status: 'approved', certifications: ['ISO 9001', 'OSHA 30'] },
  ];
  const withoutBoost = scoreVendors({}, vendors);
  const withBoost = scoreVendors({ requestedCertifications: ['ISO 9001'] }, vendors);
  assert.equal(withBoost[0].score - withoutBoost[0].score, 5);
  assert.ok(withBoost[0].reasons.some((r) => /requested certification/i.test(r)));
});

test('scoreVendors: a certification the vendor does NOT hold never adds points', () => {
  const vendors: MatchableVendor[] = [
    { id: 'v1', company_name: 'Uncertified Co', status: 'approved', certifications: ['OSHA 30'] },
  ];
  const withoutBoost = scoreVendors({}, vendors);
  const withRequest = scoreVendors({ requestedCertifications: ['ISO 9001'] }, vendors);
  assert.equal(withRequest[0].score, withoutBoost[0].score);
});

// ── Cap/MIN_SCORE semantics unchanged ──────────────────────────────────────

test('scoreVendors: the 0–100 clamp still holds when every boost stacks (category+area+approved+industry+certification)', () => {
  const vendors: MatchableVendor[] = [
    {
      id: 'v1', company_name: 'Everything Co', categories: ['Forklifts'], service_areas: ['El Paso'],
      status: 'approved', brochure_count: 3, industries: ['Manufacturing'], certifications: ['ISO 9001'],
    },
  ];
  const scored = scoreVendors(
    { category: 'Forklifts', location: 'El Paso', buyerIndustries: ['Manufacturing'], requestedCertifications: ['ISO 9001'] },
    vendors,
  );
  assert.ok(scored[0].score <= 100);
});

test('scoreVendors: unscored (0-point) vendors are still excluded from the output — MIN_SCORE filtering is a caller concern, unaffected here', () => {
  const vendors: MatchableVendor[] = [{ id: 'v1', company_name: 'Irrelevant Co', status: 'pending' }];
  const scored = scoreVendors({ category: 'Something nobody has' }, vendors);
  assert.equal(scored.length, 0);
});

// ── Integration: dispatchRequestToVendors actually wires buyer_profiles
//    industry into scoreVendors, and it is fail-soft when there's no profile.
//    (blind-budget invariant is covered separately in
//    tests/rfq-blind-budget.test.ts — untouched by this slice.) ────────────

test('dispatch: no buyer_profiles row at all → scoring/order identical to before this slice (fail-soft)', async () => {
  const vendorsSeed = [
    { id: 'vendor-a', company_name: 'Vendor A', email: null, categories: [], service_areas: [], industries: ['Retail'], status: 'approved', moderation_status: 'active', suspended_until: null },
    { id: 'vendor-b', company_name: 'Vendor B', email: null, categories: [], service_areas: [], industries: ['Manufacturing'], status: 'approved', moderation_status: 'active', suspended_until: null },
  ];
  const db = makeFakeDb({ vendor_profiles: vendorsSeed.map((v) => ({ ...v })) });
  const result = await dispatchRequestToVendors(db, {
    id: 'req-1', public_ref: 'REQ-BASE', category: '', location: '',
    contact_name: 'Buyer Co', contact_email: 'buyer-no-profile@example.com',
  });
  assert.equal(result.dispatched, 2);
  const order = (db._store.quote_requests || []).map((r) => r.vendor_id);
  // No profile → no boost for either vendor → stable insertion order (A, B).
  assert.deepEqual(order, ['vendor-a', 'vendor-b']);
});

test('dispatch: a buyer_profiles industry match reorders the dispatch — honest, real overlap only', async () => {
  const vendorsSeed = [
    { id: 'vendor-a', company_name: 'Vendor A', email: null, categories: [], service_areas: [], industries: ['Retail'], status: 'approved', moderation_status: 'active', suspended_until: null },
    { id: 'vendor-b', company_name: 'Vendor B', email: null, categories: [], service_areas: [], industries: ['Manufacturing'], status: 'approved', moderation_status: 'active', suspended_until: null },
  ];
  const db = makeFakeDb({
    vendor_profiles: vendorsSeed.map((v) => ({ ...v })),
    buyer_profiles: [{ buyer_email: 'buyer-match@example.com', industry: 'Manufacturing' }],
  });
  const result = await dispatchRequestToVendors(db, {
    id: 'req-2', public_ref: 'REQ-BOOST', category: '', location: '',
    contact_name: 'Buyer Co', contact_email: 'buyer-match@example.com',
  });
  assert.equal(result.dispatched, 2);
  const order = (db._store.quote_requests || []).map((r) => r.vendor_id);
  // Vendor B's industry (Manufacturing) really overlaps the buyer's — it now
  // outranks vendor A purely from that honest boost.
  assert.deepEqual(order, ['vendor-b', 'vendor-a']);
});

test('dispatch: requested certifications (structured_specs.certifications) boost a vendor that actually holds one', async () => {
  const vendorsSeed = [
    { id: 'vendor-a', company_name: 'Vendor A', email: null, categories: [], service_areas: [], status: 'approved', moderation_status: 'active', suspended_until: null },
    { id: 'vendor-b', company_name: 'Vendor B', email: null, categories: [], service_areas: [], status: 'approved', moderation_status: 'active', suspended_until: null },
  ];
  const db = makeFakeDb({
    vendor_profiles: vendorsSeed.map((v) => ({ ...v })),
    vendor_certifications: [{ vendor_id: 'vendor-b', name: 'ISO 9001' }],
  });
  const result = await dispatchRequestToVendors(db, {
    id: 'req-3', public_ref: 'REQ-CERT', category: '', location: '',
    contact_name: 'Buyer Co', contact_email: 'buyer-cert@example.com',
    structured_specs: { certifications: ['ISO 9001'] },
  });
  assert.equal(result.dispatched, 2);
  const order = (db._store.quote_requests || []).map((r) => r.vendor_id);
  assert.deepEqual(order, ['vendor-b', 'vendor-a']);
});
