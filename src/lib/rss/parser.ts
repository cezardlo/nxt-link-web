// src/lib/rss/parser.ts
// RSS 2.0 + Atom feed parser (no external deps)
// Reuses patterns from live-feeds.ts

export type ParsedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
};

// ─── HTML utils ───────────────────────────────────────────────────────────────

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseTag(block: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return decodeHtmlEntities(stripHtml(block.match(pattern)?.[1] ?? ''));
}

// ─── RSS 2.0 parser ───────────────────────────────────────────────────────────

function parseRssItems(xml: string, sourceName: string): ParsedItem[] {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
  return items
    .map((match) => {
      const block = match[1];
      const title = parseTag(block, 'title');
      const link = decodeHtmlEntities(
        (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim(),
      );
      const description =
        (parseTag(block, 'description') || parseTag(block, 'content:encoded')).slice(0, 220);
      const pubDate = parseTag(block, 'pubDate') || parseTag(block, 'dc:date');
      return { title, link, description, pubDate, source: sourceName };
    })
    .filter((item) => item.title.length > 4 && /^https?:\/\//i.test(item.link))
    .slice(0, 10);
}

// ─── Atom parser ──────────────────────────────────────────────────────────────

function parseAtomEntries(xml: string, sourceName: string): ParsedItem[] {
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi));
  return entries
    .map((match) => {
      const block = match[1];
      const title = parseTag(block, 'title');

      // Atom links use href attribute: <link href="..." />
      const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
      const link = hrefMatch ? decodeHtmlEntities(hrefMatch[1]) :
        decodeHtmlEntities((block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] ?? '').trim());

      const description =
        (parseTag(block, 'summary') || parseTag(block, 'content')).slice(0, 220);
      const pubDate = parseTag(block, 'updated') || parseTag(block, 'published');

      return { title, link, description, pubDate, source: sourceName };
    })
    .filter((item) => item.title.length > 4 && /^https?:\/\//i.test(item.link))
    .slice(0, 10);
}

// ─── Auto-detect and parse ────────────────────────────────────────────────────

function isAtomFeed(xml: string): boolean {
  return /<feed[^>]*xmlns[^>]*>/i.test(xml) || /<entry>/i.test(xml);
}

export function parseAnyFeed(xml: string, sourceName: string): ParsedItem[] {
  try {
    if (isAtomFeed(xml)) return parseAtomEntries(xml, sourceName);
    return parseRssItems(xml, sourceName);
  } catch {
    return [];
  }
}
