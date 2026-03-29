// ─── NXT LINK Design Tokens v3 ──────────────────────────────────────────────
// Clean modern SaaS aesthetic — inspired by Linear, Vercel, Raycast
// Dark theme with soft contrast, generous spacing, minimal decoration

export const COLORS = {
    // Surfaces — softer dark palette
    bg:      '#0a0a0f',
    surface: '#111118',
    card:    '#18181f',
    elevated:'#1e1e27',
    border:  '#27272f',
    borderSubtle: '#1f1f28',

    // Text hierarchy
    text:    '#ededef',
    secondary: '#a0a0ab',
    muted:   '#6b6b76',
    dim:     '#45454d',

    // Primary accent — soft blue
    accent:  '#6366f1',
    accentLight: '#818cf8',
    accentSubtle: 'rgba(99, 102, 241, 0.12)',

    // Semantic
    green:   '#22c55e',
    red:     '#ef4444',
    amber:   '#f59e0b',
    orange:  '#f97316',
    cyan:    '#06b6d4',
    emerald: '#10b981',
    gold:    '#eab308',
    purple:  '#a855f7',
} as const;

export const FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace";

export const RADIUS = {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
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

export const SPACE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const;
