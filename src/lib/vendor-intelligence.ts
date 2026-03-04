import { z } from 'zod';

import type { ProviderUsageSummary } from '@/lib/llm/parallel-router';
import { runParallelJsonEnsemble, runParallelJsonTaskBatch } from '@/lib/llm/parallel-router';
import { boundedDataPrompt, sanitizeUntrustedLlmInput } from '@/lib/llm/sanitize';
import { getSupabaseClient } from '@/lib/supabase/client';

const CATEGORY_OPTIONS = [
  'Route Optimization',
  'Fleet Management',
  'Cold Chain',
  'RFID Tracking',
  'Warehouse Robotics',
  'Inventory Intelligence',
  'Last Mile Delivery',
  'Water Filtration',
  'Water Monitoring',
  'Irrigation Tech',
  'Energy Management',
  'Solar Integration',
  'Grid Technology',
  'Predictive Maintenance',
  'AI Analytics',
  'SaaS Platform',
  'IoT Infrastructure',
  'Supply Chain Visibility',
  'Precision Agriculture',
  'Environmental Monitoring',
  'Workforce Automation',
  'Cybersecurity',
  'Compliance Tech',
  'Drone Technology',
  'EV Infrastructure',
  'Other',
] as const;

const TECHNOLOGY_OPTIONS = [
  'AI',
  'SaaS',
  'Robotics',
  'IoT',
  'Hardware',
  'Materials',
  'Analytics',
  'Infrastructure',
  'Energy',
  'Biotech',
  'Other',
] as const;

const HARDWARE_SOFTWARE_OPTIONS = ['Hardware', 'Software', 'Hybrid'] as const;
const COMPANY_STAGE_OPTIONS = ['Emerging', 'Scaling', 'Mature', 'Unknown'] as const;
const CAPITAL_OPTIONS = ['Low', 'Medium', 'High'] as const;
const COMPLEXITY_OPTIONS = ['Low', 'Medium', 'High'] as const;
const CLIMATE_OPTIONS = ['Yes', 'Risk', 'Unknown'] as const;
const SMB_OPTIONS = ['Yes', 'No', 'Partial'] as const;

const SIGNAL_OPTIONS = [
  'recently_funded',
  'government_grant_recipient',
  'major_conference_exhibitor',
  'multiple_source_mentions',
  'patent_activity',
  'new_product_launch',
  'rapid_market_growth_alignment',
  'partnership_announced',
  'award_recipient',
  'accelerator_graduate',
  'pilot_program_active',
] as const;

const GAP_OPTIONS = [
  'high_signal_low_deployment',
  'high_capital_barrier',
  'no_smb_options',
  'emerging_category_no_mature_players',
  'climate_risk_category',
  'skill_gap_barrier',
  'single_vendor_dependency',
] as const;

const SOURCE_OPTIONS = [
  'website',
  'conference',
  'grant',
  'directory',
  'news',
  'funding',
] as const;

const inputSchema = z.object({
  source_type: z.enum(SOURCE_OPTIONS),
  industry_focus: z.string().trim().min(2),
  region: z.string().trim().min(2).default('El Paso, Texas, USA'),
  date_scraped: z.string().trim().min(8),
  raw_text: z.string().trim().min(80),
  persist_to_supabase: z.boolean().default(true),
});

const looseOutputSchema = z.object({
  run_metadata: z.object({
    source_type: z.string().nullable(),
    industry_focus: z.string().nullable(),
    region: z.string().nullable(),
    date_scraped: z.string().nullable(),
    total_detected: z.coerce.number().int().nonnegative(),
    total_valid: z.coerce.number().int().nonnegative(),
    total_rejected: z.coerce.number().int().nonnegative(),
  }),
  vendors: z.array(
    z.object({
      company_name: z.string().nullable(),
      company_url: z.string().nullable(),
      product_name: z.string().nullable(),
      description: z.string().nullable(),
      primary_category: z.string().nullable(),
      secondary_categories: z.array(z.string()).default([]),
      technology_type: z.string().nullable(),
      hardware_or_software: z.string().nullable(),
      company_stage: z.string().nullable(),
      geographic_origin: z.string().nullable(),
      signal_flags: z.array(z.string()).default([]),
      signal_score: z.coerce.number().int().min(0).max(10),
      signal_reasoning: z.string().nullable(),
      capital_intensity: z.string().nullable(),
      implementation_complexity: z.string().nullable(),
      skill_requirement: z.string().nullable(),
      climate_compatibility: z.string().nullable(),
      smb_suitability: z.string().nullable(),
      deployment_readiness_score: z.coerce.number().int().min(0).max(10),
      deployment_reasoning: z.string().nullable(),
      fit_score: z.coerce.number().int().min(0).max(10),
      fit_reasoning: z.string().nullable(),
      rejection_reason: z.string().nullable(),
      extraction_confidence: z.coerce.number().min(0).max(1),
    }),
  ),
  rejected_entries: z.array(
    z.object({
      name: z.string().nullable(),
      url: z.string().nullable(),
      rejection_reason: z.string().nullable(),
    }),
  ),
  top_candidates: z.object({
    highest_signal: z.array(z.string()),
    most_deployable: z.array(z.string()),
    best_overall_fit: z.array(z.string()),
  }),
  gap_opportunities: z.array(
    z.object({
      category: z.string().nullable(),
      description: z.string().nullable(),
      gap_type: z.string().nullable(),
      opportunity_score: z.coerce.number().int().min(0).max(10),
    }),
  ),
  run_summary: z.string().nullable(),
});

type IntelligenceVendor = {
  company_name: string | null;
  company_url: string | null;
  product_name: string | null;
  description: string | null;
  primary_category: (typeof CATEGORY_OPTIONS)[number];
  secondary_categories: Array<(typeof CATEGORY_OPTIONS)[number]>;
  technology_type: (typeof TECHNOLOGY_OPTIONS)[number];
  hardware_or_software: (typeof HARDWARE_SOFTWARE_OPTIONS)[number];
  company_stage: (typeof COMPANY_STAGE_OPTIONS)[number];
  geographic_origin: string | null;
  signal_flags: Array<(typeof SIGNAL_OPTIONS)[number]>;
  signal_score: number;
  signal_reasoning: string | null;
  capital_intensity: (typeof CAPITAL_OPTIONS)[number];
  implementation_complexity: (typeof COMPLEXITY_OPTIONS)[number];
  skill_requirement: (typeof COMPLEXITY_OPTIONS)[number];
  climate_compatibility: (typeof CLIMATE_OPTIONS)[number];
  smb_suitability: (typeof SMB_OPTIONS)[number];
  deployment_readiness_score: number;
  deployment_reasoning: string | null;
  fit_score: number;
  fit_reasoning: string | null;
  rejection_reason: string | null;
  extraction_confidence: number;
};

export type VendorIntelligenceRun = {
  run_metadata: {
    source_type: string;
    industry_focus: string;
    region: string;
    date_scraped: string;
    total_detected: number;
    total_valid: number;
    total_rejected: number;
  };
  vendors: IntelligenceVendor[];
  rejected_entries: Array<{
    name: string | null;
    url: string | null;
    rejection_reason: string;
  }>;
  top_candidates: {
    highest_signal: string[];
    most_deployable: string[];
    best_overall_fit: string[];
  };
  gap_opportunities: Array<{
    category: string | null;
    description: string | null;
    gap_type: (typeof GAP_OPTIONS)[number];
    opportunity_score: number;
  }>;
  run_summary: string;
};

type PersistenceSummary = {
  attempted: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
};

const systemPrompt = `You are the NXT LINK Vendor Intelligence Engine.
Return one valid JSON object only.
Never fabricate data. If unknown, return null.
No markdown.
No explanations.
Use this exact output shape:
{
  "run_metadata": {
    "source_type": "",
    "industry_focus": "",
    "region": "",
    "date_scraped": "",
    "total_detected": 0,
    "total_valid": 0,
    "total_rejected": 0
  },
  "vendors": [
    {
      "company_name": "",
      "company_url": "",
      "product_name": "",
      "description": "",
      "primary_category": "",
      "secondary_categories": [],
      "technology_type": "",
      "hardware_or_software": "",
      "company_stage": "",
      "geographic_origin": "",
      "signal_flags": [],
      "signal_score": 0,
      "signal_reasoning": "",
      "capital_intensity": "",
      "implementation_complexity": "",
      "skill_requirement": "",
      "climate_compatibility": "",
      "smb_suitability": "",
      "deployment_readiness_score": 0,
      "deployment_reasoning": "",
      "fit_score": 0,
      "fit_reasoning": "",
      "rejection_reason": null,
      "extraction_confidence": 0.0
    }
  ],
  "rejected_entries": [
    {
      "name": "",
      "url": "",
      "rejection_reason": ""
    }
  ],
  "top_candidates": {
    "highest_signal": [],
    "most_deployable": [],
    "best_overall_fit": []
  },
  "gap_opportunities": [
    {
      "category": "",
      "description": "",
      "gap_type": "",
      "opportunity_score": 0
    }
  ],
  "run_summary": ""
}
Allowed primary/secondary category values only:
${CATEGORY_OPTIONS.join(' / ')}
Allowed technology_type values only:
${TECHNOLOGY_OPTIONS.join(' / ')}
Allowed hardware_or_software values only:
${HARDWARE_SOFTWARE_OPTIONS.join(' / ')}
Allowed company_stage values only:
${COMPANY_STAGE_OPTIONS.join(' / ')}
Allowed signal_flags values only:
${SIGNAL_OPTIONS.join(' / ')}
Allowed gap_type values only:
${GAP_OPTIONS.join(' / ')}
Score rules:
- signal_score, deployment_readiness_score, fit_score: integer 1..10
- extraction_confidence: float 0..1`;

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(withoutFences) as Record<string, unknown>;
}

const chunkLeadSchema = z.object({
  vendors: z.array(
    z.object({
      company_name: z.string().nullable(),
      company_url: z.string().nullable(),
      product_name: z.string().nullable(),
      description: z.string().nullable(),
      primary_category: z.string().nullable(),
      extraction_confidence: z.coerce.number().min(0).max(1).default(0.5),
      evidence_snippet: z.string().nullable().default(null),
    }),
  ).default([]),
});

const chunkLeadSystemPrompt = `Extract vendor leads from source text.
Return JSON only with shape:
{
  "vendors": [
    {
      "company_name": "",
      "company_url": "",
      "product_name": "",
      "description": "",
      "primary_category": "",
      "extraction_confidence": 0.0,
      "evidence_snippet": ""
    }
  ]
}
Rules:
- Extract only entities that look like real companies or products.
- Max 12 vendors per chunk.
- Do not invent URLs or company names.
- Keep description concise and factual.`;

function normalizeAllowed<T extends readonly string[]>(
  value: string | null | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  const matched = allowed.find((item) => item.toLowerCase() === normalized);
  return matched ?? fallback;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value.trim()).toString();
  } catch {
    return null;
  }
}

function normalizeIntScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(10, Math.round(value)));
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  const bounded = Math.max(0, Math.min(1, value));
  return Number(bounded.toFixed(2));
}

function normalizeVendor(vendor: z.infer<typeof looseOutputSchema>['vendors'][number]): IntelligenceVendor {
  return {
    company_name: vendor.company_name?.trim() || null,
    company_url: normalizeUrl(vendor.company_url),
    product_name: vendor.product_name?.trim() || null,
    description: vendor.description?.trim().slice(0, 600) || null,
    primary_category: normalizeAllowed(vendor.primary_category, CATEGORY_OPTIONS, 'Other'),
    secondary_categories: Array.from(
      new Set(
        (vendor.secondary_categories || [])
          .map((item) => normalizeAllowed(item, CATEGORY_OPTIONS, 'Other'))
          .filter((item) => item !== normalizeAllowed(vendor.primary_category, CATEGORY_OPTIONS, 'Other')),
      ),
    ).slice(0, 5),
    technology_type: normalizeAllowed(vendor.technology_type, TECHNOLOGY_OPTIONS, 'Other'),
    hardware_or_software: normalizeAllowed(
      vendor.hardware_or_software,
      HARDWARE_SOFTWARE_OPTIONS,
      'Software',
    ),
    company_stage: normalizeAllowed(vendor.company_stage, COMPANY_STAGE_OPTIONS, 'Unknown'),
    geographic_origin: vendor.geographic_origin?.trim() || null,
    signal_flags: Array.from(
      new Set(
        (vendor.signal_flags || [])
          .map((flag) => normalizeAllowed(flag, SIGNAL_OPTIONS, 'multiple_source_mentions'))
          .filter(Boolean),
      ),
    ),
    signal_score: normalizeIntScore(vendor.signal_score),
    signal_reasoning: vendor.signal_reasoning?.trim() || null,
    capital_intensity: normalizeAllowed(vendor.capital_intensity, CAPITAL_OPTIONS, 'Medium'),
    implementation_complexity: normalizeAllowed(
      vendor.implementation_complexity,
      COMPLEXITY_OPTIONS,
      'Medium',
    ),
    skill_requirement: normalizeAllowed(vendor.skill_requirement, COMPLEXITY_OPTIONS, 'Medium'),
    climate_compatibility: normalizeAllowed(vendor.climate_compatibility, CLIMATE_OPTIONS, 'Unknown'),
    smb_suitability: normalizeAllowed(vendor.smb_suitability, SMB_OPTIONS, 'Partial'),
    deployment_readiness_score: normalizeIntScore(vendor.deployment_readiness_score),
    deployment_reasoning: vendor.deployment_reasoning?.trim() || null,
    fit_score: normalizeIntScore(vendor.fit_score),
    fit_reasoning: vendor.fit_reasoning?.trim() || null,
    rejection_reason: vendor.rejection_reason?.trim() || null,
    extraction_confidence: normalizeConfidence(vendor.extraction_confidence),
  };
}

function makeTopCandidates(vendors: IntelligenceVendor[]): VendorIntelligenceRun['top_candidates'] {
  const valid = vendors.filter((vendor) => !vendor.rejection_reason && vendor.company_name);

  const bySignal = [...valid]
    .sort((a, b) => b.signal_score - a.signal_score || b.extraction_confidence - a.extraction_confidence)
    .slice(0, 3)
    .map((vendor) => vendor.company_name as string);

  const byDeployable = [...valid]
    .sort(
      (a, b) =>
        b.deployment_readiness_score - a.deployment_readiness_score ||
        b.extraction_confidence - a.extraction_confidence,
    )
    .slice(0, 3)
    .map((vendor) => vendor.company_name as string);

  const byFit = [...valid]
    .sort((a, b) => b.fit_score - a.fit_score || b.extraction_confidence - a.extraction_confidence)
    .slice(0, 3)
    .map((vendor) => vendor.company_name as string);

  return {
    highest_signal: bySignal,
    most_deployable: byDeployable,
    best_overall_fit: byFit,
  };
}

function normalizeRun(
  parsed: z.infer<typeof looseOutputSchema>,
  input: z.infer<typeof inputSchema>,
): VendorIntelligenceRun {
  const vendors = parsed.vendors.map(normalizeVendor);
  const validVendors = vendors.filter((vendor) => !vendor.rejection_reason && vendor.company_name);
  const rejectedFromVendors = vendors.filter((vendor) => vendor.rejection_reason).length;

  const rejectedEntries = (parsed.rejected_entries || [])
    .map((entry) => ({
      name: entry.name?.trim() || null,
      url: normalizeUrl(entry.url),
      rejection_reason: entry.rejection_reason?.trim() || 'Rejected by classifier',
    }))
    .filter((entry) => entry.name || entry.url);

  const gapOpportunities = (parsed.gap_opportunities || []).map((gap) => ({
    category: gap.category?.trim() || null,
    description: gap.description?.trim() || null,
    gap_type: normalizeAllowed(gap.gap_type, GAP_OPTIONS, 'high_signal_low_deployment'),
    opportunity_score: normalizeIntScore(gap.opportunity_score),
  }));

  const topCandidates = makeTopCandidates(vendors);

  return {
    run_metadata: {
      source_type: input.source_type,
      industry_focus: input.industry_focus,
      region: input.region,
      date_scraped: input.date_scraped,
      total_detected: vendors.length + rejectedEntries.length,
      total_valid: validVendors.length,
      total_rejected: rejectedEntries.length + rejectedFromVendors,
    },
    vendors,
    rejected_entries: rejectedEntries,
    top_candidates: {
      highest_signal: parsed.top_candidates?.highest_signal?.length
        ? parsed.top_candidates.highest_signal.slice(0, 3)
        : topCandidates.highest_signal,
      most_deployable: parsed.top_candidates?.most_deployable?.length
        ? parsed.top_candidates.most_deployable.slice(0, 3)
        : topCandidates.most_deployable,
      best_overall_fit: parsed.top_candidates?.best_overall_fit?.length
        ? parsed.top_candidates.best_overall_fit.slice(0, 3)
        : topCandidates.best_overall_fit,
    },
    gap_opportunities: gapOpportunities,
    run_summary:
      parsed.run_summary?.trim() ||
      `Detected ${vendors.length} vendors with ${validVendors.length} valid candidates for ${input.region}.`,
  };
}

function splitIntoChunks(text: string, maxChars: number, overlapChars: number): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  const safeMax = Math.max(1000, maxChars);
  const safeOverlap = Math.max(0, Math.min(overlapChars, Math.floor(safeMax / 4)));

  let cursor = 0;
  while (cursor < cleaned.length) {
    const end = Math.min(cleaned.length, cursor + safeMax);
    chunks.push(cleaned.slice(cursor, end));
    if (end >= cleaned.length) break;
    cursor = Math.max(0, end - safeOverlap);
  }

  return chunks;
}

type VendorLead = z.infer<typeof chunkLeadSchema>['vendors'][number];

function dedupeVendorLeads(leads: VendorLead[]): VendorLead[] {
  const deduped = new Map<string, VendorLead>();

  for (const lead of leads) {
    const keyBase = `${lead.company_name?.trim().toLowerCase() || ''}|${lead.company_url?.trim().toLowerCase() || ''}`;
    if (!keyBase || keyBase === '|') continue;

    const existing = deduped.get(keyBase);
    if (!existing) {
      deduped.set(keyBase, lead);
      continue;
    }

    const merged: VendorLead = {
      ...existing,
      extraction_confidence: Math.max(existing.extraction_confidence, lead.extraction_confidence),
      description:
        (existing.description && existing.description.length >= (lead.description?.length ?? 0))
          ? existing.description
          : lead.description,
      evidence_snippet: existing.evidence_snippet || lead.evidence_snippet,
      product_name: existing.product_name || lead.product_name,
      primary_category: existing.primary_category || lead.primary_category,
      company_url: existing.company_url || lead.company_url,
      company_name: existing.company_name || lead.company_name,
    };

    deduped.set(keyBase, merged);
  }

  return Array.from(deduped.values());
}

async function persistVendors(vendors: IntelligenceVendor[]): Promise<PersistenceSummary> {
  const supabase = getSupabaseClient({ admin: true });
  const valid = vendors.filter((vendor) => !vendor.rejection_reason && vendor.company_name);

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const vendor of valid) {
    try {
      const lookup = supabase.from('vendors').select('id').limit(1);
      const lookupQuery = vendor.company_url
        ? lookup.eq('company_url', vendor.company_url)
        : lookup.eq('company_name', vendor.company_name as string);

      const { data: existing, error: lookupError } = await lookupQuery;
      if (lookupError) {
        throw new Error(lookupError.message);
      }

      const row = {
        company_name: vendor.company_name,
        company_url: vendor.company_url,
        description: vendor.description,
        primary_category: vendor.primary_category,
        extraction_confidence: vendor.extraction_confidence,
        status: vendor.fit_score >= 7 ? 'approved' : 'pending',
      };

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from('vendors')
          .update(row)
          .eq('id', existing[0].id);

        if (updateError) {
          throw new Error(updateError.message);
        }
        updated += 1;
      } else {
        const { error: insertError } = await supabase.from('vendors').insert(row);
        if (insertError) {
          throw new Error(insertError.message);
        }
        inserted += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push(
        `${vendor.company_name || 'Unknown vendor'}: ${
          error instanceof Error ? error.message : 'Insert failed'
        }`,
      );
    }
  }

  return {
    attempted: valid.length,
    inserted,
    updated,
    failed,
    errors,
  };
}

export async function runVendorIntelligence(
  rawInput: unknown,
): Promise<{
  run: VendorIntelligenceRun;
  persistence: PersistenceSummary | null;
  llm: {
    selectedProvider: string;
    usage: ProviderUsageSummary[];
    chunking: {
      used: boolean;
      chunkCount: number;
      chunkFailures: number;
      dedupedLeads: number;
    };
  };
}> {
  const parsedInput = inputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? 'Invalid intelligence input.');
  }

  const input = parsedInput.data;

  const sanitized = sanitizeUntrustedLlmInput(input.raw_text, 24000);

  const chunkThreshold = Number(process.env.NXT_LINK_PARALLEL_CHUNK_THRESHOLD || 8500);
  const chunkSize = Number(process.env.NXT_LINK_PARALLEL_CHUNK_SIZE || 5500);
  const chunkOverlap = Number(process.env.NXT_LINK_PARALLEL_CHUNK_OVERLAP || 500);
  const maxChunks = Number(process.env.NXT_LINK_PARALLEL_MAX_CHUNKS || 6);

  let textForClassification = sanitized.sanitized_text;
  let chunkingUsed = false;
  let chunkCount = 0;
  let chunkFailures = 0;
  let dedupedLeadCount = 0;

  if (sanitized.sanitized_text.length > chunkThreshold) {
    const chunks = splitIntoChunks(sanitized.sanitized_text, chunkSize, chunkOverlap).slice(0, maxChunks);
    chunkCount = chunks.length;
    chunkingUsed = chunkCount > 1;

    const chunkBatch = await runParallelJsonTaskBatch<z.infer<typeof chunkLeadSchema>>({
      systemPrompt: chunkLeadSystemPrompt,
      tasks: chunks.map((chunk, index) => ({
        taskId: String(index + 1).padStart(3, '0'),
        userPrompt: `${boundedDataPrompt(`CHUNK_${index + 1}`, chunk)}
Extract vendor leads from this chunk only.`,
        parse: (content) => {
          const parsed = chunkLeadSchema.safeParse(parseJsonObject(content));
          if (!parsed.success) {
            throw new Error(parsed.error.issues[0]?.message ?? 'invalid_chunk_json');
          }
          return parsed.data;
        },
      })),
      temperature: 0,
      budget: {
        preferLowCostProviders: true,
        maxProviders: 2,
        reserveCompletionTokens: 250,
      },
      maxProvidersPerTask: 2,
      maxConcurrency: 3,
    });

    const leads = dedupeVendorLeads(
      chunkBatch.results.flatMap((entry) => entry.result.vendors || []),
    ).slice(0, 120);
    chunkFailures = chunkBatch.failures.length;
    dedupedLeadCount = leads.length;

    if (leads.length > 0) {
      textForClassification = `Chunked extraction summary:
- chunks_processed: ${chunkBatch.results.length}
- chunk_failures: ${chunkBatch.failures.length}
- deduped_vendor_leads: ${leads.length}

CANDIDATE_VENDOR_LEADS_JSON:
${JSON.stringify(leads)}`;
    }
  }

  const userPrompt = `SOURCE_TYPE: ${input.source_type}
INDUSTRY_FOCUS: ${input.industry_focus}
REGION: ${input.region}
DATE_SCRAPED: ${input.date_scraped}
SANITIZATION_RISK_SCORE: ${sanitized.risk_score}
SANITIZATION_FLAGS: ${sanitized.flags.join(', ') || 'none'}
${boundedDataPrompt('RAW_TEXT', textForClassification)}`;

  const ensemble = await runParallelJsonEnsemble<VendorIntelligenceRun>({
    systemPrompt,
    userPrompt,
    temperature: 0.1,
    budget: {
      preferLowCostProviders: true,
      maxProviders: 3,
      reserveCompletionTokens: 800,
    },
    parse: (content) => {
      const parsedObject = parseJsonObject(content);
      const parsedRun = looseOutputSchema.safeParse(parsedObject);
      if (!parsedRun.success) {
        throw new Error(
          `Intelligence JSON failed validation: ${
            parsedRun.error.issues[0]?.message || 'Invalid structure'
          }`,
        );
      }
      return normalizeRun(parsedRun.data, input);
    },
  });

  const normalizedRun = ensemble.result;
  const persistence = input.persist_to_supabase
    ? await persistVendors(normalizedRun.vendors)
    : null;

  return {
    run: normalizedRun,
    persistence,
    llm: {
      selectedProvider: ensemble.selectedProvider,
      usage: ensemble.usage,
      chunking: {
        used: chunkingUsed,
        chunkCount,
        chunkFailures,
        dedupedLeads: dedupedLeadCount,
      },
    },
  };
}
