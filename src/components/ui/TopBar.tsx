'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function TopBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="sticky top-0 z-[90] h-12 px-5 backdrop-blur-xl border-b flex items-center justify-between"
      style={{ background: `${COLORS.bg}ee`, borderBottomColor: COLORS.border }}
    >
      <Link href="/" className="font-grotesk text-[15px] font-bold tracking-[0.02em] no-underline" style={{ color: COLORS.orange }}>
        NXT<span style={{ color: `${COLORS.orange}30` }}>{'//'}
        </span>LINK
      </Link>

      <Link
        href="/solve"
        className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[10px] tracking-[0.1em] transition-all duration-200 hover:border-white/15"
        style={{ color: `${COLORS.text}28`, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
      >
        ⌕ Search anything...
      </Link>

      <div className="flex items-center gap-4">
        <span className="font-mono text-[8px] tracking-[0.15em] uppercase" style={{ color: `${COLORS.text}22` }}>
          {now ? formatDate(now).toUpperCase() : ''}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em]" style={{ color: COLORS.green }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full live-pulse" style={{ background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}80` }} />
          LIVE
        </span>
      </div>
    </header>
  );
}
