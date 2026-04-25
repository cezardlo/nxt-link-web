import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Compass,
  Factory,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react';

const stats = [
  { value: '40%', label: 'of manufacturers still rely on spreadsheets for complex sourcing.' },
  { value: '76%', label: 'of logistics transformations miss budget, timeline, or performance goals.' },
  { value: '79%', label: 'of technology buyers can experience deep post-purchase regret.' },
];

const processSteps = [
  {
    icon: Target,
    title: 'Name the real problem',
    body: 'We start with the operation, not the shiny tool. What needs to improve, where is the bottleneck, and what result would prove the tech worked?',
  },
  {
    icon: Radar,
    title: 'Hunt down the market',
    body: "We scan beyond Google, trade shows, and the vendors already in someone's inbox to find machines, apps, AI tools, robotics, and automation that actually fit.",
  },
  {
    icon: SlidersHorizontal,
    title: 'Narrow it to 5 vendors',
    body: 'Your team gets a clean shortlist of the 5 strongest options, scored against the same criteria so Operations, Finance, IT, and leadership can compare fairly.',
  },
  {
    icon: ClipboardCheck,
    title: 'Test before purchase',
    body: 'We guide demos, pilots, and decision checkpoints so the company can try the tech before making an expensive commitment.',
  },
];

const comparisons = [
  { title: 'DIY research', body: 'Weeks of searching, scattered notes, and a shortlist shaped by whoever answered first.' },
  { title: 'Review sites', body: 'Useful for software discovery, but often too broad, vendor-driven, and weak on industrial machines or robotics.' },
  { title: 'Innovation databases', body: 'Great raw data, but they still leave your team to turn noise into a buying decision.' },
  { title: 'Big consulting', body: 'Strong process, but often too expensive and heavy for mid-market teams that need practical momentum.' },
];

const audiences = [
  'Mid-market logistics operators',
  'Manufacturers modernizing inspection or production',
  'Supply-chain teams evaluating automation',
  'Industrial companies choosing AI, IoT, robotics, machines, or software',
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070812] text-nxt-text">
      <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden border-b border-nxt-border-subtle">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1581093458791-9d2f2f47cdf3?auto=format&fit=crop&w=2200&q=85')",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,18,0.98)_0%,rgba(7,8,18,0.86)_45%,rgba(7,8,18,0.58)_100%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(7,8,18,0),#070812)]" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1240px] flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(54,211,255,0.28)] bg-[rgba(10,18,32,0.82)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-nxt-cyan">
                <Sparkles className="h-3.5 w-3.5" />
                Industrial tech selection, minus the chaos
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] text-white sm:text-6xl lg:text-7xl">
                We Hunt. You Test. Then You Buy Smarter.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-nxt-secondary sm:text-xl">
                NXT Link helps industrial and logistics companies find the right technology, narrow the market to 5 best-fit vendors, and test before making an expensive purchase.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="mailto:hello@nxtlinktech.com?subject=Find%20my%20top%205%20vendors"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-nxt-text px-5 py-3 text-sm font-semibold text-[#080b12] transition hover:bg-white"
                >
                  Find My Top 5 Vendors
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(167,178,207,0.24)] bg-[rgba(11,16,29,0.72)] px-5 py-3 text-sm font-semibold text-nxt-text transition hover:border-nxt-cyan hover:text-white"
                >
                  See How It Works
                </Link>
              </div>
            </div>

            <div className="nxt-panel-stack hidden lg:block">
              <div className="border border-[rgba(138,160,255,0.16)] bg-[rgba(9,14,26,0.84)] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between border-b border-nxt-border pb-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-nxt-dim">NXT LINK SHORTLIST</div>
                    <div className="mt-1 text-lg font-semibold text-white">Vendor chaos to 5 real options</div>
                  </div>
                  <BadgeCheck className="h-6 w-6 text-nxt-green" />
                </div>
                <div className="space-y-3">
                  {['Automated inspection machine', 'Warehouse robotics system', 'AI forecasting platform', 'IoT sensor network', 'Supply-chain workflow app'].map((item, index) => (
                    <div key={item} className="flex items-center justify-between border border-nxt-border bg-[rgba(20,27,46,0.72)] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center border border-[rgba(54,211,255,0.2)] bg-[rgba(54,211,255,0.08)] font-mono text-xs text-nxt-cyan">
                          {index + 1}
                        </div>
                        <span className="text-sm text-nxt-secondary">{item}</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-nxt-green">pilot ready</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border border-[rgba(242,185,75,0.2)] bg-[rgba(242,185,75,0.08)] p-4 text-sm leading-6 text-nxt-secondary">
                  Try the tech before it eats your budget. Compare the shortlist, run the demos, test the fit, then buy with evidence.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-nxt-border-subtle bg-[#090d16] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.value} className="border border-nxt-border bg-[rgba(14,19,34,0.72)] p-5">
              <div className="font-mono text-3xl font-semibold text-nxt-cyan">{stat.value}</div>
              <p className="mt-2 text-sm leading-6 text-nxt-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.78fr_1fr]">
          <div>
            <div className="section-kicker">The story</div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Space-age tech exists. Companies still buy the wrong machine.</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-nxt-secondary">
            <p>
              A few years ago at Johnson & Johnson MedTech, the problem was painfully clear: life-saving cardiovascular needles were being inspected through outdated manual microscopes. The company did not lack advanced technology. It lacked a structured way to evaluate and buy the right technology safely.
            </p>
            <p>
              By building an evaluation framework, the team secured more than $300,000 in automated Keyence machines in 3 months. NXT Link turns that lesson into a repeatable service for industrial companies: find the right tools, narrow the field, test before buying, and guide the decision like a project manager who understands the stakes.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f1e8] px-4 py-20 text-[#13161f] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#687066]">The problem</div>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Try the Tech Before It Eats Your Budget.</h2>
            <p className="mt-5 text-lg leading-8 text-[#4d554d]">
              Companies are surrounded by robotics, AI, automation, sensors, industrial machines, and software. But without a clear evaluation process, teams waste months researching, sit through biased vendor demos, and still buy the wrong thing.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {['Google searches become the strategy.', 'Excel becomes the decision room.', 'Vendor demos replace real tests.', 'Teams buy before proving fit.'].map((item) => (
              <div key={item} className="border border-[#d8d2c1] bg-white p-5 shadow-sm">
                <Wrench className="mb-5 h-6 w-6 text-[#9b5c22]" />
                <p className="text-base font-semibold leading-6">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-3xl">
            <div className="section-kicker">What NXT Link does</div>
            <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">From market chaos to 5 real options.</h2>
            <p className="mt-5 text-lg leading-8 text-nxt-secondary">
              You run the operation. We hunt down the tech, narrow the market, and guide the test so your team can make the decision with evidence.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {processSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="border border-nxt-border bg-[rgba(14,19,34,0.78)] p-6">
                  <Icon className="h-7 w-7 text-nxt-cyan" />
                  <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-nxt-secondary">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-nxt-border-subtle bg-[#0b111c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.82fr_1fr]">
          <div>
            <div className="section-kicker">Why now</div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">The tech market is moving faster than the buying process.</h2>
            <p className="mt-5 text-base leading-8 text-nxt-secondary">
              AI, robotics, nearshoring, labor shortages, and supply-chain pressure are forcing companies to modernize. The old way of buying industrial technology cannot keep up.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['AI and automation choices are multiplying.', 'Labor shortages are forcing faster adoption.', 'Southwest logistics growth is raising the stakes.', 'Mid-market teams need structure without enterprise consulting weight.'].map((item) => (
              <div key={item} className="border border-nxt-border bg-[rgba(20,27,46,0.7)] p-5 text-sm leading-7 text-nxt-secondary">
                <Compass className="mb-4 h-5 w-5 text-nxt-amber" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1fr]">
            <div>
              <div className="section-kicker">Why NXT Link</div>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Built for the missing middle.</h2>
              <p className="mt-5 text-base leading-8 text-nxt-secondary">
                NXT Link brings Fortune 500-style evaluation discipline to companies that need a practical guide, not a giant consulting engagement or another directory of options.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {comparisons.map((item) => (
                <div key={item.title} className="border border-nxt-border bg-[rgba(14,19,34,0.78)] p-5">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-nxt-secondary">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#10140f] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-nxt-green">How we guide</div>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Project-manager energy for high-stakes technology decisions.</h2>
            <p className="mt-5 text-base leading-8 text-[#b9c5b6]">
              NXT Link does not just hand over names. We help organize the evaluation, align the team, pressure-test the vendors, and keep the decision tied to the original operational goal.
            </p>
          </div>
          <div className="space-y-3">
            {['Buyer-first recommendations', 'Transparent scorecards', 'Clear demo and pilot criteria', 'Real-world validation before purchase'].map((item) => (
              <div key={item} className="flex items-center gap-3 border border-[rgba(39,209,127,0.18)] bg-[rgba(39,209,127,0.06)] px-4 py-3 text-sm font-medium text-[#d9e8d5]">
                <ShieldCheck className="h-5 w-5 text-nxt-green" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr]">
            <div>
              <div className="section-kicker">Who it helps</div>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">For teams buying tools that have to work in the real world.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {audiences.map((item) => (
                <div key={item} className="flex min-h-24 items-start gap-3 border border-nxt-border bg-[rgba(14,19,34,0.78)] p-5">
                  <Factory className="mt-0.5 h-5 w-5 shrink-0 text-nxt-cyan" />
                  <span className="text-sm leading-7 text-nxt-secondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px] border border-[rgba(54,211,255,0.22)] bg-[rgba(9,16,29,0.88)] p-8 sm:p-10 lg:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="section-kicker">Next step</div>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Make your next technology decision evidence-based.</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-nxt-secondary">
                For operators evaluating automation, AI, robotics, logistics software, inspection systems, or supplier technology.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="mailto:hello@nxtlinktech.com?subject=Start%20a%20Technology%20Fit%20Call"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-nxt-cyan px-5 py-3 text-sm font-semibold text-[#061018] transition hover:bg-[#7ee4ff]"
              >
                Start a Technology Fit Call
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/briefing"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-nxt-border px-5 py-3 text-sm font-semibold text-nxt-text transition hover:border-nxt-cyan"
              >
                View Live Briefing
                <Search className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
