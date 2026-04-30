import Link from 'next/link';
import { ArrowRight, ClipboardCheck, Search, Target } from 'lucide-react';

const topFive = ['Machine vision', 'Warehouse robotics', 'AI planning', 'IoT sensors', 'Workflow software'];

export function BrandKitHero() {
  return (
    <section className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#101810] px-4 pb-16 pt-20 text-[#f3efe6] sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-[0.18]" aria-hidden="true">
        <div className="absolute left-[8%] top-0 h-full w-px bg-[#c7d3bf]" />
        <div className="absolute right-[13%] top-0 h-full w-px bg-[#c7d3bf]" />
        <div className="absolute left-0 top-[64%] h-px w-full bg-[#c7d3bf]" />
        <div className="absolute right-[9%] top-[10%] h-52 w-52 rounded-full border border-[#c7d3bf]" />
        <div className="absolute right-[9%] top-[24%] h-52 w-52 rounded-full border border-[#c7d3bf]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-9rem)] max-w-[1240px] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
        <div className="flex min-h-[620px] flex-col justify-between py-4">
          <div className="flex items-center gap-4 text-[#c7d3bf]">
            <div className="relative h-9 w-14">
              <span className="absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c7d3bf]" />
              <span className="absolute left-6 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c7d3bf]" />
            </div>
            <div className="font-serif text-xl tracking-tight">NXT LINK</div>
          </div>

          <div>
            <div className="mb-8 flex items-end gap-5">
              <div className="hidden font-mono text-[11px] uppercase tracking-[0.34em] text-[#9eaa98] [writing-mode:vertical-rl] sm:block">
                Personal brand / tech facilitator
              </div>
              <div>
                <p className="mb-4 max-w-xl font-mono text-[11px] uppercase tracking-[0.28em] text-[#9eaa98]">
                  Brand kit / 2026 / Industrial technology selection
                </p>
                <h1 className="font-serif text-[clamp(4.5rem,16vw,14rem)] font-semibold leading-[0.78] tracking-[-0.06em] text-[#f3efe6]">
                  NXT<br />LINK
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-xl leading-8 text-[#c7d3bf] sm:text-2xl">
              We hunt down the right machines, software, robotics, AI tools, and vendors, then narrow the market to 5 best-fit options your team can test before buying.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20vendors"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f3efe6] px-6 py-3 text-sm font-semibold text-[#101810] transition hover:bg-[#c7d3bf]"
              >
                Find My Top 5 Vendors
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c7d3bf]/45 px-6 py-3 text-sm font-semibold text-[#f3efe6] transition hover:border-[#f3efe6]"
              >
                See the buying system
              </Link>
            </div>
          </div>
        </div>

        <div className="relative pb-4 lg:pb-14">
          <div className="mb-8 flex justify-end font-mono text-[11px] uppercase tracking-[0.34em] text-[#9eaa98]">
            <span>Complete identity system / 01 / 10</span>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-[#c7d3bf]/18 bg-[#f3efe6] p-5 text-[#101810] shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
              <div className="mb-8 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#65705f]">Market chaos</div>
                <Search className="h-5 w-5 text-[#101810]" />
              </div>
              <div className="space-y-2">
                {['Google tabs', 'Trade shows', 'Sales decks', 'Old vendors', 'Excel notes'].map((item) => (
                  <div key={item} className="rounded-full border border-[#d8d3c7] px-3 py-2 text-sm text-[#4d5648]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#c7d3bf]/18 bg-[#172116] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9eaa98]">NXT output</div>
                  <h2 className="mt-2 font-serif text-4xl leading-none text-[#f3efe6]">Top 5<br />to test</h2>
                </div>
                <Target className="h-7 w-7 text-[#c7d3bf]" />
              </div>
              <div className="space-y-2">
                {topFive.map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-full bg-[#f3efe6]/8 px-4 py-3 text-sm text-[#dfe7d8]">
                    <span>{item}</span>
                    <span className="font-mono text-[#c7d3bf]">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[2rem] border border-[#c7d3bf]/18 bg-[#f3efe6] p-5 text-[#101810]">
            <div className="grid gap-4 sm:grid-cols-3">
              {['Tell us the problem', 'We hunt the market', 'You test before buying'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#101810] px-4 py-3 text-sm font-semibold text-[#f3efe6]">
                  <ClipboardCheck className="h-4 w-4 text-[#c7d3bf]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
