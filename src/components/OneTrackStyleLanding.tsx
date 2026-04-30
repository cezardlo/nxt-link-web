import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  BrainCircuit,
  Building2,
  Camera,
  CheckCircle2,
  Factory,
  FileSearch,
  Radar,
  Search,
  ShieldCheck,
  Truck,
  Wifi,
} from 'lucide-react';

const techTypes = ['Robotics', 'AI software', 'Machine vision', 'Warehouse tech', 'IoT sensors', 'Manufacturing systems'];

const reportRows = [
  { vendor: 'Vendor 01', role: 'Best fit', fit: 94, pilot: '2 weeks' },
  { vendor: 'Vendor 02', role: 'Fast pilot', fit: 90, pilot: '10 days' },
  { vendor: 'Vendor 03', role: 'Best integration', fit: 86, pilot: '3 weeks' },
  { vendor: 'Vendor 04', role: 'Cost control', fit: 82, pilot: '2 weeks' },
  { vendor: 'Vendor 05', role: 'Backup', fit: 78, pilot: '4 weeks' },
];

const workflow = [
  { step: '01', title: 'Tell us the problem', body: 'One operation. One goal. One buying decision.', icon: Radar },
  { step: '02', title: 'We hunt the market', body: 'We find the strongest vendors beyond the obvious names.', icon: Search },
  { step: '03', title: 'You test the Top 5', body: 'Your team pilots before the budget is locked.', icon: BadgeCheck },
];

const useCases = [
  { title: 'Robotics', icon: Bot },
  { title: 'Machine vision', icon: Camera },
  { title: 'AI software', icon: BrainCircuit },
  { title: 'Warehouse tech', icon: Boxes },
  { title: 'IoT sensors', icon: Wifi },
  { title: 'Manufacturing systems', icon: Factory },
];

const trustItems = ['Transparent criteria', 'Buyer-first guidance', 'Pilot before purchase', 'Top 5 shortlist'];

function CtaButton({ children, dark = false, href = 'mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20vendors' }: { children: ReactNode; dark?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
        dark
          ? 'bg-[#101810] text-[#f6f1e8] hover:bg-[#233022]'
          : 'bg-[#f6f1e8] text-[#101810] hover:bg-[#c8d6bf]'
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SectionLabel({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`font-mono text-[11px] uppercase tracking-[0.24em] ${dark ? 'text-[#9eaa98]' : 'text-[#65705f]'}`}>{children}</p>;
}

export function OneTrackStyleLanding() {
  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[#101810]">
      <div className="fixed bottom-16 left-1/2 z-[80] w-[min(520px,calc(100%-1rem))] -translate-x-1/2 rounded-2xl border border-[#d7d0c2] bg-[#f6f1e8]/92 p-2 shadow-[0_18px_60px_rgba(16,24,16,0.18)] backdrop-blur-xl md:bottom-4 md:rounded-full">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate pl-3 text-sm font-semibold">Need the right vendor?</p>
          <CtaButton dark>Find Top 5</CtaButton>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#101810] px-4 pb-16 pt-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-[0.14]" aria-hidden="true">
          <div className="absolute left-[9%] top-0 h-full w-px bg-[#c8d6bf]" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-[#c8d6bf]" />
          <div className="absolute left-0 top-[67%] h-px w-full bg-[#c8d6bf]" />
          <div className="absolute right-[8%] top-[12%] h-64 w-64 rounded-full border border-[#c8d6bf]" />
          <div className="absolute right-[8%] top-[28%] h-64 w-64 rounded-full border border-[#c8d6bf]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1240px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="mb-10 flex items-center gap-4 text-[#c8d6bf]">
              <div className="relative h-9 w-14">
                <span className="absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c8d6bf]" />
                <span className="absolute left-6 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c8d6bf]" />
              </div>
              <span className="font-serif text-xl tracking-tight">NXT LINK</span>
            </div>

            <SectionLabel dark>Industrial tech buying</SectionLabel>
            <h1 className="mt-5 max-w-5xl font-serif text-[clamp(4rem,11vw,10rem)] font-semibold leading-[0.82] tracking-[-0.06em]">
              We hunt. You test. Buy smarter.
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-8 text-[#c8d6bf] sm:text-2xl">
              We find the Top 5 vendors for machines, robotics, AI, software, and industrial solutions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaButton>Find My Top 5</CtaButton>
              <Link href="/vendors" className="inline-flex items-center justify-center rounded-full border border-[#c8d6bf]/45 px-5 py-3 text-sm font-semibold text-[#f6f1e8] transition hover:border-[#f6f1e8]">
                Browse Vendors
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
            <div id="intake" className="rounded-[2rem] bg-[#f6f1e8] p-5 text-[#101810] shadow-[0_35px_110px_rgba(0,0,0,0.28)]">
              <SectionLabel>Start</SectionLabel>
              <h2 className="mt-3 font-serif text-4xl leading-none">What are you buying?</h2>
              <div className="mt-5 grid gap-2">
                {techTypes.map((type) => (
                  <Link key={type} href={`mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20${encodeURIComponent(type)}%20vendors`} className="flex items-center justify-between rounded-2xl border border-[#ded7c9] bg-white/60 px-4 py-3 text-sm font-semibold transition hover:bg-white">
                    <span>{type}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#c8d6bf]/20 bg-[#172116] p-4 shadow-[0_35px_110px_rgba(0,0,0,0.3)]">
              <div className="mb-4 flex items-center justify-between px-2 pt-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9eaa98]">Shortlist</p>
                  <h2 className="mt-2 font-serif text-4xl text-[#f6f1e8]">Top 5</h2>
                </div>
                <FileSearch className="h-6 w-6 text-[#c8d6bf]" />
              </div>
              <div className="space-y-3">
                {reportRows.map((row) => (
                  <div key={row.vendor} className="rounded-2xl bg-[#f6f1e8]/8 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9eaa98]">{row.vendor}</p>
                        <h3 className="mt-1 font-semibold text-[#f6f1e8]">{row.role}</h3>
                      </div>
                      <span className="rounded-full bg-[#f6f1e8] px-3 py-1 font-mono text-sm font-semibold text-[#101810]">{row.fit}%</span>
                    </div>
                    <p className="mt-2 text-xs text-[#c8d6bf]">Pilot: {row.pilot}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#65705f]">
          <span>Logistics</span>
          <span>Manufacturing</span>
          <span>Warehouses</span>
          <span>Supply chain</span>
          <span>Operations</span>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <SectionLabel>The problem</SectionLabel>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-7xl">Too many vendors. Not enough proof.</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Google overload', 'Spreadsheet chaos', 'Sales demos', 'Wrong purchases'].map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-[#ded7c9] bg-white/60 p-5 text-lg font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-24 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <SectionLabel dark>How it works</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-7xl">From market chaos to five real options.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] p-6">
                  <div className="mb-10 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9eaa98]">{item.step}</span>
                    <Icon className="h-6 w-6 text-[#c8d6bf]" />
                  </div>
                  <h3 className="font-serif text-3xl text-[#f6f1e8]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#c8d6bf]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <SectionLabel>Categories</SectionLabel>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-7xl">What we hunt.</h2>
            </div>
            <Link href="/vendors" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d7d0c2] px-5 py-3 text-sm font-semibold">
              Vendor catalog <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={`mailto:hello@nxtlinktech.com?subject=Start%20a%20${encodeURIComponent(item.title)}%20vendor%20hunt`} className="group rounded-[1.5rem] border border-[#ded7c9] bg-white/55 p-6 transition hover:-translate-y-1 hover:bg-white">
                  <Icon className="h-7 w-7 text-[#101810]" />
                  <h3 className="mt-10 font-serif text-3xl text-[#101810]">{item.title}</h3>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#65705f] group-hover:text-[#101810]">
                    Start hunt <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-24 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div>
            <SectionLabel dark>Trust</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-7xl">Test before it eats your budget.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trustItems.map((item) => (
              <div key={item} className="flex min-h-28 items-start gap-3 rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] p-5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#c8d6bf]" />
                <span className="text-sm font-semibold leading-7 text-[#f6f1e8]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 rounded-[2rem] border border-[#ded7c9] bg-white/60 p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
          <div>
            <SectionLabel>Get started</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-7xl">Send one problem.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#4d5648]">We will return the hunt path and the Top 5 shortlist direction.</p>
          </div>
          <div className="flex flex-col gap-3">
            <CtaButton dark>Start Vendor Hunt</CtaButton>
            <Link href="/briefing" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#101810]/20 px-5 py-3 text-sm font-semibold">
              Briefing <Truck className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
