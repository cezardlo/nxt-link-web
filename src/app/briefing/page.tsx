'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';

interface Vendor {
  company_name: string;
  sector: string;
  iker_score: number;
  company_url: string | null;
}

interface Product {
  product_name: string;
  company: string;
  category: string | null;
}

interface Cluster {
  id: string;
  title: string;
  strength: number;
  signal_count: number;
  industries: string[];
  what_is_happening: string | null;
  why_it_matters: string | null;
  what_happens_next: string | null;
  vendors: Vendor[];
  products: Product[];
}

interface Briefing {
  generated_at: string;
  total_signals: number;
  top_3: Cluster[];
  fallback_signals: { id: string; title: string; industry: string; score: number }[];
}

const SECTION_COLORS = {
  happening: '#00d4ff',
  matters: '#ffb800',
  next: '#00ff88',
};

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/briefing')
      .then((r) => r.json())
      .then((data) => setBriefing(data.briefing))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: `${COLORS.accent}30`, borderTopColor: COLORS.accent }}
          />
          <span className="font-mono text-xs tracking-widest" style={{ color: COLORS.dim }}>
            LOADING BRIEFING
          </span>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <span className="font-mono text-sm" style={{ color: COLORS.dim }}>
          BRIEFING UNAVAILABLE
        </span>
      </div>
    );
  }

  const clusters = briefing.top_3;
  const today = new Date(briefing.generated_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: COLORS.bg }}>
      {/* ─── Header ─── */}
      <header className="px-5 sm:px-8 pt-8 pb-6 max-w-[720px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="font-mono text-[14px] font-bold tracking-[0.15em]"
            style={{ color: COLORS.text }}
          >
            NXT<span style={{ color: COLORS.accent }}>{'//'}</span>LINK
          </Link>
        </div>

        <h1
          className="text-[28px] sm:text-[36px] font-bold leading-[1.15] tracking-tight mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.text }}
        >
          Top 3 in Supply Chain
        </h1>
        <p className="text-[14px]" style={{ color: COLORS.muted }}>
          {today} &middot; {briefing.total_signals.toLocaleString()} signals analyzed
        </p>
      </header>

      {/* ─── Top 3 Cards ─── */}
      <main className="px-5 sm:px-8 max-w-[720px] mx-auto">
        {clusters.length > 0 ? (
          <div className="flex flex-col gap-5">
            {clusters.map((c, i) => (
              <article
                key={c.id}
                className="rounded-xl overflow-hidden"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                {/* Card number + title */}
                <div className="px-5 sm:px-6 pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="font-mono text-[32px] font-bold leading-none"
                      style={{ color: `${COLORS.accent}30` }}
                    >
                      {i + 1}
                    </span>
                    <h2
                      className="text-[18px] sm:text-[20px] font-semibold leading-tight pt-1"
                      style={{ color: COLORS.text }}
                    >
                      {c.title}
                    </h2>
                  </div>
                </div>

                {/* Intelligence sections */}
                <div className="px-5 sm:px-6 pb-5 space-y-4">
                  {c.what_is_happening && (
                    <Section label="WHAT IS HAPPENING" color={SECTION_COLORS.happening}>
                      {c.what_is_happening}
                    </Section>
                  )}
                  {c.why_it_matters && (
                    <Section label="WHY IT MATTERS" color={SECTION_COLORS.matters}>
                      {c.why_it_matters}
                    </Section>
                  )}
                  {c.what_happens_next && (
                    <Section label="WHERE IT'S GOING" color={SECTION_COLORS.next}>
                      {c.what_happens_next}
                    </Section>
                  )}
                </div>

                {/* Tools / Vendors (optional) */}
                {(c.vendors.length > 0 || c.products.length > 0) && (
                  <div
                    className="px-5 sm:px-6 py-4"
                    style={{ borderTop: `1px solid ${COLORS.border}`, background: `${COLORS.card}60` }}
                  >
                    <div
                      className="font-mono text-[9px] font-bold tracking-[0.2em] mb-3"
                      style={{ color: COLORS.dim }}
                    >
                      WHAT EXISTS
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.vendors.map((v, vi) => (
                        <span
                          key={`v-${vi}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px]"
                          style={{
                            background: COLORS.surface,
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.text,
                          }}
                        >
                          {v.company_name}
                          <span style={{ color: COLORS.dim }}>&middot; {v.sector}</span>
                        </span>
                      ))}
                      {c.products.map((p, pi) => (
                        <span
                          key={`p-${pi}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px]"
                          style={{
                            background: COLORS.surface,
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.muted,
                          }}
                        >
                          {p.product_name}
                          {p.company && <span style={{ color: COLORS.dim }}>&middot; {p.company}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : briefing.fallback_signals.length > 0 ? (
          /* Fallback: top signals */
          <div>
            <p className="text-[13px] mb-4" style={{ color: COLORS.muted }}>
              Clusters are still assembling. Here are today&apos;s top signals:
            </p>
            <div className="flex flex-col gap-3">
              {briefing.fallback_signals.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 px-5 py-4 rounded-xl"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                >
                  <span
                    className="font-mono text-[24px] font-bold leading-none"
                    style={{ color: `${COLORS.accent}30` }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-[15px] font-medium" style={{ color: COLORS.text }}>
                      {s.title}
                    </div>
                    <div className="font-mono text-[10px] mt-1" style={{ color: COLORS.dim }}>
                      {s.industry} &middot; score {s.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[14px]" style={{ color: COLORS.muted }}>
              No intelligence available yet. Ingestion needs to run first.
            </p>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-10 text-center">
          <Link
            href="/intel"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider px-5 py-2.5 rounded-lg transition-colors"
            style={{
              color: COLORS.accent,
              border: `1px solid ${COLORS.accent}25`,
              background: `${COLORS.accent}08`,
            }}
          >
            VIEW ALL SIGNALS
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <path d="m5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ─── Reusable section block ─── */
function Section({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="font-mono text-[9px] font-bold tracking-[0.2em] mb-1.5"
        style={{ color }}
      >
        {label}
      </div>
      <p className="text-[14px] leading-relaxed" style={{ color: `${COLORS.text}dd` }}>
        {children}
      </p>
    </div>
  );
}
