import { BaseAgent, type AgentRunResult } from './base';
import { isSupabaseConfigured } from '@/lib/supabase/client';

type AlertSignal = {
  id: string;
  title?: string | null;
  vendor_name?: string | null;
  vendor?: string | null;
  category?: string | null;
  iker_score?: number | null;
};

type AlertRule = {
  id: string;
  keyword?: string | null;
  is_active?: boolean | null;
};

export class AlertAgent extends BaseAgent {
  name = 'AlertAgent';
  description = 'Checks incoming signals against alert rules and stores notifications.';

  async execute(): Promise<AgentRunResult> {
    if (!isSupabaseConfigured()) {
      return { itemsIn: 0, itemsOut: 0, metadata: { skipped: 'supabase not configured' } };
    }
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let signals = [] as AlertSignal[];

    const signalRes = await this.supabase
      .from('signals')
      .select('id,title,vendor_name,category,iker_score')
      .gte('created_at', since);

    if (!signalRes.error) {
      signals = (signalRes.data ?? []) as AlertSignal[];
    } else {
      const feedRes = await this.supabase
        .from('feed_signals')
        .select('id,title,vendor,category,iker_score')
        .gte('created_at', since);
      signals = (feedRes.data ?? []) as AlertSignal[];
    }

    const { data: rulesData } = await this.supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true);

    const rules = (rulesData ?? []) as AlertRule[];

    let fired = 0;

    for (const rule of rules) {
      const keyword = (rule.keyword ?? '').trim().toLowerCase();
      if (!keyword) continue;

      for (const signal of signals) {
        const title = (signal.title ?? '').toLowerCase();
        if (!title.includes(keyword)) continue;

        await this.supabase.from('notifications').insert({
          type: 'alert_match',
          title: `Alert: ${(signal.title ?? 'Signal').slice(0, 80)}`,
          payload: { signal, rule },
          read: false,
        });

        fired += 1;
      }
    }

    return {
      itemsIn: signals.length,
      itemsOut: fired,
      metadata: { fired, rules: rules.length },
    };
  }
}
