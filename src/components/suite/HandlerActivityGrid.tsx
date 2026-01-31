import { Users } from "lucide-react";
import { HandlerActivitySection } from "./HandlerActivitySection";
import { HandlerStarClients } from "./HandlerStarClients";

// Hardcoded handlers with their color schemes
const HANDLERS = [
  { name: 'Benzo', colorScheme: 'violet' as const },
  { name: 'Barun', colorScheme: 'emerald' as const },
  { name: 'Nikit', colorScheme: 'blue' as const },
];

export function HandlerActivityGrid() {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Handler Activity
        </h3>
      </div>
      
      {/* Handler Cards Grid - 3 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {HANDLERS.map(handler => (
          <div key={handler.name} className="space-y-0">
            <HandlerActivitySection
              handlerName={handler.name}
              colorScheme={handler.colorScheme}
            />
            <HandlerStarClients 
              handlerName={handler.name}
              colorScheme={handler.colorScheme}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
