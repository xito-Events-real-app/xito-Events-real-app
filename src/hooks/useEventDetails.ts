import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface EventDetail {
  eventIndex: number;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  venueType: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  venueMap: string;
  eventStartTime: string;
  eventEndTime: string;
  parlourType: string;
  parlourName: string;
  parlourCity: string;
  parlourArea: string;
  parlourMap: string;
  parlourStartTime: string;
  parlourEndTime: string;
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

export function useEventDetails(registeredDateTimeAD: string | undefined) {
  const [data, setData] = useState<EventDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from Supabase cache only
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

  // Load data: cache only, no Sheets fallback
  const loadData = useCallback(async () => {
    if (!registeredDateTimeAD) return;

    setIsLoading(true);
    setError(null);

    const hadCache = await loadFromCache();

    if (!hadCache) {
      // No cache — show empty state
      console.log('[useEventDetails] No cached data found');
      setError('No event details in cache');
    }

    setIsLoading(false);
  }, [registeredDateTimeAD, loadFromCache]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refetch: just re-read from cache
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await loadFromCache();
    setIsLoading(false);
  }, [loadFromCache]);

  // Update event detail: write directly to cache with synced_to_sheet: false
  const updateEventDetail = useCallback(async (
    eventIndex: number,
    updates: Partial<Omit<EventDetail, 'eventIndex' | 'eventName' | 'eventYear' | 'eventMonth' | 'eventDay' | 'eventDateAD' | 'eventDemands' | 'eventReferences'>> & {
      eventDemands?: string[];
      eventReferences?: string[];
    }
  ): Promise<boolean> => {
    if (!registeredDateTimeAD) return false;

    try {
      // Build the update payload for Supabase
      const updatePayload: Record<string, any> = {
        synced_to_sheet: false,
        updated_at: new Date().toISOString(),
      };

      if (updates.venueType !== undefined) updatePayload.venue_type = updates.venueType;
      if (updates.venueName !== undefined) updatePayload.venue_name = updates.venueName;
      if (updates.venueCity !== undefined) updatePayload.venue_city = updates.venueCity;
      if (updates.venueArea !== undefined) updatePayload.venue_area = updates.venueArea;
      if (updates.venueMap !== undefined) updatePayload.venue_map = updates.venueMap;
      if (updates.eventStartTime !== undefined) updatePayload.event_start_time = updates.eventStartTime;
      if (updates.eventEndTime !== undefined) updatePayload.event_end_time = updates.eventEndTime;
      if (updates.parlourType !== undefined) updatePayload.parlour_type = updates.parlourType;
      if (updates.parlourName !== undefined) updatePayload.parlour_name = updates.parlourName;
      if (updates.parlourCity !== undefined) updatePayload.parlour_city = updates.parlourCity;
      if (updates.parlourArea !== undefined) updatePayload.parlour_area = updates.parlourArea;
      if (updates.parlourMap !== undefined) updatePayload.parlour_map = updates.parlourMap;
      if (updates.parlourStartTime !== undefined) updatePayload.parlour_start_time = updates.parlourStartTime;
      if (updates.parlourEndTime !== undefined) updatePayload.parlour_end_time = updates.parlourEndTime;
      if (updates.doGroomComeInMehndi !== undefined) updatePayload.do_groom_come_in_mehndi = updates.doGroomComeInMehndi;
      if (updates.guestCount !== undefined) updatePayload.guest_count = updates.guestCount;
      if (updates.eventDemands !== undefined) updatePayload.event_demands = serializeQuotedList(updates.eventDemands);
      if (updates.eventReferences !== undefined) updatePayload.event_references = serializeQuotedList(updates.eventReferences);

      // Write directly to event_details_cache
      const { error: updateError } = await supabase
        .from('event_details_cache')
        .update(updatePayload)
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .eq('event_index', eventIndex);

      if (updateError) throw new Error(updateError.message);

      // Also push update to Sheets in background (non-blocking)
      const currentEvent = data?.events.find(e => e.eventIndex === eventIndex);
      const processedUpdates = {
        ...updates,
        eventDemands: updates.eventDemands ? serializeQuotedList(updates.eventDemands) : undefined,
        eventReferences: updates.eventReferences ? serializeQuotedList(updates.eventReferences) : undefined,
      };

      supabase.functions.invoke('google-sheets', {
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
      }).then(({ error: sheetsErr }) => {
        if (!sheetsErr) {
          // Mark as synced
          supabase.from('event_details_cache')
            .update({ synced_to_sheet: true } as any)
            .eq('registered_date_time_ad', registeredDateTimeAD)
            .eq('event_index', eventIndex)
            .then(() => {});
        }
      }).catch(err => {
        console.warn('[BACKGROUND-SHEETS] Event details sync failed:', err);
      });

      // Reload from cache to get fresh state
      await loadFromCache();

      // Invalidate bulk event details cache
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
  }, [registeredDateTimeAD, loadFromCache, data]);

  return {
    data,
    isLoading,
    error,
    refetch,
    updateEventDetail,
  };
}
