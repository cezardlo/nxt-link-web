// ─── NXT//LINK Navigation ─────────────────────────────────────────────────────

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/briefing',    label: 'BRIEFING',    icon: '◎', color: '#00d4ff', description: 'Supply chain intelligence' },
  { href: '/map',         label: 'MAP',         icon: '◇', color: '#ffd700', description: 'Global signal map' },
  { href: '/conferences', label: 'EVENTS',      icon: '◆', color: '#00ff88', description: 'Industry conferences' },
  { href: '/industry',    label: 'INDUSTRY',    icon: '◫', color: '#a855f7', description: 'Sector intelligence' },
  { href: '/vendors',     label: 'VENDORS',     icon: '▦', color: '#3b82f6', description: 'Vendor intelligence' },
];

export const INDUSTRIES = [
  { id: 'manufacturing', label: 'Manufacturing', icon: '▣', color: '#00ff88', desc: 'Production, robotics, automation' },
  { id: 'logistics',     label: 'Logistics',     icon: '⬡', color: '#ffd700', desc: 'Supply chain, freight, warehousing' },
] as const;

export type IndustryId = (typeof INDUSTRIES)[number]['id'];
