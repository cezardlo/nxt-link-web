// Signal type → severity mapping from NXT LINK Architecture Research
// P0 = Critical (immediate action), P1 = High (24h), P2 = Medium (week), P3 = Low (info)

export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export const SIGNAL_SEVERITY: Record<string, Severity> = {
  // P0 — Critical
  acquisition: 'P0',
  bankruptcy: 'P0',
  data_breach: 'P0',
  ceo_departure: 'P0',
  regulatory_action: 'P0',

  // P1 — High
  funding: 'P1',
  major_funding: 'P1',
  major_partnership: 'P1',
  contract_award: 'P1',
  product_launch: 'P1',
  merger: 'P1',

  // P2 — Medium
  expansion: 'P2',
  company_expansion: 'P2',
  new_hire: 'P2',
  minor_funding: 'P2',
  market_shift: 'P2',
  partnership: 'P2',

  // P3 — Low
  press_mention: 'P3',
  event_participation: 'P3',
  conference: 'P3',
  award: 'P3',
  research_paper: 'P3',
  patent: 'P3',
  news: 'P3',
};

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; urgency: string }> = {
  P0: { label: 'CRITICAL', color: '#ff3b30', urgency: 'Immediate action required' },
  P1: { label: 'HIGH', color: '#ff6600', urgency: 'Review within 24 hours' },
  P2: { label: 'MEDIUM', color: '#ffd700', urgency: 'Review this week' },
  P3: { label: 'LOW', color: '#00d4ff', urgency: 'Informational' },
};

export function getSignalSeverity(signalType: string, importance?: number): Severity {
  const type = signalType.toLowerCase().replace(/\s+/g, '_');
  const fromType = SIGNAL_SEVERITY[type];
  if (fromType) return fromType;

  // Fallback to importance score
  if (importance != null) {
    if (importance >= 0.85) return 'P0';
    if (importance >= 0.65) return 'P1';
    if (importance >= 0.45) return 'P2';
  }
  return 'P3';
}

export function getSeverityColor(severity: Severity): string {
  return SEVERITY_CONFIG[severity].color;
}
