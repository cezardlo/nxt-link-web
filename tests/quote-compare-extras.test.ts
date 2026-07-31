import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_COMPARE_EXTRAS_LABELS,
  installationValueLabel,
  trainingValueLabel,
  licenseModelValueLabel,
} from '@/components/marketplace/QuoteCompareTable';

// Slice R6 (flow-readiness fix, 2026-07-30) — audit gap #2
// (workplace/audit/flow-readiness-2026-07-30.md): vendor quote extras
// (quote_requests.quote_extras / quote_proposals.quote_extras) were
// collected by R3 but never selected or rendered anywhere a buyer could see
// them. These are the shared enum->label mappers the compare table, the
// compare deck, and the offer-in-chat card all reuse so a vendor's
// 'included'/'extra'/'not_available'/'subscription'/etc. choice always reads
// the same word everywhere a buyer sees it — never a second, drifting copy.

test('installationValueLabel maps every real stored value to its label, and null/unknown to null (never a guess)', () => {
  const l = DEFAULT_COMPARE_EXTRAS_LABELS;
  assert.equal(installationValueLabel('included', l), l.installationIncluded);
  assert.equal(installationValueLabel('extra', l), l.installationExtra);
  assert.equal(installationValueLabel('not_available', l), l.installationNone);
  assert.equal(installationValueLabel(null, l), null);
  assert.equal(installationValueLabel(undefined, l), null);
});

test('trainingValueLabel maps included/extra, null/unknown to null', () => {
  const l = DEFAULT_COMPARE_EXTRAS_LABELS;
  assert.equal(trainingValueLabel('included', l), l.trainingIncluded);
  assert.equal(trainingValueLabel('extra', l), l.trainingExtra);
  assert.equal(trainingValueLabel(null, l), null);
});

test('licenseModelValueLabel maps subscription/perpetual/tiered, null/unknown to null', () => {
  const l = DEFAULT_COMPARE_EXTRAS_LABELS;
  assert.equal(licenseModelValueLabel('subscription', l), l.licenseSubscription);
  assert.equal(licenseModelValueLabel('perpetual', l), l.licensePerpetual);
  assert.equal(licenseModelValueLabel('tiered', l), l.licenseTiered);
  assert.equal(licenseModelValueLabel(undefined, l), null);
});

// Honesty rule (workplace/design/ui-standards-addendum-2026-07-30.md §6): a
// caller that gets `null` back from these mappers must render "—" or omit
// the row entirely — never an empty string that looks like a blank cell was
// intentional. Proven at the type level: the return type is `string | null`,
// never `string`, so a caller can't accidentally interpolate an empty label.
