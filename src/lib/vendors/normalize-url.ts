// Stable URL normalisation used by dedup and any future "is this URL the
// same as that one" checks. Strips protocol, www, query string, and trailing
// slash; lowercases. Returns empty string for inputs we can't make sense of.

export function normalizeVendorUrl(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProtocol);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return trimmed
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\?.*$/, '')
      .replace(/\/+$/, '');
  }
}
