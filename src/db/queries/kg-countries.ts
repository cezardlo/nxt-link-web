// src/db/queries/kg-countries.ts — queries for countries + continents tables

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CountryRow = {
  id: string;
  iso_alpha2: string;
  iso_alpha3: string | null;
  name: string;
  continent_id: string | null;
  region: string | null;
  population: number | null;
  gdp_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ContinentRow = {
  id: string;
  code: string;
  name: string;
  created_at: string;
};

export type CountryQueryOptions = {
  continent_id?: string;
};

// ─── Country Queries ──────────────────────────────────────────────────────────

/** List countries, optionally filtered by continent */
export async function getCountries(
  opts: CountryQueryOptions = {},
): Promise<CountryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  let query = db
    .from('countries')
    .select('*')
    .order('name');

  if (opts.continent_id) query = query.eq('continent_id', opts.continent_id);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as CountryRow[];
}

/** Get a single country by ISO alpha-2 code */
export async function getCountryByIso(iso: string): Promise<CountryRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const { data, error } = await db
    .from('countries')
    .select('*')
    .eq('iso_alpha2', iso.toUpperCase())
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as CountryRow;
}

// ─── Continent Queries ────────────────────────────────────────────────────────

/** List all continents */
export async function getContinents(): Promise<ContinentRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('continents')
    .select('*')
    .order('name');

  if (error || !data) return [];
  return data as ContinentRow[];
}
