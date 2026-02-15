import { useState, useEffect, useMemo } from "react";
import { BulkEventDetail, getBulkEventDetails } from "@/lib/sheets-api";
import { supabase } from "@/integrations/supabase/client";

export interface UseBulkEventDetailsResult {
  eventDetailsMap: Record<string, BulkEventDetail[]>;
  isLoading: boolean;
  error: string | null;
}

// Session storage key for caching
const CACHE_KEY = 'bulk_event_details_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getSessionCache(clientIdsKey: string): Record<string, BulkEventDetail[]> | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.key === clientIdsKey && Date.now() - parsed.ts < CACHE_TTL) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function setSessionCache(clientIdsKey: string, data: Record<string, BulkEventDetail[]>) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ key: clientIdsKey, ts: Date.now(), data }));
  } catch {}
}

export function useBulkEventDetails(clientIds: string[]): UseBulkEventDetailsResult {
  const [eventDetailsMap, setEventDetailsMap] = useState<Record<string, BulkEventDetail[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stableClientIds = useMemo(() => {
    const uniqueIds = [...new Set(clientIds.filter(Boolean))];
    return uniqueIds.sort().join(',');
  }, [clientIds]);

  useEffect(() => {
    const idsArray = stableClientIds ? stableClientIds.split(',') : [];
    
    if (idsArray.length === 0) {
      setEventDetailsMap({});
      return;
    }

    // Check session cache first
    const cached = getSessionCache(stableClientIds);
    if (cached) {
      setEventDetailsMap(cached);
      return;
    }

    let cancelled = false;

    async function fetchFromSupabase() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Query event_details_cache directly from Supabase
        const { data: rows, error: fetchError } = await supabase
          .from('event_details_cache')
          .select('*')
          .in('registered_date_time_ad', idsArray)
          .order('event_index', { ascending: true });

        if (fetchError) throw new Error(fetchError.message);

        // If cache has data, use it
        if (rows && rows.length > 0) {
          const result: Record<string, BulkEventDetail[]> = {};
          for (const row of rows) {
            const key = row.registered_date_time_ad;
            if (!result[key]) result[key] = [];
            result[key].push({
              eventIndex: row.event_index ?? 0,
              eventName: row.event_name || '',
              eventDateAD: row.event_date_ad || '',
              venueName: row.venue_name || '',
              venueCity: row.venue_city || '',
              venueArea: row.venue_area || '',
              venueMap: row.venue_map || '',
              eventStartTime: row.event_start_time || '',
              eventEndTime: row.event_end_time || '',
              parlourName: row.parlour_name || '',
              parlourCity: row.parlour_city || '',
              parlourArea: row.parlour_area || '',
              parlourMap: row.parlour_map || '',
              parlourStartTime: row.parlour_start_time || '',
              parlourEndTime: row.parlour_end_time || '',
              guestCount: row.guest_count || '',
              eventDemand: row.event_demands || '',
              eventReferences: row.event_references || '',
            });
          }

          if (!cancelled) {
            setEventDetailsMap(result);
            setSessionCache(stableClientIds, result);
          }
        } else {
          // Fallback: cache is empty, fetch from Google Sheets
          console.log('[useBulkEventDetails] Cache empty, falling back to Google Sheets');
          const sheetsResult = await getBulkEventDetails(idsArray);

          if (!cancelled) {
            setEventDetailsMap(sheetsResult);
            setSessionCache(stableClientIds, sheetsResult);
          }

          // Background sync to populate cache for next time
          supabase.functions.invoke('sync-all-data', {
            body: { tables: ['event_details'] },
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[useBulkEventDetails] Error fetching:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load event details');
          setEventDetailsMap({});
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [stableClientIds]);

  return { eventDetailsMap, isLoading, error };
}
