'use client';

import { useState, useCallback, useRef } from 'react';
import { timeAgo } from '@/lib/utils/format';
import type {
  AskResponse,
  AskVendor,
  AskProduct,
  AskSignal,
  CostRange,
  WhatItIsSection,
  DirectionSection,
} from '@/lib/engines/ask-engine';
import type { TimelineEvent, OpportunityEntry } from '@/lib/engines/industry-profile';

// ─── Constants ──────────────────────────────────────────────────────────────────

const QUICK_PICKS = [
  { label: 'AI / ML', query: 'artificial intelligence' },
  { label: 'Cybersecurity', query: 'cybersecurity' },
  { label: 'Defense', query: 'defense' },
  { label: 'Manufacturing', query: 'manufacturing' },
  { label: 'Energy', query: 'energy' },
  { label: 'Healthcare', query: 'healthcare' },
  { label: 'Logistics', query: 'logistics' },
  { label: 'Border Tech', query: 'border tech' },
];

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  patent_filing: '#a855f7',
  funding_round: '#00ff88',
  contract_award: '#ffd700',
  merger_acquisition: '#ff3b30',
  product_launch: '#00d4ff',
  hiring_signal: '#f97316',
  research_paper: '#60a5fa',
  regulatory_action: '#ef4444',
  facility_expansion: '#34d399',
  case_study: '#94a3b8',
  news: '#64748b',
};

function ikerBadgeColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#ffd700';
  return '#ff3b30';
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AskPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [introVendor, setIntroVendor] = useState<AskVendor | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? 'Something went wrong');
      } else {
        setResult(data as AskResponse);
      }
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Hero / Search ── */}
      <div className={`flex flex-col items-center justify-center transition-all duration-500 ${result ? 'pt-10 pb-6' : 'pt-[20vh] pb-12'}`}>
        <h1 className="font-mono text-[11px] tracking-[0.3em] text-white/30 uppercase mb-2">
          NXT//LINK INTELLIGENCE
        </h1>
        <p className="font-mono text-[22px] tracking-tight text-white mb-6">
          What do you need to know?
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-2xl px-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a technology, industry, or problem..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-sm px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#f97316]/60 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#f97316] text-black font-mono text-[10px] tracking-[0.15em] uppercase rounded-sm hover:bg-[#f97316]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? 'SEARCHING...' : 'ASK'}
            </button>
          </div>
        </form>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-2 mt-4 px-4 justify-center">
          {QUICK_PICKS.map((p) => (
            <button
              key={p.query}
              onClick={() => {
                setQuery(p.query);
                handleSearch(p.query);
              }}
              className="px-3 py-1 border border-white/[0.08] rounded-sm font-mono text-[9px] tracking-[0.15em] text-[#00d4ff]/70 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-colors uppercase"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="p-3 border border-[#ff3b30]/30 bg-[#ff3b30]/5 rounded-sm font-mono text-[11px] text-[#ff3b30]">
            {error}
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && <LoadingSkeleton />}

      {/* ── Results ── */}
      {result && (
        <div className="max-w-5xl mx-auto px-4 pb-20 space-y-8">
          {/* Confidence banner */}
          <ConfidenceBanner confidence={result.confidence} label={result.label} />

          {/* Section 1: What It Is */}
          <Section title="WHAT IT IS" number="01" color="#00d4ff">
            <WhatItIs data={result.sections.what_it_is} />
          </Section>

          {/* Section 2: History */}
          {result.sections.history.events.length > 0 && (
            <Section title="THE HISTORY" number="02" color="#a855f7">
              <Timeline events={result.sections.history.events} />
            </Section>
          )}

          {/* Section 3: Direction */}
          <Section title="WHERE IT&apos;S HEADING" number="03" color="#f97316">
            <Direction data={result.sections.direction} />
          </Section>

          {/* Section 4: Costs */}
          {result.sections.costs.ranges.length > 0 && (
            <Section title="WHAT IT COSTS" number="04" color="#ffd700">
              <Costs ranges={result.sections.costs.ranges} />
            </Section>
          )}

          {/* Section 5: Global Vendors */}
          {result.sections.global_vendors.vendors.length > 0 && (
            <Section title="GLOBAL VENDORS" number="05" color="#00d4ff">
              <VendorGrid vendors={result.sections.global_vendors.vendors} onRequestIntro={setIntroVendor} />
            </Section>
          )}

          {/* Section 6: Local Vendors */}
          {result.sections.local_vendors.vendors.length > 0 && (
            <Section title="EL PASO VENDORS" number="06" color="#f97316">
              <VendorGrid vendors={result.sections.local_vendors.vendors} onRequestIntro={setIntroVendor} showIntro />
            </Section>
          )}

          {/* Section 7: Live Signals */}
          {result.sections.live_signals.signals.length > 0 && (
            <Section title="LIVE SIGNALS" number="07" color="#00ff88">
              <SignalList signals={result.sections.live_signals.signals} />
            </Section>
          )}

          {/* Products */}
          {result.products.length > 0 && (
            <Section title="PRODUCTS" number="08" color="#a855f7">
              <ProductGrid products={result.products} />
            </Section>
          )}
        </div>
      )}

      {/* ── Intro Request Modal ── */}
      {introVendor && (
        <IntroModal vendor={introVendor} onClose={() => setIntroVendor(null)} />
      )}
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  number,
  color,
  children,
}: {
  title: string;
  number: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/[0.06] rounded-sm overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06]"
        style={{ background: `${color}08` }}
      >
        <span
          className="font-mono text-[9px] tracking-[0.2em]"
          style={{ color: `${color}60` }}
        >
          {number}
        </span>
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color }}
        >
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Confidence Banner ──────────────────────────────────────────────────────────

function ConfidenceBanner({
  confidence,
  label,
}: {
  confidence: AskResponse['confidence'];
  label: string;
}) {
  const levelColors = { 1: '#64748b', 2: '#ffd700', 3: '#00ff88' };
  const c = levelColors[confidence.level] ?? '#64748b';
  return (
    <div className="flex items-center gap-3 px-4 py-2 border border-white/[0.06] rounded-sm bg-white/[0.02]">
      <span
        className="font-mono text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border"
        style={{ color: c, borderColor: `${c}40`, background: `${c}10` }}
      >
        L{confidence.level} — {confidence.label}
      </span>
      <span className="font-mono text-sm text-white/80">{label}</span>
      <span className="ml-auto font-mono text-[9px] text-white/20">
        {confidence.signal_count} signals · {confidence.company_count} companies
      </span>
    </div>
  );
}

// ─── Section 1: What It Is ──────────────────────────────────────────────────────

function WhatItIs({ data }: { data: WhatItIsSection }) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[13px] leading-relaxed text-white/80">
        {data.summary}
      </p>
      {data.key_points.length > 0 && (
        <ul className="space-y-1.5 pl-4">
          {data.key_points.map((point, i) => (
            <li key={i} className="font-mono text-[11px] text-white/50 list-disc">
              {point}
            </li>
          ))}
        </ul>
      )}
      {data.outlook && (
        <div className="mt-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
          <span className="font-mono text-[8px] tracking-[0.2em] text-[#f97316]/60 uppercase block mb-1">
            OUTLOOK
          </span>
          <p className="font-mono text-[11px] text-white/60 leading-relaxed">
            {data.outlook}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Section 2: Timeline ────────────────────────────────────────────────────────

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((ev, i) => (
        <div
          key={i}
          className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0"
        >
          <span className="font-mono text-[9px] text-white/20 w-16 shrink-0 pt-0.5">
            {ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '—'}
          </span>
          <span
            className="font-mono text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border shrink-0"
            style={{
              color: SIGNAL_TYPE_COLORS[ev.type] ?? '#64748b',
              borderColor: `${SIGNAL_TYPE_COLORS[ev.type] ?? '#64748b'}30`,
              background: `${SIGNAL_TYPE_COLORS[ev.type] ?? '#64748b'}10`,
            }}
          >
            {ev.type.replace(/_/g, ' ')}
          </span>
          <span className="font-mono text-[11px] text-white/60 leading-snug">
            {ev.title}
            {ev.company && (
              <span className="text-[#00d4ff]/50 ml-1">— {ev.company}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Section 3: Direction ───────────────────────────────────────────────────────

function Direction({ data }: { data: DirectionSection }) {
  const momentumColors: Record<string, string> = {
    accelerating: '#00ff88',
    growing: '#00d4ff',
    steady: '#ffd700',
    decelerating: '#f97316',
    declining: '#ff3b30',
  };
  const mColor = momentumColors[data.momentum] ?? '#64748b';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase">
            Stage
          </span>
          <span className="font-mono text-[11px] text-white/70">
            {data.adoption_label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase">
            Momentum
          </span>
          <span
            className="font-mono text-[11px] uppercase"
            style={{ color: mColor }}
          >
            {data.momentum}
          </span>
        </div>
      </div>

      {data.opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.opportunities.map((opp, i) => (
            <OpportunityCard key={i} opp={opp} />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ opp }: { opp: OpportunityEntry }) {
  const strengthColors = {
    strong: '#00ff88',
    moderate: '#ffd700',
    emerging: '#00d4ff',
  };
  const c = strengthColors[opp.strength] ?? '#64748b';

  return (
    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="font-mono text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{ color: c, background: `${c}15` }}
        >
          {opp.strength}
        </span>
        <span className="font-mono text-[11px] text-white/70">{opp.title}</span>
      </div>
      <p className="font-mono text-[9px] text-white/30 leading-relaxed">
        {opp.reason}
      </p>
    </div>
  );
}

// ─── Section 4: Costs ───────────────────────────────────────────────────────────

function Costs({ ranges }: { ranges: CostRange[] }) {
  const tierColors = { budget: '#00ff88', mid: '#ffd700', enterprise: '#f97316' };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {ranges.map((r) => {
        const c = tierColors[r.tier] ?? '#64748b';
        return (
          <div
            key={r.tier}
            className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-sm text-center"
          >
            <span
              className="font-mono text-[8px] tracking-[0.2em] uppercase block mb-2"
              style={{ color: `${c}80` }}
            >
              {r.label}
            </span>
            <span
              className="font-mono text-lg block mb-3"
              style={{ color: c }}
            >
              {r.range}
            </span>
            <div className="space-y-1">
              {r.products.map((name, i) => (
                <p key={i} className="font-mono text-[9px] text-white/30 truncate">
                  {name}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section 5 & 6: Vendors ─────────────────────────────────────────────────────

function VendorGrid({
  vendors,
  onRequestIntro,
  showIntro = false,
}: {
  vendors: AskVendor[];
  onRequestIntro: (v: AskVendor) => void;
  showIntro?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {vendors.map((v) => (
        <VendorCard
          key={v.id}
          vendor={v}
          onRequestIntro={onRequestIntro}
          showIntro={showIntro || v.is_local}
        />
      ))}
    </div>
  );
}

function VendorCard({
  vendor,
  onRequestIntro,
  showIntro,
}: {
  vendor: AskVendor;
  onRequestIntro: (v: AskVendor) => void;
  showIntro: boolean;
}) {
  const bc = ikerBadgeColor(vendor.iker_score);

  return (
    <div className="p-3 bg-white/[0.015] border border-white/[0.06] rounded-sm hover:border-white/[0.12] transition-colors">
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="w-9 h-9 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt=""
              className="w-7 h-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.textContent = vendor.name.slice(0, 2).toUpperCase();
                  parent.classList.add('font-mono', 'text-[10px]', 'text-white/30');
                }
              }}
            />
          ) : (
            <span className="font-mono text-[10px] text-white/30">
              {vendor.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[12px] text-white/80 truncate">
              {vendor.name}
            </span>
            {/* IKER badge */}
            <span
              className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm shrink-0"
              style={{
                color: bc,
                background: `${bc}15`,
                boxShadow: `0 0 6px ${bc}40`,
              }}
            >
              {vendor.iker_score}
            </span>
          </div>

          <span className="font-mono text-[8px] tracking-[0.15em] text-white/25 uppercase block mb-1">
            {vendor.category}
          </span>

          {vendor.description && (
            <p className="font-mono text-[9px] text-white/30 leading-relaxed line-clamp-2 mb-2">
              {vendor.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {vendor.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[7px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 bg-white/[0.03] rounded-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {vendor.website && (
              <a
                href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[8px] tracking-[0.1em] text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors uppercase"
              >
                WEBSITE
              </a>
            )}
            {showIntro && (
              <button
                onClick={() => onRequestIntro(vendor)}
                className="font-mono text-[8px] tracking-[0.15em] text-[#f97316] hover:text-[#f97316]/80 border border-[#f97316]/30 hover:border-[#f97316]/50 px-2 py-1 rounded-sm transition-colors uppercase"
              >
                REQUEST INTRO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section 7: Live Signals ────────────────────────────────────────────────────

function SignalList({ signals }: { signals: AskSignal[] }) {
  return (
    <div className="space-y-0">
      {signals.map((s, i) => {
        const tc = SIGNAL_TYPE_COLORS[s.type] ?? '#64748b';
        return (
          <div
            key={i}
            className="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0"
          >
            {/* Importance dot */}
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: s.importance >= 0.7 ? '#00ff88' : s.importance >= 0.4 ? '#ffd700' : '#64748b',
                boxShadow: s.importance >= 0.7 ? '0 0 4px #00ff88' : undefined,
              }}
            />
            <span
              className="font-mono text-[8px] tracking-[0.1em] uppercase shrink-0 w-20"
              style={{ color: `${tc}80` }}
            >
              {s.type.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-[11px] text-white/60 truncate flex-1">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00d4ff] transition-colors"
                >
                  {s.title}
                </a>
              ) : (
                s.title
              )}
            </span>
            {s.source && (
              <span className="font-mono text-[8px] text-white/15 shrink-0">
                {s.source}
              </span>
            )}
            <span className="font-mono text-[8px] text-white/15 shrink-0 w-8 text-right">
              {timeAgo(s.discovered_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Products Grid ──────────────────────────────────────────────────────────────

function ProductGrid({ products }: { products: AskProduct[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: AskProduct }) {
  const maturityColors: Record<string, string> = {
    emerging: '#00d4ff',
    growing: '#ffd700',
    mature: '#00ff88',
  };
  const mc = maturityColors[product.maturity] ?? '#64748b';

  return (
    <div className="p-3 bg-white/[0.015] border border-white/[0.06] rounded-sm hover:border-white/[0.12] transition-colors">
      {/* Company logo */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-sm bg-white/90 flex items-center justify-center shrink-0 overflow-hidden">
          {product.logo_url ? (
            <img
              src={product.logo_url}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.textContent = product.company.slice(0, 2).toUpperCase();
                  parent.classList.add('font-mono', 'text-[8px]', 'text-black/40');
                  parent.classList.remove('bg-white/90');
                  parent.classList.add('bg-white/[0.06]', 'text-white/30');
                }
              }}
            />
          ) : (
            <span className="font-mono text-[8px] text-black/40">
              {product.company.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <span className="font-mono text-[11px] text-white/70 block truncate">
            {product.name}
          </span>
          <span className="font-mono text-[8px] text-white/25 block truncate">
            {product.company}
          </span>
        </div>
      </div>

      <p className="font-mono text-[9px] text-white/30 leading-relaxed line-clamp-2 mb-2">
        {product.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-mono text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{ color: mc, background: `${mc}15` }}
        >
          {product.maturity}
        </span>
        <span className="font-mono text-[8px] text-white/25 uppercase">
          {product.price_estimate}
        </span>
        {product.price_range && (
          <span className="font-mono text-[8px] text-[#ffd700]/40">
            {product.price_range}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-white/[0.04] rounded-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="h-3 w-32 bg-white/[0.04] rounded-sm animate-pulse" />
          </div>
          <div className="p-4 space-y-3">
            <div className="h-3 w-full bg-white/[0.03] rounded-sm animate-pulse" />
            <div className="h-3 w-4/5 bg-white/[0.03] rounded-sm animate-pulse" />
            <div className="h-3 w-3/5 bg-white/[0.03] rounded-sm animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Intro Request Modal ────────────────────────────────────────────────────────

function IntroModal({
  vendor,
  onClose,
}: {
  vendor: AskVendor;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSend = () => {
    const subject = encodeURIComponent(`Introduction Request: ${vendor.name}`);
    const body = encodeURIComponent(
      `Vendor: ${vendor.name}\nCategory: ${vendor.category}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`,
    );
    window.open(`mailto:info@nxtlinktech.com?subject=${subject}&body=${body}`, '_self');
    onClose();
  };

  const isValid = name.trim().length > 0 && email.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md mx-4 bg-black border border-white/[0.1] rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div>
            <span className="font-mono text-[9px] tracking-[0.2em] text-[#f97316]/60 uppercase block">
              Request Intro
            </span>
            <span className="font-mono text-sm text-white/80">{vendor.name}</span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase block mb-1">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#f97316]/40"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase block mb-1">
              Your email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#f97316]/40"
              placeholder="jane@company.com"
            />
          </div>
          <div>
            <label className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase block mb-1">
              Your phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#f97316]/40"
              placeholder="(915) 555-0123"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={handleSend}
            disabled={!isValid}
            className="w-full py-2 bg-[#f97316] text-black font-mono text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-[#f97316]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            SEND REQUEST
          </button>
          <p className="font-mono text-[8px] text-white/20 text-center mt-2 tracking-wide">
            We connect you within 24hrs.
          </p>
        </div>
      </div>
    </div>
  );
}
