'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import { getCompanyLogoUrl } from '@/lib/utils/company-logos';
import {
  INNOVATION_CYCLES,
  getInnovationCycle,
  getTechsByStage,
  getStageColor,
  getStageLabel,
  type InnovationStage,
} from '@/lib/data/innovation-cycle';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import {
  STAGE_DASHBOARD_DATA,
  ALL_DISRUPTIONS,
  TECH_CONNECTIONS,
  type DisruptionEvent,
} from '@/lib/data/innovation-dashboard-data';

// ── Dynamic import (Cytoscape needs window) ──────────────────────────────────

const InnovationCycleGraph = dynamic(
  () =>
    import('@/components/InnovationCycleGraph').then((m) => ({
      default: m.InnovationCycleGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[460px] flex items-center justify-center bg-black border border-white/[0.08] rounded-sm">
        <span className="font-mono text-[8px] text-white/20 tracking-[0.2em]">
          LOADING ECOSYSTEM MAP...
        </span>
      </div>
    ),
  },
);

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_STAGES: InnovationStage[] = [
  'discovery', 'research', 'development', 'productization', 'adoption', 'impact',
];

const STAGE_DESCRIPTIONS: Record<InnovationStage, { title: string; subtitle: string; description: string }> = {
  discovery: {
    title: 'DISCOVERY',
    subtitle: 'Where Ideas Originate',
    description: 'Initial concept identification from academic research, government labs, or corporate R&D.',
  },
  research: {
    title: 'RESEARCH',
    subtitle: 'Institutions & Studies',
    description: 'Formal research programs at universities, national labs, and think tanks.',
  },
  development: {
    title: 'DEVELOPMENT',
    subtitle: 'Building Prototypes',
    description: 'Startups and corporate labs build working prototypes and secure funding.',
  },
  productization: {
    title: 'PRODUCTIZATION',
    subtitle: 'Market-Ready Solutions',
    description: 'Technology packaged into products with pricing, support, and go-to-market strategies.',
  },
  adoption: {
    title: 'ADOPTION',
    subtitle: 'Real-World Deployment',
    description: 'Organizations deploy technology in production. Pilot programs convert to full rollouts.',
  },
  impact: {
    title: 'IMPACT',
    subtitle: 'Measurable Outcomes',
    description: 'Technology delivers quantifiable results: cost savings, efficiency gains, new capabilities.',
  },
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  university: '#a855f7',
  startup: '#00ff88',
  enterprise: '#00d4ff',
  government: '#ffd700',
  lab: '#f97316',
  military: '#ff3b30',
};

const IMPACT_COLORS: Record<string, string> = {
  high: '#ff3b30',
  medium: '#f97316',
  low: '#ffd700',
};

const MATURITY_COLORS: Record<string, string> = {
  prototype: '#f97316',
  beta: '#ffd700',
  production: '#00ff88',
};

type TechConnection = { from: string; to: string; type: string };

const RELATIONSHIP_COLORS: Record<string, string> = {
  enables: '#00d4ff',
  competes: '#ff3b30',
  acquires: '#f97316',
  uses: '#ffd700',
};

// ── Vendor name -> id lookup ─────────────────────────────────────────────────

const VENDOR_NAME_TO_ID: Record<string, string> = {};
for (const [key, v] of Object.entries(EL_PASO_VENDORS)) {
  VENDOR_NAME_TO_ID[v.name.toLowerCase()] = key;
}

function findVendorId(entityName: string): string | null {
  const lower = entityName.toLowerCase();
  if (VENDOR_NAME_TO_ID[lower]) return VENDOR_NAME_TO_ID[lower];
  for (const [vendorName, vendorId] of Object.entries(VENDOR_NAME_TO_ID)) {
    if (vendorName.includes(lower) || lower.includes(vendorName.split(' (')[0])) {
      return vendorId;
    }
  }
  return null;
}

// Company logo resolution now uses shared utility: getCompanyLogoUrl()
const getCompanyLogo = (company: string) => getCompanyLogoUrl(company);

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InnovationPage() {
  const [activeTech, setActiveTech] = useState<string>('tech-computer-vision');
  const [activeStage, setActiveStage] = useState<InnovationStage>('discovery');
  const [search, setSearch] = useState('');
  const [imgError, setImgError] = useState<Set<string>>(new Set());
  const [showAllDisruptions, setShowAllDisruptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | undefined>();

  const currentCycle = useMemo(() => getInnovationCycle(activeTech), [activeTech]);
  const filteredTechs = useMemo(() => {
    if (!search.trim()) return INNOVATION_CYCLES;
    const q = search.toLowerCase();
    return INNOVATION_CYCLES.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [search]);
  const techsAtStage = useMemo(() => getTechsByStage(activeStage), [activeStage]);

  const stageData = STAGE_DASHBOARD_DATA[activeStage];
  const stageDesc = STAGE_DESCRIPTIONS[activeStage];
  const stageColor = getStageColor(activeStage);
  const currentStageDetail = currentCycle?.stages[activeStage];

  const mergedDisruptions = useMemo(() => {
    const stageDisruptions = stageData.disruptions;
    const globalForStage = ALL_DISRUPTIONS.filter(
      (d) => !stageDisruptions.some((sd) => sd.title === d.title),
    ).slice(0, 3);
    return [...stageDisruptions, ...globalForStage].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [stageData.disruptions]);

  const stageConnections = useMemo(() => {
    const companyNames = new Set(stageData.companies.map((c) => c.name));
    return TECH_CONNECTIONS.filter(
      (c: TechConnection) => companyNames.has(c.from) || companyNames.has(c.to),
    );
  }, [stageData.companies]);

  const stageCounts = useMemo(() => {
    const counts: Record<InnovationStage, number> = {
      discovery: 0, research: 0, development: 0, productization: 0, adoption: 0, impact: 0,
    };
    for (const cycle of INNOVATION_CYCLES) counts[cycle.currentStage]++;
    return counts;
  }, []);

  const visibleDisruptions = showAllDisruptions ? mergedDisruptions : mergedDisruptions.slice(0, 5);

  // Graph data props
  const graphEntities = useMemo(
    () => stageData.companies.map((c) => ({ name: c.name, type: c.type, stage: activeStage })),
    [activeStage, stageData.companies],
  );
  const graphProducts = useMemo(
    () => stageData.products.map((p) => ({ name: p.name, company: p.company, stage: activeStage })),
    [activeStage, stageData.products],
  );
  const graphConnections = useMemo(
    () =>
      stageConnections.map((c) => ({
        from: c.from,
        to: c.to,
        type: c.type as 'enables' | 'competes' | 'acquires' | 'uses',
      })),
    [stageConnections],
  );

  return (
    <div className="bg-black min-h-screen font-mono">
      {/* TOP BAR */}
      <PageTopBar
        backHref="/industries"
        backLabel="EXPLORE"
        breadcrumbs={[{ label: 'INNOVATION CYCLE' }]}
        showLiveDot
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[8px] tracking-[0.2em] text-white/25 border border-white/[0.08] px-2 py-0.5 rounded-sm">
              {INNOVATION_CYCLES.length} TECHNOLOGIES
            </span>
            <span className="font-mono text-[7px] tracking-[0.2em] text-[#00ff88] border border-[#00ff88]/20 bg-[#00ff88]/5 px-2 py-0.5 rounded-sm">
              LIVE
            </span>
          </div>
        }
      />

      {/* HEADER */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="py-3 border-b border-white/[0.05]">
          <h1 className="text-[13px] sm:text-[15px] tracking-[0.3em] text-white/60 uppercase leading-none">
            Innovation Cycle Intelligence
          </h1>
          <p className="text-[9px] text-white/25 mt-1 tracking-wide">
            Full lifecycle tracing: concept to impact across {INNOVATION_CYCLES.length} technologies
          </p>
        </div>

        {/* STAGE PIPELINE */}
        <div className="flex items-center py-2.5 border-b border-white/[0.05] overflow-x-auto gap-0 scrollbar-thin">
          {ALL_STAGES.map((stage, i) => {
            const color = getStageColor(stage);
            const isActive = activeStage === stage;
            return (
              <div key={stage} className="flex items-center shrink-0">
                <button
                  onClick={() => { setActiveStage(stage); setSelectedEntity(undefined); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? `${color}10` : 'transparent',
                    borderBottom: isActive ? `1px solid ${color}` : '1px solid transparent',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 8px ${color}cc` : `0 0 3px ${color}44`,
                    }}
                  />
                  <span
                    className="text-[8px] tracking-[0.15em] uppercase whitespace-nowrap"
                    style={{ color: isActive ? color : 'rgba(255,255,255,0.35)' }}
                  >
                    {getStageLabel(stage)}
                  </span>
                  <span
                    className="text-[7px] tabular-nums px-1 py-0.5 rounded-sm border"
                    style={{
                      color: isActive ? color : 'rgba(255,255,255,0.2)',
                      borderColor: isActive ? `${color}40` : 'rgba(255,255,255,0.06)',
                      backgroundColor: isActive ? `${color}10` : 'transparent',
                    }}
                  >
                    {stageCounts[stage]}
                  </span>
                </button>
                {i < ALL_STAGES.length - 1 && (
                  <span className="text-white/15 text-[8px] mx-0.5">&rarr;</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TRIPARTITE LAYOUT ──────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4">

          {/* ════════ LEFT CONTEXT PANEL ════════ */}
          <div className="w-full lg:w-[320px] lg:shrink-0 space-y-4 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:scrollbar-thin lg:pr-1">

            {/* STAGE DETAIL */}
            <div className="border border-white/[0.08] rounded-sm p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stageColor, boxShadow: `0 0 10px ${stageColor}cc` }}
                />
                <div>
                  <div className="text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: stageColor }}>
                    {stageDesc.title}
                  </div>
                  <div className="text-[8px] text-white/30 tracking-wide">{stageDesc.subtitle}</div>
                </div>
              </div>
              <p className="text-[9px] text-white/30 leading-relaxed">{stageDesc.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-1.5">
                {stageData.stats.map((stat) => (
                  <div key={stat.label} className="bg-black border border-white/[0.06] rounded-sm p-2 space-y-0.5">
                    <div className="text-[6px] tracking-[0.2em] text-white/20 uppercase">{stat.label}</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] tabular-nums font-medium" style={{ color: stageColor }}>
                        {stat.value}
                      </span>
                      <span className="text-[8px]" style={{
                        color: stat.trend === 'up' ? '#00ff88' : stat.trend === 'down' ? '#ff3b30' : '#ffd700',
                      }}>
                        {stat.trend === 'up' ? '▲' : stat.trend === 'down' ? '▼' : '━'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics from selected tech */}
              {currentStageDetail?.metrics && currentStageDetail.metrics.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
                  <div className="text-[6px] tracking-[0.2em] text-white/20 uppercase">
                    {currentCycle?.name ?? 'TECH'} METRICS
                  </div>
                  {currentStageDetail.metrics.map((m) => (
                    <div key={m.label} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] text-white/25 tracking-wide">{m.label}</span>
                        <span className="text-[8px] tabular-nums" style={{ color: stageColor }}>{m.value}</span>
                      </div>
                      {m.progress !== undefined && (
                        <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, m.progress)}%`,
                              backgroundColor: stageColor,
                              boxShadow: `0 0 4px ${stageColor}60`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SELECTED TECHNOLOGY */}
            {currentCycle && (
              <div className="border rounded-sm p-3 space-y-2" style={{ borderColor: `${getStageColor(currentCycle.currentStage)}30` }}>
                <div className="flex items-center justify-between">
                  <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">SELECTED TECHNOLOGY</div>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{
                      backgroundColor: getStageColor(currentCycle.currentStage),
                      boxShadow: `0 0 6px ${getStageColor(currentCycle.currentStage)}cc`,
                    }} />
                    <span className="text-[7px] tracking-[0.15em] uppercase" style={{ color: getStageColor(currentCycle.currentStage) }}>
                      {getStageLabel(currentCycle.currentStage)}
                    </span>
                  </span>
                </div>
                <div className="text-[11px] tracking-wider uppercase" style={{ color: getStageColor(currentCycle.currentStage) }}>
                  {currentCycle.name}
                </div>
                <p className="text-[8px] text-white/25 leading-relaxed line-clamp-2">{currentCycle.description}</p>

                {/* Progress bar */}
                <div className="flex gap-0.5">
                  {ALL_STAGES.map((stage) => {
                    const isPast = ALL_STAGES.indexOf(stage) <= ALL_STAGES.indexOf(currentCycle.currentStage);
                    const c = getStageColor(stage);
                    return (
                      <div key={stage} className="flex-1 h-[3px] rounded-full" style={{
                        backgroundColor: isPast ? c : 'rgba(255,255,255,0.06)',
                        boxShadow: isPast ? `0 0 4px ${c}60` : 'none',
                      }} />
                    );
                  })}
                </div>

                {/* Trend */}
                {currentCycle.trend && (
                  <div className="flex items-center gap-2">
                    <span className="text-[6px] tracking-[0.2em] text-white/20 uppercase">TREND</span>
                    <span className="text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border" style={{
                      color: currentCycle.trend === 'increasing' ? '#00ff88' : currentCycle.trend === 'decreasing' ? '#ff3b30' : '#ffd700',
                      borderColor: `${currentCycle.trend === 'increasing' ? '#00ff88' : currentCycle.trend === 'decreasing' ? '#ff3b30' : '#ffd700'}40`,
                      backgroundColor: `${currentCycle.trend === 'increasing' ? '#00ff88' : currentCycle.trend === 'decreasing' ? '#ff3b30' : '#ffd700'}10`,
                    }}>
                      {currentCycle.trend.toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Entity pills */}
                {currentStageDetail?.entities && currentStageDetail.entities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {currentStageDetail.entities.slice(0, 6).map((entity) => {
                      const vendorId = findVendorId(entity);
                      const pill = (
                        <span className="font-mono text-[7px] px-1.5 py-0.5 rounded-sm border inline-flex items-center gap-1" style={{
                          borderColor: vendorId ? `${stageColor}50` : `${stageColor}25`,
                          backgroundColor: `${stageColor}08`,
                          color: `${stageColor}bb`,
                        }}>
                          {entity}
                          {vendorId && <span className="text-[6px] opacity-60">&rarr;</span>}
                        </span>
                      );
                      return vendorId ? (
                        <Link key={entity} href={`/vendor/${vendorId}`} className="hover:brightness-125 transition-all">{pill}</Link>
                      ) : (
                        <span key={entity}>{pill}</span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DISRUPTIONS & NEWS */}
            <div className="border border-white/[0.08] rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">DISRUPTIONS &amp; NEWS</div>
                <span className="text-[7px] tabular-nums text-white/15">{mergedDisruptions.length}</span>
              </div>
              <div className="space-y-1">
                {visibleDisruptions.map((d: DisruptionEvent, idx: number) => {
                  const ic = IMPACT_COLORS[d.impact] ?? '#6b7280';
                  return (
                    <div key={`${d.title}-${idx}`} className="flex items-start gap-1.5 py-1 border-b border-white/[0.03] last:border-0">
                      <span className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0" style={{
                        backgroundColor: ic, boxShadow: `0 0 4px ${ic}88`,
                      }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[8px] text-white/45 leading-snug line-clamp-1">{d.title}</span>
                          <span className="text-[6px] tabular-nums text-white/20 shrink-0 whitespace-nowrap">{formatDate(d.date)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[5px] tracking-[0.15em] uppercase px-1 py-0.5 rounded-sm border" style={{
                            color: ic, borderColor: `${ic}30`, backgroundColor: `${ic}08`,
                          }}>
                            {d.impact.toUpperCase()}
                          </span>
                          {d.companies.slice(0, 2).map((c: string) => (
                            <span key={c} className="text-[5px] text-white/20 px-1 py-0.5 bg-white/[0.03] rounded-sm">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {mergedDisruptions.length > 5 && (
                <button
                  onClick={() => setShowAllDisruptions(!showAllDisruptions)}
                  className="w-full text-center text-[6px] tracking-[0.2em] text-white/20 hover:text-[#00d4ff] transition-colors py-1 border-t border-white/[0.04]"
                >
                  {showAllDisruptions ? 'SHOW LESS' : `VIEW ALL ${mergedDisruptions.length}`}
                </button>
              )}
            </div>

            {/* TECHNOLOGY EXPLORER */}
            <div className="border border-white/[0.08] rounded-sm p-3 space-y-2">
              <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">TECHNOLOGY EXPLORER</div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-b border-white/[0.06] font-mono text-[9px] text-white/50 placeholder:text-white/15 py-1.5 outline-none focus:border-white/20 transition-colors"
              />
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                {filteredTechs.map((tech) => {
                  const isActive = activeTech === tech.id;
                  const tc = getStageColor(tech.currentStage);
                  return (
                    <button
                      key={tech.id}
                      onClick={() => { setActiveTech(tech.id); setActiveStage(tech.currentStage); }}
                      className="w-full text-left px-2 py-1.5 rounded-sm border transition-all duration-150"
                      style={{
                        borderColor: isActive ? `${tc}40` : 'rgba(255,255,255,0.03)',
                        backgroundColor: isActive ? `${tc}08` : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] tracking-wide truncate" style={{ color: isActive ? tc : 'rgba(255,255,255,0.5)' }}>
                          {tech.name}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tc, boxShadow: `0 0 3px ${tc}88` }} />
                          <span className="text-[6px] tracking-[0.1em] uppercase" style={{ color: `${tc}90` }}>
                            {getStageLabel(tech.currentStage).slice(0, 4)}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ════════ RIGHT MAIN VISUALIZATION ════════ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ECOSYSTEM MAP */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">ECOSYSTEM MAP</div>
                <div className="flex items-center gap-2">
                  {(Object.entries(TYPE_BADGE_COLORS) as Array<[string, string]>).map(([type, color]) => (
                    <span key={type} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[5px] tracking-[0.1em] uppercase" style={{ color: `${color}90` }}>{type}</span>
                    </span>
                  ))}
                </div>
              </div>
              <InnovationCycleGraph
                activeStage={activeStage}
                onStageClick={(s) => { setActiveStage(s as InnovationStage); setSelectedEntity(undefined); }}
                onEntityClick={(name) => setSelectedEntity(name === selectedEntity ? undefined : name)}
                techName={currentCycle?.name}
                entities={graphEntities}
                products={graphProducts}
                connections={graphConnections}
                selectedEntity={selectedEntity}
              />
            </div>

            {/* COMPANIES + PRODUCTS (side by side) */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

              {/* COMPANIES AT STAGE (3/5) */}
              <div className="xl:col-span-3 border border-white/[0.08] rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">COMPANIES AT STAGE</div>
                  <span className="text-[7px] tabular-nums text-white/15">{stageData.companies.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stageData.companies.map((company) => {
                    const vendorId = findVendorId(company.name);
                    const imgKey = `co-${company.name}`;
                    const hasErr = imgError.has(imgKey);
                    const typeColor = TYPE_BADGE_COLORS[company.type] ?? '#6b7280';
                    const isSelected = selectedEntity === company.name;

                    const card = (
                      <div
                        className="border rounded-sm p-2.5 space-y-1.5 transition-all duration-200 cursor-pointer group"
                        style={{
                          borderColor: isSelected ? `${stageColor}60` : 'rgba(255,255,255,0.06)',
                          backgroundColor: isSelected ? `${stageColor}08` : 'transparent',
                          boxShadow: isSelected ? `0 0 12px ${stageColor}15` : 'none',
                        }}
                        onClick={() => setSelectedEntity(company.name === selectedEntity ? undefined : company.name)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = `${stageColor}40`;
                            e.currentTarget.style.boxShadow = `0 0 8px ${stageColor}10`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {!hasErr && company.logo ? (
                            <Image
                              src={company.logo}
                              alt={company.name}
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded-sm bg-white/5 object-contain"
                              onError={() => setImgError((p) => new Set(p).add(imgKey))}
                              unoptimized
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-medium"
                              style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>
                              {company.name[0]}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[8px] text-white/55 truncate group-hover:text-white/75 transition-colors">
                              {company.name}
                            </div>
                            <span className="text-[5px] tracking-[0.15em] uppercase px-1 py-0.5 rounded-sm border inline-block"
                              style={{ color: typeColor, borderColor: `${typeColor}25`, backgroundColor: `${typeColor}08` }}>
                              {company.type}
                            </span>
                          </div>
                        </div>
                        <p className="text-[7px] text-white/20 leading-relaxed line-clamp-1">{company.description}</p>
                        {vendorId && (
                          <div className="text-[5px] tracking-[0.2em] text-[#00d4ff]/40 uppercase">EP VENDOR &rarr;</div>
                        )}
                      </div>
                    );

                    if (vendorId) {
                      return <Link key={company.name} href={`/vendor/${vendorId}`} className="block hover:no-underline">{card}</Link>;
                    }
                    return <div key={company.name}>{card}</div>;
                  })}
                </div>
              </div>

              {/* PRODUCTS & SOLUTIONS (2/5) */}
              <div className="xl:col-span-2 border border-white/[0.08] rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">PRODUCTS &amp; SOLUTIONS</div>
                  <span className="text-[7px] tabular-nums text-white/15">{stageData.products.length}</span>
                </div>
                {stageData.products.length > 0 ? (
                  <div className="space-y-2">
                    {stageData.products.map((product) => {
                      const matColor = MATURITY_COLORS[product.maturity] ?? '#6b7280';
                      const logoUrl = getCompanyLogo(product.company);
                      const logoKey = `prod-${product.name}`;
                      const logoErr = imgError.has(logoKey);
                      return (
                        <div key={product.name} className="border border-white/[0.06] rounded-sm p-2.5 hover:border-white/[0.12] transition-all flex gap-2.5">
                          {/* Company logo */}
                          {!logoErr && logoUrl ? (
                            <Image
                              src={logoUrl}
                              alt={product.company}
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded-sm bg-white/5 object-contain shrink-0"
                              onError={() => setImgError((p) => new Set(p).add(logoKey))}
                              unoptimized
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-medium shrink-0"
                              style={{ backgroundColor: `${matColor}15`, color: matColor }}>
                              {product.company[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[8px] text-white/50 truncate">{product.name}</span>
                              <span className="text-[5px] tracking-[0.15em] uppercase px-1 py-0.5 rounded-sm border shrink-0"
                                style={{ color: matColor, borderColor: `${matColor}25`, backgroundColor: `${matColor}08` }}>
                                {product.maturity.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-[6px] text-white/20 tracking-wide">{product.company}</div>
                            <p className="text-[7px] text-white/25 leading-relaxed line-clamp-1">{product.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[8px] text-white/15 italic py-4 text-center">No products at this stage</div>
                )}
              </div>
            </div>

            {/* CONNECTIONS + STAGE DISTRIBUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* CONNECTIONS */}
              <div className="border border-white/[0.08] rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">ACTIVE CONNECTIONS</div>
                  <div className="flex items-center gap-2">
                    {(Object.entries(RELATIONSHIP_COLORS) as Array<[string, string]>).map(([rel, color]) => (
                      <span key={rel} className="flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[5px] tracking-[0.1em] uppercase" style={{ color: `${color}80` }}>{rel}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {stageConnections.length > 0 ? (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                    {stageConnections.map((conn: TechConnection, idx: number) => {
                      const relColor = RELATIONSHIP_COLORS[conn.type] ?? '#6b7280';
                      return (
                        <div key={`${conn.from}-${conn.to}-${idx}`}
                          className="flex items-center gap-1.5 py-1 px-2 rounded-sm border border-white/[0.04] hover:border-white/[0.08] transition-all">
                          <span className="text-[7px] text-white/40 truncate">{conn.from}</span>
                          <span className="text-[6px] shrink-0" style={{ color: relColor }}>&rarr; {conn.type} &rarr;</span>
                          <span className="text-[7px] text-white/40 truncate">{conn.to}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[8px] text-white/15 italic py-4 text-center">No connections at this stage</div>
                )}
              </div>

              {/* STAGE DISTRIBUTION */}
              <div className="border border-white/[0.08] rounded-sm p-4 space-y-3">
                <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">STAGE DISTRIBUTION</div>
                <div className="flex items-end gap-1.5 h-16">
                  {ALL_STAGES.map((stage) => {
                    const color = getStageColor(stage);
                    const count = stageCounts[stage];
                    const maxCount = Math.max(...ALL_STAGES.map((s) => stageCounts[s]), 1);
                    const heightPct = (count / maxCount) * 100;
                    return (
                      <button key={stage} onClick={() => setActiveStage(stage)}
                        className="flex-1 flex flex-col items-center justify-end h-full transition-all">
                        <div className="text-[7px] tabular-nums mb-0.5" style={{ color: `${color}80` }}>{count}</div>
                        <div className="w-full rounded-sm transition-all duration-300 min-h-[2px]" style={{
                          height: `${heightPct}%`,
                          backgroundColor: `${color}60`,
                          boxShadow: activeStage === stage ? `0 0 8px ${color}40` : 'none',
                          border: activeStage === stage ? `1px solid ${color}80` : '1px solid transparent',
                        }} />
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  {ALL_STAGES.map((stage) => (
                    <div key={stage} className="flex-1 text-center">
                      <div className="text-[5px] tracking-[0.1em] uppercase truncate"
                        style={{ color: activeStage === stage ? getStageColor(stage) : 'rgba(255,255,255,0.2)' }}>
                        {getStageLabel(stage).slice(0, 4)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.04]">
                  <div className="space-y-0.5">
                    <div className="text-[6px] tracking-[0.2em] text-white/20 uppercase">TOTAL</div>
                    <div className="text-[13px] text-[#00d4ff] tabular-nums">{INNOVATION_CYCLES.length}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[6px] tracking-[0.2em] text-white/20 uppercase">AT STAGE</div>
                    <div className="text-[13px] tabular-nums" style={{ color: stageColor }}>{techsAtStage.length}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[6px] tracking-[0.2em] text-white/20 uppercase">ENTITIES</div>
                    <div className="text-[13px] tabular-nums text-white/50">{stageData.companies.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* TECHNOLOGIES AT STAGE */}
            {techsAtStage.length > 0 && (
              <div className="border border-white/[0.08] rounded-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[7px] tracking-[0.2em] text-white/25 uppercase">
                    ALL TECHNOLOGIES AT {stageDesc.title}
                  </div>
                  <span className="text-[7px] tabular-nums text-white/15">{techsAtStage.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {techsAtStage.map((t) => (
                    <div key={t.id} className="flex items-center gap-0">
                      <button
                        onClick={() => setActiveTech(t.id)}
                        className="font-mono text-[8px] px-2 py-1 rounded-l-sm border border-r-0 border-white/[0.08] text-white/40 hover:border-white/20 hover:bg-white/5 hover:text-white/60 transition-all"
                        style={activeTech === t.id ? {
                          borderColor: `${stageColor}40`, backgroundColor: `${stageColor}08`, color: stageColor,
                        } : undefined}
                      >
                        <span className="flex items-center gap-1.5">
                          {t.name}
                          <span className="text-[6px] text-white/20 tracking-wide">{t.category}</span>
                        </span>
                      </button>
                      <Link
                        href={`/technology/${t.id}`}
                        className="font-mono text-[6px] px-1.5 py-1 rounded-r-sm border border-white/[0.08] text-white/25 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition-all"
                        style={activeTech === t.id ? { borderColor: `${stageColor}40`, backgroundColor: `${stageColor}05` } : undefined}
                      >
                        &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
