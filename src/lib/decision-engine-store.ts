import { randomUUID } from 'node:crypto';

import { type DecisionPack } from '@/lib/decision-engine';
import { prisma } from '@/lib/prisma';

type DecisionPackRow = {
  id: string;
  packId: string;
  companyName: string;
  industry: string;
  city: string;
  urgencyScore: number;
  timelineDays: number;
  kpiName: string;
  targetImprovementPercent: number;
  recommendedVendors: number;
  createdAt: Date | string;
};

type DecisionPackDetailRow = DecisionPackRow & {
  markdown: string;
  packJson: string;
  baselineValue: number;
  targetValue: number;
  budgetCeilingUsd: number;
};

export type DecisionPackHistoryItem = {
  id: string;
  pack_id: string;
  company_name: string;
  industry: string;
  city: string;
  urgency_score: number;
  timeline_days: number;
  kpi_name: string;
  target_improvement_percent: number;
  recommended_vendors: number;
  created_at: string;
};

export type DecisionPackHistoryDetail = DecisionPackHistoryItem & {
  baseline_value: number;
  target_value: number;
  budget_ceiling_usd: number;
  markdown: string;
  pack: DecisionPack;
};

let initialized = false;

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapHistoryRow(row: DecisionPackRow): DecisionPackHistoryItem {
  return {
    id: row.id,
    pack_id: row.packId,
    company_name: row.companyName,
    industry: row.industry,
    city: row.city,
    urgency_score: Number(row.urgencyScore),
    timeline_days: Number(row.timelineDays),
    kpi_name: row.kpiName,
    target_improvement_percent: Number(row.targetImprovementPercent),
    recommended_vendors: Number(row.recommendedVendors),
    created_at: toIsoString(row.createdAt),
  };
}

async function ensureDecisionPackStore() {
  if (initialized) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DecisionPackRun" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "packId" TEXT NOT NULL UNIQUE,
      "companyName" TEXT NOT NULL,
      "industry" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "urgencyScore" INTEGER NOT NULL,
      "timelineDays" INTEGER NOT NULL,
      "kpiName" TEXT NOT NULL,
      "baselineValue" REAL NOT NULL,
      "targetValue" REAL NOT NULL,
      "targetImprovementPercent" REAL NOT NULL,
      "budgetCeilingUsd" REAL NOT NULL,
      "recommendedVendors" INTEGER NOT NULL,
      "packJson" TEXT NOT NULL,
      "markdown" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DecisionPackRun_createdAt_idx"
    ON "DecisionPackRun"("createdAt");
  `);

  initialized = true;
}

export async function saveDecisionPackRun(
  pack: DecisionPack,
  markdown: string,
): Promise<DecisionPackHistoryItem> {
  await ensureDecisionPackStore();

  const rowId = randomUUID();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "DecisionPackRun" (
        "id",
        "packId",
        "companyName",
        "industry",
        "city",
        "urgencyScore",
        "timelineDays",
        "kpiName",
        "baselineValue",
        "targetValue",
        "targetImprovementPercent",
        "budgetCeilingUsd",
        "recommendedVendors",
        "packJson",
        "markdown"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    rowId,
    pack.pack_id,
    pack.company_profile.company_name,
    pack.company_profile.industry,
    pack.company_profile.city,
    pack.interpreted_problem.urgency_score,
    pack.pilot_blueprint.duration_days,
    pack.pilot_blueprint.kpi.name,
    pack.pilot_blueprint.kpi.baseline_value,
    pack.pilot_blueprint.kpi.target_value,
    pack.pilot_blueprint.kpi.target_improvement_percent,
    pack.pilot_blueprint.budget_guardrails.ceiling_usd,
    pack.vendor_recommendations.length,
    JSON.stringify(pack),
    markdown,
  );

  const rows = await prisma.$queryRawUnsafe<DecisionPackRow[]>(
    `
      SELECT
        "id",
        "packId",
        "companyName",
        "industry",
        "city",
        "urgencyScore",
        "timelineDays",
        "kpiName",
        "targetImprovementPercent",
        "recommendedVendors",
        "createdAt"
      FROM "DecisionPackRun"
      WHERE "id" = ?
      LIMIT 1;
    `,
    rowId,
  );

  if (!rows[0]) {
    throw new Error('Failed to read persisted decision pack.');
  }

  return mapHistoryRow(rows[0]);
}

export async function listDecisionPackRuns(limit = 20): Promise<DecisionPackHistoryItem[]> {
  await ensureDecisionPackStore();
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 20;

  const rows = await prisma.$queryRawUnsafe<DecisionPackRow[]>(
    `
      SELECT
        "id",
        "packId",
        "companyName",
        "industry",
        "city",
        "urgencyScore",
        "timelineDays",
        "kpiName",
        "targetImprovementPercent",
        "recommendedVendors",
        "createdAt"
      FROM "DecisionPackRun"
      ORDER BY datetime("createdAt") DESC
      LIMIT ?;
    `,
    normalizedLimit,
  );

  return rows.map(mapHistoryRow);
}

export async function getDecisionPackRun(
  id: string,
): Promise<DecisionPackHistoryDetail | null> {
  await ensureDecisionPackStore();

  const rows = await prisma.$queryRawUnsafe<DecisionPackDetailRow[]>(
    `
      SELECT
        "id",
        "packId",
        "companyName",
        "industry",
        "city",
        "urgencyScore",
        "timelineDays",
        "kpiName",
        "targetImprovementPercent",
        "recommendedVendors",
        "createdAt",
        "baselineValue",
        "targetValue",
        "budgetCeilingUsd",
        "packJson",
        "markdown"
      FROM "DecisionPackRun"
      WHERE "id" = ?
      LIMIT 1;
    `,
    id,
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const parsedPack = JSON.parse(row.packJson) as DecisionPack;
  const historyItem = mapHistoryRow(row);

  return {
    ...historyItem,
    baseline_value: Number(row.baselineValue),
    target_value: Number(row.targetValue),
    budget_ceiling_usd: Number(row.budgetCeilingUsd),
    markdown: row.markdown,
    pack: parsedPack,
  };
}
