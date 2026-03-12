'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TimeRange } from './useMapLayers';

export interface UseMissionBriefingReturn {
  missionBriefing: Record<string, unknown> | null;
  briefingLoading: boolean;
  handleMissionSubmit: (text: string) => void;
}

const STATIC_FALLBACK: Record<string, unknown> = {
  briefing: "El Paso technology corridor spans defense (Fort Bliss), border technology, logistics, energy, and health tech. The region hosts 19+ active technology vendors with $600M+ annual DoD procurement. Nearshoring acceleration is driving sustained border tech momentum through 2026.",
  movement: [
    'Fort Bliss defense corridor adding new vendor support contracts in Q1 2026',
    'Border tech sector at 5-year high as nearshoring volumes accelerate',
    'UTEP AI Research Lab NSF grant opens university-to-DoD technology transfer pipeline',
  ],
  risk: [
    'Workforce availability constraining scaling of defense IT vendors in El Paso corridor',
    'Cross-border logistics disruption risk elevated — CBP staffing gaps at Bridge of Americas',
  ],
  opportunity: [
    'El Paso MSA identified as Tier 1 DoD technology hub by Army Futures Command',
    'USMCA compliance technology gap creates $120M+ addressable market',
    'Medical Center district EHR modernization generating $40M in procurement opportunities',
  ],
  _provider: 'static',
};

export function useMissionBriefing(
  timeRange: TimeRange,
  activeLayers: Set<string>,
): UseMissionBriefingReturn {
  const [missionBriefing, setMissionBriefing] = useState<Record<string, unknown> | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const fetchBriefing = useCallback(async (text: string) => {
    setBriefingLoading(true);
    try {
      const res = await fetch('/api/intel/api/mission/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_text: text, timeRange, layers: Array.from(activeLayers) }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json() as Record<string, unknown>;
      if (
        Array.isArray(data.movement) ||
        Array.isArray(data.risk) ||
        Array.isArray(data.opportunity) ||
        typeof data.briefing === 'string'
      ) {
        setMissionBriefing(data);
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch {
      setMissionBriefing(STATIC_FALLBACK);
    } finally {
      setBriefingLoading(false);
    }
  }, [timeRange, activeLayers]);

  const handleMissionSubmit = useCallback((text: string) => {
    void fetchBriefing(text);
  }, [fetchBriefing]);

  // Auto-load default El Paso briefing on first mount
  useEffect(() => {
    void fetchBriefing('El Paso technology landscape defense border logistics');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    missionBriefing,
    briefingLoading,
    handleMissionSubmit,
  };
}
