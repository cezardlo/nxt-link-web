/* ── Shared formatting utilities ──────────────────────────────────────────── */
/* Single source of truth — replaces 3 formatUsd / 3 timeAgo / 3 scoreColor  */

/**
 * Format a dollar amount into compact human-readable form.
 * $1.2B / $500M / $50K / $100 / "undisclosed"
 */
export function formatUsd(value: number | null | undefined): string {
  if (value == null) return 'undisclosed';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * Relative time label: "2m" / "3h" / "5d"
 */
export function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (isNaN(ms)) return '';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * Format timestamp as HH:MM:SS (24h).
 */
export function fmtTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts.slice(0, 8);
  }
}

/**
 * Format timestamp as MM-DD.
 */
export function fmtDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  } catch {
    return '--';
  }
}

/**
 * Map a 0-100 score to a design-system color.
 * ≥75 green, ≥50 cyan, ≥30 gold, <30 red.
 */
export function scoreColor(score: number): string {
  if (score >= 75) return '#00ff88';
  if (score >= 50) return '#00d4ff';
  if (score >= 30) return '#ffb800';
  return '#ff3b30';
}

/**
 * Map a 0-100 score to a letter grade + color.
 */
export function gradeFromScore(score: number): { grade: string; color: string } {
  if (score >= 80) return { grade: 'A', color: '#00ff88' };
  if (score >= 65) return { grade: 'B', color: '#00d4ff' };
  if (score >= 50) return { grade: 'C', color: '#ffb800' };
  if (score >= 35) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: '#ff3b30' };
}

/**
 * Compact number: 1.2M / 50K / 1,200.
 */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}
