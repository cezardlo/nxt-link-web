'use client';

import dynamic from 'next/dynamic';
import { useMemo, type ComponentType } from 'react';

// Excalidraw is browser-only — must not be SSR'd
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Excalidraw = dynamic<any>(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw as ComponentType<unknown>,
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[500px] rounded-sm animate-pulse"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      />
    ),
  }
);

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiagramNode = { name: string; role?: string; maturity?: string };

export type EcosystemDiagramProps = {
  industryName: string;
  companies: DiagramNode[];
  technologies: DiagramNode[];
};

// Minimal shape accepted by Excalidraw's initialData.elements
type RawElement = Record<string, unknown>;

// ─── Layout constants ─────────────────────────────────────────────────────────

const CX = 500;
const CY = 340;
const COMPANY_R = 210;
const TECH_R = 370;
const W = 140;
const H = 36;

// ─── Element factories ────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function baseFields(id: string): RawElement {
  return {
    id,
    opacity: 100,
    seed: Math.floor(Math.random() * 99999),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    angle: 0,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    fillStyle: 'solid',
    roughness: 0,
    strokeWidth: 1,
  };
}

function rect(cx: number, cy: number, label: string, stroke: string, fill: string): RawElement[] {
  const id = uid('r');
  const tid = uid('t');
  const x = cx - W / 2;
  const y = cy - H / 2;
  const truncated = label.length > 17 ? label.slice(0, 16) + '…' : label;
  return [
    {
      ...baseFields(id),
      type: 'rectangle',
      x, y, width: W, height: H,
      strokeColor: stroke,
      backgroundColor: fill,
    },
    {
      ...baseFields(tid),
      type: 'text',
      x: x + 6, y: y + 10,
      width: W - 12, height: H,
      strokeColor: stroke,
      backgroundColor: 'transparent',
      text: truncated,
      originalText: truncated,
      fontSize: 11,
      fontFamily: 3,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: null,
      autoResize: false,
    },
  ];
}

function arrow(x1: number, y1: number, x2: number, y2: number, stroke: string): RawElement {
  return {
    ...baseFields(uid('a')),
    type: 'arrow',
    x: x1, y: y1,
    width: x2 - x1, height: y2 - y1,
    strokeColor: stroke,
    backgroundColor: 'transparent',
    strokeStyle: 'solid',
    opacity: 35,
    points: [[0, 0], [x2 - x1, y2 - y1]],
    startArrowhead: null,
    endArrowhead: 'arrow',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EcosystemDiagram({ industryName, companies, technologies }: EcosystemDiagramProps) {
  const elements = useMemo((): RawElement[] => {
    const all: RawElement[] = [];

    // Center node — cyan
    all.push(...rect(CX, CY, industryName.toUpperCase(), '#00d4ff', '#00d4ff22'));

    // Inner ring — companies (green)
    const comps = companies.slice(0, 8);
    comps.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / comps.length - Math.PI / 2;
      const nx = CX + COMPANY_R * Math.cos(angle);
      const ny = CY + COMPANY_R * Math.sin(angle);
      all.push(arrow(CX, CY, nx, ny, '#00ff88'));
      all.push(...rect(nx, ny, c.name, '#00ff88', '#00ff8822'));
    });

    // Outer ring — technologies (purple), offset by half-step so they don't overlap companies
    const techs = technologies.slice(0, 8);
    const offset = techs.length > 0 ? Math.PI / techs.length : 0;
    techs.forEach((t, i) => {
      const angle = (2 * Math.PI * i) / techs.length - Math.PI / 2 + offset;
      const nx = CX + TECH_R * Math.cos(angle);
      const ny = CY + TECH_R * Math.sin(angle);
      all.push(arrow(CX, CY, nx, ny, '#a855f7'));
      all.push(...rect(nx, ny, t.name, '#a855f7', '#a855f722'));
    });

    return all;
  }, [industryName, companies, technologies]);

  return (
    <div style={{ height: 500, background: '#0a0a0a', borderRadius: 2, overflow: 'hidden' }}>
      <Excalidraw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialData={{ elements: elements as any, appState: { viewBackgroundColor: '#0a0a0a', theme: 'dark' } }}
        viewModeEnabled={true}
        zenModeEnabled={false}
        gridModeEnabled={false}
      />
    </div>
  );
}
