import { BaseAgent, type AgentRunResult } from './base';
import { scoreIKER } from './feed-agent';
import { isSupabaseConfigured } from '@/lib/supabase/client';

type SignalRow = {
  id: string;
  title?: string | null;
  source?: string | null;
  category?: string | null;
  vendor_name?: string | null;
  vendor?: string | null;
  sentiment?: string | number | null;
};

function normalizeSentiment(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value === 'positive') return 0.6;
  if (value === 'negative') return -0.6;
  return 0;
}

export class IKERAgent extends BaseAgent {
  name = 'IKERAgent';
  description = 'Scores legitimacy and signal quality for vendors.';

  async execute(): Promise<AgentRunResult> {
    if (!isSupabaseConfigured()) {
      return { itemsIn: 0, itemsOut: 0, metadata: { skipped: 'supabase not configured' } };
    }
    const { data: signalsData, error: signalsError } = await this.supabase
      .from('signals')
      .select('id,title,source,category,vendor_name,sentiment')
      .is('iker_score', null)
      .limit(200);

    let table: 'signals' | 'feed_signals' = 'signals';
    let rows = (signalsData ?? []) as SignalRow[];

    if (signalsError) {
      table = 'feed_signals';
      const { data: feedData } = await this.supabase
        .from('feed_signals')
        .select('id,title,source,category,vendor,sentiment')
        .is('iker_score', null)
        .limit(200);
      rows = (feedData ?? []) as SignalRow[];
    }

    let scored = 0;

    for (const signal of rows) {
      const score = scoreIKER({
        vendorName: signal.vendor_name ?? signal.vendor ?? '',
        sentiment: normalizeSentiment(signal.sentiment),
        source: signal.source ?? '',
        sourceReliability: 0.85,
        category: signal.category ?? 'General',
        title: signal.title ?? '',
      });

      await this.supabase
        .from(table)
        .update({ iker_score: score })
        .eq('id', signal.id);

      scored += 1;
    }

    return {
      itemsIn: rows.length,
      itemsOut: scored,
      metadata: { table, scored },
    };
  }
}
