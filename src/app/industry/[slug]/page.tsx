'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { PageTopBar } from '@/components/PageTopBar';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import { ProductCatalog } from '@/components/ProductCatalog';
import { CompanyCard } from '@/components/CompanyCard';
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

type ScanResult = {
  executive_summary?: string;
  products?: IndustryProduct[];
  funding_signals?: Array<{ company: string; stage: string; amount?: string }>;
  industry_areas?: Array<{ area: string; score: number }>;
  sources_discovered?: number;
  sources_scraped?: number;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustryDeepDivePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const industry = INDUSTRIES.find((i) => i.slug === slug);
  const story = industry ? INDUSTRY_STORIES[industry.slug] : undefined;

  // For custom industries: derive label from slug
  const isCustom = !industry;
  const label = industry?.label ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const color = industry?.color ?? '#00d4ff';

  const [products, setProducts] = useState<IndustryProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [signals, setSignals] = useState<IntelSignal[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Build data (only for known industries)
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

  // Fetch products + scan data (works for both known and custom industries)
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setProductsLoading(true);
    async function loadProducts() {
      try {
        const res = await fetch(`/api/industry/${slug}/products`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) {
          setProducts(data.scan?.products ?? []);
          setScanData(data.scan ?? null);
        }
      } catch { /* degrade */ }
      finally { if (!cancelled) setProductsLoading(false); }
    }
    void loadProducts();
    return () => { cancelled = true; };
  }, [slug]);

  // Fetch intel signals for this industry
  useEffect(() => {
    if (!slug) return;
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
  }, [slug]);

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
            .filter((a: { category?: string; title?: string }) => {
              const cat = (a.category ?? '').toLowerCase();
              const title = (a.title ?? '').toLowerCase();
              const searchTerm = label.toLowerCase().split('/')[0].trim();
              const catKey = industry?.category?.toLowerCase().split('/')[0].trim() ?? searchTerm;
              return cat.includes(searchTerm) || cat.includes(catKey) || title.includes(searchTerm);
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
          { label: label }
        ]}
        showLiveDot={true}
        rightSlot={
          <Link
            href={`/industry/${slug}/solve`}
            className="font-mono text-[8px] tracking-[0.2em] border rounded-sm px-2.5 py-1 transition-colors"
            style={{ borderColor: `${color}40`, color: `${color}cc` }}
          >
            PROBLEM SOLVER →
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-0">

        {/* ═══ 1. HERO — Industry name + executive summary ═══ */}
        <div className="pb-10 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[8px] tracking-[0.4em] text-white/25 uppercase mb-4">
                {story?.headline ?? label.toUpperCase()}
              </div>
              <h1
                className="text-[32px] font-semibold tracking-tight text-white/90 leading-tight mb-5"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {label}
              </h1>
              {(story?.summary || scanData?.executive_summary) && (
                <p className="font-mono text-[11px] text-white/40 leading-[1.9] max-w-2xl">
                  {story?.summary ?? scanData?.executive_summary}
                </p>
              )}
              {isCustom && !scanData && productsLoading && (
                <div className="font-mono text-[9px] text-white/20 tracking-wide mt-3 animate-pulse">
                  SCANNING INTELLIGENCE SOURCES...
                </div>
              )}
            </div>
            {/* Sector score — pill shape, no hard border box */}
            <div className="flex flex-col items-center gap-2 shrink-0 pt-2">
              <div
                className="rounded-full px-6 py-4 text-center"
                style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
              >
                <div
                  className="font-mono text-[32px] font-bold leading-none tracking-tight"
                  style={{ color: color, textShadow: `0 0 20px ${color}55` }}
                >
                  {sectorScore}
                </div>
              </div>
              <div className="font-mono text-[6px] tracking-[0.35em] text-white/20 uppercase">SECTOR SCORE</div>
            </div>
          </div>
        </div>

        {/* ═══ 2. STATS BAR ═══ */}
        <div className="grid grid-cols-5 border-b border-white/[0.06]">
          {[
            { label: 'TECHNOLOGIES', value: String(technologies.length), color: color },
            { label: 'LOCAL VENDORS', value: String(localVendors.length), color: '#ffb800' },
            { label: 'FY25 BUDGET', value: formatBudget(totalBudget), color: '#00ff88' },
            { label: 'PRODUCTS', value: productsLoading ? '···' : String(products.length), color: '#00d4ff' },
            { label: 'SIGNALS', value: String(signals.length), color: '#f97316' },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              className="group bg-black py-5 px-4 text-center transition-colors duration-200 hover:bg-white/[0.025] cursor-default"
              style={{ borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            >
              <div
                className="font-mono text-[22px] font-bold leading-none tracking-tight transition-all duration-200 group-hover:tracking-widest"
                style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}40` }}
              >
                {stat.value}
              </div>
              <div className="font-mono text-[7px] tracking-[0.3em] text-white/20 mt-2 group-hover:text-white/35 transition-colors duration-200">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ 3. WHAT'S HAPPENING NOW ═══ */}
        <Section title="WHAT'S HAPPENING NOW" color={color}>
          <div className="space-y-2.5">
            {story?.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
                <span className="font-mono text-[11px] text-white/50 leading-relaxed">{b}</span>
              </div>
            ))}
            {/* For custom industries: show industry areas from scan */}
            {isCustom && scanData?.industry_areas && scanData.industry_areas.length > 0 && (
              <div className="mt-3">
                <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-2">DETECTED AREAS</div>
                {scanData.industry_areas.filter(a => a.score > 0).map((area, i) => (
                  <div key={i} className="flex items-center gap-3 mb-1.5">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
                    <span className="font-mono text-[10px] text-white/45">{area.area}</span>
                    <div className="flex-1 h-[1px] bg-white/[0.04]" />
                    <span className="font-mono text-[9px] font-bold" style={{ color }}>{area.score}</span>
                  </div>
                ))}
              </div>
            )}
            {/* For custom industries: show funding signals */}
            {isCustom && scanData?.funding_signals && scanData.funding_signals.length > 0 && (
              <div className="mt-3">
                <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-2">FUNDING ACTIVITY</div>
                {scanData.funding_signals.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-start gap-3 mb-1">
                    <span className="font-mono text-[8px] text-[#00ff88]/60 shrink-0">$</span>
                    <span className="font-mono text-[10px] text-white/45">{f.company} — {f.stage}{f.amount ? ` (${f.amount})` : ''}</span>
                  </div>
                ))}
              </div>
            )}
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
        {localVendors.length > 0 && (
        <Section title="MAJOR PLAYERS" subtitle={`${localVendors.length} companies active in ${label.toLowerCase()}`} color="#ffb800">
          {([
            { label: 'ESTABLISHED LEADERS', vendors: establishedVendors, tierColor: '#00ff88' },
            { label: 'EMERGING VENDORS', vendors: emergingVendors, tierColor: '#00d4ff' },
            { label: 'SPECIALIZED / NICHE', vendors: specializedVendors, tierColor: '#ffb800' },
          ] as const).filter(t => t.vendors.length > 0).map(tier => (
            <div key={tier.label} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tier.tierColor }} />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white/25">{tier.label}</span>
                <span className="font-mono text-[8px] text-white/15">{tier.vendors.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tier.vendors.slice(0, 8).map((v) => (
                  <CompanyCard
                    key={v.id}
                    id={v.id}
                    name={v.name}
                    website={v.website}
                    category={v.category}
                    tags={v.tags}
                    ikerScore={v.ikerScore}
                    accentColor={tier.tierColor}
                  />
                ))}
              </div>
              {tier.vendors.length > 8 && (
                <Link
                  href={`/vendors?industry=${slug}`}
                  className="block text-center font-mono text-[8px] tracking-wider py-2 mt-2 text-white/15 hover:text-white/30 transition-colors"
                >
                  VIEW ALL {tier.vendors.length} →
                </Link>
              )}
            </div>
          ))}
        </Section>
        )}

        {/* ═══ 5. PRODUCTS & EQUIPMENT ═══ */}
        <Section
          title="PRODUCTS & EQUIPMENT"
          subtitle={productsLoading ? 'Scanning sources...' : `${products.length} products discovered`}
          color="#00d4ff"
        >
          <ProductCatalog products={products} accentColor={color} loading={productsLoading} />
        </Section>

        {/* ═══ 6. TECHNOLOGIES ═══ */}
        {technologies.length > 0 && (
        <Section title="TECHNOLOGIES" subtitle={`${technologies.length} tracked across maturity stages`} color={color}>
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
        )}

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
                style={{ borderColor: `${color}30`, color: `${color}90` }}
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
            <div className="space-y-[2px]">
              {signals.slice(0, 15).map((sig) => {
                const sigColor = signalTypeColor[sig.signal_type] ?? '#ffffff';
                return (
                  <div
                    key={sig.id}
                    className="flex items-center gap-3 py-2.5 pr-3 pl-4 hover:bg-white/[0.025] transition-colors relative"
                    style={{ borderLeft: `2px solid ${sigColor}30` }}
                  >
                    <span
                      className="font-mono text-[7px] tracking-[0.15em] shrink-0"
                      style={{ color: `${sigColor}99` }}
                    >
                      {signalTypeLabel[sig.signal_type] ?? sig.signal_type.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      {sig.url ? (
                        <a href={sig.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-white/40 hover:text-white/65 transition-colors truncate block">
                          {sig.title}
                        </a>
                      ) : (
                        <span className="font-mono text-[10px] text-white/40 truncate block">{sig.title}</span>
                      )}
                    </div>
                    {sig.company && (
                      <span className="font-mono text-[8px] text-white/20 shrink-0">{sig.company}</span>
                    )}
                    <span className="font-mono text-[8px] text-white/12 shrink-0">{sig.source}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ═══ 9. WHERE THE INDUSTRY IS HEADING ═══ */}
        {story?.outlook && (
          <Section title="WHERE THE INDUSTRY IS HEADING" color="#00ff88">
            <div className="border-l-2 pl-5 py-1" style={{ borderColor: `${color}40` }}>
              <p className="font-mono text-[11px] text-white/50 leading-[1.9]">
                {story.outlook}
              </p>
            </div>
          </Section>
        )}

        {/* ═══ 10. CONNECTED INDUSTRIES ═══ */}
        {!isCustom && (() => {
          // Find industries that share vendors or technologies with this one
          const otherIndustries = INDUSTRIES.filter(i => i.slug !== slug);
          const connections = otherIndustries
            .map(other => {
              const otherVendorCats = CATEGORY_TO_VENDOR_CATS[other.category] ?? [];
              const sharedVendors = allVendors.filter(v =>
                vendorCats.includes(v.category) && otherVendorCats.includes(v.category)
              ).length;
              const otherTechs = TECHNOLOGY_CATALOG.filter(t => t.category === other.category);
              const sharedKeywords = technologies.filter(t =>
                otherTechs.some(ot =>
                  t.name.toLowerCase().split(' ').some(w =>
                    w.length > 3 && ot.name.toLowerCase().includes(w)
                  )
                )
              ).length;
              const strength = sharedVendors * 2 + sharedKeywords;
              return { industry: other, strength, sharedVendors, sharedKeywords };
            })
            .filter(c => c.strength > 0)
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 4);

          if (connections.length === 0) return null;

          return (
            <Section title="CONNECTED INDUSTRIES" subtitle="Cross-industry relationships" color="#a855f7">
              <div className="grid grid-cols-2 gap-2">
                {connections.map(c => (
                  <Link
                    key={c.industry.slug}
                    href={`/industry/${c.industry.slug}`}
                    className="group flex items-center gap-3 p-3 border border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.02] transition-all"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.industry.color, boxShadow: `0 0 6px ${c.industry.color}60` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] text-white/55 group-hover:text-white/75 transition-colors uppercase truncate">
                        {c.industry.label}
                      </div>
                      <div className="font-mono text-[8px] text-white/20 mt-0.5">
                        {c.sharedVendors > 0 && <span>{c.sharedVendors} shared vendors</span>}
                        {c.sharedVendors > 0 && c.sharedKeywords > 0 && <span> · </span>}
                        {c.sharedKeywords > 0 && <span>{c.sharedKeywords} tech overlap</span>}
                      </div>
                    </div>
                    <span className="font-mono text-[8px] text-white/15 group-hover:text-[#a855f7]/50 transition-colors shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </Section>
          );
        })()}

        {/* ═══ 11. LATEST INTELLIGENCE FEED ═══ */}
        <Section title="LATEST INTELLIGENCE" subtitle="Live news and breakthroughs" color="#00ff88">
          <DiscoveryFeed items={feedItems} accentColor={color} loading={feedLoading} />
        </Section>

        {/* ═══ FOOTER ═══ */}
        <div className="flex flex-col items-center gap-5 py-10 border-t border-white/[0.05] mt-8">
          <span className="font-mono text-[8px] tracking-[0.4em] text-white/10 uppercase">NXT//LINK</span>
          <div className="flex items-center gap-6">
            <Link
              href={`/industry/${slug}/solve`}
              className="font-mono text-[8px] tracking-[0.2em] text-white/20 hover:text-white/45 transition-colors duration-200"
            >
              SOLVE A PROBLEM →
            </Link>
            <span className="text-white/8 select-none">·</span>
            <Link
              href="/vendors"
              className="font-mono text-[8px] tracking-[0.2em] text-white/20 hover:text-white/45 transition-colors duration-200"
            >
              BROWSE VENDORS →
            </Link>
          </div>
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
    <div className="mt-12 group/section">
      <div className="flex items-center gap-3 mb-5 opacity-60 hover:opacity-100 transition-opacity duration-300">
        <div
          className="w-[3px] h-4 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
        />
        <div>
          <h2 className="font-mono text-[9px] tracking-[0.35em] text-white/50 uppercase">{title}</h2>
          {subtitle && (
            <span className="font-mono text-[8px] tracking-wider text-white/20 mt-0.5 block">{subtitle}</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}


function formatBudget(budgetM: number): string {
  if (budgetM >= 1000) return `$${(budgetM / 1000).toFixed(1)}B`;
  return `$${Math.round(budgetM)}M`;
}
