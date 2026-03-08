'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/map',           label: 'MAP',      icon: '◎', color: '#00d4ff' },
  { href: '/universe',      label: 'UNIVERSE', icon: '⊛', color: '#a855f7' },
  { href: '/radar',         label: 'RADAR',    icon: '◉', color: '#ff3b30' },
  { href: '/industries',    label: 'EXPLORE',  icon: '⬡', color: '#ffd700' },
  { href: '/vendors',       label: 'VENDORS',  icon: '◆', color: '#f97316' },
  { href: '/solve',         label: 'SOLVE',    icon: '△', color: '#00ff88' },
  { href: '/innovation',    label: 'CYCLE',    icon: '⟳', color: '#a855f7' },
  { href: '/signals',       label: 'SIGNALS',  icon: '◈', color: '#ffb800' },
  { href: '/ops',           label: 'OPS',      icon: '⊕', color: '#f97316' },
  { href: '/command',       label: 'CMD',      icon: '⌖', color: '#ff3b30' },
  { href: '/conferences',   label: 'EVENTS',   icon: '▣', color: '#00d4ff' },
];

export function NavRail() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= NAV_ITEMS.length) {
        e.preventDefault();
        router.push(NAV_ITEMS[idx - 1].href);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-20 w-16 bg-black/80 backdrop-blur-xl border-r border-white/[0.06] hidden md:flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <Link
        href="/"
        className="mb-5 flex items-center justify-center w-9 h-9 rounded-full border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 transition-all duration-300 group"
        style={{ boxShadow: '0 0 12px rgba(0,212,255,0.05)' }}
        title="NXT//LINK"
      >
        <span
          className="font-mono text-[12px] font-bold text-[#00d4ff]/60 group-hover:text-[#00d4ff] transition-colors"
          style={{ textShadow: '0 0 8px rgba(0,212,255,0.3)' }}
        >
          N
        </span>
      </Link>

      {/* Divider */}
      <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />

      {/* Nav items */}
      {NAV_ITEMS.map((item, i) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-all duration-200 group hover:bg-white/[0.04]"
            style={{
              backgroundColor: isActive ? `${item.color}10` : undefined,
            }}
            title={`${item.label} (Ctrl+${i + 1})`}
          >
            {/* Active indicator bar */}
            {isActive && (
              <div
                className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }}
              />
            )}

            {/* Icon */}
            <span
              className="text-[16px] transition-all duration-200"
              style={{
                color: isActive ? item.color : 'rgba(255,255,255,0.25)',
                textShadow: isActive ? `0 0 10px ${item.color}60` : 'none',
              }}
            >
              {item.icon}
            </span>

            {/* Label */}
            <span
              className="font-mono text-[6px] tracking-[0.2em] uppercase mt-0.5 transition-colors duration-200"
              style={{ color: isActive ? `${item.color}90` : 'rgba(255,255,255,0.12)' }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Bottom: System Status */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <Link
          href="/platform/status"
          className="w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-all group hover:bg-white/[0.04]"
          style={{
            backgroundColor: pathname.startsWith('/platform') ? 'rgba(0,255,136,0.08)' : undefined,
          }}
          title="System Status"
        >
          <div className="relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#00ff88', boxShadow: '0 0 8px #00ff88aa' }}
            />
            <div
              className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: '#00ff88', opacity: 0.4 }}
            />
          </div>
          <span className="font-mono text-[6px] tracking-[0.2em] text-white/15 mt-1.5 group-hover:text-white/30 transition-colors">SYS</span>
        </Link>
      </div>
    </nav>
  );
}
