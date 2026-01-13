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
