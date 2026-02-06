import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { suiteModules } from "@/lib/suite-modules";
import { useSuiteStats } from "@/hooks/useSuiteStats";
import { formatNPR } from "@/lib/client-card-utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StarRating } from "@/components/ui/star-rating";
import { useHandlerStarClients } from "@/hooks/useHandlerStarClients";
import { ChevronRight, Construction, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SuiteBenzoKeepSection } from "./SuiteBenzoKeepSection";
import { CheckSquare } from "lucide-react";

const HANDLERS = [
  { name: 'Benzo', colorScheme: 'violet' as const },
  { name: 'Barun', colorScheme: 'emerald' as const },
  { name: 'Nikit', colorScheme: 'blue' as const },
];

interface SuiteLeftSidebarProps {
  onSelectStarHandler?: (handlerName: string) => void;
  selectedStarHandler?: string | null;
}

function HandlerStarItem({ 
  handler, 
  isSelected, 
  onClick 
}: { 
  handler: typeof HANDLERS[0]; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const { starClients } = useHandlerStarClients(handler.name);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
        isSelected 
          ? "bg-amber-100 border-amber-300" 
          : "hover:bg-amber-50 border-transparent",
        "border"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
        <Star className="w-4 h-4 text-white fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isSelected ? "text-amber-800" : "text-gray-800"
        )}>
          {handler.name}
        </p>
        <p className="text-xs text-gray-500">{starClients.length} star clients</p>
      </div>
      <StarRating value={5} readonly size="sm" />
    </button>
  );
}

export function SuiteLeftSidebar({ onSelectStarHandler, selectedStarHandler }: SuiteLeftSidebarProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'coming-soon'>('active');
  const stats = useSuiteStats();
  
  const activeModules = suiteModules.filter(m => m.status === 'active');
  const comingSoonModules = suiteModules.filter(m => m.status === 'coming-soon');

  const handleModuleClick = (path: string) => {
    // Clear star handler selection when navigating to a module
    if (onSelectStarHandler) {
      onSelectStarHandler('');
    }
    navigate(path);
  };

  const handleComingSoonClick = (moduleName: string) => {
    toast.info(`${moduleName} is coming soon!`, {
      description: "We're working hard to bring you this feature.",
    });
  };

  const handleStarHandlerClick = (handlerName: string) => {
    if (onSelectStarHandler) {
      onSelectStarHandler(handlerName);
    }
  };

  // Get module-specific stats
  const getModuleStats = (statsKey?: string) => {
    if (!statsKey || stats.isLoading) return undefined;
    
    switch (statsKey) {
      case 'clients':
        return `${stats.clients.activeLeads} leads`;
      case 'booked':
        return `${stats.booked.upcomingEvents} upcoming`;
      case 'finance':
        return `NPR ${formatNPR(stats.finance.collected)}`;
      case 'vendors':
        return `${stats.vendors.total} vendors`;
      case 'accounts':
        return `${stats.accounts.total} accounts`;
      default:
        return undefined;
    }
  };

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Tabs */}
      <div className="p-3 border-b border-gray-200">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'coming-soon')}>
          <TabsList className="w-full grid grid-cols-2 h-9 bg-gray-100">
            <TabsTrigger 
              value="active" 
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Active
            </TabsTrigger>
            <TabsTrigger 
              value="coming-soon" 
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Coming Soon
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Module List */}
      <ScrollArea className="flex-1">
        {activeTab === 'active' ? (
          <div className="p-2 space-y-1">
            {activeModules.map((module) => {
              const Icon = module.icon;
              const statValue = getModuleStats(module.statsKey);
              
              return (
                <button
                  key={module.id}
                  onClick={() => handleModuleClick(module.path)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                    "hover:bg-violet-50 hover:border-violet-200",
                    "border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm",
                    module.gradient
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-violet-700">
                      {module.name}
                    </p>
                    {statValue && (
                      <p className="text-xs text-gray-500 truncate">
                        {statValue}
                      </p>
                    )}
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <Construction className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">Under Development</span>
            </div>
            
            {comingSoonModules.map((module) => {
              const Icon = module.icon;
              
              return (
                <button
                  key={module.id}
                  onClick={() => handleComingSoonClick(module.name)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group opacity-60",
                    "hover:bg-gray-50 hover:opacity-80",
                    "border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br grayscale",
                    module.gradient
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-600 truncate">
                      {module.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Coming Soon
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Star Clients Section */}
      <div className="border-t border-gray-200 p-2">
        <div className="px-2 py-2 mb-1">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            Star Clients
          </p>
        </div>
        
        <div className="space-y-1">
          {HANDLERS.map((handler) => (
            <HandlerStarItem
              key={handler.name}
              handler={handler}
              isSelected={selectedStarHandler === handler.name}
              onClick={() => handleStarHandlerClick(handler.name)}
            />
          ))}
        </div>
      </div>

      {/* Benzo Keep Section */}
      <SuiteBenzoKeepSection />

      {/* WTN Daily Task Section */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={() => navigate('/tasks')}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group hover:bg-purple-50 border border-transparent hover:border-purple-200"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 group-hover:text-purple-700">WTN Daily Task</p>
            <p className="text-xs text-gray-500">Manage daily tasks</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
}
