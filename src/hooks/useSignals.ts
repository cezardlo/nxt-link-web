'use client';

import useSWR from 'swr';

export type Signal = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url: string | null;
  confidence?: number;
};

type SignalsResponse = {
  ok: boolean;
  signals: Signal[];
  source: string;
  total?: number;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

/**
 * useSignals — SWR-powered signal fetching with auto-revalidation.
 *
 * Replaces raw useEffect+fetch pattern. Benefits:
 * - Stale-while-revalidate (instant cached data, background refresh)
 * - Deduplication (multiple components sharing same key = 1 request)
 * - Revalidate on focus + reconnect
 * - Error retry with backoff
 */
export function useSignals(options?: {
  industry?: string;
  limit?: number;
  minScore?: number;
  refreshInterval?: number;
}) {
  const { industry, limit = 20, minScore = 0, refreshInterval = 30000 } = options ?? {};

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (industry) params.set('industry', industry);
  if (minScore > 0) params.set('min_score', String(minScore));

  const { data, error, isLoading, mutate } = useSWR<SignalsResponse>(
    `/api/intel-signals?${params.toString()}`,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      errorRetryCount: 3,
    },
  );

  return {
    signals: data?.signals ?? [],
    source: data?.source ?? 'unknown',
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

/**
 * useMorningBrief — SWR-powered morning brief.
 */
export function useMorningBrief() {
  const { data, error, isLoading } = useSWR(
    '/api/intelligence/morning-brief',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
      dedupingInterval: 60000,
    },
  );

  return {
    brief: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}
