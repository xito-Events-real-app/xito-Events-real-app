import { useState, useEffect, useCallback } from "react";
import { BookedClientData } from "@/lib/sheets-api";
import { 
  getCachedBookedClients, 
  setCachedBookedClients, 
  notifyCacheUpdate
} from "@/lib/cache-manager";
import {
  loadBookedClientsFromCache,
  isCachePopulated,
  populateCacheFromSheets,
} from "@/lib/clients-supabase-cache";

interface UseBookedCachedDataResult {
  clients: BookedClientData[];
  isLoading: boolean;
  isFromCache: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  refreshData: () => Promise<void>;
  error: string | null;
}

const fetchState = {
  hasRefreshed: false,
};

export function useBookedCachedData(): UseBookedCachedDataResult {
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // Step 1: Try Supabase cache first
      const hasCache = await isCachePopulated();

      if (hasCache && !forceRefresh) {
        const cachedClients = await loadBookedClientsFromCache();
        setClients(cachedClients);
        setIsFromCache(true);
        setIsLoading(false);
        setLastSyncedAt(new Date());
      } else {
        // No cache - pull from Sheets
        setIsLoading(true);
        setIsSyncing(true);

        try {
          await populateCacheFromSheets();
          const freshClients = await loadBookedClientsFromCache();
          setClients(freshClients);
          await setCachedBookedClients(freshClients);

          setLastSyncedAt(new Date());
          setIsFromCache(false);
          setError(null);
        } catch (err) {
          console.error('Failed to populate booked cache:', err);

          // Fallback: try IndexedDB
          const cached = await getCachedBookedClients();
          if (cached?.clients && cached.clients.length > 0) {
            setClients(cached.clients);
            setIsFromCache(true);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load data');
          }
        } finally {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    } catch (err) {
      console.error('Booked data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    const syncTimeout = setTimeout(() => {
      setIsSyncing(false);
    }, 60000);

    try {
      await populateCacheFromSheets();
      const freshClients = await loadBookedClientsFromCache();
      setClients(freshClients);
      await setCachedBookedClients(freshClients);

      setLastSyncedAt(new Date());
      setIsFromCache(false);
      notifyCacheUpdate('booked-clients', freshClients);
    } catch (err) {
      console.error('Booked refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      clearTimeout(syncTimeout);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for cache updates and invalidation
  useEffect(() => {
    const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
      if (e.detail.type === 'booked-clients' && Array.isArray(e.detail.data)) {
        setClients(e.detail.data as BookedClientData[]);
        setLastSyncedAt(new Date());
        setIsFromCache(false);
      }
      if (e.detail.type === 'booked-clients-invalidate') {
        fetchState.hasRefreshed = false;
        refreshData();
      }
    };

    window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
  }, [refreshData]);

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
