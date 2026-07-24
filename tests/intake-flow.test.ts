import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildQuestionPlan,
  categoryIsNegated,
  detectCategory,
  nextStep,
  type IntakeAnswer,
  type IntakeState,
} from '@/lib/assistant/intake-flow';

// Audit repro (2026-07-23): buyer typed "I need a pallet jack repaired", the
// assistant locked onto 'forklift' (pallet jack is one of its keywords) and
// asked "how many forklifts are involved?"; the buyer replied "1 pallet
// jack, not a forklift"; the OLD engine kept asking forklift-specific
// questions (brand/power/etc) because the category, once set, was never
// re-evaluated against later answers — a mismatched intake could then reach
// /api/platform/requests -> dispatchRequestToVendors unchanged.

test('detectCategory: "pallet jack" is a forklift-keyword match (baseline)', () => {
  assert.equal(detectCategory('I need a pallet jack repaired'), 'forklift');
});

test('categoryIsNegated: "not a forklift" negates the forklift category', () => {
  assert.equal(categoryIsNegated('1 pallet jack, not a forklift', 'forklift'), true);
});

test('categoryIsNegated: a plain mention with no negation cue does not count', () => {
  assert.equal(categoryIsNegated('I need a forklift serviced', 'forklift'), false);
});

test('categoryIsNegated: unrelated "no" elsewhere in the SAME message does not falsely negate a keyword far away', () => {
  // The negation window only looks a short distance immediately before the
  // keyword, so an unrelated "no" earlier in a long sentence must not count.
  const longText =
    'No hay problema con el horario, pero sí necesitamos mantenimiento de montacargas esta semana';
  assert.equal(categoryIsNegated(longText, 'forklift'), false);
});

test('nextStep: pallet-jack-not-forklift repro — the engine stops railroading into forklift questions', () => {
  const initialText = 'I need a pallet jack repaired';

  // Turn 1: opening message locks onto 'forklift' (pallet jack keyword).
  const state1: IntakeState = { category: 'unsure', answers: [], done: false };
  const step1 = nextStep(initialText, state1);
  assert.equal(step1.category, 'forklift');
  assert.equal(step1.question?.id, 'qty');
  assert.equal(step1.corrected ?? false, false);

  // Turn 2: buyer explicitly contradicts the locked category.
  const answers2: IntakeAnswer[] = [
    { id: 'qty', q: step1.question!.en, a: '1 pallet jack, not a forklift' },
  ];
  const state2: IntakeState = { category: step1.category, answers: answers2, done: false };
  const step2 = nextStep(initialText, state2);

  // THE FIX: category must no longer be the rejected 'forklift' branch, and
  // the next question must NOT be one of forklift's hardcoded follow-ups
  // (brand/power/type/down/...) — the defect this test guards against.
  assert.notEqual(step2.category, 'forklift');
  const forkliftFollowUpIds = new Set(
    buildQuestionPlan('forklift').map((q) => q.id).filter((id) => id !== 'qty'),
  );
  assert.equal(forkliftFollowUpIds.has(step2.question?.id || ''), false);
  assert.equal(step2.corrected, true);

  // Turn 3: the rejection must stick — the original opening text ("pallet
  // jack") must not flip the engine back into 'forklift' on a later turn
  // just because detection re-runs while the category is 'unsure'.
  const answers3: IntakeAnswer[] = [
    ...answers2,
    { id: step2.question!.id, q: step2.question!.en, a: 'Just needs a wheel replaced' },
  ];
  const state3: IntakeState = { category: step2.category, answers: answers3, done: false };
  const step3 = nextStep(initialText, state3);
  assert.notEqual(step3.category, 'forklift');
});

test('nextStep: a later answer can redirect the engine to a genuinely different category', () => {
  const initialText = 'Not sure who handles this, something is slowing us down';
  const state1: IntakeState = { category: 'unsure', answers: [], done: false };
  const step1 = nextStep(initialText, state1);
  assert.equal(step1.category, 'unsure');

  const answers2: IntakeAnswer[] = [
    { id: step1.question!.id, q: step1.question!.en, a: 'We are short on warehouse staff' },
  ];
  const state2: IntakeState = { category: 'unsure', answers: answers2, done: false };
  const step2 = nextStep(initialText, state2);
  assert.equal(step2.category, 'staffing');
  assert.equal(step2.question?.id, 'count'); // staffing's own first question, not skipped ahead
});

test('nextStep: an ordinary "no" answer elsewhere does not spuriously flip an already-locked category', () => {
  const initialText = 'Need facility maintenance on our loading dock';
  const state1: IntakeState = { category: 'unsure', answers: [], done: false };
  const step1 = nextStep(initialText, state1);
  assert.equal(step1.category, 'facility');
  assert.equal(step1.question?.id, 'type');

  const answers2: IntakeAnswer[] = [
    { id: 'type', q: step1.question!.en, a: 'Repair' },
  ];
  const state2: IntakeState = { category: 'facility', answers: answers2, done: false };
  const step2 = nextStep(initialText, state2);
  assert.equal(step2.category, 'facility');
  assert.equal(step2.question?.id, 'area');

  const answers3: IntakeAnswer[] = [
    ...answers2,
    { id: 'area', q: step2.question!.en, a: 'No, just the north dock door' },
  ];
  const state3: IntakeState = { category: 'facility', answers: answers3, done: false };
  const step3 = nextStep(initialText, state3);
  assert.equal(step3.category, 'facility');
  assert.equal(step3.question?.id, 'urgent');
});
