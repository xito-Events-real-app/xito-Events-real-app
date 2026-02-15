import { useState, useEffect, useCallback } from "react";
import { ClientData, DropdownData } from "@/lib/sheets-api";
import { 
  getCachedData, 
  setCachedClients, 
  setCachedDropdowns, 
  CacheData,
  notifyCacheUpdate,
  updateClientInCache
} from "@/lib/cache-manager";
import { getQueueLength } from "@/lib/sync-queue";
import { supabase } from "@/integrations/supabase/client";
import {
  loadClientsFromCache,
  isCachePopulated,
  populateCacheFromSheets,
  updateClientInCacheRecord,
} from "@/lib/clients-supabase-cache";

interface UseCachedDataResult {
  clients: ClientData[];
  dropdowns: DropdownData | null;
  isLoading: boolean;
  isFromCache: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingSyncs: number;
  refreshData: () => Promise<void>;
  updateClient: (updatedClient: ClientData) => Promise<void>;
  error: string | null;
}

const fetchState = {
  promise: null as Promise<{ clients: ClientData[]; dropdowns: DropdownData }> | null,
  hasRefreshed: false,
};

// Fetch dropdowns from Google Sheets (with caching to avoid repeated API calls)
let dropdownFetchPromise: Promise<DropdownData> | null = null;

async function fetchDropdowns(): Promise<DropdownData> {
  // Deduplicate concurrent calls
  if (dropdownFetchPromise) return dropdownFetchPromise;

  dropdownFetchPromise = (async () => {
    try {
      const [dropdownsResult, eventSetupResult] = await Promise.all([
        supabase.functions.invoke("google-sheets", {
          body: { action: "getDropdowns" },
        }),
        supabase.functions.invoke("google-sheets", {
          body: { action: "getEventSetupData" },
        }),
      ]);

      if (dropdownsResult.error) throw new Error(dropdownsResult.error.message);
      if (!dropdownsResult.data?.success) throw new Error(dropdownsResult.data?.error || "Failed to fetch dropdowns");

      const dropdowns = dropdownsResult.data.data as DropdownData;
      if (eventSetupResult.data?.success) {
        dropdowns.allEvents = eventSetupResult.data.data || [];
      } else {
        dropdowns.allEvents = [];
      }

      return dropdowns;
    } finally {
      dropdownFetchPromise = null;
    }
  })();

  return dropdownFetchPromise;
}

export function useCachedData(): UseCachedDataResult {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // Step 1: Try Supabase cache first (instant ~50ms)
      const hasCache = await isCachePopulated();

      if (hasCache && !forceRefresh) {
        const cachedClients = await loadClientsFromCache();
        setClients(cachedClients);
        setIsFromCache(true);
        setIsLoading(false);
        setLastSyncedAt(new Date());

        // Load dropdowns from IndexedDB (small, static)
        const cached = await getCachedData();
        if (cached?.dropdowns) {
          setDropdowns(cached.dropdowns);
        } else {
          // Fetch dropdowns in background
          try {
            const dd = await fetchDropdowns();
            setDropdowns(dd);
            await setCachedDropdowns(dd);
          } catch (err) {
            console.log('Dropdown fetch failed, continuing without:', err);
          }
        }
      } else {
        // No cache - pull from Google Sheets (one-time ~5s)
        setIsLoading(true);
        setIsSyncing(true);

        try {
          // Pull clients into Supabase cache
          await populateCacheFromSheets();
          const freshClients = await loadClientsFromCache();
          setClients(freshClients);

          // Also cache to IndexedDB for dropdowns
          await setCachedClients(freshClients);

          // Fetch dropdowns
          const dd = await fetchDropdowns();
          setDropdowns(dd);
          await setCachedDropdowns(dd);

          setLastSyncedAt(new Date());
          setIsFromCache(false);
          setError(null);
        } catch (err) {
          console.error('Failed to populate cache:', err);
          
          // Fallback: try IndexedDB
          const cached = await getCachedData();
          if (cached?.clients && cached.clients.length > 0) {
            setClients(cached.clients);
            setDropdowns(cached.dropdowns);
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
      console.error('Data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, []);

  // Force refresh: pull fresh from Google Sheets
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    const syncTimeout = setTimeout(() => {
      setIsSyncing(false);
      console.warn('Sync timeout reached');
    }, 60000);

    try {
      await populateCacheFromSheets();
      const freshClients = await loadClientsFromCache();
      setClients(freshClients);
      await setCachedClients(freshClients);

      // Also refresh dropdowns
      const dd = await fetchDropdowns();
      setDropdowns(dd);
      await setCachedDropdowns(dd);

      setLastSyncedAt(new Date());
      setIsFromCache(false);
      notifyCacheUpdate('all', { clients: freshClients, dropdowns: dd });
    } catch (err) {
      console.error('Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      clearTimeout(syncTimeout);
      setIsSyncing(false);
    }
  }, []);

  // Update a single client in state + Supabase cache
  const updateClient = useCallback(async (updatedClient: ClientData) => {
    // 1. Update local state immediately
    setClients(prev => prev.map(c => {
      if (updatedClient.registeredDateTimeAD && c.registeredDateTimeAD === updatedClient.registeredDateTimeAD) {
        return { ...c, ...updatedClient };
      }
      if (c.rowNumber === updatedClient.rowNumber && !updatedClient.registeredDateTimeAD) {
        return { ...c, ...updatedClient };
      }
      return c;
    }));

    // 2. Update Supabase cache (marks unsynced)
    try {
      await updateClientInCacheRecord(updatedClient);
    } catch (err) {
      console.error('Failed to update Supabase cache:', err);
    }

    // 3. Update IndexedDB cache (backward compat)
    await updateClientInCache(updatedClient.rowNumber, updatedClient);

    // 4. Notify other listeners
    notifyCacheUpdate('clients');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for cache updates from other operations
  useEffect(() => {
    const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
      if (e.detail.type === 'clients' && Array.isArray(e.detail.data)) {
        setClients(e.detail.data as ClientData[]);
      }
      if (e.detail.type === 'dropdowns' && e.detail.data) {
        setDropdowns(e.detail.data as DropdownData);
      }
      if (e.detail.type === 'clients-invalidate') {
        fetchState.hasRefreshed = false;
        refreshData();
      }
    };

    window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
  }, [refreshData]);

  // Listen for queue changes
  useEffect(() => {
    const handleQueueChange = (e: CustomEvent<{ pendingCount: number }>) => {
      setPendingSyncs(e.detail.pendingCount);
    };

    window.addEventListener('queue-changed', handleQueueChange as EventListener);
    getQueueLength().then(setPendingSyncs);
    return () => window.removeEventListener('queue-changed', handleQueueChange as EventListener);
  }, []);

  return {
    clients,
    dropdowns,
    isLoading,
    isFromCache,
    isSyncing,
    lastSyncedAt,
    pendingSyncs,
    refreshData,
    updateClient,
    error,
  };
}
