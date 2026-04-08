// GET /api/signals/stream — Server-Sent Events for real-time signal updates
// Subscribes to Supabase Realtime postgres_changes on intel_signals (INSERT).
// Supports ?severity=P0,P1 to filter by importance tiers.
// Sends heartbeat comments every 30s to keep the connection alive.

export const dynamic = 'force-dynamic';
import { getIntelSignals } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';
import { getSupabaseClient } from '@/lib/supabase/client';

export const maxDuration = 300; // 5 min max (Vercel limit)

// ─── Severity → importance_score mapping ────────────────────────────────────
// P0 = critical (≥0.85), P1 = high (≥0.70), P2 = medium (≥0.50), P3 = low (<0.50)
const SEVERITY_THRESHOLDS: Record<string, [number, number]> = {
  P0: [0.85, 1.0],
  P1: [0.70, 0.849],
  P2: [0.50, 0.699],
  P3: [0.0, 0.499],
};

function importanceMatchesSeverity(
  importance: number,
  severities: string[] | null,
): boolean {
  if (!severities || severities.length === 0) return true;
  return severities.some((sev) => {
    const range = SEVERITY_THRESHOLDS[sev.toUpperCase()];
    if (!range) return false;
    return importance >= range[0] && importance <= range[1];
  });
}

type SignalPayload = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url: string | null;
};

function mapSignalRow(s: {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance_score: number;
  discovered_at: string;
  url: string | null;
}): SignalPayload {
  return {
    id: s.id,
    title: s.title,
    signal_type: s.signal_type,
    industry: s.industry,
    company: s.company,
    importance: s.importance_score,
    discovered_at: s.discovered_at,
    url: s.url,
  };
}

export async function GET(request: Request): Promise<Response> {
  // ─── Check Supabase availability ────────────────────────────────────────
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Supabase is not configured' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // ─── Parse severity filter ──────────────────────────────────────────────
  const url = new URL(request.url);
  const severityParam = url.searchParams.get('severity');
  const severities = severityParam
    ? severityParam.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  const encoder = new TextEncoder();
  let alive = true;

  const stream = new ReadableStream({
    start(controller) {
      // Helper to safely enqueue
      function send(chunk: string) {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed
          alive = false;
        }
      }

      // ─── 1. Send initial connection event ───────────────────────────────
      send(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString(), severities })}\n\n`);

      // ─── 2. Send existing top signals (batch) ──────────────────────────
      (async () => {
        try {
          const existing = await getIntelSignals({ limit: 20 });
          const filtered = existing
            .map(mapSignalRow)
            .filter((s) => importanceMatchesSeverity(s.importance, severities));

          if (filtered.length > 0) {
            send(`event: batch\ndata: ${JSON.stringify(filtered)}\n\n`);
          }
        } catch {
          // Non-fatal — initial batch failed, continue with realtime
        }
      })();

      // ─── 3. Subscribe to Supabase Realtime ─────────────────────────────
      let channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null = null;

      try {
        // Use service role client for server-side realtime subscription
        const supabase = getSupabaseClient({ admin: true });

        const channelName = `sse_intel_signals_${Date.now()}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel = (supabase.channel(channelName) as any)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'intel_signals',
            },
            (payload: { new: Record<string, unknown> }) => {
              if (!alive) return;

              const row = payload.new as {
                id: string;
                title: string;
                signal_type: string;
                industry: string;
                company: string | null;
                importance_score: number;
                discovered_at: string;
                url: string | null;
              };

              const signal = mapSignalRow(row);

              // Apply severity filter
              if (!importanceMatchesSeverity(signal.importance, severities)) {
                return;
              }

              send(`data: ${JSON.stringify(signal)}\n\n`);
            },
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              send(`event: subscribed\ndata: ${JSON.stringify({ table: 'intel_signals', time: new Date().toISOString() })}\n\n`);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              send(`event: error\ndata: ${JSON.stringify({ message: 'Realtime subscription failed', status })}\n\n`);
            }
          });
      } catch (err) {
        send(`event: error\ndata: ${JSON.stringify({ message: 'Failed to setup realtime', detail: err instanceof Error ? err.message : 'unknown' })}\n\n`);
      }

      // ─── 4. Heartbeat every 30 seconds ─────────────────────────────────
      const heartbeatInterval = setInterval(() => {
        if (!alive) {
          clearInterval(heartbeatInterval);
          return;
        }
        send(`: heartbeat\n\n`);
      }, 30_000);

      // ─── 5. Safety timeout before Vercel 5-min limit ───────────────────
      const safetyTimeout = setTimeout(() => {
        cleanup();
      }, 290_000);

      // ─── 6. Client disconnect cleanup ──────────────────────────────────
      request.signal.addEventListener('abort', () => {
        cleanup();
      });

      function cleanup() {
        if (!alive) return;
        alive = false;

        clearInterval(heartbeatInterval);
        clearTimeout(safetyTimeout);

        // Unsubscribe from Supabase channel
        if (channel) {
          try {
            channel.unsubscribe();
          } catch {
            // ignore cleanup errors
          }
        }

        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },

    cancel() {
      alive = false;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
