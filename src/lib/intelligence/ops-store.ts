import { randomUUID } from 'node:crypto';

import { getDb, isSupabaseConfigured } from '@/db';

export type SourceType = 'whitepaper' | 'case_study' | 'company' | 'funding' | 'news' | 'other';
export type SearchIntentMode = 'discover' | 'compare' | 'who-solves' | 'funding';

export type OpsScanRun = {
  id: string;
  query: string;
  industry: string;
  region: string;
  intent_mode: SearchIntentMode;
  source_types: SourceType[];
  avg_confidence: number;
  risk_score: number;
  result_json: string;
  citations_json: string;
  created_at: string;
};

export type OpsCrawlJob = {
  id: string;
  query: string;
  industry: string;
  region: string;
  intent_mode: SearchIntentMode;
  source_types: SourceType[];
  max_sources: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  attempt_count: number;
  max_retries: number;
  worker_id: string | null;
  next_run_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsCrawlSnapshot = {
  id: string;
  job_id: string;
  url: string;
  source_type: SourceType;
  title: string;
  status: 'success' | 'failed';
  http_status: number | null;
  content_hash: string | null;
  changed: boolean;
  requires_js_render: boolean;
  quality_score: number;
  quality_flags: string[];
  provenance_snippet: string;
  extracted_text: string | null;
  created_at: string;
};

export type OpsAlert = {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  risk_score: number;
  confidence: number;
  source_url: string | null;
  source_title: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsAction = {
  id: string;
  title: string;
  owner: string;
  status: 'todo' | 'in_review' | 'approved' | 'completed';
  due_at: string | null;
  notes: string | null;
  linked_evidence_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsView = {
  id: string;
  name: string;
  role: string;
  filters: Record<string, unknown>;
  created_at: string;
};

export type OpsWorkspace = {
  id: string;
  name: string;
  description: string | null;
  focus: string | null;
  shared_token: string;
  created_at: string;
  updated_at: string;
};

export type SearchFeedbackAction = 'correct' | 'wrong' | 'saved' | 'pilot' | 'corrected';

export type OpsSearchFeedback = {
  id: string;
  query: string;
  result_id: string;
  result_name: string;
  action: SearchFeedbackAction;
  corrected_industry: string | null;
  corrected_problem_category: string | null;
  corrected_solution_type: string | null;
  created_at: string;
};

export type OpsSearchFeedbackBoost = {
  canonical_name: string;
  positive_signals: number;
  negative_signals: number;
  boost: number;
};

export type OpsBuildRun = {
  id: string;
  mission: string;
  source_prompt_hash: string;
  selected_provider: string | null;
  sections_json: string;
  blueprint_json: string;
  failures_json: string;
  usage_json: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsShareLink = {
  id: string;
  token: string;
  query_string: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  view_count: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonSafe<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeLimit(value: number, max = 200): number {
  return Math.max(1, Math.min(value, max));
}

// ── Scan Runs ─────────────────────────────────────────────────────────────────

type ScanRunDbRow = {
  id: string;
  query: string;
  industry: string;
  region: string;
  intent_mode: string;
  source_types_json: string;
  avg_confidence: number;
  risk_score: number;
  result_json: string;
  citations_json: string;
  created_at: string;
};

function mapScanRun(row: ScanRunDbRow): OpsScanRun {
  return {
    id: row.id,
    query: row.query,
    industry: row.industry,
    region: row.region,
    intent_mode: (row.intent_mode || 'discover') as SearchIntentMode,
    source_types: parseJsonSafe<SourceType[]>(row.source_types_json || '[]', []),
    avg_confidence: Number(row.avg_confidence || 0),
    risk_score: Number(row.risk_score || 0),
    result_json: row.result_json || '{}',
    citations_json: row.citations_json || '[]',
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function saveOpsScanRun(input: {
  query: string;
  industry: string;
  region: string;
  intent_mode: SearchIntentMode;
  source_types: SourceType[];
  avg_confidence: number;
  risk_score: number;
  result_json: string;
  citations_json: string;
}): Promise<OpsScanRun> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const stub: OpsScanRun = {
    id,
    query: input.query,
    industry: input.industry,
    region: input.region,
    intent_mode: input.intent_mode,
    source_types: input.source_types,
    avg_confidence: input.avg_confidence,
    risk_score: input.risk_score,
    result_json: input.result_json,
    citations_json: input.citations_json,
    created_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_scan_runs')
    .insert({
      id,
      query: input.query,
      industry: input.industry,
      region: input.region,
      intent_mode: input.intent_mode,
      source_types_json: JSON.stringify(input.source_types),
      avg_confidence: input.avg_confidence,
      risk_score: input.risk_score,
      result_json: input.result_json,
      citations_json: input.citations_json,
      created_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapScanRun(data as ScanRunDbRow);
}

export async function listOpsScanRuns(limit = 20): Promise<OpsScanRun[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_scan_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(safeLimit(limit));

  if (error || !data) return [];

  return (data as ScanRunDbRow[]).map(mapScanRun);
}

// ── Alerts ────────────────────────────────────────────────────────────────────

type AlertDbRow = {
  id: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  risk_score: number;
  confidence: number;
  source_url: string | null;
  source_title: string | null;
  created_at: string;
  updated_at: string;
};

function mapAlert(row: AlertDbRow): OpsAlert {
  return {
    id: row.id,
    severity: (row.severity || 'medium') as OpsAlert['severity'],
    title: row.title,
    description: row.description,
    status: (row.status || 'open') as OpsAlert['status'],
    risk_score: Number(row.risk_score || 0),
    confidence: Number(row.confidence || 0),
    source_url: row.source_url || null,
    source_title: row.source_title || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export async function createOpsAlert(input: {
  severity: OpsAlert['severity'];
  title: string;
  description: string;
  status?: OpsAlert['status'];
  risk_score: number;
  confidence: number;
  source_url?: string | null;
  source_title?: string | null;
}): Promise<OpsAlert> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsAlert = {
    id,
    severity: input.severity,
    title: input.title,
    description: input.description,
    status: input.status || 'open',
    risk_score: input.risk_score,
    confidence: input.confidence,
    source_url: input.source_url || null,
    source_title: input.source_title || null,
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_alerts')
    .insert({
      id,
      severity: input.severity,
      title: input.title,
      description: input.description,
      status: input.status || 'open',
      risk_score: input.risk_score,
      confidence: input.confidence,
      source_url: input.source_url || null,
      source_title: input.source_title || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapAlert(data as AlertDbRow);
}

export async function listOpsAlerts(limit = 20): Promise<OpsAlert[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_alerts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(safeLimit(limit));

  if (error || !data) return [];

  return (data as AlertDbRow[]).map(mapAlert);
}

// ── Actions ───────────────────────────────────────────────────────────────────

type ActionDbRow = {
  id: string;
  title: string;
  owner: string;
  status: string;
  due_at: string | null;
  notes: string | null;
  linked_evidence_url: string | null;
  created_at: string;
  updated_at: string;
};

function mapAction(row: ActionDbRow): OpsAction {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner,
    status: (row.status || 'todo') as OpsAction['status'],
    due_at: row.due_at || null,
    notes: row.notes || null,
    linked_evidence_url: row.linked_evidence_url || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export async function createOpsAction(input: {
  title: string;
  owner: string;
  status?: OpsAction['status'];
  due_at?: string | null;
  notes?: string | null;
  linked_evidence_url?: string | null;
}): Promise<OpsAction> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsAction = {
    id,
    title: input.title,
    owner: input.owner,
    status: input.status || 'todo',
    due_at: input.due_at || null,
    notes: input.notes || null,
    linked_evidence_url: input.linked_evidence_url || null,
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_actions')
    .insert({
      id,
      title: input.title,
      owner: input.owner,
      status: input.status || 'todo',
      due_at: input.due_at || null,
      notes: input.notes || null,
      linked_evidence_url: input.linked_evidence_url || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapAction(data as ActionDbRow);
}

export async function listOpsActions(limit = 30): Promise<OpsAction[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_actions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(safeLimit(limit));

  if (error || !data) return [];

  return (data as ActionDbRow[]).map(mapAction);
}

export async function updateOpsAction(
  id: string,
  input: {
    status?: OpsAction['status'];
    owner?: string;
    notes?: string | null;
    due_at?: string | null;
  },
): Promise<OpsAction | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const updates: Partial<ActionDbRow> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) updates.status = input.status;
  if (input.owner !== undefined) updates.owner = input.owner;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.due_at !== undefined) updates.due_at = input.due_at;

  const { data, error } = await db
    .from('ops_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !data) return null;

  return mapAction(data as ActionDbRow);
}

// ── Views ─────────────────────────────────────────────────────────────────────

type ViewDbRow = {
  id: string;
  name: string;
  role: string;
  filters_json: string;
  created_at: string;
};

function mapView(row: ViewDbRow): OpsView {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    filters: parseJsonSafe<Record<string, unknown>>(row.filters_json || '{}', {}),
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function createOpsView(input: {
  name: string;
  role: string;
  filters: Record<string, unknown>;
}): Promise<OpsView> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsView = {
    id,
    name: input.name,
    role: input.role,
    filters: input.filters,
    created_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_views')
    .insert({
      id,
      name: input.name,
      role: input.role,
      filters_json: JSON.stringify(input.filters),
      created_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapView(data as ViewDbRow);
}

export async function listOpsViews(limit = 20, role?: string): Promise<OpsView[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  let query = db
    .from('ops_views')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(safeLimit(limit));

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as ViewDbRow[]).map(mapView);
}

// ── Workspaces ────────────────────────────────────────────────────────────────

type WorkspaceDbRow = {
  id: string;
  name: string;
  description: string | null;
  focus: string | null;
  shared_token: string;
  created_at: string;
  updated_at: string;
};

function mapWorkspace(row: WorkspaceDbRow): OpsWorkspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    focus: row.focus || null,
    shared_token: row.shared_token,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export async function createOpsWorkspace(input: {
  name: string;
  description?: string | null;
  focus?: string | null;
}): Promise<OpsWorkspace> {
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 20);
  const now = new Date().toISOString();
  const stub: OpsWorkspace = {
    id,
    name: input.name,
    description: input.description || null,
    focus: input.focus || null,
    shared_token: token,
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_workspaces')
    .insert({
      id,
      name: input.name,
      description: input.description || null,
      focus: input.focus || null,
      shared_token: token,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapWorkspace(data as WorkspaceDbRow);
}

export async function listOpsWorkspaces(limit = 20): Promise<OpsWorkspace[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_workspaces')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(safeLimit(limit));

  if (error || !data) return [];

  return (data as WorkspaceDbRow[]).map(mapWorkspace);
}

// ── Search Feedback ───────────────────────────────────────────────────────────

type FeedbackDbRow = {
  id: string;
  query: string;
  result_id: string;
  result_name: string;
  action: string;
  corrected_industry: string | null;
  corrected_problem_category: string | null;
  corrected_solution_type: string | null;
  created_at: string;
};

function mapSearchFeedback(row: FeedbackDbRow): OpsSearchFeedback {
  return {
    id: row.id,
    query: row.query,
    result_id: row.result_id,
    result_name: row.result_name,
    action: (row.action || 'correct') as SearchFeedbackAction,
    corrected_industry: row.corrected_industry || null,
    corrected_problem_category: row.corrected_problem_category || null,
    corrected_solution_type: row.corrected_solution_type || null,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function createOpsSearchFeedback(input: {
  query: string;
  result_id: string;
  result_name: string;
  action: SearchFeedbackAction;
  corrected_industry?: string | null;
  corrected_problem_category?: string | null;
  corrected_solution_type?: string | null;
}): Promise<OpsSearchFeedback> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsSearchFeedback = {
    id,
    query: input.query,
    result_id: input.result_id,
    result_name: input.result_name,
    action: input.action,
    corrected_industry: input.corrected_industry || null,
    corrected_problem_category: input.corrected_problem_category || null,
    corrected_solution_type: input.corrected_solution_type || null,
    created_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_search_feedback')
    .insert({
      id,
      query: input.query,
      result_id: input.result_id,
      result_name: input.result_name,
      action: input.action,
      corrected_industry: input.corrected_industry || null,
      corrected_problem_category: input.corrected_problem_category || null,
      corrected_solution_type: input.corrected_solution_type || null,
      created_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapSearchFeedback(data as FeedbackDbRow);
}

export async function listOpsSearchFeedbackBoosts(limit = 500): Promise<OpsSearchFeedbackBoost[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const { data, error } = await db
    .from('ops_search_feedback')
    .select('result_name,action')
    .gte('created_at', cutoff)
    .limit(safeLimit(limit, 4000));

  if (error || !data) return [];

  type FeedbackRaw = { result_name: string; action: string };
  const rows = data as FeedbackRaw[];

  const byName = new Map<string, { positive: number; negative: number }>();
  for (const row of rows) {
    const key = (row.result_name || '').toLowerCase().trim();
    if (!key) continue;
    const current = byName.get(key) ?? { positive: 0, negative: 0 };
    const isPositive = ['correct', 'saved', 'pilot', 'corrected'].includes(row.action);
    if (isPositive) {
      current.positive += 1;
    } else if (row.action === 'wrong') {
      current.negative += 1;
    }
    byName.set(key, current);
  }

  return Array.from(byName.entries())
    .map(([canonical_name, { positive, negative }]) => {
      const total = Math.max(1, positive + negative);
      const ratio = (positive - negative) / total;
      return {
        canonical_name,
        positive_signals: positive,
        negative_signals: negative,
        boost: Number(clamp(ratio * 0.22, -0.22, 0.22).toFixed(3)),
      };
    })
    .sort((a, b) => b.positive_signals - a.positive_signals);
}

// ── Build Runs ────────────────────────────────────────────────────────────────

type BuildRunDbRow = {
  id: string;
  mission: string;
  source_prompt_hash: string;
  selected_provider: string | null;
  sections_json: string;
  blueprint_json: string;
  failures_json: string;
  usage_json: string | null;
  created_at: string;
  updated_at: string;
};

function mapBuildRun(row: BuildRunDbRow): OpsBuildRun {
  return {
    id: row.id,
    mission: row.mission,
    source_prompt_hash: row.source_prompt_hash,
    selected_provider: row.selected_provider || null,
    sections_json: row.sections_json,
    blueprint_json: row.blueprint_json,
    failures_json: row.failures_json || '[]',
    usage_json: row.usage_json || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export async function createOpsBuildRun(input: {
  mission: string;
  source_prompt_hash: string;
  selected_provider?: string | null;
  sections_json: string;
  blueprint_json: string;
  failures_json?: string;
  usage_json?: string | null;
}): Promise<OpsBuildRun> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsBuildRun = {
    id,
    mission: input.mission,
    source_prompt_hash: input.source_prompt_hash,
    selected_provider: input.selected_provider || null,
    sections_json: input.sections_json,
    blueprint_json: input.blueprint_json,
    failures_json: input.failures_json || '[]',
    usage_json: input.usage_json || null,
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_build_runs')
    .insert({
      id,
      mission: input.mission,
      source_prompt_hash: input.source_prompt_hash,
      selected_provider: input.selected_provider || null,
      sections_json: input.sections_json,
      blueprint_json: input.blueprint_json,
      failures_json: input.failures_json || '[]',
      usage_json: input.usage_json || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapBuildRun(data as BuildRunDbRow);
}

export async function listOpsBuildRuns(limit = 12): Promise<OpsBuildRun[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_build_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(safeLimit(limit, 100));

  if (error || !data) return [];

  return (data as BuildRunDbRow[]).map(mapBuildRun);
}

// ── Share Links ───────────────────────────────────────────────────────────────

type ShareLinkDbRow = {
  id: string;
  token: string;
  query_string: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  view_count: number;
};

function mapShareLink(row: ShareLinkDbRow): OpsShareLink {
  return {
    id: row.id,
    token: row.token,
    query_string: row.query_string || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    expires_at: row.expires_at || null,
    view_count: Number(row.view_count || 0),
  };
}

function normalizeQueryString(input: string): string {
  const trimmed = input.trim().slice(0, 3500);
  if (!trimmed) return '';
  return trimmed.startsWith('?') ? trimmed : `?${trimmed}`;
}

export async function createOpsShareLink(input: {
  query_string: string;
  expires_in_hours?: number | null;
}): Promise<OpsShareLink> {
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 22);
  const queryString = normalizeQueryString(input.query_string);
  const expiresHours = Number.isFinite(input.expires_in_hours)
    ? Math.max(1, Math.min(24 * 30, Math.round(input.expires_in_hours as number)))
    : null;
  const expiresAt =
    expiresHours === null
      ? null
      : new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const stub: OpsShareLink = {
    id,
    token,
    query_string: queryString,
    created_at: now,
    updated_at: now,
    expires_at: expiresAt,
    view_count: 0,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_share_links')
    .insert({
      id,
      token,
      query_string: queryString,
      expires_at: expiresAt,
      view_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapShareLink(data as ShareLinkDbRow);
}

export async function getOpsShareLinkByToken(
  token: string,
  options?: { increment_view_count?: boolean },
): Promise<OpsShareLink | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_share_links')
    .select('*')
    .eq('token', token.trim())
    .maybeSingle();

  if (error || !data) return null;

  const mapped = mapShareLink(data as ShareLinkDbRow);
  if (mapped.expires_at && new Date(mapped.expires_at).getTime() < Date.now()) {
    return null;
  }

  if (options?.increment_view_count) {
    const { data: refreshed } = await db
      .from('ops_share_links')
      .update({ view_count: mapped.view_count + 1, updated_at: new Date().toISOString() })
      .eq('id', mapped.id)
      .select()
      .maybeSingle();

    return refreshed ? mapShareLink(refreshed as ShareLinkDbRow) : mapped;
  }

  return mapped;
}

// ── Crawl Jobs ────────────────────────────────────────────────────────────────

type CrawlJobDbRow = {
  id: string;
  query: string;
  industry: string;
  region: string;
  intent_mode: string;
  source_types_json: string;
  max_sources: number;
  status: string;
  attempt_count: number;
  max_retries: number;
  worker_id: string | null;
  next_run_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

function mapJob(row: CrawlJobDbRow): OpsCrawlJob {
  return {
    id: row.id,
    query: row.query,
    industry: row.industry,
    region: row.region,
    intent_mode: (row.intent_mode || 'discover') as SearchIntentMode,
    source_types: parseJsonSafe<SourceType[]>(row.source_types_json || '[]', []),
    max_sources: Number(row.max_sources || 0),
    status: (row.status || 'queued') as OpsCrawlJob['status'],
    attempt_count: Number(row.attempt_count || 0),
    max_retries: Number(row.max_retries || 2),
    worker_id: row.worker_id || null,
    next_run_at: row.next_run_at || null,
    started_at: row.started_at || null,
    finished_at: row.finished_at || null,
    error: row.error || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export async function createOpsCrawlJob(input: {
  query: string;
  industry: string;
  region: string;
  intent_mode: SearchIntentMode;
  source_types: SourceType[];
  max_sources: number;
  max_retries?: number;
  next_run_at?: string | null;
}): Promise<OpsCrawlJob> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsCrawlJob = {
    id,
    query: input.query,
    industry: input.industry,
    region: input.region,
    intent_mode: input.intent_mode,
    source_types: input.source_types,
    max_sources: input.max_sources,
    status: 'queued',
    attempt_count: 0,
    max_retries: input.max_retries ?? 2,
    worker_id: null,
    next_run_at: input.next_run_at || null,
    started_at: null,
    finished_at: null,
    error: null,
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_crawl_jobs')
    .insert({
      id,
      query: input.query,
      industry: input.industry,
      region: input.region,
      intent_mode: input.intent_mode,
      source_types_json: JSON.stringify(input.source_types),
      max_sources: input.max_sources,
      status: 'queued',
      attempt_count: 0,
      max_retries: input.max_retries ?? 2,
      next_run_at: input.next_run_at || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapJob(data as CrawlJobDbRow);
}

export async function getOpsCrawlJob(id: string): Promise<OpsCrawlJob | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_crawl_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return mapJob(data as CrawlJobDbRow);
}

export async function listOpsCrawlJobs(limit = 40): Promise<OpsCrawlJob[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_crawl_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(safeLimit(limit, 250));

  if (error || !data) return [];

  return (data as CrawlJobDbRow[]).map(mapJob);
}

export async function claimDueOpsCrawlJobs(
  workerId: string,
  limit = 1,
): Promise<OpsCrawlJob[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const now = new Date().toISOString();

  // Fetch candidates
  const { data: candidates, error } = await db
    .from('ops_crawl_jobs')
    .select('*')
    .eq('status', 'queued')
    .or(`next_run_at.is.null,next_run_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(safeLimit(limit, 50));

  if (error || !candidates) return [];

  const claimed: OpsCrawlJob[] = [];
  for (const row of candidates as CrawlJobDbRow[]) {
    const { data: updated } = await db
      .from('ops_crawl_jobs')
      .update({
        status: 'running',
        worker_id: workerId,
        started_at: now,
        attempt_count: (row.attempt_count || 0) + 1,
        error: null,
        updated_at: now,
      })
      .eq('id', row.id)
      .eq('status', 'queued')
      .select()
      .maybeSingle();

    if (updated) {
      claimed.push(mapJob(updated as CrawlJobDbRow));
    }
  }

  return claimed;
}

export async function completeOpsCrawlJob(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const db = getDb({ admin: true });
  const now = new Date().toISOString();
  await db
    .from('ops_crawl_jobs')
    .update({ status: 'completed', finished_at: now, updated_at: now })
    .eq('id', id);
}

export async function failOpsCrawlJob(
  id: string,
  error: string,
  scheduleRetry: boolean,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const db = getDb({ admin: true });
  const now = new Date().toISOString();

  if (scheduleRetry) {
    const retryAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db
      .from('ops_crawl_jobs')
      .update({ status: 'queued', error, next_run_at: retryAt, updated_at: now })
      .eq('id', id);
    return;
  }

  await db
    .from('ops_crawl_jobs')
    .update({ status: 'failed', error, finished_at: now, updated_at: now })
    .eq('id', id);
}

// ── Crawl Snapshots ───────────────────────────────────────────────────────────

type SnapshotDbRow = {
  id: string;
  job_id: string;
  url: string;
  source_type: string;
  title: string;
  status: string;
  http_status: number | null;
  content_hash: string | null;
  changed: boolean;
  requires_js_render: boolean;
  quality_score: number;
  quality_flags_json: string;
  provenance_snippet: string;
  extracted_text: string | null;
  created_at: string;
};

function mapSnapshot(row: SnapshotDbRow): OpsCrawlSnapshot {
  return {
    id: row.id,
    job_id: row.job_id,
    url: row.url,
    source_type: (row.source_type || 'other') as SourceType,
    title: row.title,
    status: (row.status || 'success') as OpsCrawlSnapshot['status'],
    http_status: row.http_status ?? null,
    content_hash: row.content_hash || null,
    changed: Boolean(row.changed),
    requires_js_render: Boolean(row.requires_js_render),
    quality_score: Number(row.quality_score || 0),
    quality_flags: parseJsonSafe<string[]>(row.quality_flags_json || '[]', []),
    provenance_snippet: row.provenance_snippet || '',
    extracted_text: row.extracted_text || null,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function createOpsCrawlSnapshot(input: {
  job_id: string;
  url: string;
  source_type: SourceType;
  title: string;
  status: 'success' | 'failed';
  http_status?: number | null;
  content_hash?: string | null;
  changed: boolean;
  requires_js_render: boolean;
  quality_score: number;
  quality_flags: string[];
  provenance_snippet: string;
  extracted_text?: string | null;
}): Promise<OpsCrawlSnapshot> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stub: OpsCrawlSnapshot = {
    id,
    job_id: input.job_id,
    url: input.url,
    source_type: input.source_type,
    title: input.title,
    status: input.status,
    http_status: input.http_status ?? null,
    content_hash: input.content_hash ?? null,
    changed: input.changed,
    requires_js_render: input.requires_js_render,
    quality_score: input.quality_score,
    quality_flags: input.quality_flags,
    provenance_snippet: input.provenance_snippet,
    extracted_text: input.extracted_text ?? null,
    created_at: now,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_crawl_snapshots')
    .insert({
      id,
      job_id: input.job_id,
      url: input.url,
      source_type: input.source_type,
      title: input.title,
      status: input.status,
      http_status: input.http_status ?? null,
      content_hash: input.content_hash ?? null,
      changed: input.changed,
      requires_js_render: input.requires_js_render,
      quality_score: input.quality_score,
      quality_flags_json: JSON.stringify(input.quality_flags),
      provenance_snippet: input.provenance_snippet,
      extracted_text: input.extracted_text ?? null,
      created_at: now,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapSnapshot(data as SnapshotDbRow);
}

export async function listOpsCrawlSnapshotsByJob(
  jobId: string,
): Promise<OpsCrawlSnapshot[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_crawl_snapshots')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as SnapshotDbRow[]).map(mapSnapshot);
}

export async function getLatestOpsSnapshotByUrl(
  url: string,
): Promise<OpsCrawlSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_crawl_snapshots')
    .select('*')
    .eq('url', url)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return mapSnapshot(data as SnapshotDbRow);
}

// Keep ensureOpsStore as a no-op for backward compat (callers import it).
export async function ensureOpsStore(): Promise<void> {
  // No-op: Supabase tables are managed via migrations, not runtime DDL.
}
