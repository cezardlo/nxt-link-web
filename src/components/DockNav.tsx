'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COLORS } from '@/lib/tokens';

const DOCK_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/map',
    label: 'Map',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="m9 4v13" /><path d="m15 7v13" />
      </svg>
    ),
  },
  {
    href: '/intel',
    label: 'Intel',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx={12} cy={12} r={2} /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
    ),
  },
  {
    href: '/solve',
    label: 'Ask',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={11} cy={11} r={8} /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: '/command',
    label: 'Command',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect width={18} height={18} x={3} y={3} rx={2} /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
  },
  {
    href: '/industry',
    label: 'Industries',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function DockNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-0.5 px-2 py-1.5 rounded-2xl"
      style={{
        background: `${COLORS.bg}d9`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${COLORS.border}40`,
      }}
    >
      {DOCK_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-[3px] px-3.5 py-[7px] rounded-[10px] transition-all duration-150"
            style={{
              color: active ? COLORS.accent : COLORS.dim,
              background: active ? `${COLORS.accent}0f` : 'transparent',
            }}
          >
            <span className="w-[18px] h-[18px]">{item.icon}</span>
            <span
              className="font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: '0.08em' }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
