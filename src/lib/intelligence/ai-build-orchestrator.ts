import { z } from 'zod';
import { createHash } from 'node:crypto';

import {
  runParallelJsonEnsemble,
  runParallelJsonTaskBatch,
  type ProviderUsageSummary,
} from '@/lib/llm/parallel-router';
import { boundedDataPrompt, sanitizeUntrustedLlmInput } from '@/lib/llm/sanitize';
import {
  createOpsAction,
  createOpsBuildRun,
  listOpsBuildRuns,
  type OpsBuildRun,
} from '@/lib/intelligence/ops-store';

const sectionIdSchema = z.enum([
  'repo_scaffold',
  'database_schema',
  'backend_modules',
  'frontend_ux',
  'ml_pipeline',
  'delivery_plan',
]);

const prioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);

const actionDraftSchema = z.object({
  title: z.string().trim().min(4),
  owner: z.string().trim().min(2).default('NXT Link Team'),
  priority: prioritySchema.default('P1'),
  notes: z.string().trim().nullable().default(null),
});

const sectionDraftSchema = z.object({
  section_id: sectionIdSchema,
  summary: z.string().trim().min(12),
  deliverables: z.array(z.string().trim().min(3)).min(2).max(10),
  files_to_touch: z.array(z.string().trim().min(3)).min(1).max(20),
  risks: z.array(z.string().trim().min(3)).max(8).default([]),
  actions: z.array(actionDraftSchema).min(2).max(12),
});

const finalBlueprintSchema = z.object({
  mission_summary: z.string().trim().min(12),
  execution_order: z.array(sectionIdSchema).min(3).max(6),
  top_risks: z.array(z.string().trim().min(3)).max(10).default([]),
  architecture_decisions: z.array(z.string().trim().min(3)).min(4).max(14),
  release_checklist: z.array(z.string().trim().min(3)).min(5).max(20),
  actions: z.array(actionDraftSchema).min(6).max(20),
});

export type AiBuildOrchestratorInput = {
  masterPrompt: string;
  mission?: string;
  persistActions?: boolean;
  actionOwner?: string;
};

export type AiBuildOrchestratorResult = {
  run_id: string;
  mission: string;
  sections: Array<z.infer<typeof sectionDraftSchema>>;
  blueprint: z.infer<typeof finalBlueprintSchema>;
  task_failures: Array<{ task_id: string; error: string }>;
  created_actions: Array<{ id: string; title: string; owner: string; status: string }>;
  llm: {
    selected_provider: string;
    usage: ProviderUsageSummary[];
  };
  created_at: string;
};

type SectionTaskSpec = {
  id: z.infer<typeof sectionIdSchema>;
  objective: string;
  focus: string[];
};

const sectionTasks: SectionTaskSpec[] = [
  {
    id: 'repo_scaffold',
    objective: 'Produce concrete repo structure and bootstrap file plan.',
    focus: ['repo folders', 'docker services', 'local run scripts', 'seed datasets'],
  },
  {
    id: 'database_schema',
    objective: 'Define production database schema and migrations aligned to the prompt.',
    focus: ['tables', 'indexes', 'constraints', 'auditability columns'],
  },
  {
    id: 'backend_modules',
    objective: 'Define backend modules and API implementation map.',
    focus: ['FastAPI routers', 'crawler services', 'classification services', 'state/narrative engines'],
  },
  {
    id: 'frontend_ux',
    objective: 'Define frontend component architecture and interaction model.',
    focus: ['map shell', 'layer panel', 'right intelligence panel', 'mobile briefing layout'],
  },
  {
    id: 'ml_pipeline',
    objective: 'Define ML/data pipeline and model lifecycle.',
    focus: ['hybrid retrieval', 'ranker training loop', 'trend clustering', 'feedback learning'],
  },
  {
    id: 'delivery_plan',
    objective: 'Define implementation sequencing with quality gates.',
    focus: ['phase plan', 'smoke tests', 'observability', 'deployment checklist'],
  },
];

const sectionSystemPrompt = `You are a principal software architect.
Return strict JSON only with:
{
  "section_id": "repo_scaffold|database_schema|backend_modules|frontend_ux|ml_pipeline|delivery_plan",
  "summary": "short summary",
  "deliverables": ["..."],
  "files_to_touch": ["..."],
  "risks": ["..."],
  "actions": [
    { "title": "...", "owner": "NXT Link Team", "priority": "P0|P1|P2|P3", "notes": "..." }
  ]
}
Rules:
- Keep outputs implementation-grade and specific.
- Use concrete filenames/paths where possible.
- Keep action titles short and executable.
- No markdown.`;

const synthesisSystemPrompt = `You are the integration lead for NXT LINK.
Merge section outputs into one final implementation blueprint.
Return strict JSON with:
{
  "mission_summary": "",
  "execution_order": ["repo_scaffold","database_schema","backend_modules","frontend_ux","ml_pipeline","delivery_plan"],
  "top_risks": [""],
  "architecture_decisions": [""],
  "release_checklist": [""],
  "actions": [
    { "title": "", "owner": "NXT Link Team", "priority": "P0|P1|P2|P3", "notes": "" }
  ]
}
Rules:
- Favor deterministic sequencing.
- Keep actions non-overlapping.
- Include only practical, production-ready steps.
- No markdown.`;

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  const normalized = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(normalized) as Record<string, unknown>;
}

export function deduplicateActions(
  actions: Array<z.infer<typeof actionDraftSchema>>,
): Array<z.infer<typeof actionDraftSchema>> {
  const byKey = new Map<string, z.infer<typeof actionDraftSchema>>();
  for (const action of actions) {
    const key = action.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, action);
      continue;
    }
    const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;
    const better =
      priorityWeight[action.priority] < priorityWeight[existing.priority] ? action : existing;
    byKey.set(key, better);
  }
  return Array.from(byKey.values());
}

function actionStatusFromPriority(priority: z.infer<typeof prioritySchema>): 'todo' | 'in_review' {
  return priority === 'P0' ? 'in_review' : 'todo';
}

function appendPriorityNotes(
  action: z.infer<typeof actionDraftSchema>,
): z.infer<typeof actionDraftSchema> {
  const prefix = `[${action.priority}]`;
  const notes = action.notes ? `${prefix} ${action.notes}` : prefix;
  return { ...action, notes };
}

export async function runAiBuildOrchestrator(
  input: AiBuildOrchestratorInput,
): Promise<AiBuildOrchestratorResult> {
  const mission = (input.mission || 'Build NXT LINK from master prompt').trim();
  if (!input.masterPrompt.trim()) {
    throw new Error('masterPrompt is required.');
  }

  const sanitized = sanitizeUntrustedLlmInput(input.masterPrompt, 20000);

  const batch = await runParallelJsonTaskBatch<z.infer<typeof sectionDraftSchema>>({
    systemPrompt: sectionSystemPrompt,
    tasks: sectionTasks.map((task) => ({
      taskId: task.id,
      userPrompt: `MISSION: ${mission}
SECTION_ID: ${task.id}
OBJECTIVE: ${task.objective}
FOCUS: ${task.focus.join(', ')}
SANITIZATION_RISK_SCORE: ${sanitized.risk_score}
SANITIZATION_FLAGS: ${sanitized.flags.join(', ') || 'none'}
${boundedDataPrompt('MASTER_PROMPT', sanitized.sanitized_text)}`,
      parse: (content) => {
        const candidate = sectionDraftSchema.safeParse(parseJsonObject(content));
        if (!candidate.success) {
          throw new Error(candidate.error.issues[0]?.message || 'invalid_section_json');
        }
        return candidate.data;
      },
    })),
    temperature: 0.1,
    budget: {
      preferLowCostProviders: true,
      maxProviders: 2,
      reserveCompletionTokens: 350,
      maxTotalEstimatedTokens: 120000,
    },
    maxProvidersPerTask: 2,
    maxConcurrency: 3,
  });

  if (batch.results.length === 0) {
    const reasons = batch.failures.map((f) => `${f.taskId}: ${f.error}`).join(' | ');
    throw new Error(`AI build orchestration failed. ${reasons || 'No valid section output.'}`);
  }

  const sections = batch.results.map((entry) => entry.result);
  const sectionActions = deduplicateActions(
    sections.flatMap((section) => section.actions).map(appendPriorityNotes),
  );

  const synth = await runParallelJsonEnsemble<z.infer<typeof finalBlueprintSchema>>({
    systemPrompt: synthesisSystemPrompt,
    userPrompt: `MISSION: ${mission}
TASK_FAILURES: ${batch.failures.length}
SECTION_OUTPUTS_JSON:
${JSON.stringify(sections)}
BASE_ACTION_POOL_JSON:
${JSON.stringify(sectionActions)}`,
    temperature: 0.1,
    budget: {
      preferLowCostProviders: true,
      maxProviders: 3,
      reserveCompletionTokens: 500,
      maxTotalEstimatedTokens: 90000,
    },
    parse: (content) => {
      const parsed = finalBlueprintSchema.safeParse(parseJsonObject(content));
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'invalid_blueprint_json');
      }
      return parsed.data;
    },
  });

  const finalActions = deduplicateActions(
    [...sectionActions, ...synth.result.actions.map(appendPriorityNotes)],
  ).slice(0, 24);

  const runRecord = await createOpsBuildRun({
    mission,
    source_prompt_hash: createHash('sha256').update(input.masterPrompt).digest('hex'),
    selected_provider: synth.selectedProvider,
    sections_json: JSON.stringify(sections),
    blueprint_json: JSON.stringify({
      ...synth.result,
      actions: finalActions,
    }),
    failures_json: JSON.stringify(batch.failures),
    usage_json: JSON.stringify(synth.usage),
  });

  const createdActions: Array<{ id: string; title: string; owner: string; status: string }> = [];
  if (input.persistActions ?? true) {
    for (const action of finalActions.slice(0, 16)) {
      const created = await createOpsAction({
        title: action.title,
        owner: input.actionOwner?.trim() || action.owner || 'NXT Link Team',
        status: actionStatusFromPriority(action.priority),
        notes: action.notes,
      });
      createdActions.push({
        id: created.id,
        title: created.title,
        owner: created.owner,
        status: created.status,
      });
    }
  }

  return {
    run_id: runRecord.id,
    mission,
    sections,
    blueprint: {
      ...synth.result,
      actions: finalActions,
    },
    task_failures: batch.failures.map((entry) => ({
      task_id: entry.taskId,
      error: entry.error,
    })),
    created_actions: createdActions,
    llm: {
      selected_provider: synth.selectedProvider,
      usage: synth.usage,
    },
    created_at: runRecord.created_at,
  };
}

export async function listAiBuildOrchestratorRuns(limit = 12): Promise<OpsBuildRun[]> {
  return listOpsBuildRuns(limit);
}
