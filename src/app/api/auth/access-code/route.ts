// POST /api/auth/access-code  { code } -> verifies against ADMIN_ACCESS_CODE
// (env, server-side, constant-time) and sets a signed httpOnly session cookie.
// GET -> { active } so client gates can restore state without knowing the code.
// DELETE -> clears the session cookie.
//
// Rate limited per client so the code cannot be brute-forced.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/http/rate-limit';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  adminCookieOk,
  createAdminSessionToken,
  getAdminAccessCode,
  safeEqual,
} from '@/lib/server/admin-session';

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const client = forwarded ? forwarded.split(',')[0].trim() : '';
  return `access-code:${client || 'local'}`;
}

export async function POST(req: Request) {
  const limit = checkRateLimit({ key: clientKey(req), maxRequests: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many attempts. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  let code = '';
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === 'string' ? body.code.trim() : '';
  } catch {
    // missing/invalid JSON falls through to the empty-code rejection below
  }

  const expected = getAdminAccessCode();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: 'Access-code sign-in is not configured on this deployment.' },
      { status: 501 },
    );
  }
  if (!code || !safeEqual(code, expected)) {
    return NextResponse.json({ ok: false, message: 'Wrong code.' }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, message: 'Access-code sign-in is not configured on this deployment.' },
      { status: 501 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  });
  return res;
}

export async function GET(req: Request) {
  return NextResponse.json({ active: adminCookieOk(req.headers) });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
