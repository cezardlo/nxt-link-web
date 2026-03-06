'use client';

import { AccordionSection } from '@/components/right-panel/shared/AccordionSection';
import { FeedsSection } from '@/components/right-panel/sections/FeedsSection';
import { SignalsFeed } from '@/components/SignalsFeed';
import { SectorMomentumBoard } from '@/components/SectorMomentumBoard';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import type { SectorScore } from '@/lib/intelligence/signal-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  sectorScores: SectorScore[];
};

// ─── IntelTab ─────────────────────────────────────────────────────────────────

export function IntelTab({ sectorScores }: Props) {
  return (
    <div className="flex flex-col">
      <AccordionSection title="FEEDS" defaultOpen={true} accentColor="#00d4ff">
        <FeedsSection />
      </AccordionSection>
      <AccordionSection title="SIGNALS" accentColor="#f97316">
        <SignalsFeed />
      </AccordionSection>
      <AccordionSection title="MOMENTUM" accentColor="#ffb800">
        <SectorMomentumBoard
          scores={sectorScores}
          vendors={Object.values(EL_PASO_VENDORS)}
        />
      </AccordionSection>
    </div>
  );
}
