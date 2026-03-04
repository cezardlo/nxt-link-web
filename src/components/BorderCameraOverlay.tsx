'use client';

import { useEffect, useState } from 'react';

import type { PortWaitTime } from '@/app/api/live/border-wait/route';
import type { CameraSnapshot } from '@/app/api/live/border-cameras/route';

type WaitApiResponse    = { ok: boolean; ports?: PortWaitTime[] };
type CameraApiResponse  = { ok: boolean; cameras?: CameraSnapshot[]; note?: string };

const SEVERITY_COLOR: Record<string, string> = {
  low:      '#00ff88',
  moderate: '#ffb800',
  high:     '#ff3b30',
};

const SEVERITY_LABEL: Record<string, string> = {
  low:      'LOW',
  moderate: 'AMBER',
  high:     'HIGH',
};

function minutesAgoLabel(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60_000);
    return mins < 1 ? 'just now' : `${mins}m ago`;
  } catch {
    return '';
  }
}

export function BorderCameraOverlay() {
  const [ports, setPorts]   = useState<PortWaitTime[]>([]);
  const [cameras, setCameras] = useState<CameraSnapshot[]>([]);
  const [loadingWait, setLoadingWait] = useState(true);
  const [hiddenCams, setHiddenCams]   = useState<Set<string>>(new Set());

  useEffect(() => {
    // Wait times
    fetch('/api/live/border-wait')
      .then((r) => r.json())
      .then((d: WaitApiResponse) => { if (d.ports) setPorts(d.ports); })
      .catch(() => {})
      .finally(() => setLoadingWait(false));

    // Camera thumbnails (best-effort)
    fetch('/api/live/border-cameras')
      .then((r) => r.json())
      .then((d: CameraApiResponse) => { if (d.cameras) setCameras(d.cameras); })
      .catch(() => {});
  }, []);

  const visibleCameras = cameras.filter((c) => !hiddenCams.has(c.id));

  return (
    <div className="absolute bottom-12 left-0 md:left-40 z-20 w-full md:w-72 bg-black/80 border border-white/8 rounded-sm backdrop-blur-md">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/6 flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-[0.2em] text-white/25">BORDER STATUS</span>
        <span className="font-mono text-[8px] text-white/15">LIVE</span>
      </div>

      {/* Wait times */}
      <div className="px-3 py-2">
        {loadingWait && ports.length === 0 ? (
          <p className="font-mono text-[9px] text-white/20 text-center py-1">Loading wait times…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ports.map((port) => {
              const color = SEVERITY_COLOR[port.severity] ?? '#888';
              const label = SEVERITY_LABEL[port.severity] ?? port.severity.toUpperCase();
              const ago   = minutesAgoLabel(port.lastUpdated);

              return (
                <div key={port.portCode} className="flex flex-col gap-0.5">
                  {/* Port name + severity pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                    />
                    <span className="font-mono text-[9px] text-white/60 flex-1 truncate">
                      {port.portName}
                    </span>
                    <span
                      className="font-mono text-[7px] px-1 rounded-sm"
                      style={{ background: `${color}18`, color }}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Commercial wait + lanes */}
                  <div className="flex items-center gap-2 pl-3">
                    <span className="font-mono text-[10px] font-bold" style={{ color }}>
                      {port.commercialWaitMin} min
                    </span>
                    <span className="font-mono text-[8px] text-white/25">commercial</span>
                    <span className="font-mono text-[8px] text-white/20 ml-auto">
                      {port.commercialLanesOpen}/{port.commercialLanesTotal} lanes
                    </span>
                  </div>

                  {/* Passenger wait + lanes */}
                  <div className="flex items-center gap-2 pl-3">
                    <span className="font-mono text-[8px] text-white/30">
                      {port.passengerWaitMin} min
                    </span>
                    <span className="font-mono text-[8px] text-white/20">passenger</span>
                    <span className="font-mono text-[8px] text-white/20 ml-auto">
                      {port.passengerLanesOpen}/{port.passengerLanesTotal} lanes
                    </span>
                  </div>

                  {/* Updated timestamp */}
                  {ago && (
                    <div className="pl-3">
                      <span className="font-mono text-[7px] text-white/12">{ago}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Camera thumbnails section */}
      <div className="border-t border-white/6">
        <div className="px-3 pt-1.5 pb-0.5">
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/15">TxDOT CAMERAS</span>
        </div>
        {visibleCameras.length > 0 ? (
          <div className="px-3 pb-2 pt-1 flex gap-1.5 overflow-x-auto">
            {visibleCameras.map((cam) => (
              <div key={cam.id} className="shrink-0" title={cam.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cam.imageUrl}
                  alt={cam.name}
                  width={100}
                  height={60}
                  className="rounded-sm object-cover opacity-70 hover:opacity-100 transition-opacity"
                  style={{ width: 100, height: 60 }}
                  onError={() =>
                    setHiddenCams((prev) => new Set([...Array.from(prev), cam.id]))
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 pb-2 font-mono text-[8px] text-white/18">
            No live cameras available
          </p>
        )}
      </div>
    </div>
  );
}
