import { ArrowRight } from 'lucide-react';

export function StickyLandingCta() {
  return (
    <div className="fixed bottom-4 left-1/2 z-[90] hidden w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-full border border-[#dfe4f3] bg-white/90 p-2 text-[#111641] shadow-[0_18px_60px_rgba(52,64,110,0.2)] backdrop-blur-xl md:block">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 pl-4">
          <p className="truncate text-sm font-semibold text-[#11155f]">Need to buy tech without guessing?</p>
          <p className="truncate text-xs text-[#6c7392]">We hunt the market and bring back 5 vendors to test.</p>
        </div>
        <a
          href="mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20vendors"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#11155f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d2382]"
        >
          Find My Top 5
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
