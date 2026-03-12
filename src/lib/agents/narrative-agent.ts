import { BaseAgent, type AgentRunResult } from './base';
import { isSupabaseConfigured } from '@/lib/supabase/client';

type NarrativeSignal = {
  title?: string | null;
  category?: string | null;
  vendor_name?: string | null;
  vendor?: string | null;
  sentiment?: string | number | null;
  iker_score?: number | null;
};

function sentimentToNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value === 'positive') return 1;
  if (value === 'negative') return -1;
  return 0;
}

export class NarrativeAgent extends BaseAgent {
  name = 'NarrativeAgent';
  description = 'Builds briefing-ready narrative payloads from recent signals.';

  async execute(): Promise<AgentRunResult> {
    if (!isSupabaseConfigured()) {
      return { itemsIn: 0, itemsOut: 0, metadata: { skipped: 'supabase not configured' } };
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let signals = [] as NarrativeSignal[];

    const signalRes = await this.supabase
      .from('signals')
      .select('title,category,vendor_name,sentiment,iker_score')
      .gte('published_at', since)
      .order('iker_score', { ascending: false })
      .limit(20);

    if (!signalRes.error) {
      signals = (signalRes.data ?? []) as NarrativeSignal[];
    } else {
      const feedRes = await this.supabase
        .from('feed_signals')
        .select('title,category,vendor,sentiment,iker_score')
        .gte('created_at', since)
        .order('iker_score', { ascending: false })
        .limit(20);
      signals = (feedRes.data ?? []) as NarrativeSignal[];
    }

    if (!signals.length) {
      return { itemsIn: 0, itemsOut: 0, metadata: { skipped: true } };
    }

    const byCategory: Record<string, NarrativeSignal[]> = {};
    for (const signal of signals) {
      const category = signal.category || 'General';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(signal);
    }

    const avgIKER = signals.reduce((sum, item) => sum + (item.iker_score ?? 0), 0) / signals.length;
    const avgSentiment = signals.reduce((sum, item) => sum + sentimentToNumber(item.sentiment), 0) / signals.length;

    await this.supabase.from('agent_events').insert({
      event_type: 'narrative_ready',
      source_agent: this.name,
      payload: {
        categories: Object.keys(byCategory),
        topVendors: signals
          .map((signal) => signal.vendor_name ?? signal.vendor ?? null)
          .filter((name): name is string => Boolean(name))
          .slice(0, 5),
        avgIKER,
        avgSentiment,
      },
      processed: false,
    });

    return {
      itemsIn: signals.length,
      itemsOut: 1,
      metadata: { categories: Object.keys(byCategory).length },
    };
  }
}
