import { BaseAgent, type AgentRunResult } from './base';
import { isSupabaseConfigured } from '@/lib/supabase/client';

type SignalRow = {
  id: string;
  title?: string | null;
  vendor_name?: string | null;
  vendor?: string | null;
  vendor_id?: string | null;
};

export class EntityAgent extends BaseAgent {
  name = 'EntityAgent';
  description = 'Extracts vendor names from signals and resolves vendor IDs.';

  async execute(): Promise<AgentRunResult> {
    if (!isSupabaseConfigured()) {
      return { itemsIn: 0, itemsOut: 0, metadata: { skipped: 'supabase not configured' } };
    }
    const { data: signalsData, error: signalsError } = await this.supabase
      .from('signals')
      .select('id,title,vendor_name,vendor_id')
      .is('vendor_id', null)
      .limit(100);

    let table: 'signals' | 'feed_signals' = 'signals';
    let rows = (signalsData ?? []) as SignalRow[];

    if (signalsError) {
      table = 'feed_signals';
      const { data: feedData } = await this.supabase
        .from('feed_signals')
        .select('id,title,vendor')
        .limit(100);
      rows = (feedData ?? []) as SignalRow[];
    }

    let resolved = 0;

    for (const signal of rows) {
      const vendorName = signal.vendor_name ?? signal.vendor ?? null;
      if (!vendorName) continue;

      const { data: vendor } = await this.supabase
        .from('vendors')
        .select('id,name')
        .ilike('name', `%${vendorName}%`)
        .limit(1)
        .maybeSingle();

      if (!vendor?.id) continue;

      if (table === 'signals') {
        await this.supabase
          .from('signals')
          .update({ vendor_id: vendor.id })
          .eq('id', signal.id);
      }

      resolved += 1;
    }

    return {
      itemsIn: rows.length,
      itemsOut: resolved,
      metadata: { table, resolved },
    };
  }
}
