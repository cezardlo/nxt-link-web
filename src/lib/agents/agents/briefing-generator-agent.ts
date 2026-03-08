// src/lib/agents/agents/briefing-generator-agent.ts
// Generates daily intelligence briefings from accumulated intel signals.
// Runs once per day via cron. Summarizes top signals by industry and type.

import {
  getIntelSignals,
  getIntelSignalStats,
  type IntelSignalRow,
} from '@/db/queries/intel-signals';
import {
  saveDailyBriefing,
  getBriefingByDate,
  type BriefingSection,
  type BriefingHighlight,
  type DailyBriefingRow,
} from '@/db/queries/daily-briefings';

// ─── Industry Labels ────────────────────────────────────────────────────────────

const INDUSTRY_LABEL: Record<string, string> = {
  health_biotech: 'Health & Biotech',
  manufacturing: 'Manufacturing',
  aerospace_defense: 'Aerospace & Defense',
  agriculture: 'Agriculture',
  construction: 'Construction & Infrastructure',
  energy: 'Energy',
  fintech: 'Fintech',
  cybersecurity: 'Cybersecurity',
  ai_ml: 'AI & Machine Learning',
  supply_chain: 'Supply Chain & Logistics',
  general: 'General',
};

const TYPE_LABEL: Record<string, string> = {
  patent_filing: 'Patents Filed',
  research_paper: 'Research Published',
  case_study: 'Case Studies',
  hiring_signal: 'Hiring Signals',
  funding_round: 'Funding Rounds',
  merger_acquisition: 'Mergers & Acquisitions',
  contract_award: 'Contracts Awarded',
  product_launch: 'Product Launches',
  regulatory_action: 'Regulatory Actions',
  facility_expansion: 'Facility Expansions',
};

// ─── Briefing Generator ─────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Generate a daily briefing from last 24h of intel signals */
export async function generateDailyBriefing(): Promise<DailyBriefingRow | null> {
  const today = getTodayDate();

  // Check if we already generated today's briefing
  const existing = await getBriefingByDate(today);
  if (existing) {
    console.log(`[briefing] Already generated for ${today}`);
    return existing;
  }

  // Get signals from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const signals = await getIntelSignals({ since, limit: 500 });
  const stats = await getIntelSignalStats(since);

  if (signals.length === 0) {
    console.log('[briefing] No signals in last 24h, skipping');
    return null;
  }

  // Build sections by industry (top 5 industries)
  const byIndustry = groupBy(signals, s => s.industry);
  const topIndustries = Object.entries(byIndustry)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  const sections: BriefingSection[] = topIndustries.map(([industry, sigs]) => {
    const topSigs = sigs
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 5);

    return {
      title: INDUSTRY_LABEL[industry] ?? industry,
      body: buildSectionBody(industry, sigs),
      signal_count: sigs.length,
      key_signals: topSigs.map(s => ({
        title: s.title,
        type: s.signal_type,
        company: s.company ?? undefined,
      })),
    };
  });

  // Build highlights (top 10 most important signals)
  const highlights: BriefingHighlight[] = signals
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 10)
    .map(s => ({
      title: s.title,
      type: s.signal_type,
      industry: s.industry,
      importance: s.importance_score,
      company: s.company ?? undefined,
      amount_usd: s.amount_usd ?? undefined,
    }));

  // Build summary
  const topIndustryNames = topIndustries.map(([ind]) => INDUSTRY_LABEL[ind] ?? ind);
  const topTypes = Object.entries(stats.by_type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => TYPE_LABEL[type] ?? type);

  const summary = [
    `${today} Intelligence Briefing: ${signals.length} signals detected across ${Object.keys(stats.by_industry).length} industries.`,
    `Top sectors: ${topIndustryNames.join(', ')}.`,
    `Most active signal types: ${topTypes.join(', ')}.`,
    highlights[0] ? `Top story: ${highlights[0].title}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const briefing = await saveDailyBriefing({
    briefing_date: today,
    title: `NXT//LINK Intelligence Briefing — ${today}`,
    summary,
    sections,
    signal_count: signals.length,
    top_industries: topIndustryNames,
    top_signal_types: topTypes,
    highlights,
  });

  if (briefing) {
    console.log(`[briefing] Generated for ${today}: ${signals.length} signals, ${sections.length} sections`);
  }

  return briefing;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

function buildSectionBody(industry: string, signals: IntelSignalRow[]): string {
  const byType = groupBy(signals, s => s.signal_type);
  const parts: string[] = [];

  for (const [type, sigs] of Object.entries(byType)) {
    const label = TYPE_LABEL[type] ?? type;
    parts.push(`${label}: ${sigs.length}`);
  }

  const avgImportance = signals.reduce((sum, s) => sum + s.importance_score, 0) / signals.length;

  return [
    `${INDUSTRY_LABEL[industry] ?? industry}: ${signals.length} signals detected.`,
    `Breakdown: ${parts.join(', ')}.`,
    `Average importance: ${(avgImportance * 100).toFixed(0)}%.`,
  ].join(' ');
}

/** Get yesterday's briefing — useful for the /command page */
export async function getYesterdayBriefing(): Promise<DailyBriefingRow | null> {
  return getBriefingByDate(getYesterdayDate());
}
