import { BaseAgent, type AgentRunResult } from './base';
import { runFeedAgent } from './feed-agent';

function toSentimentValue(sentiment: string): number {
  if (sentiment === 'positive') return 1;
  if (sentiment === 'negative') return -1;
  return 0;
}

export class FeedAgent extends BaseAgent {
  name = 'FeedAgent';
  description = 'Scrapes RSS sources and normalizes signal updates.';

  async execute(): Promise<AgentRunResult> {
    const store = await runFeedAgent();

    const fetched = store.sourceHealth.reduce((sum, src) => sum + src.itemCount, 0);
    const stored = store.items.length;

    const vendorCounts: Record<string, number> = {};
    let sentimentTotal = 0;

    for (const item of store.items) {
      if (item.vendor) {
        vendorCounts[item.vendor] = (vendorCounts[item.vendor] ?? 0) + 1;
      }
      sentimentTotal += toSentimentValue(item.sentiment);
    }

    const topVendors = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const categories = new Set(store.items.map((item) => item.category));

    return {
      itemsIn: fetched,
      itemsOut: stored,
      metadata: {
        dupes: Math.max(0, fetched - stored),
        topVendors,
        avgSentiment: stored > 0 ? sentimentTotal / stored : 0,
        clusters: categories.size,
        sourcesOk: store.sourceHealth.filter((src) => src.status === 'ok').length,
        enriched: store.enriched,
      },
    };
  }
}
