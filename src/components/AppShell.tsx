'use client';
import { usePathname } from 'next/navigation';
import { NavRail } from './NavRail';
import { MobileNav } from './MobileNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const isMap = pathname === '/map';
  const showNav = !isLanding && !isMap;

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
