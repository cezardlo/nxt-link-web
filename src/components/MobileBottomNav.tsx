'use client';

import { NavBar } from '@/components/ui/tubelight-navbar';
import {
  Home,
  Newspaper,
  Radio,
  Globe,
  Lightbulb,
  Building2,
  Package,
  Factory,
  Network,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'HOME', url: '/', icon: Home },
  { name: 'BRIEF', url: '/briefing', icon: Newspaper },
  { name: 'INTEL', url: '/intel', icon: Radio },
  { name: 'MAP', url: '/map', icon: Globe },
  { name: 'SOLVE', url: '/solve', icon: Lightbulb },
  { name: 'VENDORS', url: '/vendors', icon: Building2 },
  { name: 'PRODUCTS', url: '/products', icon: Package },
  { name: 'INDUSTRY', url: '/industry', icon: Factory },
  { name: 'EXPLORE', url: '/explore', icon: Network },
];

export function MobileNav() {
  return (
    <NavBar
      items={NAV_ITEMS}
      className="lg:hidden"
    />
  );
}
