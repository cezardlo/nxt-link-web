'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { href: '/map',         label: 'MAP',         icon: '◎', color: '#00d4ff' },
  { href: '/industries',  label: 'EXPLORE',     icon: '⬡', color: '#ffd700' },
  { href: '/signals',     label: 'SIGNALS',     icon: '◈', color: '#ffb800' },
  { href: '/vendors',     label: 'VENDORS',     icon: '◆', color: '#f97316' },
  { href: '/opportunities', label: 'OPPS',      icon: '△', color: '#00ff88' },
];

export function NavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

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
    <nav className="fixed left-0 top-0 bottom-0 z-20 w-14 bg-black/80 backdrop-blur-xl border-r border-white/[0.06] hidden md:flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <Link
        href="/"
        className="mb-4 flex items-center justify-center w-8 h-8 rounded-full border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 transition-all duration-300 group"
        title="NXT//LINK"
      >
        <span
          className="font-mono text-[11px] font-bold text-[#00d4ff]/60 group-hover:text-[#00d4ff] transition-colors"
        >
          N
        </span>
      </Link>

      {/* Divider */}
      <div className="w-5 h-px bg-white/[0.08] mb-2" />

      {/* Nav items */}
      {NAV_ITEMS.map((item, i) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all duration-200 group hover:bg-white/[0.04]"
            style={{
              backgroundColor: isActive ? `${item.color}10` : undefined,
            }}
            title={`${item.label} (Ctrl+${i + 1})`}
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
              className="font-mono text-[5px] tracking-[0.2em] uppercase mt-0.5 transition-colors duration-200"
              style={{ color: isActive ? `${item.color}90` : 'rgba(255,255,255,0.12)' }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Bottom: Auth + System Status */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="w-5 h-px bg-white/[0.06]" />

        {/* Auth button */}
        {!authLoading && (
          user ? (
            <button
              onClick={async () => { await signOut(); router.push('/'); }}
              className="w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all group hover:bg-white/[0.04]"
              title={`Sign out (${user.email ?? ''})`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center border border-[#00d4ff]/25 bg-[#00d4ff]/[0.08] group-hover:border-[#00d4ff]/50 transition-colors"
              >
                <span className="font-mono text-[9px] font-bold text-[#00d4ff]/70 group-hover:text-[#00d4ff] transition-colors">
                  {(user.email?.[0] ?? 'U').toUpperCase()}
                </span>
              </div>
              <span className="font-mono text-[5px] tracking-[0.2em] text-white/12 mt-0.5 group-hover:text-white/25 transition-colors">OUT</span>
            </button>
          ) : (
            <Link
              href="/auth"
              className="w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all group hover:bg-white/[0.04]"
              title="Sign in"
            >
              <span className="font-mono text-[12px] text-white/20 group-hover:text-[#00d4ff]/60 transition-colors">⊙</span>
              <span className="font-mono text-[5px] tracking-[0.2em] text-white/12 mt-0.5 group-hover:text-white/25 transition-colors">LOGIN</span>
            </Link>
          )
        )}

        <Link
          href="/platform/status"
          className="w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all group hover:bg-white/[0.04]"
          title="System Status"
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
          <span className="font-mono text-[5px] tracking-[0.2em] text-white/12 mt-1 group-hover:text-white/25 transition-colors">SYS</span>
        </Link>
      </div>
    </nav>
  );
}
