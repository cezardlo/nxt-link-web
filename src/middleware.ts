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

  // Server-side auth gate: signed-in-only pages redirect to /login when no
  // Supabase session cookie is present. (APIs enforce ownership themselves;
  // this stops logged-out access to private surfaces at the edge.)
  //
  // '/marketplace' locks the whole browse surface behind sign-in (owner
  // decision, 2026-07-23): the exact path plus every subpath — the browse
  // grid (/marketplace), listing detail (/marketplace/[kind]/[id]), and vendor
  // storefronts (/marketplace/vendor/[id]). The public homepage, /intake, and
  // all signup lanes are NOT under /marketplace, so they stay open; the
  // matching read APIs enforce the same wall server-side (a cookie here is
  // only a cheap edge pre-check, not the real auth). '/api/marketplace/*' is
  // NOT caught by this page gate — those paths start with '/api/', so the
  // startsWith('/marketplace/') test never matches them.
  const AUTH_PAGES = ['/buyer', '/account', '/admin', '/marketplace', '/vendor/leads', '/vendor/listings', '/vendor/portal', '/vendor/start', '/vendor/quotes'];
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const hasSession = req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
    if (!hasSession) {
      const login = new URL('/login', req.url);
      // Preserve the FULL original destination (path + query, e.g.
      // /marketplace?q=forklift&department=warehouse_tech) so sign-in returns
      // the visitor exactly where they were headed. The /login page and
      // /auth/callback both run this back through safeRelativePath before using
      // it, so a query string here is safe.
      login.searchParams.set('next', pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
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

  // Authenticated API responses must NEVER be stored by a shared cache (CDN/proxy):
  // the edge cache key is URL-only and ignores the auth cookie, so a cached private
  // response could be handed to a different (or unauthenticated) user. This is
  // explicit, override-proof defense-in-depth on top of removing the blanket public
  // /api cache header (security review 2026-07-22). Public marketplace/* GETs are
  // deliberately excluded so they may still be cached later if wanted.
  if (/^\/api\/(auth|vendor|vendors|buyer|projects|apply|admin)(\/|$)/.test(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store');
  }

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
