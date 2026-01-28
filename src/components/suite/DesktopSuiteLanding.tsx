import { suiteModules } from "@/lib/suite-modules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Construction } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { SuiteQuickAdd } from "./SuiteQuickAdd";
import { TodayEventsHero } from "./TodayEventsHero";
import { ModuleCard } from "./ModuleCard";
import { useSuiteStats } from "@/hooks/useSuiteStats";
import { formatNPR } from "@/lib/client-card-utils";

export function DesktopSuiteLanding() {
  const { toggleDesktopMode } = useDesktopMode();
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Xito Business Suite</h1>
              <p className="text-sm text-gray-500">Your complete business toolkit</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDesktopMode}
            className="gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <Smartphone className="w-4 h-4" />
            Switch to Mobile
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* Top Section: Quick Add + Hero */}
        <div className="grid grid-cols-3 gap-6">
          {/* Quick Add */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
            <SuiteQuickAdd />
          </div>
          
          {/* Today's Events Hero */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Today's Schedule
            </h3>
            <TodayEventsHero />
          </div>
        </div>

        {/* Active Modules */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-600 uppercase tracking-wide">
            Active Modules
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
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
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="min-h-[100px]" />

        {/* Coming Soon Modules */}
        <div className="space-y-4 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Construction className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide">
              Coming Soon
            </h3>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {comingSoonModules.map((module) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={module.id}
                  className="bg-white border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all active:scale-[0.98] opacity-70"
                  onClick={() => handleComingSoonClick(module.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br grayscale",
                        module.gradient
                      )}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-700 truncate">
                          {module.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
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
        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-gray-400">
            Xito Business Suite v1.0 • © 2024 Xito. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
