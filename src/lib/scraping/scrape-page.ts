// src/lib/scraping/scrape-page.ts
// Scrapes a single page — static fetch first, Playwright fallback for dynamic content.

export type ScrapeResult = {
  url: string;
  html: string;
  method: 'static' | 'playwright';
  byteLength: number;
  durationMs: number;
  error?: string;
};

const MIN_CONTENT_THRESHOLD = 500; // If static HTML is under this, try Playwright
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Static fetch — fast, no JS rendering.
 */
async function fetchStatic(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Playwright dynamic scrape — handles SPAs, lazy loading, infinite scroll.
 * Blocks images/fonts/media for speed.
 */
async function fetchDynamic(url: string): Promise<string> {
  // Dynamic import to avoid bundling Playwright in client
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Block heavy resources for speed
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Scroll to trigger lazy loading
    await autoScroll(page);

    // Wait a moment for any final content to load
    await page.waitForTimeout(1000);

    const html = await page.content();
    await context.close();
    return html;
  } finally {
    await browser.close();
  }
}

/**
 * Auto-scrolls the page to trigger lazy-loaded content.
 */
async function autoScroll(page: import('playwright').Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const maxScrolls = 15;
      let scrollCount = 0;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo(0, 0);
          resolve();
        }
      }, 200);
    });
  });
}

/**
 * Scrapes a page: tries static first, falls back to Playwright if content is thin.
 */
export async function scrapePage(url: string): Promise<ScrapeResult> {
  const start = Date.now();

  // Try static first
  try {
    const html = await fetchStatic(url);
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (textContent.length >= MIN_CONTENT_THRESHOLD) {
      return {
        url,
        html,
        method: 'static',
        byteLength: html.length,
        durationMs: Date.now() - start,
      };
    }

    console.log(`[scrape] Static content too thin (${textContent.length} chars) for ${url}, trying Playwright`);
  } catch (err) {
    console.warn(`[scrape] Static fetch failed for ${url}:`, err);
  }

  // Fall back to Playwright
  try {
    const html = await fetchDynamic(url);
    return {
      url,
      html,
      method: 'playwright',
      byteLength: html.length,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      url,
      html: '',
      method: 'playwright',
      byteLength: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Playwright scrape failed',
    };
  }
}

/**
 * Scrapes multiple pages with concurrency control.
 */
export async function scrapePages(
  urls: string[],
  maxConcurrency = 3,
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  const queue = [...urls];

  const workers = Array.from({ length: Math.min(maxConcurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) return;
      const result = await scrapePage(url);
      results.push(result);
    }
  });

  await Promise.all(workers);
  return results;
}
