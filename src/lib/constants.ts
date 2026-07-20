// ─── Shared Constants ────────────────────────────────────────────────────────
// Single source of truth for timing, thresholds, and other magic numbers

/** Standard client-side refresh intervals */
export const REFRESH_INTERVAL = {
  /** 5 minutes — signals, feeds, general data */
  SIGNALS: 5 * 60 * 1000,
  /** 15 minutes — briefings, heavy computations */
  BRIEFING: 15 * 60 * 1000,
  /** 30 seconds — real-time feeds (flights, border) */
  REALTIME: 30 * 1000,
} as const;

/** IKER score grade boundaries */
export const IKER_GRADES = {
  A: 80,
  B: 60,
  C: 40,
  D: 20,
} as const;

/** Signal priority levels, ordered by severity */
export const PRIORITY_LEVELS = ['critical', 'high', 'elevated', 'normal'] as const;

/** Map layer keys treated as "critical" (always-on by default) */
export const CRITICAL_MAP_LAYERS = ['flights', 'borderTrade', 'borderWait'] as const;
