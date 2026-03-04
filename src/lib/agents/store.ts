import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import type { AgentRunOutput, AgentRunSummary } from '@/lib/agents/types';

type AgentRunRow = {
  id: string;
  runId: string;
  companyName: string;
  industry: string;
  problemSummary: string;
  agentsRun: string;
  totalLatencyMs: number;
  createdAt: Date | string;
};

type AgentRunDetailRow = AgentRunRow & {
  outputJson: string;
};

let initialized = false;

function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapSummaryRow(row: AgentRunRow): AgentRunSummary {
  return {
    id: row.id,
    run_id: row.runId,
    company_name: row.companyName,
    industry: row.industry,
    problem_summary: row.problemSummary,
    agents_run: row.agentsRun,
    total_latency_ms: Number(row.totalLatencyMs),
    created_at: toIsoString(row.createdAt),
  };
}

async function ensureAgentStore() {
  if (initialized) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AgentRun" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "runId" TEXT NOT NULL UNIQUE,
      "companyName" TEXT NOT NULL,
      "industry" TEXT NOT NULL,
      "problemSummary" TEXT NOT NULL,
      "agentsRun" TEXT NOT NULL,
      "totalLatencyMs" INTEGER NOT NULL,
      "outputJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AgentRun_createdAt_idx"
    ON "AgentRun"("createdAt");
  `);

  initialized = true;
}

export async function saveAgentRun(output: AgentRunOutput): Promise<AgentRunSummary> {
  await ensureAgentStore();

  const rowId = randomUUID();
  const agentsRun = output.steps.map((s) => s.agent).join(',');
  const problemSummary = output.routing.problem_summary.slice(0, 300);

  const createdAt = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "AgentRun" (
        "id", "runId", "companyName", "industry",
        "problemSummary", "agentsRun", "totalLatencyMs", "outputJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    rowId,
    output.run_id,
    output.company_name,
    output.industry,
    problemSummary,
    agentsRun,
    output.total_latency_ms,
    JSON.stringify(output),
    createdAt,
  );

  // Construct return value directly from inputs — no round-trip SELECT needed.
  return {
    id: rowId,
    run_id: output.run_id,
    company_name: output.company_name,
    industry: output.industry,
    problem_summary: problemSummary,
    agents_run: agentsRun,
    total_latency_ms: output.total_latency_ms,
    created_at: createdAt,
  };
}

export async function listAgentRuns(limit = 20): Promise<AgentRunSummary[]> {
  await ensureAgentStore();
  const n = Math.max(1, Math.min(100, limit));

  const rows = await prisma.$queryRawUnsafe<AgentRunRow[]>(
    `SELECT "id","runId","companyName","industry","problemSummary","agentsRun","totalLatencyMs","createdAt"
     FROM "AgentRun"
     ORDER BY datetime("createdAt") DESC
     LIMIT ?;`,
    n,
  );

  return rows.map(mapSummaryRow);
}

export async function getAgentRun(id: string): Promise<AgentRunOutput | null> {
  await ensureAgentStore();

  const rows = await prisma.$queryRawUnsafe<AgentRunDetailRow[]>(
    `SELECT "id","runId","companyName","industry","problemSummary","agentsRun","totalLatencyMs","createdAt","outputJson"
     FROM "AgentRun" WHERE "id" = ? OR "runId" = ? LIMIT 1;`,
    id,
    id,
  );

  const row = rows[0];
  if (!row) return null;

  return JSON.parse(row.outputJson) as AgentRunOutput;
}
