import { suiteModules } from "@/lib/suite-modules";
import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import { SuiteQuickAdd } from "./SuiteQuickAdd";
import { TodayEventsHero } from "./TodayEventsHero";
import { ModuleCard } from "./ModuleCard";
import { useSuiteStats } from "@/hooks/useSuiteStats";
import { formatNPR } from "@/lib/client-card-utils";
import { Card, CardContent } from "@/components/ui/card";

export function MobileSuiteLanding() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Global Mode Toggle */}
      <GlobalModeToggle />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-white">Xito Business Suite</h1>
          <p className="text-sm text-slate-400">Your complete business toolkit</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <span className="text-white font-bold text-xl">X</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5 animate-fade-in max-w-lg mx-auto">
        {/* Quick Add Buttons */}
        <SuiteQuickAdd />

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

        {/* Spacer to push Coming Soon below fold */}
        <div className="min-h-[60px]" />

        {/* Coming Soon Section */}
        <div className="space-y-3 pt-6 border-t border-slate-700/50">
          <div className="flex items-center gap-2 px-1">
            <Construction className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Coming Soon
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {comingSoonModules.map((module) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={module.id}
                  className="bg-slate-800/50 border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-all active:scale-[0.98] opacity-60"
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
                        <p className="font-semibold text-sm text-slate-300 truncate">
                          {module.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
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
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-slate-500">
            Xito Business Suite v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
