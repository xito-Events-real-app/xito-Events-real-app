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

// Parse multi-line column value at specific index
function getValueAtIndex(multiLineValue: string, index: number): string {
  const lines = multiLineValue ? multiLineValue.split('\n') : [];
  return lines[index] || '';
}

export function useEventDetails(registeredDateTimeAD: string | undefined) {
  const [data, setData] = useState<EventDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetails = useCallback(async () => {
    if (!registeredDateTimeAD) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Refresh vendor data (auto-sync from vendor sheets)
      // This updates City, Area, Map from vendor type sheets if they differ
      await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'refreshClientVendorData',
          data: { registeredDateTimeAD }
        }
      });
      
      // Step 2: Fetch the (now-updated) event details
      const { data: result, error: fetchError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'getClientEventDetails',
          data: { registeredDateTimeAD }
        }
      });

      if (fetchError) throw new Error(fetchError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to fetch event details');

      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load event details';
      setError(message);
      console.error('Error fetching event details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [registeredDateTimeAD]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  const updateEventDetail = useCallback(async (
    eventIndex: number,
    updates: Partial<Omit<EventDetail, 'eventIndex' | 'eventName' | 'eventYear' | 'eventMonth' | 'eventDay' | 'eventDateAD' | 'eventDemands' | 'eventReferences'>> & {
      eventDemands?: string[];
      eventReferences?: string[];
    }
  ): Promise<boolean> => {
    if (!registeredDateTimeAD) return false;

    try {
      // Convert arrays to quoted strings before sending
      const processedUpdates = {
        ...updates,
        eventDemands: updates.eventDemands ? serializeQuotedList(updates.eventDemands) : undefined,
        eventReferences: updates.eventReferences ? serializeQuotedList(updates.eventReferences) : undefined,
      };

      const { data: result, error: updateError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'updateClientEventDetails',
          data: { 
            registeredDateTimeAD,
            eventIndex,
            updates: processedUpdates
          }
        }
      });

      if (updateError) throw new Error(updateError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to update event details');

      // Refresh data after update
      await fetchEventDetails();

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
  }, [registeredDateTimeAD, fetchEventDetails]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchEventDetails,
    updateEventDetail,
  };
}
