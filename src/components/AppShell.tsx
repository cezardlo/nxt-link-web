'use client';
import { usePathname } from 'next/navigation';
import { NavRail } from './NavRail';
import { MobileNav } from './MobileNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Full-screen pages: /world (map) and /login (auth)
  const isFullscreen = pathname === '/world' || pathname.startsWith('/world/');
  const isAuth = pathname === '/login';
  const showNav = !isFullscreen && !isAuth;

  return (
    <>
      {showNav && <NavRail />}
      <div className={showNav ? 'md:pl-14' : ''}>
        {children}
      </div>
      {showNav && <MobileNav />}
    </>
  );
}
