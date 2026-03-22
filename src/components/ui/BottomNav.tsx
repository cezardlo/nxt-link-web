'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COLORS } from '@/lib/tokens';

const TABS = [
  { href: '/',            label: 'TODAY',       icon: '◉' },
  { href: '/search',      label: 'SEARCH',      icon: '⌕' },
  { href: '/explore',  label: 'INDUSTRIES',  icon: '⬡' },
  { href: '/world',       label: 'WORLD',       icon: '◎' },
  { href: '/trajectory',  label: 'TRAJECTORY',  icon: '◇' },
  { href: '/marketplace', label: 'MARKET',      icon: '△' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-xl border-t flex items-center justify-around"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 4px)',
        minHeight: 52,
        background: `${COLORS.bg}f0`,
        borderTopColor: COLORS.border,
      }}
    >
      {TABS.map(tab => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-[44px] min-h-[44px] justify-center transition-all duration-200"
          >
            <span
              className="text-[14px] transition-all duration-200"
              style={{
                color: active ? COLORS.accent : `${COLORS.text}25`,
                textShadow: active ? `0 0 10px ${COLORS.accent}40` : 'none',
              }}
            >
              {tab.icon}
            </span>
            <span
              className="font-mono transition-colors duration-200"
              style={{
                fontSize: 6.5,
                letterSpacing: '0.12em',
                color: active ? `${COLORS.text}70` : `${COLORS.text}20`,
              }}
            >
              {tab.label}
            </span>
            {active && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full"
                style={{ backgroundColor: COLORS.accent, boxShadow: `0 0 8px ${COLORS.accent}50` }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
