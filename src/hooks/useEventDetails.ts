import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface EventDetail {
  eventIndex: number;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  // Venue (Columns J-N)
  venueType: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  venueMap: string;
  // Event Timing (Columns O-P)
  eventStartTime: string;
  eventEndTime: string;
  // Parlour (Columns Q-U)
  parlourType: string;
  parlourName: string;
  parlourCity: string;
  parlourArea: string;
  parlourMap: string;
  // Parlour Timing (Columns V-W)
  parlourStartTime: string;
  parlourEndTime: string;
  // Additional (Columns AE-AH, skipping X-AD)
  doGroomComeInMehndi: string;
  guestCount: string;
  eventDemands: string[];
  eventReferences: string[];
}

export interface EventDetailsData {
  rowNumber: number;
  events: EventDetail[];
}

// Parse quoted string list: "value1" "value2" => ["value1", "value2"]
function parseQuotedList(value: string): string[] {
  if (!value) return [];
  const matches = value.match(/"([^"]*)"/g);
  return matches ? matches.map(m => m.replace(/"/g, '')) : [];
}

// Serialize array to quoted string: ["value1", "value2"] => "value1" "value2"
export function serializeQuotedList(items: string[]): string {
  return items.filter(Boolean).map(i => `"${i}"`).join(' ');
}

// Convert Supabase cache row to EventDetail
function cacheRowToEventDetail(row: any): EventDetail {
  return {
    eventIndex: row.event_index ?? 0,
    eventName: row.event_name || '',
    eventYear: row.event_year || '',
    eventMonth: row.event_month || '',
    eventDay: row.event_day || '',
    eventDateAD: row.event_date_ad || '',
    venueType: row.venue_type || '',
    venueName: row.venue_name || '',
    venueCity: row.venue_city || '',
    venueArea: row.venue_area || '',
    venueMap: row.venue_map || '',
    eventStartTime: row.event_start_time || '',
    eventEndTime: row.event_end_time || '',
    parlourType: row.parlour_type || '',
    parlourName: row.parlour_name || '',
    parlourCity: row.parlour_city || '',
    parlourArea: row.parlour_area || '',
    parlourMap: row.parlour_map || '',
    parlourStartTime: row.parlour_start_time || '',
    parlourEndTime: row.parlour_end_time || '',
    doGroomComeInMehndi: row.do_groom_come_in_mehndi || '',
    guestCount: row.guest_count || '',
    eventDemands: parseQuotedList(row.event_demands || ''),
    eventReferences: parseQuotedList(row.event_references || ''),
  };
}

// Background refresh cooldown: 5 minutes
const BACKGROUND_REFRESH_INTERVAL = 5 * 60 * 1000;
const lastRefreshMap = new Map<string, number>();

export function useEventDetails(registeredDateTimeAD: string | undefined) {
  const [data, setData] = useState<EventDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backgroundRefreshRef = useRef(false);

  // Step 1: Load from Supabase cache instantly
  const loadFromCache = useCallback(async () => {
    if (!registeredDateTimeAD) return false;

    try {
      const { data: rows, error: fetchError } = await supabase
        .from('event_details_cache')
        .select('*')
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .order('event_index', { ascending: true });

      if (fetchError || !rows || rows.length === 0) return false;

      const events = rows.map(cacheRowToEventDetail);
      setData({ rowNumber: 0, events });
      return true;
    } catch {
      return false;
    }
  }, [registeredDateTimeAD]);

  // Step 2: Full fetch from Google Sheets (used as background refresh or fallback)
  const fetchFromSheets = useCallback(async (isBackground = false) => {
    if (!registeredDateTimeAD) return;

    if (!isBackground) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Refresh vendor data + fetch event details from Sheets
      await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'refreshClientVendorData',
          data: { registeredDateTimeAD }
        }
      });
      
      const { data: result, error: fetchError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'getClientEventDetails',
          data: { registeredDateTimeAD }
        }
      });

      if (fetchError) throw new Error(fetchError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to fetch event details');

      setData(result.data);
      lastRefreshMap.set(registeredDateTimeAD, Date.now());
    } catch (err) {
      if (!isBackground) {
        const message = err instanceof Error ? err.message : 'Failed to load event details';
        setError(message);
        console.error('Error fetching event details:', err);
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, [registeredDateTimeAD]);

  // Combined load: cache first, then background refresh if stale
  const loadData = useCallback(async () => {
    if (!registeredDateTimeAD) return;

    setIsLoading(true);
    setError(null);

    const hadCache = await loadFromCache();

    if (hadCache) {
      setIsLoading(false);
      
      // Background refresh if stale (>5 min since last refresh)
      const lastRefresh = lastRefreshMap.get(registeredDateTimeAD) || 0;
      if (Date.now() - lastRefresh > BACKGROUND_REFRESH_INTERVAL && !backgroundRefreshRef.current) {
        backgroundRefreshRef.current = true;
        fetchFromSheets(true).finally(() => {
          backgroundRefreshRef.current = false;
        });
      }
    } else {
      // No cache — must fetch from Sheets
      await fetchFromSheets(false);
    }
  }, [registeredDateTimeAD, loadFromCache, fetchFromSheets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manual refetch always goes to Sheets
  const refetch = useCallback(async () => {
    await fetchFromSheets(false);
  }, [fetchFromSheets]);

  const updateEventDetail = useCallback(async (
    eventIndex: number,
    updates: Partial<Omit<EventDetail, 'eventIndex' | 'eventName' | 'eventYear' | 'eventMonth' | 'eventDay' | 'eventDateAD' | 'eventDemands' | 'eventReferences'>> & {
      eventDemands?: string[];
      eventReferences?: string[];
    }
  ): Promise<boolean> => {
    if (!registeredDateTimeAD) return false;

    try {
      const processedUpdates = {
        ...updates,
        eventDemands: updates.eventDemands ? serializeQuotedList(updates.eventDemands) : undefined,
        eventReferences: updates.eventReferences ? serializeQuotedList(updates.eventReferences) : undefined,
      };

      // Include event name for backend verification against wrong line writes
      const currentEvent = data?.events.find(e => e.eventIndex === eventIndex);

      const { data: result, error: updateError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'updateClientEventDetails',
          data: { 
            registeredDateTimeAD,
            eventIndex,
            updates: {
              ...processedUpdates,
              _eventName: currentEvent?.eventName || ''
            }
          }
        }
      });

      if (updateError) throw new Error(updateError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to update event details');

      // Refresh from Sheets after update
      await fetchFromSheets(false);

      // Invalidate bulk event details cache so Upcoming Events shows fresh data
      try { sessionStorage.removeItem('bulk_event_details_cache'); } catch {}
      window.dispatchEvent(new CustomEvent('cache-updated', { detail: { type: 'event-details-invalidate' } }));

      toast({
        title: "Saved",
        description: "Event details updated successfully",
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event details';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error('Error updating event details:', err);
      return false;
    }
  }, [registeredDateTimeAD, fetchFromSheets]);

  return {
    data,
    isLoading,
    error,
    refetch,
    updateEventDetail,
  };
}
