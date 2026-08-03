import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceUSD } from '@/lib/marketplace/price';

describe('parsePriceUSD', () => {
  it('parses explicit dollar amounts with commas', () => {
    assert.equal(parsePriceUSD('$45,000'), 45_000);
  });

  it('parses k/m suffixes on dollar amounts', () => {
    assert.equal(parsePriceUSD('$45k'), 45_000);
    assert.equal(parsePriceUSD('$1.5m'), 1_500_000);
  });

  it('prefers the $-prefixed number over an earlier bare number', () => {
    // Regression guard: the old regex grabbed the first bare number.
    assert.equal(parsePriceUSD('Sold in lots of 24, $45,000/lot'), 45_000);
  });

  it('falls back to a bare number when no $ is present', () => {
    assert.equal(parsePriceUSD('24 units'), 24);
    assert.equal(parsePriceUSD('starting at 12000'), 12_000);
  });

  it('returns null for text with no numbers', () => {
    assert.equal(parsePriceUSD('Call for quote'), null);
    assert.equal(parsePriceUSD('Contact us'), null);
  });

  it('handles spacing around the dollar sign', () => {
    assert.equal(parsePriceUSD('$ 45 000'), 45_000);
  });
});
