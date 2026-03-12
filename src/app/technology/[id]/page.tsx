import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageTopBar } from '@/components/PageTopBar';
import {
  TECHNOLOGY_CATALOG,
  getIndustryByCategory,
  getTechByCategory,
  type Technology,
  type TechMaturity,
} from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import dynamic from 'next/dynamic';
import { getKnowledgeNode } from '@/lib/data/technology-knowledge-graph';

const KnowledgeGraph = dynamic(
  () => import('@/components/KnowledgeGraph').then(m => ({ default: m.KnowledgeGraph })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] flex items-center justify-center bg-black border border-white/[0.08] rounded-sm">
        <span className="font-mono text-[8px] text-white/20 tracking-[0.2em]">LOADING GRAPH···</span>
      </div>
    ),
  }
);

// ── Static generation ──────────────────────────────────────────────────────────

export function generateStaticParams() {
  return TECHNOLOGY_CATALOG.map((tech) => ({ id: tech.id }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MATURITY_CONFIG: Record<TechMaturity, { label: string; color: string; bg: string; border: string }> = {
  emerging: {
    label: 'EMERGING',
    color: '#00d4ff',
    bg: 'bg-[#00d4ff]/10',
    border: 'border-[#00d4ff]/30',
  },
  growing: {
    label: 'GROWING',
    color: '#00ff88',
    bg: 'bg-[#00ff88]/10',
    border: 'border-[#00ff88]/30',
  },
  mature: {
    label: 'MATURE',
    color: '#ffd700',
    bg: 'bg-[#ffd700]/10',
    border: 'border-[#ffd700]/30',
  },
};

const RELEVANCE_CONFIG = {
  high:   { label: 'HIGH',   color: '#00ff88', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/30' },
  medium: { label: 'MEDIUM', color: '#ffb800', bg: 'bg-[#ffb800]/10', border: 'border-[#ffb800]/30' },
  low:    { label: 'LOW',    color: '#6b7280', bg: 'bg-white/5',       border: 'border-white/10' },
};

function formatBudget(m?: number): string {
  if (!m) return 'N/A';
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m}M`;
}

// Find vendors whose tags or category overlap with the technology
function findRelatedVendors(tech: Technology) {
  const keywordsLower = tech.procurementSignalKeywords.map((k) => k.toLowerCase());
  const techCategoryLower = tech.category.toLowerCase();

  return Object.values(EL_PASO_VENDORS).filter((vendor) => {
    // Category match
    if (vendor.category.toLowerCase().includes(techCategoryLower)) return true;
    if (techCategoryLower.includes(vendor.category.toLowerCase())) return true;

    // Tag overlap with procurement keywords
    const tagLower = vendor.tags.map((t) => t.toLowerCase());
    return tagLower.some((tag) =>
      keywordsLower.some((kw) => kw.includes(tag) || tag.includes(tech.category.toLowerCase()))
    );
  });
}

// ── Page component ─────────────────────────────────────────────────────────────

export default function TechnologyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tech = TECHNOLOGY_CATALOG.find((t) => t.id === params.id);
  if (!tech) notFound();

  const industry = getIndustryByCategory(tech.category);
  const industrySlug = industry?.slug ?? 'ai-ml';
  const industryLabel = industry?.label ?? tech.category;
  const industryColor = industry?.color ?? '#00d4ff';

  const maturity = MATURITY_CONFIG[tech.maturityLevel];
  const relevance = RELEVANCE_CONFIG[tech.elPasoRelevance];

  const knowledgeNode = getKnowledgeNode(tech.id);

  const relatedVendors = findRelatedVendors(tech).slice(0, 8);
  const relatedTechs = (() => {
    const sameCategory = getTechByCategory(tech.category).filter(t => t.id !== tech.id);
    const crossLinked = knowledgeNode?.relatedTechIds
      ?.map((rid: string) => TECHNOLOGY_CATALOG.find((ct) => ct.id === rid))
      .filter((t): t is Technology => !!t && t.id !== tech.id) ?? [];
    const seen = new Set<string>();
    return [...sameCategory, ...crossLinked].filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    }).slice(0, 8);
  })();

  return (
    <div className="min-h-screen bg-black font-mono">

      {/* TOP BAR */}
      <PageTopBar
        backHref="/industries"
        backLabel="INDUSTRIES"
        breadcrumbs={[
          { label: 'INDUSTRIES', href: '/industries' },
          { label: industryLabel.toUpperCase(), href: `/industry/${industrySlug}` },
          { label: tech.name.toUpperCase() },
        ]}
      />

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── HEADER ── */}
        <div className="space-y-3">

          {/* Category label */}
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[9px] tracking-[0.2em] uppercase"
              style={{ color: industryColor }}
            >
              {industryLabel}
            </span>
            <span className="text-white/15 text-[9px]">/</span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
              TECHNOLOGY
            </span>
          </div>

          {/* Name + badges */}
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="font-mono text-[15px] tracking-wider text-white leading-tight">
              {tech.name.toUpperCase()}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Maturity badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] tracking-[0.15em] ${maturity.bg} ${maturity.border}`}
                style={{ color: maturity.color }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: maturity.color, boxShadow: `0 0 4px ${maturity.color}` }}
                />
                {maturity.label}
              </span>
              {/* Relevance badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] tracking-[0.15em] ${relevance.bg} ${relevance.border}`}
                style={{ color: relevance.color }}
              >
                EP {relevance.label}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="font-mono text-[11px] text-white/55 leading-relaxed max-w-3xl">
            {tech.description}
          </p>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-sm overflow-hidden border border-white/8">
          {[
            {
              label: 'FY25 GOV BUDGET',
              value: formatBudget(tech.governmentBudgetFY25M),
              color: '#ffd700',
            },
            {
              label: 'RELATED VENDORS',
              value: relatedVendors.length.toString(),
              color: '#00d4ff',
            },
            {
              label: 'MATURITY',
              value: maturity.label,
              color: maturity.color,
            },
            {
              label: 'EP RELEVANCE',
              value: relevance.label,
              color: relevance.color,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-black px-4 py-4 space-y-1.5">
              <div className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase">
                {stat.label}
              </div>
              <div
                className="font-mono text-[13px] tracking-wide"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── KNOWLEDGE GRAPH ── */}
        {knowledgeNode && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
              KNOWLEDGE GRAPH
            </div>
            <div className="border border-white/8 rounded-sm overflow-hidden">
              <KnowledgeGraph
                techId={tech.id}
                techName={tech.name}
                techCategory={tech.category}
                accentColor={industryColor}
                node={knowledgeNode}
              />
            </div>
          </div>
        )}

        {/* ── INTELLIGENCE LAYERS ── */}
        {knowledgeNode && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
              INTELLIGENCE LAYERS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'DISCOVERED BY', entities: knowledgeNode.discoveredBy, color: '#00d4ff' },
                { label: 'RESEARCHED BY', entities: knowledgeNode.studiedBy, color: '#ffd700' },
                { label: 'BUILT BY', entities: knowledgeNode.builtBy, color: '#f97316' },
                { label: 'DEPLOYED BY', entities: knowledgeNode.usedBy, color: '#00ff88' },
              ].map(layer => (
                <div key={layer.label} className="p-4 bg-black border border-white/8 rounded-sm space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layer.color, boxShadow: `0 0 6px ${layer.color}cc` }} />
                    <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: layer.color }}>{layer.label}</span>
                    <span className="font-mono text-[8px] text-white/20 ml-auto">{layer.entities.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.entities.map(e => (
                      <span key={e.name} className="font-mono text-[9px] px-2 py-0.5 rounded-sm border" style={{ borderColor: `${layer.color}30`, backgroundColor: `${layer.color}10`, color: `${layer.color}cc` }}>
                        {e.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── KEY APPLICATIONS ── */}
        {knowledgeNode && knowledgeNode.applications.length > 0 && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
              KEY APPLICATIONS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {knowledgeNode.applications.map(app => (
                <div key={app} className="flex items-center gap-3 p-3 bg-black border border-white/8 rounded-sm">
                  <div className="w-0.5 h-6 rounded-full" style={{ backgroundColor: industryColor }} />
                  <span className="font-mono text-[9px] text-white/60 leading-tight">{app}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SIGNAL KEYWORDS ── */}
        <div className="space-y-3">
          <div className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
            PROCUREMENT SIGNAL KEYWORDS
          </div>
          <div className="flex flex-wrap gap-2">
            {tech.procurementSignalKeywords.map((kw) => (
              <span
                key={kw}
                className="font-mono text-[9px] tracking-wide px-2.5 py-1 rounded-sm bg-white/5 border border-white/8 text-white/50 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition-colors cursor-default"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* ── WHO USES IT ── */}
        {relatedVendors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
                WHO USES IT — EL PASO VENDORS
              </div>
              <span className="font-mono text-[9px] text-white/20">
                {relatedVendors.length} MATCHED
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {relatedVendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendor/${vendor.id}`}
                  className="group flex flex-col gap-2 p-3 rounded-sm bg-black border border-white/8 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] tracking-wide text-white/80 group-hover:text-[#00d4ff] transition-colors leading-tight">
                      {vendor.name}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[10px] tabular-nums"
                      style={{ color: '#ffd700' }}
                    >
                      {vendor.ikerScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] tracking-[0.15em] text-white/30 uppercase">
                      {vendor.category}
                    </span>
                    <span className="font-mono text-[8px] text-white/20 group-hover:text-[#00d4ff]/60 transition-colors">
                      IKER ›
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── RELATED TECHNOLOGIES ── */}
        {relatedTechs.length > 0 && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase">
              RELATED TECHNOLOGIES — {industryLabel.toUpperCase()}
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedTechs.map((related) => {
                const relatedMaturity = MATURITY_CONFIG[related.maturityLevel];
                return (
                  <Link
                    key={related.id}
                    href={`/technology/${related.id}`}
                    className="group flex items-center gap-2 px-3 py-2 rounded-sm bg-black border border-white/8 hover:border-white/20 hover:bg-white/5 transition-all duration-150"
                  >
                    <span
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: relatedMaturity.color,
                        boxShadow: `0 0 4px ${relatedMaturity.color}88`,
                      }}
                    />
                    <span className="font-mono text-[9px] tracking-wide text-white/50 group-hover:text-white/80 transition-colors">
                      {related.name.toUpperCase()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BACK TO INDUSTRY ── */}
        <div className="pt-4 border-t border-white/5">
          <Link
            href={`/industry/${industrySlug}`}
            className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff] transition-colors"
          >
            <span>←</span>
            <span>BACK TO {industryLabel.toUpperCase()} INDUSTRY</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
