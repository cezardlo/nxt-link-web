'use client';

type Technology = {
  id: string;
  name: string;
  description: string;
  maturityLevel: 'emerging' | 'growing' | 'mature';
  relatedVendorCount: number;
  elPasoRelevance: 'high' | 'medium' | 'low';
  governmentBudgetFY25M?: number;
  localVendorCount?: number;
};

type Props = {
  technologies: Technology[];
  accentColor: string;
};

const MATURITY_CONFIG = {
  emerging: {
    label: 'EMERGING',
    color: '#60a5fa',
    dotShadow: '0 0 6px #60a5facc',
  },
  growing: {
    label: 'GROWING',
    color: '#ffb800',
    dotShadow: '0 0 6px #ffb800cc',
  },
  mature: {
    label: 'MATURE',
    color: '#00ff88',
    dotShadow: '0 0 6px #00ff88cc',
  },
} as const;

const RELEVANCE_CONFIG = {
  high: { label: 'EP HIGH', className: 'text-[#00ff88]' },
  medium: { label: 'EP MED', className: 'text-[#ffb800]' },
  low: { label: 'EP LOW', className: 'text-white/30' },
} as const;

function formatBudget(budgetM: number): string {
  if (budgetM >= 1000) {
    return `$${(budgetM / 1000).toFixed(1)}B`;
  }
  return `$${Math.round(budgetM)}M`;
}

function TechCard({ tech }: { tech: Technology }) {
  const maturity = MATURITY_CONFIG[tech.maturityLevel];
  const relevance = RELEVANCE_CONFIG[tech.elPasoRelevance];

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded-sm hover:bg-white/[0.04] transition-colors cursor-default">
      <div className="flex items-start gap-1.5 mb-1">
        <span
          className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: maturity.color,
            boxShadow: maturity.dotShadow,
          }}
        />
        <span className="text-[9px] font-mono text-white/80 leading-tight">
          {tech.name}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pl-3">
        {tech.governmentBudgetFY25M !== undefined && (
          <span className="text-[7px] font-mono text-white/25 tracking-wide">
            {formatBudget(tech.governmentBudgetFY25M)}
          </span>
        )}

        <span className="text-[7px] font-mono text-white/30 tracking-wide">
          {tech.relatedVendorCount} vendors
        </span>

        <span className={`text-[7px] font-mono tracking-wide ${relevance.className}`}>
          {relevance.label}
        </span>

        {tech.localVendorCount !== undefined && tech.localVendorCount > 0 && (
          <span
            className="text-[7px] font-mono tracking-wide"
            style={{ color: '#00d4ff' }}
          >
            {tech.localVendorCount} local
          </span>
        )}
      </div>
    </div>
  );
}

function MaturityColumn({
  maturityLevel,
  techs,
}: {
  maturityLevel: 'emerging' | 'growing' | 'mature';
  techs: Technology[];
}) {
  const config = MATURITY_CONFIG[maturityLevel];

  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-1.5 mb-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: config.color,
            boxShadow: config.dotShadow,
          }}
        />
        <span className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase">
          {config.label}
        </span>
        <span className="font-mono text-[8px] text-white/20">
          ({techs.length})
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {techs.length === 0 ? (
          <span className="font-mono text-[7px] text-white/15 tracking-wide pl-0.5">
            NO DATA
          </span>
        ) : (
          techs.map((tech) => <TechCard key={tech.id} tech={tech} />)
        )}
      </div>
    </div>
  );
}

export function IndustryTimeline({ technologies }: Props) {
  const emerging = technologies.filter((t) => t.maturityLevel === 'emerging');
  const growing = technologies.filter((t) => t.maturityLevel === 'growing');
  const mature = technologies.filter((t) => t.maturityLevel === 'mature');

  return (
    <div className="w-full bg-black">
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1">
        <MaturityColumn maturityLevel="emerging" techs={emerging} />
        <div className="w-px bg-white/[0.06] shrink-0 self-stretch" />
        <MaturityColumn maturityLevel="growing" techs={growing} />
        <div className="w-px bg-white/[0.06] shrink-0 self-stretch" />
        <MaturityColumn maturityLevel="mature" techs={mature} />
      </div>
    </div>
  );
}
