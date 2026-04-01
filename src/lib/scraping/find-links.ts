// src/lib/scraping/find-links.ts
// Auto-discovers relevant pages from a conference website.

export type DiscoveredPage = {
  url: string;
  category: 'exhibitors' | 'sponsors' | 'attendees' | 'agenda' | 'homepage' | 'speakers' | 'about' | 'other';
  priority: number; // 1 = highest
};

const CATEGORY_PATTERNS: Array<{
  category: DiscoveredPage['category'];
  patterns: RegExp[];
  priority: number;
}> = [
  {
    category: 'exhibitors',
    patterns: [
      /exhibitor/i, /exhibit/i, /vendor/i, /company-list/i,
      /companies/i, /floor-plan/i, /expo/i, /marketplace/i,
    ],
    priority: 1,
  },
  {
    category: 'sponsors',
    patterns: [/sponsor/i, /partner/i, /supporter/i],
    priority: 2,
  },
  {
    category: 'attendees',
    patterns: [
      /attend/i, /who-comes/i, /audience/i, /visitor/i,
      /delegate/i, /participant/i, /registration/i,
    ],
    priority: 2,
  },
  {
    category: 'speakers',
    patterns: [/speaker/i, /presenter/i, /keynote/i, /panelist/i],
    priority: 3,
  },
  {
    category: 'agenda',
    patterns: [/agenda/i, /schedule/i, /program/i, /session/i, /track/i],
    priority: 3,
  },
  {
    category: 'about',
    patterns: [/about/i, /overview/i, /why-attend/i, /why-visit/i],
    priority: 4,
  },
];

function categorizeUrl(url: string): { category: DiscoveredPage['category']; priority: number } {
  const path = new URL(url).pathname.toLowerCase();
  for (const entry of CATEGORY_PATTERNS) {
    if (entry.patterns.some(p => p.test(path))) {
      return { category: entry.category, priority: entry.priority };
    }
  }
  return { category: 'other', priority: 10 };
}

/**
 * Extracts all internal links from page HTML and categorizes them.
 * Returns deduplicated, prioritized list of relevant conference pages.
 */
export function discoverLinks(html: string, baseUrl: string): DiscoveredPage[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const results: DiscoveredPage[] = [];

  // Extract all href values
  const hrefRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl);

      // Only follow same-domain links
      if (resolved.hostname !== base.hostname) continue;

      // Strip hash and trailing slash for dedup
      resolved.hash = '';
      const normalized = resolved.href.replace(/\/+$/, '');

      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const { category, priority } = categorizeUrl(normalized);
      if (category !== 'other') {
        results.push({ url: normalized, category, priority });
      }
    } catch {
      // Invalid URL — skip
    }
  }

  // Sort by priority (most important first), deduplicate by category keeping best
  results.sort((a, b) => a.priority - b.priority);

  // Keep at most 3 per category to avoid over-scraping
  const categoryCounts = new Map<string, number>();
  return results.filter(page => {
    const count = categoryCounts.get(page.category) ?? 0;
    if (count >= 3) return false;
    categoryCounts.set(page.category, count + 1);
    return true;
  });
}

/**
 * Discovers links from a conference URL by fetching the homepage first.
 * Always includes the homepage itself.
 */
export async function discoverConferencePages(conferenceUrl: string): Promise<DiscoveredPage[]> {
  const pages: DiscoveredPage[] = [
    { url: conferenceUrl, category: 'homepage', priority: 0 },
  ];

  try {
    const res = await fetch(conferenceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[find-links] HTTP ${res.status} for ${conferenceUrl}`);
      return pages;
    }

    const html = await res.text();
    const discovered = discoverLinks(html, conferenceUrl);
    pages.push(...discovered);
  } catch (err) {
    console.error('[find-links] Discovery failed:', err);
  }

  return pages;
}
