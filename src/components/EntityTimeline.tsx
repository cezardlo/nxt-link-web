'use client';

import { useState, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

type EventType =
  | 'funding_round'
  | 'patent_filing'
  | 'contract_award'
  | 'product_launch'
  | 'merger_acquisition'
  | 'regulatory_action'
  | 'research_paper'
  | 'hiring_signal'
  | 'general';

type TimelineEvent = {
  id: string;
  date: string; // ISO date
  title: string;
  type: EventType;
  description?: string;
  source?: string;
};

type EntityTimelineProps = {
  events?: TimelineEvent[];
  accentColor?: string;
  maxVisible?: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<EventType, string> = {
  funding_round:      '#00ff88',
  patent_filing:      '#a855f7',
  contract_award:     '#ffd700',
  product_launch:     '#00d4ff',
  merger_acquisition: '#ff3b30',
  regulatory_action:  '#f97316',
  research_paper:     '#3b82f6',
  hiring_signal:      '#94a3b8',
  general:            'rgba(255,255,255,0.4)',
};

const TYPE_LABELS: Record<EventType, string> = {
  funding_round:      'FUNDING',
  patent_filing:      'PATENT',
  contract_award:     'CONTRACT',
  product_launch:     'PRODUCT',
  merger_acquisition: 'M&A',
  regulatory_action:  'REGULATORY',
  research_paper:     'RESEARCH',
  hiring_signal:      'HIRING',
  general:            'SIGNAL',
};

// ─── Demo Data ──────────────────────────────────────────────────────────────────

const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: 'demo-1',
    date: '2026-03-05',
    title: 'Series C Funding Round Closed at $180M',
    type: 'funding_round',
    description: 'Led by Andreessen Horowitz with participation from Tiger Global. Valuation estimated at $2.4B.',
    source: 'TechCrunch',
  },
  {
    id: 'demo-2',
    date: '2026-02-18',
    title: 'Patent Filed: Distributed Edge Inference Engine',
    type: 'patent_filing',
    description: 'US Patent Application covering real-time inference distribution across edge nodes with sub-10ms latency.',
  },
  {
    id: 'demo-3',
    date: '2026-01-22',
    title: 'DoD JADC2 Subcontract Awarded',
    type: 'contract_award',
    description: '$45M contract for sensor fusion middleware under the Joint All-Domain Command & Control program.',
    source: 'Defense One',
  },
  {
    id: 'demo-4',
    date: '2025-11-14',
    title: 'Platform v3.0 Launched with Autonomous Agents',
    type: 'product_launch',
    description: 'Major release introducing multi-agent orchestration, real-time knowledge graph updates, and predictive analytics.',
  },
  {
    id: 'demo-5',
    date: '2025-09-30',
    title: 'Acquired DataMesh Analytics (Tel Aviv)',
    type: 'merger_acquisition',
    description: 'Acquisition of 45-person geospatial analytics startup. Deal valued at $62M. Expands Middle East presence.',
    source: 'Bloomberg',
  },
  {
    id: 'demo-6',
    date: '2025-07-10',
    title: 'FedRAMP High Authorization Granted',
    type: 'regulatory_action',
    description: 'Platform achieved FedRAMP High impact level authorization, enabling deployment across federal agencies.',
  },
  {
    id: 'demo-7',
    date: '2025-04-02',
    title: 'Published: Scalable Graph Neural Networks for Supply Chain Risk',
    type: 'research_paper',
    description: 'Peer-reviewed paper at AAAI 2025 demonstrating 40% improvement in supply chain disruption prediction.',
    source: 'AAAI Proceedings',
  },
  {
    id: 'demo-8',
    date: '2024-12-15',
    title: 'Engineering Headcount Expanded by 60%',
    type: 'hiring_signal',
    description: 'Posted 85 new engineering roles across ML infrastructure, platform security, and developer experience.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${d.getUTCDate().toString().padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'upcoming';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function EntityTimeline({
  events,
  accentColor = '#00d4ff',
  maxVisible = 6,
}: EntityTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedEvents = useMemo(() => {
    const src = events && events.length > 0 ? events : DEMO_EVENTS;
    return [...src].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events]);

  const visibleEvents = showAll ? sortedEvents : sortedEvents.slice(0, maxVisible);
  const hasMore = sortedEvents.length > maxVisible;

  return (
    <div className="w-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[8px] tracking-[0.15em] font-mono uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          TIMELINE
        </span>
        <span
          className="text-[8px] tracking-wider font-mono"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {sortedEvents.length} EVENT{sortedEvents.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[5px] top-1 bottom-1 w-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />

        <div className="flex flex-col gap-0">
          {visibleEvents.map((evt, i) => {
            const color = TYPE_COLORS[evt.type];
            const typeLabel = TYPE_LABELS[evt.type];
            const isExpanded = expandedId === evt.id;
            const isLast = i === visibleEvents.length - 1;

            return (
              <div key={evt.id} className={`relative pl-6 ${isLast ? '' : 'pb-4'}`}>
                {/* Dot with glow */}
                <div
                  className="absolute left-[2px] top-[5px] w-[7px] h-[7px] rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}aa`,
                  }}
                />

                {/* Event content */}
                <button
                  type="button"
                  className="text-left w-full group"
                  onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                >
                  {/* Date row */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] tracking-[0.12em] font-mono"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      {formatDate(evt.date)}
                    </span>
                    <span
                      className="text-[7px] tracking-[0.1em] font-mono"
                      style={{ color: 'rgba(255,255,255,0.15)' }}
                    >
                      {relativeTime(evt.date)}
                    </span>
                  </div>

                  {/* Title + type badge */}
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[11px] font-mono leading-tight group-hover:opacity-90 transition-opacity"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      {evt.title}
                    </span>
                    <span
                      className="shrink-0 text-[6px] tracking-[0.12em] font-mono px-1 py-px rounded-sm border mt-0.5"
                      style={{
                        color,
                        borderColor: `${color}33`,
                        backgroundColor: `${color}0a`,
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>

                  {/* Expandable description */}
                  {isExpanded && (evt.description || evt.source) && (
                    <div className="mt-1.5 ml-0">
                      {evt.description && (
                        <p
                          className="text-[10px] font-mono leading-relaxed mb-1"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {evt.description}
                        </p>
                      )}
                      {evt.source && (
                        <span
                          className="text-[8px] tracking-[0.1em] font-mono"
                          style={{ color: accentColor, opacity: 0.5 }}
                        >
                          SOURCE: {evt.source}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Show More / Show Less */}
        {hasMore && (
          <button
            type="button"
            className="relative pl-6 pt-2 w-full text-left"
            onClick={() => setShowAll(!showAll)}
          >
            {/* Dot for "more" */}
            <div
              className="absolute left-[3px] top-[12px] w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            />
            <span
              className="text-[9px] tracking-[0.1em] font-mono cursor-pointer hover:opacity-60 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              {showAll
                ? '\u25B2 SHOW LESS'
                : `\u25BC SHOW ${sortedEvents.length - maxVisible} MORE`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
