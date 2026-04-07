'use client';

import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { motion } from 'framer-motion';

const API = 'https://yvykselwehxjwsqercjg.supabase.co/functions/v1/signal-insights';

type SG = { name: string; count: number; tech_count?: number; region_count?: number };
type Sig = {
  id: string;
  title: string;
  industry?: string;
  technology?: string;
  region?: string;
  problem?: string;
  importance_score?: number;
  source?: string;
  company?: string;
};

const GROUP_OPTIONS = [
  { value: 'industry', label: 'Industry', color: 'text-nxt-accent' },
  { value: 'technology', label: 'Technology', color: 'text-nxt-green' },
  { value: 'region', label: 'Region', color: 'text-purple-400' },
  { value: 'problem', label: 'Problem', color: 'text-nxt-amber' },
];

const TAG_STYLES: Record<string, string> = {
  industry: 'bg-nxt-accent/10 text-nxt-accent-light border-nxt-accent/20',
  technology: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  region: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  problem: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function importanceColor(score: number): string {
  if (score >= 70) return 'bg-red-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function SignalRow({ s }: { s: Sig }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] flex gap-3">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${importanceColor(s.importance_score || 0)}`} />
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-nxt-text">{s.title}</div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {s.industry && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_STYLES.industry}`}>{s.industry}</span>
          )}
          {s.technology && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_STYLES.technology}`}>{s.technology}</span>
          )}
          {s.region && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_STYLES.region}`}>{s.region}</span>
          )}
          {s.problem && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_STYLES.problem}`}>{s.problem}</span>
          )}
        </div>
        {s.source && (
          <div className="text-[11px] text-nxt-dim mt-2">
            {s.source}{s.company ? ` · ${s.company}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const [groupBy, setGroupBy] = useState('industry');
  const [groups, setGroups] = useState<SG[]>([]);
  const [recent, setRecent] = useState<Sig[]>([]);
  const [stats, setStats] = useState({ tagged: 0, untagged: 0, total: 0 });
  const [drilldown, setDrilldown] = useState<{ field: string; value: string; sigs: Sig[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setDrilldown(null);
    try {
      const r = await fetch(`${API}?group=${groupBy}`);
      const d = await r.json();
      setGroups(d.groups || []);
      setRecent(d.recent || []);
      if (d.stats) setStats(d.stats);
    } catch {
      // silent
    }
    setLoading(false);
  };

  const drill = async (field: string, value: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?${field}=${encodeURIComponent(value)}&limit=100`);
      const d = await r.json();
      setDrilldown({ field, value, sigs: d.signals || [] });
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [groupBy]);

  const pct = stats.total > 0 ? Math.round((stats.tagged / stats.total) * 100) : 0;

  return (
    <PageTransition>
      <div className="min-h-screen bg-nxt-bg text-nxt-text">
        <div className="max-w-[1200px] mx-auto px-6 py-10 pb-20">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-nxt-text font-grotesk">Signal Intelligence</h1>
              <p className="text-sm text-nxt-muted mt-1">Global signal enrichment and classification across all sectors.</p>
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <span><span className="font-bold text-nxt-accent">{stats.tagged.toLocaleString()}</span> <span className="text-nxt-dim">tagged</span></span>
              <span><span className="font-bold text-nxt-amber">{stats.untagged.toLocaleString()}</span> <span className="text-nxt-dim">pending</span></span>
              <span><span className="font-bold text-nxt-text">{stats.total.toLocaleString()}</span> <span className="text-nxt-dim">total</span></span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-6">
            {drilldown && (
              <button
                onClick={() => setDrilldown(null)}
                className="px-4 py-2 rounded-xl bg-nxt-elevated text-nxt-accent border border-nxt-border text-[13px] font-medium hover:bg-nxt-surface transition-colors cursor-pointer"
              >
                ← Back
              </button>
            )}
            <span className="text-[13px] text-nxt-secondary">Group by:</span>
            <div className="flex gap-1.5">
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGroupBy(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                    groupBy === opt.value
                      ? 'bg-nxt-accent/10 text-nxt-accent-light border border-nxt-accent/20'
                      : 'text-nxt-muted border border-nxt-border hover:text-nxt-secondary hover:border-nxt-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enrichment Progress */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 mb-8 flex items-center gap-4">
            <span className="text-[12px] text-nxt-secondary shrink-0">
              Enrichment: {stats.tagged.toLocaleString()}/{stats.total.toLocaleString()} ({pct}%)
            </span>
            <div className="flex-1 h-1.5 bg-nxt-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-nxt-accent to-emerald-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {loading && (
            <div className="text-center py-20">
              <div className="w-8 h-8 border-2 border-nxt-accent/20 border-t-nxt-accent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-[11px] tracking-wider uppercase text-nxt-dim">Loading signals...</span>
            </div>
          )}

          {/* Groups View */}
          {!loading && !drilldown && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-nxt-dim mb-4">
                Signal Groups by {groupBy}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-10">
                {groups.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => drill(groupBy, g.name)}
                    className="group text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-lg hover:shadow-nxt-accent/5 cursor-pointer"
                  >
                    <div className="text-2xl font-mono font-bold text-nxt-accent">{g.count}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-nxt-dim">signals</div>
                    <div className="text-[15px] font-semibold mt-2 capitalize text-nxt-text group-hover:text-nxt-accent-light transition-colors">{g.name}</div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.06] text-[12px] text-nxt-dim">
                      <span><span className="font-bold text-emerald-400">{g.tech_count || 0}</span> tech</span>
                      <span><span className="font-bold text-purple-400">{g.region_count || 0}</span> regions</span>
                    </div>
                  </button>
                ))}
              </div>

              <h2 className="text-[11px] font-mono uppercase tracking-widest text-nxt-dim mb-4">
                Recent Tagged Signals
              </h2>
              <div className="flex flex-col gap-2">
                {recent.map((s) => <SignalRow key={s.id} s={s} />)}
              </div>
            </motion.div>
          )}

          {/* Drilldown View */}
          {!loading && drilldown && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-bold mb-6 font-grotesk">
                <span className="text-nxt-accent capitalize">{drilldown.value}</span>
                {' — '}{drilldown.sigs.length} Signals
              </h2>
              <div className="flex flex-col gap-2">
                {drilldown.sigs.map((s) => <SignalRow key={s.id} s={s} />)}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
