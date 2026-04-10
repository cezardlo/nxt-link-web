// Conference intelligence barrel — NXT//LINK platform
// Combines all conference data files into a single CONFERENCES export.
// Provides continent-aware grouping and classification utilities.

export type { ConferenceRecord, ConferenceCategory, Continent } from './types';
export {
  classifyConference,
  classifyAll,
  groupByContinent,
  getContinentStats,
} from './geo-classifier';

import { CORE_CONFERENCES } from './core';
import { DEFENSE_GOV_CONFERENCES } from './defense-gov';
import { TECH_AI_CONFERENCES } from './tech-ai';
import { MANUFACTURING_CONFERENCES } from './manufacturing';
import { ENERGY_ENV_CONFERENCES } from './energy-env';
import { HEALTHCARE_BIO_CONFERENCES } from './healthcare-bio';
import { LOGISTICS_TRANSPORT_CONFERENCES } from './logistics-transport';
import { FINANCE_PRO_CONFERENCES } from './finance-pro';
import { CONSUMER_AGRI_CONFERENCES } from './consumer-agri';
import { GLOBAL_ADDITION_CONFERENCES } from './global-additions';
import { WORLDWIDE_SCRAPE_CONFERENCES } from './worldwide-scrape-targets';
import { classifyAll } from './geo-classifier';
import type { Continent } from './types';

// ── Raw conferences (unclassified) ──────────────────────────────────────────

const RAW_CONFERENCES = [
  ...CORE_CONFERENCES,
  ...DEFENSE_GOV_CONFERENCES,
  ...TECH_AI_CONFERENCES,
  ...MANUFACTURING_CONFERENCES,
  ...ENERGY_ENV_CONFERENCES,
  ...HEALTHCARE_BIO_CONFERENCES,
  ...LOGISTICS_TRANSPORT_CONFERENCES,
  ...FINANCE_PRO_CONFERENCES,
  ...CONSUMER_AGRI_CONFERENCES,
  ...GLOBAL_ADDITION_CONFERENCES,
  ...WORLDWIDE_SCRAPE_CONFERENCES,
];

// ── Deduplicate by ID ───────────────────────────────────────────────────────

function dedup<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

// ── Lazy classification (avoids blocking module load) ───────────────────────

let _cache: ReturnType<typeof classifyAll> | null = null;

/** All conferences, deduplicated and classified with country + continent */
export function getConferences() {
  if (!_cache) _cache = dedup(classifyAll(RAW_CONFERENCES));
  return _cache;
}

// Direct export for backward compat — triggers classification on first access
export const CONFERENCES = dedup(classifyAll(RAW_CONFERENCES));

/** Conferences grouped by continent */
export function getConferencesByContinent(continent: Continent) {
  return getConferences().filter((c) => c.continent === continent);
}

/** Conferences grouped by country */
export function getConferencesByCountry(country: string) {
  return getConferences().filter(
    (c) => c.country.toLowerCase() === country.toLowerCase(),
  );
}

/** Total conference count */
export const CONFERENCE_COUNT = RAW_CONFERENCES.length;
