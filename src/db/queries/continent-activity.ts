// src/db/queries/continent-activity.ts
// Persistence layer for continent-level intelligence reports.
// Follows the same pattern as country-activity.ts — Supabase with TS fallback.

import { getDb, isSupabaseConfigured } from '../client';
import type { ContinentIntelReport } from '@/lib/agents/agents/continent-intel-agent';
import type { ContinentId } from '@/lib/data/continent-departments';

// ── Types ────────────────────────────────────────────────────────────────────

export type ContinentActivityRow = {
  continent_id: string;
  label: string;
  color: string;
  signal_count_30d: number;
  signal_velocity: number;
  top_industries: Array<{ name: string; count: number }>;
  top_countries: Array<{ code: string; count: number }>;
  top_companies: Array<{ name: string; count: number }>;
  heat_score: number;
  trend_direction: string;
  last_updated: string;
};

// ── Upsert ───────────────────────────────────────────────────────────────────

/** Persist a continent intel report to Supabase */
export async function upsertContinentActivity(
  report: ContinentIntelReport,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const db = getDb({ admin: true });

  const topIndustries = Object.entries(report.signalsByIndustry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const topCountries = Object.entries(report.signalsByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  const topCompanies = report.topCompanies
    .slice(0, 10)
    .map(name => ({ name, count: 1 }));

  const velocity = Math.round((report.signalsTotal / 30) * 100) / 100;

  const { error } = await db
    .from('continent_activity')
    .upsert(
      {
        continent_id: report.continentId,
        label: report.label,
        color: report.color,
        signal_count_30d: report.signalsTotal,
        signal_velocity: velocity,
        top_industries: topIndustries,
        top_countries: topCountries,
        top_companies: topCompanies,
        heat_score: report.heatScore,
        trend_direction: report.trendDirection,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'continent_id' },
    );

  if (error) {
    console.error('[continent-activity] Upsert failed:', error.message);
    return false;
  }
  return true;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Get all continent activity rows ordered by heat score */
export async function getContinentActivity(): Promise<ContinentActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data, error } = await db
    .from('continent_activity')
    .select('*')
    .order('heat_score', { ascending: false });
  if (error || !data) return [];
  return data as ContinentActivityRow[];
}

/** Get a single continent's activity */
export async function getContinentActivityById(
  id: ContinentId,
): Promise<ContinentActivityRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getDb();
  const { data, error } = await db
    .from('continent_activity')
    .select('*')
    .eq('continent_id', id)
    .single();
  if (error || !data) return null;
  return data as ContinentActivityRow;
}

/** Get heat scores as a simple { continentId: heatScore } map */
export async function getContinentHeatScores(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  const db = getDb();
  const { data, error } = await db
    .from('continent_activity')
    .select('continent_id, heat_score');
  if (error || !data) return {};
  const scores: Record<string, number> = {};
  for (const row of data as Array<{ continent_id: string; heat_score: number }>) {
    scores[row.continent_id] = row.heat_score;
  }
  return scores;
}