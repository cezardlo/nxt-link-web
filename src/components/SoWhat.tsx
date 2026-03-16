'use client';

type SoWhatProps = {
  summary: string;
  confidence?: number;
  signalCount?: number;
  accent?: string;
};

export function SoWhat({ summary, confidence, signalCount, accent = '#00d4ff' }: SoWhatProps) {
  const confColor = confidence != null
    ? confidence < 40 ? '#ff3b30' : confidence < 70 ? '#ffb800' : '#00ff88'
    : undefined;

  return (
    <div
      className="bg-white/[0.02] rounded-sm p-4 relative overflow-hidden"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <span className="font-mono text-[8px] tracking-widest text-white/25 uppercase">
        Intelligence Summary
      </span>
      <p className="font-mono text-[13px] text-white/60 leading-relaxed mt-2">
        {summary}
      </p>
      {(confidence != null || signalCount != null) && (
        <div className="flex items-center gap-3 mt-3">
          {confidence != null && (
            <span
              className="font-mono text-[8px] tracking-widest px-2 py-0.5 rounded-sm border"
              style={{ color: confColor, borderColor: `${confColor}33` }}
            >
              {confidence}% CONFIDENCE
            </span>
          )}
          {signalCount != null && (
            <span className="font-mono text-[8px] tracking-widest text-white/20">
              {signalCount} signals
            </span>
          )}
        </div>
      )}
    </div>
  );
}
