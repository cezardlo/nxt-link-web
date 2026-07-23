// Server-side admin allowlist (ADMIN_EMAILS).
//
// A second, data-free path to the 'admin' role, consulted wherever role is
// derived (src/app/auth/callback/route.ts and src/app/api/auth/me/route.ts).
// It lets the owner's account be granted operator access by adding one Vercel
// env var — no DB write, instantly reversible by removing the var — alongside
// the existing platform_users.role row mechanism.
//
// SECURITY CONTRACT:
//  - Read from process.env on the SERVER only. Never accept the email→admin
//    decision from anything the client sends; the caller passes the trusted,
//    session-verified email (from supabase auth.getUser()).
//  - Empty / unset ADMIN_EMAILS = nobody is an admin by allowlist (fail-closed).
//  - Comma-separated, case-insensitive, whitespace-trimmed.
//  - This does NOT bypass the ADMIN_ACCESS_CODE AccessGate on /admin/* — that
//    stays as a second layer. Being on the allowlist only decides role routing.

/** Parse the raw ADMIN_EMAILS env value into a normalized (lowercased,
 *  trimmed, de-blanked) list. Pure — takes the raw string so it is testable
 *  without touching process.env. */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True only when `email` is present AND appears in the ADMIN_EMAILS list.
 *  Case-insensitive. Empty/unset list ⇒ always false (fail-closed). Pure —
 *  the caller supplies the raw env value so this is unit-testable. */
export function isAdminEmail(
  email: string | null | undefined,
  raw: string | null | undefined,
): boolean {
  if (!email) return false;
  const list = parseAdminEmails(raw);
  if (!list.length) return false;
  return list.includes(email.trim().toLowerCase());
}
