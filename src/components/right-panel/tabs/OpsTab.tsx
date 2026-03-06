'use client';

import { AccordionSection } from '@/components/right-panel/shared/AccordionSection';
import { FlightsSection } from '@/components/right-panel/sections/FlightsSection';
import { ConferenceSection } from '@/components/right-panel/sections/ConferenceSection';
import { SwarmStatusPanel } from '@/components/SwarmStatusPanel';
import type { FlightPoint } from '@/components/MapCanvas';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import type { ConferenceCluster } from '@/lib/utils/conference-clusters';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  flights: FlightPoint[];
  selectedConference: ConferenceRecord | null;
  onConferenceSelect: (c: ConferenceRecord | null) => void;
  selectedCluster: ConferenceCluster | null;
  onClusterSelect: (c: ConferenceCluster | null) => void;
};

// ─── OpsTab ───────────────────────────────────────────────────────────────────

export function OpsTab({ flights, selectedConference, onConferenceSelect, selectedCluster, onClusterSelect }: Props) {
  return (
    <div className="flex flex-col">
      <AccordionSection
        title="FLIGHTS"
        defaultOpen={flights.length > 0}
        count={flights.length || undefined}
        accentColor="#ffb800"
      >
        <FlightsSection flights={flights} />
      </AccordionSection>
      <AccordionSection title="SWARM" accentColor="#00ff88">
        <SwarmStatusPanel />
      </AccordionSection>
      {selectedCluster && (
        <AccordionSection
          title={`CONFERENCES · ${selectedCluster.locationLabel?.toUpperCase().split(',')[0] ?? 'CLUSTER'}`}
          defaultOpen={true}
          count={selectedCluster.count}
          accentColor="#00d4ff"
        >
          <ClusterList cluster={selectedCluster} onClose={() => onClusterSelect(null)} />
        </AccordionSection>
      )}
      {selectedConference && !selectedCluster && (
        <AccordionSection title="CONFERENCE" defaultOpen={true} accentColor="#ff8c00">
          <ConferenceSection
            conf={selectedConference}
            onClose={() => onConferenceSelect(null)}
          />
        </AccordionSection>
      )}
    </div>
  );
}

// ─── Cluster list — scrollable list of conferences in a city ──────────────────

function ClusterList({ cluster, onClose }: { cluster: ConferenceCluster; onClose: () => void }) {
  const sorted = [...cluster.conferences].sort((a, b) => b.relevanceScore - a.relevanceScore);
  const CATEGORY_HEX: Record<string, string> = {
    'Defense': '#ff6400',
    'Cybersecurity': '#00d4ff',
    'Manufacturing': '#00d4ff',
    'Logistics': '#ffb800',
    'Robotics': '#00ff88',
    'AI/ML': '#60a5fa',
    'Energy': '#ffd700',
    'Border/Gov': '#f97316',
    'Construction': '#ffb800',
    'Healthcare': '#00d4ff',
    'Workforce': '#ffb800',
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05]">
        <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
          {cluster.count} CONFERENCES
        </span>
        <button
          onClick={onClose}
          className="font-mono text-[9px] text-white/20 hover:text-white/50 transition-colors"
        >
          CLOSE ✕
        </button>
      </div>
      {sorted.map((c, i) => (
        <a
          key={`${c.name}-${i}`}
          href={c.website}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] group"
        >
          <div className="flex items-start gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
              style={{
                backgroundColor: CATEGORY_HEX[c.category] ?? '#00d4ff',
                boxShadow: `0 0 4px ${CATEGORY_HEX[c.category] ?? '#00d4ff'}80`,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] text-white/80 leading-tight group-hover:text-white transition-colors truncate">
                {c.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="font-mono text-[7px] tracking-[0.15em] px-1 py-px rounded-sm"
                  style={{
                    color: CATEGORY_HEX[c.category] ?? '#00d4ff',
                    border: `1px solid ${CATEGORY_HEX[c.category] ?? '#00d4ff'}30`,
                  }}
                >
                  {c.category.toUpperCase()}
                </span>
                {c.month && (
                  <span className="font-mono text-[7px] text-white/25">{c.month}</span>
                )}
              </div>
              {c.location && (
                <div className="font-mono text-[7px] text-white/20 mt-0.5 truncate">
                  {c.location}
                </div>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-end">
              <span className="font-mono text-[8px] text-white/30">{c.relevanceScore}</span>
              <div className="w-8 h-0.5 bg-white/5 rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.relevanceScore}%`,
                    backgroundColor: c.relevanceScore >= 75 ? '#00ff88' : c.relevanceScore >= 50 ? '#00d4ff' : '#ffb800',
                  }}
                />
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
