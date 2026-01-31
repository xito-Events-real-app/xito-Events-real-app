import { TodayEventsHero } from "./TodayEventsHero";
import { HandlerActivitySection } from "./HandlerActivitySection";
import { HandlerStarClients } from "./HandlerStarClients";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, User } from "lucide-react";

const HANDLERS = [
  { name: 'Benzo', colorScheme: 'violet' as const },
  { name: 'Barun', colorScheme: 'emerald' as const },
  { name: 'Nikit', colorScheme: 'blue' as const },
];

export function SuiteDashboardContent() {
  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        {/* Tabbed Interface for Events + Handler Activity */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-4 h-12 bg-gray-100 p-1">
            <TabsTrigger 
              value="events" 
              className="gap-1.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            {HANDLERS.map(h => (
              <TabsTrigger 
                key={h.name} 
                value={h.name.toLowerCase()} 
                className={`gap-1.5 ${
                  h.colorScheme === 'violet' 
                    ? 'data-[state=active]:bg-violet-500 data-[state=active]:text-white' 
                    : h.colorScheme === 'emerald'
                    ? 'data-[state=active]:bg-emerald-500 data-[state=active]:text-white'
                    : 'data-[state=active]:bg-blue-500 data-[state=active]:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                {h.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="events" className="mt-0">
            <TodayEventsHero />
          </TabsContent>
          
          {HANDLERS.map(h => (
            <TabsContent key={h.name} value={h.name.toLowerCase()} className="mt-0 space-y-4">
              <HandlerActivitySection handlerName={h.name} colorScheme={h.colorScheme} />
              <HandlerStarClients handlerName={h.name} colorScheme={h.colorScheme} />
            </TabsContent>
          ))}
        </Tabs>
        
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
