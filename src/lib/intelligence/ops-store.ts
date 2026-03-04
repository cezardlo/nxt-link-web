import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';

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

let initialized = false;
type SqlScalar = string | number | boolean | Date | null | undefined;
type SqlRow = Record<string, SqlScalar>;

function iso(value: SqlScalar): string | null {
  if (!value) return null;
  const parsed =
    value instanceof Date ? value : new Date(typeof value === 'string' ? value : String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function str(row: SqlRow, key: string, fallback = ''): string {
  const value = row[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function nullableStr(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function num(row: SqlRow, key: string, fallback = 0): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function bool(row: SqlRow, key: string): boolean {
  const value = row[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapScanRun(row: SqlRow): OpsScanRun {
  return {
    id: str(row, 'id'),
    query: str(row, 'query'),
    industry: str(row, 'industry'),
    region: str(row, 'region'),
    intent_mode: (str(row, 'intentMode', 'discover') as SearchIntentMode),
    source_types: parseJson<SourceType[]>(str(row, 'sourceTypesJson', '[]'), []),
    avg_confidence: num(row, 'avgConfidence'),
    risk_score: num(row, 'riskScore'),
    result_json: str(row, 'resultJson'),
    citations_json: str(row, 'citationsJson'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
  };
}

function mapJob(row: SqlRow): OpsCrawlJob {
  return {
    id: str(row, 'id'),
    query: str(row, 'query'),
    industry: str(row, 'industry'),
    region: str(row, 'region'),
    intent_mode: (str(row, 'intentMode', 'discover') as SearchIntentMode),
    source_types: parseJson<SourceType[]>(str(row, 'sourceTypesJson', '[]'), []),
    max_sources: num(row, 'maxSources'),
    status: (str(row, 'status', 'queued') as OpsCrawlJob['status']),
    attempt_count: num(row, 'attemptCount'),
    max_retries: num(row, 'maxRetries', 2),
    worker_id: nullableStr(row, 'workerId'),
    next_run_at: iso(row['nextRunAt']),
    started_at: iso(row['startedAt']),
    finished_at: iso(row['finishedAt']),
    error: nullableStr(row, 'error'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
    updated_at: iso(row['updatedAt']) || new Date().toISOString(),
  };
}

function mapSnapshot(row: SqlRow): OpsCrawlSnapshot {
  return {
    id: str(row, 'id'),
    job_id: str(row, 'jobId'),
    url: str(row, 'url'),
    source_type: (str(row, 'sourceType', 'other') as SourceType),
    title: str(row, 'title'),
    status: (str(row, 'status', 'success') as OpsCrawlSnapshot['status']),
    http_status: row['httpStatus'] === null ? null : num(row, 'httpStatus'),
    content_hash: nullableStr(row, 'contentHash'),
    changed: bool(row, 'changed'),
    requires_js_render: bool(row, 'requiresJsRender'),
    quality_score: num(row, 'qualityScore'),
    quality_flags: parseJson<string[]>(str(row, 'qualityFlagsJson', '[]'), []),
    provenance_snippet: str(row, 'provenanceSnippet'),
    extracted_text: nullableStr(row, 'extractedText'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
  };
}

function mapAlert(row: SqlRow): OpsAlert {
  return {
    id: str(row, 'id'),
    severity: (str(row, 'severity', 'medium') as OpsAlert['severity']),
    title: str(row, 'title'),
    description: str(row, 'description'),
    status: (str(row, 'status', 'open') as OpsAlert['status']),
    risk_score: num(row, 'riskScore'),
    confidence: num(row, 'confidence'),
    source_url: nullableStr(row, 'sourceUrl'),
    source_title: nullableStr(row, 'sourceTitle'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
    updated_at: iso(row['updatedAt']) || new Date().toISOString(),
  };
}

function mapAction(row: SqlRow): OpsAction {
  return {
    id: str(row, 'id'),
    title: str(row, 'title'),
    owner: str(row, 'owner'),
    status: (str(row, 'status', 'todo') as OpsAction['status']),
    due_at: iso(row['dueAt']),
    notes: nullableStr(row, 'notes'),
    linked_evidence_url: nullableStr(row, 'linkedEvidenceUrl'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
    updated_at: iso(row['updatedAt']) || new Date().toISOString(),
  };
}

function mapView(row: SqlRow): OpsView {
  return {
    id: str(row, 'id'),
    name: str(row, 'name'),
    role: str(row, 'role'),
    filters: parseJson<Record<string, unknown>>(str(row, 'filtersJson', '{}'), {}),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
  };
}

function mapWorkspace(row: SqlRow): OpsWorkspace {
  return {
    id: str(row, 'id'),
    name: str(row, 'name'),
    description: nullableStr(row, 'description'),
    focus: nullableStr(row, 'focus'),
    shared_token: str(row, 'sharedToken'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
    updated_at: iso(row['updatedAt']) || new Date().toISOString(),
  };
}

function mapSearchFeedback(row: SqlRow): OpsSearchFeedback {
  return {
    id: str(row, 'id'),
    query: str(row, 'query'),
    result_id: str(row, 'resultId'),
    result_name: str(row, 'resultName'),
    action: str(row, 'action', 'correct') as SearchFeedbackAction,
    corrected_industry: nullableStr(row, 'correctedIndustry'),
    corrected_problem_category: nullableStr(row, 'correctedProblemCategory'),
    corrected_solution_type: nullableStr(row, 'correctedSolutionType'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
  };
}

function mapBuildRun(row: SqlRow): OpsBuildRun {
  return {
    id: str(row, 'id'),
    mission: str(row, 'mission'),
    source_prompt_hash: str(row, 'sourcePromptHash'),
    selected_provider: nullableStr(row, 'selectedProvider'),
    sections_json: str(row, 'sectionsJson'),
    blueprint_json: str(row, 'blueprintJson'),
    failures_json: str(row, 'failuresJson', '[]'),
    usage_json: nullableStr(row, 'usageJson'),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
    updated_at: iso(row['updatedAt']) || new Date().toISOString(),
  };
}

function mapShareLink(row: SqlRow): OpsShareLink {
  return {
    id: str(row, 'id'),
    token: str(row, 'token'),
    query_string: str(row, 'queryString', ''),
    created_at: iso(row['createdAt']) || new Date().toISOString(),
    updated_at: iso(row['updatedAt']) || new Date().toISOString(),
    expires_at: iso(row['expiresAt']),
    view_count: num(row, 'viewCount'),
  };
}

export async function ensureOpsStore() {
  if (initialized) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsScanRun" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "query" TEXT NOT NULL,
      "industry" TEXT NOT NULL,
      "region" TEXT NOT NULL,
      "intentMode" TEXT NOT NULL,
      "sourceTypesJson" TEXT NOT NULL,
      "avgConfidence" REAL NOT NULL,
      "riskScore" REAL NOT NULL,
      "resultJson" TEXT NOT NULL,
      "citationsJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsCrawlJob" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "query" TEXT NOT NULL,
      "industry" TEXT NOT NULL,
      "region" TEXT NOT NULL,
      "intentMode" TEXT NOT NULL,
      "sourceTypesJson" TEXT NOT NULL,
      "maxSources" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "attemptCount" INTEGER NOT NULL DEFAULT 0,
      "maxRetries" INTEGER NOT NULL DEFAULT 2,
      "workerId" TEXT,
      "nextRunAt" DATETIME,
      "startedAt" DATETIME,
      "finishedAt" DATETIME,
      "error" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsCrawlSnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "jobId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "sourceType" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "httpStatus" INTEGER,
      "contentHash" TEXT,
      "changed" INTEGER NOT NULL,
      "requiresJsRender" INTEGER NOT NULL,
      "qualityScore" REAL NOT NULL,
      "qualityFlagsJson" TEXT NOT NULL,
      "provenanceSnippet" TEXT NOT NULL,
      "extractedText" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsAlert" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "severity" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "riskScore" REAL NOT NULL,
      "confidence" REAL NOT NULL,
      "sourceUrl" TEXT,
      "sourceTitle" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsAction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "owner" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "dueAt" DATETIME,
      "notes" TEXT,
      "linkedEvidenceUrl" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsView" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "filtersJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsWorkspace" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "focus" TEXT,
      "sharedToken" TEXT NOT NULL UNIQUE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsSearchFeedback" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "query" TEXT NOT NULL,
      "resultId" TEXT NOT NULL,
      "resultName" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "correctedIndustry" TEXT,
      "correctedProblemCategory" TEXT,
      "correctedSolutionType" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsBuildRun" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "mission" TEXT NOT NULL,
      "sourcePromptHash" TEXT NOT NULL,
      "selectedProvider" TEXT,
      "sectionsJson" TEXT NOT NULL,
      "blueprintJson" TEXT NOT NULL,
      "failuresJson" TEXT NOT NULL DEFAULT '[]',
      "usageJson" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpsShareLink" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "token" TEXT NOT NULL UNIQUE,
      "queryString" TEXT NOT NULL DEFAULT '',
      "expiresAt" DATETIME,
      "viewCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsScanRun_createdAt_idx" ON "OpsScanRun"("createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsCrawlJob_status_nextRunAt_idx" ON "OpsCrawlJob"("status", "nextRunAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsCrawlSnapshot_url_createdAt_idx" ON "OpsCrawlSnapshot"("url", "createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsAlert_status_createdAt_idx" ON "OpsAlert"("status", "createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsSearchFeedback_resultName_createdAt_idx" ON "OpsSearchFeedback"("resultName", "createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsSearchFeedback_action_createdAt_idx" ON "OpsSearchFeedback"("action", "createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsBuildRun_createdAt_idx" ON "OpsBuildRun"("createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsShareLink_token_idx" ON "OpsShareLink"("token");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OpsShareLink_expiresAt_idx" ON "OpsShareLink"("expiresAt");`);

  initialized = true;
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
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsScanRun" ("id", "query", "industry", "region", "intentMode", "sourceTypesJson", "avgConfidence", "riskScore", "resultJson", "citationsJson") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.query,
    input.industry,
    input.region,
    input.intent_mode,
    JSON.stringify(input.source_types),
    input.avg_confidence,
    input.risk_score,
    input.result_json,
    input.citations_json,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsScanRun" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to save scan run.');
  return mapScanRun(rows[0]);
}

export async function listOpsScanRuns(limit = 20): Promise<OpsScanRun[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsScanRun" ORDER BY datetime("createdAt") DESC LIMIT ?;`, Math.max(1, Math.min(limit, 200)));
  return rows.map(mapScanRun);
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
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsAlert" ("id", "severity", "title", "description", "status", "riskScore", "confidence", "sourceUrl", "sourceTitle") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.severity,
    input.title,
    input.description,
    input.status || 'open',
    input.risk_score,
    input.confidence,
    input.source_url || null,
    input.source_title || null,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsAlert" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to create alert.');
  return mapAlert(rows[0]);
}

export async function listOpsAlerts(limit = 20): Promise<OpsAlert[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsAlert" ORDER BY datetime("updatedAt") DESC LIMIT ?;`, Math.max(1, Math.min(limit, 200)));
  return rows.map(mapAlert);
}

export async function createOpsAction(input: {
  title: string;
  owner: string;
  status?: OpsAction['status'];
  due_at?: string | null;
  notes?: string | null;
  linked_evidence_url?: string | null;
}): Promise<OpsAction> {
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsAction" ("id", "title", "owner", "status", "dueAt", "notes", "linkedEvidenceUrl") VALUES (?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.title,
    input.owner,
    input.status || 'todo',
    input.due_at || null,
    input.notes || null,
    input.linked_evidence_url || null,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsAction" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to create action.');
  return mapAction(rows[0]);
}

export async function listOpsActions(limit = 30): Promise<OpsAction[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsAction" ORDER BY datetime("updatedAt") DESC LIMIT ?;`, Math.max(1, Math.min(limit, 200)));
  return rows.map(mapAction);
}

export async function updateOpsAction(id: string, input: {
  status?: OpsAction['status'];
  owner?: string;
  notes?: string | null;
  due_at?: string | null;
}): Promise<OpsAction | null> {
  await ensureOpsStore();
  const existing = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsAction" WHERE "id" = ? LIMIT 1;`, id);
  const existingRow = existing[0];
  if (!existingRow) return null;

  await prisma.$executeRawUnsafe(
    `UPDATE "OpsAction" SET "owner" = ?, "status" = ?, "notes" = ?, "dueAt" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?;`,
    input.owner ?? str(existingRow, 'owner'),
    input.status ?? (str(existingRow, 'status', 'todo') as OpsAction['status']),
    input.notes === undefined ? nullableStr(existingRow, 'notes') : input.notes,
    input.due_at === undefined ? nullableStr(existingRow, 'dueAt') : input.due_at,
    id,
  );

  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsAction" WHERE "id" = ? LIMIT 1;`, id);
  return rows[0] ? mapAction(rows[0]) : null;
}

export async function createOpsView(input: {
  name: string;
  role: string;
  filters: Record<string, unknown>;
}): Promise<OpsView> {
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsView" ("id", "name", "role", "filtersJson") VALUES (?, ?, ?, ?);`,
    id,
    input.name,
    input.role,
    JSON.stringify(input.filters),
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsView" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to create view.');
  return mapView(rows[0]);
}

export async function listOpsViews(limit = 20, role?: string): Promise<OpsView[]> {
  await ensureOpsStore();
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const rows = role
    ? await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsView" WHERE "role" = ? ORDER BY datetime("createdAt") DESC LIMIT ?;`, role, safeLimit)
    : await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsView" ORDER BY datetime("createdAt") DESC LIMIT ?;`, safeLimit);
  return rows.map(mapView);
}

export async function createOpsWorkspace(input: {
  name: string;
  description?: string | null;
  focus?: string | null;
}): Promise<OpsWorkspace> {
  await ensureOpsStore();
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 20);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsWorkspace" ("id", "name", "description", "focus", "sharedToken") VALUES (?, ?, ?, ?, ?);`,
    id,
    input.name,
    input.description || null,
    input.focus || null,
    token,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsWorkspace" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to create workspace.');
  return mapWorkspace(rows[0]);
}

export async function listOpsWorkspaces(limit = 20): Promise<OpsWorkspace[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsWorkspace" ORDER BY datetime("updatedAt") DESC LIMIT ?;`, Math.max(1, Math.min(limit, 200)));
  return rows.map(mapWorkspace);
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
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsSearchFeedback" ("id", "query", "resultId", "resultName", "action", "correctedIndustry", "correctedProblemCategory", "correctedSolutionType") VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.query,
    input.result_id,
    input.result_name,
    input.action,
    input.corrected_industry || null,
    input.corrected_problem_category || null,
    input.corrected_solution_type || null,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `SELECT * FROM "OpsSearchFeedback" WHERE "id" = ? LIMIT 1;`,
    id,
  );
  if (!rows[0]) throw new Error('Failed to save search feedback.');
  return mapSearchFeedback(rows[0]);
}

export async function listOpsSearchFeedbackBoosts(limit = 500): Promise<OpsSearchFeedbackBoost[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `
      SELECT
        lower(trim("resultName")) AS "canonicalName",
        SUM(CASE WHEN "action" IN ('correct', 'saved', 'pilot', 'corrected') THEN 1 ELSE 0 END) AS "positiveSignals",
        SUM(CASE WHEN "action" = 'wrong' THEN 1 ELSE 0 END) AS "negativeSignals"
      FROM "OpsSearchFeedback"
      WHERE datetime("createdAt") >= datetime('now', '-90 days')
      GROUP BY lower(trim("resultName"))
      ORDER BY "positiveSignals" DESC
      LIMIT ?;
    `,
    Math.max(1, Math.min(limit, 4000)),
  );

  return rows.map((row) => {
    const positive = num(row, 'positiveSignals');
    const negative = num(row, 'negativeSignals');
    const total = Math.max(1, positive + negative);
    const ratio = (positive - negative) / total;
    return {
      canonical_name: str(row, 'canonicalName'),
      positive_signals: positive,
      negative_signals: negative,
      boost: Number(clamp(ratio * 0.22, -0.22, 0.22).toFixed(3)),
    };
  });
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
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsBuildRun" ("id", "mission", "sourcePromptHash", "selectedProvider", "sectionsJson", "blueprintJson", "failuresJson", "usageJson") VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.mission,
    input.source_prompt_hash,
    input.selected_provider || null,
    input.sections_json,
    input.blueprint_json,
    input.failures_json || '[]',
    input.usage_json || null,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `SELECT * FROM "OpsBuildRun" WHERE "id" = ? LIMIT 1;`,
    id,
  );
  if (!rows[0]) throw new Error('Failed to create build run.');
  return mapBuildRun(rows[0]);
}

export async function listOpsBuildRuns(limit = 12): Promise<OpsBuildRun[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `SELECT * FROM "OpsBuildRun" ORDER BY datetime("createdAt") DESC LIMIT ?;`,
    Math.max(1, Math.min(limit, 100)),
  );
  return rows.map(mapBuildRun);
}

function normalizeQueryString(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.length > 3500) {
    return trimmed.slice(0, 3500);
  }
  return trimmed.startsWith('?') ? trimmed : `?${trimmed}`;
}

export async function createOpsShareLink(input: {
  query_string: string;
  expires_in_hours?: number | null;
}): Promise<OpsShareLink> {
  await ensureOpsStore();
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '').slice(0, 22);
  const queryString = normalizeQueryString(input.query_string);
  const expiresHours = Number.isFinite(input.expires_in_hours)
    ? Math.max(1, Math.min(24 * 30, Math.round(input.expires_in_hours as number)))
    : null;
  const expiresAtIso =
    expiresHours === null
      ? null
      : new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsShareLink" ("id", "token", "queryString", "expiresAt") VALUES (?, ?, ?, ?);`,
    id,
    token,
    queryString,
    expiresAtIso,
  );

  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `SELECT * FROM "OpsShareLink" WHERE "id" = ? LIMIT 1;`,
    id,
  );
  if (!rows[0]) throw new Error('Failed to create share link.');
  return mapShareLink(rows[0]);
}

export async function getOpsShareLinkByToken(
  token: string,
  options?: { increment_view_count?: boolean },
): Promise<OpsShareLink | null> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `SELECT * FROM "OpsShareLink" WHERE "token" = ? LIMIT 1;`,
    token.trim(),
  );
  const row = rows[0];
  if (!row) return null;
  const mapped = mapShareLink(row);
  if (mapped.expires_at && new Date(mapped.expires_at).getTime() < Date.now()) {
    return null;
  }

  if (options?.increment_view_count) {
    await prisma.$executeRawUnsafe(
      `UPDATE "OpsShareLink" SET "viewCount" = "viewCount" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?;`,
      mapped.id,
    );
    const refreshed = await prisma.$queryRawUnsafe<SqlRow[]>(
      `SELECT * FROM "OpsShareLink" WHERE "id" = ? LIMIT 1;`,
      mapped.id,
    );
    return refreshed[0] ? mapShareLink(refreshed[0]) : mapped;
  }

  return mapped;
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
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsCrawlJob" ("id", "query", "industry", "region", "intentMode", "sourceTypesJson", "maxSources", "status", "attemptCount", "maxRetries", "nextRunAt") VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?);`,
    id,
    input.query,
    input.industry,
    input.region,
    input.intent_mode,
    JSON.stringify(input.source_types),
    input.max_sources,
    input.max_retries ?? 2,
    input.next_run_at || null,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsCrawlJob" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to create crawl job.');
  return mapJob(rows[0]);
}

export async function getOpsCrawlJob(id: string): Promise<OpsCrawlJob | null> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsCrawlJob" WHERE "id" = ? LIMIT 1;`, id);
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function listOpsCrawlJobs(limit = 40): Promise<OpsCrawlJob[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsCrawlJob" ORDER BY datetime("createdAt") DESC LIMIT ?;`, Math.max(1, Math.min(limit, 250)));
  return rows.map(mapJob);
}

export async function claimDueOpsCrawlJobs(workerId: string, limit = 1): Promise<OpsCrawlJob[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(
    `SELECT * FROM "OpsCrawlJob" WHERE "status" = 'queued' AND ("nextRunAt" IS NULL OR datetime("nextRunAt") <= CURRENT_TIMESTAMP) ORDER BY datetime("createdAt") ASC LIMIT ?;`,
    Math.max(1, Math.min(limit, 50)),
  );

  const claimed: OpsCrawlJob[] = [];
  for (const row of rows) {
    const rowId = str(row, 'id');
    if (!rowId) {
      continue;
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "OpsCrawlJob" SET "status" = 'running', "workerId" = ?, "startedAt" = CURRENT_TIMESTAMP, "attemptCount" = "attemptCount" + 1, "error" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ? AND "status" = 'queued';`,
      workerId,
      rowId,
    );
    const refreshed = await getOpsCrawlJob(rowId);
    if (refreshed && refreshed.status === 'running') claimed.push(refreshed);
  }
  return claimed;
}

export async function completeOpsCrawlJob(id: string): Promise<void> {
  await ensureOpsStore();
  await prisma.$executeRawUnsafe(`UPDATE "OpsCrawlJob" SET "status" = 'completed', "finishedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?;`, id);
}

export async function failOpsCrawlJob(id: string, error: string, scheduleRetry: boolean): Promise<void> {
  await ensureOpsStore();
  if (scheduleRetry) {
    await prisma.$executeRawUnsafe(`UPDATE "OpsCrawlJob" SET "status" = 'queued', "error" = ?, "nextRunAt" = datetime('now', '+15 minutes'), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?;`, error, id);
    return;
  }
  await prisma.$executeRawUnsafe(`UPDATE "OpsCrawlJob" SET "status" = 'failed', "error" = ?, "finishedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?;`, error, id);
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
  await ensureOpsStore();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OpsCrawlSnapshot" ("id", "jobId", "url", "sourceType", "title", "status", "httpStatus", "contentHash", "changed", "requiresJsRender", "qualityScore", "qualityFlagsJson", "provenanceSnippet", "extractedText") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.job_id,
    input.url,
    input.source_type,
    input.title,
    input.status,
    input.http_status ?? null,
    input.content_hash ?? null,
    input.changed ? 1 : 0,
    input.requires_js_render ? 1 : 0,
    input.quality_score,
    JSON.stringify(input.quality_flags),
    input.provenance_snippet,
    input.extracted_text ?? null,
  );
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsCrawlSnapshot" WHERE "id" = ? LIMIT 1;`, id);
  if (!rows[0]) throw new Error('Failed to create crawl snapshot.');
  return mapSnapshot(rows[0]);
}

export async function listOpsCrawlSnapshotsByJob(jobId: string): Promise<OpsCrawlSnapshot[]> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsCrawlSnapshot" WHERE "jobId" = ? ORDER BY datetime("createdAt") DESC;`, jobId);
  return rows.map(mapSnapshot);
}

export async function getLatestOpsSnapshotByUrl(url: string): Promise<OpsCrawlSnapshot | null> {
  await ensureOpsStore();
  const rows = await prisma.$queryRawUnsafe<SqlRow[]>(`SELECT * FROM "OpsCrawlSnapshot" WHERE "url" = ? ORDER BY datetime("createdAt") DESC LIMIT 1;`, url);
  return rows[0] ? mapSnapshot(rows[0]) : null;
}

