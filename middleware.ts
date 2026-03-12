import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get('x-request-id') || crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: {
      headers,
    },
  });

  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  // Only run middleware on API routes — page routes are static and must be
  // served directly from Vercel's CDN without middleware interference.
  // The previous catch-all matcher caused Vercel to route static pages
  // through serverless functions, returning 404 for /map, /vendors, etc.
  matcher: ['/api/:path*'],
};
