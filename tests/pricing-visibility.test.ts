import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanPriceModels, cleanPriceComponents, priceLine, componentLine,
  tierLine, publicMinPrice, publicPricing, normalizeListingInput,
} from '@/lib/marketplace/types';

function model(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm_1', name: 'Purchase price', method: 'exact', amount: '195',
    min_amount: '', max_amount: '', currency: 'USD', unit: 'per unit',
    recurring: false, billing_frequency: '', conditions: '', included: '',
    excluded: '', visibility: 'public', confirmed_at: '', ...overrides,
  };
}

test('cleanPriceModels keeps valid entries and drops junk', () => {
  const out = cleanPriceModels([
    model(),
    { name: '', amount: '', min_amount: '', method: 'exact' }, // says nothing → dropped
    { name: 'Quote only', method: 'quote' },                    // quote-only is fine
    'not-an-object',
    null,
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'Purchase price');
  assert.equal(out[1].method, 'quote');
});

test('cleanPriceModels sanitizes amounts, methods, and visibility', () => {
  const [m] = cleanPriceModels([model({
    amount: '$1,9x95abc', method: 'evil_method', visibility: 'super_secret', currency: 'EUR',
  })]);
  assert.equal(m.amount, '1,995'); // non-numeric stripped
  assert.equal(m.method, 'custom'); // unknown method → custom
  assert.equal(m.visibility, 'public'); // unknown visibility → public (never invents a gate)
  assert.equal(m.currency, 'USD'); // unsupported currency → USD
});

test('priceLine formats the buyer-facing line', () => {
  assert.equal(priceLine(cleanPriceModels([model()])[0]), '$195 per unit');
  assert.equal(priceLine(cleanPriceModels([model({ method: 'starting', amount: '195' })])[0]), 'Starting at $195 per unit');
  assert.equal(priceLine(cleanPriceModels([model({ method: 'range', amount: '', min_amount: '100', max_amount: '150', unit: 'per hour' })])[0]), '$100–$150 per hour');
  assert.equal(priceLine(cleanPriceModels([model({ method: 'quote', amount: '' })])[0]), 'Custom quote');
  assert.equal(priceLine(cleanPriceModels([model({ method: 'per_month', amount: '850', unit: 'per month', recurring: true, billing_frequency: 'monthly' })])[0]), '$850 per month (monthly)');
});

test('componentLine shows quoted-separately and optional flags', () => {
  const [c] = cleanPriceComponents([{ id: 'pc_1', name: 'Parts', amount: '', required: false, visibility: 'public' }]);
  assert.equal(componentLine(c), 'Parts: Quoted separately (optional)');
  const [c2] = cleanPriceComponents([{ id: 'pc_2', name: 'Mobile-service fee', amount: '110', unit: 'per visit', required: true, visibility: 'public' }]);
  assert.equal(componentLine(c2), 'Mobile-service fee: $110 per visit');
});

test('publicPricing strips every non-public entry for anonymous buyers', () => {
  const pricing = {
    model: 'Per unit', range: '$150-$450', notes: 'volume discounts', buy: true, rent: false, lease: false,
    visibility: 'public',
    models: [
      model({ id: 'a', visibility: 'public' }),
      model({ id: 'b', name: 'Fleet discount price', visibility: 'signed_in' }),
      model({ id: 'c', name: 'Internal floor', visibility: 'private' }),
      model({ id: 'd', name: 'After request', visibility: 'after_request' }),
    ],
    components: [
      { id: 'x', name: 'Delivery', amount: '80', visibility: 'public' },
      { id: 'y', name: 'Secret surcharge', amount: '999', visibility: 'private' },
    ],
  };
  const pub = publicPricing(pricing, 'public')!;
  const models = pub.models as Array<{ id: string }>;
  const components = pub.components as Array<{ id: string }>;
  assert.deepEqual(models.map((m) => m.id), ['a']);
  assert.deepEqual(components.map((c) => c.id), ['x']);
  assert.equal(pub.has_gated_pricing, true);
  // The serialized result must not contain gated strings anywhere.
  const json = JSON.stringify(pub);
  assert.ok(!json.includes('Internal floor'));
  assert.ok(!json.includes('Secret surcharge'));
  assert.ok(!json.includes('Fleet discount price'));
});

test('publicPricing signed_in audience additionally sees signed_in entries', () => {
  const pricing = {
    visibility: 'public',
    models: [model({ id: 'a', visibility: 'public' }), model({ id: 'b', visibility: 'signed_in' }), model({ id: 'c', visibility: 'private' })],
    components: [],
  };
  const pub = publicPricing(pricing, 'signed_in')!;
  assert.deepEqual((pub.models as Array<{ id: string }>).map((m) => m.id), ['a', 'b']);
});

test('publicPricing hides the legacy range when overall visibility is gated', () => {
  const pub = publicPricing({ model: 'Per unit', range: '$5k-$25k', notes: 'x', visibility: 'after_request', models: [], components: [] }, 'public')!;
  assert.equal(pub.range, '');
  assert.equal(pub.model, '');
  assert.equal(pub.notes, '');
  assert.equal(pub.has_gated_pricing, true);
});

test('publicPricing handles legacy pricing blocks with no structured entries', () => {
  const pub = publicPricing({ model: 'Subscription', range: '$99/mo', buy: true }, 'public')!;
  assert.equal(pub.range, '$99/mo');
  assert.deepEqual(pub.models, []);
  assert.equal(pub.has_gated_pricing, false);
  assert.equal(publicPricing(null, 'public'), null);
});

test('normalizeListingInput preserves structured pricing alongside legacy keys', () => {
  const patch = normalizeListingInput('product', {
    name: 'Forklift',
    pricing: {
      model: 'Per unit', range: '$15k-$40k', buy: true, rent: false, lease: false, notes: '',
      visibility: 'signed_in',
      models: [model()],
      components: [{ id: 'pc_1', name: 'Delivery', amount: '80', visibility: 'public' }],
    },
  });
  const p = patch.pricing as Record<string, unknown>;
  assert.equal(p.range, '$15k-$40k');
  assert.equal(p.visibility, 'signed_in');
  assert.equal((p.models as unknown[]).length, 1);
  assert.equal((p.components as unknown[]).length, 1);
});

test('quantity tiers normalize, format, and drop incomplete rows', () => {
  const [m] = cleanPriceModels([model({
    tiers: [
      { min_qty: '1', max_qty: '9', unit_amount: '100' },
      { min_qty: '10', max_qty: '49', unit_amount: '$90' },
      { min_qty: '50', max_qty: '', unit_amount: '75' },
      { min_qty: '', max_qty: '99', unit_amount: '60' },   // no min → dropped
      { min_qty: '100', max_qty: '', unit_amount: '' },    // no price → dropped
    ],
  })]);
  assert.equal(m.tiers.length, 3);
  assert.equal(tierLine(m.tiers[0]), '1–9 units: $100 each');
  assert.equal(tierLine(m.tiers[1]), '10–49 units: $90 each');
  assert.equal(tierLine(m.tiers[2]), '50+ units: $75 each');
});

test('publicMinPrice picks the lowest public number, ignoring gated and quote-only', () => {
  assert.equal(publicMinPrice({
    visibility: 'public',
    models: [
      model({ amount: '450', visibility: 'public', tiers: [{ min_qty: '50', max_qty: '', unit_amount: '75' }] }),
      model({ id: 'b', amount: '5', visibility: 'private' }),          // gated → ignored
      model({ id: 'c', method: 'quote', amount: '', visibility: 'public' }), // quote-only → ignored
    ],
    components: [],
  }), 75);
  // Legacy range fallback with k-suffix.
  assert.equal(publicMinPrice({ range: '$15k-$40k', visibility: 'public', models: [], components: [] }), 15000);
  // Quote-only listing → null.
  assert.equal(publicMinPrice({ visibility: 'public', models: [], components: [] }), null);
  // Gated legacy range → null, not a leak.
  assert.equal(publicMinPrice({ range: '$5,000', visibility: 'private', models: [], components: [] }), null);
});

test('normalizeListingInput rejects unknown visibility on the block', () => {
  const patch = normalizeListingInput('service', {
    name: 'Maintenance', pricing: { visibility: 'nope', models: [], components: [] },
  });
  assert.equal((patch.pricing as Record<string, unknown>).visibility, 'public');
});
