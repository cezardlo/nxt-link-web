import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  FileSearch,
  LockKeyhole,
  Radar,
  Search,
  ShieldCheck,
  Truck,
  Wifi,
  Wrench,
} from 'lucide-react';

const proofPoints = [
  'Built from real MedTech technology evaluation work',
  'Top 5 vendor shortlist instead of endless research',
  'Demo and pilot guidance before purchase',
];

const challengeRows = [
  ['SOURCE', 'Google tabs + trade shows'],
  ['SPREADSHEET', 'Vendor notes, pricing, opinions'],
  ['MEETING', 'Ops, IT, Finance disagree'],
  ['DEMO', 'Vendor-controlled sales pitch'],
  ['DECISION', 'Expensive purchase, uncertain fit'],
];

const workflow = [
  {
    step: '1 Capture',
    title: 'Define the buying problem',
    body: 'We turn “we need better tech” into a clear operational outcome, constraints, and test criteria.',
    icon: ClipboardCheck,
  },
  {
    step: '2 Search',
    title: 'Hunt the vendor market',
    body: 'We scan beyond familiar names to find machines, robotics, software, AI tools, sensors, and integrators that fit.',
    icon: Radar,
  },
  {
    step: '3 Shortlist',
    title: 'Bring back 5 options',
    body: 'You get a clean vendor pack with fit scores, risks, pilot readiness, and recommended next steps.',
    icon: FileSearch,
  },
  {
    step: '4 Validate',
    title: 'Test before buying',
    body: 'We guide demos, pilots, and decision checkpoints so the team buys with evidence, not pressure.',
    icon: BadgeCheck,
  },
];

const useCases = [
  {
    title: 'Robotics',
    body: 'Find automation vendors that match floor layout, labor gaps, safety needs, and rollout complexity.',
    icon: Bot,
  },
  {
    title: 'Machine vision',
    body: 'Compare inspection systems by accuracy, throughput, validation, support, and real-world test fit.',
    icon: Camera,
  },
  {
    title: 'AI software',
    body: 'Separate useful AI from hype by testing data fit, workflow fit, security, and operational value.',
    icon: BrainCircuit,
  },
  {
    title: 'Warehouse tech',
    body: 'Evaluate WMS, picking tools, fleet systems, sensors, and visibility platforms without spreadsheet chaos.',
    icon: Boxes,
  },
  {
    title: 'IoT sensors',
    body: 'Shortlist sensor and monitoring solutions that fit your environment, data needs, and integration path.',
    icon: Wifi,
  },
  {
    title: 'Manufacturing systems',
    body: 'Find tools for production, quality, maintenance, inspection, and operations teams that need proof first.',
    icon: Factory,
  },
];

const outcomes = [
  { value: '5', label: 'best-fit vendors to test' },
  { value: '1', label: 'shared scorecard for Ops, IT, and Finance' },
  { value: '0', label: 'reason to buy from a random sales pitch' },
  { value: '8wk', label: 'structured evaluation sprint target' },
];

const security = [
  'Transparent evaluation criteria',
  'Buyer-aligned recommendations',
  'Pilot-first decision process',
  'Clear vendor risk notes',
];

function CtaButton({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <Link
      href="mailto:hello@nxtlinktech.com?subject=Find%20my%20Top%205%20vendors"
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

export function OneTrackStyleLanding() {
  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[#101810]">
      <div className="fixed bottom-16 left-1/2 z-[80] w-[min(680px,calc(100%-1rem))] -translate-x-1/2 rounded-2xl border border-[#d7d0c2] bg-[#f6f1e8]/92 p-2 shadow-[0_18px_60px_rgba(16,24,16,0.18)] backdrop-blur-xl md:bottom-4 md:rounded-full">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 px-2 md:pl-4">
            <p className="truncate text-sm font-semibold">Buying industrial tech?</p>
            <p className="truncate text-xs text-[#65705f]">We bring back 5 vendors your team can test.</p>
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

        <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1240px] gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <div className="mb-8 flex items-center gap-4 text-[#c8d6bf]">
              <div className="relative h-9 w-14">
                <span className="absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c8d6bf]" />
                <span className="absolute left-6 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-[#c8d6bf]" />
              </div>
              <span className="font-serif text-xl tracking-tight">NXT LINK</span>
            </div>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.26em] text-[#9eaa98]">
              Vendor intelligence for physical operations
            </p>
            <h1 className="max-w-5xl font-serif text-[clamp(4.2rem,13vw,12rem)] font-semibold leading-[0.78] tracking-[-0.06em]">
              We Hunt.<br />You Test.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-[#c8d6bf] sm:text-2xl">
              NXT Link helps companies find the right machines, software, robotics, AI tools, and industrial solutions. We narrow the market to 5 best-fit vendors so your team can test before buying.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaButton>Find My Top 5 Vendors</CtaButton>
              <Link
                href="#system"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c8d6bf]/45 px-5 py-3 text-sm font-semibold text-[#f6f1e8] transition hover:border-[#f6f1e8]"
              >
                See the system
              </Link>
            </div>
            <div className="mt-8 grid gap-2 text-sm text-[#c8d6bf] sm:grid-cols-3">
              {proofPoints.map((point) => (
                <div key={point} className="rounded-full border border-[#c8d6bf]/20 px-3 py-2 text-center">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#c8d6bf]/20 bg-[#172116] p-4 shadow-[0_35px_110px_rgba(0,0,0,0.3)]">
            <div className="mb-4 flex items-center justify-between px-2 pt-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9eaa98]">Vendor hunt dashboard</p>
                <h2 className="mt-2 font-serif text-4xl text-[#f6f1e8]">Top 5 ready to test</h2>
              </div>
              <Search className="h-6 w-6 text-[#c8d6bf]" />
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="rounded-[1.5rem] bg-[#f6f1e8] p-4 text-[#101810]">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#65705f]">Input chaos</p>
                <div className="space-y-2">
                  {challengeRows.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[#ded7c9] p-3">
                      <div className="font-mono text-[9px] tracking-[0.18em] text-[#7b8475]">{label}</div>
                      <div className="mt-1 text-sm font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {['Best technical fit', 'Fastest pilot path', 'Best integration', 'Best cost control', 'Strong backup option'].map((name, index) => (
                  <div key={name} className="rounded-2xl bg-[#f6f1e8]/8 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9eaa98]">Vendor 0{index + 1}</p>
                        <h3 className="mt-1 font-semibold text-[#f6f1e8]">{name}</h3>
                      </div>
                      <span className="rounded-full bg-[#f6f1e8] px-3 py-1 font-mono text-sm font-semibold text-[#101810]">
                        {94 - index * 4}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f6f1e8]/10">
                      <div className="h-full rounded-full bg-[#c8d6bf]" style={{ width: `${94 - index * 4}%` }} />
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
          <span>Industrial operators</span>
          <span>Manufacturers</span>
          <span>Warehouses</span>
          <span>Supply-chain teams</span>
          <span>Operations leaders</span>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#65705f]">The challenge</p>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] text-[#101810] sm:text-6xl">
              You cannot modernize operations with a buying process stuck in tabs and spreadsheets.
            </h2>
          </div>
          <div className="rounded-[2rem] bg-[#101810] p-5 text-[#f6f1e8] shadow-[0_28px_80px_rgba(16,24,16,0.18)]">
            <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.24em] text-[#9eaa98]">Old buying workflow</div>
            <div className="space-y-2 font-mono text-sm text-[#c8d6bf]">
              <div>RFP: MANUAL_VENDOR_SEARCH</div>
              <div>STATUS: 37 OPEN TABS</div>
              <div>DEMO_SOURCE: VENDOR_CONTROLLED</div>
              <div>SCORECARD: MISSING</div>
              <div>TEAM_ALIGNMENT: LOW</div>
              <div>PILOT_PLAN: NOT_DEFINED</div>
              <div className="pt-4 text-[#f6f1e8]">RESULT: EXPENSIVE_GUESS</div>
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9eaa98]">What we do</p>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">
              NXT Link is the vendor intelligence layer for industrial technology buying.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#c8d6bf]">
              We find them, narrow them, and bring them to you with a scorecard and trial plan.
            </p>
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
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#65705f]">Solutions</p>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">Use cases we hunt for.</h2>
            </div>
            <p className="max-w-md text-base leading-7 text-[#4d5648]">
              Every category gets a different scorecard, pilot plan, and vendor risk view.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-[#ded7c9] bg-white/55 p-6 transition hover:-translate-y-1 hover:bg-white">
                  <Icon className="h-7 w-7 text-[#101810]" />
                  <h3 className="mt-8 font-serif text-3xl text-[#101810]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#4d5648]">{item.body}</p>
                  <Link href="mailto:hello@nxtlinktech.com?subject=Start%20a%20vendor%20hunt" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#101810]">
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
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9eaa98]">Proof points</p>
          <h2 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">
            Real outcomes from a better buying process.
          </h2>
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
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#65705f]">Enterprise ready mindset</p>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">
              Built for decisions that affect budgets, floors, teams, and customers.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#4d5648]">
              NXT Link should feel like the calm layer between operators and a noisy technology market.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {security.map((item) => (
              <div key={item} className="flex min-h-28 items-start gap-3 rounded-[1.5rem] border border-[#ded7c9] bg-white/60 p-5">
                {item.includes('Pilot') ? <Wrench className="h-5 w-5 shrink-0" /> : item.includes('risk') ? <ShieldCheck className="h-5 w-5 shrink-0" /> : item.includes('criteria') ? <LockKeyhole className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
                <span className="text-sm font-semibold leading-7 text-[#101810]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#101810] px-4 py-20 text-[#f6f1e8] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 rounded-[2rem] border border-[#c8d6bf]/18 bg-[#172116] p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9eaa98]">Get started</p>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">
              Send us one technology problem.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#c8d6bf]">
              We will show you what your vendor hunt could look like: the category, the search direction, and the Top 5 shortlist path.
            </p>
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
