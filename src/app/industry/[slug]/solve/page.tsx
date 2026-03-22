'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { INDUSTRIES } from '@/lib/data/technology-catalog';
import { ProblemSolver } from '@/components/ProblemSolver';
import { PageTopBar } from '@/components/PageTopBar';

export default function IndustrySolvePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const industry = INDUSTRIES.find((i) => i.slug === slug);

  if (!industry) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="font-mono text-[10px] text-white/30 tracking-[0.3em]">INDUSTRY NOT FOUND</div>
          <Link href="/explore" className="font-mono text-[9px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors">
            ← BACK TO INDUSTRIES
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen dot-grid">
      <PageTopBar
        backHref={`/industry/${slug}`}
        backLabel={industry.label}
        breadcrumbs={[
          { label: 'INDUSTRIES', href: '/explore' },
          { label: industry.label, href: `/industry/${slug}` },
          { label: 'PROBLEM SOLVER' }
        ]}
      />

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-sans text-lg tracking-wider text-white/90">
            {industry.label.toUpperCase()} PROBLEM SOLVER
          </h1>
          <p className="font-mono text-[9px] text-white/30 max-w-xl leading-relaxed">
            Describe a problem your company is facing. NXT LINK will analyze it against {industry.label.toLowerCase()} technologies,
            real products, and local vendor capabilities to generate a structured recommendation.
          </p>
        </div>

        {/* Solver */}
        <ProblemSolver
          industrySlug={slug}
          industryLabel={industry.label}
          accentColor={industry.color}
        />

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
          <span className="font-mono text-[8px] tracking-wider text-white/15">
            NXT LINK — {industry.label.toUpperCase()} PROBLEM SOLVER
          </span>
          <span className="font-mono text-[8px] text-white/10">
            AI-powered analysis
          </span>
        </div>
      </div>
    </div>
  );
}
