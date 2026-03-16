export type ReasoningStep = {
  factor: string;
  value: string;
  score: number;
  weight: number;
};

type ReasoningTraceProps = {
  title?: string;
  steps: ReasoningStep[];
  totalScore: number;
};

export function ReasoningTrace({ title = 'SCORING METHODOLOGY', steps, totalScore }: ReasoningTraceProps) {
  const totalColor = totalScore < 40 ? '#ff3b30' : totalScore < 70 ? '#ffb800' : '#00ff88';

  return (
    <details className="group">
      <summary className="font-mono text-[8px] tracking-widest text-white/20 uppercase cursor-pointer hover:text-white/30 transition-colors select-none">
        {title} ▸
      </summary>
      <div className="mt-3 space-y-2.5 pl-2 border-l border-white/[0.04]">
        {steps.map((step, i) => {
          const barColor = step.score < 40 ? '#ff3b30' : step.score < 70 ? '#ffb800' : '#00ff88';
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] text-white/35">{step.factor}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] text-white/20">{step.value}</span>
                  <span className="font-mono text-[8px] text-white/15">×{step.weight}</span>
                </div>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, step.score)}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
          <span className="font-mono text-[9px] text-white/40 uppercase">Total Score</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, totalScore)}%`, backgroundColor: totalColor }}
              />
            </div>
            <span className="font-mono text-[10px] font-bold" style={{ color: totalColor }}>
              {totalScore}
            </span>
          </div>
        </div>
      </div>
    </details>
  );
}
