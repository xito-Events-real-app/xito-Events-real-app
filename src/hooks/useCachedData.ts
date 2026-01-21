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

// Fetch fresh data from Google Sheets
async function fetchFromSheets(): Promise<{ clients: ClientData[]; dropdowns: DropdownData }> {
  const [clientsResult, dropdownsResult] = await Promise.all([
    supabase.functions.invoke("google-sheets", {
      body: { action: "getClients", limit: 500 },
    }),
    supabase.functions.invoke("google-sheets", {
      body: { action: "getDropdowns" },
    }),
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (dropdownsResult.error) throw new Error(dropdownsResult.error.message);
  
  if (!clientsResult.data?.success) throw new Error(clientsResult.data?.error || "Failed to fetch clients");
  if (!dropdownsResult.data?.success) throw new Error(dropdownsResult.data?.error || "Failed to fetch dropdowns");

  return {
    clients: clientsResult.data.data as ClientData[],
    dropdowns: dropdownsResult.data.data as DropdownData,
  };
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
        
        // Background refresh if expired or always after showing cache
        if (expired || forceRefresh) {
          setIsSyncing(true);
          try {
            const fresh = await fetchFromSheets();
            
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
            setIsSyncing(false);
          }
        }
      } else {
        // No cache - must fetch fresh
        setIsLoading(true);
        
        try {
          const fresh = await fetchFromSheets();
          
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
      const fresh = await fetchFromSheets();
      
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
  const updateClient = useCallback(async (updatedClient: ClientData) => {
    // 1. Update local state immediately for instant UI feedback
    setClients(prev => prev.map(c => 
      c.rowNumber === updatedClient.rowNumber ? { ...c, ...updatedClient } : c
    ));
    
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
    };
    
    window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
  }, []);

  // Listen for sync status
  useEffect(() => {
    const handleSyncStatus = (e: CustomEvent<{ isSyncing: boolean }>) => {
      setIsSyncing(e.detail.isSyncing);
    };
    
    window.addEventListener('sync-status', handleSyncStatus as EventListener);
    return () => window.removeEventListener('sync-status', handleSyncStatus as EventListener);
  }, []);

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
