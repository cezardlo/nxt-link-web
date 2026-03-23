'use client';

import Link from 'next/link';

interface PageTopBarProps {
  backHref: string;
  backLabel: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  rightSlot?: React.ReactNode;
  showLiveDot?: boolean;
}

export function PageTopBar({
  backHref,
  backLabel,
  breadcrumbs,
  rightSlot,
  showLiveDot = false,
}: PageTopBarProps) {
  return (
    <div className="sticky top-0 z-10">
      {/* Main bar */}
      <div className="h-11 bg-black/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">

          {/* Left: back link + breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={backHref}
              className="font-mono text-[9px] tracking-[0.2em] text-white/50 hover:text-[#00d4ff] transition-colors shrink-0"
            >
              ‹ {backLabel}
            </Link>

            {breadcrumbs && breadcrumbs.length > 0 && (
              <>
                <span className="font-mono text-[9px] text-white/20 shrink-0">›</span>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-2 min-w-0">
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="font-mono text-[9px] tracking-[0.15em] text-white/70 hover:text-[#00d4ff] hover:underline transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-mono text-[9px] tracking-[0.15em] text-white/70 truncate">
                        {crumb.label}
                      </span>
                    )}
                    {i < breadcrumbs.length - 1 && (
                      <span className="font-mono text-[9px] text-white/20 shrink-0">›</span>
                    )}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Right: live dot + right slot */}
          <div className="flex items-center gap-3 shrink-0">
            {showLiveDot && (
              <span className="relative h-2 w-2 inline-flex shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ backgroundColor: '#00ff88' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }}
                />
              </span>
            )}
            {rightSlot}
          </div>

        </div>
      </div>

      {/* Subtle bottom glow line */}
      <div className="glow-line" />
    </div>
  );
}
