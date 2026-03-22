// GET /api/signals/stream — Server-Sent Events for real-time signal updates
// Clients connect once, receive new signals as they appear in Supabase.
// Polls intel_signals every 30s for new entries since last check.

import { getIntelSignals } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max (Vercel limit)

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let lastCheck = new Date().toISOString();
  let alive = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: lastCheck })}\n\n`));

      // Send existing top signals on connect
      try {
        if (isSupabaseConfigured()) {
          const existing = await getIntelSignals({ limit: 10 });
          if (existing.length > 0) {
            controller.enqueue(encoder.encode(
              `event: batch\ndata: ${JSON.stringify(existing.map(s => ({
                id: s.id,
                title: s.title,
                signal_type: s.signal_type,
                industry: s.industry,
                company: s.company,
                importance: s.importance_score,
                discovered_at: s.discovered_at,
                url: s.url,
              })))}\n\n`
            ));
          }
        }
      } catch {
        // Non-fatal — continue polling
      }

      // Poll for new signals every 30 seconds
      const interval = setInterval(async () => {
        if (!alive) {
          clearInterval(interval);
          return;
        }

        try {
          if (!isSupabaseConfigured()) {
            controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`));
            return;
          }

          const newSignals = await getIntelSignals({ since: lastCheck, limit: 20 });
          lastCheck = new Date().toISOString();

          if (newSignals.length > 0) {
            const mapped = newSignals.map(s => ({
              id: s.id,
              title: s.title,
              signal_type: s.signal_type,
              industry: s.industry,
              company: s.company,
              importance: s.importance_score,
              discovered_at: s.discovered_at,
              url: s.url,
            }));

            controller.enqueue(encoder.encode(
              `event: signals\ndata: ${JSON.stringify(mapped)}\n\n`
            ));
          } else {
            // Heartbeat to keep connection alive
            controller.enqueue(encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ time: lastCheck, count: 0 })}\n\n`
            ));
          }
        } catch {
          controller.enqueue(encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: 'Poll failed' })}\n\n`
          ));
        }
      }, 30_000);

      // Cleanup on close
      setTimeout(() => {
        alive = false;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      }, 290_000); // Close before Vercel 5-min timeout
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
