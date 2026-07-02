import assert from 'node:assert/strict';
import test from 'node:test';

import {
  eventOrganizationInput,
  inviteListMemberInput,
  pipelineItemInput,
  targetCompanyInput,
  vendorEventFieldsSchema,
  wowIdeaInput,
} from '@/lib/events/validation';

const validEventOrg = {
  name: 'Sample Expo',
  source_url: 'https://example.com/expo',
  source_verified_on: '2026-07-01',
};

test('eventOrganizationInput accepts a minimal factual record', () => {
  const parsed = eventOrganizationInput.parse(validEventOrg);
  assert.equal(parsed.name, 'Sample Expo');
  assert.equal(parsed.kind, 'conference');
  assert.equal(parsed.priority, 'medium');
  assert.deepEqual(parsed.industries, []);
  assert.equal(parsed.is_sample, false);
});

test('eventOrganizationInput requires source_url and verification date', () => {
  assert.throws(() => eventOrganizationInput.parse({ name: 'No source' }));
  assert.throws(() => eventOrganizationInput.parse({ ...validEventOrg, source_url: 'not-a-url' }));
  assert.throws(() => eventOrganizationInput.parse({ ...validEventOrg, source_verified_on: 'July 1' }));
});

test('a cost claim on a factual record requires cost source + date', () => {
  assert.throws(() =>
    eventOrganizationInput.parse({ ...validEventOrg, estimated_cost: '$500 booth' }),
  );
  // ...but a sample row may carry an illustrative cost band.
  const sample = eventOrganizationInput.parse({
    ...validEventOrg,
    estimated_cost: '$500 booth',
    is_sample: true,
  });
  assert.equal(sample.estimated_cost, '$500 booth');
  // ...and a factual record with source + date passes.
  const sourced = eventOrganizationInput.parse({
    ...validEventOrg,
    estimated_cost: '$500 booth',
    cost_source_url: 'https://example.com/pricing',
    cost_verified_on: '2026-07-01',
  });
  assert.equal(sourced.cost_verified_on, '2026-07-01');
});

test('scores are bounded 0-100', () => {
  assert.throws(() => eventOrganizationInput.parse({ ...validEventOrg, score_customers: 101 }));
  assert.throws(() => eventOrganizationInput.parse({ ...validEventOrg, score_customers: -1 }));
  const ok = eventOrganizationInput.parse({ ...validEventOrg, score_customers: 100 });
  assert.equal(ok.score_customers, 100);
});

test('wowIdeaInput requires the idea text and defaults difficulty', () => {
  const parsed = wowIdeaInput.parse({ idea: 'Try-it-yourself demo corridor' });
  assert.equal(parsed.difficulty, 'medium');
  assert.throws(() => wowIdeaInput.parse({}));
});

test('targetCompanyInput validates segment and decision makers', () => {
  const parsed = targetCompanyInput.parse({
    name: 'SAMPLE — Border 3PL',
    segment: 'logistics',
    decision_makers: [{ name: 'Ops Lead', email: 'ops@example.com' }],
  });
  assert.equal(parsed.segment, 'logistics');
  assert.throws(() => targetCompanyInput.parse({ name: 'X', segment: 'not-a-segment' }));
  assert.throws(() =>
    targetCompanyInput.parse({ name: 'X', decision_makers: [{ name: 'A', email: 'not-email' }] }),
  );
});

test('inviteListMemberInput demands exactly one member reference', () => {
  const listId = '4dc45329-9a7d-4d3a-b04a-6d9977a86b7c';
  const memberId = 'ab61e17c-96f8-4a08-a26c-2792bde5e6a4';
  const ok = inviteListMemberInput.parse({ list_id: listId, company_id: memberId });
  assert.equal(ok.company_id, memberId);
  assert.throws(() => inviteListMemberInput.parse({ list_id: listId }));
  assert.throws(() =>
    inviteListMemberInput.parse({
      list_id: listId,
      company_id: memberId,
      vendor_application_id: memberId,
    }),
  );
});

test('pipelineItemInput defaults stage/status and validates outcomes', () => {
  const parsed = pipelineItemInput.parse({ title: 'Shortlist venues' });
  assert.equal(parsed.stage, 'research');
  assert.equal(parsed.status, 'todo');
  const withOutcomes = pipelineItemInput.parse({
    title: 'Post-event follow-up',
    stage: 'follow_up',
    outcomes: { meetings: 4, pilots: 1 },
  });
  assert.equal(withOutcomes.outcomes.meetings, 4);
  assert.throws(() => pipelineItemInput.parse({ title: 'X', outcomes: { meetings: -1 } }));
});

test('vendorEventFieldsSchema accepts the new intake fields', () => {
  const parsed = vendorEventFieldsSchema.parse({
    certifications: ['ISO 9001'],
    technology_category: 'RFID',
    pain_points_solved: ['inventory accuracy'],
    target_company_types: ['warehouse', 'maquiladora'],
    demo_capabilities: 'Portable demo kit, ES/EN',
    conference_interests: ['warehouse tech'],
    participation_preference: 'booth',
    budget_range: '$1k-$5k',
    worker_support_value: 'Cuts search time for pickers',
    consent_terms: true,
  });
  assert.equal(parsed.technology_category, 'RFID');
  assert.deepEqual(parsed.target_company_types, ['warehouse', 'maquiladora']);
});
