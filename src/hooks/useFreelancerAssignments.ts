import { useState, useEffect, useCallback, useRef } from "react";
import { getFreelancers, FreelancerData } from "@/lib/freelancer-api";
import {
  getClientFreelancerAssignments,
  updateFreelancerAssignment,
  checkFreelancerAvailability,
  FreelancerAssignment,
  FreelancerField,
  AvailabilityConflict,
} from "@/lib/freelancer-assignment-api";
import { toast } from "@/hooks/use-toast";

// Cache freelancers across hook instances
let freelancerCache: FreelancerData[] | null = null;
let freelancerCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export function useFreelancerAssignments(registeredDateTimeAD: string | undefined) {
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);
  const [freelancers, setFreelancers] = useState<FreelancerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // field being updated
  const fetchedRef = useRef(false);

  // Fetch assignments + freelancers on mount
  useEffect(() => {
    if (!registeredDateTimeAD || fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [assignData, flData] = await Promise.all([
          getClientFreelancerAssignments(registeredDateTimeAD),
          freelancerCache && Date.now() - freelancerCacheTime < CACHE_TTL
            ? Promise.resolve(freelancerCache)
            : getFreelancers(500),
        ]);
        setAssignments(assignData);
        freelancerCache = flData;
        freelancerCacheTime = Date.now();
        setFreelancers(flData);
      } catch (err) {
        console.error('Failed to load freelancer assignments:', err);
        toast({ title: "Error", description: "Failed to load freelancer assignments", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [registeredDateTimeAD]);

  const updateAssignment = useCallback(async (
    eventName: string,
    eventDateAD: string,
    field: FreelancerField,
    value: string
  ) => {
    if (!registeredDateTimeAD) return;
    setIsUpdating(field);

    // INSTANT: Update local state first (0ms feedback)
    setAssignments(prev => prev.map(a =>
      a.event.trim() === eventName.trim() && a.eventDateAD.trim() === eventDateAD.trim()
        ? { ...a, [field]: value }
        : a
    ));

    try {
      // Supabase write + background Sheets sync (handled inside updateFreelancerAssignment)
      await updateFreelancerAssignment(registeredDateTimeAD, eventName, eventDateAD, field, value);
    } catch (err) {
      console.error('Failed to save assignment to Supabase:', err);
      toast({ title: "Error", description: "Failed to save assignment", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  }, [registeredDateTimeAD]);

  const checkAvailability = useCallback(async (
    name: string,
    dateAD: string
  ): Promise<AvailabilityConflict[]> => {
    if (!name.trim() || !dateAD.trim()) return [];
    try {
      return await checkFreelancerAvailability(name, dateAD);
    } catch {
      return [];
    }
  }, []);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    setIsLoading(true);
    try {
      const [assignData, flData] = await Promise.all([
        getClientFreelancerAssignments(registeredDateTimeAD!),
        freelancerCache && Date.now() - freelancerCacheTime < CACHE_TTL
          ? Promise.resolve(freelancerCache)
          : getFreelancers(500),
      ]);
      setAssignments(assignData);
      freelancerCache = flData;
      freelancerCacheTime = Date.now();
      setFreelancers(flData);
      fetchedRef.current = true;
    } catch (err) {
      console.error('Failed to refetch freelancer assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [registeredDateTimeAD]);

  return { assignments, freelancers, isLoading, isUpdating, updateAssignment, checkAvailability, refetch };
}
