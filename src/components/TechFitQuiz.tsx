'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Bot, Cpu, Factory, PackageCheck, ScanLine, Wifi } from 'lucide-react';
import { MarketingDesignSections } from '@/components/MarketingDesignSections';

const options = [
  {
    label: 'Robotics',
    icon: Bot,
    result: 'We map robot types, floor constraints, safety needs, integration risk, and the vendors worth testing on site.',
  },
  {
    label: 'AI software',
    icon: Cpu,
    result: 'We define the business outcome first, then compare AI tools by data fit, workflow fit, security, and pilot speed.',
  },
  {
    label: 'Inspection machines',
    icon: ScanLine,
    result: 'We hunt machine vision, automated inspection, and quality-control vendors that can prove accuracy before purchase.',
  },
  {
    label: 'Warehouse tech',
    icon: PackageCheck,
    result: 'We compare WMS, sensors, picking tools, automation, and robotics around throughput, labor savings, and rollout risk.',
  },
  {
    label: 'Manufacturing tools',
    icon: Factory,
    result: 'We narrow the market by production bottleneck, uptime, training load, total cost, and how fast your team can test it.',
  },
  {
    label: 'IoT / sensors',
    icon: Wifi,
    result: 'We find sensor and visibility systems that fit your environment, data needs, support model, and integration path.',
  },
];

export function TechFitQuiz() {
  const [selected, setSelected] = useState(options[0].label);
  const active = useMemo(() => options.find((option) => option.label === selected) ?? options[0], [selected]);

  return (
    <>
      <section className="bg-white px-4 py-20 text-[#111641] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7f86a8]">Quick fit check</div>
            <h2 className="mt-4 text-4xl font-semibold text-[#11155f] sm:text-5xl">What tech are you trying to buy?</h2>
            <p className="mt-5 text-base leading-8 text-[#5c6486]">
              Pick one. NXT Link turns that messy buying question into a clean hunt, a Top 5 shortlist, and a real test plan.
            </p>
          </div>

          <div className="rounded-[28px] border border-[#e1e5f0] bg-[#f8f9fd] p-4 shadow-[0_26px_80px_rgba(52,64,110,0.12)]">
            <div className="grid gap-2 sm:grid-cols-3">
              {options.map((option) => {
                const Icon = option.icon;
                const isActive = option.label === selected;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSelected(option.label)}
                    className={`flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-xs font-semibold transition ${
                      isActive
                        ? 'border-[#11155f] bg-[#11155f] text-white shadow-[0_16px_36px_rgba(17,21,95,0.2)]'
                        : 'border-[#e1e5f0] bg-white text-[#5c6486] hover:border-[#d15aa5] hover:text-[#11155f]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-white p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9aa2bd]">NXT Link would build</div>
                  <h3 className="mt-2 text-2xl font-semibold text-[#11155f]">A Top 5 {active.label} shortlist</h3>
                  <p className="mt-3 text-sm leading-7 text-[#5c6486]">{active.result}</p>
                </div>
                <a
                  href={`mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20${encodeURIComponent(active.label)}%20vendors`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d15aa5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#bf4593]"
                >
                  Start this hunt
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <MarketingDesignSections />
    </>
  );
}
