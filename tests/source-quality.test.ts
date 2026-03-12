import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLowTrustDomain,
  sourceDomainCredibility,
  sourceTierFromUrl,
  sourceTrustScore,
  topicalRelevanceScore,
} from '@/lib/intelligence/source-quality';

test('sourceDomainCredibility rewards trusted technical domains', () => {
  const trusted = sourceDomainCredibility('https://arxiv.org/abs/2401.12345', 'whitepaper');
  const lowTrust = sourceDomainCredibility('https://www.merriam-webster.com/dictionary/supply', 'whitepaper');

  assert.ok(trusted > lowTrust);
  assert.ok(trusted >= 0.7);
});

test('topicalRelevanceScore favors explicit topic overlap', () => {
  const relevant = topicalRelevanceScore(
    'Fleet route optimization software reduces delivery delays in Mexico and the United States.',
    'route optimization',
    'Mexico',
  );
  const unrelated = topicalRelevanceScore(
    'General language definitions and unrelated dictionary entries.',
    'route optimization',
    'Mexico',
  );

  assert.ok(relevant > unrelated);
  assert.ok(relevant >= 0.45);
});

test('sourceTrustScore penalizes low-trust off-topic sources', () => {
  const highTrust = sourceTrustScore({
    url: 'https://www.ibm.com/industries/transportation/route-optimization',
    source_type: 'company',
    text: 'IBM route optimization platform improves fleet dispatch efficiency across Mexico.',
    industry: 'route optimization',
    region: 'Mexico',
  });

  const lowTrust = sourceTrustScore({
    url: 'https://www.reddit.com/r/example/comments/123',
    source_type: 'case_study',
    text: 'A random thread with no concrete product details.',
    industry: 'route optimization',
    region: 'Mexico',
  });

  assert.ok(highTrust > lowTrust);
  assert.equal(isLowTrustDomain('https://www.reddit.com/r/example/comments/123'), true);
});

test('sourceTierFromUrl classifies official and community tiers', () => {
  assert.equal(sourceTierFromUrl('https://www.energy.gov/eere'), 'official');
  assert.equal(sourceTierFromUrl('https://www.reddit.com/r/logistics'), 'community');
});
