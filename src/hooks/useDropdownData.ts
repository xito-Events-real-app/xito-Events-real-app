import { useState, useEffect } from "react";
import { getDropdowns, DropdownData, isSheetsConfigured } from "@/lib/sheets-api";
import { mockDropdownData } from "@/lib/form-data";

export function useDropdownData() {
  const [data, setData] = useState<DropdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    async function fetchDropdowns() {
      if (!isSheetsConfigured()) {
        // Use mock data when not configured
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
          companyNames: ['WEDDING TALES NEPAL', 'WEDDING PAPARAZZI', 'OTHER'],
          serviceTypes: ['PHOTOGRAPHY', 'VIDEOGRAPHY', 'DRONE', 'LED', 'ALBUM', 'FRAME'],
          allEvents: [], // From EVENT SETUP DATA sheet
        });
        setIsUsingMock(true);
        setIsLoading(false);
        return;
      }

      try {
        const dropdowns = await getDropdowns();
        setData(dropdowns);
        setIsUsingMock(false);
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
          companyNames: ['WEDDING TALES NEPAL', 'WEDDING PAPARAZZI', 'OTHER'],
          serviceTypes: ['PHOTOGRAPHY', 'VIDEOGRAPHY', 'DRONE', 'LED', 'ALBUM', 'FRAME'],
          allEvents: [], // From EVENT SETUP DATA sheet
        });
        setIsUsingMock(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDropdowns();
  }, []);

  return { data, isLoading, error, isUsingMock, refetch: () => {} };
}
