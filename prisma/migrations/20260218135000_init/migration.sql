PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Result";
DROP TABLE IF EXISTS "BudgetCalc";
DROP TABLE IF EXISTS "Document";
DROP TABLE IF EXISTS "Pilot";
DROP TABLE IF EXISTS "Match";
DROP TABLE IF EXISTS "Vendor";
DROP TABLE IF EXISTS "Challenge";

CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'El Paso',
    "kpiName" TEXT NOT NULL,
    "desiredOutcome" TEXT NOT NULL,
    "baselineValue" REAL,
    "targetValue" REAL,
    "timelineDays" INTEGER NOT NULL DEFAULT 45,
    "budgetMin" REAL,
    "budgetMax" REAL,
    "fundingStatus" TEXT NOT NULL DEFAULT 'EXPLORATION',
    "status" TEXT NOT NULL DEFAULT 'REVIEWING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "website" TEXT,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "typicalMinCost" REAL,
    "typicalMaxCost" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "solutionSummary" TEXT NOT NULL,
    "pilotPlan" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "proposedCost" REAL,
    "measurementPlan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Pilot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "kpiBaseline" REAL NOT NULL,
    "kpiTarget" REAL NOT NULL,
    "kpiCurrent" REAL NOT NULL,
    "weeklyUpdates" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pilot_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pilot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pilotId" TEXT,
    "vendorId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BudgetCalc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pilotId" TEXT NOT NULL,
    "pilotCost" REAL NOT NULL,
    "monthlyBenefit" REAL NOT NULL,
    "roiPercent" REAL NOT NULL,
    "paybackMonths" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetCalc_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Result" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pilotId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeAfter" TEXT NOT NULL,
    "improvementPercent" REAL NOT NULL,
    "lessonsLearned" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Result_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Result_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX "Challenge_city_status_idx" ON "Challenge"("city", "status");
CREATE INDEX "Vendor_email_idx" ON "Vendor"("email");
CREATE INDEX "Match_challengeId_status_idx" ON "Match"("challengeId", "status");
CREATE INDEX "Match_vendorId_status_idx" ON "Match"("vendorId", "status");
CREATE UNIQUE INDEX "Pilot_challengeId_key" ON "Pilot"("challengeId");
CREATE UNIQUE INDEX "Pilot_matchId_key" ON "Pilot"("matchId");
CREATE INDEX "Pilot_status_idx" ON "Pilot"("status");
CREATE INDEX "Document_pilotId_status_idx" ON "Document"("pilotId", "status");
CREATE INDEX "Document_vendorId_status_idx" ON "Document"("vendorId", "status");
CREATE UNIQUE INDEX "BudgetCalc_pilotId_key" ON "BudgetCalc"("pilotId");
CREATE UNIQUE INDEX "Result_pilotId_key" ON "Result"("pilotId");
CREATE UNIQUE INDEX "Result_challengeId_key" ON "Result"("challengeId");
CREATE INDEX "Result_published_idx" ON "Result"("published");

PRAGMA foreign_keys=ON;

