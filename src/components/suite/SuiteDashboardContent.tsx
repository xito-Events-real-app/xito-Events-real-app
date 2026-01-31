import { TodayEventsHero } from "./TodayEventsHero";
import { HandlerActivityGrid } from "./HandlerActivityGrid";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SuiteDashboardContent() {
  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        {/* Upcoming Events Hero */}
        <TodayEventsHero />
        
        {/* Handler Activity Section */}
        <HandlerActivityGrid />
        
        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-gray-400">
            Xito Business Suite v1.0 • © 2024 Xito. All rights reserved.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
