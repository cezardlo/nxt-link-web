// Pure step-ordering logic for the vendor onboarding card flow (Slice S1).
// Kept dependency-free (no React, no fetch) so it is trivially unit-testable —
// see tests/vendor-onboarding-steps.test.ts. The UI (page.tsx) only ever reads
// this list; it never re-derives step order inline, so there is one source of
// truth for "what card comes next."

export type StepId =
  | 'logo'
  | 'identity'
  | 'reach'
  | 'tagline'
  | 'description'
  | 'industries'
  | 'client_size'
  | 'client_types'
  | 'categories'
  | 'service_areas'
  | 'awards'
  | 'summary';

// Canonical order. `service_areas` is conditionally removed for software-only
// vendors (mirrors src/app/vendor/portal/page.tsx's `softwareOnly` rule — a
// software/technology vendor has no physical install site or service region).
export const ALL_STEPS: StepId[] = [
  'logo',
  'identity',
  'reach',
  'tagline',
  'description',
  'industries',
  'client_size',
  'client_types',
  'categories',
  'service_areas',
  'awards',
  'summary',
];

// `summary` is the closing "you're all set" card — it isn't one of the
// countable/progress-dot steps (it has no field to fill in).
export const CONTENT_STEPS = ALL_STEPS.filter((s) => s !== 'summary');

export interface VisibleStepsOptions {
  /** True when every selected category is in the "technology" family — no
   *  physical install site / service region applies, so we skip that card. */
  softwareOnly: boolean;
}

/** The ordered list of steps a given vendor should see, in order. Pure — same
 *  input always produces the same output. */
export function getVisibleSteps(opts: VisibleStepsOptions): StepId[] {
  return ALL_STEPS.filter((id) => !(id === 'service_areas' && opts.softwareOnly));
}

/** Steps counted by the progress dots (excludes the closing summary card). */
export function getVisibleContentSteps(opts: VisibleStepsOptions): StepId[] {
  return getVisibleSteps(opts).filter((s) => s !== 'summary');
}

export function clampStepIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index > total - 1) return total - 1;
  return index;
}
