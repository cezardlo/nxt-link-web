// Zod input schemas for the Conference & Event Strategy API routes.
// Every mutating route validates with these before touching the database.
// Convention: `xInput` validates a create payload; `xUpdate` is a partial
// for PATCH. Unknown keys are stripped (zod default).

import { z } from 'zod';

const shortText = z.string().trim().min(1).max(300);
const longText = z.string().trim().min(1).max(4000);
const optionalShort = shortText.optional().nullable();
const optionalLong = longText.optional().nullable();
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');
const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), 'Expected an http(s) URL');
const stringArray = z.array(z.string().trim().min(1).max(300)).max(100).default([]);
const score = z.coerce.number().int().min(0).max(100).optional().nullable();

export const eventOrganizationInput = z
  .object({
    kind: z
      .enum(['conference', 'expo', 'chamber', 'association', 'economic_development', 'other'])
      .default('conference'),
    name: shortText,
    location: optionalShort,
    // Factual-record integrity: a source URL + verification date are REQUIRED.
    source_url: httpUrl,
    source_verified_on: isoDate,
    audience: optionalLong,
    industries: stringArray,
    attendees_estimate: optionalShort,
    relevance: optionalLong,
    mission_fit: optionalLong,
    participation_recommendation: optionalLong,
    estimated_cost: optionalShort,
    cost_source_url: httpUrl.optional().nullable(),
    cost_verified_on: isoDate.optional().nullable(),
    timing_frequency: optionalShort,
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    score_customers: score,
    score_vendors: score,
    score_global_trends: score,
    score_cross_border: score,
    is_sample: z.boolean().default(false),
    notes: optionalLong,
  })
  .superRefine((value, ctx) => {
    // A cost claim on a factual (non-sample) record needs its own source + date.
    if (value.estimated_cost && !value.is_sample) {
      if (!value.cost_source_url) {
        ctx.addIssue({
          code: 'custom',
          path: ['cost_source_url'],
          message: 'estimated_cost requires cost_source_url on factual records',
        });
      }
      if (!value.cost_verified_on) {
        ctx.addIssue({
          code: 'custom',
          path: ['cost_verified_on'],
          message: 'estimated_cost requires cost_verified_on on factual records',
        });
      }
    }
  });

export const eventOrganizationUpdate = z.object({
  kind: z
    .enum(['conference', 'expo', 'chamber', 'association', 'economic_development', 'other'])
    .optional(),
  name: shortText.optional(),
  location: optionalShort,
  source_url: httpUrl.optional(),
  source_verified_on: isoDate.optional(),
  audience: optionalLong,
  industries: z.array(z.string().trim().min(1).max(300)).max(100).optional(),
  attendees_estimate: optionalShort,
  relevance: optionalLong,
  mission_fit: optionalLong,
  participation_recommendation: optionalLong,
  estimated_cost: optionalShort,
  cost_source_url: httpUrl.optional().nullable(),
  cost_verified_on: isoDate.optional().nullable(),
  timing_frequency: optionalShort,
  priority: z.enum(['high', 'medium', 'low']).optional(),
  score_customers: score,
  score_vendors: score,
  score_global_trends: score,
  score_cross_border: score,
  is_sample: z.boolean().optional(),
  notes: optionalLong,
});

export const wowIdeaInput = z.object({
  idea: longText,
  where_used: optionalShort,
  why_impressive: optionalLong,
  worker_support: optionalLong,
  local_adaptation: optionalLong,
  difficulty: z.enum(['low', 'medium', 'high']).default('medium'),
  cost_range: optionalShort,
  target_local_company: optionalShort,
  demo_concept: optionalLong,
  source_url: httpUrl.optional().nullable(),
  source_verified_on: isoDate.optional().nullable(),
  is_sample: z.boolean().default(false),
  notes: optionalLong,
});
export const wowIdeaUpdate = wowIdeaInput.partial();

export const decisionMakerSchema = z.object({
  name: shortText,
  role: optionalShort,
  email: z.string().trim().email().optional().nullable(),
});

export const targetCompanyInput = z.object({
  name: shortText,
  segment: z
    .enum(['warehouse', 'manufacturer', 'maquiladora', 'logistics', 'supplier', 'vendor', 'investor', 'consultant', 'other'])
    .default('other'),
  industry: optionalShort,
  company_size: optionalShort,
  location: optionalShort,
  pain_points: stringArray,
  tech_readiness: z.enum(['low', 'medium', 'high']).optional().nullable(),
  decision_makers: z.array(decisionMakerSchema).max(50).default([]),
  is_sample: z.boolean().default(false),
  notes: optionalLong,
});
export const targetCompanyUpdate = targetCompanyInput.partial();

export const eventConceptInput = z.object({
  template_key: optionalShort,
  title: shortText,
  audience: optionalLong,
  theme: optionalLong,
  speakers: stringArray,
  vendors: stringArray,
  demos: stringArray,
  venue: optionalShort,
  sponsors: stringArray,
  invitees: stringArray,
  value_statement: optionalLong,
  anti_sales_safeguards: optionalLong,
  follow_up_plan: optionalLong,
  revenue_model: optionalLong,
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  is_sample: z.boolean().default(false),
  notes: optionalLong,
});
export const eventConceptUpdate = eventConceptInput.partial();

export const inviteListInput = z.object({
  name: shortText,
  purpose: optionalLong,
  event_org_id: z.string().uuid().optional().nullable(),
  concept_id: z.string().uuid().optional().nullable(),
  is_sample: z.boolean().default(false),
});
export const inviteListUpdate = inviteListInput.partial();

export const inviteListMemberInput = z
  .object({
    list_id: z.string().uuid(),
    company_id: z.string().uuid().optional().nullable(),
    vendor_application_id: z.string().uuid().optional().nullable(),
    role_at_event: optionalShort,
    status: z.enum(['proposed', 'invited', 'confirmed', 'declined']).default('proposed'),
    notes: optionalLong,
  })
  .superRefine((value, ctx) => {
    const picks = [value.company_id, value.vendor_application_id].filter(Boolean).length;
    if (picks !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['company_id'],
        message: 'Provide exactly one of company_id or vendor_application_id',
      });
    }
  });
export const inviteListMemberUpdate = z.object({
  role_at_event: optionalShort,
  status: z.enum(['proposed', 'invited', 'confirmed', 'declined']).optional(),
  notes: optionalLong,
});

export const pipelineOutcomesSchema = z.object({
  meetings: z.coerce.number().int().min(0).default(0),
  audits: z.coerce.number().int().min(0).default(0),
  pilots: z.coerce.number().int().min(0).default(0),
  paid_projects: z.coerce.number().int().min(0).default(0),
});

export const pipelineItemInput = z.object({
  title: shortText,
  stage: z
    .enum(['research', 'selection', 'partner_outreach', 'invite_building', 'vendor_recruitment', 'demo_planning', 'marketing', 'execution', 'follow_up', 'pilot_conversion'])
    .default('research'),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']).default('todo'),
  concept_id: z.string().uuid().optional().nullable(),
  event_org_id: z.string().uuid().optional().nullable(),
  owner: optionalShort,
  due_on: isoDate.optional().nullable(),
  notes: optionalLong,
  outcomes: pipelineOutcomesSchema.partial().default({}),
  is_sample: z.boolean().default(false),
});
export const pipelineItemUpdate = pipelineItemInput.partial();

// Vendor application extension fields (module 1) — validated in /api/apply/*.
export const vendorEventFieldsSchema = z.object({
  certifications: stringArray,
  technology_category: optionalShort,
  pain_points_solved: stringArray,
  target_company_types: stringArray,
  demo_capabilities: optionalLong,
  conference_interests: stringArray,
  participation_preference: optionalShort,
  budget_range: optionalShort,
  worker_support_value: optionalLong,
  consent_terms: z.boolean().optional(),
});
