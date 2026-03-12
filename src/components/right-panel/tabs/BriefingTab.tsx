'use client';

import { LoadingSkeleton } from '@/components/right-panel/shared/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

type BriefingData = {
  movement?: string[];
  risk?: string[];
  opportunity?: string[];
  briefing?: string;
  _provider?: string;
};

type Props = {
  data: BriefingData | null;
  loading: boolean;
};

// ─── El Paso sector posture data ──────────────────────────────────────────────

const EL_PASO_SECTORS = [
  { label: 'DEFENSE',     score: 88, color: '#f97316' },
  { label: 'LOGISTICS',   score: 78, color: '#00d4ff' },
  { label: 'BORDER TECH', score: 68, color: '#ffb800' },
  { label: 'ENERGY',      score: 80, color: '#ffd700' },
  { label: 'HEALTH TECH', score: 73, color: '#00ff88' },
];

// ─── PostureWidget ────────────────────────────────────────────────────────────

function PostureWidget() {
  const overall = Math.round(
    EL_PASO_SECTORS.reduce((sum, s) => sum + s.score, 0) / EL_PASO_SECTORS.length
  );
  const statusColor =
    overall >= 80 ? '#00ff88' : overall >= 65 ? '#00d4ff' : '#f97316';

  return (
    <div className="border border-white/[0.05] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.015] border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}cc` }}
          />
          <span className="font-mono text-[8px] tracking-[0.25em] text-white/20 uppercase">
            EP Sector Posture
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="font-mono text-[11px] font-black tabular-nums"
            style={{ color: statusColor }}
          >
            {overall}
          </span>
          <span className="font-mono text-[7px] text-white/15">/100</span>
        </div>
      </div>
      {/* Sectors */}
      <div className="flex flex-col gap-0 px-3 py-2">
        {EL_PASO_SECTORS.map((sector) => (
          <div key={sector.label} className="flex items-center gap-2 py-1">
            <span className="font-mono text-[7px] text-white/25 w-[72px] shrink-0 tracking-wider">
              {sector.label}
            </span>
            <div className="flex-1 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${sector.score}%`,
                  backgroundColor: sector.color,
                  boxShadow: `0 0 4px ${sector.color}44`,
                }}
              />
            </div>
            <span
              className="font-mono text-[8px] w-5 text-right shrink-0 tabular-nums font-bold"
              style={{ color: `${sector.color}88` }}
            >
              {sector.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BulletSection ────────────────────────────────────────────────────────────

function BulletSection({
  label,
  bullets,
  color,
}: {
  label: string;
  bullets: string[];
  color: string;
}) {
  if (bullets.length === 0) return null;
  return (
    <div className="border border-white/[0.04] rounded-sm overflow-hidden">
      <div
        className="px-2.5 py-1.5 flex items-center gap-2"
        style={{ background: `${color}0a`, borderBottom: `1px solid ${color}20` }}
      >
        <span
          className="w-1 h-1 rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}cc` }}
        />
        <span
          className="font-mono text-[8px] tracking-[0.25em] font-bold"
          style={{ color: `${color}bb` }}
        >
          {label}
        </span>
        <span
          className="ml-auto font-mono text-[7px] px-1 py-px rounded-sm font-bold"
          style={{ color, background: `${color}18` }}
        >
          {bullets.length}
        </span>
      </div>
      <ul className="flex flex-col">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex gap-2 px-2.5 py-1.5 text-[9px] font-mono text-white/38 leading-relaxed border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
          >
            <span style={{ color, opacity: 0.5 }} className="shrink-0 mt-px">
              ›
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── BriefingTab ──────────────────────────────────────────────────────────────

export function BriefingTab({ data, loading }: Props) {
  if (loading) {
    return <LoadingSkeleton label="ANALYZING MISSION" />;
  }

  if (!data) {
    return (
      <div className="p-4 flex flex-col gap-3">
        {/* Status header */}
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="font-mono text-[8px] tracking-[0.3em] text-white/15 uppercase">
            AWAITING MISSION
          </span>
        </div>
        <p className="font-mono text-[9px] text-white/25 leading-relaxed">
          Type a mission query in the top bar and press RUN to generate an AI intelligence briefing.
        </p>

        {/* Example queries */}
        <div className="mt-1 border border-white/[0.05] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.015]">
            <span className="font-mono text-[8px] text-white/15 tracking-[0.2em] uppercase">
              Example Queries
            </span>
          </div>
          {[
            'route optimization tech for logistics',
            'water management solutions El Paso',
            'AI vendors in manufacturing sector',
          ].map((ex) => (
            <div
              key={ex}
              className="flex items-center gap-2 px-2.5 py-1.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-[#00d4ff]/40 text-[8px] shrink-0">›</span>
              <span className="font-mono text-[9px] text-white/28">{ex}</span>
            </div>
          ))}
        </div>

        <div className="mt-1">
          <PostureWidget />
        </div>
      </div>
    );
  }

  const providerLabel =
    data._provider === 'static'
      ? 'CURATED'
      : data._provider
      ? data._provider.toUpperCase()
      : 'AI';

  return (
    <div className="flex flex-col gap-3 p-4">
      {data.briefing && (
        <div className="border border-white/[0.05] rounded-sm p-3 bg-white/[0.015]">
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="w-1 h-1 rounded-full bg-[#00d4ff]"
              style={{ boxShadow: '0 0 4px #00d4ffcc' }}
            />
            <span className="font-mono text-[8px] tracking-[0.25em] text-[#00d4ff]/60 uppercase">
              Intel Briefing
            </span>
            <span
              className="ml-auto font-mono text-[7px] px-1.5 py-px rounded-sm tracking-wider"
              style={{ color: '#00d4ff88', background: '#00d4ff12', border: '1px solid #00d4ff22' }}
            >
              {providerLabel}
            </span>
          </div>
          <p className="font-mono text-[9px] text-white/40 leading-relaxed">{data.briefing}</p>
        </div>
      )}
      <BulletSection label="MOVEMENT" bullets={data.movement ?? []} color="#00d4ff" />
      <BulletSection label="RISK" bullets={data.risk ?? []} color="#ff3b30" />
      <BulletSection label="OPPORTUNITY" bullets={data.opportunity ?? []} color="#00ff88" />
      <div className="mt-1">
        <PostureWidget />
      </div>
    </div>
  );
}
