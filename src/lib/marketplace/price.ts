// Price-string parsing helpers for marketplace facets.

/** Parse a free-text price string, preferring an explicit `$` prefix.
 *
 * Examples:
 *   "$45,000"        → 45000
 *   "$45k"           → 45000
 *   "$ 45 000"       → 45000
 *   "Sold in lots of 24, $45,000/lot" → 45000 (dollar sign wins over bare 24)
 *   "24 units"       → 24 (bare number fallback when no $ present)
 *   "Call for quote" → null
 */
export function parsePriceUSD(raw: string): number | null {
  // Strip commas, then collapse whitespace between digits so "$ 45 000" and
  // "45 000" both parse as 45000.
  const clean = raw.replace(/,/g, '').replace(/(\d)\s+(?=\d)/g, '$1');

  // Prefer an explicit $-prefixed number so phrases like "cases of 24" don't
  // steal the bucket from "$45,000".
  const dollarMatch = clean.match(/\$\s*(\d+(?:\.\d+)?)\s*(k|m)?/i);
  if (dollarMatch) return applyMultiplier(dollarMatch[1], dollarMatch[2]);

  // No dollar sign anywhere — fall back to the first bare number.
  const bareMatch = clean.match(/(\d+(?:\.\d+)?)\s*(k|m)?/i);
  if (bareMatch) return applyMultiplier(bareMatch[1], bareMatch[2]);

  return null;
}

function applyMultiplier(num: string, suffix: string | undefined): number | null {
  let n = parseFloat(num);
  if (!Number.isFinite(n)) return null;
  const s = (suffix || '').toLowerCase();
  if (s === 'k') n *= 1_000;
  if (s === 'm') n *= 1_000_000;
  return n;
}
