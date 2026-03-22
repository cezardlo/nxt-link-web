'use client';

import { useMemo } from 'react';
import { COLORS } from '@/lib/tokens';
import type { IndustryMeta, Technology } from '@/lib/data/technology-catalog';
import type { CountryTechProfile } from '@/lib/data/country-tech-map';

// ─── Types ──────────────────────────────────────────────────────────────────

type Props = {
  industry: IndustryMeta;
  technologies: Technology[];
  countries: CountryTechProfile[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signals: any[];
  accentColor: string;
};

type Metric = {
  label: string;
  value: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBudgetTotal(millions: number): string {
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  if (millions > 0) return `$${Math.round(millions)}M`;
  return '$0';
}

function findTopCountry(
  countries: CountryTechProfile[],
  industry: IndustryMeta,
): string {
  const categoryLower = industry.category.toLowerCase();

  const matching = countries
    .filter((c) =>
      c.primarySectors.some((s) => s.toLowerCase() === categoryLower),
    )
    .sort((a, b) => b.techScore - a.techScore);

  return matching.length > 0 ? matching[0].name : '—';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function KeyMetrics({ industry, technologies, countries, accentColor }: Props) {
  const metrics = useMemo<Metric[]>(() => {
    const techCount = technologies.length;

    const totalBudget = technologies.reduce(
      (sum, t) => sum + (t.governmentBudgetFY25M ?? 0),
      0,
    );

    const vendorReach = technologies.reduce(
      (sum, t) => sum + t.relatedVendorCount,
      0,
    );

    const topCountry = findTopCountry(countries, industry);

    return [
      { label: 'TECHNOLOGIES', value: String(techCount) },
      { label: 'GOV BUDGET', value: formatBudgetTotal(totalBudget) },
      { label: 'VENDOR REACH', value: vendorReach.toLocaleString() },
      { label: 'TOP COUNTRY', value: topCountry },
    ];
  }, [technologies, countries, industry]);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-[2px] h-3 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="font-mono text-[8px] tracking-[0.3em] uppercase"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          KEY METRICS
        </span>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="relative overflow-hidden rounded-xl px-5 py-4"
            style={{
              background: COLORS.card,
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {/* Accent line at top */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `${accentColor}33` }}
            />

            {/* Value */}
            <div
              className="font-mono text-[18px] font-bold mb-1"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {metric.value}
            </div>

            {/* Label */}
            <div
              className="font-mono text-[8px] tracking-[0.2em] uppercase"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
