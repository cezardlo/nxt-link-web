// ─── NXT//LINK Navigation — 5 Core Pages ─────────────────────────────────────

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/map',      label: 'WORLD',    icon: '◎', color: '#00d4ff', description: 'Global intelligence map' },
  { href: '/industry', label: 'INDUSTRY', icon: '◇', color: '#ffd700', description: 'Deep sector intelligence' },
  { href: '/solve',    label: 'SOLVE',    icon: '◆', color: '#ff6600', description: 'Problem → solution engine' },
  { href: '/industry', label: 'INDUSTRY', icon: '◫', color: '#00ff88', description: 'Deep sector intelligence' },
  { href: '/command',  label: 'COMMAND',  icon: '⬡', color: '#a855f7', description: 'Executive dashboard' },
];

/** Industry selector — shared by /solve (filter chips) and /industry (grid) */
export const INDUSTRIES = [
  { id: 'defense',       label: 'Defense',       icon: '◆', color: '#ff6600', desc: 'Military, government, Fort Bliss' },
  { id: 'ai-ml',         label: 'AI / ML',       icon: '◇', color: '#00d4ff', desc: 'Machine learning, automation, LLMs' },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: '◈', color: '#00d4ff', desc: 'Network security, compliance' },
  { id: 'manufacturing', label: 'Manufacturing', icon: '▣', color: '#00ff88', desc: 'Production, robotics, 3D printing' },
  { id: 'logistics',     label: 'Logistics',     icon: '⬡', color: '#ffd700', desc: 'Supply chain, freight, warehousing' },
  { id: 'energy',        label: 'Energy',        icon: '◉', color: '#ffd700', desc: 'Solar, grid, EV, utilities' },
  { id: 'healthcare',    label: 'Healthcare',    icon: '◎', color: '#00ff88', desc: 'Medical devices, biotech, pharma' },
  { id: 'border-tech',   label: 'Border Tech',   icon: '⊕', color: '#ff6600', desc: 'Cross-border, customs, trade' },
] as const;

export type IndustryId = (typeof INDUSTRIES)[number]['id'];
