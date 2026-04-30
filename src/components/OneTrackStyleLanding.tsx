import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Eye,
  Factory,
  FileSearch,
  Gauge,
  Layers3,
  Play,
  Radar,
  Route,
  Search,
  Truck,
  Wifi,
  Zap,
} from 'lucide-react';
import { VendorHuntForm } from '@/components/VendorHuntForm';

const reportRows = [
  { vendor: 'Pick 01', role: 'Best fit', fit: 94, pilot: '2 week pilot' },
  { vendor: 'Pick 02', role: 'Fastest test', fit: 90, pilot: '10 day demo' },
  { vendor: 'Pick 03', role: 'Easy install', fit: 86, pilot: '3 week trial' },
  { vendor: 'Pick 04', role: 'Best value', fit: 82, pilot: '2 week pilot' },
  { vendor: 'Pick 05', role: 'Backup option', fit: 78, pilot: '4 week trial' },
];

const workflow = [
  { step: '01', title: 'Tell us the pain', body: 'One problem. One line is enough.', icon: Radar },
  { step: '02', title: 'We hunt the market', body: 'We find the machines, apps, AI tools, and vendors worth testing.', icon: Search },
  { step: '03', title: 'You get the Top 5', body: 'No giant spreadsheet. Just the best options and why they fit.', icon: FileSearch },
  { step: '04', title: 'Test before buying', body: 'We guide demos, pilots, scorecards, and the final decision.', icon: BadgeCheck },
];

const useCases = [
  { title: 'Robots', caption: 'Picking, moving, sorting', icon: Bot },
  { title: 'Vision', caption: 'Inspection, cameras, QA', icon: Camera },
  { title: 'AI tools', caption: 'Planning, routing, agents', icon: BrainCircuit },
  { title: 'Warehouse tech', caption: 'WMS, TMS, scanning', icon: Boxes },
  { title: 'Sensors', caption: 'IoT, tracking, alerts', icon: Wifi },
  { title: 'Factory systems', caption: 'MES, machines, data', icon: Factory },
];

const statCards = [
  { value: '5', label: 'best-fit vendors', note: 'shortlist, not noise' },
  { value: '8', label: 'week sprint', note: 'from pain to pilot plan' },
  { value: '0', label: 'guessing required', note: 'score it before you buy' },
  { value: '1', label: 'clear decision path', note: 'for ops, finance, and IT' },
];

const actionTiles = [
  { number: '01', title: 'Robot picker', meta: 'Demo ready', icon: Bot },
  { number: '02', title: 'Vision inspection', meta: 'Pilot script', icon: Eye },
  { number: '03', title: 'Warehouse AI', meta: 'Scorecard', icon: BrainCircuit },
  { number: '04', title: 'Machine sensor', meta: 'Risk check', icon: Gauge },
  { number: '05', title: 'Route optimizer', meta: 'Fit test', icon: Route },
  { number: '06', title: 'Factory software', meta: 'Buyer notes', icon: Layers3 },
];

const trustItems = ['Transparent criteria', 'Real pilots', 'Buyer-first guidance', 'No mystery picks'];
const marketDots = ['ERP', 'AMR', 'WMS', 'AI', 'IoT', 'Vision', 'MES', 'TMS', 'RPA', 'AGV', 'CMMS', 'PLC'];
const pilotSteps = ['Script', 'Demo', 'Test', 'Pick'];

function CtaButton({ children, dark = false, href = '#intake' }: { children: ReactNode; dark?: boolean; href?: string }) {
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

function RadarVisual() {
  return (
    <div className="relative min-h-[450px] overflow-hidden rounded-[2rem] border border-[#c8d6bf]/20 bg-[#172116] p-5 shadow-[0_35px_110px_rgba(0,0,0,0.3)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(200,214,191,0.16),transparent_34%),linear-gradient(135deg,rgba(246,241,232,0.06),transparent_40%)]" />
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8d6bf]/10" />
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8d6bf]/14" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8d6bf]/20" />
      <div className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 bg-[#c8d6bf]/10" />
      <div className="absolute left-1/2 top-1/2 h-[140%] w-px -translate-y-1/2 bg-[#c8d6bf]/10" />
      <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left animate-[spin_16s_linear_infinite] bg-[conic-gradient(from_0deg,rgba(200,214,191,0.3),transparent_36%)] opacity-80" />

      {marketDots.map((item, index) => {
        const positions = [
          'left-[12%] top-[18%]', 'left-[36%] top-[10%]', 'left-[68%] top-[18%]', 'left-[82%] top-[42%]',
          'left-[72%] top-[72%]', 'left-[42%] top-[82%]', 'left-[15%] top-[68%]', 'left-[24%] top-[43%]',
          'left-[52%] top-[30%]', 'left-[58%] top-[58%]', 'left-[36%] top-[60%]', 'left-[50%] top-[47%]',
        ];
        const selected = index > 6;
        return (
          <div key={item} className={`absolute ${positions[index]} -translate-x-1/2 -translate-y-1/2`}>
            <div className={`rounded-full border px-3 py-1.5 font-mono text-[10px] transition ${selected ? 'animate-pulse border-[#c8d6bf] bg-[#f6f1e8] text-[#101810] shadow-[0_0_28px_rgba(200,214,191,0.35)]' : 'border-[#c8d6bf]/20 bg-[#f6f1e8]/6 text-[#c8d6bf]'}`}>
              {item}
            </div>
          </div>
        );
      })}

      <div className="absolute left-5 top-5 rounded-full border border-[#c8d6bf]/15 bg-[#101810]/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8d6bf] backdrop-blur">
        Live vendor scan
      </div>

      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[#c8d6bf]/14 bg-[#101810]/82 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9eaa98]">Market chaos reduced</p>
            <h3 className="mt-1 font-serif text-3xl text-[#f6f1e8]">Thousands to 5</h3>
          </div>
          <span className="rounded-full bg-[#c8d6bf] px-3 py-1 font-mono text-sm font-bold text-[#101810]">Top 5</span>
        </div>
      </div>
    </div>
  );
}

function ShortlistPanel() {
  return (
    <div className="rounded-[2rem] border border-[#c8d6bf]/20 bg-[#172116] p-4 shadow-[0_35px_110px_rgba(0,0,0,0.3)]">
      <div className="mb-4 flex items-center justify-between px-2 pt-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9eaa98]">Decision pack</p>
          <h2 className="mt-2 font-serif text-4xl text-[#f6f1e8]">Top 5 to test</h2>
        </div>
        <FileSearch className="h-6 w-6 text-[#c8d6bf]" />
      </div>
      <div className="space-y-3">
        {reportRows.map((row, index) => (
          <div key={row.vendor} className="rounded-2xl bg-[#f6f1e8]/8 p-4 animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9eaa98]">{row.vendor} - {row.pilot}</p>
                <h3 className="mt-1 font-semibold text-[#f6f1e8]">{row.role}</h3>
              </div>
              <span className="rounded-full bg-[#f6f1e8] px-3 py-1 font-mono text-sm font-semibold text-[#101810]">{row.fit}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f6f1e8]/10">
              <div className="h-full rounded-full bg-[#c8d6bf] transition-all duration-700" style={{ width: `${row.fit}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChaosToFiveVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
      <div className="rounded-[2rem] border border-[#ded7c9] bg-white/60 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#65705f]">Before</p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {Array.from({ length: 24 }).map((_, index) => (
            <div key={index} className="h-10 rounded-xl border border-[#ded7c9] bg-[#f6f1e8] transition hover:scale-90 hover:opacity-20" style={{ opacity: 0.35 + (index % 5) * 0.12 }} />
          ))}
        </div>
        <h3 className="mt-6 font-serif text-4xl leading-none">Too many tabs.</h3>
      </div>

      <div className="hidden h-px w-16 bg-[#101810]/20 lg:block" />

      <div className="rounded-[2rem] bg-[#101810] p-6 text-[#f6f1e8]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9eaa98]">After</p>
        <div className="mt-5 space-y-3">
          {reportRows.map((row) => (
            <div key={row.vendor} className="flex items-center justify-between rounded-2xl bg-[#f6f1e8]/8 p-3 transition hover:translate-x-1 hover:bg-[#f6f1e8]/12">
              <span className="font-semibold">{row.vendor}</span>
              <span className="rounded-full bg-[#c8d6bf] px-3 py-1 font-mono text-xs font-bold text-[#101810]">{row.fit}%</span>
            </div>
          ))}
        </div>
        <h3 className="mt-6 font-serif text-4xl leading-none">Five to try.</h3>
      </div>
    </div>
  );
}

function PilotVisual() {
  return (
    <div className="rounded-[2rem] border border-[#c8d6bf]/14 bg-[#172116] p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {pilotSteps.map((step, index) => (
          <div key={step} className="rounded-2xl bg-[#f6f1e8]/8 p-4 transition hover:-translate-y-1 hover:bg-[#f6f1e8]/12">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c8d6bf] font-mono text-sm font-bold text-[#101810]">{index + 1}</div>
            <p className="mt-8 text-sm font-semibold text-[#f6f1e8]">{step}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-[#101810] p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#c8d6bf]">Ready to buy</span>
          <span className="font-mono text-xl font-bold text-[#f6f1e8]">94%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f6f1e8]/10">
          <div className="h-full w-[94%] rounded-full bg-[#c8d6bf]" />
        </div>
      </div>
    </div>
  );
}

function ActionArchive() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {actionTiles.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="group overflow-hidden rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] transition hover:-translate-y-1 hover:bg-[#1d2a1b]">
            <div className="relative h-44 border-b border-[#c8d6bf]/10 bg-[#101810] p-4">
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(200,214,191,0.12),transparent_40%),radial-gradient(circle_at_72%_35%,rgba(200,214,191,0.2),transparent_28%)]" />
              <div className="absolute inset-x-4 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#9eaa98]">
                <span>{item.number}</span>
                <span>{item.meta}</span>
              </div>
              <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#c8d6bf]/24 bg-[#f6f1e8]/8 text-[#c8d6bf] shadow-[0_0_60px_rgba(200,214,191,0.16)] transition group-hover:scale-110">
                <Icon className="h-9 w-9" />
              </div>
              <div className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f1e8] text-[#101810]">
                <Play className="h-4 w-4 fill-current" />
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-serif text-3xl text-[#f6f1e8]">{item.title}</h3>
              <p className="mt-2 text-sm text-[#c8d6bf]">Found, filtered, ready to test.</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OneTrackStyleLanding() {
  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[#101810]">
      <div className="fixed bottom-4 left-1/2 z-[80] hidden w-[min(520px,calc(100%-1rem))] -translate-x-1/2 rounded-full border border-[#d7d0c2] bg-[#f6f1e8]/92 p-2 shadow-[0_18px_60px_rgba(16,24,16,0.18)] backdrop-blur-xl md:block">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate pl-3 text-sm font-semibold">Need better tech?</p>
          <CtaButton dark>Find Top 5</CtaButton>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#101810] px-4 pb-16 pt-14 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-[0.14]" aria-hidden="true">
          <div className="absolute left-[9%] top-0 h-full w-px bg-[#c8d6bf]" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-[#c8d6bf]" />
          <div className="absolute left-0 top-[67%] h-px w-full bg-[#c8d6bf]" />
          <div className="absolute right-[8%] top-[12%] h-64 w-64 rounded-full border border-[#c8d6bf]" />
          <div className="absolute right-[8%] top-[28%] h-64 w-64 rounded-full border border-[#c8d6bf]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-[1240px] gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="animate-fade-up">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#c8d6bf]/18 bg-[#f6f1e8]/7 px-4 py-2 text-sm text-[#c8d6bf]">
              <Zap className="h-4 w-4" />
              Industrial tech buying, made simple.
            </div>
            <SectionLabel dark>/ 01 Vendor Hunt</SectionLabel>
            <h1 className="mt-5 max-w-5xl font-serif text-[clamp(4rem,10vw,9.2rem)] font-semibold leading-[0.84]">
              We hunt. You test. Buy smarter.
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-8 text-[#c8d6bf] sm:text-2xl">
              We find the vendors. You test the best 5 before buying.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaButton>Find My Top 5</CtaButton>
              <Link href="/vendors" className="inline-flex items-center justify-center rounded-full border border-[#c8d6bf]/45 px-5 py-3 text-sm font-semibold text-[#f6f1e8] transition hover:border-[#f6f1e8]">
                Browse Vendors
              </Link>
            </div>
          </div>

          <div id="intake" className="grid gap-4 scroll-mt-32 lg:grid-cols-[0.78fr_1.22fr]">
            <VendorHuntForm />
            <RadarVisual />
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 pb-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-3 md:grid-cols-4">
          {statCards.map((item) => (
            <div key={item.label} className="border-t border-[#c8d6bf]/18 py-6">
              <p className="font-serif text-6xl leading-none text-[#f6f1e8]">{item.value}</p>
              <p className="mt-3 font-semibold text-[#c8d6bf]">{item.label}</p>
              <p className="mt-1 text-sm text-[#9eaa98]">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#65705f]">
          <span>Warehouses</span>
          <span>Factories</span>
          <span>Logistics</span>
          <span>Operations</span>
          <span>Supply chain</span>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <SectionLabel>/ 02 The Problem</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-none sm:text-7xl">Companies keep buying the wrong tech.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4d5648]">Too many vendors. Too many demos. Too many spreadsheets. NXT Link turns the mess into a short list you can actually test.</p>
          <div className="mt-10">
            <ChaosToFiveVisual />
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#101810] px-4 py-24 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <SectionLabel dark>/ 03 Process</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-none sm:text-7xl">Easy mode for serious technology.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] p-6 transition hover:-translate-y-1 hover:bg-[#1d2a1b]">
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

      <section className="bg-[#101810] px-4 pb-24 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <SectionLabel dark>/ 04 In Action</SectionLabel>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-7xl">What we bring to you.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#c8d6bf]">Like a project manager for the vendor hunt: find it, filter it, test it, decide.</p>
          </div>
          <ActionArchive />
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionLabel>/ 05 Output</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-7xl">Your Top 5 pack.</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-[#4d5648]">A clean shortlist, fit scores, pilot notes, risks, and the next move.</p>
          </div>
          <ShortlistPanel />
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <SectionLabel>/ 06 Categories</SectionLabel>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-7xl">The right kind of tech.</h2>
            </div>
            <Link href="/vendors" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d7d0c2] px-5 py-3 text-sm font-semibold">
              Vendor catalog <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href="#intake" className="group rounded-[1.5rem] border border-[#ded7c9] bg-white/55 p-6 transition hover:-translate-y-1 hover:bg-white">
                  <Icon className="h-7 w-7 text-[#101810]" />
                  <h3 className="mt-10 font-serif text-3xl text-[#101810]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#65705f]">{item.caption}</p>
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
            <SectionLabel dark>/ 07 Pilot First</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-7xl">Try it before it eats your budget.</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-[#c8d6bf]">We help you run better demos and pilot tests before the purchase order.</p>
          </div>
          <PilotVisual />
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 rounded-[2rem] border border-[#ded7c9] bg-white/60 p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
          <div>
            <SectionLabel>/ 08 Start</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-7xl">Send one problem.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#f6f1e8] px-4 py-4 text-sm font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  {item}
                </div>
              ))}
            </div>
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
