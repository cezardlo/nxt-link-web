// src/lib/agents/agents/audit-agent.ts
// Platform Audit Agent — deterministic, offline checks for data quality,
// UI consistency, contract data health, and infrastructure readiness.
// No LLM calls, no external HTTP — runs in ~50ms.

import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import { NXT_ENTITIES, type NxtEntity } from '@/lib/intelligence/nxt-entities';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'critical' | 'warning' | 'info';

export type AuditCategory =
  | 'vendor-data'
  | 'entity-alignment'
  | 'duplicate-data'
  | 'design-system'
  | 'hardcoded-data'
  | 'layer-state'
  | 'api-route'
  | 'contract-data'
  | 'sam-coverage';

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  affectedKey: string;
  affectedFile?: string;
  suggestedFix?: string;
};

export type AuditSection = {
  id: string;
  label: string;
  findings: AuditFinding[];
  passCount: number;
  checkCount: number;
};

export type AuditReport = {
  as_of: string;
  duration_ms: number;
  total_findings: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  score: number;
  sections: AuditSection[];
};

// ─── Cache ──────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedReport: AuditReport | null = null;
let reportExpiresAt = 0;
let inFlightRun: Promise<AuditReport> | null = null;

export function getCachedAuditReport(): AuditReport | null {
  if (cachedReport && Date.now() < reportExpiresAt) return cachedReport;
  return null;
}

function setCachedAuditReport(report: AuditReport): void {
  cachedReport = report;
  reportExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── Static constants (from client-side files we can't import server-side) ────

const EP_LAT_MIN = 31.5;
const EP_LAT_MAX = 32.1;
const EP_LON_MIN = -107.0;
const EP_LON_MAX = -106.0;

/** LayerState keys from src/app/map/page.tsx */
const LAYER_STATE_KEYS = [
  'globalHubs', 'conferences',
  'vendors', 'samBusinesses', 'products', 'funding', 'patents', 'hiring', 'news',
  'ikerScores', 'ikerRisk', 'momentum', 'adoption',
  'flights', 'military', 'seismic', 'borderTrade', 'crimeNews', 'samContracts', 'liveTV',
];

/** GROUPS layer keys from src/components/MapLayerPanel.tsx */
const GROUPS_LAYER_KEYS = [
  'globalHubs', 'conferences',
  'flights', 'military', 'seismic', 'borderTrade', 'crimeNews', 'samContracts', 'liveTV',
  'vendors', 'products', 'samBusinesses',
  'momentum', 'adoption',
  'funding', 'patents', 'hiring', 'news',
  'ikerScores', 'ikerRisk',
];

/** CATEGORY_COLOR keys from src/app/vendors/page.tsx */
const CATEGORY_COLOR_KEYS = [
  'Defense', 'Defense IT', 'AI / ML', 'Cybersecurity', 'Logistics',
  'Border Tech', 'Water Tech', 'Energy', 'Health Tech', 'Manufacturing',
  'FinTech', 'Analytics',
];

/** SAM entity-check EP_KNOWN_VENDORS keys from src/app/api/sam/entity-check/route.ts */
const SAM_FALLBACK_KEYS = [
  'l3harris', 'saic', 'raytheon', 'northrop', 'lockheed', 'boeing', 'bae',
  'general dynamics', 'leidos', 'booz allen', 'palantir', 'caci', 'crowdstrike',
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function finding(
  id: string,
  category: AuditCategory,
  severity: AuditSeverity,
  title: string,
  description: string,
  affectedKey: string,
  affectedFile?: string,
  suggestedFix?: string,
): AuditFinding {
  return { id, category, severity, title, description, affectedKey, affectedFile, suggestedFix };
}

function buildSection(id: string, label: string, findings: AuditFinding[], checkCount: number): AuditSection {
  return { id, label, findings, passCount: Math.max(0, checkCount - findings.length), checkCount };
}

// ─── Check A: Vendor Data Completeness ──────────────────────────────────────────

function auditVendorDataCompleteness(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const vendors = Object.entries(EL_PASO_VENDORS);
  const file = 'src/lib/data/el-paso-vendors.ts';

  for (const [id, v] of vendors) {
    if (!v.website || !v.website.startsWith('https://')) {
      results.push(finding(
        `vendor-website-${id}`, 'vendor-data', 'warning',
        'Missing or invalid website',
        `${v.name} has website "${v.website}" — expected https:// URL`,
        id, file, 'Add a valid HTTPS website URL',
      ));
    }
    if (v.evidence.length < 3) {
      results.push(finding(
        `vendor-evidence-${id}`, 'vendor-data', 'warning',
        'Insufficient evidence',
        `${v.name} has ${v.evidence.length} evidence items (minimum 3)`,
        id, file, 'Add at least 3 evidence bullets',
      ));
    }
    if (v.ikerScore < 0 || v.ikerScore > 100) {
      results.push(finding(
        `vendor-iker-range-${id}`, 'vendor-data', 'critical',
        'IKER score out of range',
        `${v.name} has ikerScore=${v.ikerScore} — must be 0–100`,
        id, file, 'Fix ikerScore to be within 0–100',
      ));
    }
    if (id.startsWith('ep-') && (v.lat < EP_LAT_MIN || v.lat > EP_LAT_MAX)) {
      results.push(finding(
        `vendor-lat-bounds-${id}`, 'vendor-data', 'critical',
        'Latitude out of El Paso bounds',
        `${v.name} lat=${v.lat} — El Paso range is ${EP_LAT_MIN}–${EP_LAT_MAX}`,
        id, file, 'Correct latitude to El Paso metro area',
      ));
    }
    if (id.startsWith('ep-') && (v.lon < EP_LON_MIN || v.lon > EP_LON_MAX)) {
      results.push(finding(
        `vendor-lon-bounds-${id}`, 'vendor-data', 'critical',
        'Longitude out of El Paso bounds',
        `${v.name} lon=${v.lon} — El Paso range is ${EP_LON_MIN}–${EP_LON_MAX}`,
        id, file, 'Correct longitude to El Paso metro area',
      ));
    }
    if (!v.tags || v.tags.length === 0) {
      results.push(finding(
        `vendor-tags-${id}`, 'vendor-data', 'info',
        'No tags',
        `${v.name} has no tags — reduces filter/search surface`,
        id, file, 'Add relevant tags',
      ));
    }
    if (!v.category) {
      results.push(finding(
        `vendor-category-${id}`, 'vendor-data', 'warning',
        'Missing category',
        `${v.name} has no category — will not appear in filtered views`,
        id, file, 'Assign a category',
      ));
    }
  }

  // 7 checks per vendor
  return { findings: results, checks: vendors.length * 7 };
}

// ─── Check B: Vendor Duplicates ─────────────────────────────────────────────────

function auditVendorDuplicates(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const file = 'src/lib/data/el-paso-vendors.ts';
  const entries = Object.entries(EL_PASO_VENDORS);

  // Name-based duplicates
  const nameMap = new Map<string, string[]>();
  for (const [id, v] of entries) {
    const normalized = v.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = nameMap.get(normalized) ?? [];
    existing.push(id);
    nameMap.set(normalized, existing);
  }
  for (const [, ids] of Array.from(nameMap.entries() as Iterable<[string, string[]]>)) {
    if (ids.length > 1) {
      results.push(finding(
        `vendor-dup-name-${ids.join('-')}`, 'duplicate-data', 'warning',
        'Duplicate vendor name',
        `Vendors ${ids.join(', ')} have the same normalized name`,
        ids[0], file, 'Merge or differentiate these vendors',
      ));
    }
  }

  // Coordinate-based duplicates (same pixel on map)
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [idA, vA] = entries[i];
      const [idB, vB] = entries[j];
      if (Math.abs(vA.lat - vB.lat) < 0.0001 && Math.abs(vA.lon - vB.lon) < 0.0001) {
        results.push(finding(
          `vendor-dup-coords-${idA}-${idB}`, 'duplicate-data', 'info',
          'Overlapping coordinates',
          `${vA.name} and ${vB.name} are at nearly identical positions (< 0.0001 deg apart)`,
          idA, file, 'Offset one vendor slightly for map visibility',
        ));
      }
    }
  }

  return { findings: results, checks: entries.length };
}

// ─── Check C: Entity–Vendor Alignment ───────────────────────────────────────────

function auditEntityVendorAlignment(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const vendorIds = new Set(Object.keys(EL_PASO_VENDORS));
  const entityIds = new Set(NXT_ENTITIES.map((e: NxtEntity) => e.id));

  // Entities without matching vendor
  for (const entity of NXT_ENTITIES) {
    if (!entity.id.startsWith('ep-')) continue;
    if (!vendorIds.has(entity.id)) {
      results.push(finding(
        `entity-orphan-${entity.id}`, 'entity-alignment', 'warning',
        'Entity without VendorRecord',
        `NxtEntity "${entity.name}" (${entity.id}) has no matching VendorRecord`,
        entity.id,
        'src/lib/intelligence/nxt-entities.ts',
        'Add a VendorRecord in el-paso-vendors.ts or remove the entity',
      ));
    }
  }

  // Vendors without matching entity
  for (const [id, v] of Object.entries(EL_PASO_VENDORS)) {
    if (!id.startsWith('ep-')) continue;
    if (!entityIds.has(id)) {
      results.push(finding(
        `vendor-no-entity-${id}`, 'entity-alignment', 'info',
        'Vendor without entity',
        `VendorRecord "${v.name}" (${id}) has no matching NxtEntity — signal engine won't detect it in news`,
        id,
        'src/lib/data/el-paso-vendors.ts',
        'Add an NxtEntity in nxt-entities-elpaso.ts',
      ));
    }
  }

  const epEntities = NXT_ENTITIES.filter((e: NxtEntity) => e.id.startsWith('ep-')).length;
  const epVendors = Object.keys(EL_PASO_VENDORS).filter(id => id.startsWith('ep-')).length;
  return { findings: results, checks: epEntities + epVendors };
}

// ─── Check D: SAM Fallback Coverage ─────────────────────────────────────────────

function auditSAMFallbackCoverage(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const epVendors = Object.entries(EL_PASO_VENDORS).filter(([id]) => id.startsWith('ep-'));
  let covered = 0;

  for (const [, v] of epVendors) {
    const nameLower = v.name.toLowerCase();
    const hasFallback = SAM_FALLBACK_KEYS.some(key => nameLower.includes(key));
    if (hasFallback) {
      covered++;
    }
  }

  const pct = epVendors.length > 0 ? Math.round((covered / epVendors.length) * 100) : 0;

  if (pct < 50) {
    results.push(finding(
      'sam-coverage-low', 'sam-coverage', 'warning',
      'Low SAM fallback coverage',
      `Only ${covered}/${epVendors.length} (${pct}%) EP vendors have SAM entity-check fallback entries`,
      'EP_KNOWN_VENDORS',
      'src/app/api/sam/entity-check/route.ts',
      'Add more vendors to EP_KNOWN_VENDORS in entity-check route',
    ));
  } else {
    results.push(finding(
      'sam-coverage-ok', 'sam-coverage', 'info',
      'SAM fallback coverage',
      `${covered}/${epVendors.length} (${pct}%) EP vendors have SAM entity-check fallback entries`,
      'EP_KNOWN_VENDORS',
      'src/app/api/sam/entity-check/route.ts',
    ));
  }

  return { findings: results, checks: epVendors.length };
}

// ─── Check E: Category Color Coverage ───────────────────────────────────────────

function auditCategoryColorCoverage(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const allCategories = new Set(Object.values(EL_PASO_VENDORS).map((v: VendorRecord) => v.category));
  const colorKeysLower = CATEGORY_COLOR_KEYS.map(k => k.toLowerCase());

  for (const cat of Array.from(allCategories)) {
    if (!cat) continue;
    const match = colorKeysLower.some(key => cat.toLowerCase().includes(key));
    if (!match) {
      results.push(finding(
        `category-no-color-${cat.replace(/\s+/g, '-').toLowerCase()}`,
        'vendor-data', 'info',
        `Category missing color: ${cat}`,
        `Vendor category "${cat}" has no entry in CATEGORY_COLOR — renders as grey #6b7280`,
        cat,
        'src/app/vendors/page.tsx',
        `Add '${cat}' to the CATEGORY_COLOR map`,
      ));
    }
  }

  return { findings: results, checks: allCategories.size };
}

// ─── Check F: Hardcoded / Stale Data ────────────────────────────────────────────

function auditHardcodedData(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const epCount = Object.keys(EL_PASO_VENDORS).filter(id => id.startsWith('ep-')).length;

  // Landing page says "40+"
  if (epCount > 45) {
    results.push(finding(
      'stale-vendor-count', 'hardcoded-data', 'warning',
      'Stale vendor count on landing page',
      `Landing page displays "40+" but actual EP vendor count is ${epCount}`,
      'STATS[0].value',
      'src/app/page.tsx',
      `Update STATS value to "${epCount}+" or dynamically compute it`,
    ));
  }

  // USASpending FY range
  const now = new Date();
  const fyEnd = new Date('2026-09-30');
  const monthsUntilExpiry = (fyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsUntilExpiry < 3) {
    results.push(finding(
      'usaspending-fy-expiring', 'contract-data', 'warning',
      'USASpending date range expiring soon',
      `Hardcoded FY range ends 2026-09-30 — ${Math.round(monthsUntilExpiry)} months remaining`,
      'fetchUSASpending date_signed range',
      'src/lib/contracts/fetchers.ts',
      'Make the fiscal year range dynamic based on current date',
    ));
  } else {
    results.push(finding(
      'usaspending-fy-hardcoded', 'contract-data', 'info',
      'USASpending FY range is hardcoded',
      `Date range 2025-10-01 to 2026-09-30 is static — will need update for FY2027`,
      'fetchUSASpending date_signed range',
      'src/lib/contracts/fetchers.ts',
      'Consider making the fiscal year range dynamic',
    ));
  }

  // Static contract fallback dates
  results.push(finding(
    'contract-fallback-dates', 'contract-data', 'info',
    'Contract fallback dates are static',
    'buildContractsFallback() uses hardcoded dates (2026-01-15, 2025-11-03, etc.) that will age',
    'buildContractsFallback',
    'src/lib/contracts/fetchers.ts',
    'Use relative date computation for fallback entries',
  ));

  return { findings: results, checks: 3 };
}

// ─── Check G: Layer State Sync ──────────────────────────────────────────────────

function auditLayerStateSync(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];
  const stateSet = new Set(LAYER_STATE_KEYS);
  const groupsSet = new Set(GROUPS_LAYER_KEYS);

  // Keys in LayerState but not in GROUPS (no UI toggle)
  for (const key of LAYER_STATE_KEYS) {
    if (!groupsSet.has(key)) {
      results.push(finding(
        `layer-no-toggle-${key}`, 'layer-state', 'warning',
        `Layer "${key}" has no UI toggle`,
        `LayerState has "${key}" but MapLayerPanel GROUPS does not — users cannot toggle it`,
        key,
        'src/components/MapLayerPanel.tsx',
        `Add "${key}" to the GROUPS array in MapLayerPanel`,
      ));
    }
  }

  // Keys in GROUPS but not in LayerState (would silently fail)
  for (const key of GROUPS_LAYER_KEYS) {
    if (!stateSet.has(key)) {
      results.push(finding(
        `layer-undefined-${key}`, 'layer-state', 'critical',
        `GROUPS references undefined layer "${key}"`,
        `MapLayerPanel GROUPS has "${key}" but it is not in LayerState — toggle would silently fail`,
        key,
        'src/app/map/page.tsx',
        `Add "${key}" to the LayerState interface`,
      ));
    }
  }

  return { findings: results, checks: LAYER_STATE_KEYS.length + GROUPS_LAYER_KEYS.length };
}

// ─── Check H: Design System Compliance ──────────────────────────────────────────

function auditDesignSystemCompliance(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];

  // Known deviations found during code exploration
  results.push(finding(
    'color-orange-deviation', 'design-system', 'info',
    'Non-canonical orange in use',
    'src/app/vendors/page.tsx uses #ff8c00 for Defense category. CLAUDE.md canonical orange is #f97316. Landing page also uses #ff8c00 for LIVE FEEDS. This may be intentional (warm vs alert orange) but is undocumented.',
    '#ff8c00 vs #f97316',
    'src/app/vendors/page.tsx',
    'Document the dual-orange convention or standardize to #f97316',
  ));

  return { findings: results, checks: 1 };
}

// ─── Check I: Environment Variable Dependency Map ───────────────────────────────

type EnvVarDep = {
  name: string;
  usedBy: string;
  fallback: string;
};

const ENV_VAR_DEPS: EnvVarDep[] = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL + ANON_KEY', usedBy: '/vendors page, BaseAgent pipeline', fallback: 'Supabase features disabled, isSupabaseConfigured() returns false' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', usedBy: 'Vendor discovery agent', fallback: 'Vendor-to-Supabase sync disabled' },
  { name: 'GEMINI_API_KEY', usedBy: 'Feed enrichment, mission briefing', fallback: 'Feeds return raw RSS without AI classification' },
  { name: 'SAM_GOV_API_KEY', usedBy: 'SAM businesses, entity-check, exclusions, contracts', fallback: 'Static fallback data from EP_KNOWN_VENDORS / buildContractsFallback()' },
  { name: 'GOOGLE_SERVICE_ACCOUNT_KEY_JSON + GOOGLE_DOC_ID', usedBy: 'Docs sync agent', fallback: 'Docs agent disabled' },
  { name: 'DATABASE_URL', usedBy: 'Prisma client, AgentRun store', fallback: 'DB-backed features unavailable' },
  { name: 'INTEL_API_URL', usedBy: '/api/intel/[...path] proxy', fallback: 'Falls back to http://localhost:8100 (dead in production)' },
];

function auditEnvVarDependencyMap(): { findings: AuditFinding[]; checks: number } {
  const results: AuditFinding[] = [];

  for (const dep of ENV_VAR_DEPS) {
    results.push(finding(
      `env-dep-${dep.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      'api-route', 'info',
      `Env: ${dep.name}`,
      `Used by: ${dep.usedBy}. Fallback: ${dep.fallback}`,
      dep.name,
    ));
  }

  return { findings: results, checks: ENV_VAR_DEPS.length };
}

// ─── Main Orchestration ─────────────────────────────────────────────────────────

async function doRunAuditAgent(): Promise<AuditReport> {
  const t0 = Date.now();

  const vendorData    = auditVendorDataCompleteness();
  const duplicates    = auditVendorDuplicates();
  const alignment     = auditEntityVendorAlignment();
  const samCoverage   = auditSAMFallbackCoverage();
  const categoryColor = auditCategoryColorCoverage();
  const hardcoded     = auditHardcodedData();
  const layerSync     = auditLayerStateSync();
  const designSystem  = auditDesignSystemCompliance();
  const envVars       = auditEnvVarDependencyMap();

  const sections: AuditSection[] = [
    buildSection('vendor-data',      'Vendor Data Quality',    vendorData.findings,    vendorData.checks),
    buildSection('duplicate-data',   'Duplicate Detection',    duplicates.findings,    duplicates.checks),
    buildSection('entity-alignment', 'Entity–Vendor Alignment', alignment.findings,    alignment.checks),
    buildSection('sam-coverage',     'SAM Fallback Coverage',  samCoverage.findings,   samCoverage.checks),
    buildSection('category-colors',  'Category Colors',        categoryColor.findings, categoryColor.checks),
    buildSection('hardcoded-data',   'Hardcoded / Stale Data', hardcoded.findings,     hardcoded.checks),
    buildSection('layer-state',      'Layer State Sync',       layerSync.findings,     layerSync.checks),
    buildSection('design-system',    'Design System',          designSystem.findings,  designSystem.checks),
    buildSection('env-vars',         'Env Var Dependencies',   envVars.findings,       envVars.checks),
  ];

  const allFindings = sections.flatMap(s => s.findings);
  const critical = allFindings.filter(f => f.severity === 'critical').length;
  const warnings = allFindings.filter(f => f.severity === 'warning').length;
  const infos    = allFindings.filter(f => f.severity === 'info').length;

  const score = Math.max(0, Math.round(100 - critical * 10 - warnings * 3 - infos * 0.5));

  const report: AuditReport = {
    as_of: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    total_findings: allFindings.length,
    critical_count: critical,
    warning_count: warnings,
    info_count: infos,
    score,
    sections,
  };

  setCachedAuditReport(report);
  return report;
}

export async function runAuditAgent(): Promise<AuditReport> {
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRunAuditAgent().finally(() => { inFlightRun = null; });
  return inFlightRun;
}
