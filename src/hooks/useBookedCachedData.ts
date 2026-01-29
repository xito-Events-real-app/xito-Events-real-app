import { useState, useEffect, useCallback } from "react";
import { BookedClientData, getBookedClients } from "@/lib/sheets-api";
import { 
  getCachedBookedClients, 
  setCachedBookedClients, 
  isBookedCacheExpired,
  notifyCacheUpdate
} from "@/lib/cache-manager";

interface UseBookedCachedDataResult {
  clients: BookedClientData[];
  isLoading: boolean;
  isFromCache: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  refreshData: () => Promise<void>;
  error: string | null;
}

// Fetch state for deduplication
const fetchState = {
  promise: null as Promise<BookedClientData[]> | null,
  hasRefreshed: false,
};

// Deduplicated fetch - prevents multiple parallel API calls
async function fetchBookedClientsWithDedup(): Promise<BookedClientData[]> {
  if (fetchState.promise) {
    return fetchState.promise;
  }
  
  fetchState.promise = getBookedClients(500);
  
  try {
    const result = await fetchState.promise;
    return result;
  } finally {
    fetchState.promise = null;
  }
}

export function useBookedCachedData(): UseBookedCachedDataResult {
  const [clients, setClients] = useState<BookedClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load cached data first, then refresh in background
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // Step 1: Try to load from cache first (instant UI)
      const cached = await getCachedBookedClients();
      
      if (cached?.clients && cached.clients.length > 0 && !forceRefresh) {
        // Show cached data immediately
        setClients(cached.clients);
        setLastSyncedAt(new Date(cached.lastSyncedAt));
        setIsFromCache(true);
        setIsLoading(false);
        
        // Check if cache is expired
        const expired = await isBookedCacheExpired();
        
        // Background refresh only once per session if expired
        if ((expired || forceRefresh) && !fetchState.hasRefreshed) {
          fetchState.hasRefreshed = true;
          setIsSyncing(true);
          
          // Timeout safeguard - never let sync indicator stay stuck
          const syncTimeout = setTimeout(() => {
            setIsSyncing(false);
            console.warn('Booked sync timeout reached - forcing isSyncing to false');
          }, 30000); // 30 second max
          
          try {
            const fresh = await fetchBookedClientsWithDedup();
            
            // Only update if data changed
            if (JSON.stringify(fresh) !== JSON.stringify(cached.clients)) {
              setClients(fresh);
              await setCachedBookedClients(fresh);
              notifyCacheUpdate('booked-clients', fresh);
            }
            
            setLastSyncedAt(new Date());
            setIsFromCache(false);
            setError(null);
          } catch (err) {
            console.log('Booked background refresh failed, using cache:', err);
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
          const fresh = await fetchBookedClientsWithDedup();
          
          setClients(fresh);
          
          // Cache the fresh data
          await setCachedBookedClients(fresh);
          
          setLastSyncedAt(new Date());
          setIsFromCache(false);
          setError(null);
        } catch (err) {
          console.error('Failed to fetch booked clients:', err);
          setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Booked data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, []);

  // Force refresh data
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const fresh = await fetchBookedClientsWithDedup();
      
      setClients(fresh);
      await setCachedBookedClients(fresh);
      
      setLastSyncedAt(new Date());
      setIsFromCache(false);
      notifyCacheUpdate('booked-clients', fresh);
    } catch (err) {
      console.error('Booked refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for cache updates and invalidation from other operations
  useEffect(() => {
    const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
      if (e.detail.type === 'booked-clients' && Array.isArray(e.detail.data)) {
        setClients(e.detail.data as BookedClientData[]);
        setLastSyncedAt(new Date());
        setIsFromCache(false);
      }
      // Handle invalidation - trigger refresh
      if (e.detail.type === 'booked-clients-invalidate') {
        fetchState.hasRefreshed = false; // Reset refresh flag
        refreshData(); // Force a fresh fetch
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

