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
  ClipboardCheck,
  Factory,
  FileSearch,
  Gauge,
  GitCompare,
  LockKeyhole,
  Radar,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Wifi,
  Wrench,
} from 'lucide-react';

const techTypes = ['Robotics', 'AI software', 'Machine vision', 'Warehouse tech', 'IoT sensors', 'Manufacturing systems'];

const reportRows = [
  { vendor: 'Vendor 01', role: 'Best technical fit', fit: 94, risk: 'Low', pilot: '2 weeks' },
  { vendor: 'Vendor 02', role: 'Fastest pilot path', fit: 90, risk: 'Low', pilot: '10 days' },
  { vendor: 'Vendor 03', role: 'Best integration', fit: 86, risk: 'Medium', pilot: '3 weeks' },
  { vendor: 'Vendor 04', role: 'Best cost control', fit: 82, risk: 'Medium', pilot: '2 weeks' },
  { vendor: 'Vendor 05', role: 'Backup option', fit: 78, risk: 'Medium', pilot: '4 weeks' },
];

const workflow = [
  {
    step: '01',
    title: 'Tell us the problem',
    body: 'We define the operational goal, constraints, budget pressure, timeline, users, and what proof would make the technology worth buying.',
    icon: ClipboardCheck,
  },
  {
    step: '02',
    title: 'We hunt the market',
    body: 'We search beyond Google, trade shows, familiar vendors, and sales emails to find machines, software, AI tools, robotics, sensors, and integrators.',
    icon: Radar,
  },
  {
    step: '03',
    title: 'You get the Top 5',
    body: 'The shortlist includes fit scores, risks, use case fit, integration notes, pilot readiness, and the next test to run.',
    icon: FileSearch,
  },
  {
    step: '04',
    title: 'You test before buying',
    body: 'We help guide demos, pilots, and decision checkpoints so your team buys with evidence instead of pressure.',
    icon: BadgeCheck,
  },
];

const useCases = [
  { title: 'Robotics', body: 'Floor fit, safety, labor gaps, ROI, support, and pilot plan.', icon: Bot },
  { title: 'Machine vision', body: 'Inspection accuracy, throughput, validation, training, and proof tests.', icon: Camera },
  { title: 'AI software', body: 'Data fit, workflow fit, security, hallucination risk, and real value.', icon: BrainCircuit },
  { title: 'Warehouse tech', body: 'WMS, picking tools, sensors, visibility, fleet tools, and labor impact.', icon: Boxes },
  { title: 'IoT sensors', body: 'Environment fit, data needs, integration, maintenance, and support.', icon: Wifi },
  { title: 'Manufacturing systems', body: 'Production, quality, uptime, inspection, maintenance, and rollout.', icon: Factory },
];

const scorecard = [
  ['Operational fit', 30],
  ['Integration fit', 20],
  ['Pilot readiness', 20],
  ['Total cost fit', 15],
  ['Vendor risk', 15],
];

const comparisons = [
  ['DIY spreadsheets', 'Weeks of tabs, demos, opinions, and unclear criteria.'],
  ['Review marketplaces', 'Good for software lists, weak for industrial machines, robotics, and real pilots.'],
  ['Innovation databases', 'Lots of raw data, but no guided decision or pilot structure.'],
  ['Big consultants', 'Strong process, but often too heavy and expensive for mid-market teams.'],
];

const outcomes = [
  { value: '5', label: 'best-fit vendors to test' },
  { value: '1', label: 'shared scorecard for Ops, IT, and Finance' },
  { value: '0', label: 'need to buy from a random sales pitch' },
  { value: '8wk', label: 'structured evaluation sprint target' },
];

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
      <div className="fixed bottom-16 left-1/2 z-[80] w-[min(760px,calc(100%-1rem))] -translate-x-1/2 rounded-2xl border border-[#d7d0c2] bg-[#f6f1e8]/92 p-2 shadow-[0_18px_60px_rgba(16,24,16,0.18)] backdrop-blur-xl md:bottom-4 md:rounded-full">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 px-2 md:pl-4">
            <p className="truncate text-sm font-semibold">Need to buy industrial tech?</p>
            <p className="truncate text-xs text-[#65705f]">We find the Top 5 vendors so you can test before buying.</p>
          </div>
          <CtaButton dark>Find My Top 5</CtaButton>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#101810] px-4 pb-16 pt-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-[0.16]" aria-hidden="true">
          <div className="absolute left-[9%] top-0 h-full w-px bg-[#c8d6bf]" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-[#c8d6bf]" />
          <div className="absolute left-0 top-[67%] h-px w-full bg-[#c8d6bf]" />
          <div className="absolute right-[9%] top-[10%] h-56 w-56 rounded-full border border-[#c8d6bf]" />
          <div className="absolute right-[9%] top-[25%] h-56 w-56 rounded-full border border-[#c8d6bf]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1240px] gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <div className="mb-8 flex items-center gap-4 text-[#c8d6bf]">
              <div className="relative h-9 w-14">
                <span className="absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c8d6bf]" />
                <span className="absolute left-6 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c8d6bf]" />
              </div>
              <span className="font-serif text-xl tracking-tight">NXT LINK</span>
            </div>
            <SectionLabel dark>Technology buying guide for physical operations</SectionLabel>
            <h1 className="mt-5 max-w-5xl font-serif text-[clamp(3.8rem,11vw,10rem)] font-semibold leading-[0.82] tracking-[-0.06em]">
              Find the Top 5 vendors before you buy the wrong tech.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-[#c8d6bf] sm:text-2xl">
              NXT Link hunts down machines, software, robotics, AI tools, and industrial solutions, then helps your team test the best options before purchase.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaButton>Find My Top 5 Vendors</CtaButton>
              <Link href="#intake" className="inline-flex items-center justify-center rounded-full border border-[#c8d6bf]/45 px-5 py-3 text-sm font-semibold text-[#f6f1e8] transition hover:border-[#f6f1e8]">
                Send one problem
              </Link>
            </div>
            <div className="mt-8 grid gap-2 text-sm text-[#c8d6bf] sm:grid-cols-3">
              {['No endless research', 'Top 5 shortlist', 'Test before buying'].map((point) => (
                <div key={point} className="rounded-full border border-[#c8d6bf]/20 px-3 py-2 text-center">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div id="intake" className="rounded-[2rem] bg-[#f6f1e8] p-5 text-[#101810] shadow-[0_35px_110px_rgba(0,0,0,0.28)]">
              <SectionLabel>Start here</SectionLabel>
              <h2 className="mt-3 font-serif text-4xl leading-none">What tech are you trying to buy?</h2>
              <div className="mt-5 grid gap-2">
                {techTypes.map((type) => (
                  <Link key={type} href={`mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20${encodeURIComponent(type)}%20vendors`} className="flex items-center justify-between rounded-2xl border border-[#ded7c9] bg-white/60 px-4 py-3 text-sm font-semibold transition hover:bg-white">
                    <span>{type}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-[#65705f]">Click a category to send the first problem. Simple, low friction, no long form.</p>
            </div>

            <div className="rounded-[2rem] border border-[#c8d6bf]/20 bg-[#172116] p-4 shadow-[0_35px_110px_rgba(0,0,0,0.3)]">
              <div className="mb-4 flex items-center justify-between px-2 pt-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9eaa98]">Sample report</p>
                  <h2 className="mt-2 font-serif text-4xl text-[#f6f1e8]">Top 5 ready to test</h2>
                </div>
                <Search className="h-6 w-6 text-[#c8d6bf]" />
              </div>
              <div className="space-y-3">
                {reportRows.map((row) => (
                  <div key={row.vendor} className="rounded-2xl bg-[#f6f1e8]/8 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9eaa98]">{row.vendor}</p>
                        <h3 className="mt-1 font-semibold text-[#f6f1e8]">{row.role}</h3>
                        <p className="mt-1 text-xs text-[#c8d6bf]">Risk: {row.risk} / Pilot: {row.pilot}</p>
                      </div>
                      <span className="rounded-full bg-[#f6f1e8] px-3 py-1 font-mono text-sm font-semibold text-[#101810]">{row.fit}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f6f1e8]/10">
                      <div className="h-full rounded-full bg-[#c8d6bf]" style={{ width: `${row.fit}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#65705f]">
          <span>Logistics operators</span>
          <span>Manufacturers</span>
          <span>Warehouses</span>
          <span>Supply-chain teams</span>
          <span>Operations leaders</span>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.82fr_1fr] lg:items-center">
          <div>
            <SectionLabel>The challenge</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Companies keep buying the wrong tech because the buying process is broken.</h2>
          </div>
          <div className="grid gap-3">
            {[
              ['Google searches become the strategy', 'Teams only see the loudest vendors, not the best-fit vendors.'],
              ['Excel becomes the decision room', 'Ops, IT, Finance, and leadership compare different things.'],
              ['Vendor demos replace real tests', 'Sales presentations get treated like proof.'],
              ['The purchase happens too early', 'The company commits budget before the technology proves fit.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.5rem] border border-[#ded7c9] bg-white/60 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4d5648]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <div>
            <SectionLabel dark>Founder proof</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">The problem showed up while inspecting needles for human hearts.</h2>
          </div>
          <div className="rounded-[2rem] border border-[#c8d6bf]/16 bg-[#172116] p-6">
            <p className="text-lg leading-8 text-[#c8d6bf]">
              At Johnson & Johnson MedTech, life-saving cardiovascular needles were still being inspected through outdated manual microscopes. The company did not lack technology. It lacked a safe process to evaluate and buy the right technology.
            </p>
            <p className="mt-5 text-lg leading-8 text-[#c8d6bf]">
              By building an evaluation framework, the team secured more than $300,000 in automated Keyence machines in 3 months. NXT Link turns that lesson into a repeatable buying system.
            </p>
          </div>
        </div>
      </section>

      <section id="system" className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-3xl">
            <SectionLabel dark>What you get</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">A cleaner way to buy serious technology.</h2>
            <p className="mt-5 text-lg leading-8 text-[#c8d6bf]">We find them, narrow them, and bring them to you with a scorecard and trial plan.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] p-6">
                  <div className="mb-8 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9eaa98]">{item.step}</span>
                    <Icon className="h-6 w-6 text-[#c8d6bf]" />
                  </div>
                  <h3 className="font-serif text-3xl text-[#f6f1e8]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#c8d6bf]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div>
            <SectionLabel>Scorecard</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">One rubric for the whole buying team.</h2>
            <p className="mt-5 text-base leading-8 text-[#4d5648]">Operations, IT, Finance, and leadership need one way to compare vendors before a demo or pilot starts.</p>
          </div>
          <div className="rounded-[2rem] bg-[#101810] p-5 text-[#f6f1e8]">
            {scorecard.map(([name, weight]) => (
              <div key={name} className="border-b border-[#c8d6bf]/12 py-4 last:border-0">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-mono text-[#c8d6bf]">{weight}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f6f1e8]/10">
                  <div className="h-full rounded-full bg-[#c8d6bf]" style={{ width: `${Number(weight) * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <SectionLabel>Use cases</SectionLabel>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Technology categories we hunt for.</h2>
            </div>
            <p className="max-w-md text-base leading-7 text-[#4d5648]">Every category gets a different search map, scorecard, pilot plan, and vendor risk view.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-[#ded7c9] bg-white/55 p-6 transition hover:-translate-y-1 hover:bg-white">
                  <Icon className="h-7 w-7 text-[#101810]" />
                  <h3 className="mt-8 font-serif text-3xl text-[#101810]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#4d5648]">{item.body}</p>
                  <Link href={`mailto:hello@nxtlinktech.com?subject=Start%20a%20${encodeURIComponent(item.title)}%20vendor%20hunt`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#101810]">
                    Start a hunt <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <SectionLabel dark>How we compare</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Why this is different from the usual options.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {comparisons.map(([title, body]) => (
              <div key={title} className="rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] p-6">
                <GitCompare className="h-6 w-6 text-[#c8d6bf]" />
                <h3 className="mt-8 font-serif text-3xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#c8d6bf]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div>
            <SectionLabel>Trust</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Built for decisions that affect budgets, floors, teams, and customers.</h2>
            <p className="mt-5 text-base leading-8 text-[#4d5648]">NXT Link should feel like the calm layer between operators and a noisy technology market.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Transparent evaluation criteria', 'Buyer-aligned recommendations', 'Pilot-first decision process', 'Clear vendor risk notes'].map((item) => (
              <div key={item} className="flex min-h-28 items-start gap-3 rounded-[1.5rem] border border-[#ded7c9] bg-white/60 p-5">
                {item.includes('Pilot') ? <Wrench className="h-5 w-5 shrink-0" /> : item.includes('risk') ? <ShieldCheck className="h-5 w-5 shrink-0" /> : item.includes('criteria') ? <LockKeyhole className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
                <span className="text-sm font-semibold leading-7 text-[#101810]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <SectionLabel dark>Proof points</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Real outcomes from a better buying process.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {outcomes.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-[#c8d6bf]/14 bg-[#172116] p-6">
                <div className="font-serif text-5xl text-[#f6f1e8]">{item.value}</div>
                <p className="mt-4 text-sm leading-6 text-[#c8d6bf]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px] rounded-[2rem] border border-[#ded7c9] bg-white/60 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-center">
            <div>
              <SectionLabel>Who this is for</SectionLabel>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">For teams buying tools that have to work in the real world.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Logistics operators', 'Manufacturers', 'Supply-chain teams', 'Warehouses', 'Industrial companies', 'Operations leaders'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#f6f1e8] px-4 py-4 font-semibold">
                  <Building2 className="h-5 w-5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 rounded-[2rem] border border-[#c8d6bf]/18 bg-[#172116] p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
          <div>
            <SectionLabel dark>Get started</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Send us one technology problem.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#c8d6bf]">We will show you what your vendor hunt could look like: the category, the search direction, and the Top 5 shortlist path.</p>
          </div>
          <div className="flex flex-col gap-3">
            <CtaButton>Start My Vendor Hunt</CtaButton>
            <Link href="/briefing" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c8d6bf]/35 px-5 py-3 text-sm font-semibold">
              View Live Briefing <Truck className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
