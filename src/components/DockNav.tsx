'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TranslateButton } from './TranslateButton';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/briefing', label: 'Briefing' },
  { href: '/markets', label: 'Markets' },
  { href: '/intel', label: 'Signals' },
  { href: '/vendors', label: 'Vendors' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function DockNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className={`fixed left-0 right-0 top-0 z-[100] ${isHome ? 'px-4 pt-4 sm:px-6' : 'glass'}`}>
      <div className={`${isHome ? 'mx-auto max-w-[1110px] rounded-full border border-[#e2e6f2] bg-white/92 px-5 shadow-[0_18px_55px_rgba(52,64,110,0.14)] backdrop-blur-xl sm:px-6' : 'mx-auto max-w-[1240px] px-4 sm:px-6'}`}>
        <div className="flex h-16 items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isHome ? 'border-[#dbe1f2] bg-[#f4f6fb]' : 'border-[rgba(138,160,255,0.22)] bg-[linear-gradient(180deg,rgba(88,113,255,0.26),rgba(88,113,255,0.12))]'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isHome ? '#11155f' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className={`font-grotesk text-sm font-semibold tracking-tight ${isHome ? 'text-[#11155f]' : 'text-nxt-text'}`}>
              NXT<span className={isHome ? 'mx-0.5 text-[#9aa2bd]' : 'mx-0.5 text-nxt-muted'}>{'//'}</span>LINK
            </div>
            <div className={`hidden font-mono text-[10px] uppercase tracking-[0.22em] sm:block ${isHome ? 'text-[#8b93ad]' : 'text-nxt-dim'}`}>
              Tech selection guide
            </div>
          </div>
        </Link>

        <div className={`hidden items-center gap-1 rounded-full border p-1 lg:flex ${isHome ? 'border-[#edf0f7] bg-[#f8f9fd]' : 'border-nxt-border bg-[rgba(9,14,26,0.72)]'}`}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  isHome
                    ? active
                      ? 'bg-[#11155f] text-white shadow-sm'
                      : 'text-[#4d557b] hover:bg-white hover:text-[#11155f]'
                    : active
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
          {!isHome && <TranslateButton />}
          {!isHome && <div className="hidden h-5 w-px bg-nxt-border sm:block" />}
          {isHome ? (
            <Link
              href="mailto:hello@nxtlinktech.com?subject=Find%20my%20top%205%20vendors"
              className="hidden rounded-full bg-[#11155f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d2382] sm:inline-flex"
            >
              Find vendors
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-[rgba(39,209,127,0.18)] bg-[rgba(39,209,127,0.08)] px-2.5 py-1">
              <div className="h-2 w-2 rounded-full bg-nxt-green live-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-nxt-secondary">Live</span>
            </div>
          )}
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
                  isHome
                    ? active
                      ? 'bg-[#11155f] text-white'
                      : 'border border-[#e2e6f2] text-[#4d557b]'
                    : active
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
