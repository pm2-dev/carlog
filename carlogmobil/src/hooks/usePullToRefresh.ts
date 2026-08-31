import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh: RefreshControl için `isLoading` kullanmayın — yenileme sırasında
 * TanStack Query genelde `isLoading: false` döner (önbellekte veri varken), bu da
 * spinner senkronunu bozar ve bazı cihazlarda onRefresh tekrarına yol açabilir.
 */
export function usePullToRefresh(refetchAll: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  return { refreshing, onRefresh };
}
