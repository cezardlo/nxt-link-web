'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const BubbleMap = dynamic(
  () => import('@/components/BubbleMap').then(m => ({ default: m.BubbleMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] flex items-center justify-center bg-black border border-white/[0.08] rounded-sm">
        <span className="font-mono text-[8px] text-white/20 tracking-[0.2em]">LOADING MAP···</span>
      </div>
    ),
  }
);
import { PageTopBar } from '@/components/PageTopBar';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import { IndustryTimeline } from '@/components/IndustryTimeline';
import { ProductCatalog } from '@/components/ProductCatalog';
import { TechRadar } from '@/components/TechRadar';
import TechJourney from '@/components/TechJourney';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineTech = {
  id: string;
  name: string;
  description: string;
  maturityLevel: 'emerging' | 'growing' | 'mature';
  relatedVendorCount: number;
  elPasoRelevance: 'high' | 'medium' | 'low';
  governmentBudgetFY25M?: number;
  localVendorCount?: number;
};

type Explanation = {
  what: string;
  why: string;
  who: string[];
  analogy: string;
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
  const router = useRouter();

  const industry = INDUSTRIES.find((i) => i.slug === slug);
  const story = industry ? INDUSTRY_STORIES[industry.slug] : undefined;
  const [products, setProducts] = useState<IndustryProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Build data
  const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
  const vendorCats = industry ? CATEGORY_TO_VENDOR_CATS[industry.category] ?? [] : [];
  const localVendors = allVendors.filter((v) => vendorCats.includes(v.category));

  const technologies: TimelineTech[] = industry
    ? TECHNOLOGY_CATALOG.filter((t) => t.category === industry.category).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        maturityLevel: t.maturityLevel,
        relatedVendorCount: t.relatedVendorCount,
        elPasoRelevance: t.elPasoRelevance,
        governmentBudgetFY25M: t.governmentBudgetFY25M,
        localVendorCount: localVendors.filter((v) =>
          t.procurementSignalKeywords.some((kw) =>
            v.tags.some((tag) => tag.toLowerCase().includes(kw.split(' ')[0].toLowerCase()))
          ) || v.description.toLowerCase().includes(t.name.toLowerCase().split(' ')[0])
        ).length,
      }))
    : [];

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
            .slice(0, 15)
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

  // Explain Simply
  const handleExplain = useCallback(async () => {
    if (!industry || explainLoading) return;
    setExplainLoading(true);
    try {
      const res = await fetch('/api/industry/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: industry.label, industry: industry.label }),
      });
      const data = await res.json();
      if (data.ok) setExplanation(data.explanation);
    } catch { /* degrade */ }
    finally { setExplainLoading(false); }
  }, [industry, explainLoading]);

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

  // Compute a sector activity score 0–100 from maturity + relevance of tracked technologies
  const sectorScore = technologies.length === 0 ? 0 : Math.min(100, Math.round(
    technologies.reduce((sum, t) => {
      const m = t.maturityLevel === 'mature' ? 3 : t.maturityLevel === 'growing' ? 2 : 1;
      const r = t.elPasoRelevance === 'high' ? 3 : t.elPasoRelevance === 'medium' ? 2 : 1;
      return sum + m * r;
    }, 0) / (technologies.length * 9) * 100
  ));

  const stats = [
    { label: 'TECHNOLOGIES', value: String(technologies.length), color: industry.color },
    { label: 'LOCAL VENDORS', value: String(localVendors.length), color: '#ffb800' },
    { label: 'FY25 GOV BUDGET', value: formatBudget(totalBudget), color: '#00ff88' },
    { label: 'PRODUCTS FOUND', value: productsLoading ? '···' : String(products.length), color: '#00d4ff' },
  ];

  return (
    <div className="bg-black min-h-screen grid-pattern">
      <PageTopBar
        backHref="/industries"
        backLabel="EXPLORE"
        breadcrumbs={[
          { label: 'INDUSTRIES', href: '/industries' },
          { label: industry.label }
        ]}
        showLiveDot={true}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExplain}
              disabled={explainLoading}
              className="font-mono text-[8px] tracking-[0.2em] border border-white/8 rounded-sm px-2.5 py-1 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              {explainLoading ? 'THINKING...' : 'EXPLAIN SIMPLY'}
            </button>
            <Link
              href={`/industry/${slug}/solve`}
              className="font-mono text-[8px] tracking-[0.2em] border rounded-sm px-2.5 py-1 transition-colors"
              style={{ borderColor: `${industry.color}40`, color: `${industry.color}cc` }}
            >
              PROBLEM SOLVER →
            </Link>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-0">

        {/* ── Hero: headline + score badge ──────────────────────────────────── */}
        <div className="border-b border-white/[0.04] pb-6 mb-0">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase mb-2">
                {industry.label} SECTOR
              </div>
              <h1 className="font-mono text-[22px] tracking-[0.05em] text-white/90 font-medium leading-snug">
                {story?.headline ?? `${industry.label} Intelligence Dossier`}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="border border-white/[0.08] px-4 py-2.5 text-center">
                <div
                  className="font-mono text-[24px] font-bold leading-none"
                  style={{ color: industry.color, textShadow: `0 0 12px ${industry.color}80` }}
                >
                  {sectorScore}
                </div>
                <div className="font-mono text-[6px] tracking-[0.25em] text-white/15 mt-1">ACTIVITY</div>
              </div>
            </div>
          </div>

          {/* Key facts as horizontal strip */}
          {story && story.bullets.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mt-5">
              {story.bullets.slice(0, 4).map((b, i) => (
                <span key={i} className="font-mono text-[9px] text-white/35">› {b}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-[1px] bg-white/[0.03] mb-0 border-b border-white/[0.04]">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-black py-4 px-5 text-center">
              <div
                className="font-mono text-[22px] font-bold leading-none"
                style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}60` }}
              >
                {stat.value}
              </div>
              <div className="font-mono text-[8px] tracking-[0.25em] text-white/25 mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Explain Simply result ──────────────────────────────────────────── */}
        {explanation && (
          <>
            <SectionHeader title="EXPLAINED SIMPLY" color={industry.color} />
            <div className="border border-white/[0.06] p-5 bg-black mb-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-1.5">WHAT IS IT</div>
                  <p className="font-mono text-[9px] text-white/40 leading-relaxed">{explanation.what}</p>
                </div>
                <div>
                  <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-1.5">WHY IT MATTERS</div>
                  <p className="font-mono text-[9px] text-white/40 leading-relaxed">{explanation.why}</p>
                </div>
                <div>
                  <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-1.5">WHO USES IT</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {explanation.who.map((w) => (
                      <span key={w} className="font-mono text-[8px] px-2 py-0.5 border border-white/[0.06] text-white/30">{w}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-1.5">THINK OF IT LIKE</div>
                  <p className="font-mono text-[9px] text-white/40 leading-relaxed italic">{explanation.analogy}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Two-column: Radar + Tech Map ───────────────────────────────────── */}
        <SectionHeader title="TECHNOLOGY RADAR" color={industry.color} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-white/[0.03] mb-0">
          <div className="bg-black p-0">
            <TechRadar technologies={technologies} accentColor={industry.color} />
          </div>
          <div className="bg-black p-5">
            <div className="font-mono text-[7px] tracking-[0.3em] text-white/15 mb-4">
              INTERACTIVE MAP — CLICK TO EXPLORE
            </div>
            <BubbleMap
              technologies={technologies}
              accentColor={industry.color}
              onTechClick={(techId) => router.push(`/technology/${techId}`)}
            />
          </div>
        </div>

        {/* ── Technology Journey ─────────────────────────────────────────────── */}
        {story && story.journey.length > 0 && (
          <>
            <SectionHeader title="TECHNOLOGY JOURNEY" subtitle={`How ${industry.label.toLowerCase()} evolved over time`} color="#ffb800" />
            <TechJourney entries={story.journey} accentColor={industry.color} industryLabel={industry.label} />
          </>
        )}

        {/* ── Technology Landscape ───────────────────────────────────────────── */}
        <SectionHeader
          title="TRACKED TECHNOLOGIES"
          subtitle={`${technologies.length} technologies across maturity stages`}
          color={industry.color}
        />
        <IndustryTimeline technologies={technologies} accentColor={industry.color} />

        {/* ── Products Available ─────────────────────────────────────────────── */}
        <SectionHeader
          title="PRODUCTS AVAILABLE"
          subtitle={productsLoading ? 'Scanning sources...' : `${products.length} products from web intelligence`}
          color="#00d4ff"
        />
        <ProductCatalog products={products} accentColor={industry.color} loading={productsLoading} />

        {/* ── Who Is Using It ────────────────────────────────────────────────── */}
        <div id="who-uses-it">
          <SectionHeader
            title="LOCAL VENDORS"
            subtitle={`${localVendors.length} El Paso companies active in ${industry.label.toLowerCase()}`}
            color="#ffb800"
          />
          <VendorList vendors={localVendors} accentColor={industry.color} slug={slug} technologies={technologies} />
        </div>

        {/* ── Discovery Feed ─────────────────────────────────────────────────── */}
        <SectionHeader
          title="LATEST INTELLIGENCE"
          subtitle={`Recent news and breakthroughs in ${industry.label.toLowerCase()}`}
          color="#00ff88"
        />
        <DiscoveryFeed items={feedItems} accentColor={industry.color} loading={feedLoading} />

        {/* ── CTA strip ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-4 border-t border-white/[0.04] mt-8">
          <Link
            href={`/industry/${slug}/solve`}
            className="font-mono text-[8px] tracking-[0.2em] transition-colors hover:opacity-80"
            style={{ color: `${industry.color}cc` }}
          >
            SOLVE A PROBLEM →
          </Link>
          <span className="font-mono text-[7px] text-white/10 tracking-widest">NXT LINK — {industry.label.toUpperCase()}</span>
          <Link
            href="/vendors"
            className="font-mono text-[8px] tracking-[0.2em] text-[#ffb800]/60 hover:text-[#ffb800] transition-colors"
          >
            BROWSE VENDORS →
          </Link>
        </div>

        {/* Footer count strip */}
        <div className="pb-6 flex items-center justify-center">
          <span className="font-mono text-[7px] text-white/10">
            {technologies.length} tech · {localVendors.length} vendors · {products.length} products
          </span>
        </div>

      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, color }: { title: string; subtitle?: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-0 mt-8 pt-5 border-t border-white/[0.04]">
      <div
        className="w-[3px] h-5 shrink-0"
        style={{ backgroundColor: `${color}70`, boxShadow: `0 0 6px ${color}60` }}
      />
      <div className="flex flex-col gap-0.5">
        <h2 className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">{title}</h2>
        {subtitle && (
          <span className="font-mono text-[8px] tracking-wider text-white/25">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

function VendorList({ vendors, accentColor, slug, technologies }: { vendors: VendorRecord[]; accentColor: string; slug: string; technologies: TimelineTech[] }) {
  const sorted = [...vendors].sort((a, b) => b.ikerScore - a.ikerScore);

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center border border-white/[0.03]">
        <span className="font-mono text-[9px] text-white/15">No local vendors mapped to this sector.</span>
      </div>
    );
  }

  const gradeColor = (score: number) => {
    if (score >= 80) return '#00ff88';
    if (score >= 65) return '#00d4ff';
    if (score >= 50) return '#ffb800';
    if (score >= 35) return '#f97316';
    return '#ff3b30';
  };

  const techMatchCount = (v: VendorRecord): number => {
    const tagSet = new Set(v.tags.map((t) => t.toLowerCase()));
    return technologies.filter((tech) =>
      tech.name.split(/\s+/).some((word) => word.length > 3 && tagSet.has(word.toLowerCase())) ||
      v.tags.some((tag) => tech.name.toLowerCase().includes(tag.toLowerCase()))
    ).length;
  };

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border border-white/[0.04] bg-white/[0.01]">
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25">VENDOR</span>
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25">CATEGORY</span>
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25 text-right">TECH MATCH</span>
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25 text-right">IKER</span>
      </div>

      <div className="border-x border-b border-white/[0.04]">
        {sorted.slice(0, 12).map((v) => {
          const matches = techMatchCount(v);
          return (
            <Link
              key={v.id}
              href={`/vendor/${v.id}`}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.04] transition-colors group"
            >
              {/* Name + dot */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-white/60 truncate group-hover:text-white/80 transition-colors">{v.name}</div>
                  {v.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {v.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="font-mono text-[7px] tracking-wider text-white/25">{tag.toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category */}
              <span className="font-mono text-[8px] text-white/20 tracking-wider shrink-0">{v.category}</span>

              {/* Tech match */}
              <span className="font-mono text-[9px] text-right shrink-0" style={{ color: matches > 0 ? `${accentColor}80` : 'transparent' }}>
                {matches > 0 ? `${matches}×` : '—'}
              </span>

              {/* IKER + arrow */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color: gradeColor(v.ikerScore), textShadow: `0 0 6px ${gradeColor(v.ikerScore)}80` }}
                >
                  {v.ikerScore}
                </span>
                <span className="font-mono text-[8px] text-white/15 group-hover:text-white/30 transition-colors">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {sorted.length > 12 && (
        <Link
          href={`/vendors?industry=${slug}`}
          className="block text-center font-mono text-[8px] tracking-wider py-3 border border-t-0 border-white/[0.04] text-white/20 hover:text-white/40 transition-colors"
        >
          VIEW ALL {sorted.length} VENDORS →
        </Link>
      )}
    </div>
  );
}

function formatBudget(budgetM: number): string {
  if (budgetM >= 1000) return `$${(budgetM / 1000).toFixed(1)}B`;
  return `$${Math.round(budgetM)}M`;
}
