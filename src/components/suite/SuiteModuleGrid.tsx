import { useNavigate } from "react-router-dom";
import { suiteModules } from "@/lib/suite-modules";
import { useSuiteStats } from "@/hooks/useSuiteStats";
import { formatNPR } from "@/lib/client-card-utils";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Construction } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SuiteModuleGridProps {
  variant: 'active' | 'coming-soon';
}

export function SuiteModuleGrid({ variant }: SuiteModuleGridProps) {
  const navigate = useNavigate();
  const stats = useSuiteStats();
  
  const activeModules = suiteModules.filter(m => m.status === 'active');
  const comingSoonModules = suiteModules.filter(m => m.status === 'coming-soon');

  const handleModuleClick = (path: string) => {
    navigate(path);
  };

  const handleComingSoonClick = (moduleName: string) => {
    toast.info(`${moduleName} is coming soon!`, {
      description: "We're working hard to bring you this feature.",
    });
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

  if (variant === 'active') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {activeModules.map((module) => {
          const Icon = module.icon;
          const statValue = getModuleStats(module.statsKey);
          
          return (
            <Card
              key={module.id}
              onClick={() => handleModuleClick(module.path)}
              className="bg-white border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-violet-300 transition-all active:scale-[0.98] group"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-md",
                    module.gradient
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate group-hover:text-violet-700">
                      {module.name}
                    </p>
                    {statValue && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {statValue}
                      </p>
                    )}
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Coming Soon variant
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Construction className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Coming Soon
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {comingSoonModules.map((module) => {
          const Icon = module.icon;
          
          return (
            <Card
              key={module.id}
              onClick={() => handleComingSoonClick(module.name)}
              className="bg-white border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98] opacity-60 hover:opacity-80"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br grayscale",
                    module.gradient
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-700 truncate">
                      {module.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Coming Soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
