'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { PageTopBar } from '@/components/PageTopBar';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import { ProductCatalog } from '@/components/ProductCatalog';
import DiscoveryFeed from '@/components/DiscoveryFeed';
import type { IndustryProduct } from '@/lib/intelligence/industry-scan';
import { timeAgo } from '@/lib/utils/format';

// ─── Vendor category mapping ─────────────────────────────────────────────────

const CATEGORY_TO_VENDOR_CATS: Record<string, string[]> = {
  'AI/ML':          ['AI / ML', 'IoT', 'Analytics', 'AI/R&D'],
  'Cybersecurity':  ['Cybersecurity'],
  'Defense':        ['Defense', 'Defense IT'],
  'Border Tech':    ['Border Tech'],
  'Manufacturing':  ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing', 'Robotics & Automation', 'Warehouse Automation'],
  'Energy':         ['Energy', 'Water Tech', 'Energy Tech'],
  'Healthcare':     ['Health Tech', 'Healthcare'],
  'Logistics':      ['Logistics', 'Warehousing', 'Trucking', 'Supply Chain Software'],
};

// ─── Industry → intel signal mapping ──────────────────────────────────────────

const SLUG_TO_SIGNAL_INDUSTRY: Record<string, string> = {
  'ai-ml': 'ai_ml',
  'cybersecurity': 'cybersecurity',
  'defense': 'aerospace_defense',
  'border-tech': 'construction',
  'manufacturing': 'manufacturing',
  'energy': 'energy',
  'healthcare': 'health_biotech',
  'logistics': 'supply_chain',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type IntelSignal = {
  id: string;
  signal_type: string;
  title: string;
  company: string | null;
  source: string | null;
  importance_score: number;
  discovered_at: string;
  url: string | null;
};

type FeedItem = {
  title: string;
  category: string;
  source: string;
  timeAgo: string;
  url?: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustryDeepDivePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const industry = INDUSTRIES.find((i) => i.slug === slug);
  const story = industry ? INDUSTRY_STORIES[industry.slug] : undefined;
  const [products, setProducts] = useState<IndustryProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [signals, setSignals] = useState<IntelSignal[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Build data
  const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
  const vendorCats = industry ? CATEGORY_TO_VENDOR_CATS[industry.category] ?? [] : [];
  const localVendors = allVendors.filter((v) => vendorCats.includes(v.category));

  const technologies = industry
    ? TECHNOLOGY_CATALOG.filter((t) => t.category === industry.category).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        maturityLevel: t.maturityLevel,
        relatedVendorCount: t.relatedVendorCount,
        elPasoRelevance: t.elPasoRelevance,
        governmentBudgetFY25M: t.governmentBudgetFY25M,
      }))
    : [];

  // Tier vendors
  const establishedVendors = localVendors.filter(v => v.ikerScore >= 70).sort((a, b) => b.ikerScore - a.ikerScore);
  const emergingVendors = localVendors.filter(v => v.ikerScore >= 45 && v.ikerScore < 70).sort((a, b) => b.ikerScore - a.ikerScore);
  const specializedVendors = localVendors.filter(v => v.ikerScore < 45).sort((a, b) => b.ikerScore - a.ikerScore);

  // Fetch products
  useEffect(() => {
    if (!industry) return;
    let cancelled = false;
    setProductsLoading(true);
    async function loadProducts() {
      try {
        const res = await fetch(`/api/industry/${slug}/products`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) setProducts(data.scan?.products ?? []);
      } catch { /* degrade */ }
      finally { if (!cancelled) setProductsLoading(false); }
    }
    void loadProducts();
    return () => { cancelled = true; };
  }, [slug, industry]);

  // Fetch intel signals for this industry
  useEffect(() => {
    if (!industry) return;
    let cancelled = false;
    async function loadSignals() {
      try {
        const sigIndustry = SLUG_TO_SIGNAL_INDUSTRY[slug] ?? '';
        if (!sigIndustry) return;
        const res = await fetch(`/api/agents/intel-signals?industry=${sigIndustry}&limit=20`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) setSignals(data.signals ?? []);
      } catch { /* degrade */ }
    }
    void loadSignals();
    return () => { cancelled = true; };
  }, [slug, industry]);

  // Fetch discovery feed
  useEffect(() => {
    let cancelled = false;
    async function loadFeed() {
      try {
        const res = await fetch('/api/feeds');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) {
          const items = (data.all ?? [])
            .filter((a: { category?: string }) => {
              if (!industry) return false;
              const cat = (a.category ?? '').toLowerCase();
              return cat.includes(industry.label.toLowerCase().split('/')[0].trim()) ||
                     cat.includes(industry.category.toLowerCase().split('/')[0].trim());
            })
            .slice(0, 12)
            .map((a: { title: string; category: string; source: string; pubDate: string; link?: string }) => ({
              title: a.title,
              category: a.category ?? industry?.label ?? '',
              source: a.source ?? '',
              timeAgo: timeAgo(a.pubDate),
              url: a.link,
            }));
          setFeedItems(items);
        }
      } catch { /* degrade */ }
      finally { if (!cancelled) setFeedLoading(false); }
    }
    void loadFeed();
    return () => { cancelled = true; };
  }, [industry]);

  // 404
  if (!industry) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="font-mono text-[10px] text-white/30 tracking-[0.3em]">INDUSTRY NOT FOUND</div>
          <Link href="/industries" className="font-mono text-[9px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors">
            ← BACK TO INDUSTRIES
          </Link>
        </div>
      </div>
    );
  }

  const totalBudget = technologies.reduce((sum, t) => sum + (t.governmentBudgetFY25M ?? 0), 0);

  const sectorScore = technologies.length === 0 ? 0 : Math.min(100, Math.round(
    technologies.reduce((sum, t) => {
      const m = t.maturityLevel === 'mature' ? 3 : t.maturityLevel === 'growing' ? 2 : 1;
      const r = t.elPasoRelevance === 'high' ? 3 : t.elPasoRelevance === 'medium' ? 2 : 1;
      return sum + m * r;
    }, 0) / (technologies.length * 9) * 100
  ));

  // Signal type labels
  const signalTypeLabel: Record<string, string> = {
    patent_filing: 'PATENT', research_paper: 'RESEARCH', case_study: 'CASE STUDY',
    hiring_signal: 'HIRING', funding_round: 'FUNDING', merger_acquisition: 'M&A',
    contract_award: 'CONTRACT', product_launch: 'LAUNCH', regulatory_action: 'REGULATORY',
    facility_expansion: 'EXPANSION',
  };
  const signalTypeColor: Record<string, string> = {
    patent_filing: '#ffb800', research_paper: '#00d4ff', funding_round: '#00ff88',
    merger_acquisition: '#f97316', contract_award: '#ffd700', product_launch: '#00d4ff',
    hiring_signal: '#a855f7', regulatory_action: '#ff3b30', facility_expansion: '#00ff88',
    case_study: '#ffb800',
  };

  return (
    <div className="bg-black min-h-screen">
      <PageTopBar
        backHref="/industries"
        backLabel="EXPLORE"
        breadcrumbs={[
          { label: 'INDUSTRIES', href: '/industries' },
          { label: industry.label }
        ]}
        showLiveDot={true}
        rightSlot={
          <Link
            href={`/industry/${slug}/solve`}
            className="font-mono text-[8px] tracking-[0.2em] border rounded-sm px-2.5 py-1 transition-colors"
            style={{ borderColor: `${industry.color}40`, color: `${industry.color}cc` }}
          >
            PROBLEM SOLVER →
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-0">

        {/* ═══ 1. HERO — Industry name + executive summary ═══ */}
        <div className="pb-8 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[8px] tracking-[0.4em] text-white/20 uppercase mb-3">
                INTELLIGENCE BRIEFING
              </div>
              <h1
                className="text-[28px] font-semibold tracking-tight text-white/90 leading-tight mb-1"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {industry.label}
              </h1>
              <div className="font-mono text-[10px] text-white/30 tracking-wide mb-5">
                {story?.headline}
              </div>
              {story?.summary && (
                <p className="font-mono text-[11px] text-white/45 leading-[1.8] max-w-3xl">
                  {story.summary}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="border border-white/[0.08] px-5 py-3 text-center bg-white/[0.02]">
                <div
                  className="font-mono text-[28px] font-bold leading-none"
                  style={{ color: industry.color, textShadow: `0 0 14px ${industry.color}60` }}
                >
                  {sectorScore}
                </div>
                <div className="font-mono text-[6px] tracking-[0.3em] text-white/20 mt-1.5">SECTOR SCORE</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 2. STATS BAR ═══ */}
        <div className="grid grid-cols-5 gap-[1px] bg-white/[0.03] border-b border-white/[0.06]">
          {[
            { label: 'TECHNOLOGIES', value: String(technologies.length), color: industry.color },
            { label: 'LOCAL VENDORS', value: String(localVendors.length), color: '#ffb800' },
            { label: 'FY25 BUDGET', value: formatBudget(totalBudget), color: '#00ff88' },
            { label: 'PRODUCTS', value: productsLoading ? '···' : String(products.length), color: '#00d4ff' },
            { label: 'SIGNALS', value: String(signals.length), color: '#f97316' },
          ].map((stat) => (
            <div key={stat.label} className="bg-black py-4 px-4 text-center">
              <div
                className="font-mono text-[20px] font-bold leading-none"
                style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}50` }}
              >
                {stat.value}
              </div>
              <div className="font-mono text-[7px] tracking-[0.25em] text-white/20 mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ 3. WHAT'S HAPPENING NOW ═══ */}
        <Section title="WHAT'S HAPPENING NOW" color={industry.color}>
          <div className="space-y-2.5">
            {story?.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: industry.color, opacity: 0.6 }} />
                <span className="font-mono text-[11px] text-white/50 leading-relaxed">{b}</span>
              </div>
            ))}
          </div>
          {feedItems.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/[0.04]">
              <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-3">RECENT HEADLINES</div>
              <div className="space-y-2">
                {feedItems.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-mono text-[8px] text-white/15 shrink-0 mt-0.5">{item.timeAgo}</span>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-white/40 hover:text-white/60 transition-colors leading-snug truncate">
                        {item.title}
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-white/40 leading-snug truncate">{item.title}</span>
                    )}
                    <span className="font-mono text-[7px] text-white/15 shrink-0">{item.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ═══ 4. MAJOR PLAYERS ═══ */}
        <Section title="MAJOR PLAYERS" subtitle={`${localVendors.length} companies active in ${industry.label.toLowerCase()}`} color="#ffb800">
          {localVendors.length === 0 ? (
            <div className="py-6 text-center">
              <span className="font-mono text-[9px] text-white/15">No local vendors mapped to this sector yet.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {establishedVendors.length > 0 && (
                <VendorTier label="ESTABLISHED LEADERS" vendors={establishedVendors} color="#00ff88" slug={slug} />
              )}
              {emergingVendors.length > 0 && (
                <VendorTier label="EMERGING VENDORS" vendors={emergingVendors} color="#00d4ff" slug={slug} />
              )}
              {specializedVendors.length > 0 && (
                <VendorTier label="SPECIALIZED / NICHE" vendors={specializedVendors} color="#ffb800" slug={slug} />
              )}
            </div>
          )}
        </Section>

        {/* ═══ 5. PRODUCTS & EQUIPMENT ═══ */}
        <Section
          title="PRODUCTS & EQUIPMENT"
          subtitle={productsLoading ? 'Scanning sources...' : `${products.length} products discovered`}
          color="#00d4ff"
        >
          <ProductCatalog products={products} accentColor={industry.color} loading={productsLoading} />
        </Section>

        {/* ═══ 6. TECHNOLOGIES ═══ */}
        <Section title="TECHNOLOGIES" subtitle={`${technologies.length} tracked across maturity stages`} color={industry.color}>
          <div className="grid grid-cols-3 gap-[1px] bg-white/[0.03]">
            {(['emerging', 'growing', 'mature'] as const).map(stage => {
              const techs = technologies.filter(t => t.maturityLevel === stage);
              const stageColor = stage === 'emerging' ? '#f97316' : stage === 'growing' ? '#00d4ff' : '#00ff88';
              return (
                <div key={stage} className="bg-black p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageColor }} />
                    <span className="font-mono text-[8px] tracking-[0.25em] text-white/30 uppercase">{stage}</span>
                    <span className="font-mono text-[8px] text-white/15 ml-auto">{techs.length}</span>
                  </div>
                  <div className="space-y-2">
                    {techs.map(t => (
                      <Link key={t.id} href={`/technology/${t.id}`} className="block group">
                        <div className="font-mono text-[10px] text-white/50 group-hover:text-white/70 transition-colors">{t.name}</div>
                        <div className="font-mono text-[8px] text-white/20 leading-snug mt-0.5">{t.description.slice(0, 80)}</div>
                      </Link>
                    ))}
                    {techs.length === 0 && (
                      <span className="font-mono text-[8px] text-white/10">None tracked</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══ 7. PROBLEMS BEING SOLVED ═══ */}
        {story?.problems && story.problems.length > 0 && (
          <Section title="PROBLEMS BEING SOLVED" color="#ff3b30">
            <div className="grid grid-cols-2 gap-3">
              {story.problems.map((problem, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border border-white/[0.04] bg-white/[0.01]">
                  <div className="font-mono text-[10px] text-[#ff3b30]/40 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</div>
                  <span className="font-mono text-[10px] text-white/45 leading-relaxed">{problem}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href={`/industry/${slug}/solve`}
                className="inline-block font-mono text-[8px] tracking-[0.2em] border rounded-sm px-4 py-2 transition-colors"
                style={{ borderColor: `${industry.color}30`, color: `${industry.color}90` }}
              >
                SOLVE A PROBLEM →
              </Link>
            </div>
          </Section>
        )}

        {/* ═══ 8. SIGNALS & EVIDENCE ═══ */}
        <Section title="SIGNALS & EVIDENCE" subtitle="Recent intelligence from patents, funding, hiring, contracts" color="#ffb800">
          {signals.length === 0 ? (
            <div className="py-6 text-center">
              <span className="font-mono text-[9px] text-white/15">No signals collected yet. Data accumulates over time.</span>
            </div>
          ) : (
            <div className="space-y-1">
              {signals.slice(0, 15).map((sig) => (
                <div key={sig.id} className="flex items-center gap-3 py-2 px-3 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <span
                    className="font-mono text-[7px] tracking-[0.15em] px-1.5 py-0.5 border shrink-0"
                    style={{
                      color: signalTypeColor[sig.signal_type] ?? '#fff',
                      borderColor: `${signalTypeColor[sig.signal_type] ?? '#fff'}30`,
                      opacity: 0.7,
                    }}
                  >
                    {signalTypeLabel[sig.signal_type] ?? sig.signal_type.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    {sig.url ? (
                      <a href={sig.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-white/45 hover:text-white/65 transition-colors truncate block">
                        {sig.title}
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-white/45 truncate block">{sig.title}</span>
                    )}
                  </div>
                  {sig.company && (
                    <span className="font-mono text-[8px] text-white/20 shrink-0">{sig.company}</span>
                  )}
                  <span className="font-mono text-[8px] text-white/15 shrink-0">{sig.source}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 9. WHERE THE INDUSTRY IS HEADING ═══ */}
        {story?.outlook && (
          <Section title="WHERE THE INDUSTRY IS HEADING" color="#00ff88">
            <div className="border-l-2 pl-5 py-1" style={{ borderColor: `${industry.color}40` }}>
              <p className="font-mono text-[11px] text-white/50 leading-[1.9]">
                {story.outlook}
              </p>
            </div>
          </Section>
        )}

        {/* ═══ 10. LATEST INTELLIGENCE FEED ═══ */}
        <Section title="LATEST INTELLIGENCE" subtitle="Live news and breakthroughs" color="#00ff88">
          <DiscoveryFeed items={feedItems} accentColor={industry.color} loading={feedLoading} />
        </Section>

        {/* ═══ FOOTER ═══ */}
        <div className="flex items-center justify-between py-6 border-t border-white/[0.06] mt-8">
          <Link
            href={`/industry/${slug}/solve`}
            className="font-mono text-[8px] tracking-[0.2em] transition-colors hover:opacity-80"
            style={{ color: `${industry.color}cc` }}
          >
            SOLVE A PROBLEM →
          </Link>
          <span className="font-mono text-[7px] text-white/10 tracking-[0.25em]">NXT//LINK — {industry.label.toUpperCase()} INTELLIGENCE</span>
          <Link
            href="/vendors"
            className="font-mono text-[8px] tracking-[0.2em] text-[#ffb800]/60 hover:text-[#ffb800] transition-colors"
          >
            BROWSE VENDORS →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Section Component ──────────────────────────────────────────────

function Section({ title, subtitle, color, children }: {
  title: string;
  subtitle?: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-[3px] h-5 shrink-0"
          style={{ backgroundColor: `${color}60`, boxShadow: `0 0 8px ${color}40` }}
        />
        <div>
          <h2 className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">{title}</h2>
          {subtitle && (
            <span className="font-mono text-[8px] tracking-wider text-white/20">{subtitle}</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Vendor Tier Component ──────────────────────────────────────────────────

function VendorTier({ label, vendors, color, slug }: {
  label: string;
  vendors: VendorRecord[];
  color: string;
  slug: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25">{label}</span>
        <span className="font-mono text-[8px] text-white/15">{vendors.length}</span>
      </div>
      <div className="border border-white/[0.04]">
        {vendors.slice(0, 8).map((v) => (
          <Link
            key={v.id}
            href={`/vendor/${v.id}`}
            className="flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.03] transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[11px] text-white/55 group-hover:text-white/75 transition-colors truncate">{v.name}</div>
              {v.tags.length > 0 && (
                <div className="flex gap-1.5 mt-0.5">
                  {v.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="font-mono text-[7px] tracking-wider text-white/20">{tag.toUpperCase()}</span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-mono text-[8px] text-white/20 shrink-0">{v.category}</span>
            <span
              className="font-mono text-[10px] font-bold shrink-0"
              style={{ color, textShadow: `0 0 6px ${color}60` }}
            >
              {v.ikerScore}
            </span>
            <span className="font-mono text-[8px] text-white/15 group-hover:text-white/30 transition-colors">→</span>
          </Link>
        ))}
      </div>
      {vendors.length > 8 && (
        <Link
          href={`/vendors?industry=${slug}`}
          className="block text-center font-mono text-[8px] tracking-wider py-2 text-white/15 hover:text-white/30 transition-colors"
        >
          VIEW ALL {vendors.length} →
        </Link>
      )}
    </div>
  );
}

function formatBudget(budgetM: number): string {
  if (budgetM >= 1000) return `$${(budgetM / 1000).toFixed(1)}B`;
  return `$${Math.round(budgetM)}M`;
}
