import { suiteModules } from "@/lib/suite-modules";
import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SuiteQuickAdd } from "./SuiteQuickAdd";
import { TodayEventsHero } from "./TodayEventsHero";
import { ModuleCard } from "./ModuleCard";
import { MasterSyncButton } from "./MasterSyncButton";
import { MasterSearchButton } from "./MasterSearchButton";
import { HandlerActivityGrid } from "./HandlerActivityGrid";
import { useSuiteStats } from "@/hooks/useSuiteStats";
import { formatNPR } from "@/lib/client-card-utils";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SuiteHomeContent() {
  const activeModules = suiteModules.filter(m => m.status === 'active');
  const comingSoonModules = suiteModules.filter(m => m.status === 'coming-soon');
  const stats = useSuiteStats();

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
        return {
          primary: `${stats.clients.activeLeads} active leads`,
          activity: stats.clients.lastClient 
            ? `Last: ${stats.clients.lastClient} ${stats.clients.lastAddedTime || ''}`
            : undefined,
        };
      case 'booked':
        return {
          primary: `${stats.booked.upcomingEvents} upcoming events`,
          activity: stats.booked.nextEvent 
            ? `Next: ${stats.booked.nextEvent.clientName} in ${stats.booked.nextEvent.daysUntil} days`
            : undefined,
        };
      case 'finance':
        return {
          primary: `NPR ${formatNPR(stats.finance.collected)} collected`,
          secondary: stats.finance.pending > 0 
            ? `NPR ${formatNPR(stats.finance.pending)} pending`
            : undefined,
          activity: stats.finance.lastPayment 
            ? `Last: NPR ${formatNPR(stats.finance.lastPayment.amount)} from ${stats.finance.lastPayment.clientName}`
            : undefined,
        };
      case 'vendors':
        return {
          primary: `${stats.vendors.total} vendors`,
        };
      case 'accounts':
        return {
          primary: `${stats.accounts.total} accounts`,
        };
      default:
        return undefined;
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="px-4 py-4 space-y-5 animate-fade-in max-w-lg mx-auto pb-24">
        {/* Quick Add Buttons */}
        <SuiteQuickAdd />

        {/* Master Sync Button */}
        <MasterSyncButton />

        {/* Master Search Button */}
        <MasterSearchButton />

        {/* Today's Events Hero */}
        <TodayEventsHero />

        {/* Active Modules */}
        <div className="space-y-3">
          {activeModules.map((module) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              name={module.name}
              description={module.description}
              icon={module.icon}
              path={module.path}
              gradient={module.gradient}
              stats={getModuleStats(module.statsKey)}
              isCompact
            />
          ))}
        </div>

        {/* Handler Activity Section */}
        <HandlerActivityGrid />

        {/* Spacer to push Coming Soon below fold */}
        <div className="min-h-[60px]" />

        {/* Coming Soon Section */}
        <div className="space-y-3 pt-6 border-t border-gray-200">
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
                  className="bg-white border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all active:scale-[0.98] opacity-70"
                  onClick={() => handleComingSoonClick(module.name)}
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
                        <p className="text-[10px] text-gray-400 truncate">
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

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">
            Xito Business Suite v1.0
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
