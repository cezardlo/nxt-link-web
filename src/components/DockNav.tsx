'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TranslateButton } from './TranslateButton';

const NAV_ITEMS = [
  { href: '/briefing', label: 'Briefing' },
  { href: '/intel', label: 'Signals' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/products', label: 'Products' },
  { href: '/industry', label: 'Industries' },
  { href: '/conferences', label: 'Events' },
  { href: '/map', label: 'Map' },
  { href: '/solve', label: 'Solve' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/briefing') return pathname === '/' || pathname === '/briefing';
  return pathname === href || pathname.startsWith(href + '/');
}

export function DockNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] glass">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-nxt-accent flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-grotesk font-semibold text-sm text-nxt-text tracking-tight">
            NXT<span className="text-nxt-muted mx-0.5">{'//'}</span>LINK
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  active
                    ? 'text-nxt-text bg-nxt-elevated'
                    : 'text-nxt-muted hover:text-nxt-secondary hover:bg-nxt-surface'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <TranslateButton />
          <div className="w-px h-5 bg-nxt-border" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-nxt-green live-pulse" />
            <span className="text-xs text-nxt-muted font-mono">LIVE</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
