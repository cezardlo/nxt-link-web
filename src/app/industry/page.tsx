'use client';

import Link from 'next/link';
import { INDUSTRIES } from '@/lib/data/nav';
import { COLORS } from '@/lib/tokens';
import { AppShell } from '@/components/AppShell';

export default function IndustryIndex() {
  return (
    <AppShell>
      <div
        className="min-h-[100dvh] px-6 py-10 md:py-16"
        style={{ background: COLORS.bg, color: COLORS.text }}
      >
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="text-[11px] tracking-[0.25em] font-bold mb-2" style={{ color: COLORS.orange }}>
            NXT<span style={{ color: COLORS.dim }}>{'//'}</span>LINK
          </div>
          <h1
            className="text-[28px] sm:text-[36px] font-bold leading-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Industry Intelligence
          </h1>
          <p className="text-[13px]" style={{ color: `${COLORS.text}60` }}>
            Deep-dive into any sector. Trends, players, signals, and opportunities.
          </p>
        </div>

        {/* Industry Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {INDUSTRIES.map((ind, i) => (
            <Link
              key={ind.id}
              href={`/industry/${ind.id}`}
              className="flex flex-col gap-3 p-5 text-left transition-all card-hover animate-fade-up opacity-0"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '16px',
                color: COLORS.text,
                textDecoration: 'none',
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <span className="text-[22px]" style={{ color: ind.color }}>{ind.icon}</span>
              <div>
                <span
                  className="text-[14px] font-bold block"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {ind.label}
                </span>
                <span className="text-[10px] block mt-1" style={{ color: `${COLORS.text}55` }}>
                  {ind.desc}
                </span>
              </div>
              <span className="text-[9px] tracking-[0.1em] mt-auto" style={{ color: ind.color }}>
                EXPLORE →
              </span>
            </Link>
          ))}
        </div>

        {/* Quick link to solve */}
        <div className="max-w-4xl mx-auto mt-10 text-center">
          <p className="text-[10px] tracking-[0.15em] mb-3" style={{ color: `${COLORS.text}25` }}>
            HAVE A SPECIFIC PROBLEM?
          </p>
          <Link
            href="/solve"
            className="inline-block text-[12px] font-bold tracking-[0.08em] px-8 py-3"
            style={{
              background: `${COLORS.orange}15`,
              border: `1px solid ${COLORS.orange}40`,
              borderRadius: '12px',
              color: COLORS.orange,
              textDecoration: 'none',
            }}
          >
            GO TO SOLVE ENGINE →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
