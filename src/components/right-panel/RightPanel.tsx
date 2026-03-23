'use client';

import { useEffect, useState } from 'react';
import type { SectorScore } from '@/lib/intelligence/signal-engine';
import type { FlightPoint } from '@/components/MapCanvas';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import type { ConferenceCluster } from '@/lib/utils/conference-clusters';

import { BriefingTab } from '@/components/right-panel/tabs/BriefingTab';
import { VendorTab } from '@/components/right-panel/tabs/VendorTab';
import { IntelTab } from '@/components/right-panel/tabs/IntelTab';
import { ProcureTab } from '@/components/right-panel/tabs/ProcureTab';
import { OpsTab } from '@/components/right-panel/tabs/OpsTab';

export type { SelectedPoint } from '@/components/right-panel/tabs/VendorTab';

/* ── Types ────────────────────────────────────────────────────────────── */

type BriefingData = {
  movement?: string[];
  risk?: string[];
  opportunity?: string[];
  briefing?: string;
  _provider?: string;
};

type Tab = 'brief' | 'vendor' | 'intel' | 'procure' | 'ops';

type Props = {
  selectedPoint: { id: string; label: string; category: string; entity_id?: string; layer?: string } | null;
  missionBriefing: BriefingData | null;
  briefingLoading: boolean;
  sectorScores?: SectorScore[];
  flights?: FlightPoint[];
  selectedConference?: ConferenceRecord | null;
  onConferenceSelect?: (c: ConferenceRecord | null) => void;
  selectedCluster?: ConferenceCluster | null;
  onClusterSelect?: (c: ConferenceCluster | null) => void;
  onMobileClose?: () => void;
};

/* ── Tab definitions ──────────────────────────────────────────────────── */

const TABS: { id: Tab; label: string; accent: string }[] = [
  { id: 'brief',   label: 'BRIEF',   accent: '#00d4ff' },
  { id: 'vendor',  label: 'VENDOR',  accent: '#ffb800' },
  { id: 'intel',   label: 'INTEL',   accent: '#00d4ff' },
  { id: 'procure', label: 'PROCURE', accent: '#00ff88' },
  { id: 'ops',     label: 'OPS',     accent: '#f97316' },
];

/* ── Component ────────────────────────────────────────────────────────── */

export function RightPanel({
  selectedPoint,
  missionBriefing,
  briefingLoading,
  sectorScores = [],
  flights = [],
  selectedConference,
  onConferenceSelect,
  selectedCluster,
  onClusterSelect,
  onMobileClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('brief');

  // Auto-switch to VENDOR when a vendor is selected
  useEffect(() => {
    if (selectedPoint) setActiveTab('vendor');
  }, [selectedPoint]);

  // Auto-switch to OPS when a conference or cluster is selected
  useEffect(() => {
    if (selectedConference || selectedCluster) setActiveTab('ops');
  }, [selectedConference, selectedCluster]);

  return (
    <div className="w-full md:w-72 flex flex-col bg-black/96 md:bg-black/80 border-l border-white/[0.05] backdrop-blur-md h-full pt-11 md:pt-0" role="complementary" aria-label="Intelligence panel">
      {/* Mobile drag handle + close */}
      {onMobileClose && (
        <>
          <div className="md:hidden shrink-0 flex justify-center pt-2 pb-1">
            <div className="w-8 h-0.5 rounded-full bg-white/15" />
          </div>
          <div className="md:hidden flex items-center justify-between px-3 py-1 border-b border-white/[0.05] shrink-0">
            <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">Intel Panel</span>
            <button
              onClick={onMobileClose}
              aria-label="Close intelligence panel"
              className="font-mono text-[10px] text-white/25 hover:text-white/60 transition-colors px-2 py-1"
            >
              ✕
            </button>
          </div>
        </>
      )}

      {/* 5-tab bar */}
      <div role="tablist" aria-label="Intelligence panel tabs" className="flex border-b border-white/[0.05] shrink-0 bg-black/40">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          // Indicator dots
          const showDot =
            (tab.id === 'vendor' && !!selectedPoint) ||
            (tab.id === 'ops' && !!(selectedConference || selectedCluster));

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              className={`flex-1 py-2.5 font-mono text-[9px] tracking-[0.15em] transition-all duration-150 relative ${
                isActive ? 'font-bold' : 'text-white/18 hover:text-white/40'
              }`}
              style={isActive ? { color: tab.accent } : {}}
            >
              <span className="flex items-center justify-center gap-1">
                {tab.label}
                {showDot && !isActive && (
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: tab.accent, boxShadow: `0 0 4px ${tab.accent}` }}
                  />
                )}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: tab.accent, boxShadow: `0 0 4px ${tab.accent}cc` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {activeTab === 'brief' && (
          <BriefingTab data={missionBriefing} loading={briefingLoading} />
        )}
        {activeTab === 'vendor' && (
          <VendorTab selectedPoint={selectedPoint} />
        )}
        {activeTab === 'intel' && (
          <IntelTab sectorScores={sectorScores} />
        )}
        {activeTab === 'procure' && (
          <ProcureTab />
        )}
        {activeTab === 'ops' && (
          <OpsTab
            flights={flights}
            selectedConference={selectedConference ?? null}
            onConferenceSelect={onConferenceSelect ?? (() => {})}
            selectedCluster={selectedCluster ?? null}
            onClusterSelect={onClusterSelect ?? (() => {})}
          />
        )}
      </div>
    </div>
  );
}
