import { ArrowRight } from 'lucide-react';
import { BrandKitHero } from '@/components/BrandKitHero';

export function StickyLandingCta() {
  return (
    <>
      <BrandKitHero />
      <div className="fixed bottom-16 left-1/2 z-[90] w-[min(680px,calc(100%-1rem))] -translate-x-1/2 rounded-2xl border border-[#dfe4f3] bg-white/92 p-2 text-[#111641] shadow-[0_18px_60px_rgba(52,64,110,0.2)] backdrop-blur-xl md:bottom-4 md:rounded-full">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 px-2 md:pl-4">
            <p className="truncate text-sm font-semibold text-[#11155f]">Need to buy tech without guessing?</p>
            <p className="truncate text-xs text-[#6c7392]">We hunt the market and bring back 5 vendors to test.</p>
          </div>
          <a
            href="mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20vendors"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#11155f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d2382] md:rounded-full"
          >
            Find My Top 5
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </>
  );
}
