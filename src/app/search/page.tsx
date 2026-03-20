'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { Brain } from '@/lib/brain';
import type { DecideData, IndustryData } from '@/lib/brain';
import { BottomNav, TopBar, EmptyState } from '@/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

type SearchState = 'idle' | 'loading' | 'done' | 'error';

const TRACK_LABELS: Record<string, string> = {
  technology: 'TECHNOLOGY', product: 'PRODUCT', discovery: 'DISCOVERY',
  direction: 'WHERE HEADING', who: 'WHO IS DOING IT', connection: 'CONNECTION OPP',
};
const TRACK_COLORS: Record<string, string> = {
  technology: COLORS.accent, product: COLORS.green, discovery: '#a855f7',
  direction: COLORS.gold, who: COLORS.orange, connection: '#10b981',
};

const STORAGE_KEY = 'nxt_recent_searches';
const MAX_RECENTS = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENTS) : [];
  } catch { return []; }
}

function saveRecent(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return;
  try {
    const prev = getRecents().filter((r) => r.toLowerCase() !== query.toLowerCase());
    const next = [query.trim(), ...prev].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* localStorage full */ }
}

function removeRecent(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const next = getRecents().filter((r) => r.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

// ─── Inner Search Component ─────────────────────────────────────────────────

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [recents, setRecents] = useState<string[]>([]);
  const [state, setState] = useState<SearchState>(initialQuery ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<DecideData | null>(null);
  const [industry, setIndustry] = useState<IndustryData | null>(null);
  const [showContent, setShowContent] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRecents(getRecents()); }, []);

  const executeSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setState('loading');
    setError(null);
    setShowContent(false);
    setDecision(null);
    setIndustry(null);
    setSubmitted(q.trim());
    saveRecent(q.trim());
    setRecents(getRecents());

    const params = new URLSearchParams();
    params.set('q', q.trim());
    router.replace(`/search?${params.toString()}`, { scroll: false });

    try {
      const [decideResult, industryResult] = await Promise.all([
        Brain.decide(q.trim()),
        Brain.industry(q.trim()),
      ]);
      setDecision(decideResult);
      setIndustry(industryResult);
      setState('done');
      setTimeout(() => setShowContent(true), 80);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Search failed. Try again.');
    }
  }, [router]);

  useEffect(() => {
    if (initialQuery) executeSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) executeSearch(query);
  };

  type R = Record<string, string | number | null>;
  const signals = (industry?.resources?.intel_signals ?? []).slice(0, 3) as R[];
  const technologies = (industry?.resources?.technologies ?? []).slice(0, 3) as R[];
  const products = (industry?.resources?.products ?? []).slice(0, 3) as R[];
  const vendors = (industry?.resources?.vendors ?? []).slice(0, 5) as R[];

  return (
    <div className="min-h-screen pb-16 overflow-y-auto" style={{ background: COLORS.bg }}>
      <TopBar />

      <main className="max-w-[560px] mx-auto px-6 sm:px-10">
        {/* ── Search Input ────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="pt-8 sm:pt-12 mb-6">
          <div
            className="flex items-center gap-3 px-5 transition-all duration-200 focus-within:border-white/15"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '20px',
              minHeight: '56px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about any industry, technology, or trend..."
              autoFocus
              className="flex-1 bg-transparent font-grotesk text-[15px] sm:text-[16px] font-light outline-none placeholder:opacity-25 min-h-[44px]"
              style={{ color: COLORS.text }}
            />
            {query.trim() && (
              <button
                type="submit"
                className="shrink-0 font-mono text-[10px] tracking-[0.15em] uppercase px-3 min-h-[44px] flex items-center transition-opacity hover:opacity-70"
                style={{ color: COLORS.accent }}
              >
                Go
              </button>
            )}
          </div>
        </form>

        {/* ── Recent chips ────────────────────────────────────────── */}
        {recents.length > 0 && state === 'idle' && (
          <div className="flex flex-wrap gap-2 mb-12">
            {recents.map((r) => (
              <button
                key={r}
                onClick={() => { setQuery(r); executeSearch(r); }}
                className="group flex items-center gap-1.5 font-mono text-[10px] tracking-wide px-3.5 py-2 rounded-full transition-all duration-200 hover:border-white/15 min-h-[44px]"
                style={{ color: COLORS.muted, background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <span>{r}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); removeRecent(r); setRecents(getRecents()); }}
                  className="opacity-0 group-hover:opacity-50 transition-opacity ml-1 cursor-pointer text-[8px]"
                >
                  ✕
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────── */}
        {state === 'loading' && (
          <div className="pt-8 space-y-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 rounded-nxt-sm w-3/5 shimmer" />
              <div className="h-4 rounded-nxt-sm w-full shimmer" />
              <div className="h-4 rounded-nxt-sm w-4/5 shimmer" />
            </div>
            {[1, 2].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-2 rounded-nxt-sm w-24 shimmer" />
                <div className="h-20 rounded-nxt-lg shimmer" />
              </div>
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────── */}
        {state === 'error' && (
          <div className="pt-16 text-center">
            <EmptyState message={error ?? 'Search failed. Try again.'} />
            <button
              onClick={() => executeSearch(submitted)}
              className="mt-6 font-mono text-[11px] tracking-[0.1em] px-5 py-2.5 rounded-nxt-sm transition-all hover:brightness-110"
              style={{ background: COLORS.accent, color: COLORS.bg, border: 'none', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────── */}
        {state === 'done' && decision && (
          <div
            className="space-y-10 transition-all duration-500"
            style={{ opacity: showContent ? 1 : 0, transform: showContent ? 'translateY(0)' : 'translateY(12px)' }}
          >
            {/* AI explanation card */}
            <section
              className="p-6 sm:p-8"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '24px' }}
            >
              <span
                className="inline-block font-mono text-[9px] tracking-[0.25em] uppercase px-2.5 py-1 rounded-full mb-5"
                style={{ color: COLORS.accent, background: `${COLORS.accent}0a`, border: `1px solid ${COLORS.accent}20` }}
              >
                {decision.decision.type.replace(/_/g, ' ')}
              </span>

              <h2 className="font-grotesk text-[20px] sm:text-[24px] font-semibold leading-tight mb-4" style={{ color: COLORS.text }}>
                {decision.decision.headline}
              </h2>

              <p className="font-grotesk text-[15px] leading-[1.7] font-light" style={{ color: `${COLORS.text}70` }}>
                {decision.decision.detail}
              </p>

              {decision.decision.vendor_name && (
                <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <span className="font-mono text-[11px]" style={{ color: COLORS.muted }}>{decision.decision.vendor_name}</span>
                  {decision.decision.vendor_score != null && (
                    <span className="font-mono text-[11px]" style={{ color: COLORS.gold }}>Score {decision.decision.vendor_score}</span>
                  )}
                </div>
              )}
            </section>

            {/* Signals */}
            {signals.length > 0 && (
              <section>
                <p className="font-mono text-[8px] tracking-[0.35em] uppercase mb-5" style={{ color: `${COLORS.text}20` }}>WHAT&apos;S HAPPENING</p>
                <div className="flex flex-col gap-3">
                  {signals.map((signal: R, i: number) => (
                    <div key={i} className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
                      <p className="font-grotesk text-[14px] font-medium leading-snug mb-2" style={{ color: COLORS.text }}>
                        {String(signal.title ?? signal.name ?? 'Signal')}
                      </p>
                      <div className="flex items-center gap-3 font-mono text-[10px]">
                        {signal.signal_type && (
                          <span
                            className="tracking-[0.12em] px-2 py-0.5 rounded-full uppercase"
                            style={{
                              color: TRACK_COLORS[String(signal.signal_type)] ?? COLORS.accent,
                              background: `${TRACK_COLORS[String(signal.signal_type)] ?? COLORS.accent}0a`,
                              border: `1px solid ${TRACK_COLORS[String(signal.signal_type)] ?? COLORS.accent}20`,
                              fontSize: '8px',
                            }}
                          >
                            {TRACK_LABELS[String(signal.signal_type)] ?? String(signal.signal_type)}
                          </span>
                        )}
                        {signal.discovered_at && <span style={{ color: `${COLORS.text}25` }}>{String(signal.discovered_at).slice(0, 10)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Technologies */}
            {technologies.length > 0 && (
              <section>
                <p className="font-mono text-[8px] tracking-[0.35em] uppercase mb-5" style={{ color: `${COLORS.text}20` }}>OPPORTUNITIES</p>
                <div className="flex flex-col gap-3">
                  {technologies.map((tech: R, i: number) => (
                    <div key={i} className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
                      <p className="font-grotesk text-[14px] font-medium mb-1" style={{ color: COLORS.text }}>
                        {String(tech.name ?? tech.title ?? 'Technology')}
                      </p>
                      {tech.description && (
                        <p className="font-grotesk text-[13px] leading-relaxed font-light" style={{ color: `${COLORS.text}50` }}>
                          {String(tech.description).slice(0, 160)}
                        </p>
                      )}
                      {tech.maturity_stage && (
                        <span className="inline-block mt-2 font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full"
                          style={{ color: COLORS.accent, background: `${COLORS.accent}0a` }}
                        >
                          {String(tech.maturity_stage)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Products */}
            {products.length > 0 && (
              <section>
                <p className="font-mono text-[8px] tracking-[0.35em] uppercase mb-5" style={{ color: `${COLORS.text}20` }}>PRODUCTS</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((product: R, i: number) => (
                    <div key={i} className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
                      <p className="font-grotesk text-[13px] font-medium mb-1" style={{ color: COLORS.text }}>
                        {String(product.name ?? product.title ?? 'Product')}
                      </p>
                      {product.vendor_name && (
                        <p className="font-mono text-[10px] mb-1.5" style={{ color: COLORS.muted }}>by {String(product.vendor_name)}</p>
                      )}
                      {product.description && (
                        <p className="font-grotesk text-[12px] leading-relaxed font-light" style={{ color: `${COLORS.text}45` }}>
                          {String(product.description).slice(0, 120)}
                        </p>
                      )}
                      {product.score != null && (
                        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px]">
                          <span style={{ color: COLORS.gold }}>{String(product.score)}</span>
                          <span style={{ color: COLORS.dim }}>score</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Vendors */}
            {vendors.length > 0 && (
              <section>
                <p className="font-mono text-[8px] tracking-[0.35em] uppercase mb-5" style={{ color: `${COLORS.text}20` }}>VENDORS</p>
                <div className="flex flex-wrap gap-2">
                  {vendors.map((vendor: R, i: number) => (
                    <span key={i} className="font-mono text-[11px] px-4 py-2.5 rounded-full flex items-center min-h-[44px]"
                      style={{ color: COLORS.text, background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                    >
                      {String(vendor.name ?? vendor.vendor_name ?? 'Vendor')}
                      {vendor.score != null && <span className="ml-2 text-[9px]" style={{ color: COLORS.gold }}>{String(vendor.score)}</span>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Trajectory link */}
            <section className="pb-6">
              <Link
                href={`/trajectory?topic=${encodeURIComponent(submitted)}`}
                className="flex items-center justify-between font-mono text-[13px] px-6 min-h-[56px] no-underline transition-all duration-200 hover:translate-x-1"
                style={{ color: COLORS.accent, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
              >
                <span>View trajectory for &ldquo;{submitted}&rdquo;</span>
                <span className="text-[16px]">→</span>
              </Link>
            </section>

            {/* Empty fallback */}
            {signals.length === 0 && technologies.length === 0 && products.length === 0 && vendors.length === 0 && !decision?.decision.detail && (
              <EmptyState message={`No intelligence found for "${submitted}". Try a broader query.`} />
            )}
          </div>
        )}

        {/* ── Idle empty state ────────────────────────────────────── */}
        {state === 'idle' && recents.length === 0 && (
          <div className="pt-24 text-center">
            <p className="font-grotesk text-[15px] leading-relaxed font-light" style={{ color: `${COLORS.text}35` }}>
              Search any industry, technology, or trend.
              <br />
              The AI will analyze signals and explain what matters.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

// ─── Page Wrapper ────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pb-16" style={{ background: COLORS.bg }}>
          <TopBar />
          <main className="max-w-[640px] mx-auto px-6 pt-8">
            <div className="space-y-4 animate-pulse">
              <div className="h-14 rounded-nxt-lg shimmer" />
              <div className="h-6 w-3/5 rounded-nxt-sm shimmer" />
              <div className="h-4 w-full shimmer" />
            </div>
          </main>
          <BottomNav />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
