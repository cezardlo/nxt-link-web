import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeWhitepaperInput } from '@/lib/intelligence/whitepaper-analysis';

test('analyzeWhitepaperInput extracts trends and graph nodes', () => {
  const input = `
    Acme Transit raised $12M in Series A to expand route optimization and fleet analytics.
    The report highlights dispatch visibility, delivery delays, and fuel waste across the fleet.
    A second startup, Cargo Flow, secured $4M seed funding for predictive maintenance sensors.
  `;

  const result = analyzeWhitepaperInput(input, {
    industry_focus: 'Logistics',
    region: 'El Paso, Texas, USA',
  });

  assert.ok(result.trends.length >= 1);
  assert.ok(result.startups.length >= 1);
  assert.ok(result.graph.nodes.length >= 3);
  assert.ok(result.graph.edges.length >= 2);
  assert.ok(result.summary.length > 10);
});

test('analyzeWhitepaperInput returns fallback startup insight when funding not found', () => {
  const input = `
    This document describes operating models for regional waste reduction and utility usage.
    It discusses pilot design, KPI instrumentation, and process optimization steps.
  `;

  const result = analyzeWhitepaperInput(input, {
    industry_focus: 'Utilities',
    region: 'El Paso, Texas, USA',
  });

  assert.equal(result.startups[0]?.funding_stage, 'N/A');
  assert.ok(result.recommended_actions.length >= 3);
});
