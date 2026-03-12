import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type BriefingSection = {
  title: string;
  body: string;
  signal_count: number;
  key_signals: Array<{ title: string; type: string; company?: string }>;
};

export type BriefingHighlight = {
  title: string;
  type: string;
  industry: string;
  importance: number;
  company?: string;
  amount_usd?: number;
};

export type DailyBriefingRow = {
  id: string;
  briefing_date: string;
  title: string;
  summary: string;
  sections: BriefingSection[];
  signal_count: number;
  top_industries: string[];
  top_signal_types: string[];
  highlights: BriefingHighlight[];
  generated_at: string;
  created_at: string;
};

export type DailyBriefingInsert = {
  briefing_date: string;
  title: string;
  summary: string;
  sections: BriefingSection[];
  signal_count: number;
  top_industries: string[];
  top_signal_types: string[];
  highlights: BriefingHighlight[];
};

// ─── Persistence ────────────────────────────────────────────────────────────────

/** Upsert a daily briefing (one per date) */
export async function saveDailyBriefing(
  briefing: DailyBriefingInsert,
): Promise<DailyBriefingRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('daily_briefings')
    .upsert(briefing, { onConflict: 'briefing_date' })
    .select()
    .maybeSingle();

  if (error) {
    console.warn('[daily-briefings] upsert error:', error.message);
    return null;
  }

  return data as DailyBriefingRow | null;
}

// ─── Queries ────────────────────────────────────────────────────────────────────

/** Get the most recent briefings */
export async function getRecentBriefings(
  limit = 7,
): Promise<DailyBriefingRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('daily_briefings')
    .select('*')
    .order('briefing_date', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as DailyBriefingRow[];
}

/** Get briefing for a specific date */
export async function getBriefingByDate(
  date: string,
): Promise<DailyBriefingRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const { data, error } = await db
    .from('daily_briefings')
    .select('*')
    .eq('briefing_date', date)
    .maybeSingle();

  if (error) return null;
  return data as DailyBriefingRow | null;
}
