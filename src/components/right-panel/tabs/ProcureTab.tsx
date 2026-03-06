'use client';

import { AccordionSection } from '@/components/right-panel/shared/AccordionSection';
import { ContractsSection } from '@/components/right-panel/sections/ContractsSection';
import { OpportunitiesSection } from '@/components/right-panel/sections/OpportunitiesSection';
import { MarketSection } from '@/components/right-panel/sections/MarketSection';

// ─── ProcureTab ───────────────────────────────────────────────────────────────

export function ProcureTab() {
  return (
    <div className="flex flex-col">
      <AccordionSection title="CONTRACTS" defaultOpen={true} accentColor="#00ff88">
        <ContractsSection />
      </AccordionSection>
      <AccordionSection title="OPPORTUNITIES" accentColor="#00d4ff">
        <OpportunitiesSection />
      </AccordionSection>
      <AccordionSection title="MARKET" accentColor="#ffb800">
        <MarketSection />
      </AccordionSection>
    </div>
  );
}
