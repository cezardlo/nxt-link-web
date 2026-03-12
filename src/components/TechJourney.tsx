'use client';

type JourneyEntry = {
  decade: string;
  title: string;
  description: string;
};

type Props = {
  entries: JourneyEntry[];
  accentColor: string;
  industryLabel: string;
};

export default function TechJourney({ entries, accentColor, industryLabel }: Props) {
  return (
    <div className="w-full select-none">
      {/* Header label */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <span
          className="text-[8px] font-mono tracking-[0.2em] uppercase"
          style={{ color: accentColor }}
        >
          {industryLabel}
        </span>
        <span className="text-[8px] font-mono tracking-[0.2em] text-white/25 uppercase">
          — Technology Evolution
        </span>
      </div>

      {/* Scrollable timeline container */}
      <div className="overflow-x-auto scrollbar-thin pb-2">
        <div className="relative flex gap-8 py-8 px-4 min-w-max">

          {/* Horizontal center line */}
          <div
            className="absolute left-0 right-0 h-px"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              background: `linear-gradient(to right, transparent, rgba(255,255,255,0.08) 8%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.08) 92%, transparent)`,
            }}
          />

          {/* Entry nodes */}
          {entries.map((entry, i) => {
            const isAbove = i % 2 === 0;

            return (
              <div
                key={entry.decade}
                className="relative flex flex-col items-center min-w-[160px]"
              >
                {/* Above content: decade label + card if isAbove, or decade label only */}
                <div className="flex flex-col items-center gap-2" style={{ minHeight: '90px', justifyContent: 'flex-end' }}>
                  {isAbove && (
                    <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-sm max-w-[180px] w-full">
                      <div className="text-[10px] font-mono font-bold text-white/70 leading-tight mb-1">
                        {entry.title}
                      </div>
                      <div className="text-[8px] font-mono text-white/35 leading-relaxed">
                        {entry.description}
                      </div>
                    </div>
                  )}
                  {/* Decade label above the dot */}
                  <span
                    className="text-[9px] font-mono tracking-widest uppercase"
                    style={{ color: isAbove ? accentColor : 'rgba(255,255,255,0.35)' }}
                  >
                    {entry.decade}
                  </span>
                </div>

                {/* Glowing dot on the line */}
                <div
                  className="relative z-10 w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 0 8px ${accentColor}cc, 0 0 16px ${accentColor}55`,
                  }}
                />

                {/* Below content: decade label only or card if !isAbove */}
                <div className="flex flex-col items-center gap-2" style={{ minHeight: '90px', justifyContent: 'flex-start' }}>
                  {!isAbove && (
                    <>
                      <span
                        className="text-[9px] font-mono tracking-widest uppercase mt-1"
                        style={{ color: accentColor }}
                      >
                        {entry.decade}
                      </span>
                      <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-sm max-w-[180px] w-full">
                        <div className="text-[10px] font-mono font-bold text-white/70 leading-tight mb-1">
                          {entry.title}
                        </div>
                        <div className="text-[8px] font-mono text-white/35 leading-relaxed">
                          {entry.description}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Future arrow cap */}
          <div className="relative flex flex-col items-center min-w-[80px]">
            <div style={{ minHeight: '90px' }} />
            <div
              className="relative z-10 flex items-center gap-1"
            >
              {/* Small line segment leading to arrow */}
              <div
                className="w-6 h-px"
                style={{ background: accentColor, opacity: 0.4 }}
              />
              <span
                className="text-[10px] font-mono tracking-widest uppercase"
                style={{
                  color: accentColor,
                  textShadow: `0 0 8px ${accentColor}88`,
                }}
              >
                → FUTURE
              </span>
            </div>
            <div style={{ minHeight: '90px' }} />
          </div>

        </div>
      </div>
    </div>
  );
}
