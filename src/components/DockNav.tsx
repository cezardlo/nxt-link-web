'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TranslateButton } from './TranslateButton';

const NAV_ITEMS = [
  { href: '/briefing', label: 'Briefing' },
  { href: '/intel', label: 'Signals' },
  { href: '/vendors', label: 'Vendors' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/briefing') return pathname === '/' || pathname === '/briefing';
  return pathname === href || pathname.startsWith(href + '/');
}

export function DockNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] glass">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(138,160,255,0.22)] bg-[linear-gradient(180deg,rgba(88,113,255,0.26),rgba(88,113,255,0.12))]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-grotesk text-sm font-semibold tracking-tight text-nxt-text">
              NXT<span className="mx-0.5 text-nxt-muted">{'//'}</span>LINK
            </div>
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-nxt-dim sm:block">
              Global intelligence
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-nxt-border bg-[rgba(9,14,26,0.72)] p-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'bg-nxt-elevated text-nxt-text shadow-[inset_0_0_0_1px_rgba(138,160,255,0.12)]'
                    : 'text-nxt-muted hover:bg-nxt-surface hover:text-nxt-secondary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <TranslateButton />
          <div className="hidden h-5 w-px bg-nxt-border sm:block" />
          <div className="flex items-center gap-2 rounded-full border border-[rgba(39,209,127,0.18)] bg-[rgba(39,209,127,0.08)] px-2.5 py-1">
            <div className="h-2 w-2 rounded-full bg-nxt-green live-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-nxt-secondary">Live</span>
          </div>
        </div>
      </div>

        <div className="nav-scroll flex items-center gap-1 overflow-x-auto pb-3 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                  active
                    ? 'bg-nxt-elevated text-nxt-text shadow-[inset_0_0_0_1px_rgba(138,160,255,0.12)]'
                    : 'border border-nxt-border text-nxt-muted'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
