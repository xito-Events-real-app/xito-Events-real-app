import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDropdowns, DropdownData, isSheetsConfigured } from "@/lib/sheets-api";
import { mockDropdownData } from "@/lib/form-data";

export function useDropdownData() {
  const [data, setData] = useState<DropdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  const fetchDropdowns = useCallback(async () => {
    if (!isSheetsConfigured()) {
      setData({
        sources: mockDropdownData.sources,
        clientLocations: mockDropdownData.clientLocations,
        eventLocations: mockDropdownData.eventLocations,
        preweddingEvents: mockDropdownData.eventTypes.prewedding,
        weddingEvents: mockDropdownData.eventTypes.wedding,
        postweddingEvents: mockDropdownData.eventTypes.postwedding,
        oldClients: [],
        whatsappOwners: mockDropdownData.whatsappOwners,
        clientStatuses: ['UNTOUCHED', 'TEXTED : NOT CALLED', 'CALL NOT RECEIVED', 'CALLED : QUOTATION PENDING', 'QUOTATION SENT : REVIEW PENDING', 'BARGAINING IS ON', 'ADVANCE PENDING', 'BOOKED', 'CANCELLED', 'POSTPONED'],
        mindsetOptions: ['NOT SEEN', 'IGNORED', 'BARGAINING', 'EXPENSIVE', 'READY TO PAY ADVANCE', 'NEED TIME', 'NEED MORE TIME', 'FAMILY DISCUSSION', 'OFFICE VISIT', 'DATE POSTPONED', 'BOOKED SOMEWHERE ELSE'],
        paymentTypes: ['ADVANCE PAYMENT', 'PARTIAL PAYMENT', 'FULL PAYMENT'],
        banks: ['MASTER BARUN', 'KRIPA SAVINGS', 'KRIPA CURRENT', 'ESEWA', 'KHALTI'],
        relationOptions: ['Mother', 'Father', 'Sister', 'Brother', 'Other'],
        companyNames: ['WEDDING TALES NEPAL', 'WEDDING PAPARAZZI', 'OTHER'],
        serviceTypes: ['PHOTOGRAPHY', 'VIDEOGRAPHY', 'DRONE', 'LED', 'ALBUM', 'FRAME'],
        allEvents: [],
      });
      setIsUsingMock(true);
      setIsLoading(false);
      return;
    }

    try {
      // Try Supabase cache first
      const { data: cachedRows, error: cacheError } = await supabase
        .from('dropdowns_cache')
        .select('category, values_json');

      if (!cacheError && cachedRows && cachedRows.length > 0) {
        const cached: Record<string, string[]> = {};
        for (const row of cachedRows) {
          try {
            cached[row.category] = JSON.parse(row.values_json || '[]');
          } catch {
            cached[row.category] = [];
          }
        }

        // Check we have at least the core categories
        if (cached.sources && cached.sources.length > 0) {
          console.log(`[useDropdownData] Loaded ${cachedRows.length} categories from cache`);
          setData({
            sources: cached.sources || [],
            clientLocations: cached.clientLocations || [],
            eventLocations: cached.eventLocations || [],
            preweddingEvents: cached.preweddingEvents || [],
            weddingEvents: cached.weddingEvents || [],
            postweddingEvents: cached.postweddingEvents || [],
            oldClients: cached.oldClients || [],
            whatsappOwners: cached.whatsappOwners || [],
            clientStatuses: cached.clientStatuses || [],
            mindsetOptions: cached.mindsetOptions || [],
            paymentTypes: cached.paymentTypes || [],
            banks: cached.banks || [],
            relationOptions: cached.relationOptions || [],
            companyNames: cached.companyNames || [],
            serviceTypes: cached.serviceTypes || [],
            allEvents: cached.allEvents || [],
          });
          setIsUsingMock(false);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[useDropdownData] Cache read failed, falling back to Sheets:', err);
    }

    // Fallback: original Google Sheets call
    try {
      const dropdowns = await getDropdowns();
      setData(dropdowns);
      setIsUsingMock(false);

      // Background: populate cache for next time
      try {
        supabase.functions.invoke('sync-all-data', { body: { action: 'pull-dropdowns' } }).catch(() => {});
      } catch { /* ignore */ }
    } catch (err) {
      console.error("Failed to fetch dropdowns:", err);
      setError(err instanceof Error ? err.message : "Failed to load dropdowns");
      // Fallback to mock data
      setData({
        sources: mockDropdownData.sources,
        clientLocations: mockDropdownData.clientLocations,
        eventLocations: mockDropdownData.eventLocations,
        preweddingEvents: mockDropdownData.eventTypes.prewedding,
        weddingEvents: mockDropdownData.eventTypes.wedding,
        postweddingEvents: mockDropdownData.eventTypes.postwedding,
        oldClients: [],
        whatsappOwners: mockDropdownData.whatsappOwners,
        clientStatuses: ['UNTOUCHED', 'TEXTED : NOT CALLED', 'CALL NOT RECEIVED', 'CALLED : QUOTATION PENDING', 'QUOTATION SENT : REVIEW PENDING', 'BARGAINING IS ON', 'ADVANCE PENDING', 'BOOKED', 'CANCELLED', 'POSTPONED'],
        mindsetOptions: ['NOT SEEN', 'IGNORED', 'BARGAINING', 'EXPENSIVE', 'READY TO PAY ADVANCE', 'NEED TIME', 'NEED MORE TIME', 'FAMILY DISCUSSION', 'OFFICE VISIT', 'DATE POSTPONED', 'BOOKED SOMEWHERE ELSE'],
        paymentTypes: ['ADVANCE PAYMENT', 'PARTIAL PAYMENT', 'FULL PAYMENT'],
        banks: ['MASTER BARUN', 'KRIPA SAVINGS', 'KRIPA CURRENT', 'ESEWA', 'KHALTI'],
        relationOptions: ['Mother', 'Father', 'Sister', 'Brother', 'Other'],
        companyNames: ['WEDDING TALES NEPAL', 'WEDDING PAPARAZZI', 'OTHER'],
        serviceTypes: ['PHOTOGRAPHY', 'VIDEOGRAPHY', 'DRONE', 'LED', 'ALBUM', 'FRAME'],
        allEvents: [],
      });
      setIsUsingMock(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  return { data, isLoading, error, isUsingMock, refetch: fetchDropdowns };
}
