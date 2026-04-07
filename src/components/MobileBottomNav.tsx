'use client';

import { NavBar } from '@/components/ui/tubelight-navbar';
import {
  Home,
  Newspaper,
  Radio,
  Globe,
  Lightbulb,
  Building2,
  Factory,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'HOME', url: '/', icon: Home },
  { name: 'BRIEF', url: '/briefing', icon: Newspaper },
  { name: 'INTEL', url: '/intel', icon: Radio },
  { name: 'MAP', url: '/map', icon: Globe },
  { name: 'SOLVE', url: '/solve', icon: Lightbulb },
  { name: 'VENDORS', url: '/vendors', icon: Building2 },
  { name: 'INDUSTRY', url: '/industry', icon: Factory },
];

export function MobileNav() {
  return (
    <NavBar
      items={NAV_ITEMS}
      className="lg:hidden"
    />
  );
}
