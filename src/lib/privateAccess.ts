// Client-safe helpers for the private sections (/markets, /intel, /admin, /crm).
//
// SECURITY MODEL: the access code itself is NEVER shipped to the browser.
// It lives in the ADMIN_ACCESS_CODE env var and is verified server-side by
// POST /api/auth/access-code, which sets an httpOnly signed session cookie
// that server routes check (see src/lib/server/admin-session.ts).
// localStorage only stores a non-secret UI flag so gates know not to
// re-prompt — it grants nothing by itself.

export const PRIVATE_ACCESS_STORAGE_KEY = 'nxt-link-private-access';
export const PRIVATE_PATHS = ['/markets', '/intel', '/admin', '/crm'];

const GRANTED_FLAG = 'granted';

export function isPrivatePath(path: string): boolean {
  return PRIVATE_PATHS.some((privatePath) => path === privatePath || path.startsWith(`${privatePath}/`));
}

/** UI-only hint that the user already unlocked this browser. Enforcement is server-side. */
export function hasPrivateAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PRIVATE_ACCESS_STORAGE_KEY) === GRANTED_FLAG;
}

export function grantPrivateAccess() {
  window.localStorage.setItem(PRIVATE_ACCESS_STORAGE_KEY, GRANTED_FLAG);
}

export function clearPrivateAccess() {
  window.localStorage.removeItem(PRIVATE_ACCESS_STORAGE_KEY);
}

/**
 * Verify a typed code server-side. On success the server sets the httpOnly
 * admin session cookie (which authenticates subsequent API calls) and we
 * remember a UI flag so gates stop prompting.
 */
export async function requestPrivateAccess(code: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/auth/access-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (res.ok && data.ok) {
      grantPrivateAccess();
      return { ok: true };
    }
    return { ok: false, message: data.message || 'Wrong code. Try again.' };
  } catch {
    return { ok: false, message: 'Could not verify the code. Check your connection and try again.' };
  }
}
