'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { COLORS } from '@/lib/tokens';
import type { IndustryMeta, Technology, TechMaturity } from '@/lib/data/technology-catalog';

// ─── Types ──────────────────────────────────────────────────────────────────

type Props = {
  technologies: Technology[];
  accentColor: string;
  industry: IndustryMeta;
};

type FilterValue = 'ALL' | TechMaturity;
type SortField = 'name' | 'vendors' | 'budget';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MATURITY_DOT: Record<TechMaturity, string> = {
  mature: COLORS.green,
  growing: COLORS.cyan,
  emerging: COLORS.amber,
};

const MATURITY_LABEL: Record<TechMaturity, string> = {
  mature: 'Mature',
  growing: 'Growing',
  emerging: 'Emerging',
};

const RELEVANCE_COLORS: Record<string, string> = {
  high: COLORS.green,
  medium: COLORS.amber,
  low: 'rgba(255,255,255,0.2)',
};

const MOMENTUM_LABEL: Record<TechMaturity, { text: string; color: string }> = {
  mature: { text: 'Stable', color: COLORS.green },
  growing: { text: 'Accelerating', color: COLORS.cyan },
  emerging: { text: 'Early Signal', color: COLORS.amber },
};

function formatBudget(millions?: number): string | null {
  if (millions == null) return null;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions}M`;
}

function deriveApplications(keywords: string[]): string[] {
  const apps: string[] = [];
  const joined = keywords.join(' ').toLowerCase();

  if (joined.includes('defense') || joined.includes('military')) apps.push('Defense & Military');
  if (joined.includes('surveillance') || joined.includes('monitoring')) apps.push('Surveillance Systems');
  if (joined.includes('autonomous') || joined.includes('unmanned')) apps.push('Autonomous Operations');
  if (joined.includes('analytics') || joined.includes('intelligence')) apps.push('Intelligence Analytics');
  if (joined.includes('cloud') || joined.includes('infrastructure')) apps.push('Cloud Infrastructure');
  if (joined.includes('healthcare') || joined.includes('clinical') || joined.includes('health')) apps.push('Healthcare');
  if (joined.includes('manufacturing') || joined.includes('industrial')) apps.push('Industrial Manufacturing');
  if (joined.includes('energy') || joined.includes('grid') || joined.includes('solar')) apps.push('Energy Systems');
  if (joined.includes('border') || joined.includes('customs') || joined.includes('cbp')) apps.push('Border Security');
  if (joined.includes('logistics') || joined.includes('supply chain')) apps.push('Supply Chain & Logistics');
  if (joined.includes('contract') || joined.includes('procurement') || joined.includes('award')) apps.push('Government Procurement');

  return apps.length > 0 ? apps.slice(0, 5) : ['General Technology'];
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

function Drawer({
  tech,
  onClose,
  accentColor,
}: {
  tech: Technology | null;
  onClose: () => void;
  accentColor: string;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (tech) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tech, onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (tech) {
      setTimeout(() => window.addEventListener('mousedown', handler), 10);
    }
    return () => window.removeEventListener('mousedown', handler);
  }, [tech, onClose]);

  if (!tech) return null;

  const maturityColor = MATURITY_DOT[tech.maturityLevel];
  const budgetStr = formatBudget(tech.governmentBudgetFY25M);
  const momentum = MOMENTUM_LABEL[tech.maturityLevel];
  const applications = deriveApplications(tech.procurementSignalKeywords);
  const relevanceColor = RELEVANCE_COLORS[tech.elPasoRelevance];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        ref={drawerRef}
        className="w-full max-w-md h-full overflow-y-auto animate-slide-in-right"
        style={{
          background: COLORS.surface,
          borderLeft: `1px solid ${COLORS.border}`,
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            background: COLORS.surface,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
            TECHNOLOGY DETAIL
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] px-2 py-1 rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ESC
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Name + maturity */}
          <div>
            <h2 className="font-mono text-[14px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {tech.name}
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: maturityColor }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: `${maturityColor}cc` }}>
                {MATURITY_LABEL[tech.maturityLevel]}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="font-mono text-[7px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
              DESCRIPTION
            </div>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tech.description}
            </p>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-3 gap-3 py-4 rounded-xl px-4"
            style={{ background: COLORS.card, border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div>
              <div className="font-mono text-[14px] font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {tech.relatedVendorCount}
              </div>
              <div className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                Vendors
              </div>
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold" style={{ color: budgetStr ? COLORS.gold : 'rgba(255,255,255,0.2)' }}>
                {budgetStr ?? '—'}
              </div>
              <div className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                Gov Budget
              </div>
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold" style={{ color: momentum.color }}>
                {momentum.text}
              </div>
              <div className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                Momentum
              </div>
            </div>
          </div>

          {/* El Paso Relevance */}
          <div>
            <div className="font-mono text-[7px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
              EL PASO RELEVANCE
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: relevanceColor }} />
              <span
                className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: relevanceColor }}
              >
                {tech.elPasoRelevance}
              </span>
            </div>
            <p className="font-mono text-[9px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {tech.elPasoRelevance === 'high'
                ? 'Directly applicable to El Paso border region operations, defense installations, or cross-border commerce.'
                : tech.elPasoRelevance === 'medium'
                  ? 'Moderate applicability through regional industry connections or federal programs active in the area.'
                  : 'Limited direct applicability but worth monitoring for future regional impact.'}
            </p>
          </div>

          {/* Procurement Signal Keywords */}
          <div>
            <div className="font-mono text-[7px] tracking-[0.2em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.15)' }}>
              PROCUREMENT SIGNAL KEYWORDS
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tech.procurementSignalKeywords.map((kw) => (
                <span
                  key={kw}
                  className="font-mono text-[8px] px-2 py-1 rounded-md"
                  style={{
                    background: `${accentColor}10`,
                    border: `1px solid ${accentColor}20`,
                    color: `${accentColor}aa`,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Related Applications */}
          <div>
            <div className="font-mono text-[7px] tracking-[0.2em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.15)' }}>
              RELATED APPLICATIONS
            </div>
            <div className="space-y-1.5">
              {applications.map((app) => (
                <div key={app} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full" style={{ background: accentColor, opacity: 0.4 }} />
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {app}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Maturity Assessment */}
          <div
            className="rounded-xl p-4"
            style={{ background: COLORS.card, border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="font-mono text-[7px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
              MATURITY ASSESSMENT
            </div>
            <div className="flex items-center gap-3 mb-2">
              {(['emerging', 'growing', 'mature'] as TechMaturity[]).map((level) => (
                <div key={level} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-1 rounded-full"
                    style={{
                      background:
                        level === tech.maturityLevel
                          ? MATURITY_DOT[level]
                          : 'rgba(255,255,255,0.06)',
                    }}
                  />
                  <span
                    className="font-mono text-[7px] uppercase"
                    style={{
                      color:
                        level === tech.maturityLevel
                          ? `${MATURITY_DOT[level]}cc`
                          : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {MATURITY_LABEL[level]}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[8px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {tech.maturityLevel === 'mature'
                ? 'Production-grade with established vendor ecosystem and proven government deployments.'
                : tech.maturityLevel === 'growing'
                  ? 'Actively expanding with increasing government adoption and growing vendor competition.'
                  : 'Early-stage technology with limited but promising government interest and pilot programs.'}
            </p>
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

// ─── Filter Pills ───────────────────────────────────────────────────────────

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'ALL', label: 'ALL' },
  { value: 'emerging', label: 'EMERGING' },
  { value: 'growing', label: 'GROWING' },
  { value: 'mature', label: 'MATURE' },
];

const SORTS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'budget', label: 'Budget' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function TechnologyCatalog({ technologies, accentColor }: Props) {
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [sort, setSort] = useState<SortField>('name');
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  const filtered = useMemo(() => {
    const result = filter === 'ALL' ? [...technologies] : technologies.filter((t) => t.maturityLevel === filter);

    switch (sort) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'vendors':
        result.sort((a, b) => b.relatedVendorCount - a.relatedVendorCount);
        break;
      case 'budget':
        result.sort((a, b) => (b.governmentBudgetFY25M ?? 0) - (a.governmentBudgetFY25M ?? 0));
        break;
    }

    return result;
  }, [technologies, filter, sort]);

  const handleClose = useCallback(() => setSelectedTech(null), []);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-[2px] h-3 rounded-full"
          style={{ background: accentColor }}
        />
        <span className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
          TECHNOLOGY CATALOG
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="font-mono text-[8px] tracking-[0.15em] px-3 py-1.5 rounded-full transition-all duration-150"
                style={{
                  background: active ? `${accentColor}18` : 'transparent',
                  border: `1px solid ${active ? `${accentColor}40` : 'rgba(255,255,255,0.06)'}`,
                  color: active ? accentColor : 'rgba(255,255,255,0.25)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.12)' }}>
            Sort:
          </span>
          {SORTS.map((s) => {
            const active = sort === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                className="font-mono text-[8px] px-2 py-1 rounded-md transition-colors"
                style={{
                  color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                  background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Technology grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((tech) => {
          const maturityColor = MATURITY_DOT[tech.maturityLevel];
          const budgetStr = formatBudget(tech.governmentBudgetFY25M);
          const relevanceColor = RELEVANCE_COLORS[tech.elPasoRelevance];
          const momentum = MOMENTUM_LABEL[tech.maturityLevel];

          return (
            <button
              key={tech.id}
              onClick={() => setSelectedTech(tech)}
              className="text-left rounded-2xl p-5 transition-all duration-150 hover:scale-[1.01] group"
              style={{
                background: COLORS.card,
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Name */}
              <div className="font-mono text-[11px] font-bold mb-2 transition-colors group-hover:text-white" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {tech.name}
              </div>

              {/* Maturity badge */}
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: maturityColor }} />
                <span className="font-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: `${maturityColor}99` }}>
                  {MATURITY_LABEL[tech.maturityLevel]}
                </span>
              </div>

              {/* Description (3-line clamp) */}
              <p
                className="font-mono text-[9px] leading-relaxed mb-4 line-clamp-3"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {tech.description}
              </p>

              {/* Stats row */}
              <div
                className="flex items-center gap-3 pt-3 flex-wrap"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Vendor count */}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {tech.relatedVendorCount}
                  </span>
                  <span className="font-mono text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    vendors
                  </span>
                </div>

                {/* Budget */}
                {budgetStr && (
                  <span className="font-mono text-[9px] font-bold" style={{ color: COLORS.gold }}>
                    {budgetStr}
                  </span>
                )}

                {/* El Paso relevance */}
                <span
                  className="font-mono text-[7px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md ml-auto"
                  style={{
                    color: relevanceColor,
                    background: `${relevanceColor}10`,
                    border: `1px solid ${relevanceColor}20`,
                  }}
                >
                  {tech.elPasoRelevance} EP
                </span>

                {/* Momentum */}
                <span className="font-mono text-[7px]" style={{ color: `${momentum.color}80` }}>
                  {momentum.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="flex items-center justify-center py-16 rounded-2xl"
          style={{ background: COLORS.card, border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
            No technologies match the current filter.
          </span>
        </div>
      )}

      {/* Detail drawer */}
      <Drawer tech={selectedTech} onClose={handleClose} accentColor={accentColor} />
    </section>
  );
}
