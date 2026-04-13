'use client';

import { IntelTreemap } from '@/components/IntelTreemap';

export default function MarketsPage() {
  return (
    <div className="min-h-screen bg-nxt-bg pt-24 pb-32 px-4 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-nxt-text tracking-tight">
            Where Markets Are Heading
          </h1>
          <p className="text-sm text-nxt-muted mt-1">
            Signal volume by sector — colored by momentum, sized by activity
          </p>
        </div>
        <IntelTreemap />
      </div>
    </div>
  );
}
