import { useState, useEffect, useCallback, useRef } from "react";
import { ClientData, DropdownData } from "@/lib/sheets-api";
import { 
  getCachedData, 
  setCachedDropdowns, 
  notifyCacheUpdate,
  updateClientInCache
} from "@/lib/cache-manager";
import { getQueueLength } from "@/lib/sync-queue";
import {
  loadClientsFromCache,
  updateClientInCacheRecord,
  rowToClientData,
} from "@/lib/clients-supabase-cache";
import {
  getMemoryClients,
  setMemoryClients,
  getMemoryDropdowns,
  setMemoryDropdowns,
  updateMemoryClient,
} from "@/lib/memory-cache";
import { loadAllClients, resetLoaderPromises } from "@/lib/data-loader-singleton";
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

export function useCachedData(): UseCachedDataResult {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const cachedClients = await loadAllClients();
      setClients(cachedClients);
      setIsFromCache(true);
      setIsLoading(false);
      setLastSyncedAt(new Date());

      // Load dropdowns from IndexedDB
      const cached = await getCachedData();
      if (cached?.dropdowns) {
        setDropdowns(cached.dropdowns);
        setMemoryDropdowns(cached.dropdowns);
      }
    } catch (err) {
      console.error('Data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setIsLoading(false);
    }
  }, []);

  // Refresh: re-read from database cache only
  const refreshData = useCallback(async () => {
    resetLoaderPromises();
    setIsSyncing(true);
    setError(null);

    try {
      const freshClients = await loadClientsFromCache();
      setClients(freshClients);
      setMemoryClients(freshClients);

      // Reload dropdowns from IndexedDB
      const cached = await getCachedData();
      if (cached?.dropdowns) {
        setDropdowns(cached.dropdowns);
        setMemoryDropdowns(cached.dropdowns);
      }

      setLastSyncedAt(new Date());
      setIsFromCache(true);
    } catch (err) {
      console.error('Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Track local update timestamps for anti-flicker guard
  const localUpdateTimestamps = useRef<Set<string>>(new Set());

  // Update a single client in state + Supabase cache
  const updateClient = useCallback(async (updatedClient: ClientData) => {
    // Register timestamp for anti-flicker guard
    const ts = new Date().toISOString();
    localUpdateTimestamps.current.add(ts);
    setTimeout(() => localUpdateTimestamps.current.delete(ts), 2000);

    // 1. Update local state + memory cache immediately
    setClients(prev => prev.map(c => {
      if (updatedClient.registeredDateTimeAD && c.registeredDateTimeAD === updatedClient.registeredDateTimeAD) {
        return { ...c, ...updatedClient };
      }
      if (c.rowNumber === updatedClient.rowNumber && !updatedClient.registeredDateTimeAD) {
        return { ...c, ...updatedClient };
      }
      return c;
    }));
    updateMemoryClient(updatedClient);

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

    // Realtime subscription for multi-device instant sync
    const channel = supabase
      .channel('clients-cache-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients_cache' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const row = payload.new as any;
            if (row?.updated_at && localUpdateTimestamps.current.has(row.updated_at)) return;
            const mapped = rowToClientData(row);
            if (payload.eventType === 'UPDATE') {
              setClients(prev => prev.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c));
              updateMemoryClient(mapped);
            } else {
              setClients(prev => {
                if (prev.some(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD)) return prev;
                return [...prev, mapped];
              });
              const mem = getMemoryClients();
              if (mem) setMemoryClients([...mem, mapped]);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any)?.registered_date_time_ad;
            if (oldId) {
              setClients(prev => prev.filter(c => c.registeredDateTimeAD !== oldId));
              const mem = getMemoryClients();
              if (mem) setMemoryClients(mem.filter(c => c.registeredDateTimeAD !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Listen for cache updates from other operations (but NOT invalidate events)
  useEffect(() => {
    const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
      if (e.detail.type === 'clients') {
        if (Array.isArray(e.detail.data)) {
          setClients(e.detail.data as ClientData[]);
        } else {
          const memClients = getMemoryClients();
          if (memClients) setClients([...memClients]);
        }
      }
      if (e.detail.type === 'dropdowns' && e.detail.data) {
        setDropdowns(e.detail.data as DropdownData);
      }
      // REMOVED: 'clients-invalidate' listener — no more Sheets pulls
    };

    window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
  }, []);

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
