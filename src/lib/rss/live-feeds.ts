import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
};

type FeedSource = {
  id: string;
  name: string;
  url: string;
};

const FEED_SOURCES: FeedSource[] = [
  { id: 'reuters-world', name: 'Reuters World', url: 'https://feeds.reuters.com/Reuters/worldNews' },
  { id: 'bbc-world', name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'mit-ai', name: 'MIT AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2' },
  { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/' },
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseTag(block: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return decodeHtmlEntities(stripHtml(block.match(pattern)?.[1] || ''));
}

function parseRssItems(xml: string, sourceName: string): FeedItem[] {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
  return items
    .map((match) => {
      const block = match[1];
      const title = parseTag(block, 'title');
      const link = decodeHtmlEntities((block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim());
      const description = parseTag(block, 'description') || parseTag(block, 'content:encoded');
      const pubDate = parseTag(block, 'pubDate') || parseTag(block, 'dc:date');
      return {
        title,
        link,
        description: description.slice(0, 220),
        pubDate,
        source: sourceName,
      };
    })
    .filter((item) => item.title.length > 4 && /^https?:\/\//i.test(item.link))
    .slice(0, 10);
}

export async function fetchLiveRssFeeds() {
  const results = await Promise.all(
    FEED_SOURCES.map(async (source) => {
      try {
        const response = await fetchWithRetry(source.url, {
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
            'User-Agent': 'NXTLinkCommandMonitor/1.0',
          },
        }, {
          retries: 2,
          cacheKey: `rss:${source.id}`,
          cacheTtlMs: 120_000,
          staleIfErrorMs: 600_000,
          dedupeInFlight: true,
        });
        if (!response.ok) {
          return { id: source.id, name: source.name, items: [] as FeedItem[] };
        }
        const xml = await response.text();
        return { id: source.id, name: source.name, items: parseRssItems(xml, source.name) };
      } catch {
        return { id: source.id, name: source.name, items: [] as FeedItem[] };
      }
    }),
  );

  const all = results
    .flatMap((entry) => entry.items)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 40);

  return {
    as_of: new Date().toISOString(),
    channels: results,
    all,
  };
}
