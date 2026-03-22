// ─── NXT LINK Design Tokens v2 ──────────────────────────────────────────────
// Design spec: 3 moods — calm intelligence, living world, premium catalog
// Dark gray (not true black), single electric accent, generous spacing

export const COLORS = {
  // Surfaces — dark gray, not true black
  bg:      '#0d0f12',
  surface: '#131519',
  card:    '#181b20',
  border:  '#232730',
  text:    '#f0f0f0',
  muted:   '#6b7280',
  dim:     '#3a3f4b',

  // Primary accent — electric cyan
  accent:  '#00d4ff',
  cyan:    '#00d4ff',

  // Secondary accents (use sparingly)
  orange:  '#ff6600',  // brand / CTAs
  gold:    '#ffd700',  // scores / premium
  green:   '#00ff88',  // positive / live
  red:     '#ff3b30',  // risk / urgent
  amber:   '#ffb800',  // warning
  emerald: '#10b981',  // online / active
} as const;

export const FONT = "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace";

export const RADIUS = {
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  full: '9999px',
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const Z = {
  nav:     100,
  header:  90,
  overlay: 80,
  modal:   200,
  toast:   300,
} as const;

export const SPACE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;
