import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SECTION_ORDER,
  STOREFRONT_STEPS,
  CAPABILITIES_STEPS,
  TRUST_STEPS,
  AGREEMENT_STEPS,
  stepsForSection,
  getVisibleCapabilitiesSteps,
  clampStepIndex,
  computeSectionStatus,
  countSectionsDone,
} from '@/app/vendor/onboarding/steps';

// --- Section order (v2 hub + four focused sections) -----------------------

test('SECTION_ORDER is the four blueprint sections, in order', () => {
  assert.deepEqual(SECTION_ORDER, ['storefront', 'capabilities', 'trust', 'agreement']);
});

test('Storefront section is name+logo -> tagline -> about -> contact', () => {
  assert.deepEqual(STOREFRONT_STEPS, ['name_logo', 'tagline', 'about', 'contact']);
  assert.deepEqual(stepsForSection('storefront', { softwareOnly: false }), STOREFRONT_STEPS);
  assert.deepEqual(stepsForSection('storefront', { softwareOnly: true }), STOREFRONT_STEPS);
});

test('Trust & Proof section covers certifications, case studies, photos, videos, awards', () => {
  assert.deepEqual(TRUST_STEPS, ['certifications', 'case_studies', 'photos', 'videos', 'awards']);
  assert.deepEqual(stepsForSection('trust', { softwareOnly: false }), TRUST_STEPS);
});

test('Agreement & Activation section is recap -> terms', () => {
  assert.deepEqual(AGREEMENT_STEPS, ['recap', 'terms']);
  assert.deepEqual(stepsForSection('agreement', { softwareOnly: false }), AGREEMENT_STEPS);
});

// --- Capabilities visibility (service_areas skipped for software-only) ----

test('getVisibleCapabilitiesSteps returns every step, in order, for a non-software vendor', () => {
  const steps = getVisibleCapabilitiesSteps({ softwareOnly: false });
  assert.deepEqual(steps, CAPABILITIES_STEPS);
  assert.ok(steps.includes('service_areas'));
});

test('getVisibleCapabilitiesSteps drops service_areas (only) for a software-only vendor', () => {
  const steps = getVisibleCapabilitiesSteps({ softwareOnly: true });
  assert.equal(steps.includes('service_areas'), false);
  assert.equal(steps.length, CAPABILITIES_STEPS.length - 1);
  assert.deepEqual(steps, CAPABILITIES_STEPS.filter((s) => s !== 'service_areas'));
});

test('stepsForSection mirrors getVisibleCapabilitiesSteps for the capabilities section', () => {
  assert.deepEqual(
    stepsForSection('capabilities', { softwareOnly: true }),
    getVisibleCapabilitiesSteps({ softwareOnly: true }),
  );
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
