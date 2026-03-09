'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { PageTopBar } from '@/components/PageTopBar';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import { ProductCatalog } from '@/components/ProductCatalog';
import { CompanyCard } from '@/components/CompanyCard';
import DiscoveryFeed from '@/components/DiscoveryFeed';
import type { IndustryProduct } from '@/lib/intelligence/industry-scan';
import { timeAgo, fmtDate } from '@/lib/utils/format';
import { SignalBadge } from '@/components/SignalBadge';
import { CompanyTooltip } from '@/components/CompanyTooltip';

import type { IndustryProfile, TimelineEvent, OpportunityEntry } from '@/lib/engines/industry-profile';
import type { AdoptionProfile } from '@/lib/agents/scoring/adoption-curve';
import type { TrajectoryForecast, RiskAlert, ConvergencePrediction } from '@/lib/engines/prediction-engine';
import type { PorterForce } from '@/lib/engines/strategic-frameworks';
import type { ValueChainTier } from '@/lib/engines/value-chain-engine';
import type { DiscoveredOpportunity } from '@/lib/engines/opportunity-engine';

const IndustryEcosystemGraph = dynamic(
  () => import('@/components/IndustryEcosystemGraph').then(m => ({ default: m.IndustryEcosystemGraph })),
  { ssr: false }
);

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

type IndustryInsight = {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  companies: string[];
  color: string;
  momentum: string;
};

type ScanResult = {
  executive_summary?: string;
  products?: IndustryProduct[];
  funding_signals?: Array<{ company: string; stage: string; amount?: string }>;
  industry_areas?: Array<{ area: string; score: number }>;
  sources_discovered?: number;
  sources_scraped?: number;
};

// ─── Signal type colors ──────────────────────────────────────────────────────

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  patent_filing: '#ffb800', research_paper: '#00d4ff', funding_round: '#00ff88',
  merger_acquisition: '#f97316', contract_award: '#ffd700', product_launch: '#00d4ff',
  hiring_signal: '#a855f7', regulatory_action: '#ff3b30', facility_expansion: '#00ff88',
  case_study: '#ffb800',
};

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  patent_filing: 'PATENT', research_paper: 'RESEARCH', funding_round: 'FUNDING',
  merger_acquisition: 'M&A', contract_award: 'CONTRACT', product_launch: 'PRODUCT',
  hiring_signal: 'HIRING', regulatory_action: 'REGULATORY', facility_expansion: 'EXPANSION',
  case_study: 'CASE STUDY',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustryDeepDivePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const industry = INDUSTRIES.find((i) => i.slug === slug);
  const story = industry ? INDUSTRY_STORIES[industry.slug] : undefined;

  const isCustom = !industry;
  const label = industry?.label ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const color = industry?.color ?? '#00d4ff';

  // ── State ──
  const [products, setProducts] = useState<IndustryProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [signals, setSignals] = useState<IntelSignal[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [industryInsights, setIndustryInsights] = useState<IndustryInsight[]>([]);
  const [profile, setProfile] = useState<IndustryProfile | null>(null);
  const [, setProfileLoading] = useState(true);
  const [trajectory, setTrajectory] = useState<TrajectoryForecast | null>(null);
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [convergences, setConvergences] = useState<ConvergencePrediction[]>([]);
  const [engineOpportunities, setEngineOpportunities] = useState<DiscoveredOpportunity[]>([]);

  // Build static data (only for known industries)
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

  const findVendor = (companyName: string) => {
    const lower = companyName.toLowerCase();
    return Object.values(EL_PASO_VENDORS).find(v =>
      v.name.toLowerCase().includes(lower) || lower.includes(v.name.toLowerCase())
    );
  };

  const establishedVendors = localVendors.filter(v => v.ikerScore >= 70).sort((a, b) => b.ikerScore - a.ikerScore);
  const emergingVendors = localVendors.filter(v => v.ikerScore >= 45 && v.ikerScore < 70).sort((a, b) => b.ikerScore - a.ikerScore);
  const specializedVendors = localVendors.filter(v => v.ikerScore < 45).sort((a, b) => b.ikerScore - a.ikerScore);

  // ── Fetch profile (8-block data) ──
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch(`/api/industry/${slug}/profile`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) setProfile(data.data);
      } catch { /* degrade */ }
      finally { if (!cancelled) setProfileLoading(false); }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Fetch products + scan data ──
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

  // ── Fetch intel signals ──
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

  // ── Fetch industry insights ──
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function loadInsights() {
      try {
        const industryKey = SLUG_TO_SIGNAL_INDUSTRY[slug];
        if (!industryKey) return;
        const res = await fetch(`/api/insights?industry=${industryKey}&limit=4`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) setIndustryInsights(data.insights ?? []);
      } catch { /* degrade */ }
    }
    void loadInsights();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Fetch predictions ──
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function loadPredictions() {
      try {
        const res = await fetch('/api/predictions');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const report = data.data;
        // Find trajectory for this industry
        const industryKey = SLUG_TO_SIGNAL_INDUSTRY[slug] ?? slug;
        const t = report.trajectories?.find((tr: TrajectoryForecast) =>
          tr.slug === slug || tr.industry === industryKey || tr.slug === industryKey
        ) ?? null;
        if (t) setTrajectory(t);
        // Find risks for this industry
        const r = (report.risks ?? []).filter((ri: RiskAlert) =>
          ri.slug === slug || ri.industry === industryKey || ri.slug === industryKey
        );
        setRisks(r);
        // Find convergences involving this industry
        const c = (report.convergences ?? []).filter((cv: ConvergencePrediction) =>
          cv.industries.some((ind: string) => ind === industryKey || ind === slug)
        );
        setConvergences(c);
      } catch { /* degrade gracefully */ }
    }
    void loadPredictions();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Fetch opportunity engine ──
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function loadOpportunities() {
      try {
        const res = await fetch('/api/opportunities');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const industryKey = SLUG_TO_SIGNAL_INDUSTRY[slug] ?? slug;
        const opps = (data.data.opportunities ?? []).filter((o: DiscoveredOpportunity) =>
          o.industries.some((ind: string) => ind === industryKey || ind === slug)
        );
        setEngineOpportunities(opps);
      } catch { /* degrade */ }
    }
    void loadOpportunities();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Fetch discovery feed ──
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

  const [level, setLevel] = useState<'understand' | 'explore' | 'analyze'>('understand');

  const totalBudget = technologies.reduce((sum, t) => sum + (t.governmentBudgetFY25M ?? 0), 0);

  const sectorScore = technologies.length === 0 ? 0 : Math.min(100, Math.round(
    technologies.reduce((sum, t) => {
      const m = t.maturityLevel === 'mature' ? 3 : t.maturityLevel === 'growing' ? 2 : 1;
      const r = t.elPasoRelevance === 'high' ? 3 : t.elPasoRelevance === 'medium' ? 2 : 1;
      return sum + m * r;
    }, 0) / (technologies.length * 9) * 100
  ));

  // Use profile adoption data when available
  const adoption = profile?.blocks.adoption ?? null;
  const timeline = profile?.blocks.timeline ?? [];
  const opportunities = profile?.blocks.opportunities ?? [];

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
              {/* Snapshot badge row */}
              {adoption && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-[7px] tracking-[0.2em] px-2 py-0.5 rounded-sm border"
                    style={{ borderColor: `${color}30`, color: `${color}aa` }}>
                    {adoption.stage_label.toUpperCase()}
                  </span>
                  <span className="font-mono text-[7px] tracking-[0.2em] px-2 py-0.5 rounded-sm border"
                    style={{
                      borderColor: adoption.momentum === 'accelerating' ? '#00ff8830' : adoption.momentum === 'decelerating' ? '#ff3b3030' : '#ffffff15',
                      color: adoption.momentum === 'accelerating' ? '#00ff88aa' : adoption.momentum === 'decelerating' ? '#ff3b30aa' : '#ffffff40',
                    }}>
                    {adoption.momentum === 'accelerating' ? '↑' : adoption.momentum === 'decelerating' ? '↓' : '→'} {adoption.momentum.toUpperCase()}
                  </span>
                  {profile && (
                    <span className="font-mono text-[7px] tracking-[0.2em] px-2 py-0.5 rounded-sm border"
                      style={{
                        borderColor: profile.blocks.snapshot.competition === 'high' ? '#ff3b3030' : profile.blocks.snapshot.competition === 'medium' ? '#ffb80030' : '#00ff8830',
                        color: profile.blocks.snapshot.competition === 'high' ? '#ff3b30aa' : profile.blocks.snapshot.competition === 'medium' ? '#ffb800aa' : '#00ff88aa',
                      }}>
                      {profile.blocks.snapshot.competition.toUpperCase()} COMPETITION
                    </span>
                  )}
                  {profile?.confidence && (
                    <span className="font-mono text-[7px] tracking-[0.2em] px-2 py-0.5 rounded-sm border"
                      style={{
                        borderColor: profile.confidence.level === 3 ? '#00ff8830' : profile.confidence.level === 2 ? '#ffb80030' : '#ff3b3030',
                        color: profile.confidence.level === 3 ? '#00ff88aa' : profile.confidence.level === 2 ? '#ffb800aa' : '#ff3b30aa',
                      }}>
                      L{profile.confidence.level} · {profile.confidence.label.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
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
            {/* Sector score */}
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
                <AnimatedNumber value={stat.value} />
              </div>
              <div className="font-mono text-[7px] tracking-[0.3em] text-white/20 mt-2 group-hover:text-white/35 transition-colors duration-200">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ TAB BAR — Progressive Disclosure Levels ═══ */}
        <div className="flex items-center gap-0 border-b border-white/[0.06]">
          {([
            { key: 'understand' as const, label: 'UNDERSTAND', accent: color },
            { key: 'explore' as const, label: 'EXPLORE', accent: '#ffb800' },
            { key: 'analyze' as const, label: 'ANALYZE', accent: '#f97316' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLevel(tab.key)}
              className="relative font-mono text-[8px] tracking-[0.25em] uppercase px-5 py-3.5 transition-colors duration-200"
              style={{
                color: level === tab.key ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => { if (level !== tab.key) e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={(e) => { if (level !== tab.key) e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
            >
              {tab.label}
              {level === tab.key && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: tab.accent }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ═══ LEVEL 1: UNDERSTAND (default) ═══════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {level === 'understand' && (
          <>
            {/* Adoption Curve Visualization */}
            {adoption && (
              <Section title="ADOPTION CURVE" subtitle={adoption.description} color="#a855f7">
                <AdoptionCurveViz adoption={adoption} accentColor={color} />
              </Section>
            )}

            {/* Where it's heading */}
            {story?.outlook && (
              <Section title="WHERE IT'S HEADING" color="#00ff88">
                <div className="border-l-2 pl-5 py-1" style={{ borderColor: `${color}40` }}>
                  <p className="font-mono text-[11px] text-white/50 leading-[1.9]">
                    {story.outlook}
                  </p>
                </div>
              </Section>
            )}

            {/* ── Prediction: Trajectory Forecast ── */}
            {trajectory && (
              <Section title="TRAJECTORY FORECAST" subtitle="Where this industry is heading" color="#a855f7">
                <div className="space-y-4">
                  {/* Direction + velocity header */}
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-[10px] font-medium" style={{
                      color: trajectory.direction === 'accelerating' ? '#00ff88'
                           : trajectory.direction === 'growing' ? '#00d4ff'
                           : trajectory.direction === 'declining' ? '#ff3b30'
                           : trajectory.direction === 'volatile' ? '#f97316'
                           : '#ffffff40',
                    }}>
                      {trajectory.direction === 'accelerating' ? '▲▲' : trajectory.direction === 'growing' ? '▲' : trajectory.direction === 'declining' ? '▼' : trajectory.direction === 'volatile' ? '◆' : '─'}
                      {' '}{trajectory.direction.toUpperCase()}
                    </div>
                    <div className="font-mono text-[8px] text-white/25">
                      velocity: {trajectory.velocity > 0 ? '+' : ''}{trajectory.velocity}/30d
                    </div>
                    <div className="font-mono text-[8px] text-white/15 ml-auto">
                      confidence: {Math.round(trajectory.confidence * 100)}%
                    </div>
                  </div>

                  {/* Score prediction bars */}
                  <div className="grid grid-cols-3 gap-[1px] bg-white/[0.03]">
                    {[
                      { label: 'NOW', score: trajectory.current_score, color: '#00d4ff' },
                      { label: '30D', score: trajectory.predicted_score_30d, color: '#a855f7' },
                      { label: '90D', score: trajectory.predicted_score_90d, color: trajectory.predicted_score_90d > trajectory.current_score ? '#00ff88' : '#ff3b30' },
                    ].map(({ label: lbl, score, color: c }) => (
                      <div key={lbl} className="bg-black p-3">
                        <div className="font-mono text-[7px] tracking-[0.25em] text-white/20 mb-2">{lbl}</div>
                        <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: c }} />
                        </div>
                        <div className="font-mono text-[11px] mt-1.5" style={{ color: c }}>{score}</div>
                      </div>
                    ))}
                  </div>

                  {/* Catalysts + Risks */}
                  <div className="grid grid-cols-2 gap-3">
                    {trajectory.catalysts.length > 0 && (
                      <div>
                        <div className="font-mono text-[7px] tracking-[0.25em] text-[#00ff88]/40 mb-2">CATALYSTS</div>
                        {trajectory.catalysts.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 mb-1.5">
                            <span className="text-[#00ff88]/40 text-[8px] mt-0.5">+</span>
                            <span className="font-mono text-[9px] text-white/35">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {trajectory.risk_factors.length > 0 && (
                      <div>
                        <div className="font-mono text-[7px] tracking-[0.25em] text-[#ff3b30]/40 mb-2">RISK FACTORS</div>
                        {trajectory.risk_factors.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 mb-1.5">
                            <span className="text-[#ff3b30]/40 text-[8px] mt-0.5">!</span>
                            <span className="font-mono text-[9px] text-white/35">{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Next stage estimate */}
                  {trajectory.adoption_next_stage && trajectory.time_to_next_stage_days && (
                    <div className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                      <div className="font-mono text-[7px] tracking-[0.25em] text-white/15 mb-1">NEXT MILESTONE</div>
                      <div className="font-mono text-[10px] text-white/50">
                        Transition to <span style={{ color: '#a855f7' }}>{trajectory.adoption_next_stage}</span>
                        {' '}— est. <span className="text-white/70">{trajectory.time_to_next_stage_days < 60
                          ? `${trajectory.time_to_next_stage_days} days`
                          : `${Math.round(trajectory.time_to_next_stage_days / 30)} months`
                        }</span>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── Prediction: Risks ── */}
            {risks.length > 0 && (
              <Section title="RISK ALERTS" subtitle="Detected threats to monitor" color="#ff3b30">
                <div className="space-y-2">
                  {risks.map((r, i) => {
                    const sevColor = r.severity === 'critical' ? '#ff3b30' : r.severity === 'high' ? '#f97316' : r.severity === 'medium' ? '#ffb800' : '#6b7280';
                    return (
                      <div key={i} className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sevColor }} />
                          <span className="font-mono text-[7px] tracking-[0.2em] uppercase" style={{ color: sevColor }}>{r.severity} — {r.risk_type.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="font-mono text-[9px] text-white/40 leading-relaxed">{r.description}</p>
                        <p className="font-mono text-[8px] text-white/20 mt-1">{r.suggested_action}</p>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ── Prediction: Convergences ── */}
            {convergences.length > 0 && (
              <Section title="CONVERGENCE DETECTED" subtitle="Industries moving together" color="#a855f7">
                <div className="space-y-2">
                  {convergences.map((c, i) => (
                    <div key={i} className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[10px] text-[#a855f7]/60">{c.industries.join(' × ')}</span>
                        <span className="font-mono text-[7px] text-white/15 ml-auto">{c.time_horizon.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="font-mono text-[9px] text-white/35 leading-relaxed">{c.prediction}</p>
                      {c.shared_companies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.shared_companies.map(co => (
                            <span key={co} className="font-mono text-[7px] text-[#00d4ff]/30 border border-[#00d4ff]/10 px-1.5 py-0.5 rounded-sm">{co}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Intelligence Insights */}
            {industryInsights.length > 0 && (
              <Section title="INTELLIGENCE INSIGHTS" subtitle="Patterns and opportunities detected" color="#00d4ff">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {industryInsights.map((ins) => (
                    <div
                      key={ins.id}
                      className="group border border-white/[0.04] rounded-sm p-4 hover:border-white/[0.08] hover:bg-white/[0.01] transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-[2px] rounded-full" style={{ backgroundColor: ins.color, opacity: 0.6 }} />
                        <span className="font-mono text-[6px] tracking-[0.2em] uppercase" style={{ color: `${ins.color}80` }}>{ins.type}</span>
                        <span className="font-mono text-[6px] text-white/15 ml-auto">{ins.confidence}%</span>
                      </div>
                      <h4 className="font-mono text-[10px] text-white/55 font-medium mb-1.5 group-hover:text-white/70 transition-colors">{ins.title}</h4>
                      <p className="font-mono text-[8px] text-white/25 leading-[1.6] line-clamp-2">{ins.description}</p>
                      {ins.companies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ins.companies.slice(0, 3).map(c => (
                            <span key={c} className="font-mono text-[7px] text-[#00d4ff]/30">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* What's happening now */}
            <Section title="WHAT'S HAPPENING NOW" color={color}>
              <div className="space-y-2.5">
                {story?.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
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
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-white/40 hover:text-white/60 transition-colors leading-snug truncate">{item.title}</a>
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

            {/* Key Technologies */}
            {technologies.length > 0 && (
              <Section title="KEY TECHNOLOGIES" subtitle={`${technologies.length} tracked across maturity stages`} color={color}>
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
                          {techs.length === 0 && <span className="font-mono text-[8px] text-white/10">None tracked</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Major Players */}
            {localVendors.length > 0 && (
              <Section title="MAJOR PLAYERS" subtitle={`Top companies in ${label.toLowerCase()}`} color="#ffb800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {localVendors.sort((a, b) => b.ikerScore - a.ikerScore).slice(0, 4).map((v) => (
                    <CompanyCard key={v.id} id={v.id} name={v.name} website={v.website} category={v.category} tags={v.tags} ikerScore={v.ikerScore} accentColor="#ffb800" />
                  ))}
                </div>
                {localVendors.length > 4 && (
                  <button onClick={() => setLevel('explore')} className="block w-full text-center font-mono text-[8px] tracking-[0.2em] py-3 mt-3 text-white/20 hover:text-white/40 transition-colors border border-white/[0.04] hover:border-white/[0.08]">
                    EXPLORE ALL {localVendors.length} COMPANIES →
                  </button>
                )}
              </Section>
            )}

            {/* Opportunities */}
            {opportunities.length > 0 && (
              <Section title="OPPORTUNITIES" subtitle="Detected from signal patterns" color="#00ff88">
                <div className="space-y-2">
                  {opportunities.map((opp, i) => (
                    <OpportunityCard key={i} opportunity={opp} />
                  ))}
                </div>
              </Section>
            )}

            {/* Problems being solved */}
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
                  <Link href={`/industry/${slug}/solve`} className="inline-block font-mono text-[8px] tracking-[0.2em] border rounded-sm px-4 py-2 transition-colors" style={{ borderColor: `${color}30`, color: `${color}90` }}>
                    SOLVE A PROBLEM →
                  </Link>
                </div>
              </Section>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ═══ LEVEL 2: EXPLORE ═══════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {level === 'explore' && (
          <>
            {/* Ecosystem Map — prefer profile data (from knowledge graph), fall back to static */}
            <Section title="ECOSYSTEM MAP" subtitle="Interactive technology ecosystem" color="#a855f7">
              <IndustryEcosystemGraph
                slug={slug}
                industryLabel={label}
                accentColor={color}
                vendors={
                  profile && profile.blocks.companies.length > 0
                    ? profile.blocks.companies.map(c => ({ id: c.id, name: c.name, website: c.website, tags: c.tags }))
                    : localVendors.map(v => ({ id: v.id, name: v.name, website: v.website, tags: v.tags }))
                }
                technologies={
                  profile && profile.blocks.technologies.length > 0
                    ? profile.blocks.technologies.map(t => ({ id: t.id, name: t.name }))
                    : technologies.map(t => ({ id: t.id, name: t.name }))
                }
              />
            </Section>

            {/* Industry Timeline */}
            {timeline.length > 0 && (
              <Section title="INDUSTRY TIMELINE" subtitle="What happened in this industry" color="#ffb800">
                <IndustryTimelineViz events={timeline} />
              </Section>
            )}

            {/* All vendors */}
            {localVendors.length > 0 && (
              <Section title="ALL VENDORS" subtitle={`${localVendors.length} companies active in ${label.toLowerCase()}`} color="#ffb800">
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
                        <CompanyCard key={v.id} id={v.id} name={v.name} website={v.website} category={v.category} tags={v.tags} ikerScore={v.ikerScore} accentColor={tier.tierColor} />
                      ))}
                    </div>
                    {tier.vendors.length > 8 && (
                      <Link href={`/vendors?industry=${slug}`} className="block text-center font-mono text-[8px] tracking-wider py-2 mt-2 text-white/15 hover:text-white/30 transition-colors">
                        VIEW ALL {tier.vendors.length} →
                      </Link>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {/* Products & Equipment */}
            <Section title="PRODUCTS & EQUIPMENT" subtitle={productsLoading ? 'Scanning sources...' : `${products.length} products discovered`} color="#00d4ff">
              <ProductCatalog products={products} accentColor={color} loading={productsLoading} />
            </Section>

            {/* Connected Industries */}
            {!isCustom && (() => {
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
                      <Link key={c.industry.slug} href={`/industry/${c.industry.slug}`} className="group flex items-center gap-3 p-3 border border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.02] transition-all">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.industry.color, boxShadow: `0 0 6px ${c.industry.color}60` }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[10px] text-white/55 group-hover:text-white/75 transition-colors uppercase truncate">{c.industry.label}</div>
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

            {/* Discovery Feed */}
            <Section title="DISCOVERY FEED" subtitle="Live news and breakthroughs" color="#00ff88">
              <DiscoveryFeed items={feedItems} accentColor={color} loading={feedLoading} />
            </Section>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ═══ LEVEL 3: ANALYZE ═══════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {level === 'analyze' && (
          <>
            {/* Porter's Five Forces */}
            {profile?.blocks.porter && (
              <Section title="PORTER'S FIVE FORCES" subtitle={`Industry attractiveness: ${profile.blocks.porter.overall_label} (${profile.blocks.porter.overall_attractiveness}/100)`} color="#a855f7">
                <div className="space-y-2">
                  {Object.values(profile.blocks.porter.forces).map((force: PorterForce) => {
                    const barColor =
                      force.level === 'very_high' ? '#ff3b30' :
                      force.level === 'high' ? '#f97316' :
                      force.level === 'moderate' ? '#ffb800' :
                      force.level === 'low' ? '#00d4ff' : '#00ff88';
                    return (
                      <div key={force.name} className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] text-white/50">{force.name}</span>
                          <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: barColor }}>{force.level.replace('_', ' ')}</span>
                        </div>
                        <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${force.score}%`, backgroundColor: barColor }} />
                        </div>
                        <p className="font-mono text-[8px] text-white/25 leading-relaxed">{force.description}</p>
                        {force.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {force.evidence.map((e, i) => (
                              <span key={i} className="font-mono text-[7px] text-white/15">{e}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <span className="font-mono text-[8px] text-white/20">Confidence: {Math.round(profile.blocks.porter.confidence * 100)}%</span>
                    <span className="font-mono text-[10px]" style={{ color: profile.blocks.porter.overall_attractiveness >= 50 ? '#00ff88' : '#f97316' }}>
                      {profile.blocks.porter.overall_label}
                    </span>
                  </div>
                </div>
              </Section>
            )}

            {/* PESTLE Analysis */}
            {profile?.blocks.pestle && (
              <Section title="PESTLE ANALYSIS" subtitle={`Environment: ${profile.blocks.pestle.overall_environment} · Dominant: ${profile.blocks.pestle.dominant_factor}`} color="#00d4ff">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {profile.blocks.pestle.factors.map((factor) => {
                    const sentColor = factor.sentiment === 'positive' ? '#00ff88' : factor.sentiment === 'negative' ? '#ff3b30' : '#ffb800';
                    return (
                      <div key={factor.category} className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sentColor }} />
                          <span className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase">{factor.label}</span>
                        </div>
                        <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full" style={{ width: `${factor.score}%`, backgroundColor: sentColor, opacity: 0.6 }} />
                        </div>
                        <p className="font-mono text-[8px] text-white/20 leading-relaxed line-clamp-2">{factor.description}</p>
                        {factor.evidence.length > 0 && (
                          <div className="mt-1.5">
                            {factor.evidence.slice(0, 2).map((e, i) => (
                              <div key={i} className="font-mono text-[7px] text-white/12">{e}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.04]">
                  <span className="font-mono text-[8px] text-white/20">Confidence: {Math.round(profile.blocks.pestle.confidence * 100)}%</span>
                  <span className="font-mono text-[8px]" style={{
                    color: profile.blocks.pestle.overall_environment === 'favorable' ? '#00ff88' :
                           profile.blocks.pestle.overall_environment === 'challenging' ? '#ff3b30' : '#ffb800'
                  }}>
                    {profile.blocks.pestle.overall_environment.toUpperCase()} ENVIRONMENT
                  </span>
                </div>
              </Section>
            )}

            {/* Value Chain */}
            {profile?.blocks.value_chain && (
              <Section title="VALUE CHAIN" subtitle={`Integration: ${profile.blocks.value_chain.integration_score}/100 · Strongest: ${profile.blocks.value_chain.strongest_tier.replace(/_/g, ' ')}`} color="#ffd700">
                <div className="space-y-1.5">
                  {profile.blocks.value_chain.tiers.map((tier: ValueChainTier) => {
                    const barColor = tier.gap_detected ? '#ff3b30' :
                      tier.activity_score >= 60 ? '#00ff88' :
                      tier.activity_score >= 30 ? '#00d4ff' :
                      tier.activity_score > 0 ? '#ffb800' : 'rgba(255,255,255,0.08)';
                    return (
                      <div key={tier.slug} className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-white/50">{tier.name}</span>
                            {tier.gap_detected && (
                              <span className="font-mono text-[7px] tracking-[0.2em] text-[#ff3b30] border border-[#ff3b30]/30 px-1.5 py-0.5 rounded-sm">GAP</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[8px] text-white/20">{tier.signal_count} signals</span>
                            <span className="font-mono text-[8px] text-white/20">{tier.company_density} cos</span>
                            <span className="font-mono text-[10px] font-bold" style={{ color: barColor }}>{tier.activity_score}</span>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mb-1.5">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${tier.activity_score}%`, backgroundColor: barColor }} />
                        </div>
                        {tier.key_signals.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tier.key_signals.map((s, i) => (
                              <span key={i} className="font-mono text-[7px] text-white/15 truncate max-w-[200px]">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {profile.blocks.value_chain.bottleneck_tiers.length > 0 && (
                  <div className="mt-3 p-2 border border-[#ff3b30]/20 bg-[#ff3b30]/[0.03] rounded-sm">
                    <span className="font-mono text-[8px] text-[#ff3b30]/60">BOTTLENECKS: {profile.blocks.value_chain.bottleneck_tiers.map(t => t.replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
              </Section>
            )}

            {/* Opportunity Engine */}
            {engineOpportunities.length > 0 && (
              <Section title="OPPORTUNITY RADAR" subtitle={`${engineOpportunities.length} opportunities detected by AI engine`} color="#00ff88">
                <div className="space-y-2">
                  {engineOpportunities.slice(0, 8).map((opp) => {
                    const typeColor =
                      opp.type === 'underserved_market' ? '#00ff88' :
                      opp.type === 'early_mover' ? '#00d4ff' :
                      opp.type === 'funding_surge' ? '#ffb800' :
                      opp.type === 'patent_gap' ? '#a855f7' :
                      opp.type === 'convergence_play' ? '#f97316' :
                      opp.type === 'policy_tailwind' ? '#00d4ff' :
                      opp.type === 'supply_chain_gap' ? '#ff3b30' :
                      opp.type === 'talent_arbitrage' ? '#ffd700' : '#ffffff';
                    const riskColor = opp.risk_level === 'high' ? '#ff3b30' : opp.risk_level === 'medium' ? '#f97316' : '#00ff88';
                    return (
                      <div key={opp.id} className="border border-white/[0.04] rounded-sm p-3 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor, boxShadow: `0 0 4px ${typeColor}80` }} />
                            <span className="font-mono text-[10px] text-white/55">{opp.title}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold" style={{ color: typeColor }}>{opp.score}</span>
                        </div>
                        <p className="font-mono text-[9px] text-white/30 mb-2 leading-relaxed">{opp.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {opp.evidence.slice(0, 3).map((e, i) => (
                            <span key={i} className="font-mono text-[7px] text-white/20 bg-white/[0.02] px-1.5 py-0.5 rounded-sm">{e}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: typeColor }}>{opp.type.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[7px] text-white/15">{opp.timing.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[7px]" style={{ color: riskColor }}>{opp.risk_level} risk</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Signals & Evidence */}
            <Section title="SIGNALS & EVIDENCE" subtitle="Recent intelligence from patents, funding, hiring, contracts" color="#ffb800">
              {signals.length === 0 ? (
                <div className="py-6 text-center">
                  <span className="font-mono text-[9px] text-white/15">No signals collected yet. Data accumulates over time.</span>
                </div>
              ) : (
                <div className="space-y-[2px]">
                  {signals.slice(0, 15).map((sig) => {
                    const sigColor = SIGNAL_TYPE_COLOR[sig.signal_type] ?? '#ffffff';
                    return (
                      <div
                        key={sig.id}
                        className="flex items-center gap-3 py-2.5 pr-3 pl-4 hover:bg-white/[0.025] transition-colors relative"
                        style={{ borderLeft: `2px solid ${sigColor}30` }}
                      >
                        <SignalBadge type={sig.signal_type} size="sm" />
                        <div className="min-w-0 flex-1">
                          {sig.url ? (
                            <a href={sig.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-white/40 hover:text-white/65 transition-colors truncate block">{sig.title}</a>
                          ) : (
                            <span className="font-mono text-[10px] text-white/40 truncate block">{sig.title}</span>
                          )}
                        </div>
                        {sig.company && (() => {
                          const v = findVendor(sig.company);
                          return v ? (
                            <CompanyTooltip name={v.name} website={v.website} category={v.category} ikerScore={v.ikerScore} tags={v.tags}>
                              <span className="font-mono text-[8px] text-white/20 shrink-0 cursor-default hover:text-white/40 transition-colors">{sig.company}</span>
                            </CompanyTooltip>
                          ) : (
                            <span className="font-mono text-[8px] text-white/20 shrink-0">{sig.company}</span>
                          );
                        })()}
                        <span className="font-mono text-[8px] text-white/12 shrink-0">{sig.source}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Signal Breakdown (from adoption profile) */}
            {adoption && Object.keys(adoption.signal_breakdown).length > 0 && (
              <Section title="SIGNAL BREAKDOWN" subtitle="Distribution by type" color="#a855f7">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(adoption.signal_breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const sigColor = SIGNAL_TYPE_COLOR[type] ?? '#ffffff';
                      const maxCount = Math.max(...Object.values(adoption.signal_breakdown));
                      const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={type} className="relative p-3 border border-white/[0.04] overflow-hidden">
                          <div className="absolute inset-0 opacity-[0.04]" style={{ background: `linear-gradient(90deg, ${sigColor} ${pct}%, transparent ${pct}%)` }} />
                          <div className="relative flex items-center justify-between">
                            <span className="font-mono text-[8px] tracking-[0.15em] text-white/40 uppercase">{SIGNAL_TYPE_LABEL[type] ?? type}</span>
                            <span className="font-mono text-[11px] font-bold" style={{ color: sigColor }}>{count}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Section>
            )}

            {/* Latest Intelligence */}
            <Section title="LATEST INTELLIGENCE" subtitle="Live news and breakthroughs" color="#00ff88">
              <DiscoveryFeed items={feedItems} accentColor={color} loading={feedLoading} />
            </Section>

            {/* Industry areas + funding signals (custom industries) */}
            {isCustom && scanData?.industry_areas && scanData.industry_areas.length > 0 && (
              <Section title="INDUSTRY AREAS" subtitle="Detected from intelligence scan" color={color}>
                {scanData.industry_areas.filter(a => a.score > 0).map((area, i) => (
                  <div key={i} className="flex items-center gap-3 mb-1.5">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
                    <span className="font-mono text-[10px] text-white/45">{area.area}</span>
                    <div className="flex-1 h-[1px] bg-white/[0.04]" />
                    <span className="font-mono text-[9px] font-bold" style={{ color }}>{area.score}</span>
                  </div>
                ))}
              </Section>
            )}

            {isCustom && scanData?.funding_signals && scanData.funding_signals.length > 0 && (
              <Section title="FUNDING SIGNALS" subtitle="Investment activity detected" color="#00ff88">
                {scanData.funding_signals.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-start gap-3 mb-1">
                    <span className="font-mono text-[8px] text-[#00ff88]/60 shrink-0">$</span>
                    <span className="font-mono text-[10px] text-white/45">{f.company} — {f.stage}{f.amount ? ` (${f.amount})` : ''}</span>
                  </div>
                ))}
              </Section>
            )}
          </>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="flex flex-col items-center gap-5 py-10 border-t border-white/[0.05] mt-8">
          <span className="font-mono text-[8px] tracking-[0.4em] text-white/10 uppercase">NXT//LINK</span>
          <div className="flex items-center gap-6">
            <Link href={`/industry/${slug}/solve`} className="font-mono text-[8px] tracking-[0.2em] text-white/20 hover:text-white/45 transition-colors duration-200">
              SOLVE A PROBLEM →
            </Link>
            <span className="text-white/8 select-none">·</span>
            <Link href="/vendors" className="font-mono text-[8px] tracking-[0.2em] text-white/20 hover:text-white/45 transition-colors duration-200">
              BROWSE VENDORS →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Adoption Curve Visualization ───────────────────────────────────────────

const STAGES: Array<{ key: string; label: string; range: [number, number] }> = [
  { key: 'innovators', label: 'Innovators', range: [0, 20] },
  { key: 'early_adopters', label: 'Early Adopters', range: [20, 40] },
  { key: 'early_majority', label: 'Early Majority', range: [40, 60] },
  { key: 'late_majority', label: 'Late Majority', range: [60, 80] },
  { key: 'laggards', label: 'Laggards', range: [80, 100] },
];

function AdoptionCurveViz({ adoption, accentColor }: { adoption: AdoptionProfile; accentColor: string }) {
  return (
    <div className="space-y-4">
      {/* S-curve bar */}
      <div className="relative">
        <div className="flex gap-[1px]">
          {STAGES.map((s) => {
            const isActive = adoption.stage === s.key;
            const isPast = STAGES.findIndex(x => x.key === adoption.stage) > STAGES.findIndex(x => x.key === s.key);
            return (
              <div
                key={s.key}
                className="flex-1 relative group cursor-default"
              >
                {/* Bar segment */}
                <div
                  className="h-8 transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? `${accentColor}30` : isPast ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    borderBottom: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                  }}
                >
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}cc` }} />
                    </div>
                  )}
                </div>
                {/* Label */}
                <div className="text-center mt-2">
                  <span className={`font-mono text-[7px] tracking-[0.15em] uppercase ${isActive ? 'text-white/60' : 'text-white/15'}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 pt-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/20">SCORE</span>
          <span className="font-mono text-[11px] font-bold" style={{ color: accentColor }}>{adoption.score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/20">CONFIDENCE</span>
          <span className="font-mono text-[11px] text-white/50">{Math.round(adoption.confidence * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/20">MOMENTUM</span>
          <span className="font-mono text-[11px]" style={{
            color: adoption.momentum === 'accelerating' ? '#00ff88' : adoption.momentum === 'decelerating' ? '#ff3b30' : '#ffffff60',
          }}>
            {adoption.momentum === 'accelerating' ? '↑ Accelerating' : adoption.momentum === 'decelerating' ? '↓ Decelerating' : '→ Steady'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/20">COMPANIES</span>
          <span className="font-mono text-[11px] text-white/50">{adoption.company_count}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Industry Timeline Visualization ────────────────────────────────────────

function IndustryTimelineViz({ events }: { events: TimelineEvent[] }) {
  // Group events by month
  const grouped = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    // Sort keys descending
    const sorted = Array.from(groups.entries() as Iterable<[string, TimelineEvent[]]>)
      .sort(([a], [b]) => b.localeCompare(a));
    return sorted;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="py-6 text-center">
        <span className="font-mono text-[9px] text-white/15">No timeline events yet. Signals will appear as they are collected.</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[52px] top-0 bottom-0 w-[1px] bg-white/[0.06]" />

      <div className="space-y-6">
        {grouped.map(([monthKey, monthEvents]) => {
          const d = new Date(monthEvents[0].date);
          const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return (
            <div key={monthKey}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[8px] tracking-[0.2em] text-white/30 w-[44px] text-right shrink-0">{monthLabel.toUpperCase()}</span>
                <div className="w-2 h-2 rounded-full bg-white/10 relative z-10 shrink-0" />
              </div>

              {/* Events */}
              <div className="space-y-[2px]">
                {monthEvents.map((event, i) => {
                  const sigColor = SIGNAL_TYPE_COLOR[event.type] ?? '#ffffff';
                  return (
                    <div key={`${monthKey}-${i}`} className="flex items-start gap-3 pl-[62px] py-1.5 hover:bg-white/[0.015] transition-colors group">
                      <span className="font-mono text-[8px] text-white/15 shrink-0 w-[32px] mt-0.5">{fmtDate(event.date)}</span>
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: sigColor, boxShadow: `0 0 4px ${sigColor}80` }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[6px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${sigColor}15`, color: `${sigColor}90` }}>
                            {SIGNAL_TYPE_LABEL[event.type] ?? event.type.toUpperCase()}
                          </span>
                          {event.company && (
                            <span className="font-mono text-[8px] text-white/20">{event.company}</span>
                          )}
                        </div>
                        <div className="mt-1">
                          {event.url ? (
                            <a href={event.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] text-white/40 hover:text-white/60 transition-colors leading-snug">
                              {event.title}
                            </a>
                          ) : (
                            <span className="font-mono text-[9px] text-white/40 leading-snug">{event.title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Opportunity Card ───────────────────────────────────────────────────────

function OpportunityCard({ opportunity }: { opportunity: OpportunityEntry }) {
  const strengthColor = opportunity.strength === 'strong' ? '#00ff88' : opportunity.strength === 'moderate' ? '#ffb800' : '#00d4ff';
  return (
    <div className="flex items-start gap-4 p-4 border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.01] transition-all">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strengthColor, boxShadow: `0 0 6px ${strengthColor}80` }} />
        <span className="font-mono text-[6px] tracking-[0.15em] uppercase" style={{ color: `${strengthColor}80` }}>
          {opportunity.strength}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-mono text-[10px] text-white/55 font-medium mb-1">{opportunity.title}</h4>
        <p className="font-mono text-[8px] text-white/25 leading-[1.6]">{opportunity.reason}</p>
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


function AnimatedNumber({ value, prefix = '' }: { value: string; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const numericPart = parseInt(value.replace(/[^0-9]/g, ''), 10);

  useEffect(() => {
    if (isNaN(numericPart) || numericPart === 0 || value === '···') {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    let raf: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 700, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(numericPart * eased);
      setDisplay(value.replace(String(numericPart), String(current)));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, numericPart]);

  return <>{prefix}{display}</>;
}

function formatBudget(budgetM: number): string {
  if (budgetM >= 1000) return `$${(budgetM / 1000).toFixed(1)}B`;
  return `$${Math.round(budgetM)}M`;
}
