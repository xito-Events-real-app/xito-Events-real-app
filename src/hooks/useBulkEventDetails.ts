import { useState, useEffect, useMemo } from "react";
import { getBulkEventDetails, BulkEventDetail } from "@/lib/sheets-api";

export interface UseBulkEventDetailsResult {
  eventDetailsMap: Record<string, BulkEventDetail[]>;
  isLoading: boolean;
  error: string | null;
}

export function useBulkEventDetails(clientIds: string[]): UseBulkEventDetailsResult {
  const [eventDetailsMap, setEventDetailsMap] = useState<Record<string, BulkEventDetail[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize clientIds to avoid unnecessary fetches
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

    let cancelled = false;

    async function fetchBulkDetails() {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getBulkEventDetails(idsArray);
        if (!cancelled) {
          setEventDetailsMap(result);
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

    fetchBulkDetails();

    return () => {
      cancelled = true;
    };
  }, [stableClientIds]);

  return { eventDetailsMap, isLoading, error };
}
