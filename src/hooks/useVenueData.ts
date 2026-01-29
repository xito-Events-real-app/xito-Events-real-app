import { useState, useEffect, useCallback } from 'react';
import { 
  getVenueTypes as fetchVenueTypesApi, 
  getVenuesByType as fetchVenuesByTypeApi,
  addVenueEntry as addVenueEntryApi,
  VenueEntry 
} from '@/lib/event-venue-api';

interface UseVenueDataReturn {
  venueTypes: string[];
  venues: VenueEntry[];
  isLoadingTypes: boolean;
  isLoadingVenues: boolean;
  error: string | null;
  fetchVenueTypes: () => Promise<void>;
  fetchVenuesByType: (venueType: string) => Promise<void>;
  addNewVenue: (venueType: string, name: string, city: string, area: string, googleMap: string) => Promise<boolean>;
  getVenueByName: (name: string) => VenueEntry | undefined;
  clearVenues: () => void;
}

// Cache venue types globally to avoid refetching
let cachedVenueTypes: string[] | null = null;
let venueTypesFetchPromise: Promise<string[]> | null = null;

export function useVenueData(): UseVenueDataReturn {
  const [venueTypes, setVenueTypes] = useState<string[]>(cachedVenueTypes || []);
  const [venues, setVenues] = useState<VenueEntry[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch venue types on mount (with global caching)
  const fetchVenueTypes = useCallback(async () => {
    // If already cached, use cached value
    if (cachedVenueTypes && cachedVenueTypes.length > 0) {
      setVenueTypes(cachedVenueTypes);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (venueTypesFetchPromise) {
      try {
        const types = await venueTypesFetchPromise;
        setVenueTypes(types);
        return;
      } catch (err) {
        // Fall through to refetch
      }
    }

    setIsLoadingTypes(true);
    setError(null);

    venueTypesFetchPromise = fetchVenueTypesApi();

    try {
      const types = await venueTypesFetchPromise;
      cachedVenueTypes = types;
      setVenueTypes(types);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load venue types';
      setError(message);
      console.error('Error fetching venue types:', err);
    } finally {
      setIsLoadingTypes(false);
      venueTypesFetchPromise = null;
    }
  }, []);

  // Fetch venues by type
  const fetchVenuesByType = useCallback(async (venueType: string) => {
    if (!venueType) {
      setVenues([]);
      return;
    }

    setIsLoadingVenues(true);
    setError(null);

    try {
      const venueList = await fetchVenuesByTypeApi(venueType);
      setVenues(venueList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load venues';
      setError(message);
      setVenues([]);
      console.error('Error fetching venues:', err);
    } finally {
      setIsLoadingVenues(false);
    }
  }, []);

  // Add a new venue entry
  const addNewVenue = useCallback(async (
    venueType: string, 
    name: string, 
    city: string, 
    area: string, 
    googleMap: string
  ): Promise<boolean> => {
    if (!venueType || !name) return false;

    try {
      await addVenueEntryApi(venueType, { name, city, area, googleMap });
      // Refresh venues after adding
      await fetchVenuesByType(venueType);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add venue';
      setError(message);
      console.error('Error adding venue:', err);
      return false;
    }
  }, [fetchVenuesByType]);

  // Get venue by name (for auto-fill)
  const getVenueByName = useCallback((name: string): VenueEntry | undefined => {
    if (!name) return undefined;
    return venues.find(v => v.name.toLowerCase() === name.toLowerCase());
  }, [venues]);

  // Clear venues (when type changes)
  const clearVenues = useCallback(() => {
    setVenues([]);
  }, []);

  // Fetch venue types on mount
  useEffect(() => {
    fetchVenueTypes();
  }, [fetchVenueTypes]);

  return {
    venueTypes,
    venues,
    isLoadingTypes,
    isLoadingVenues,
    error,
    fetchVenueTypes,
    fetchVenuesByType,
    addNewVenue,
    getVenueByName,
    clearVenues,
  };
}
