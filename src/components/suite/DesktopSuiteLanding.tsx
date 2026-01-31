import { useState } from "react";
import { suiteModules } from "@/lib/suite-modules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Construction, LogOut, Newspaper, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { SuiteQuickAdd } from "./SuiteQuickAdd";
import { TodayEventsHero } from "./TodayEventsHero";
import { ModuleCard } from "./ModuleCard";
import { MasterSyncButton } from "./MasterSyncButton";
import { MasterSearchButton } from "./MasterSearchButton";
import { HandlerActivityGrid } from "./HandlerActivityGrid";
import { useSuiteStats } from "@/hooks/useSuiteStats";
import { formatNPR } from "@/lib/client-card-utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SuiteNewsFeed } from "./SuiteNewsFeed";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { notifyCacheUpdate } from "@/lib/cache-manager";

export function DesktopSuiteLanding() {
  const navigate = useNavigate();
  const { toggleDesktopMode } = useDesktopMode();
  const { signOut } = useAuth();
  const activeModules = suiteModules.filter(m => m.status === 'active');
  const comingSoonModules = suiteModules.filter(m => m.status === 'coming-soon');
  const stats = useSuiteStats();
  const { todayCount } = useActivityFeed();
  const [showNews, setShowNews] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshNews = async () => {
    setIsRefreshing(true);
    try {
      // Trigger cache invalidation events to force fresh fetch from Google Sheets
      notifyCacheUpdate('clients-invalidate');
      notifyCacheUpdate('booked-clients-invalidate');
      
      toast.success("News refreshed!");
    } catch (error) {
      toast.error("Failed to refresh news");
    } finally {
      // Wait a bit longer for the actual data refresh to complete
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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
            <div className="flex items-center gap-2">
              {/* News Toggle */}
              <Button
                variant={showNews ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNews(!showNews)}
                className={cn(
                  "gap-2 relative",
                  showNews 
                    ? "bg-violet-600 hover:bg-violet-700 text-white" 
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                <Newspaper className="w-4 h-4" />
                Breaking News
                {todayCount > 0 && !showNews && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {todayCount > 9 ? '9+' : todayCount}
                  </span>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDesktopMode}
                className="gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <Smartphone className="w-4 h-4" />
                Switch to Mobile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in flex-1">
          {/* Top Section: Quick Add + Hero */}
          <div className="grid grid-cols-3 gap-6">
            {/* Quick Add */}
            <div className="col-span-1 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <SuiteQuickAdd />
              <MasterSyncButton />
              <MasterSearchButton />
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

          {/* Handler Activity Section */}
          <HandlerActivityGrid />

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

      {/* News Sidebar (right) - Fixed height with independent scroll */}
      {showNews && (
        <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0 h-screen sticky top-0">
          <div className="p-4 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-violet-500" />
                Breaking News
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshNews}
                  disabled={isRefreshing}
                  className="text-gray-400 hover:text-violet-600 hover:bg-violet-50"
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNews(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Real-time updates from your business
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SuiteNewsFeed />
          </div>
        </div>
      )}
    </div>
  );
}
