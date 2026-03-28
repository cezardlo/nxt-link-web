'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

const MAX_COMPARE = 4;

export function useCompareProducts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const ids = useMemo(() => {
    const raw = searchParams.get('ids');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const isInCompare = useCallback((id: string) => ids.includes(id), [ids]);

  const updateIds = useCallback(
    (next: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.length > 0) {
        params.set('ids', next.join(','));
      } else {
        params.delete('ids');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const addToCompare = useCallback(
    (id: string) => {
      if (ids.includes(id) || ids.length >= MAX_COMPARE) return;
      updateIds([...ids, id]);
    },
    [ids, updateIds],
  );

  const removeFromCompare = useCallback(
    (id: string) => {
      updateIds(ids.filter((i) => i !== id));
    },
    [ids, updateIds],
  );

  const compareUrl = useMemo(
    () => (ids.length >= 2 ? `/products/compare?ids=${ids.join(',')}` : null),
    [ids],
  );

  return { ids, addToCompare, removeFromCompare, isInCompare, compareUrl, count: ids.length };
}
