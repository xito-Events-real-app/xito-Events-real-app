import { useState, useEffect, useCallback } from "react";
import { BookedClientData } from "@/lib/sheets-api";
import { 
  notifyCacheUpdate
} from "@/lib/cache-manager";
import {
  loadBookedClientsFromCache,
  isCachePopulated,
} from "@/lib/clients-supabase-cache";
import {
  getMemoryBookedClients,
  setMemoryBookedClients,
  isBookedMemoryLoaded,
} from "@/lib/memory-cache";

interface UseBookedCachedDataResult {
  clients: BookedClientData[];
  isLoading: boolean;
  isFromCache: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  refreshData: () => Promise<void>;
  error: string | null;
}

export function useBookedCachedData(): UseBookedCachedDataResult {
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Step 0: Check in-memory cache first (0ms)
      if (isBookedMemoryLoaded()) {
        const memBooked = getMemoryBookedClients()!;
        setClients(memBooked);
        setIsFromCache(true);
        setIsLoading(false);
        setLastSyncedAt(new Date());
        return;
      }

      // Step 1: Try Supabase cache
      const hasCache = await isCachePopulated();

      if (hasCache) {
        const cachedClients = await loadBookedClientsFromCache();
        setClients(cachedClients);
        setMemoryBookedClients(cachedClients);
        setIsFromCache(true);
        setIsLoading(false);
        setLastSyncedAt(new Date());
      } else {
        // Cache empty — show empty state (no Sheets fallback)
        console.log('[useBookedCachedData] Cache empty, showing empty state');
        setClients([]);
        setIsLoading(false);
        setError('Cache is empty. Data needs to be populated.');
      }
    } catch (err) {
      console.error('Booked data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, []);

  // Refresh: re-read from database cache only
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const freshClients = await loadBookedClientsFromCache();
      setClients(freshClients);
      setMemoryBookedClients(freshClients);

      setLastSyncedAt(new Date());
      setIsFromCache(true);
      notifyCacheUpdate('booked-clients', freshClients);
    } catch (err) {
      console.error('Booked refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for cache updates (but NOT invalidate events)
  useEffect(() => {
    const handleCacheUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'booked-clients') {
        if (Array.isArray(detail.data)) {
          setTimeout(() => {
            setClients(detail.data as BookedClientData[]);
            setLastSyncedAt(new Date());
            setIsFromCache(false);
          }, 0);
        } else {
          const memBooked = getMemoryBookedClients();
          if (memBooked) {
            setTimeout(() => {
              setClients([...memBooked]);
              setLastSyncedAt(new Date());
            }, 0);
          }
        }
      }
      // REMOVED: 'booked-clients-invalidate' listener — no more Sheets pulls
    };

    window.addEventListener('cache-updated', handleCacheUpdate);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate);
  }, []);

  return {
    clients,
    isLoading,
    isFromCache,
    isSyncing,
    lastSyncedAt,
    refreshData,
    error,
  };
}
