import { NextResponse } from 'next/server';

import { getClientIp } from '@/lib/http/request-context';
import { checkRateLimit } from '@/lib/http/rate-limit';

const INTEL_API_URL = process.env.INTEL_API_URL ?? 'http://localhost:8100';

type RouteContext = { params: Promise<{ path: string[] }> };

function buildUpstreamUrl(pathParts: string[], search: string): string {
  const joined = pathParts.join('/');
  return `${INTEL_API_URL}/${joined}${search}`;
}

async function proxyRequest(request: Request, pathParts: string[]): Promise<NextResponse> {
  const clientIp = getClientIp(request.headers);

  const rateLimit = checkRateLimit({
    key: `intel-proxy:${clientIp}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { search } = new URL(request.url);
  const upstreamUrl = buildUpstreamUrl(pathParts, search);

  const isPost = request.method === 'POST';
  const upstreamInit: RequestInit = {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
    ...(isPost ? { body: await request.text() } : {}),
  };

  try {
    const upstream = await fetch(upstreamUrl, upstreamInit);
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { ok: false, offline: true, message: 'Intel backend is offline.' },
      { status: 503 },
    );
  }
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
