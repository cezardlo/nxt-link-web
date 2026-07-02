// Server-only admin access helpers. Replaces the old hardcoded
// PRIVATE_ACCESS_CODE pattern: the access code now lives in the
// ADMIN_ACCESS_CODE env var and is NEVER shipped to the browser.
//
// Admin access is granted by any of:
//   1) a signed-in Supabase user whose platform_users.role is admin/super_admin
//      (see src/lib/assistant/auth.ts), or
//   2) a valid httpOnly `nxt_admin_session` cookie minted by
//      POST /api/auth/access-code after a server-side code check, or
//   3) (transitional, for scripts/tooling) an x-access-code header matching
//      ADMIN_ACCESS_CODE — compared server-side, in constant time.
//
// This module must only be imported from server code (API routes, server
// components). It reads process.env and node:crypto.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'nxt_admin_session';
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** The env-managed access code, or null when code-based access is disabled. */
export function getAdminAccessCode(): string | null {
  const value = process.env.ADMIN_ACCESS_CODE?.trim();
  return value ? value : null;
}

function getSessionSecret(): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  // Single-var setups stay working: derive the signing secret from the code.
  const code = getAdminAccessCode();
  return code ? `nxt-derived:${code}` : null;
}

/** Constant-time string comparison (hash both sides so length never leaks). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Mint a signed admin session token: `v1.<expiryEpochMs>.<hmacHex>`. */
export function createAdminSessionToken(now: number = Date.now()): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const payload = `v1.${now + ADMIN_SESSION_TTL_MS}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/** Verify a token minted by createAdminSessionToken (signature + expiry). */
export function verifyAdminSessionToken(
  token: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!token) return false;
  const secret = getSessionSecret();
  if (!secret) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('hex');
  return safeEqual(parts[2], expected);
}

function readCookieValue(headers: Headers, name: string): string | null {
  const header = headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/** True when the request carries a valid admin session cookie. */
export function adminCookieOk(headers: Headers): boolean {
  return verifyAdminSessionToken(readCookieValue(headers, ADMIN_SESSION_COOKIE));
}

/** True when the x-access-code header matches the env-managed code. */
export function accessCodeHeaderOk(headers: Headers): boolean {
  const code = getAdminAccessCode();
  const header = headers.get('x-access-code');
  return Boolean(code && header && safeEqual(header, code));
}
