import { useState } from "react";
import { LogOut, Home, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import { SuiteHomeContent } from "./SuiteHomeContent";
import { SuiteNewsFeed } from "./SuiteNewsFeed";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";

type TabType = 'home' | 'news';

export function MobileSuiteLanding() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { todayCount } = useActivityFeed();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Global Mode Toggle */}
      <GlobalModeToggle />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-white font-bold text-lg">X</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Xito Business Suite</h1>
            <p className="text-xs text-gray-500">Your complete business toolkit</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden animate-fade-in">
        {activeTab === 'home' && <SuiteHomeContent />}
        {activeTab === 'news' && <SuiteNewsFeed />}
      </div>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex items-center justify-start gap-4 py-2 px-4">
          {/* Home Tab */}
          <button
            onClick={() => setActiveTab('home')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all",
              activeTab === 'home' 
                ? "bg-violet-100 text-violet-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          {/* News Tab */}
          <button
            onClick={() => setActiveTab('news')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all relative",
              activeTab === 'news' 
                ? "bg-violet-100 text-violet-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <div className="relative">
              <Newspaper className="w-5 h-5" />
              {todayCount > 0 && activeTab !== 'news' && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {todayCount > 9 ? '9+' : todayCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">News</span>
          </button>
        </div>
      </div>
    </div>
  );
}
