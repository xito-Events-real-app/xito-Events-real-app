import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, LogOut, Newspaper, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SuiteNewsFeed } from "./SuiteNewsFeed";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { notifyCacheUpdate } from "@/lib/cache-manager";
import { SuiteLeftSidebar } from "./SuiteLeftSidebar";
import { SuiteQuickActionsBar } from "./SuiteQuickActionsBar";
import { SuiteDashboardContent } from "./SuiteDashboardContent";
import { AllClientsAnnouncementDialog } from "./AllClientsAnnouncementDialog";

export function DesktopSuiteLanding() {
  const navigate = useNavigate();
  const { toggleDesktopMode } = useDesktopMode();
  const { signOut } = useAuth();
  const { todayCount } = useActivityFeed();
  const [showNews, setShowNews] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStarHandler, setSelectedStarHandler] = useState<string | null>(null);
  const [showAllClients, setShowAllClients] = useState(false);

  const handleRefreshNews = async () => {
    setIsRefreshing(true);
    try {
    notifyCacheUpdate('clients-invalidate');
      setTimeout(() => {
        notifyCacheUpdate('booked-clients-invalidate');
      }, 200);
      toast.success("News refreshed!");
    } catch (error) {
      toast.error("Failed to refresh news");
    } finally {
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleSelectStarHandler = (handlerName: string) => {
    setSelectedStarHandler(handlerName || null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      <AllClientsAnnouncementDialog onNavigate={() => setShowAllClients(true)} />
      {/* Left Sidebar - Module Navigation */}
      <SuiteLeftSidebar 
        onSelectStarHandler={(h) => { setSelectedStarHandler(h || null); setShowAllClients(false); }}
        selectedStarHandler={selectedStarHandler}
        onShowAllClients={() => { setShowAllClients(true); setSelectedStarHandler(null); }}
        showAllClients={showAllClients}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Logo and Quick Actions */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <span className="text-white font-bold text-lg">X</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Xito Business Suite</h1>
                  <p className="text-xs text-gray-500">Your complete business toolkit</p>
                </div>
              </div>
              
              {/* Quick Actions Bar */}
              <SuiteQuickActionsBar variant="desktop" />
            </div>

            {/* Right side actions */}
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
                News
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
                Mobile
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <SuiteDashboardContent 
          selectedStarHandler={selectedStarHandler}
          onClearStarHandler={() => setSelectedStarHandler(null)}
          showAllClients={showAllClients}
          onCloseAllClients={() => setShowAllClients(false)}
        />
      </div>

      {/* News Sidebar (right) */}
      {showNews && (
        <div className="w-[30vw] min-w-[320px] max-w-[600px] border-l border-gray-200 bg-gray-50 flex flex-col shrink-0 h-screen sticky top-0">
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
