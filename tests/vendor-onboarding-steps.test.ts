import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SECTION_ORDER,
  STOREFRONT_STEPS,
  CAPABILITIES_STEPS,
  TRUST_STEPS,
  AGREEMENT_STEPS,
  stepsForSection,
  showServiceAreasQuestion,
  clampStepIndex,
  computeSectionStatus,
  countSectionsDone,
} from '@/app/vendor/onboarding/steps';

// --- Section order (v2 hub + four focused sections) -----------------------

test('SECTION_ORDER is the four blueprint sections, in order', () => {
  assert.deepEqual(SECTION_ORDER, ['storefront', 'capabilities', 'trust', 'agreement']);
});

test('Storefront section is name+logo -> location+areas -> tagline+about -> contact (2026-07-30 simplified pass)', () => {
  assert.deepEqual(STOREFRONT_STEPS, ['name_logo', 'location_areas', 'tagline_about', 'contact']);
  // The step LIST itself doesn't vary by softwareOnly — only whether the
  // location card's second ("where do you serve") question renders, which
  // showServiceAreasQuestion below covers.
  assert.deepEqual(stepsForSection('storefront', { softwareOnly: false }), STOREFRONT_STEPS);
  assert.deepEqual(stepsForSection('storefront', { softwareOnly: true }), STOREFRONT_STEPS);
});

test('Capabilities section is industries -> client_size -> categories (service areas moved to the storefront location card)', () => {
  assert.deepEqual(CAPABILITIES_STEPS, ['industries', 'client_size', 'categories']);
  assert.deepEqual(stepsForSection('capabilities', { softwareOnly: false }), CAPABILITIES_STEPS);
  assert.deepEqual(stepsForSection('capabilities', { softwareOnly: true }), CAPABILITIES_STEPS);
});

test('Trust & Proof section is proof (certs+case studies+photos combined) -> videos -> awards', () => {
  assert.deepEqual(TRUST_STEPS, ['proof', 'videos', 'awards']);
  assert.deepEqual(stepsForSection('trust', { softwareOnly: false }), TRUST_STEPS);
});

test('Agreement & Activation section is recap -> terms', () => {
  assert.deepEqual(AGREEMENT_STEPS, ['recap', 'terms']);
  assert.deepEqual(stepsForSection('agreement', { softwareOnly: false }), AGREEMENT_STEPS);
});

// --- Paired location card: the "where do you serve" half is software-only-aware ---

test('showServiceAreasQuestion is true for a normal vendor', () => {
  assert.equal(showServiceAreasQuestion({ softwareOnly: false }), true);
});

test('showServiceAreasQuestion is false for a software-only vendor (no physical service region)', () => {
  assert.equal(showServiceAreasQuestion({ softwareOnly: true }), false);
});

// --- clampStepIndex ---------------------------------------------------------

test('clampStepIndex keeps an index inside [0, total-1]', () => {
  assert.equal(clampStepIndex(-3, 5), 0);
  assert.equal(clampStepIndex(0, 5), 0);
  assert.equal(clampStepIndex(4, 5), 4);
  assert.equal(clampStepIndex(99, 5), 4);
});

test('clampStepIndex handles an empty list without throwing', () => {
  assert.equal(clampStepIndex(0, 0), 0);
  assert.equal(clampStepIndex(5, 0), 0);
});

// --- Section completion (the calm checklist's green checks) ----------------

const baseInput = {
  companyName: '', tagline: '', description: '',
  industries: [] as string[], categories: [] as string[],
  clientSizeCount: 0, proofCount: 0, agreementAccepted: false,
};

test('a brand-new vendor has no sections done', () => {
  const status = computeSectionStatus(baseInput);
  assert.deepEqual(status, { storefront: false, capabilities: false, trust: false, agreement: false });
  assert.equal(countSectionsDone(status), 0);
});

test('storefront is done only once name, tagline, and about are all filled', () => {
  assert.equal(computeSectionStatus({ ...baseInput, companyName: 'Acme' }).storefront, false);
  assert.equal(computeSectionStatus({ ...baseInput, companyName: 'Acme', tagline: 'We do things' }).storefront, false);
  assert.equal(
    computeSectionStatus({ ...baseInput, companyName: 'Acme', tagline: 'We do things', description: 'Longer about text.' }).storefront,
    true,
  );
  // Whitespace-only values don't count as filled.
  assert.equal(
    computeSectionStatus({ ...baseInput, companyName: '  ', tagline: 'x', description: 'x' }).storefront,
    false,
  );
});

test('capabilities is done once at least one industry and one category are picked', () => {
  assert.equal(computeSectionStatus({ ...baseInput, industries: ['Manufacturing'] }).capabilities, false);
  assert.equal(computeSectionStatus({ ...baseInput, categories: ['Forklifts'] }).capabilities, false);
  assert.equal(
    computeSectionStatus({ ...baseInput, industries: ['Manufacturing'], categories: ['Forklifts'] }).capabilities,
    true,
  );
});

test('trust is done once any proof item exists (cert, case study, photo, video, or award)', () => {
  assert.equal(computeSectionStatus({ ...baseInput, proofCount: 0 }).trust, false);
  assert.equal(computeSectionStatus({ ...baseInput, proofCount: 1 }).trust, true);
});

test('agreement is done only once the click-wrap is recorded', () => {
  assert.equal(computeSectionStatus({ ...baseInput, agreementAccepted: false }).agreement, false);
  assert.equal(computeSectionStatus({ ...baseInput, agreementAccepted: true }).agreement, true);
});

test('countSectionsDone counts every true flag', () => {
  const status = computeSectionStatus({
    companyName: 'Acme', tagline: 'We do things', description: 'Longer about text.',
    industries: ['Manufacturing'], categories: ['Forklifts'], clientSizeCount: 1,
    proofCount: 2, agreementAccepted: true,
  });
  assert.deepEqual(status, { storefront: true, capabilities: true, trust: true, agreement: true });
  assert.equal(countSectionsDone(status), 4);
});
