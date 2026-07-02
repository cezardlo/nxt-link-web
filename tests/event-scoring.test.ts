import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchVendorToCompany,
  matchVendorToEvent,
  normalize,
  rankEvents,
  rankVendorsForCompany,
} from '@/lib/events/scoring';
import type { EventOrganization, TargetCompany, VendorForMatching } from '@/lib/events/types';

function makeEvent(overrides: Partial<EventOrganization>): EventOrganization {
  return {
    id: 'e-1',
    kind: 'conference',
    name: 'Event',
    location: null,
    source_url: 'https://example.com',
    source_verified_on: '2026-01-01',
    audience: null,
    industries: [],
    attendees_estimate: null,
    relevance: null,
    mission_fit: null,
    participation_recommendation: null,
    estimated_cost: null,
    cost_source_url: null,
    cost_verified_on: null,
    timing_frequency: null,
    priority: 'medium',
    score_customers: null,
    score_vendors: null,
    score_global_trends: null,
    score_cross_border: null,
    is_sample: true,
    notes: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCompany(overrides: Partial<TargetCompany>): TargetCompany {
  return {
    id: 'c-1',
    name: 'Company',
    segment: 'warehouse',
    industry: null,
    company_size: null,
    location: null,
    pain_points: [],
    tech_readiness: null,
    decision_makers: [],
    is_sample: true,
    notes: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeVendor(overrides: Partial<VendorForMatching>): VendorForMatching {
  return {
    id: 'v-1',
    company_name: 'Vendor',
    category: null,
    technology_category: null,
    region: null,
    pain_points_solved: [],
    target_company_types: [],
    conference_interests: [],
    participation_preference: null,
    demo_capabilities: null,
    worker_support_value: null,
    ...overrides,
  };
}

test('normalize strips accents and lowercases', () => {
  assert.equal(normalize('Ciudad Juárez'), 'ciudad juarez');
  assert.equal(normalize('  EL PASO  '), 'el paso');
  assert.equal(normalize(null), '');
});

test('rankEvents sorts by view score desc, unscored last, then priority', () => {
  const a = makeEvent({ id: 'a', name: 'A', score_customers: 50, priority: 'low' });
  const b = makeEvent({ id: 'b', name: 'B', score_customers: 90, priority: 'low' });
  const c = makeEvent({ id: 'c', name: 'C', score_customers: null, priority: 'high' });
  const d = makeEvent({ id: 'd', name: 'D', score_customers: null, priority: 'medium' });
  const ranked = rankEvents([a, c, d, b], 'customers');
  assert.deepEqual(ranked.map((e) => e.id), ['b', 'a', 'c', 'd']);
});

test('rankEvents is stable by name for full ties', () => {
  const a = makeEvent({ id: 'a', name: 'Alpha', score_vendors: 10 });
  const b = makeEvent({ id: 'b', name: 'Beta', score_vendors: 10 });
  const ranked = rankEvents([b, a], 'vendors');
  assert.deepEqual(ranked.map((e) => e.id), ['a', 'b']);
});

test('matchVendorToCompany scores pain-point overlap with reasons', () => {
  const vendor = makeVendor({ pain_points_solved: ['Inventory tracking', 'barcode errors'] });
  const company = makeCompany({ pain_points: ['inventory tracking accuracy'] });
  const { score, reasons } = matchVendorToCompany(vendor, company);
  assert.equal(score, 3);
  assert.ok(reasons.some((r) => r.includes('inventory tracking')));
});

test('matchVendorToCompany caps pain-point hits at three', () => {
  const vendor = makeVendor({ pain_points_solved: ['a1', 'b2', 'c3', 'd4', 'e5'] });
  const company = makeCompany({ pain_points: ['a1', 'b2', 'c3', 'd4', 'e5'] });
  const { score } = matchVendorToCompany(vendor, company);
  assert.equal(score, 9);
});

test('matchVendorToCompany adds segment, region, demo, and worker-support points', () => {
  const vendor = makeVendor({
    target_company_types: ['maquiladora'],
    region: 'Ciudad Juárez',
    demo_capabilities: 'on-site demo rig',
    worker_support_value: 'reduces strain and errors for line workers',
  });
  const company = makeCompany({ segment: 'maquiladora', location: 'Juarez, Chihuahua' });
  const { score, reasons } = matchVendorToCompany(vendor, company);
  assert.equal(score, 5); // 2 segment + 1 region + 1 demo + 1 worker support
  assert.equal(reasons.length, 4);
});

test('accented and unaccented regions match', () => {
  const vendor = makeVendor({ region: 'Juárez' });
  const company = makeCompany({ location: 'juarez' });
  const { score } = matchVendorToCompany(vendor, company);
  assert.equal(score, 1);
});

test('rankVendorsForCompany drops zero-score vendors and sorts best first', () => {
  const strong = makeVendor({ id: 'v-strong', company_name: 'Strong', pain_points_solved: ['quality inspection'] });
  const weak = makeVendor({ id: 'v-weak', company_name: 'Weak' });
  const company = makeCompany({ pain_points: ['quality inspection defects'] });
  const ranked = rankVendorsForCompany([weak, strong], company);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].item.id, 'v-strong');
});

test('matchVendorToEvent scores industry overlap, region, demo, sponsor interest', () => {
  const vendor = makeVendor({
    conference_interests: ['warehouse automation'],
    technology_category: 'RFID',
    region: 'El Paso, TX',
    demo_capabilities: 'portable demo',
    participation_preference: 'Sponsor + booth',
  });
  const event = makeEvent({
    industries: ['Warehouse Automation', 'RFID tracking'],
    location: 'El Paso',
  });
  const { score, reasons } = matchVendorToEvent(vendor, event);
  assert.equal(score, 2 * 2 + 1 + 1 + 1); // two industry hits + region + demo + sponsor
  assert.ok(reasons.length >= 4);
});
