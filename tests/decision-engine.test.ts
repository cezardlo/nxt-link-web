import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decisionEngineInputSchema,
  decisionPackToMarkdown,
  generateDecisionPack,
} from '@/lib/decision-engine';

test('generateDecisionPack returns a structured Phase 1 pack', () => {
  const input = decisionEngineInputSchema.parse({
    company_name: 'Border Freight Co',
    industry: 'Logistics',
    city: 'El Paso, Texas',
    problem_statement:
      'Manual dispatch and route planning are causing late deliveries and fuel waste. We need measurable reductions quickly.',
    current_process: 'Schedulers use spreadsheets and phone calls for dispatch updates.',
    kpi_name: 'Fuel cost per route',
    baseline_value: 100,
    target_improvement_percent: 20,
    budget_ceiling_usd: 30000,
    timeline_days: 45,
    constraints: ['Limited staff'],
  });

  const pack = generateDecisionPack(input, [
    {
      id: 'v1',
      name: 'RoutePilot',
      tags: 'route optimization, fleet analytics, dispatch',
      website: 'https://routepilot.example.com',
      typicalMinCost: 8000,
      typicalMaxCost: 22000,
      notes: null,
    },
    {
      id: 'v2',
      name: 'WaterSense',
      tags: 'water monitoring, filtration',
      website: null,
      typicalMinCost: 5000,
      typicalMaxCost: 10000,
      notes: null,
    },
  ]);

  assert.equal(pack.company_profile.company_name, 'Border Freight Co');
  assert.equal(pack.pilot_blueprint.kpi.target_value, 80);
  assert.equal(pack.pilot_blueprint.phases.length, 4);
  assert.ok(pack.interpreted_problem.urgency_score >= 1);
  assert.ok(pack.interpreted_problem.urgency_score <= 10);
  assert.equal(pack.vendor_recommendations[0]?.vendor_name, 'RoutePilot');
});

test('decisionPackToMarkdown renders key sections', () => {
  const input = decisionEngineInputSchema.parse({
    company_name: 'Mesa Logistics',
    industry: 'Logistics',
    city: 'El Paso, Texas',
    problem_statement:
      'Fleet downtime and manual workflows are creating delays and high delivery costs across operations.',
    current_process: 'Manual tracking and weekly spreadsheet reviews.',
    kpi_name: 'Late deliveries per week',
    baseline_value: 50,
    target_improvement_percent: 30,
    budget_ceiling_usd: 20000,
    timeline_days: 45,
    constraints: ['Legacy tools'],
  });

  const pack = generateDecisionPack(input, []);
  const markdown = decisionPackToMarkdown(pack);

  assert.ok(markdown.includes('# NXT Link Decision Pack'));
  assert.ok(markdown.includes('## Executive Summary'));
  assert.ok(markdown.includes('## Pilot Blueprint'));
  assert.ok(markdown.includes('## Vendor Recommendations'));
});
