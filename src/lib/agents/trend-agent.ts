import { BaseAgent, type AgentRunResult } from './base';
import { isSupabaseConfigured } from '@/lib/supabase/client';

type CategoryRow = { category?: string | null };

export class TrendAgent extends BaseAgent {
  name = 'TrendAgent';
  description = 'Computes momentum by category for 30, 90, and 180 day windows.';

  async execute(): Promise<AgentRunResult> {
    if (!isSupabaseConfigured()) {
      return { itemsIn: 0, itemsOut: 0, metadata: { skipped: 'supabase not configured' } };
    }
    const windows = [30, 90, 180];
    let computed = 0;

    for (const days of windows) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let rows: CategoryRow[] = [];

      const signals = await this.supabase
        .from('signals')
        .select('category')
        .gte('published_at', since);

      if (!signals.error) {
        rows = (signals.data ?? []) as CategoryRow[];
      } else {
        const feedSignals = await this.supabase
          .from('feed_signals')
          .select('category')
          .gte('created_at', since);
        rows = (feedSignals.data ?? []) as CategoryRow[];
      }

      const counts: Record<string, number> = {};
      for (const row of rows) {
        const category = row.category || 'General';
        counts[category] = (counts[category] ?? 0) + 1;
      }

      for (const [category, count] of Object.entries(counts)) {
        await this.supabase.from('trends').upsert(
          {
            category,
            window_days: days,
            signal_count: count,
            computed_at: new Date().toISOString(),
          },
          { onConflict: 'category,window_days' },
        );
        computed += 1;
      }
    }

    return {
      itemsIn: 0,
      itemsOut: computed,
      metadata: { windows: windows.length, computed },
    };
  }
}
