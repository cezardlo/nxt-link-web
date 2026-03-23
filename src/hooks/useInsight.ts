// src/hooks/useInsight.ts
// Hook for fetching and managing signal insights

import useSWR from 'swr';
import { useCallback } from 'react';

interface Insight {
  signal_id: string;
  meaning: string | null;
  actions: string[];
  pattern: string | null;
  confidence: number;
  related_signals?: string[];
  generated_at?: string;
  cached?: boolean;
  should_generate?: boolean;
  reason?: string;
}

interface UseInsightReturn {
  insight: Insight | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  submitFeedback: (rating: number, feedback?: string) => Promise<boolean>;
}

const fetcher = async (url: string): Promise<Insight> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch insight');
  }
  return res.json();
};

export function useInsight(
  signalId: string | null | undefined,
  options?: {
    enabled?: boolean;
    force?: boolean;
  }
): UseInsightReturn {
  const { enabled = true, force = false } = options || {};

  const shouldFetch = enabled && signalId && signalId !== 'undefined';
  const url = shouldFetch
    ? `/api/signals/${signalId}/insight${force ? '?force=true' : ''}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<Insight>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute deduplication
      errorRetryCount: 1
    }
  );

  const refetch = useCallback(() => {
    mutate();
  }, [mutate]);

  const submitFeedback = useCallback(async (rating: number, feedback?: string): Promise<boolean> => {
    if (!signalId) return false;

    try {
      const res = await fetch(`/api/signals/${signalId}/insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback })
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      return true;
    } catch (err) {
      console.error('Feedback submission failed:', err);
      return false;
    }
  }, [signalId]);

  return {
    insight: data || null,
    isLoading,
    error: error || null,
    refetch,
    submitFeedback
  };
}

// Hook for batch insight generation (admin/background use)
export function useInsightsBatch() {
  const generateBatch = useCallback(async (signalIds: string[]): Promise<Insight[]> => {
    const results = await Promise.all(
      signalIds.map(async (id) => {
        try {
          const res = await fetch(`/api/signals/${id}/insight?force=true`);
          if (!res.ok) return null;
          return res.json();
        } catch {
          return null;
        }
      })
    );

    return results.filter((r): r is Insight => r !== null);
  }, []);

  return { generateBatch };
}
