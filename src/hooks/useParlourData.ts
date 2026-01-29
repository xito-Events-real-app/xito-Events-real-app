import { useState, useEffect, useCallback } from 'react';
import { 
  getParlourTypes as fetchParlourTypesApi, 
  getParloursByType as fetchParloursByTypeApi,
  addParlourEntry as addParlourEntryApi,
  ParlourEntry 
} from '@/lib/parlour-api';

interface UseParlourDataReturn {
  parlourTypes: string[];
  parlours: ParlourEntry[];
  isLoadingTypes: boolean;
  isLoadingParlours: boolean;
  error: string | null;
  fetchParlourTypes: () => Promise<void>;
  fetchParloursByType: (parlourType: string) => Promise<void>;
  addNewParlour: (parlourType: string, name: string, city: string, area: string, googleMap: string) => Promise<boolean>;
  getParlourByName: (name: string) => ParlourEntry | undefined;
  clearParlours: () => void;
}

// Cache parlour types globally to avoid refetching
let cachedParlourTypes: string[] | null = null;
let parlourTypesFetchPromise: Promise<string[]> | null = null;

export function useParlourData(): UseParlourDataReturn {
  const [parlourTypes, setParlourTypes] = useState<string[]>(cachedParlourTypes || []);
  const [parlours, setParlours] = useState<ParlourEntry[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingParlours, setIsLoadingParlours] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch parlour types on mount (with global caching)
  const fetchParlourTypes = useCallback(async () => {
    // If already cached, use cached value
    if (cachedParlourTypes && cachedParlourTypes.length > 0) {
      setParlourTypes(cachedParlourTypes);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (parlourTypesFetchPromise) {
      try {
        const types = await parlourTypesFetchPromise;
        setParlourTypes(types);
        return;
      } catch (err) {
        // Fall through to refetch
      }
    }

    setIsLoadingTypes(true);
    setError(null);

    parlourTypesFetchPromise = fetchParlourTypesApi();

    try {
      const types = await parlourTypesFetchPromise;
      cachedParlourTypes = types;
      setParlourTypes(types);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load parlour types';
      setError(message);
      console.error('Error fetching parlour types:', err);
    } finally {
      setIsLoadingTypes(false);
      parlourTypesFetchPromise = null;
    }
  }, []);

  // Fetch parlours by type
  const fetchParloursByType = useCallback(async (parlourType: string) => {
    if (!parlourType) {
      setParlours([]);
      return;
    }

    setIsLoadingParlours(true);
    setError(null);

    try {
      const parlourList = await fetchParloursByTypeApi(parlourType);
      setParlours(parlourList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load parlours';
      setError(message);
      setParlours([]);
      console.error('Error fetching parlours:', err);
    } finally {
      setIsLoadingParlours(false);
    }
  }, []);

  // Add a new parlour entry
  const addNewParlour = useCallback(async (
    parlourType: string, 
    name: string, 
    city: string, 
    area: string, 
    googleMap: string
  ): Promise<boolean> => {
    if (!parlourType || !name) return false;

    try {
      await addParlourEntryApi(parlourType, { name, city, area, googleMap });
      // Refresh parlours after adding
      await fetchParloursByType(parlourType);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add parlour';
      setError(message);
      console.error('Error adding parlour:', err);
      return false;
    }
  }, [fetchParloursByType]);

  // Get parlour by name (for auto-fill)
  const getParlourByName = useCallback((name: string): ParlourEntry | undefined => {
    if (!name) return undefined;
    return parlours.find(p => p.name.toLowerCase() === name.toLowerCase());
  }, [parlours]);

  // Clear parlours (when type changes)
  const clearParlours = useCallback(() => {
    setParlours([]);
  }, []);

  // Fetch parlour types on mount
  useEffect(() => {
    fetchParlourTypes();
  }, [fetchParlourTypes]);

  return {
    parlourTypes,
    parlours,
    isLoadingTypes,
    isLoadingParlours,
    error,
    fetchParlourTypes,
    fetchParloursByType,
    addNewParlour,
    getParlourByName,
    clearParlours,
  };
}
