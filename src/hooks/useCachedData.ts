import { useState, useEffect, useCallback } from "react";
import { ClientData, DropdownData } from "@/lib/sheets-api";
import { 
  getCachedData, 
  setCachedClients, 
  setCachedDropdowns, 
  isCacheExpired,
  CacheData,
  notifyCacheUpdate,
  updateClientInCache
} from "@/lib/cache-manager";
import { getQueueLength } from "@/lib/sync-queue";
import { supabase } from "@/integrations/supabase/client";

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

// Use a WeakRef-like pattern with a simple object to track fetch state
// This is HMR-safe because we don't mutate during render
const fetchState = {
  promise: null as Promise<{ clients: ClientData[]; dropdowns: DropdownData }> | null,
  hasRefreshed: false,
};

// Fetch fresh data from Google Sheets
// Uses getAllClients which merges data from BOTH CLIENT TRACKER and BOOKED CLIENTS
// This ensures Hot Dates, Calendar, and other features see ALL clients
async function fetchFromSheets(): Promise<{ clients: ClientData[]; dropdowns: DropdownData }> {
  const [clientsResult, dropdownsResult, eventSetupResult] = await Promise.all([
    supabase.functions.invoke("google-sheets", {
      body: { action: "getAllClients", limit: 500 }, // Uses unified endpoint
    }),
    supabase.functions.invoke("google-sheets", {
      body: { action: "getDropdowns" },
    }),
    supabase.functions.invoke("google-sheets", {
      body: { action: "getEventSetupData" },
    }),
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (dropdownsResult.error) throw new Error(dropdownsResult.error.message);
  
  if (!clientsResult.data?.success) throw new Error(clientsResult.data?.error || "Failed to fetch clients");
  if (!dropdownsResult.data?.success) throw new Error(dropdownsResult.data?.error || "Failed to fetch dropdowns");

  // Merge allEvents from EVENT SETUP DATA into dropdowns
  const dropdowns = dropdownsResult.data.data as DropdownData;
  if (eventSetupResult.data?.success) {
    dropdowns.allEvents = eventSetupResult.data.data || [];
  } else {
    dropdowns.allEvents = [];
  }

  return {
    clients: clientsResult.data.data as ClientData[],
    dropdowns,
  };
}

// Deduplicated fetch - prevents multiple parallel API calls
async function fetchFromSheetsWithDedup(): Promise<{ clients: ClientData[]; dropdowns: DropdownData }> {
  if (fetchState.promise) {
    return fetchState.promise;
  }
  
  fetchState.promise = fetchFromSheets();
  
  try {
    const result = await fetchState.promise;
    return result;
  } finally {
    fetchState.promise = null;
  }
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

  // Load cached data first, then refresh in background
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // Step 1: Try to load from cache first (instant UI)
      const cached = await getCachedData();
      
      if (cached?.clients && cached.clients.length > 0 && !forceRefresh) {
        // Show cached data immediately
        setClients(cached.clients);
        setDropdowns(cached.dropdowns);
        setLastSyncedAt(new Date(cached.lastSyncedAt));
        setIsFromCache(true);
        setIsLoading(false);
        
        // Check if cache is expired
        const expired = await isCacheExpired();
        
        // Background refresh only once per session if expired
        if ((expired || forceRefresh) && !fetchState.hasRefreshed) {
          fetchState.hasRefreshed = true;
          setIsSyncing(true);
          
          // Timeout safeguard - never let sync indicator stay stuck
          const syncTimeout = setTimeout(() => {
            setIsSyncing(false);
            console.warn('Sync timeout reached - forcing isSyncing to false');
          }, 30000); // 30 second max
          
          try {
            const fresh = await fetchFromSheetsWithDedup();
            
            // Only update if data changed
            if (JSON.stringify(fresh.clients) !== JSON.stringify(cached.clients)) {
              setClients(fresh.clients);
              await setCachedClients(fresh.clients);
              notifyCacheUpdate('clients', fresh.clients);
            }
            
            if (JSON.stringify(fresh.dropdowns) !== JSON.stringify(cached.dropdowns)) {
              setDropdowns(fresh.dropdowns);
              await setCachedDropdowns(fresh.dropdowns);
              notifyCacheUpdate('dropdowns', fresh.dropdowns);
            }
            
            setLastSyncedAt(new Date());
            setIsFromCache(false);
            setError(null);
          } catch (err) {
            console.log('Background refresh failed, using cache:', err);
            // Keep using cache, don't show error
          } finally {
            clearTimeout(syncTimeout);
            setIsSyncing(false);
          }
        }
      } else {
        // No cache - must fetch fresh
        setIsLoading(true);
        
        try {
          const fresh = await fetchFromSheetsWithDedup();
          
          setClients(fresh.clients);
          setDropdowns(fresh.dropdowns);
          
          // Cache the fresh data
          await setCachedClients(fresh.clients);
          await setCachedDropdowns(fresh.dropdowns);
          
          setLastSyncedAt(new Date());
          setIsFromCache(false);
          setError(null);
        } catch (err) {
          console.error('Failed to fetch data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, []);

  // Force refresh data
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const fresh = await fetchFromSheetsWithDedup();
      
      setClients(fresh.clients);
      setDropdowns(fresh.dropdowns);
      
      await setCachedClients(fresh.clients);
      await setCachedDropdowns(fresh.dropdowns);
      
      setLastSyncedAt(new Date());
      setIsFromCache(false);
      notifyCacheUpdate('all', fresh);
    } catch (err) {
      console.error('Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Update a single client in both state and cache
  // IMPORTANT: Matches by registeredDateTimeAD (preferred) to handle row number shifts
  const updateClient = useCallback(async (updatedClient: ClientData) => {
    // 1. Update local state immediately for instant UI feedback
    // Match by registeredDateTimeAD (preferred) or rowNumber (fallback)
    setClients(prev => prev.map(c => {
      if (updatedClient.registeredDateTimeAD && c.registeredDateTimeAD === updatedClient.registeredDateTimeAD) {
        return { ...c, ...updatedClient };
      }
      if (c.rowNumber === updatedClient.rowNumber && !updatedClient.registeredDateTimeAD) {
        return { ...c, ...updatedClient };
      }
      return c;
    }));
    
    // 2. Update IndexedDB cache
    await updateClientInCache(updatedClient.rowNumber, updatedClient);
    
    // 3. Notify other listeners (other components will sync)
    notifyCacheUpdate('clients');
  }, []);

  // Load data on mount
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
      // Handle invalidation - trigger refresh (similar to useBookedCachedData)
      if (e.detail.type === 'clients-invalidate') {
        fetchState.hasRefreshed = false; // Reset refresh flag to allow refetch
        refreshData(); // Force a fresh fetch from Google Sheets
      }
    };
    
    window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
  }, [refreshData]);

  // NOTE: Removed global sync-status listener that was overriding local isSyncing state
  // The sync queue status should not affect the data loading indicator

  // Listen for queue changes
  useEffect(() => {
    const handleQueueChange = (e: CustomEvent<{ pendingCount: number }>) => {
      setPendingSyncs(e.detail.pendingCount);
    };
    
    window.addEventListener('queue-changed', handleQueueChange as EventListener);
    
    // Get initial queue length
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
