/* ── Design tokens — single source of truth for all color maps ────────────── */

/** Feed / article category → hex color (used in FeedBar, FeedsSection, RightPanel) */
export const FEED_CATEGORY_COLORS: Record<string, string> = {
  'AI/ML':         '#00d4ff',
  'Cybersecurity': '#ff3b30',
  'Defense':       '#ff8c00',
  'Enterprise':    '#00ff88',
  'Supply Chain':  '#ffb800',
  'Energy':        '#ffd700',
  'Finance':       '#00d4ff',
  'Crime':         '#f97316',
  'General':       '#6b7280',
};

/** Conference category → RGB tuple (deck.gl ScatterplotLayer) */
export const CONFERENCE_CATEGORY_COLORS: Record<string, [number, number, number]> = {
  Defense:        [255, 100, 0],
  Cybersecurity:  [168, 85, 247],
  Manufacturing:  [0, 212, 255],
  Logistics:      [255, 184, 0],
  Robotics:       [0, 255, 136],
  'AI/ML':        [96, 165, 250],
  Energy:         [255, 215, 0],
  'Border/Gov':   [249, 115, 22],
  Construction:   [217, 119, 6],
  Healthcare:     [6, 182, 212],
  Workforce:      [139, 92, 246],
};

/** Conference category → hex string (JSX badges, tooltips) */
export const CONFERENCE_CATEGORY_HEX: Record<string, string> = {
  Defense:        '#ff6400',
  Cybersecurity:  '#00d4ff',
  Manufacturing:  '#ffb800',
  Logistics:      '#00d4ff',
  Robotics:       '#00ff88',
  'AI/ML':        '#00d4ff',
  Energy:         '#ffd700',
  'Border/Gov':   '#f97316',
  Construction:   '#ffb800',
  Healthcare:     '#00d4ff',
  Workforce:      '#ffb800',
};

/** Signal type → hex color (SignalsFeed) */
export const SIGNAL_TYPE_COLORS: Record<string, string> = {
  patent_filing:  '#ffb800',
  funding:        '#ffb800',
  contract_award: '#00ff88',
  partnership:    '#00d4ff',
  expansion:      '#00d4ff',
  risk:           '#ff3b30',
};

/** Flight category → hex color */
export const FLIGHT_CATEGORY_COLORS: Record<string, string> = {
  VIP:        '#ff0080',
  MILITARY:   '#ff6400',
  CARGO:      '#7878a0',
  COMMERCIAL: '#ffb800',
  PRIVATE:    '#50506e',
};

/** Contract type → hex color */
export const CONTRACT_TYPE_COLORS: Record<string, string> = {
  award:        '#00ff88',
  solicitation: '#00d4ff',
  grant:        '#ffb800',
};

/** Contract source → hex color */
export const CONTRACT_SOURCE_COLORS: Record<string, string> = {
  sam:          '#00d4ff',
  usaspending:  '#00ff88',
  sbir:         '#ffb800',
};

/** Opportunity source → hex color */
export const OPPORTUNITY_SOURCE_COLORS: Record<string, string> = {
  sam:             '#00d4ff',
  usaspending:     '#00ff88',
  sbir:            '#ffb800',
  nsf:             '#00d4ff',
  uspto:           '#ff8c00',
  bts:             '#00d4ff',
  ercot:           '#ff3b30',
  grants:          '#00ff88',
  opencorporates:  '#ffb800',
};

/** Sentiment → hex color */
export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#00ff88',
  negative: '#ff3b30',
  neutral:  'rgba(255,255,255,0.15)',
};

/** Grade letter → hex color */
export const GRADE_COLORS: Record<string, string> = {
  A: '#00ff88',
  B: '#00d4ff',
  C: '#ffb800',
  D: '#f97316',
  F: '#ff3b30',
};

/** Unified score thresholds */
export const SCORE_THRESHOLDS = {
  excellent: 75,
  good: 50,
  fair: 30,
} as const;
