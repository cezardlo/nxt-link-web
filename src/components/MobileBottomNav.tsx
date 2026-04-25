'use client';

import { NavBar } from '@/components/ui/tubelight-navbar';
import {
  Home,
  Newspaper,
  TrendingUp,
  Radio,
  Building2,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'HOME', url: '/', icon: Home },
  { name: 'BRIEF', url: '/briefing', icon: Newspaper },
  { name: 'MARKETS', url: '/markets', icon: TrendingUp },
  { name: 'SIGNALS', url: '/intel', icon: Radio },
  { name: 'VENDORS', url: '/vendors', icon: Building2 },
];

export function MobileNav() {
  return (
    <NavBar
      items={NAV_ITEMS}
      className="lg:hidden"
    />
  );
}
