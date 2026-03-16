'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

import { EcosystemDiagram } from '@/components/EcosystemDiagram';

import { PageTopBar } from '@/components/PageTopBar';
import { timeAgo, scoreColor, formatUsd, compactNumber } from '@/lib/utils/format';
import type { KgTechnologyRow } from '@/db/queries/kg-technologies';
import type { KgSignalRow } from '@/db/queries/kg-signals';
import type { KgDiscoveryRow } from '@/db/queries/kg-discoveries';
import type { KgIndustryRow } from '@/db/queries/kg-industries';
import type { VendorRecord } from '@/db/queries/vendors';
import type { ProductRow } from '@/db/queries/products';
import type { ConferenceRecord } from '@/db/queries/conferences';
import type { IntelSignalRow } from '@/db/queries/intel-signals';

// ─── Constants ───────────────────────────────────────────────────────────────

const EL_PASO_LAT = 31.7619;
const EL_PASO_LON = -106.485;

const PRIORITY_COLORS: Record<string, string> = {
  P0: '#ff3b30', P1: '#f97316', P2: '#ffd700', P3: '#64748b',
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRIORITY_LABELS: Record<string, string> = {
  P0: 'CRITICAL', P1: 'HIGH', P2: 'MEDIUM', P3: 'LOW',
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  breakthrough: '#00d4ff', investment: '#00ff88', policy: '#ffd700',
  disruption: '#ff3b30', regulatory_change: '#f97316', supply_chain_risk: '#ff3b30',
  startup_formation: '#a855f7', manufacturing_expansion: '#00ff88',
};

const INTEL_TYPE_COLORS: Record<string, string> = {
  patent_filing: '#00d4ff', research_paper: '#a855f7', funding_round: '#00ff88',
  merger_acquisition: '#ffd700', contract_award: '#00ff88', product_launch: '#00d4ff',
  hiring_signal: '#f97316', regulatory_action: '#ffd700', facility_expansion: '#00ff88',
  case_study: '#64748b',
};

const QUADRANT_COLORS: Record<string, string> = {
  adopt: '#00ff88', trial: '#00d4ff', assess: '#ffd700', explore: '#64748b',
};

const MATURITY_ORDER = ['research', 'emerging', 'early_adoption', 'growth', 'mainstream'];
const MATURITY_LABELS: Record<string, string> = {
  research: 'Research', emerging: 'Emerging', early_adoption: 'Early Adoption',
  growth: 'Growth', mainstream: 'Mainstream',
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low: '#00ff88', medium: '#ffd700', high: '#f97316', critical: '#ff3b30',
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function distanceFromElPaso(lat: number, lon: number): number {
  const R = 3959; // miles
  const dLat = (lat - EL_PASO_LAT) * Math.PI / 180;
  const dLon = (lon - EL_PASO_LON) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(EL_PASO_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clearbitLogo(domain: string): string {
  const d = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return `https://logo.clearbit.com/${d}`;
}

function maturityPercent(stage: string | null): number {
  if (!stage) return 0;
  const idx = MATURITY_ORDER.indexOf(stage);
  return idx < 0 ? 20 : ((idx + 1) / MATURITY_ORDER.length) * 100;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type IndustryData = {
  industry: KgIndustryRow;
  technologies: KgTechnologyRow[];
  signals: KgSignalRow[];
  discoveries: KgDiscoveryRow[];
  vendors: VendorRecord[];
  products: ProductRow[];
  conferences: ConferenceRecord[];
  intelSignals: IntelSignalRow[];
};

// ─── Supplier data (hardcoded global suppliers — grows over time) ───────────

type Supplier = {
  name: string;
  tier: 1 | 2;
  part: string;
  critical: boolean;
  country: string;
};

const GLOBAL_SUPPLIERS: Supplier[] = [
  { name: 'Parker Hannifin', tier: 1, part: 'Hydraulic systems & motion control', critical: true, country: 'US' },
  { name: 'Bosch Rexroth', tier: 1, part: 'Drive & control technology', critical: true, country: 'DE' },
  { name: 'Steel Technologies', tier: 1, part: 'Flat-rolled steel processing', critical: true, country: 'US' },
  { name: 'Siemens AG', tier: 1, part: 'Industrial automation & PLCs', critical: true, country: 'DE' },
  { name: 'ABB Ltd', tier: 1, part: 'Robotics & power systems', critical: true, country: 'CH' },
  { name: 'Honeywell', tier: 1, part: 'Process controls & safety systems', critical: false, country: 'US' },
  { name: 'Rockwell Automation', tier: 1, part: 'Industrial control & info solutions', critical: false, country: 'US' },
  { name: 'Schneider Electric', tier: 1, part: 'Energy management & automation', critical: false, country: 'FR' },
  { name: 'Fanuc', tier: 1, part: 'CNC systems & industrial robots', critical: true, country: 'JP' },
  { name: 'Mitsubishi Electric', tier: 2, part: 'Factory automation & inverters', critical: false, country: 'JP' },
  { name: 'Omron', tier: 2, part: 'Sensing & control components', critical: false, country: 'JP' },
  { name: 'TE Connectivity', tier: 2, part: 'Connectors & sensors', critical: false, country: 'CH' },
  { name: 'Eaton Corp', tier: 2, part: 'Power distribution equipment', critical: false, country: 'IE' },
  { name: 'SMC Corporation', tier: 2, part: 'Pneumatic components', critical: false, country: 'JP' },
  { name: 'Keyence', tier: 2, part: 'Machine vision & measurement', critical: false, country: 'JP' },
  { name: 'Balluff', tier: 2, part: 'Industrial sensors & networking', critical: false, country: 'DE' },
];

// ─── Timeline data (global industry history) ────────────────────────────────

type TimelineEntry = {
  year: number;
  title: string;
  description: string;
  type: 'milestone' | 'disruption' | 'regulation' | 'forecast';
};

const INDUSTRY_TIMELINE: TimelineEntry[] = [
  // ── Origins ──
  { year: 1925, title: 'First Assembly Line Automation', description: 'Ford Motor Company introduces automated conveyor systems in manufacturing, setting the standard for mass production globally.', type: 'milestone' },
  { year: 1947, title: 'Transistor Invented', description: 'Bell Labs creates the transistor — the foundation of all modern electronics, computing, and digital technology.', type: 'milestone' },
  { year: 1954, title: 'First Industrial Robot', description: 'George Devol patents the Unimate, the first programmable industrial robot arm. Deployed at GM in 1961.', type: 'milestone' },
  { year: 1958, title: 'Integrated Circuit', description: 'Jack Kilby (TI) and Robert Noyce (Fairchild) independently invent the integrated circuit, launching the semiconductor age.', type: 'milestone' },
  { year: 1969, title: 'First PLC Invented', description: 'Bedford Associates develop the Modicon 084, the first programmable logic controller. ARPANET also goes live this year.', type: 'milestone' },
  { year: 1971, title: 'First Microprocessor', description: 'Intel releases the 4004 — the first commercial microprocessor. Computing becomes embeddable in every device.', type: 'milestone' },
  // ── Digital Age ──
  { year: 1980, title: 'CAD/CAM Revolution', description: 'Computer-aided design and manufacturing transforms engineering workflows globally. AutoCAD launches in 1982.', type: 'milestone' },
  { year: 1983, title: 'TCP/IP Standard Adopted', description: 'ARPANET switches to TCP/IP, creating the internet protocol stack still used today. The internet is born.', type: 'milestone' },
  { year: 1990, title: 'ERP Systems Emerge', description: 'SAP R/3 and Oracle launch enterprise resource planning, integrating manufacturing, finance, and supply chain.', type: 'milestone' },
  { year: 1994, title: 'World Wide Web Goes Commercial', description: 'Netscape IPO sparks the commercial internet revolution. E-commerce, SaaS, and digital transformation begin.', type: 'milestone' },
  { year: 1997, title: 'Six Sigma Goes Global', description: 'GE adopts Six Sigma methodology under Jack Welch, sparking worldwide quality revolution in manufacturing.', type: 'milestone' },
  { year: 2000, title: 'Dot-Com Crash', description: 'Technology spending drops 30%, wiping $5T in market value. Reshapes vendor landscape and startup ecosystem permanently.', type: 'disruption' },
  // ── Cloud & Mobile Era ──
  { year: 2006, title: 'Cloud Computing Begins', description: 'AWS launches EC2 and S3, beginning the shift from on-premise to cloud infrastructure. Google Cloud and Azure follow.', type: 'milestone' },
  { year: 2007, title: 'iPhone Launches', description: 'Apple introduces the iPhone, catalyzing the mobile revolution. Smartphones become the primary computing platform for 5B+ people.', type: 'disruption' },
  { year: 2008, title: 'Global Financial Crisis', description: 'Lehman Brothers collapses. $22T in global wealth destroyed. Accelerates fintech, drives efficiency/automation mandates.', type: 'disruption' },
  { year: 2010, title: 'Industry 4.0 Coined', description: 'German government introduces "Industrie 4.0" — smart factory vision with IoT, cyber-physical systems, and digital twins.', type: 'milestone' },
  { year: 2012, title: 'Deep Learning Breakthrough', description: 'AlexNet wins ImageNet with 15% error rate (vs 26%), launching the modern AI/ML era in computer vision and beyond.', type: 'disruption' },
  // ── AI & Disruption Era ──
  { year: 2016, title: 'IIoT Standards Published', description: 'Industrial Internet Consortium publishes reference architecture for Industrial IoT. Also: AlphaGo defeats world Go champion.', type: 'regulation' },
  { year: 2017, title: 'Transformer Architecture', description: 'Google publishes "Attention Is All You Need" — the architecture behind GPT, BERT, and every modern LLM.', type: 'milestone' },
  { year: 2018, title: 'US-China Trade War Begins', description: 'Tariffs on $360B+ of goods disrupt global supply chains. Tech decoupling accelerates reshoring and friend-shoring.', type: 'disruption' },
  { year: 2020, title: 'COVID-19 Pandemic', description: 'Global supply chain collapse. Remote work becomes permanent. Automation investment surges 40% as labor costs spike.', type: 'disruption' },
  { year: 2021, title: 'Global Chip Shortage', description: 'Semiconductor shortage costs auto industry $210B. Exposes fragility of just-in-time manufacturing globally.', type: 'disruption' },
  { year: 2022, title: 'CHIPS Act & EU Chips Act', description: 'US invests $280B, EU commits €43B in domestic semiconductor manufacturing. On-shoring era begins.', type: 'regulation' },
  { year: 2023, title: 'Generative AI Wave', description: 'ChatGPT reaches 100M users in 2 months. GPT-4, Claude, Gemini transform every industry from code to content to manufacturing.', type: 'disruption' },
  { year: 2024, title: 'AI Agent Frameworks', description: 'Multi-agent AI systems begin autonomous decision-making in enterprise workflows. $25B+ in AI infrastructure spending.', type: 'milestone' },
  // ── Where Things Are Heading ──
  { year: 2025, title: 'Edge AI + On-Device Inference', description: 'AI inference moves to device/factory floor — sub-10ms latency. Apple, NVIDIA, Qualcomm ship dedicated AI silicon. Real-time defect detection becomes standard.', type: 'forecast' },
  { year: 2026, title: 'Autonomous Supply Chains', description: 'AI-managed logistics networks reduce human intervention by 60% in tier-1 operations. Predictive inventory replaces reactive ordering. Digital freight matching becomes dominant.', type: 'forecast' },
  { year: 2027, title: 'Quantum Computing Advantage', description: 'First practical quantum advantage in materials science, drug discovery, and logistics optimization. D-Wave, IBM, Google race to 10K+ qubit systems.', type: 'forecast' },
  { year: 2028, title: 'Human-AI Collaboration Standard', description: 'Most knowledge work becomes AI-augmented. AI co-pilots handle 70% of routine decisions. New job categories emerge: AI trainers, prompt engineers, AI ethicists at scale.', type: 'forecast' },
  { year: 2029, title: 'Sovereign AI Mandates', description: 'Major nations require domestic AI training infrastructure. Data sovereignty laws reshape cloud architecture. AI becomes geopolitical leverage.', type: 'forecast' },
  { year: 2030, title: 'Carbon-Neutral Manufacturing', description: 'EU carbon border tax fully enforced. AI-optimized energy grids reduce industrial emissions 45%. Green hydrogen scales to cost parity with natural gas.', type: 'forecast' },
  { year: 2032, title: 'Autonomous Everything', description: 'Level 4 autonomous vehicles in 50+ cities. Robotic warehouses handle 80% of e-commerce. Lights-out factories operate 24/7 across Asia and North America.', type: 'forecast' },
  { year: 2035, title: 'AGI-Adjacent Systems', description: 'AI systems demonstrate general reasoning across domains. Enterprise decisions increasingly delegated to AI with human oversight. Entire industries restructure around AI-first workflows.', type: 'forecast' },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function IndustryDeepDivePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const label = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const [data, setData] = useState<IndustryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expandedTimeline, setExpandedTimeline] = useState<number | null>(null);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/industry/${slug}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Industry not found' : 'Failed to load');
        return;
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#00d4ff', borderTopColor: 'transparent' }} />
          <p className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>LOADING INDUSTRY DATA...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-white/50 mb-4">{error ?? 'No data'}</p>
          <button onClick={fetchData} className="font-mono text-[10px] tracking-widest px-4 py-2 border rounded-sm" style={{ borderColor: '#00d4ff40', color: '#00d4ff' }}>
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const { industry, technologies, signals, discoveries, vendors, products, conferences, intelSignals = [] } = data;

  const tier1Suppliers = GLOBAL_SUPPLIERS.filter(s => s.tier === 1);
  const tier2Suppliers = GLOBAL_SUPPLIERS.filter(s => s.tier === 2);

  return (
    <div className="bg-black min-h-screen">
      <PageTopBar
        backHref="/search"
        backLabel="SEARCH"
        breadcrumbs={[
          { label: 'INDUSTRIES', href: '/search' },
          { label: label }
        ]}
        showLiveDot={true}
        rightSlot={
          <button
            onClick={fetchData}
            className="font-mono text-[8px] tracking-[0.2em] border rounded-sm px-2.5 py-1 transition-colors hover:bg-white/5"
            style={{ borderColor: '#00d4ff40', color: '#00d4ffcc' }}
          >
            {loading ? 'REFRESHING...' : 'REFRESH DATA'}
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-0">

        {/* ═══ HERO ═══ */}
        <div className="pb-8 border-b border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white mb-2" style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
                {industry.name}
              </h1>
              {industry.description && (
                <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {industry.description}
                </p>
              )}
            </div>
            {/* IKER Ring */}
            <div className="shrink-0 ml-6">
              <IkerRing score={industry.iker_score} size={72} />
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-6">
            <StatBlock label="TECHNOLOGIES" value={technologies.length} color="#00d4ff" />
            <StatBlock label="VENDORS" value={vendors.length} color="#00ff88" />
            <StatBlock label="PRODUCTS" value={products.length} color="#ffd700" />
            <StatBlock label="SIGNALS" value={signals.length} color="#f97316" />
            <StatBlock label="INTEL" value={intelSignals.length} color="#a855f7" />
            <StatBlock label="RESEARCH" value={discoveries.length} color="#a855f7" />
          </div>

          {lastRefresh && (
            <p className="font-mono text-[8px] tracking-widest mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
              LAST REFRESH: {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
            </p>
          )}
        </div>

        {/* ═══ 1. VENDORS — Clearbit logos, distance, IKER ring, trend ═══ */}
        <Section title="VENDORS" icon="🏢" count={vendors.length} color="#00ff88">
          {vendors.length === 0 ? (
            <EmptyState label="No vendors discovered yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendors.sort((a, b) => b.ikerScore - a.ikerScore).slice(0, 12).map(v => (
                <VendorCard key={v.id} vendor={v} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 2. PRODUCTS — photos, badges, star ratings, deployment, complexity ═══ */}
        <Section title="PRODUCTS" icon="📦" count={products.length} color="#ffd700">
          {products.length === 0 ? (
            <EmptyState label="No products discovered yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.sort((a, b) => b.confidence - a.confidence).slice(0, 12).map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 3. SUPPLIERS — Tier 1/2 supply chain map ═══ */}
        <Section title="SUPPLY CHAIN" icon="⛓️" count={GLOBAL_SUPPLIERS.length} color="#f97316">
          <div className="space-y-4">
            {/* Tier 1 */}
            <div>
              <h4 className="font-mono text-[9px] tracking-[0.2em] mb-3" style={{ color: '#ff3b30' }}>
                TIER 1 — CRITICAL PATH
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tier1Suppliers.map(s => (
                  <SupplierCard key={s.name} supplier={s} />
                ))}
              </div>
            </div>
            {/* Tier 2 */}
            <div>
              <h4 className="font-mono text-[9px] tracking-[0.2em] mb-3" style={{ color: '#ffd700' }}>
                TIER 2 — SECONDARY COMPONENTS
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tier2Suppliers.map(s => (
                  <SupplierCard key={s.name} supplier={s} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ 4. TECHNOLOGIES — quadrant, maturity bars, velocity ═══ */}
        <Section title="TECHNOLOGIES" icon="⚡" count={technologies.length} color="#00d4ff">
          {technologies.length === 0 ? (
            <EmptyState label="No technologies tracked yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {technologies.sort((a, b) => (b.iker_score ?? 0) - (a.iker_score ?? 0)).slice(0, 12).map(t => (
                <TechnologyCard key={t.id} tech={t} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 4b. ECOSYSTEM MAP — auto-generated Excalidraw diagram ═══ */}
        <div className="py-8 border-b border-white/[0.06]">
          <button
            onClick={() => setEcosystemOpen(o => !o)}
            className="w-full flex items-center gap-3 mb-0 group"
          >
            <span className="text-sm">🗺️</span>
            <h2 className="font-mono text-[11px] tracking-[0.2em] font-medium" style={{ color: '#00d4ff' }}>
              ECOSYSTEM MAP
            </h2>
            <span
              className="font-mono text-[9px] tracking-widest px-2 py-0.5 rounded-sm"
              style={{ background: '#00d4ff10', color: '#00d4ff88', border: '1px solid #00d4ff20' }}
            >
              {vendors.slice(0, 8).length + technologies.slice(0, 8).length} NODES
            </span>
            <span className="ml-auto font-mono text-[9px] tracking-widest" style={{ color: '#00d4ff44' }}>
              {ecosystemOpen ? '▲ COLLAPSE' : '▼ EXPAND'}
            </span>
          </button>

          {ecosystemOpen && (
            <div className="mt-5">
              <EcosystemDiagram
                industryName={industry.name}
                companies={vendors.slice(0, 8).map(v => ({ name: v.name, role: v.category }))}
                technologies={technologies.slice(0, 8).map(t => ({ name: t.name, maturity: t.maturity_stage ?? undefined }))}
              />
              <p className="font-mono text-[8px] tracking-widest mt-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
                CYAN — INDUSTRY HUB · GREEN — KEY VENDORS · PURPLE — TECHNOLOGIES · VIEW-ONLY MODE
              </p>
            </div>
          )}
        </div>

        {/* ═══ 5. RESEARCH — papers, citations, institutions ═══ */}
        <Section title="RESEARCH" icon="🔬" count={discoveries.length} color="#a855f7">
          {discoveries.length === 0 ? (
            <EmptyState label="No research papers discovered yet" />
          ) : (
            <div className="space-y-2">
              {discoveries.sort((a, b) => (b.iker_impact_score ?? 0) - (a.iker_impact_score ?? 0)).slice(0, 10).map(d => (
                <ResearchCard key={d.id} discovery={d} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 6. CONFERENCES — relevance, attendees, register ═══ */}
        <Section title="CONFERENCES" icon="🎯" count={conferences.length} color="#ffd700">
          {conferences.length === 0 ? (
            <EmptyState label="No conferences tracked yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...conferences].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8).map(c => (
                <ConferenceCard key={c.id} conference={c} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 7. TIMELINE — 1925 to 2035 ═══ */}
        <Section title="TIMELINE" icon="📅" count={INDUSTRY_TIMELINE.length} color="#00d4ff">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="space-y-1">
              {INDUSTRY_TIMELINE.map((entry, idx) => {
                const currentYear = new Date().getFullYear();
                const isFuture = entry.year > currentYear;
                const isExpanded = expandedTimeline === entry.year;
                const prevEntry = idx > 0 ? INDUSTRY_TIMELINE[idx - 1] : null;
                const showNowMarker = prevEntry && prevEntry.year <= currentYear && entry.year > currentYear;
                const showForecastHeader = entry.type === 'forecast' && (idx === 0 || INDUSTRY_TIMELINE[idx - 1].type !== 'forecast');

                return (
                  <div key={entry.year}>
                    {/* NOW marker — shows between past and future */}
                    {showNowMarker && (
                      <div className="flex items-center gap-3 py-3 px-2">
                        <div className="w-[14px] h-[14px] rounded-full shrink-0 flex items-center justify-center animate-pulse"
                          style={{ background: '#00ff88', boxShadow: '0 0 12px #00ff88aa' }} />
                        <div className="flex-1 flex items-center gap-3">
                          <span className="font-mono text-[11px] font-bold" style={{ color: '#00ff88' }}>
                            {currentYear} — YOU ARE HERE
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, #00ff8844, transparent)' }} />
                        </div>
                      </div>
                    )}

                    {/* WHERE THINGS ARE HEADING divider */}
                    {showForecastHeader && (
                      <div className="flex items-center gap-3 py-4 px-2">
                        <div className="w-[14px] flex justify-center shrink-0">
                          <div className="w-px h-4" style={{ background: '#00d4ff44' }} />
                        </div>
                        <span className="font-mono text-[9px] tracking-[0.3em] font-bold" style={{ color: '#00d4ff' }}>
                          WHERE THINGS ARE HEADING
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, #00d4ff33, transparent)' }} />
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedTimeline(isExpanded ? null : entry.year)}
                      className="w-full text-left flex items-start gap-3 py-2 px-2 rounded-sm transition-colors hover:bg-white/[0.03]"
                      style={{ opacity: isFuture ? 0.45 : 1 }}
                    >
                      <div className="w-[14px] h-[14px] rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                        style={{
                          background: entry.type === 'disruption' ? '#ff3b30' :
                            entry.type === 'regulation' ? '#ffd700' :
                            entry.type === 'forecast' ? '#00d4ff33' : '#00ff88',
                          boxShadow: entry.type === 'disruption' ? '0 0 8px #ff3b3066' :
                            entry.type === 'forecast' ? '0 0 6px #00d4ff22' : '0 0 6px #00ff8844',
                          border: entry.type === 'forecast' ? '1px dashed #00d4ff44' : 'none',
                        }}
                      >
                        {isFuture && <span className="text-[6px]" style={{ color: '#00d4ff' }}>?</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold" style={{ color: isFuture ? '#00d4ff' : 'white' }}>
                            {entry.year}
                          </span>
                          <span className="text-xs" style={{ color: isFuture ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)' }}>{entry.title}</span>
                          {entry.type === 'disruption' && (
                            <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm" style={{ background: '#ff3b3020', color: '#ff3b30', border: '1px solid #ff3b3030' }}>
                              DISRUPTION
                            </span>
                          )}
                          {entry.type === 'regulation' && (
                            <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm" style={{ background: '#ffd70020', color: '#ffd700', border: '1px solid #ffd70030' }}>
                              REGULATION
                            </span>
                          )}
                          {entry.type === 'forecast' && (
                            <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm" style={{ background: '#00d4ff15', color: '#00d4ff88', border: '1px dashed #00d4ff30' }}>
                              FORECAST
                            </span>
                          )}
                        </div>
                        {isExpanded && (
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: isFuture ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.4)' }}>
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══ 8. SIGNALS — P0-P3 live feed ═══ */}
        <Section title="LIVE SIGNALS" icon="📡" count={signals.length} color="#ff3b30">
          {signals.length === 0 ? (
            <EmptyState label="No active signals detected" />
          ) : (
            <div className="space-y-2">
              {signals.sort((a, b) => {
                const pOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
                return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
              }).slice(0, 15).map(s => (
                <SignalCard key={s.id} signal={s} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 9. INTEL SIGNALS — importance-scored intel feed ═══ */}
        <Section title="INTEL SIGNALS" icon="🔍" count={intelSignals.length} color="#a855f7">
          {intelSignals.length === 0 ? (
            <EmptyState label="No intel signals discovered yet" />
          ) : (
            <div className="space-y-2">
              {[...intelSignals].sort((a, b) => b.importance_score - a.importance_score).slice(0, 20).map(s => (
                <IntelSignalCard key={s.id} signal={s} />
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────

function Section({ title, icon, count, color, children }: {
  title: string;
  icon: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-8 border-b border-white/[0.06]">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm">{icon}</span>
        <h2 className="font-mono text-[11px] tracking-[0.2em] font-medium" style={{ color }}>
          {title}
        </h2>
        <span className="font-mono text-[9px] tracking-widest px-2 py-0.5 rounded-sm"
          style={{ background: `${color}10`, color: `${color}88`, border: `1px solid ${color}20` }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Stat Block ──────────────────────────────────────────────────────────────

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-sm p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="font-mono text-[8px] tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
      <p className="font-mono text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-sm p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <p className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>{label}</p>
    </div>
  );
}

// ─── IKER Ring ───────────────────────────────────────────────────────────────

function IkerRing({ score, size = 56 }: { score: number | null; size?: number }) {
  const s = score ?? 0;
  const color = scoreColor(s);
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - s / 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[8px] tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>IKER</span>
        <span className="font-mono text-sm font-bold" style={{ color }}>{s}</span>
      </div>
    </div>
  );
}

// ─── 1. Vendor Card ──────────────────────────────────────────────────────────

function VendorCard({ vendor }: { vendor: VendorRecord }) {
  const dist = distanceFromElPaso(vendor.lat, vendor.lon);
  const domain = vendor.website?.replace(/^https?:\/\//, '').replace(/\/.*$/, '') ?? '';
  const logoUrl = domain ? clearbitLogo(domain) : null;

  return (
    <div className="group rounded-sm p-4 transition-all hover:border-[#00ff8840]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="w-10 h-10 rounded-sm shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span className="font-mono text-[10px] text-white/30">{vendor.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{vendor.name}</h3>
            <IkerRing score={vendor.ikerScore} size={32} />
          </div>
          <p className="font-mono text-[9px] tracking-wide mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {vendor.category}
          </p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center gap-3 mt-3 font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <span>{Math.round(dist)} mi from EP</span>
        {domain && <span className="truncate">{domain}</span>}
        {/* Trend bar */}
        <div className="flex-1 flex justify-end">
          <div className="flex gap-px items-end h-3">
            {[30, 50, 40, 70, 60, 80, vendor.ikerScore].map((v, i) => (
              <div key={i} className="w-1 rounded-t-sm" style={{
                height: `${v / 100 * 12}px`,
                background: i === 6 ? scoreColor(v) : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Product Card ─────────────────────────────────────────────────────────

function ProductCard({ product }: { product: ProductRow }) {
  const isNew = Date.now() - new Date(product.created_at).getTime() < 30 * 86400000;
  const complexityColor = COMPLEXITY_COLORS[product.maturity] ?? '#64748b';
  const stars = Math.min(5, Math.max(1, Math.round(product.confidence * 5)));

  return (
    <div className="group rounded-sm p-4 transition-all hover:border-[#ffd70040]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-white">{product.product_name}</h3>
            {isNew && (
              <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm"
                style={{ background: '#00ff8815', color: '#00ff88', border: '1px solid #00ff8830' }}>
                NEW
              </span>
            )}
            {product.tags?.includes('ev-certified') && (
              <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm"
                style={{ background: '#00d4ff15', color: '#00d4ff', border: '1px solid #00d4ff30' }}>
                EV CERTIFIED
              </span>
            )}
          </div>
          {product.company && (
            <p className="font-mono text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{product.company}</p>
          )}
        </div>
        {/* Complexity indicator */}
        <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm shrink-0"
          style={{ background: `${complexityColor}15`, color: complexityColor, border: `1px solid ${complexityColor}30` }}>
          {product.maturity.toUpperCase()}
        </span>
      </div>

      {product.description && (
        <p className="text-xs leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {product.description.slice(0, 100)}
        </p>
      )}

      <div className="flex items-center gap-3 font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {/* Star rating */}
        <span style={{ color: '#ffd700' }}>
          {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
        </span>
        {product.price_range && <span>{product.price_range}</span>}
        {product.product_type && <span>{product.product_type}</span>}
        {product.use_cases?.length > 0 && (
          <span>{product.use_cases.length} use cases</span>
        )}
      </div>
    </div>
  );
}

// ─── 3. Supplier Card ────────────────────────────────────────────────────────

function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="rounded-sm p-3 transition-all hover:border-white/20"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${supplier.critical ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-medium text-white">{supplier.name}</h3>
        {supplier.critical && (
          <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm"
            style={{ background: '#ff3b3015', color: '#ff3b30', border: '1px solid #ff3b3030' }}>
            CRITICAL
          </span>
        )}
        <span className="font-mono text-[8px] tracking-wide ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {supplier.country}
        </span>
      </div>
      <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {supplier.part}
      </p>
    </div>
  );
}

// ─── 4. Technology Card ──────────────────────────────────────────────────────

function TechnologyCard({ tech }: { tech: KgTechnologyRow }) {
  const quadrantColor = QUADRANT_COLORS[tech.radar_quadrant ?? ''] ?? '#64748b';
  const matPct = maturityPercent(tech.maturity_stage);

  return (
    <div className="rounded-sm p-4 transition-all hover:border-[#00d4ff40]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-white">{tech.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {tech.radar_quadrant && (
            <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm"
              style={{ background: `${quadrantColor}15`, color: quadrantColor, border: `1px solid ${quadrantColor}30` }}>
              {tech.radar_quadrant.toUpperCase()}
            </span>
          )}
          <IkerRing score={tech.iker_score} size={32} />
        </div>
      </div>

      {tech.description && (
        <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {tech.description.slice(0, 100)}
        </p>
      )}

      {/* Maturity bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[8px] tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            MATURITY
          </span>
          <span className="font-mono text-[8px]" style={{ color: quadrantColor }}>
            {MATURITY_LABELS[tech.maturity_stage ?? ''] ?? tech.maturity_stage ?? '—'}
          </span>
        </div>
        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${matPct}%`, background: quadrantColor }} />
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {tech.signal_velocity != null && tech.signal_velocity > 0 && (
          <span style={{ color: '#f97316' }}>+{tech.signal_velocity} signals/30d</span>
        )}
      </div>
    </div>
  );
}

// ─── 5. Research Card ────────────────────────────────────────────────────────

function ResearchCard({ discovery }: { discovery: KgDiscoveryRow }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const impactColor = scoreColor(discovery.iker_impact_score ?? 0);

  return (
    <div className="rounded-sm p-4 transition-all hover:border-[#a855f740]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white mb-1">{discovery.title}</h3>
          <div className="flex items-center gap-3 flex-wrap font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {discovery.research_institution && (
              <span style={{ color: '#a855f7' }}>{discovery.research_institution}</span>
            )}
            {discovery.discovery_type && (
              <span className="px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                {discovery.discovery_type.replace(/_/g, ' ').toUpperCase()}
              </span>
            )}
            {discovery.trl_level != null && (
              <span>TRL {discovery.trl_level}</span>
            )}
            {discovery.published_at && (
              <span>{new Date(discovery.published_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            )}
          </div>
          {discovery.summary && (
            <p className="text-xs leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {discovery.summary.slice(0, 150)}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-center gap-1">
          <IkerRing score={discovery.iker_impact_score} size={36} />
          {discovery.source_url && (
            <a href={discovery.source_url} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[7px] tracking-widest px-2 py-1 rounded-sm transition-colors hover:bg-white/5"
              style={{ color: '#00d4ff', border: '1px solid #00d4ff30' }}>
              READ PAPER
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 6. Conference Card ──────────────────────────────────────────────────────

function ConferenceCard({ conference }: { conference: ConferenceRecord }) {
  const relevanceColor = scoreColor(conference.relevanceScore);

  return (
    <div className="rounded-sm p-4 transition-all hover:border-[#ffd70040]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-white">{conference.name}</h3>
        <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: relevanceColor }}>
          {conference.relevanceScore}%
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2 font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <span>{conference.location}</span>
        <span>{conference.month}</span>
        <span style={{ color: '#00d4ff' }}>{conference.category}</span>
      </div>

      {conference.description && (
        <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {conference.description.slice(0, 100)}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {conference.estimatedExhibitors > 0 && `~${compactNumber(conference.estimatedExhibitors)} exhibitors`}
        </span>
        {conference.website && (
          <a href={conference.website} target="_blank" rel="noopener noreferrer"
            className="font-mono text-[8px] tracking-widest px-2.5 py-1 rounded-sm transition-colors hover:bg-white/5"
            style={{ color: '#ffd700', border: '1px solid #ffd70030' }}>
            REGISTER
          </a>
        )}
      </div>
    </div>
  );
}

// ─── 8. Signal Card ──────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: KgSignalRow }) {
  const pColor = PRIORITY_COLORS[signal.priority] ?? '#64748b';
  const typeColor = SIGNAL_TYPE_COLORS[signal.signal_type] ?? '#64748b';

  return (
    <div className="rounded-sm p-3 transition-all hover:border-white/15 flex items-start gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${signal.priority === 'P0' ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      {/* Priority badge */}
      <span className="font-mono text-[8px] tracking-widest font-bold px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5"
        style={{ background: `${pColor}15`, color: pColor, border: `1px solid ${pColor}30` }}>
        {signal.priority}
      </span>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-medium text-white mb-1">{signal.title}</h4>
        <div className="flex items-center gap-2 flex-wrap font-mono text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span className="px-1.5 py-0.5 rounded-sm"
            style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}>
            {signal.signal_type.replace(/_/g, ' ').toUpperCase()}
          </span>
          {signal.source_name && <span>{signal.source_name}</span>}
          <span>{timeAgo(signal.detected_at)}</span>
        </div>
        {signal.description && (
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {signal.description.slice(0, 120)}
          </p>
        )}
      </div>

      {signal.source_url && (
        <a href={signal.source_url} target="_blank" rel="noopener noreferrer"
          className="font-mono text-[7px] tracking-widest px-2 py-1 rounded-sm shrink-0 mt-0.5 hover:bg-white/5"
          style={{ color: '#00d4ff', border: '1px solid #00d4ff30' }}>
          SOURCE
        </a>
      )}
    </div>
  );
}

// ─── 9. Intel Signal Card ─────────────────────────────────────────────────────

function IntelSignalCard({ signal }: { signal: IntelSignalRow }) {
  const typeColor = INTEL_TYPE_COLORS[signal.signal_type] ?? '#64748b';
  const importancePct = Math.round(signal.importance_score * 100);

  return (
    <div className="rounded-sm p-3 transition-all hover:border-[#a855f740] flex items-start gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${signal.importance_score >= 0.7 ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      {/* Importance bar */}
      <div className="shrink-0 mt-1 flex flex-col items-center gap-1">
        <div className="w-1.5 h-8 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="w-full rounded-full" style={{
            height: `${importancePct}%`,
            background: importancePct >= 70 ? '#00ff88' : importancePct >= 40 ? '#ffd700' : '#64748b',
            marginTop: `${100 - importancePct}%`,
          }} />
        </div>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{importancePct}</span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-medium text-white mb-1">{signal.title}</h4>
        <div className="flex items-center gap-2 flex-wrap font-mono text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span className="px-1.5 py-0.5 rounded-sm"
            style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}>
            {signal.signal_type.replace(/_/g, ' ').toUpperCase()}
          </span>
          {signal.company && (
            <span style={{ color: '#00d4ff' }}>{signal.company}</span>
          )}
          {signal.amount_usd != null && signal.amount_usd > 0 && (
            <span style={{ color: '#00ff88' }}>{formatUsd(signal.amount_usd)}</span>
          )}
          {signal.source && <span>{signal.source}</span>}
          <span>{timeAgo(signal.discovered_at)}</span>
        </div>
        {signal.evidence && (
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {signal.evidence.slice(0, 120)}
          </p>
        )}
      </div>

      {signal.url && (
        <a href={signal.url} target="_blank" rel="noopener noreferrer"
          className="font-mono text-[7px] tracking-widest px-2 py-1 rounded-sm shrink-0 mt-0.5 hover:bg-white/5"
          style={{ color: '#a855f7', border: '1px solid #a855f730' }}>
          SOURCE
        </a>
      )}
    </div>
  );
}
