'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IKERPanel } from '@/components/IKERPanel';

type VendorDetail = {
  id?: string;
  name?: string;
  description?: string;
  website?: string;
  tags?: string[];
  evidence?: string[];
  category?: string;
  final_score?: number;
  momentum_score?: number;
  state?: string;
  signals?: { funding?: number; patents?: number; hiring?: number };
  briefing?: string;
};

const STUB: VendorDetail = {
  name: 'Loading...',
  category: 'Technology',
  tags: [],
  evidence: [],
};

export default function VendorPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [vendor, setVendor] = useState<VendorDetail>(STUB);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/intel/api/vendors/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json() as Promise<VendorDetail>;
      })
      .then((d) => {
        if (!cancelled && d) setVendor(d);
      })
      .catch(() => {
        if (!cancelled) setVendor({ ...STUB, name: id, briefing: 'Intel backend offline.' });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

      {/* TOP BAR */}
      <div className="shrink-0 h-10 flex items-center gap-3 px-4 bg-black border-b border-white/5">
        <Link
          href="/map"
          className="flex items-center gap-1.5 font-mono text-[10px] text-white/25 hover:text-[#00d4ff] transition-colors tracking-widest"
        >
          <span>←</span>
          <span>MAP</span>
        </Link>

        <div className="w-px h-4 bg-white/8 shrink-0" />

        <span className="font-mono text-[10px] text-white/15 tracking-[0.25em]">VENDOR DOSSIER</span>

        {loading && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
        )}

        <div className="flex-1" />

        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-white/20 hover:text-emerald-400 tracking-wider transition-colors"
          >
            WEBSITE ↗
          </a>
        )}
      </div>

      {/* MAIN CONTENT */}
      {notFound ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <p className="font-mono text-[#ff3b30] text-sm tracking-wider">VENDOR NOT FOUND</p>
            <p className="font-mono text-white/25 text-xs">ID: {id}</p>
            <Link href="/map" className="font-mono text-[10px] text-[#00d4ff] hover:underline">
              ← Return to map
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">

          {/* LEFT — IKER panel */}
          <div className="w-72 shrink-0 border-r border-white/5 overflow-y-auto scrollbar-thin">
            <div className="p-4 border-b border-white/5">
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/20">IKER INTELLIGENCE</p>
            </div>
            <IKERPanel vendorId={id} />
          </div>

          {/* RIGHT — Dossier detail */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">

            {/* Header */}
            <div className="space-y-1 border-b border-white/5 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-mono text-2xl font-bold text-white tracking-tight">
                    {loading ? '···' : (vendor.name ?? id)}
                  </h1>
                  <p className="font-mono text-xs text-white/30 mt-1 tracking-wider">
                    {vendor.category ?? '—'}
                  </p>
                </div>
                {vendor.state && (
                  <span
                    className="font-mono text-[10px] font-bold tracking-widest shrink-0 px-3 py-1.5 border rounded-sm"
                    style={{
                      color: stateColor(vendor.state),
                      borderColor: `${stateColor(vendor.state)}30`,
                      background: `${stateColor(vendor.state)}08`,
                    }}
                  >
                    {vendor.state.toUpperCase()}
                  </span>
                )}
              </div>

              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-emerald-400/50 hover:text-emerald-400 transition-colors block mt-2 truncate"
                >
                  {vendor.website}
                </a>
              )}
            </div>

            {/* Description */}
            {vendor.description && (
              <div className="space-y-2">
                <p className="font-mono text-[9px] tracking-[0.25em] text-white/20">DESCRIPTION</p>
                <p className="font-mono text-sm text-white/45 leading-relaxed">
                  {vendor.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {vendor.tags && vendor.tags.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[9px] tracking-[0.25em] text-white/20">TECHNOLOGY TAGS</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] px-2 py-0.5 border border-white/8 rounded-sm text-white/35 hover:border-[#00d4ff]/30 hover:text-[#00d4ff]/60 transition-colors cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence */}
            {vendor.evidence && vendor.evidence.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[9px] tracking-[0.25em] text-white/20">
                  EVIDENCE <span className="text-white/10">({vendor.evidence.length})</span>
                </p>
                <div className="space-y-2">
                  {vendor.evidence.map((item, i) => (
                    <div
                      key={i}
                      className="border border-white/5 rounded-sm p-3 hover:border-white/10 transition-colors"
                    >
                      <p className="font-mono text-[10px] text-white/35 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IKER Briefing */}
            {vendor.briefing && (
              <div className="border border-emerald-400/10 rounded-sm p-4 bg-emerald-400/3">
                <p className="font-mono text-[9px] tracking-[0.25em] text-emerald-400/60 mb-2">IKER SAYS</p>
                <p className="font-mono text-sm text-white/40 leading-relaxed">{vendor.briefing}</p>
              </div>
            )}

            {/* Raw ID footer */}
            <div className="pt-4 border-t border-white/5">
              <p className="font-mono text-[9px] text-white/10 tracking-wider">VENDOR ID: {id}</p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function stateColor(state: string): string {
  const s = state.toUpperCase();
  if (s === 'ACCELERATING') return '#00ff88';
  if (s === 'EMERGING') return '#00d4ff';
  if (s === 'STABLE') return '#ffb800';
  return '#ff3b30';
}
