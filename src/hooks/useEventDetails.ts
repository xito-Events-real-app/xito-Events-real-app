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
  venueType: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  venueMap: string;
  eventStartTime: string;
  eventEndTime: string;
  brideStartTime: string;
  brideEndTime: string;
  groomStartTime: string;
  groomEndTime: string;
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
    brideStartTime: row.bride_start_time || '',
    brideEndTime: row.bride_end_time || '',
    groomStartTime: row.groom_start_time || '',
    groomEndTime: row.groom_end_time || '',
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

  const backfillAttemptedRef = useRef(false);

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

  // Load data: cache first, auto-backfill from Sheets if empty
  const loadData = useCallback(async () => {
    if (!registeredDateTimeAD) return;

    setIsLoading(true);
    setError(null);

    let hadCache = await loadFromCache();

    if (!hadCache && !backfillAttemptedRef.current) {
      backfillAttemptedRef.current = true;

      // Only attempt Sheets backfill for booked clients (tracker clients have no event details)
      const { data: clientRow } = await supabase
        .from('clients_cache')
        .select('sheet_source')
        .eq('registered_date_time_ad', registeredDateTimeAD)
        .maybeSingle();

      if (clientRow?.sheet_source === 'booked') {
        console.log('[useEventDetails] No cache, attempting backfill from Sheets...');
        try {
          await supabase.functions.invoke('google-sheets', {
            body: { action: 'syncToEventDetails', data: { registeredDateTimeAD } }
          });
          hadCache = await loadFromCache();
        } catch (err) {
          console.warn('[useEventDetails] Backfill failed:', err);
        }

        // If Sheets backfill failed (client not in sheet yet), create skeleton from clients_cache
        if (!hadCache) {
          console.log('[useEventDetails] Creating skeleton event details from cache...');
          try {
            const { data: clientData } = await supabase
              .from('clients_cache')
              .select('events, event_year, event_month, event_day, event_date_ad')
              .eq('registered_date_time_ad', registeredDateTimeAD)
              .maybeSingle();

            if (clientData?.events) {
              const eventNames = clientData.events.split('\n').filter(Boolean);
              const eventYears = (clientData.event_year || '').split('\n');
              const eventMonths = (clientData.event_month || '').split('\n');
              const eventDays = (clientData.event_day || '').split('\n');
              const eventDatesAD = (clientData.event_date_ad || '').split('\n');

              for (let i = 0; i < eventNames.length; i++) {
                await supabase.from('event_details_cache').upsert({
                  registered_date_time_ad: registeredDateTimeAD,
                  event_index: i,
                  event_name: eventNames[i] || '',
                  event_year: eventYears[i] || '',
                  event_month: eventMonths[i] || '',
                  event_day: eventDays[i] || '',
                  event_date_ad: eventDatesAD[i] || '',
                  synced_to_sheet: false,
                  updated_at: new Date().toISOString(),
                } as any, { onConflict: 'registered_date_time_ad,event_index' });
              }
              hadCache = await loadFromCache();
              console.log('[useEventDetails] Skeleton created from cache data');
            }
          } catch (skeletonErr) {
            console.warn('[useEventDetails] Skeleton creation failed:', skeletonErr);
          }
        }
      } else {
        console.log('[useEventDetails] Skipping backfill — client is not booked');
      }
    }

    if (!hadCache) {
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
      if (updates.brideStartTime !== undefined) updatePayload.bride_start_time = updates.brideStartTime;
      if (updates.brideEndTime !== undefined) updatePayload.bride_end_time = updates.brideEndTime;
      if (updates.groomStartTime !== undefined) updatePayload.groom_start_time = updates.groomStartTime;
      if (updates.groomEndTime !== undefined) updatePayload.groom_end_time = updates.groomEndTime;
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

      // Get identity fields from current event data
      const currentEvent = data?.events.find(e => e.eventIndex === eventIndex);

      // Write directly to event_details_cache using upsert
      const { error: updateError } = await supabase
        .from('event_details_cache')
        .upsert({
          ...updatePayload,
          registered_date_time_ad: registeredDateTimeAD,
          event_index: eventIndex,
          event_name: currentEvent?.eventName || '',
          event_year: currentEvent?.eventYear || '',
          event_month: currentEvent?.eventMonth || '',
          event_day: currentEvent?.eventDay || '',
          event_date_ad: currentEvent?.eventDateAD || '',
        } as any, { onConflict: 'registered_date_time_ad,event_index' });

      if (updateError) throw new Error(updateError.message);
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
