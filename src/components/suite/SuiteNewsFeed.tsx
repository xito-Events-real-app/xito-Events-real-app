import { Newspaper, Loader2 } from "lucide-react";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityCard } from "./ActivityCard";

export function SuiteNewsFeed() {
  const { groupedByDay, isLoading, activities } = useActivityFeed(14, 200);
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }
  
  if (activities.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Newspaper className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-center">No recent activities</p>
        <p className="text-gray-400 text-sm text-center mt-1">
          Activities will appear here as you work with clients
        </p>
      </div>
    );
  }
  
  // Convert Map to array for rendering
  const dayGroups = Array.from(groupedByDay.entries());
  
  return (
    <div className="px-4 py-4 pb-24 space-y-6 w-full">
      {/* Day Groups */}
      {dayGroups.map(([dayKey, dayActivities]) => (
        <div key={dayKey} className="space-y-2">
          {/* Day Header */}
          <div className="sticky top-0 z-10 py-2 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {dayKey}
            </h3>
          </div>
          
          {/* Activities for this day */}
          <div className="space-y-2">
            {dayActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}
      
      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-gray-400">
          Showing last 14 days of activity
        </p>
      </div>
    </div>
  );
}
