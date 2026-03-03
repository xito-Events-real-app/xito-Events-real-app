import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BookedClientData } from "@/lib/sheets-api";
import { 
  notifyCacheUpdate
} from "@/lib/cache-manager";
import {
  loadBookedClientsFromCache,
  rowToBookedClientData,
} from "@/lib/clients-supabase-cache";
import {
  getMemoryBookedClients,
  setMemoryBookedClients,
} from "@/lib/memory-cache";
import { loadAllBookedClients, resetLoaderPromises } from "@/lib/data-loader-singleton";
import { supabase } from "@/integrations/supabase/client";

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

  // Track local update timestamps for anti-flicker guard
  const localUpdateTimestamps = useRef<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const cachedClients = await loadAllBookedClients();
      setClients(cachedClients);
      setIsFromCache(true);
      setIsLoading(false);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Booked data loading error:', err);
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

    // Realtime subscription for multi-device instant sync (booked clients only)
    const channel = supabase
      .channel('booked-clients-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients_cache', filter: 'sheet_source=eq.booked' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const row = payload.new as any;
            if (row?.updated_at && localUpdateTimestamps.current.has(row.updated_at)) return;
            const mapped = rowToBookedClientData(row);
            if (payload.eventType === 'UPDATE') {
              setTimeout(() => {
                setClients(prev => prev.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c));
                setLastSyncedAt(new Date());
              }, 0);
            } else {
              setTimeout(() => {
                setClients(prev => {
                  if (prev.some(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD)) return prev;
                  return [...prev, mapped];
                });
                setLastSyncedAt(new Date());
              }, 0);
            }
            const mem = getMemoryBookedClients();
            if (mem) {
              const updated = payload.eventType === 'UPDATE'
                ? mem.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c)
                : mem.some(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD)
                  ? mem.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c)
                  : [...mem, mapped];
              setMemoryBookedClients(updated);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any)?.registered_date_time_ad;
            if (oldId) {
              setTimeout(() => {
                setClients(prev => prev.filter(c => c.registeredDateTimeAD !== oldId));
              }, 0);
              const mem = getMemoryBookedClients();
              if (mem) setMemoryBookedClients(mem.filter(c => c.registeredDateTimeAD !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      if (detail?.type === 'booked-clients-invalidate') {
        const memBooked = getMemoryBookedClients();
        if (memBooked) {
          setTimeout(() => {
            setClients([...memBooked]);
            setLastSyncedAt(new Date());
          }, 0);
        }
      }
    };

    window.addEventListener('cache-updated', handleCacheUpdate);
    return () => window.removeEventListener('cache-updated', handleCacheUpdate);
  }, []);

  const dedupedClients = useMemo(() => {
    const seen = new Set<string>();
    return clients.filter(c => {
      if (seen.has(c.registeredDateTimeAD)) return false;
      seen.add(c.registeredDateTimeAD);
      return true;
    });
  }, [clients]);

  return {
    clients: dedupedClients,
    isLoading,
    isFromCache,
    isSyncing,
    lastSyncedAt,
    refreshData,
    error,
  };
}
