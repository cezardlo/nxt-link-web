import Link from 'next/link';

export type NextStep = {
  label: string;
  href: string;
};

type NextStepsProps = {
  steps: NextStep[];
};

export function NextSteps({ steps }: NextStepsProps) {
  if (!steps.length) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#00d4ff', boxShadow: '0 0 6px #00d4ffcc' }}
        />
        <span className="font-mono text-[9px] tracking-[0.25em] text-white/35 uppercase">
          Recommended Next Steps
        </span>
        <div className="flex-1 h-px bg-white/[0.04] ml-3" />
      </div>
      <div className="flex flex-wrap gap-3">
        {steps.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="font-mono text-[11px] text-white/40 hover:text-[#00d4ff]/70
                       bg-white/[0.02] border border-white/[0.06] rounded-sm px-4 py-2.5
                       hover:border-[#00d4ff]/30 transition-all duration-200"
          >
            {step.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
