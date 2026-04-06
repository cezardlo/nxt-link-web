'use client';

import { useEffect, useState } from 'react';

type TestResult = {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  latencyMs?: number;
};

export default function TestApiPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = Date.now();
    fetch('/api/intel/feed?tab=all&industry=ALL&q=&page=0&page_size=5')
      .then(async (res) => {
        const data = await res.json();
        setResult({ ok: res.ok, status: res.status, data, latencyMs: Date.now() - start });
      })
      .catch((err) => {
        setResult({ ok: false, error: String(err), latencyMs: Date.now() - start });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', background: '#0a0a0a', color: '#e5e5e5', minHeight: '100vh' }}>
      <h1 style={{ color: '#00ff88', marginBottom: '1rem' }}>NXT LINK — API Diagnostic</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Testing <code style={{ color: '#ffcc00' }}>/api/intel/feed</code> from the browser.</p>
      {loading && <p style={{ color: '#888' }}>Fetching...</p>}
      {result && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: result.ok ? '#00ff88' : '#ff4444', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {result.ok ? 'SUCCESS' : 'FAILED'}
            </span>
            {result.status && <span style={{ color: '#888', marginLeft: '1rem' }}>HTTP {result.status}</span>}
            {result.latencyMs && <span style={{ color: '#888', marginLeft: '1rem' }}>{result.latencyMs}ms</span>}
          </div>
          {result.error && (
            <pre style={{ color: '#ffaaaa', background: '#1a0000', padding: '1rem', borderRadius: '4px' }}>{result.error}</pre>
          )}
          {result.data && (
            <div>
              <p style={{ color: '#888' }}>
                Signals: <strong style={{ color: '#00ff88' }}>{(result.data as { signals?: unknown[] }).signals?.length ?? 0}</strong>
                {' / '}Total: <strong style={{ color: '#00ff88' }}>{(result.data as { totalCount?: number }).totalCount ?? '?'}</strong>
              </p>
              <details>
                <summary style={{ cursor: 'pointer', color: '#888' }}>Raw response</summary>
                <pre style={{ background: '#111', padding: '1rem', borderRadius: '4px', overflow: 'auto', maxHeight: '400px', fontSize: '0.75rem' }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
