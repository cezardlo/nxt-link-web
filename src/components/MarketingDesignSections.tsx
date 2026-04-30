import { ArrowRight, ClipboardCheck, Compass, Factory, FileText, Megaphone, ShieldCheck, Target } from 'lucide-react';

const offerStack = [
  {
    title: 'Vendor Hunt',
    body: 'We search beyond Google, trade shows, old contacts, and loud sales decks to find real options that match the operation.',
  },
  {
    title: 'Top 5 Shortlist',
    body: 'We turn a noisy market into 5 best-fit vendors with clear reasons, fit scores, risks, and next steps.',
  },
  {
    title: 'Trial Guide',
    body: 'We help the company run demos, pilots, and decision checkpoints before money gets locked into the wrong tool.',
  },
];

const growthMoves = [
  'Founder-led LinkedIn posts about bad tech purchases and vendor confusion',
  'Lead magnet: Top 5 Vendor Shortlist Template',
  'Outbound offer: send one technology problem and receive a sample vendor-hunt view',
  'Local wedge: El Paso, Southwest logistics, nearshoring, manufacturing growth',
];

const trustRules = [
  'Buyer-first recommendations',
  'Transparent evaluation criteria',
  'Clear scorecards before demos',
  'Pilot proof before purchase pressure',
];

export function MarketingDesignSections() {
  return (
    <>
      <section className="bg-[#f8f9fd] px-4 py-20 text-[#111641] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-end">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7f86a8]">The offer</div>
              <h2 className="mt-4 text-4xl font-semibold text-[#11155f] sm:text-5xl">A guided sprint from problem to proof.</h2>
              <p className="mt-5 text-base leading-8 text-[#5c6486]">
                NXT Link is not just a list of vendors. It is a structured evaluation engagement that helps operators move from “we need better tech” to “these are the 5 options worth testing.”
              </p>
            </div>
            <a
              href="mailto:hello@nxtlinktech.com?subject=Send%20one%20technology%20problem"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#11155f] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1d2382] sm:w-auto lg:justify-self-end"
            >
              Send one technology problem
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {offerStack.map((item, index) => (
              <div key={item.title} className="rounded-[24px] border border-[#e1e5f0] bg-white p-5 shadow-[0_18px_50px_rgba(52,64,110,0.09)]">
                <div className="mb-8 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef3ff] text-[#11155f]">
                    {index === 0 ? <Compass className="h-5 w-5" /> : index === 1 ? <Target className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                  </div>
                  <span className="font-mono text-sm font-semibold text-[#d15aa5]">0{index + 1}</span>
                </div>
                <h3 className="text-xl font-semibold text-[#11155f]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5c6486]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#070812] px-4 py-20 text-nxt-text sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div>
            <div className="section-kicker">Growth engine</div>
            <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">The marketing should feel like a useful tool, not an ad.</h2>
            <p className="mt-5 text-base leading-8 text-nxt-secondary">
              The fastest path is founder-led education: show operators how expensive technology mistakes happen, then offer a simple first step that proves NXT Link can organize the chaos.
            </p>
          </div>
          <div className="rounded-[28px] border border-[rgba(138,160,255,0.18)] bg-[rgba(14,19,34,0.78)] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(54,211,255,0.12)] text-nxt-cyan">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-nxt-dim">Go-to-market loop</div>
                <h3 className="text-xl font-semibold text-white">Teach, capture, shortlist, convert</h3>
              </div>
            </div>
            <div className="space-y-3">
              {growthMoves.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-6 text-nxt-secondary">
                  <span className="font-mono text-[#ffb8df]">0{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 text-[#111641] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-[#e1e5f0] bg-[#f8f9fd] p-6 sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#d15aa5] shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold text-[#11155f] sm:text-4xl">Lead magnet: Top 5 Vendor Shortlist Template.</h2>
            <p className="mt-4 text-base leading-8 text-[#5c6486]">
              Give visitors a useful template that shows how NXT Link thinks: business outcome, vendor fit, pilot readiness, integration risk, total cost, and next test.
            </p>
            <a
              href="mailto:hello@nxtlinktech.com?subject=Send%20me%20the%20Top%205%20Vendor%20Shortlist%20Template"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#d15aa5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#bf4593]"
            >
              Request the template
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="rounded-[28px] border border-[#dcecdf] bg-[#eef9f4] p-6 sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#27a56f] shadow-sm">
              <Factory className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold text-[#11155f] sm:text-4xl">Local wedge, national ambition.</h2>
            <p className="mt-4 text-base leading-8 text-[#4b6358]">
              Start with El Paso, the Southwest, logistics, manufacturing, warehousing, and nearshoring pressure. Then expand as the trusted buying layer for industrial technology anywhere.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#fff7fb] px-4 py-20 text-[#111641] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8d5480]">Trust and integrity</div>
            <h2 className="mt-4 text-4xl font-semibold text-[#11155f] sm:text-5xl">A cleaner way to buy serious technology.</h2>
            <p className="mt-5 text-base leading-8 text-[#5c6486]">
              The site should build trust before it tries to close. NXT Link wins by being clear, structured, and practical while the market feels noisy and biased.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trustRules.map((item) => (
              <div key={item} className="flex min-h-24 items-start gap-3 rounded-2xl border border-[#ecd9e6] bg-white p-5 shadow-sm">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d15aa5]" />
                <span className="text-sm font-semibold leading-7 text-[#3e435f]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
