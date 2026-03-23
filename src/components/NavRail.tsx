'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/data/nav';

const SHORTCUT_COUNT = NAV_ITEMS.length; // all 5

export function NavRail() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= SHORTCUT_COUNT) {
        e.preventDefault();
        router.push(NAV_ITEMS[idx - 1].href);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-20 w-14 bg-black/80 backdrop-blur-xl border-r border-white/[0.06] hidden md:flex flex-col items-center py-4 gap-1" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <Link
        href="/solve"
        className="mb-4 flex items-center justify-center w-8 h-8 rounded-full border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 transition-all duration-300 group cursor-pointer"
        title="NXT//LINK"
        aria-label="Home"
      >
        <span className="font-mono text-[11px] font-bold text-[#00d4ff]/60 group-hover:text-[#00d4ff] transition-colors">
          N
        </span>
      </Link>

      {/* Divider */}
      <div className="w-5 h-px bg-white/[0.08] mb-2" />

      {/* 5 Core Pages */}
      {NAV_ITEMS.map((item, i) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all duration-200 group hover:bg-white/[0.04] cursor-pointer"
            style={{
              backgroundColor: isActive ? `${item.color}10` : undefined,
            }}
            title={`${item.label} (Ctrl+${i + 1})`}
            aria-label={item.label}
          >
            {/* Active indicator */}
            {isActive && (
              <div
                className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }}
              />
            )}

            {/* Icon */}
            <span
              className="text-[14px] transition-all duration-200"
              style={{
                color: isActive ? item.color : 'rgba(255,255,255,0.25)',
                textShadow: isActive ? `0 0 10px ${item.color}60` : 'none',
              }}
            >
              {item.icon}
            </span>

            {/* Label */}
            <span
              className="font-mono text-[7px] tracking-[0.2em] uppercase mt-0.5 transition-colors duration-200"
              style={{ color: isActive ? `${item.color}90` : 'rgba(255,255,255,0.22)' }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Bottom: System Status */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="w-5 h-px bg-white/[0.06]" />
        <Link
          href="/platform/status"
          className="w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all group hover:bg-white/[0.04] cursor-pointer"
          title="System Status"
          aria-label="System Status"
        >
          <div className="relative">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88aa' }}
            />
            <div
              className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: '#00ff88', opacity: 0.3 }}
            />
          </div>
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/22 mt-1 group-hover:text-white/25 transition-colors">SYS</span>
        </Link>
      </div>
    </nav>
  );
}
