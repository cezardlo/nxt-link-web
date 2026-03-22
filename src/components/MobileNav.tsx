'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MobileTab = {
  href: string;
  label: string;
  icon: string;
  color: string;
};

const MOBILE_TABS: MobileTab[] = [
  { href: '/map',         label: 'MAP',     icon: '◎', color: '#00d4ff' },
  { href: '/explore',  label: 'EXPLORE', icon: '⬡', color: '#ffd700' },
  { href: '/opportunities', label: 'OPPS',  icon: '△', color: '#00ff88' },
  { href: '/vendors',     label: 'VENDORS', icon: '◆', color: '#f97316' },
  { href: '/signals',     label: 'SIGNALS', icon: '◈', color: '#ffb800' },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: '8px', minHeight: '56px' }}
    >
      {MOBILE_TABS.map(tab => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[44px]"
          >
            {/* Icon */}
            <span
              className="text-[18px] transition-all duration-200"
              style={{
                color: active ? tab.color : 'rgba(255,255,255,0.25)',
                textShadow: active ? `0 0 10px ${tab.color}60` : 'none',
              }}
            >
              {tab.icon}
            </span>

            {/* Label */}
            <span
              className="font-mono text-[7px] tracking-[0.15em] uppercase transition-colors duration-200"
              style={{ color: active ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.25)' }}
            >
              {tab.label}
            </span>

            {/* Active underline bar */}
            {active && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full"
                style={{
                  width: '16px',
                  backgroundColor: tab.color,
                  boxShadow: `0 0 6px ${tab.color}80`,
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
