import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifySourceType,
  extractProblemsSolved,
  parseBingRssXml,
} from '@/lib/intelligence/industry-scan';

test('parseBingRssXml parses item entries from rss xml', () => {
  const xml = `
    <rss><channel>
      <item>
        <title>Acme Logistics Platform</title>
        <link>https://example.com/acme</link>
        <description>Route optimization software for fleet teams.</description>
      </item>
      <item>
        <title>Beta Supply Chain Tools</title>
        <link>https://beta.example.com/solutions</link>
        <description>Visibility and tracking platform.</description>
      </item>
    </channel></rss>
  `;

  const items = parseBingRssXml(xml);

  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, 'Acme Logistics Platform');
  assert.equal(items[0]?.link, 'https://example.com/acme');
  assert.equal(items[1]?.title, 'Beta Supply Chain Tools');
});

test('classifySourceType identifies white papers and case studies', () => {
  const whitepaper = classifySourceType({
    title: '2026 Mobility White Paper PDF',
    link: 'https://example.org/research/mobility-white-paper.pdf',
  });
  const caseStudy = classifySourceType({
    title: 'Transit Modernization Case Study',
    link: 'https://example.com/case-studies/transit-modernization',
  });
  const company = classifySourceType({
    title: 'Acme Platform | Route Automation',
    link: 'https://acme.com/products/route-optimization',
  });

  assert.equal(whitepaper, 'whitepaper');
  assert.equal(caseStudy, 'case_study');
  assert.equal(company, 'company');
});

test('extractProblemsSolved captures solution/problem statements', () => {
  const text =
    'Acme platform helps fleets reduce fuel cost and improve route planning. ' +
    'The product solves dispatch delays and manual scheduling bottlenecks. ' +
    'It also prevents downtime by automating maintenance alerts.';

  const problems = extractProblemsSolved(text);

  assert.ok(problems.length > 0);
  assert.ok(problems.some((entry) => /reduce fuel cost/i.test(entry)));
});
