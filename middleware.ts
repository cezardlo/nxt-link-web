import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require a valid Supabase session.
// Everything else (landing, industry pages, vendor pages, API routes, etc.) is public.
const PROTECTED_ROUTES = [
  '/map',
  '/solve',
  '/ops',
  '/command',
  '/simulate',
  '/signals',
  '/radar',
  '/innovation',
  '/universe',
];

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // Base response — always forward the request-id header.
  let response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  response.headers.set('x-request-id', requestId);

  // If Supabase is not configured (e.g. CI / local without env), skip auth checks.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  // Build a Supabase client that reads/writes cookies via the request/response
  // objects — this is the correct pattern for middleware (NOT next/headers cookies).
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write refreshed tokens back onto the request first …
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // … then rebuild the response so the browser receives them too.
        response = NextResponse.next({ request });
        response.headers.set('x-request-id', requestId);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() validates the JWT and silently refreshes the session when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Unauthenticated user hitting a protected route → send to /auth.
  if (
    !user &&
    PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting /auth → send to /map.
  if (user && pathname === '/auth') {
    const url = request.nextUrl.clone();
    url.pathname = '/map';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Explicit route list — never a catch-all.
  // A catch-all matcher forces Vercel to run every static page through a
  // serverless function, which breaks CDN delivery and returns 404 for pages
  // like /map, /vendors, etc.
  matcher: [
    '/api/:path*',
    '/map',
    '/solve',
    '/ops',
    '/command',
    '/simulate',
    '/signals',
    '/radar',
    '/innovation',
    '/universe',
    '/auth',
  ],
};
