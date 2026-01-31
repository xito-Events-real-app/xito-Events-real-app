import { useMemo } from "react";
import { useActivityFeed, ActivityItem } from "@/hooks/useActivityFeed";

export function useHandlerActivityFeed(handlerName: string) {
  const { activities, isLoading } = useActivityFeed();
  
  // Filter activities for this specific handler
  const handlerActivities = useMemo(() => {
    return activities.filter(a => 
      a.handlerName?.toLowerCase().trim() === handlerName.toLowerCase().trim()
    );
  }, [activities, handlerName]);
  
  // Group into TODAY and YESTERDAY
  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayActivities = handlerActivities.filter(a => a.timestamp >= today);
    const yesterdayActivities = handlerActivities.filter(a => 
      a.timestamp >= yesterday && a.timestamp < today
    );
    
    return { todayActivities, yesterdayActivities };
  }, [handlerActivities]);
  
  return {
    todayActivities: grouped.todayActivities,
    yesterdayActivities: grouped.yesterdayActivities,
    totalCount: handlerActivities.length,
    isLoading,
  };
}

export type { ActivityItem };
