'use client';

import { useState } from 'react';
import { Loader2, Play, RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PRIVATE_ACCESS_CODE } from '@/lib/privateAccess';

type JobStatus = 'idle' | 'running' | 'ok' | 'error';

type JobResult = {
  status: JobStatus;
  startedAt?: number;
  finishedAt?: number;
  payload?: unknown;
  error?: string;
};

type Job = {
  id: 'dedup' | 'yc';
  title: string;
  endpoint: string;
  description: string;
  expected: string;
  longRunning?: boolean;
};

const JOBS: Job[] = [
  {
    id: 'dedup',
    title: 'Dedup vendors',
    endpoint: '/api/admin/dedup-vendors',
    description: 'Groups vendors by their normalised URL, picks the highest-quality copy of each, marks the rest as duplicates so the catalog hides them. Idempotent — safe to run anytime.',
    expected: '~500 marked, runs in <10s.',
  },
  {
    id: 'yc',
    title: 'Import Y Combinator companies',
    endpoint: '/api/admin/import-yc',
    description: 'Pulls the public Y Combinator company directory and inserts new tech vendors into your catalog with status=active. Skips vendors whose URL is already in your table.',
    expected: '~3,000–5,000 inserted on first run, much fewer on subsequent runs.',
    longRunning: true,
  },
];

function JsonBlock({ value }: { value: unknown }) {
  let pretty: string;
  try {
    pretty = JSON.stringify(value, null, 2);
  } catch {
    pretty = String(value);
  }
  return (
    <pre className="overflow-x-auto rounded-xl border border-[#e2e6f2] bg-[#0b0d18] px-4 py-3 font-mono text-xs leading-relaxed text-[#a0b3ff]">
      {pretty}
    </pre>
  );
}

export default function AdminPage() {
  const [results, setResults] = useState<Record<string, JobResult>>({
    dedup: { status: 'idle' },
    yc: { status: 'idle' },
  });

  async function run(job: Job) {
    setResults((prev) => ({
      ...prev,
      [job.id]: { status: 'running', startedAt: Date.now() },
    }));
    try {
      const res = await fetch(job.endpoint, {
        method: 'POST',
        headers: { 'x-access-code': PRIVATE_ACCESS_CODE, 'content-type': 'application/json' },
      });
      const text = await res.text();
      let payload: unknown = text;
      try {
        payload = JSON.parse(text);
      } catch {
        // leave as text
      }
      setResults((prev) => ({
        ...prev,
        [job.id]: {
          status: res.ok ? 'ok' : 'error',
          startedAt: prev[job.id]?.startedAt,
          finishedAt: Date.now(),
          payload,
          error: res.ok ? undefined : `HTTP ${res.status}`,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [job.id]: {
          status: 'error',
          startedAt: prev[job.id]?.startedAt,
          finishedAt: Date.now(),
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8f9fd_0%,#eef3ff_52%,#fff7fb_100%)] px-4 py-12 text-[#111641] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#7f86a8]">Admin tools</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#11155f] sm:text-4xl">Run vendor catalog jobs</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#5c6486]">
          Click a button to run the job once. Each job is also wired to a Vercel cron schedule so it runs on its own
          going forward — these buttons are for manual kickoff and verification.
        </p>

        <div className="mt-8 space-y-5">
          {JOBS.map((job) => {
            const result = results[job.id] || { status: 'idle' as JobStatus };
            const running = result.status === 'running';
            const took = result.startedAt && result.finishedAt
              ? `${((result.finishedAt - result.startedAt) / 1000).toFixed(1)}s`
              : null;

            return (
              <section
                key={job.id}
                className="rounded-2xl border border-[#e2e6f2] bg-white/90 p-6 shadow-[0_18px_60px_rgba(52,64,110,0.08)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#11155f]">{job.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-[#5c6486]">{job.description}</p>
                    <p className="mt-2 font-mono text-[11px] text-[#7f86a8]">Expected: {job.expected}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => run(job)}
                    disabled={running}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#11155f] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(17,21,95,0.22)] transition hover:bg-[#1a2178] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {running ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Running…
                      </>
                    ) : result.status === 'ok' || result.status === 'error' ? (
                      <>
                        <RefreshCcw className="h-4 w-4" /> Run again
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Run now
                      </>
                    )}
                  </button>
                </div>

                {result.status !== 'idle' && (
                  <div className="mt-5 rounded-xl border border-[#e2e6f2] bg-[#f8f9fd] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {result.status === 'running' && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-[#11155f]" />
                            <span className="text-[#11155f]">
                              Running{job.longRunning ? ' — this can take 30–60 seconds…' : '…'}
                            </span>
                          </>
                        )}
                        {result.status === 'ok' && (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-[#0a8b50]" />
                            <span className="text-[#0a8b50]">Done {took ? `(${took})` : ''}</span>
                          </>
                        )}
                        {result.status === 'error' && (
                          <>
                            <AlertTriangle className="h-4 w-4 text-[#c44343]" />
                            <span className="text-[#c44343]">Failed {took ? `(${took})` : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {result.error && (
                      <p className="mt-2 text-xs text-[#c44343]">{result.error}</p>
                    )}
                    {result.payload !== undefined && (
                      <div className="mt-3">
                        <JsonBlock value={result.payload} />
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-[#7f86a8]">
          Both jobs also run on Vercel cron: dedup nightly at 14:30 UTC, YC import every Monday at 15:00 UTC.
        </p>
      </div>
    </div>
  );
}
