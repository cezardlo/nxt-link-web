import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_STEPS,
  CONTENT_STEPS,
  clampStepIndex,
  getVisibleContentSteps,
  getVisibleSteps,
} from '@/app/vendor/onboarding/steps';

test('getVisibleSteps returns every step, in order, for a non-software vendor', () => {
  const steps = getVisibleSteps({ softwareOnly: false });
  assert.deepEqual(steps, ALL_STEPS);
  assert.ok(steps.includes('service_areas'));
  assert.equal(steps[steps.length - 1], 'summary');
});

test('getVisibleSteps drops service_areas (only) for a software-only vendor', () => {
  const steps = getVisibleSteps({ softwareOnly: true });
  assert.equal(steps.includes('service_areas'), false);
  assert.equal(steps.length, ALL_STEPS.length - 1);
  // Order of the remaining steps is otherwise untouched.
  assert.deepEqual(steps, ALL_STEPS.filter((s) => s !== 'service_areas'));
});

test('getVisibleContentSteps excludes the closing summary card', () => {
  assert.equal(getVisibleContentSteps({ softwareOnly: false }).includes('summary'), false);
  assert.deepEqual(
    getVisibleContentSteps({ softwareOnly: false }),
    CONTENT_STEPS,
  );
});

test('getVisibleContentSteps also drops service_areas when software-only', () => {
  const steps = getVisibleContentSteps({ softwareOnly: true });
  assert.equal(steps.includes('service_areas'), false);
  assert.equal(steps.includes('summary'), false);
});

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
