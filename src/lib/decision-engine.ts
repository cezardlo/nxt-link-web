import { z } from 'zod';

export const decisionEngineInputSchema = z.object({
  company_name: z.string().trim().min(2),
  industry: z.string().trim().min(2),
  city: z.string().trim().min(2).default('El Paso, Texas'),
  problem_statement: z.string().trim().min(40),
  current_process: z.string().trim().min(10).optional().default(''),
  kpi_name: z.string().trim().min(2),
  baseline_value: z.coerce.number().finite().nonnegative(),
  target_improvement_percent: z.coerce.number().min(1).max(95),
  budget_ceiling_usd: z.coerce.number().positive(),
  timeline_days: z.coerce.number().int().min(14).max(90).default(45),
  constraints: z.array(z.string().trim().min(2)).max(8).default([]),
  additional_notes: z.string().trim().optional().default(''),
});

export type DecisionEngineInput = z.infer<typeof decisionEngineInputSchema>;

export type DecisionVendorCandidate = {
  id: string;
  name: string;
  tags: string;
  website: string | null;
  typicalMinCost: number | null;
  typicalMaxCost: number | null;
  notes: string | null;
};

export type DecisionPack = {
  pack_id: string;
  generated_at: string;
  company_profile: {
    company_name: string;
    industry: string;
    city: string;
  };
  interpreted_problem: {
    normalized_problem: string;
    root_causes: string[];
    strategic_themes: string[];
    measurable_goal: string;
    urgency_score: number;
    risk_flags: string[];
  };
  pilot_blueprint: {
    duration_days: number;
    kpi: {
      name: string;
      baseline_value: number;
      target_value: number;
      target_improvement_percent: number;
    };
    budget_guardrails: {
      ceiling_usd: number;
      recommended_pilot_min_usd: number;
      recommended_pilot_max_usd: number;
    };
    phases: Array<{
      phase: string;
      days: string;
      objectives: string[];
      deliverables: string[];
    }>;
    success_criteria: string[];
  };
  vendor_recommendations: Array<{
    vendor_id: string;
    vendor_name: string;
    fit_score: number;
    cost_estimate_usd: string;
    rationale: string;
    website: string | null;
  }>;
  decision_pack: {
    executive_summary: string;
    monetization_focus: string;
    next_actions: string[];
    go_no_go_criteria: string[];
  };
};

const THEME_MAP: Array<{ theme: string; keywords: string[] }> = [
  {
    theme: 'Route Optimization',
    keywords: ['route', 'delivery', 'dispatch', 'miles', 'fleet', 'fuel'],
  },
  {
    theme: 'Water Efficiency',
    keywords: ['water', 'leak', 'wastewater', 'gallon', 'irrigation', 'filtration'],
  },
  {
    theme: 'Energy Efficiency',
    keywords: ['energy', 'electricity', 'utility', 'power', 'solar', 'demand'],
  },
  {
    theme: 'Inventory Intelligence',
    keywords: ['inventory', 'stockout', 'warehouse', 'forecast', 'sku', 'supply'],
  },
  {
    theme: 'Operational Automation',
    keywords: ['manual', 'spreadsheet', 'handoff', 'backlog', 'error', 'rework'],
  },
  {
    theme: 'Predictive Maintenance',
    keywords: ['maintenance', 'downtime', 'equipment', 'failure', 'asset', 'repair'],
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function summarizeProblem(problemStatement: string): string {
  const text = problemStatement.trim().replace(/\s+/g, ' ');
  if (text.length <= 220) {
    return text;
  }
  return `${text.slice(0, 217)}...`;
}

function detectThemes(problemStatement: string, industry: string): string[] {
  const merged = `${problemStatement} ${industry}`;
  const tokens = tokenize(merged);
  const tokenSet = new Set(tokens);

  const ranked = THEME_MAP.map(({ theme, keywords }) => {
    const score = keywords.reduce((acc, keyword) => (tokenSet.has(keyword) ? acc + 1 : acc), 0);
    return { theme, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.theme);

  if (ranked.length > 0) {
    return ranked;
  }

  return ['Operational Automation'];
}

function buildRootCauses(problemStatement: string, constraints: string[]): string[] {
  const normalized = problemStatement.toLowerCase();
  const causes: string[] = [];

  if (normalized.includes('manual') || normalized.includes('spreadsheet')) {
    causes.push('Manual workflows increase cycle time and error rate.');
  }
  if (normalized.includes('delay') || normalized.includes('late')) {
    causes.push('Process delays are compounding downstream operations.');
  }
  if (normalized.includes('cost') || normalized.includes('budget')) {
    causes.push('Cost leakage is not being isolated by process step.');
  }
  if (normalized.includes('visibility') || normalized.includes('unknown')) {
    causes.push('Operational visibility is insufficient for rapid decisions.');
  }
  if (constraints.some((constraint) => constraint.toLowerCase().includes('staff'))) {
    causes.push('Staff capacity limits are constraining execution speed.');
  }

  if (causes.length === 0) {
    causes.push('Existing process design is not meeting current throughput demands.');
  }

  return causes.slice(0, 4);
}

function buildRiskFlags(input: DecisionEngineInput, themes: string[]): string[] {
  const flags: string[] = [];

  if (input.budget_ceiling_usd < 5000) {
    flags.push('Budget ceiling may restrict vendor shortlist depth.');
  }
  if (input.timeline_days < 30) {
    flags.push('Short pilot timeline increases execution pressure.');
  }
  if (input.constraints.length >= 4) {
    flags.push('High number of operational constraints may slow pilot setup.');
  }
  if (themes.includes('Operational Automation') && !input.current_process) {
    flags.push('Current process details are limited; baseline instrumentation risk.');
  }

  return flags.slice(0, 4);
}

function computeUrgencyScore(input: DecisionEngineInput, riskFlagsCount: number): number {
  let score = 4;
  const text = `${input.problem_statement} ${input.current_process}`.toLowerCase();

  const urgencyKeywords = ['urgent', 'critical', 'loss', 'downtime', 'penalty', 'breach'];
  for (const keyword of urgencyKeywords) {
    if (text.includes(keyword)) {
      score += 1;
    }
  }

  if (input.target_improvement_percent >= 20) {
    score += 1;
  }
  if (input.timeline_days <= 45) {
    score += 1;
  }
  score += Math.min(2, riskFlagsCount);

  return clamp(score, 1, 10);
}

function buildPhases(input: DecisionEngineInput, themes: string[]) {
  const discoveryDays = Math.max(4, Math.round(input.timeline_days * 0.2));
  const setupDays = Math.max(5, Math.round(input.timeline_days * 0.2));
  const validationDays = Math.max(5, Math.round(input.timeline_days * 0.2));
  const experimentDays = Math.max(
    7,
    input.timeline_days - discoveryDays - setupDays - validationDays,
  );

  return [
    {
      phase: 'Phase 1: Baseline and Alignment',
      days: `Day 1-${discoveryDays}`,
      objectives: [
        `Instrument baseline ${input.kpi_name.toLowerCase()} measurements.`,
        'Align pilot scope with client operations and constraints.',
      ],
      deliverables: [
        'Baseline KPI snapshot',
        'Pilot charter with owner matrix',
      ],
    },
    {
      phase: 'Phase 2: Solution Configuration',
      days: `Day ${discoveryDays + 1}-${discoveryDays + setupDays}`,
      objectives: [
        `Configure workflows for ${themes[0] || 'priority operations'} outcomes.`,
        'Finalize implementation checklist and safety controls.',
      ],
      deliverables: [
        'Configured pilot environment',
        'Operator enablement checklist',
      ],
    },
    {
      phase: 'Phase 3: Live Pilot Execution',
      days: `Day ${discoveryDays + setupDays + 1}-${
        discoveryDays + setupDays + experimentDays
      }`,
      objectives: [
        'Run controlled pilot with weekly checkpoint reviews.',
        'Track KPI drift and intervention effects in real time.',
      ],
      deliverables: [
        'Weekly pilot readouts',
        'Issue and mitigation log',
      ],
    },
    {
      phase: 'Phase 4: Decision Readout',
      days: `Day ${input.timeline_days - validationDays + 1}-${input.timeline_days}`,
      objectives: [
        'Validate achieved KPI delta against target.',
        'Prepare scale/extend/stop recommendation.',
      ],
      deliverables: [
        'Decision pack and executive summary',
        'Scale plan with resource assumptions',
      ],
    },
  ];
}

function formatCurrencyRange(min: number | null, max: number | null): string {
  if (min === null && max === null) {
    return 'Not specified';
  }
  if (min !== null && max !== null) {
    return `$${Math.round(min).toLocaleString()}-$${Math.round(max).toLocaleString()}`;
  }
  if (min !== null) {
    return `From $${Math.round(min).toLocaleString()}`;
  }
  return `Up to $${Math.round(max as number).toLocaleString()}`;
}

function scoreVendor(
  vendor: DecisionVendorCandidate,
  themes: string[],
  budgetCeiling: number,
): { score: number; rationale: string } {
  const tagTokens = new Set(tokenize(vendor.tags));
  const themeTokens = new Set(tokenize(themes.join(' ')));

  let score = 40;
  let overlap = 0;
  themeTokens.forEach((token) => {
    if (tagTokens.has(token)) {
      overlap += 1;
    }
  });
  score += overlap * 12;

  if (vendor.typicalMinCost !== null && vendor.typicalMinCost <= budgetCeiling) {
    score += 14;
  }
  if (vendor.typicalMaxCost !== null && vendor.typicalMaxCost <= budgetCeiling) {
    score += 14;
  }
  if (vendor.typicalMinCost !== null && vendor.typicalMinCost > budgetCeiling) {
    score -= 22;
  }
  if (vendor.website) {
    score += 4;
  }

  const normalized = clamp(Math.round(score), 1, 100);
  const rationaleParts = [
    overlap > 0
      ? `Theme match across ${overlap} keyword(s).`
      : 'Low direct keyword overlap; scored on general fit.',
    vendor.typicalMinCost !== null || vendor.typicalMaxCost !== null
      ? `Cost band ${formatCurrencyRange(vendor.typicalMinCost, vendor.typicalMaxCost)}.`
      : 'No cost band provided.',
  ];

  return {
    score: normalized,
    rationale: rationaleParts.join(' '),
  };
}

function buildVendorRecommendations(
  vendors: DecisionVendorCandidate[],
  themes: string[],
  budgetCeiling: number,
): DecisionPack['vendor_recommendations'] {
  return vendors
    .map((vendor) => {
      const evaluated = scoreVendor(vendor, themes, budgetCeiling);
      return {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        fit_score: evaluated.score,
        cost_estimate_usd: formatCurrencyRange(vendor.typicalMinCost, vendor.typicalMaxCost),
        rationale: evaluated.rationale,
        website: vendor.website,
      };
    })
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 5);
}

function companySlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);
}

export function generateDecisionPack(
  input: DecisionEngineInput,
  vendors: DecisionVendorCandidate[],
): DecisionPack {
  const strategicThemes = detectThemes(input.problem_statement, input.industry);
  const rootCauses = buildRootCauses(input.problem_statement, input.constraints);
  const riskFlags = buildRiskFlags(input, strategicThemes);
  const urgencyScore = computeUrgencyScore(input, riskFlags.length);

  const targetValue = Number(
    (input.baseline_value * (1 - input.target_improvement_percent / 100)).toFixed(2),
  );

  const recommendedPilotMax = Math.round(input.budget_ceiling_usd * 0.85);
  const recommendedPilotMin = Math.round(Math.max(1500, recommendedPilotMax * 0.5));

  const vendorRecommendations = buildVendorRecommendations(
    vendors,
    strategicThemes,
    input.budget_ceiling_usd,
  );

  const executiveSummary = [
    `${input.company_name} should run a ${input.timeline_days}-day decision pilot focused on ${strategicThemes[0].toLowerCase()}.`,
    `Target outcome: improve ${input.kpi_name.toLowerCase()} by ${input.target_improvement_percent}% from ${input.baseline_value} to ${targetValue}.`,
    vendorRecommendations.length > 0
      ? `Top vendor fit: ${vendorRecommendations[0].vendor_name} (score ${vendorRecommendations[0].fit_score}/100).`
      : 'No vendors matched from current registry; discovery sprint required before pilot launch.',
  ].join(' ');

  const nextActions = [
    'Confirm KPI instrumentation owner and weekly review cadence.',
    'Run vendor discovery and shortlisting against strategic themes.',
    'Issue pilot charter and begin baseline measurement window.',
  ];

  if (input.constraints.length > 0) {
    nextActions.push(`Mitigate constraints: ${input.constraints.slice(0, 3).join('; ')}.`);
  }

  const goNoGoCriteria = [
    `KPI improvement reaches at least ${Math.max(
      5,
      Math.round(input.target_improvement_percent * 0.7),
    )}% by pilot close.`,
    'No unresolved high-severity operational incidents.',
    'Measured monthly benefit supports payback period under 12 months.',
  ];

  return {
    pack_id: `dp-${companySlug(input.company_name)}-${Date.now()}`,
    generated_at: new Date().toISOString(),
    company_profile: {
      company_name: input.company_name,
      industry: titleCase(input.industry),
      city: titleCase(input.city),
    },
    interpreted_problem: {
      normalized_problem: summarizeProblem(input.problem_statement),
      root_causes: rootCauses,
      strategic_themes: strategicThemes,
      measurable_goal: `Reduce ${input.kpi_name} from ${input.baseline_value} to ${targetValue} within ${input.timeline_days} days.`,
      urgency_score: urgencyScore,
      risk_flags: riskFlags,
    },
    pilot_blueprint: {
      duration_days: input.timeline_days,
      kpi: {
        name: input.kpi_name,
        baseline_value: input.baseline_value,
        target_value: targetValue,
        target_improvement_percent: input.target_improvement_percent,
      },
      budget_guardrails: {
        ceiling_usd: Math.round(input.budget_ceiling_usd),
        recommended_pilot_min_usd: recommendedPilotMin,
        recommended_pilot_max_usd: recommendedPilotMax,
      },
      phases: buildPhases(input, strategicThemes),
      success_criteria: goNoGoCriteria,
    },
    vendor_recommendations: vendorRecommendations,
    decision_pack: {
      executive_summary: executiveSummary,
      monetization_focus: 'Phase 1 Decision Engine: close first paying client via decision packs.',
      next_actions: nextActions.slice(0, 4),
      go_no_go_criteria: goNoGoCriteria,
    },
  };
}

function listToMarkdown(items: string[]): string {
  if (items.length === 0) {
    return '- None';
  }
  return items.map((item) => `- ${item}`).join('\n');
}

export function decisionPackToMarkdown(pack: DecisionPack): string {
  const vendorRows =
    pack.vendor_recommendations.length === 0
      ? 'No vendor recommendations generated.'
      : pack.vendor_recommendations
          .map(
            (vendor, index) =>
              `${index + 1}. ${vendor.vendor_name} (fit ${vendor.fit_score}/100) | ${vendor.cost_estimate_usd}`,
          )
          .join('\n');

  const phases = pack.pilot_blueprint.phases
    .map(
      (phase) =>
        `### ${phase.phase}\n` +
        `Timeline: ${phase.days}\n` +
        `Objectives:\n${listToMarkdown(phase.objectives)}\n` +
        `Deliverables:\n${listToMarkdown(phase.deliverables)}`,
    )
    .join('\n\n');

  return (
    `# NXT Link Decision Pack\n\n` +
    `Pack ID: ${pack.pack_id}\n` +
    `Generated At: ${pack.generated_at}\n\n` +
    `## Company\n` +
    `- Name: ${pack.company_profile.company_name}\n` +
    `- Industry: ${pack.company_profile.industry}\n` +
    `- City: ${pack.company_profile.city}\n\n` +
    `## Executive Summary\n${pack.decision_pack.executive_summary}\n\n` +
    `## Problem Interpreter\n` +
    `- Normalized Problem: ${pack.interpreted_problem.normalized_problem}\n` +
    `- Measurable Goal: ${pack.interpreted_problem.measurable_goal}\n` +
    `- Urgency Score: ${pack.interpreted_problem.urgency_score}/10\n` +
    `- Strategic Themes: ${pack.interpreted_problem.strategic_themes.join(', ')}\n` +
    `- Root Causes:\n${listToMarkdown(pack.interpreted_problem.root_causes)}\n` +
    `- Risk Flags:\n${listToMarkdown(pack.interpreted_problem.risk_flags)}\n\n` +
    `## Pilot Blueprint\n` +
    `- Duration: ${pack.pilot_blueprint.duration_days} days\n` +
    `- KPI: ${pack.pilot_blueprint.kpi.name}\n` +
    `- Baseline: ${pack.pilot_blueprint.kpi.baseline_value}\n` +
    `- Target: ${pack.pilot_blueprint.kpi.target_value}\n` +
    `- Budget Ceiling: $${pack.pilot_blueprint.budget_guardrails.ceiling_usd.toLocaleString()}\n` +
    `- Recommended Pilot Range: $${pack.pilot_blueprint.budget_guardrails.recommended_pilot_min_usd.toLocaleString()}-$${pack.pilot_blueprint.budget_guardrails.recommended_pilot_max_usd.toLocaleString()}\n\n` +
    `${phases}\n\n` +
    `## Vendor Recommendations\n${vendorRows}\n\n` +
    `## Go / No-Go Criteria\n${listToMarkdown(pack.decision_pack.go_no_go_criteria)}\n\n` +
    `## Next Actions\n${listToMarkdown(pack.decision_pack.next_actions)}\n`
  );
}
