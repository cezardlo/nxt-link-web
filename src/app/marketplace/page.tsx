'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Filter,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRoundCog,
} from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import {
  COMPANY_PROFILE_STORAGE_KEY,
  canonicalIndustryLabel,
  companyDomain,
  companyInitials,
  industryAccent,
  inferSolutionCategories,
  normalizeSolutionCategory,
  type SavedCompanyProfile,
} from '@/lib/marketplace/company-profile';

type ViewMode = 'companies' | 'products';

type Vendor = {
  id: string;
  company_name: string;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
  iker_score: number | null;
  credibility_score: number | null;
  tags: string[] | null;
  industries: string[] | null;
};

type MarketplaceProduct = {
  id: string;
  name: string;
  company: string;
  category: string;
  description: string;
  priceEstimate: string;
  priceRange?: string | null;
  deploymentTimeline: string;
  maturity: string;
  bestFor: string[];
  recommendationScore: number;
  isNxtPick: boolean;
};

type VendorsResponse = {
  vendors: Vendor[];
  total: number;
};

type ProductsResponse = {
  products: MarketplaceProduct[];
  total: number;
};

function CompanyLogo({ vendor }: { vendor: Vendor }) {
  const [failed, setFailed] = useState(false);
  const domain = companyDomain(vendor.company_url);
  const accent = industryAccent(vendor.sector);

  if (domain && !failed) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={`${vendor.company_name} logo`}
        width={56}
        height={56}
        className="h-14 w-14 rounded-full border border-white/10 bg-white object-contain p-2"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-full border text-sm font-bold"
      style={{ color: accent, borderColor: `${accent}55`, background: `${accent}18` }}
    >
      {companyInitials(vendor.company_name)}
    </div>
  );
}

function CompanyCard({ vendor }: { vendor: Vendor }) {
  const accent = industryAccent(vendor.sector);
  const industry = canonicalIndustryLabel(vendor.sector);
  const location = [vendor.hq_city, vendor.hq_country].filter(Boolean).join(', ');
  const categories = inferSolutionCategories([
    vendor.primary_category,
    ...(vendor.tags || []),
  ], 3);

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] transition hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.04]">
      <div
        className="h-20 border-b border-white/[0.06]"
        style={{ background: `linear-gradient(120deg, ${accent}28, rgba(255,255,255,0.02) 62%, ${accent}12)` }}
      />
      <div className="px-5 pb-5">
        <div className="-mt-7 flex items-end justify-between gap-4">
          <CompanyLogo vendor={vendor} />
          {(vendor.iker_score || vendor.credibility_score) ? (
            <div className="rounded-full border border-white/[0.08] bg-nxt-bg/90 px-3 py-1 font-mono text-xs text-nxt-muted">
              NXT {Math.round(vendor.iker_score || vendor.credibility_score || 0)}
            </div>
          ) : null}
        </div>

        <h2 className="mt-4 text-lg font-semibold text-white">{vendor.company_name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-nxt-dim">
          <span style={{ color: accent }}>{industry}</span>
          {location && <span>{location}</span>}
        </div>

        <p className="mt-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-nxt-secondary">
          {vendor.description || 'Company profile is being completed with products, capabilities, industries served, and proof.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[11px] text-nxt-muted">
              {category}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="text-xs text-nxt-dim">Products · Proof · Use cases</span>
          <Link href={`/vendor/${vendor.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-nxt-accent-light">
            View company <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const category = normalizeSolutionCategory(product.category);

  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-nxt-accent-light">{product.company}</div>
          <h2 className="mt-2 text-lg font-semibold text-white">{product.name}</h2>
        </div>
        {product.isNxtPick && (
          <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">NXT PICK</span>
        )}
      </div>
      <p className="mt-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-nxt-secondary">{product.description}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-nxt-muted">
        <span className="rounded-full bg-white/[0.04] px-3 py-1">{category}</span>
        <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.priceRange || product.priceEstimate}</span>
        <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.deploymentTimeline}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(product.bestFor || []).slice(0, 3).map((item) => (
          <span key={item} className="rounded-md border border-white/[0.05] px-2 py-1 text-[10px] text-nxt-dim">{item}</span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <span className="font-mono text-xs text-nxt-muted">Fit score {product.recommendationScore}/100</span>
        <Link href={`/products/${product.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-nxt-accent-light">
          View specs <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default function MarketplacePage() {
  const [view, setView] = useState<ViewMode>('companies');
  const [profile, setProfile] = useState<SavedCompanyProfile | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [vendorTotal, setVendorTotal] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);
    if (!raw) return;
    try {
      const nextProfile = JSON.parse(raw) as SavedCompanyProfile;
      setProfile(nextProfile);
      if (nextProfile.role === 'buyer') setIndustry(nextProfile.industry || '');
    } catch {
      window.localStorage.removeItem(COMPANY_PROFILE_STORAGE_KEY);
    }
  }, []);

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    const vendorParams = new URLSearchParams({ limit: '24', sort: 'score' });
    const productParams = new URLSearchParams({ limit: '24', sort: 'nxt-recommended' });
    if (search) {
      vendorParams.set('search', search);
      productParams.set('search', search);
    }
    if (industry) vendorParams.set('sector', industry);

    try {
      const [vendorResponse, productResponse] = await Promise.all([
        fetch(`/api/vendors?${vendorParams.toString()}`),
        fetch(`/api/products?${productParams.toString()}`),
      ]);
      const vendorData = await vendorResponse.json() as VendorsResponse;
      const productData = await productResponse.json() as ProductsResponse;
      setVendors(vendorData.vendors || []);
      setProducts(productData.products || []);
      setVendorTotal(vendorData.total || 0);
      setProductTotal(productData.total || 0);
    } finally {
      setLoading(false);
    }
  }, [industry, search]);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  const personalizedLabel = useMemo(() => {
    if (!profile || profile.role !== 'buyer') return null;
    return `${profile.companyName} · ${profile.industry}`;
  }, [profile]);

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-nxt-bg px-4 py-8 pb-24 text-nxt-text sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-9">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-nxt-accent-light">Company-first marketplace</p>
                <h1 className="mt-4 max-w-4xl text-[clamp(2.8rem,6vw,5.8rem)] font-bold leading-[0.93] tracking-[-0.055em] text-white">
                  Find the company. Understand the solution. Compare with confidence.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-nxt-secondary sm:text-lg">
                  Every company follows the same structure: profile, products, case studies, industries served, use cases, specifications, and contact flow.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-nxt-accent-light" /> Personalized marketplace
                </div>
                <p className="mt-2 text-sm leading-6 text-nxt-muted">
                  {personalizedLabel ? `Showing a marketplace shaped around ${personalizedLabel}.` : 'Create a customer or vendor company profile so the marketplace can organize itself around your industry and goals.'}
                </p>
                <Link href="/company-profile" className="mt-4 inline-flex items-center gap-2 rounded-full border border-nxt-accent/30 px-4 py-2 text-sm font-semibold text-nxt-accent-light">
                  <UserRoundCog className="h-4 w-4" /> {profile ? 'Edit company profile' : 'Create company profile'}
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex w-fit rounded-full border border-white/[0.08] bg-nxt-bg p-1">
                <button type="button" onClick={() => setView('companies')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view === 'companies' ? 'bg-nxt-accent text-white' : 'text-nxt-muted'}`}>
                  <Building2 className="h-4 w-4" /> Companies <span className="font-mono text-xs opacity-70">{vendorTotal}</span>
                </button>
                <button type="button" onClick={() => setView('products')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view === 'products' ? 'bg-nxt-accent text-white' : 'text-nxt-muted'}`}>
                  <Package className="h-4 w-4" /> Products <span className="font-mono text-xs opacity-70">{productTotal}</span>
                </button>
              </div>

              <div className="flex w-full max-w-2xl gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nxt-dim" />
                  <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }} placeholder="Search a problem, product, technology, or company" className="w-full rounded-xl border border-white/[0.09] bg-nxt-bg py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-nxt-dim focus:border-nxt-accent/50" />
                </div>
                <button type="button" onClick={submitSearch} className="rounded-xl bg-nxt-accent px-5 py-3 text-sm font-semibold text-white">Search</button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-nxt-muted"><SlidersHorizontal className="h-3.5 w-3.5" /> Industry</span>
              {['', 'Logistics', 'Manufacturing', 'AI / ML', 'Cybersecurity', 'Border Tech'].map((option) => (
                <button key={option || 'all'} type="button" onClick={() => setIndustry(option)} className={`rounded-full border px-3 py-1.5 text-xs transition ${industry === option ? 'border-nxt-accent/50 bg-nxt-accent/12 text-white' : 'border-white/[0.07] text-nxt-dim hover:text-white'}`}>
                  {option || 'All industries'}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{view === 'companies' ? 'Companies that solve the problem' : 'Products and solutions'}</h2>
              <p className="mt-1 text-sm text-nxt-dim">{view === 'companies' ? 'Start with the company, then explore its products, proof, industries, and use cases.' : 'Compare standardized product information and open the company behind it.'}</p>
            </div>
            <div className="hidden items-center gap-2 text-xs text-nxt-dim sm:flex"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Standardized profiles</div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.025] py-24 text-center text-sm text-nxt-dim">Loading marketplace...</div>
          ) : view === 'companies' ? (
            vendors.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{vendors.map((vendor) => <CompanyCard key={vendor.id} vendor={vendor} />)}</div> : <div className="mt-5 rounded-3xl border border-white/[0.08] py-24 text-center text-nxt-dim"><Filter className="mx-auto mb-3 h-8 w-8" />No companies match these filters.</div>
          ) : (
            products.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-5 rounded-3xl border border-white/[0.08] py-24 text-center text-nxt-dim">No products match this search.</div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
