'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageTopBar } from '@/components/PageTopBar';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductCard = {
  id: string;
  name: string;
  company: string;
  companyUrl: string | null;
  category: string;
  description: string;
  techScore: number;   // 0–100 signal strength / IKER
  status: 'live' | 'emerging' | 'declining';
  tags: string[];
  isFeatured?: boolean;
};

// ── Hardcoded product intelligence (editorial — used as fallback + seed) ──────

const FEATURED_PRODUCTS: ProductCard[] = [
  {
    id: 'patriot-pac3',
    name: 'Patriot PAC-3 MSE',
    company: 'Raytheon Technologies',
    companyUrl: 'https://www.rtx.com',
    category: 'Missile Defense',
    description: 'Terminal phase missile defense system deployed at Fort Bliss. Provides theater-wide protection with hit-to-kill technology.',
    techScore: 97,
    status: 'live',
    tags: ['Defense', 'Interceptor', 'Fort Bliss'],
    isFeatured: true,
  },
  {
    id: 'ivas-hololens',
    name: 'IVAS Integrated Visual Augmentation',
    company: 'L3Harris / Microsoft',
    companyUrl: 'https://www.l3harris.com',
    category: 'Augmented Reality',
    description: 'Next-generation AR headset for dismounted soldiers. Night vision, thermal, terrain mapping fused into single device.',
    techScore: 91,
    status: 'live',
    tags: ['AR/VR', 'Soldier Systems', 'Army'],
    isFeatured: true,
  },
  {
    id: 'gcss-army',
    name: 'GCSS-Army ERP Platform',
    company: 'SAIC',
    companyUrl: 'https://www.saic.com',
    category: 'Logistics IT',
    description: 'Enterprise Resource Planning system managing Army supply chain, maintenance, and property accountability across all installations.',
    techScore: 89,
    status: 'live',
    tags: ['ERP', 'Supply Chain', 'Army IT'],
    isFeatured: true,
  },
  {
    id: 'crowdstrike-falcon',
    name: 'Falcon XDR Platform',
    company: 'CrowdStrike',
    companyUrl: 'https://www.crowdstrike.com',
    category: 'Cybersecurity',
    description: 'AI-native endpoint detection and response platform. Used across DoD and enterprise. 2024 signal: major federal contract expansion.',
    techScore: 95,
    status: 'live',
    tags: ['XDR', 'AI Security', 'DoD'],
    isFeatured: true,
  },
  {
    id: 'anduril-lattice',
    name: 'Lattice AI OS',
    company: 'Anduril Industries',
    companyUrl: 'https://www.anduril.com',
    category: 'Defense AI',
    description: 'Autonomous AI operating system for border security, counter-drone, and battlefield awareness. Active on US southern border.',
    techScore: 93,
    status: 'live',
    tags: ['Autonomous', 'Border Security', 'Counter-UAS'],
    isFeatured: true,
  },
  {
    id: 'palantir-aip',
    name: 'Palantir AIP',
    company: 'Palantir Technologies',
    companyUrl: 'https://www.palantir.com',
    category: 'Intelligence Platform',
    description: 'AI-powered operations platform for government and enterprise. Integrates LLMs with classified data pipelines for decision superiority.',
    techScore: 94,
    status: 'live',
    tags: ['AI', 'Government', 'Analytics'],
    isFeatured: true,
  },
  {
    id: 'boston-dynamics-spot',
    name: 'Spot Enterprise Robot',
    company: 'Boston Dynamics',
    companyUrl: 'https://www.bostondynamics.com',
    category: 'Robotics',
    description: 'Agile mobile robot for industrial inspection, security patrol, and hazardous environment operations. Now with AI vision capabilities.',
    techScore: 88,
    status: 'live',
    tags: ['Robotics', 'Inspection', 'Autonomy'],
  },
  {
    id: 'nvidia-dgx',
    name: 'DGX H100 AI Supercomputer',
    company: 'NVIDIA',
    companyUrl: 'https://www.nvidia.com',
    category: 'AI Infrastructure',
    description: 'Purpose-built AI training system. 640 PFLOPS of AI compute. DoD and intelligence community deploying for classified AI workloads.',
    techScore: 98,
    status: 'live',
    tags: ['GPU', 'AI Training', 'HPC'],
  },
  {
    id: 'c3ai-suite',
    name: 'C3.ai Enterprise Suite',
    company: 'C3.ai',
    companyUrl: 'https://c3.ai',
    category: 'Industrial AI',
    description: 'Pre-built AI applications for predictive maintenance, supply chain optimization, and sensor analytics across industrial operations.',
    techScore: 82,
    status: 'emerging',
    tags: ['Predictive Maintenance', 'Manufacturing', 'ML'],
  },
  {
    id: 'cognex-vision',
    name: 'In-Sight Vision System',
    company: 'Cognex',
    companyUrl: 'https://www.cognex.com',
    category: 'Computer Vision',
    description: 'Industrial machine vision for quality inspection, barcode reading, and precision measurement. Deployed in El Paso manufacturing corridor.',
    techScore: 85,
    status: 'live',
    tags: ['Computer Vision', 'Quality Control', 'Manufacturing'],
  },
  {
    id: 'siemens-mindsphere',
    name: 'MindSphere Industrial IoT',
    company: 'Siemens',
    companyUrl: 'https://www.siemens.com',
    category: 'Industrial IoT',
    description: 'Cloud-based industrial IoT platform connecting factory assets, enabling predictive analytics and digital twin modeling.',
    techScore: 87,
    status: 'live',
    tags: ['IIoT', 'Digital Twin', 'Factory'],
  },
  {
    id: 'dragos-platform',
    name: 'Dragos OT Security Platform',
    company: 'Dragos',
    companyUrl: 'https://www.dragos.com',
    category: 'OT Cybersecurity',
    description: 'Industrial control system security monitoring and threat hunting. Protects critical infrastructure from nation-state and criminal actors.',
    techScore: 90,
    status: 'live',
    tags: ['ICS', 'Critical Infrastructure', 'Threat Intel'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  'Missile Defense':      '#f97316',
  'Augmented Reality':    '#00d4ff',
  'Logistics IT':         '#00ff88',
  'Cybersecurity':        '#ff3b30',
  'OT Cybersecurity':     '#ff3b30',
  'Defense AI':           '#00d4ff',
  'Intelligence Platform':'#00d4ff',
  'Robotics':             '#ec4899',
  'AI Infrastructure':    '#00d4ff',
  'Industrial AI':        '#00ff88',
  'Computer Vision':      '#a855f7',
  'Industrial IoT':       '#14b8a6',
};

function catColor(cat: string): string {
  return CATEGORY_COLOR[cat] ?? '#6b7280';
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function statusBadge(s: ProductCard['status']): { label: string; color: string } {
  switch (s) {
    case 'live':     return { label: 'ACTIVE', color: '#00ff88' };
    case 'emerging': return { label: 'EMERGING', color: '#ffb800' };
    case 'declining':return { label: 'DECLINING', color: '#ff3b30' };
  }
}

// ── Score ring component ──────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? '#00ff88' : score >= 75 ? '#00d4ff' : score >= 60 ? '#ffb800' : '#ff3b30';
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
      <svg className="absolute inset-0" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        <circle
          cx="16" cy="16" r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
      <span className="font-mono text-[10px] tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Product card component ────────────────────────────────────────────────────

function ProductCardComponent({ product }: { product: ProductCard }) {
  const color = catColor(product.category);
  const domain = extractDomain(product.companyUrl);
  const badge = statusBadge(product.status);
  const initials = product.company.slice(0, 2).toUpperCase();

  return (
    <div
      className="relative flex flex-col bg-black/80 border border-white/[0.15] rounded-sm overflow-hidden
                 hover:border-white/[0.30] transition-all duration-200 group"
      style={{ boxShadow: product.isFeatured ? `0 0 20px ${color}18` : 'none' }}
    >
      {/* Card header — logo + gradient backdrop */}
      <div
        className="relative h-28 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}0a 0%, transparent 60%)` }}
      >
        {/* Top-right featured badge */}
        {product.isFeatured && (
          <div
            className="absolute top-2 right-2 font-mono text-[6px] tracking-[0.2em] px-2 py-0.5 border rounded-sm"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
          >
            FEATURED
          </div>
        )}

        {/* Category glow dot */}
        <div
          className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}cc` }}
        />

        {/* Company logo — large favicon */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden border"
            style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
          >
            {domain ? (
              <img
                src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
                alt={product.company}
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.style.display = 'none';
                  const p = t.parentElement;
                  if (p) p.innerHTML = `<span style="font-family:monospace;font-size:18px;color:${color}99">${initials}</span>`;
                }}
              />
            ) : (
              <span className="font-mono text-lg" style={{ color: `${color}99` }}>{initials}</span>
            )}
          </div>
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/65 text-center px-2 line-clamp-1">
            {product.company}
          </span>
        </div>

        {/* Scan line effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px opacity-30"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Product name */}
        <div className="font-mono text-[11px] text-white/80 font-medium leading-tight group-hover:text-white transition-colors">
          {product.name}
        </div>

        {/* Category + status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="font-mono text-[7px] tracking-[0.12em] px-1.5 py-0.5 border rounded-sm uppercase"
            style={{ color, borderColor: `${color}35`, backgroundColor: `${color}0c` }}
          >
            {product.category}
          </span>
          <span
            className="font-mono text-[7px] tracking-[0.12em] px-1.5 py-0.5 border rounded-sm"
            style={{ color: badge.color, borderColor: `${badge.color}30`, backgroundColor: `${badge.color}08` }}
          >
            {badge.label}
          </span>
        </div>

        {/* Description */}
        <p className="font-mono text-[8px] text-white/60 leading-relaxed line-clamp-3 flex-1">
          {product.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-auto pt-1">
          {product.tags.map((tag) => (
            <span key={tag} className="font-mono text-[6px] tracking-wide text-white/55 px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.14] rounded-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.12]">
        <ScoreRing score={product.techScore} />
        <div className="flex items-center gap-2">
          {product.companyUrl && (
            <a
              href={product.companyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[8px] text-white/50 hover:text-[#00d4ff] transition-colors"
            >
              SITE ↗
            </a>
          )}
          <span className="font-mono text-[8px] text-white/45">IKER {product.techScore}</span>
        </div>
      </div>
    </div>
  );
}

// ── Vendor-sourced product cards from Supabase ────────────────────────────────

type VendorRow = {
  id: number;
  company_name: string | null;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  extraction_confidence: number | null;
};

function vendorToProduct(v: VendorRow): ProductCard {
  return {
    id: `vendor-${v.id}`,
    name: v.company_name ?? 'Unknown Product',
    company: v.company_name ?? 'Unknown',
    companyUrl: v.company_url,
    category: v.primary_category ?? 'Enterprise Tech',
    description: v.description ?? 'Registered technology vendor in the NXT//LINK ecosystem.',
    techScore: Math.round((v.extraction_confidence ?? 0.7) * 100),
    status: 'live',
    tags: [v.primary_category ?? 'Tech'].filter(Boolean),
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ProductsContent() {
  const [vendors, setVendors] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    const supabase = getSupabaseClient();

    supabase
      .from('vendors')
      .select('id, company_name, company_url, description, primary_category, extraction_confidence')
      .eq('status', 'approved')
      .order('extraction_confidence', { ascending: false })
      .limit(48)
      .then(({ data }) => {
        if (data) setVendors((data as VendorRow[]).map(vendorToProduct));
        setLoading(false);
      });
  }, []);

  const allProducts = [...FEATURED_PRODUCTS, ...vendors];

  const categories = ['ALL', ...Array.from(new Set(allProducts.map((p) => p.category))).sort()];

  const filtered = allProducts.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    const matchCat = activeFilter === 'ALL' || p.category === activeFilter;
    return matchSearch && matchCat;
  });

  const featured = filtered.filter((p) => p.isFeatured);
  const rest = filtered.filter((p) => !p.isFeatured);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden dot-grid">
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'PRODUCT INTELLIGENCE' }]}
        showLiveDot={true}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[8px] tracking-[0.2em] text-white/60">
              {filtered.length} PRODUCTS
            </span>
            <a href="/vendors" className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">
              VENDORS ↗
            </a>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-6">

          {/* Header */}
          <div className="py-5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-mono text-[14px] tracking-[0.3em] text-white/85 uppercase">
                  PRODUCT INTELLIGENCE
                </h1>
                <p className="font-mono text-[8px] tracking-[0.15em] text-white/50 mt-1">
                  Technology products active in the El Paso defense & industrial corridor
                </p>
              </div>
              {!loading && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: '0 0 6px #00ff88cc' }} />
                  <span className="font-mono text-[8px] tracking-[0.2em] text-[#00ff88]/60">LIVE REGISTRY</span>
                </div>
              )}
            </div>
          </div>

          {/* Search + filters */}
          <div className="py-4 border-b border-white/[0.06]">
            <div className="relative mb-3">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/25 tracking-[0.25em] pointer-events-none">SRCH</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, companies, categories..."
                className="w-full bg-transparent font-mono text-[11px] text-white/70 placeholder-white/20
                           pl-10 pb-2 outline-none border-b border-white/[0.08]
                           focus:border-[#00d4ff]/40 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/25 hover:text-white/50 transition-colors">
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const color = cat === 'ALL' ? '#00d4ff' : catColor(cat);
                const isActive = activeFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className="font-mono text-[8px] tracking-[0.12em] px-2.5 py-1 border uppercase transition-all"
                    style={{
                      borderColor: isActive ? `${color}55` : 'rgba(255,255,255,0.07)',
                      color: isActive ? color : 'rgba(255,255,255,0.28)',
                      backgroundColor: isActive ? `${color}12` : 'transparent',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Featured row */}
          {featured.length > 0 && (
            <div className="py-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[8px] tracking-[0.3em] text-[#00d4ff]/60 uppercase">FEATURED INTELLIGENCE</span>
                <div className="flex-1 h-px bg-[#00d4ff]/10" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {featured.map((p) => <ProductCardComponent key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {/* All products */}
          {rest.length > 0 && (
            <div className="pb-8">
              {featured.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-mono text-[8px] tracking-[0.3em] text-white/55 uppercase">ALL PRODUCTS</span>
                  <div className="flex-1 h-px bg-white/[0.12]" />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {rest.map((p) => <ProductCardComponent key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && filtered.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 py-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-64 bg-white/[0.02] border border-white/[0.05] rounded-sm shimmer" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-mono text-[9px] tracking-[0.2em] text-white/25 uppercase">
                No products match your search
              </p>
              <button
                onClick={() => { setSearch(''); setActiveFilter('ALL'); }}
                className="mt-4 font-mono text-[8px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff]/60
                           border border-white/[0.08] hover:border-[#00d4ff]/30 px-4 py-2 transition-all uppercase"
              >
                Clear Filters
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ProductsContent />
    </Suspense>
  );
}
