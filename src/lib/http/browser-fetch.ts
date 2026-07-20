/**
 * Browser-based page fetching using Playwright.
 * Used as fallback when static HTML fetch misses JS-rendered content.
 *
 * Supports 3 modes (auto-detected):
 *   1. Remote browser via CDP  — set BROWSER_CDP_URL env var (works on Vercel)
 *      e.g. "wss://chrome.browserless.io?token=YOUR_KEY"
 *      or   "wss://connect.browserbase.com?apiKey=YOUR_KEY"
 *   2. Local Playwright binary — works in local dev automatically
 *   3. Disabled               — returns null, callers fall back to static fetch
 */

type BrowserMode = 'remote' | 'local' | 'unavailable';
let browserMode: BrowserMode | null = null;

async function connectBrowser() {
  const cdpUrl = process.env.BROWSER_CDP_URL;

  // Mode 1: Remote browser (Browserless, Browserbase, etc.)
  if (cdpUrl) {
    const pw = await import('playwright-core');
    const browser = await pw.chromium.connectOverCDP(cdpUrl);
    if (browserMode === null) {
      browserMode = 'remote';
      console.log('[browser-fetch] Connected to remote browser via CDP');
    }
    return browser;
  }

  // Mode 2: Local Playwright binary
  const pw = await import('playwright');
  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  if (browserMode === null) {
    browserMode = 'local';
    console.log('[browser-fetch] Using local Playwright browser');
  }
  return browser;
}

/**
 * Render a page with a real Chromium browser and return the fully-rendered HTML.
 * Returns null if no browser is available.
 */
export async function fetchWithBrowser(
  url: string,
  options: {
    /** Max wait time in ms (default 15000) */
    timeout?: number;
    /** Wait for network to be idle before capturing (default true) */
    waitForNetworkIdle?: boolean;
    /** Optional actions to perform before capturing (scroll, click, etc.) */
    actions?: Array<
      | { type: 'scroll'; pixels?: number }
      | { type: 'click'; selector: string }
      | { type: 'wait'; ms: number }
    >;
  } = {},
): Promise<string | null> {
  const {
    timeout = 15_000,
    waitForNetworkIdle = true,
    actions = [],
  } = options;

  if (browserMode === 'unavailable') return null;

  try {
    const browser = await connectBrowser();

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      // Block heavy resources to speed up rendering
      await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webm}', (route) => route.abort());

      await page.goto(url, {
        waitUntil: waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
        timeout,
      });

      // Execute optional actions (scroll to load lazy content, click "show all", etc.)
      for (const action of actions) {
        try {
          if (action.type === 'scroll') {
            await page.evaluate((px) => window.scrollBy(0, px), action.pixels ?? 2000);
            await page.waitForTimeout(800);
          } else if (action.type === 'click') {
            await page.click(action.selector, { timeout: 3000 });
            await page.waitForTimeout(1000);
          } else if (action.type === 'wait') {
            await page.waitForTimeout(action.ms);
          }
        } catch {
          // Action failed — continue anyway
        }
      }

      const html = await page.content();
      await context.close();
      return html;
    } finally {
      await browser.close();
    }
  } catch (err) {
    if (browserMode === null) {
      browserMode = 'unavailable';
      console.log('[browser-fetch] No browser available — using static fetch only');
    } else {
      console.warn('[browser-fetch] Error rendering page:', (err as Error).message);
    }
    return null;
  }
}
