'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';

type EntityData = {
  id: string;
  slug: string;
  name: string;
  entity_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Signal = {
  id: string;
  signal_type: string;
  title: string;
  company: string | null;
  industry: string | null;
  confidence: number;
  discovered_at: string;
};

type Relationship = {
  id: string;
  related_name: string;
  related_slug: string;
  relationship_type: string;
  strength: number;
};

const SIGNAL_COLORS: Record<string, string> = {
  contract_award: '#ffd700',
  funding_round: '#00ff88',
  product_launch: '#00d4ff',
  hiring_signal: '#a855f7',
  patent_filing: '#ffb800',
  merger_acquisition: '#f97316',
  regulatory_action: '#ff3b30',
};

export default function EntityProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [entity, setEntity] = useState<EntityData | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [ikerHistory] = useState<Array<{ score: number; date: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [ikerScore, setIkerScore] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch entity from knowledge graph API
        const [entityRes, signalsRes, ikerRes] = await Promise.allSettled([
          fetch(`/api/knowledge-graph?entity=${encodeURIComponent(id)}`),
          fetch(`/api/intel-signals?company=${encodeURIComponent(id)}&limit=10`),
          fetch(`/api/iker/leaderboard?limit=500`),
        ]);

        if (entityRes.status === 'fulfilled' && entityRes.value.ok) {
          const data = await entityRes.value.json() as { entity?: EntityData; relationships?: Relationship[] };
          if (data.entity) setEntity(data.entity);
          if (data.relationships) setRelationships(data.relationships.slice(0, 10));
        }

        if (signalsRes.status === 'fulfilled' && signalsRes.value.ok) {
          const data = await signalsRes.value.json() as { signals?: Signal[] };
          if (data.signals) setSignals(data.signals.slice(0, 15));
        }

        if (ikerRes.status === 'fulfilled' && ikerRes.value.ok) {
          const data = await ikerRes.value.json() as { leaderboard?: Array<{ id: string; iker_score: number }> };
          const entry = data.leaderboard?.find(e => e.id === id);
          if (entry) setIkerScore(entry.iker_score);
        }
      } catch { /* keep empty */ }
      setLoading(false);
    }
    void load();
  }, [id]);

  const score = ikerScore ?? (entity?.metadata?.iker_score as number) ?? null;
  const category = (entity?.metadata?.category as string) ?? 'Unknown';

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
      <PageTopBar
        backHref="/iker"
        backLabel="LEADERBOARD"
        breadcrumbs={[{ label: 'ENTITY', href: '/iker' }, { label: entity?.name ?? id.toUpperCase() }]}
        showLiveDot
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-[8px] text-white/25 tracking-widest animate-pulse">LOADING ENTITY…</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Hero */}
          <div className="border border-white/[0.06] rounded-sm p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-mono text-base text-white tracking-wide mb-1">
                  {entity?.name ?? id}
                </h1>
                <span className="font-mono text-[7px] tracking-[0.2em] text-white/30 uppercase">{category}</span>
                {entity?.description && (
                  <p className="font-mono text-[8px] text-white/40 mt-3 leading-relaxed max-w-lg">
                    {entity.description}
                  </p>
                )}
              </div>

              {score !== null && (
                <div className="text-right shrink-0">
                  <div
                    className="font-mono text-3xl font-bold tabular-nums"
                    style={{ color: score >= 80 ? '#00d4ff' : score >= 60 ? '#ffd700' : '#f97316' }}
                  >
                    {score}
                  </div>
                  <div className="font-mono text-[7px] text-white/25 tracking-[0.2em] mt-1">IKER SCORE</div>
                  <Link
                    href="/iker"
                    className="font-mono text-[6px] text-[#00d4ff]/40 hover:text-[#00d4ff] transition-colors"
                  >
                    LEADERBOARD →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Recent Signals */}
            <div className="border border-white/[0.06] rounded-sm" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="font-mono text-[7px] tracking-[0.25em] text-[#00d4ff]">RECENT SIGNALS</span>
                <span className="font-mono text-[6px] text-white/25">{signals.length} FOUND</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {signals.length === 0 ? (
                  <div className="px-4 py-6 text-center font-mono text-[7px] text-white/20">
                    NO SIGNALS YET — SYSTEM IS WATCHING
                  </div>
                ) : (
                  signals.map(sig => (
                    <div key={sig.id} className="px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: SIGNAL_COLORS[sig.signal_type] ?? '#6b7280' }}
                        />
                        <div>
                          <p className="font-mono text-[8px] text-white/60 leading-snug">{sig.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[6px] text-white/20">
                              {new Date(sig.discovered_at).toLocaleDateString()}
                            </span>
                            <span className="font-mono text-[6px] text-white/20">
                              {Math.round(sig.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Relationships */}
            <div className="border border-white/[0.06] rounded-sm" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="font-mono text-[7px] tracking-[0.25em] text-[#a855f7]">KNOWLEDGE GRAPH</span>
                <span className="font-mono text-[6px] text-white/25">{relationships.length} LINKS</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {relationships.length === 0 ? (
                  <div className="px-4 py-6 text-center font-mono text-[7px] text-white/20">
                    GRAPH BUILDING…
                  </div>
                ) : (
                  relationships.map(rel => (
                    <div key={rel.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="font-mono text-[6px] text-white/20 w-20 shrink-0">
                        {rel.relationship_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Link
                        href={`/entity/${rel.related_slug}`}
                        className="font-mono text-[8px] text-white/50 hover:text-[#a855f7] transition-colors"
                      >
                        {rel.related_name}
                      </Link>
                      <div className="flex-1 h-[2px] bg-white/[0.04] rounded-full overflow-hidden ml-auto" style={{ maxWidth: 40 }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${rel.strength * 100}%`, backgroundColor: '#a855f7' }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* IKER history chart placeholder */}
          {ikerHistory.length === 0 && (
            <div className="border border-white/[0.06] rounded-sm p-4" style={{ background: 'rgba(255,215,0,0.02)' }}>
              <span className="font-mono text-[7px] tracking-[0.2em] text-[#ffd700]/50">
                IKER HISTORY — Accumulating from daily learning runs. Will show trend after 7+ days of data.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
