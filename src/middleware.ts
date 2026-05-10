import { NextRequest, NextResponse } from 'next/server';

// === BOT DETECTION MIDDLEWARE ===
// Cloudflare-style bot protection for NXT//LINK

// Known bad bot user agents
const BAD_BOTS = [
  'AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot', 'BLEXBot',
  'DataForSeoBot', 'serpstatbot', 'Bytespider', 'PetalBot',
  'MegaIndex', 'Sogou', 'YandexBot', 'Baiduspider',
  'CCBot', 'GPTBot', 'ChatGPT-User', 'Claude-Web', 'anthropic-ai',
  'cohere-ai', 'Amazonbot', 'PerplexityBot',
  'img2dataset', 'Scrapy', 'python-requests', 'Go-http-client',
  'Java/', 'libwww-perl', 'PHP/', 'Wget', 'curl/',
  'okhttp', 'httpclient', 'Apache-HttpClient',
];

// Paths that should never be hit by bots
const PROTECTED_PATHS = ['/api/', '/crm', '/admin'];

// Rate limiting store (in-memory, resets on cold start)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return true;
  }
  return false;
}

function isBadBot(ua: string): boolean {
  if (!ua) return true; // No user agent = suspicious
  const lower = ua.toLowerCase();
  return BAD_BOTS.some(bot => lower.includes(bot.toLowerCase()));
}

function isHeadlessBrowser(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') || '';
  // Headless Chrome / Puppeteer / Playwright signatures
  if (ua.includes('HeadlessChrome')) return true;
  if (ua.includes('PhantomJS')) return true;
  // Missing common headers that real browsers always send
  if (!req.headers.get('accept-language') && !ua.includes('bot')) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get('user-agent') || '';
  const ip = getClientIP(req);

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.woff2')
  ) {
    return NextResponse.next();
  }

  // Allow Vercel cron jobs
  if (req.headers.get('authorization')?.includes('Bearer') && pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Block bad bots
  if (isBadBot(ua)) {
    // Return 403 for API, 200 with empty page for crawlers (don't reveal protection)
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Serve a minimal page to bad crawlers
    return new NextResponse(
      '<html><head><title>NXT//LINK</title></head><body></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Block headless browsers on protected paths
  if (isHeadlessBrowser(req) && PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    return new NextResponse(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(ip)) {
      return new NextResponse(JSON.stringify({ error: 'Rate limited. Try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      });
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Clean up old rate limit entries periodically
  if (rateMap.size > 10000) {
    const now = Date.now();
    for (const [key, val] of rateMap) {
      if (now > val.resetAt) rateMap.delete(key);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
};
