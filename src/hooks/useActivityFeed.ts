import { useMemo } from "react";
import { useCachedData } from "@/hooks/useCachedData";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { 
  parseActivities, 
  groupActivitiesByDay, 
  getRecentActivities,
  ActivityItem 
} from "@/lib/activity-utils";

export function useActivityFeed(days = 14, limit = 200) {
  const { clients, isLoading: isLoadingClients } = useCachedData();
  const { clients: bookedClients, isLoading: isLoadingBooked } = useBookedCachedData();
  
  const isLoading = isLoadingClients || isLoadingBooked;
  
  // Parse all activities from both client sources
  const allActivities = useMemo(() => {
    if (isLoading) return [];
    return parseActivities(clients, bookedClients);
  }, [clients, bookedClients, isLoading]);
  
  // Filter to recent activities
  const recentActivities = useMemo(() => {
    return getRecentActivities(allActivities, days, limit);
  }, [allActivities, days, limit]);
  
  // Group by day
  const groupedByDay = useMemo(() => {
    return groupActivitiesByDay(recentActivities);
  }, [recentActivities]);
  
  // Get count for badge
  const todayCount = useMemo(() => {
    const todayActivities = groupedByDay.get('TODAY') || [];
    return todayActivities.length;
  }, [groupedByDay]);
  
  return {
    activities: recentActivities,
    groupedByDay,
    todayCount,
    isLoading,
  };
}

export type { ActivityItem };
