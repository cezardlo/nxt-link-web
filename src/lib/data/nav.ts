// ─── NXT//LINK Navigation ─────────────────────────────────────────────────────

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/briefing', label: 'BRIEFING', icon: '◎', color: '#00d4ff', description: 'Top 3 intelligence today' },
  { href: '/intel',    label: 'SIGNALS',  icon: '◇', color: '#ffd700', description: 'Browse all signals' },
  { href: '/vendors',  label: 'VENDORS',  icon: '▦', color: '#3b82f6', description: 'Vendor directory' },
];

export const INDUSTRIES = [
  { id: 'manufacturing', label: 'Manufacturing', icon: '▣', color: '#00ff88', desc: 'Production, robotics, automation' },
  { id: 'logistics',     label: 'Logistics',     icon: '⬡', color: '#ffd700', desc: 'Supply chain, freight, warehousing' },
] as const;

export type IndustryId = (typeof INDUSTRIES)[number]['id'];
