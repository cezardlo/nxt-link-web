'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Check,
  MapPin,
  PackageSearch,
  Sparkles,
  Store,
  Warehouse,
} from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { INDUSTRIES } from '@/lib/data/sector-mapping';
import {
  BUYER_USE_CASE_OPTIONS,
  COMPANY_PROFILE_STORAGE_KEY,
  COMPANY_TYPE_OPTIONS,
  SOLUTION_CATEGORY_OPTIONS,
  type CompanyAccountRole,
  type SavedCompanyProfile,
} from '@/lib/marketplace/company-profile';

function ChoiceChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-left text-sm transition ${
        active
          ? 'border-nxt-accent/60 bg-nxt-accent/15 text-white'
          : 'border-white/[0.08] bg-white/[0.025] text-nxt-muted hover:border-white/[0.18] hover:text-white'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {active && <Check className="h-3.5 w-3.5 text-nxt-accent-light" />}
        {children}
      </span>
    </button>
  );
}

function RoleCard({
  active,
  role,
  title,
  description,
  icon: Icon,
  onSelect,
}: {
  active: boolean;
  role: CompanyAccountRole;
  title: string;
  description: string;
  icon: typeof Warehouse;
  onSelect: (role: CompanyAccountRole) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      aria-pressed={active}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? 'border-nxt-accent/60 bg-nxt-accent/10 shadow-lg shadow-nxt-accent/10'
          : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.18] hover:bg-white/[0.04]'
      }`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-nxt-accent text-white' : 'bg-white/[0.06] text-nxt-muted'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-4 text-base font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-nxt-muted">{description}</p>
    </button>
  );
}

export default function CompanyProfileSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<CompanyAccountRole>('buyer');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Logistics');
  const [companyType, setCompanyType] = useState(COMPANY_TYPE_OPTIONS[0]);
  const [location, setLocation] = useState('El Paso, TX');
  const [interests, setInterests] = useState<string[]>([]);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);
    if (!stored) return;

    try {
      const profile = JSON.parse(stored) as SavedCompanyProfile;
      setRole(profile.role || 'buyer');
      setCompanyName(profile.companyName || '');
      setIndustry(profile.industry || 'Logistics');
      setCompanyType(profile.companyType || COMPANY_TYPE_OPTIONS[0]);
      setLocation(profile.location || 'El Paso, TX');
      setInterests(profile.interests || []);
      setUseCases(profile.useCases || []);
    } catch {
      window.localStorage.removeItem(COMPANY_PROFILE_STORAGE_KEY);
    }
  }, []);

  function toggleValue(value: string, current: string[], setCurrent: (next: string[]) => void) {
    setCurrent(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function saveProfile() {
    const profile: SavedCompanyProfile = {
      role,
      companyName: companyName.trim(),
      industry,
      companyType,
      location: location.trim(),
      interests,
      useCases,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setSaved(true);
    window.setTimeout(() => router.push('/marketplace?personalized=1'), 350);
  }

  const canSave = companyName.trim().length >= 2 && Boolean(industry) && Boolean(companyType);

  return (
    <PageTransition>
      <main className="min-h-screen bg-nxt-bg px-4 py-8 pb-24 text-nxt-text sm:px-6">
        <div className="mx-auto max-w-5xl">
          <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-nxt-accent-light">Company profile</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-white sm:text-6xl">
                  Make the marketplace fit your company.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-nxt-secondary">
                  Tell NXT Link what your company does and what you need. We use it to organize companies, products, and recommendations around you.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm leading-6 text-nxt-muted lg:max-w-sm">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-nxt-accent-light" /> Personalized discovery
                </div>
                <p className="mt-2">Your industry and interests become the default filters when you browse the marketplace.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <RoleCard
                active={role === 'buyer'}
                role="buyer"
                title="We are looking for solutions"
                description="Create a customer profile and automatically see companies and products that fit your industry and use cases."
                icon={Warehouse}
                onSelect={setRole}
              />
              <RoleCard
                active={role === 'vendor'}
                role="vendor"
                title="We provide solutions"
                description="Create the foundation for a company page with products, industries served, use cases, and proof."
                icon={Store}
                onSelect={setRole}
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Building2 className="h-4 w-4 text-nxt-accent-light" /> Company name
                </span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Example: Borderplex Distribution"
                  className="w-full rounded-xl border border-white/[0.09] bg-nxt-bg px-4 py-3 text-sm text-white outline-none placeholder:text-nxt-dim focus:border-nxt-accent/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <MapPin className="h-4 w-4 text-nxt-accent-light" /> Main location
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City, state or region"
                  className="w-full rounded-xl border border-white/[0.09] bg-nxt-bg px-4 py-3 text-sm text-white outline-none placeholder:text-nxt-dim focus:border-nxt-accent/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 text-sm font-semibold text-white">Industry</span>
                <select
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-nxt-bg px-4 py-3 text-sm text-white outline-none focus:border-nxt-accent/50"
                >
                  {INDUSTRIES.map((option) => (
                    <option key={option.slug} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 text-sm font-semibold text-white">Company type</span>
                <select
                  value={companyType}
                  onChange={(event) => setCompanyType(event.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-nxt-bg px-4 py-3 text-sm text-white outline-none focus:border-nxt-accent/50"
                >
                  {COMPANY_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <PackageSearch className="h-4 w-4 text-nxt-accent-light" />
                {role === 'buyer' ? 'Solutions you want to discover' : 'Solutions your company provides'}
              </div>
              <p className="mt-1 text-xs text-nxt-dim">Choose all that apply. These become clean, standardized marketplace categories.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SOLUTION_CATEGORY_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option}
                    active={interests.includes(option)}
                    onClick={() => toggleValue(option, interests, setInterests)}
                  >
                    {option}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="text-sm font-semibold text-white">
                {role === 'buyer' ? 'What success looks like' : 'Problems you help customers solve'}
              </div>
              <p className="mt-1 text-xs text-nxt-dim">Use cases make matching more useful than searching by product name alone.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {BUYER_USE_CASE_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option}
                    active={useCases.includes(option)}
                    onClick={() => toggleValue(option, useCases, setUseCases)}
                  >
                    {option}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-nxt-dim">
                This first version saves your marketplace preferences on this device. Account-based syncing can use the same profile structure next.
              </p>
              <button
                type="button"
                onClick={saveProfile}
                disabled={!canSave}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-nxt-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-nxt-accent-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saved ? 'Profile saved' : 'Save and personalize'}
                {saved ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
