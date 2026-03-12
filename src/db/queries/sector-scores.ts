import { getDb, isSupabaseConfigured } from '../client';

// Sector scores stored in `trends` table (matches full-schema.sql).
// Composite PK: (category, window_days).

export type SectorScoreRow = {
  category: string;
  window_days: number;
  signal_count: number;
  score: number | null;
  computed_at: string;
};

export type SectorScoreInsert = {
  category: string;
  window_days: number;
  signal_count: number;
  score?: number | null;
  computed_at?: string;
};

export async function insertSectorScore(input: SectorScoreInsert): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const db = getDb({ admin: true });
  const row = {
    category: input.category,
    window_days: input.window_days,
    signal_count: input.signal_count,
    score: input.score ?? null,
    computed_at: input.computed_at ?? new Date().toISOString(),
  };

  const { error } = await db
    .from('trends')
    .upsert(row, { onConflict: 'category,window_days' });

  if (error) {
    console.warn('[sector-scores] upsert warning:', error.message);
  }
}

export async function getLatestScores(windowDays = 30): Promise<SectorScoreRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('trends')
    .select('*')
    .eq('window_days', windowDays)
    .order('signal_count', { ascending: false });

  if (error || !data) return [];

  return data as SectorScoreRow[];
}
