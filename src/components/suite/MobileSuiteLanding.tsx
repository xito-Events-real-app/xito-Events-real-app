import { useState } from "react";
import { LogOut, Home, Newspaper, LayoutGrid, Construction, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import { SuiteNewsFeed } from "./SuiteNewsFeed";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TodayEventsHero } from "./TodayEventsHero";
import { HandlerActivitySection } from "./HandlerActivitySection";
import { HandlerStarClients } from "./HandlerStarClients";
import { SuiteQuickActionsBar } from "./SuiteQuickActionsBar";
import { SuiteModuleGrid } from "./SuiteModuleGrid";
import { MasterSearchButton } from "./MasterSearchButton";
import { MasterSyncButton } from "./MasterSyncButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const HANDLERS = [
  { name: 'Benzo', colorScheme: 'violet' as const },
  { name: 'Barun', colorScheme: 'emerald' as const },
  { name: 'Nikit', colorScheme: 'blue' as const },
];

type TabType = 'home' | 'news' | 'modules' | 'coming-soon';

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
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Global Mode Toggle */}
      <GlobalModeToggle />

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2 bg-white border-b border-gray-200 shrink-0 w-full max-w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
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
      <div className="flex-1 overflow-hidden">
        {activeTab === 'home' && <HomeTabContent />}
        {activeTab === 'modules' && <ModulesTabContent />}
        {activeTab === 'coming-soon' && <ComingSoonTabContent />}
        {activeTab === 'news' && <SuiteNewsFeed />}
      </div>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex items-center gap-1 py-2 px-2 w-full max-w-full overflow-x-hidden">
          {/* Home Tab */}
          <button
            onClick={() => setActiveTab('home')}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all flex-1 min-w-0",
              activeTab === 'home' 
                ? "bg-violet-100 text-violet-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          
          {/* Modules Tab */}
          <button
            onClick={() => setActiveTab('modules')}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all flex-1 min-w-0",
              activeTab === 'modules' 
                ? "bg-violet-100 text-violet-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Modules</span>
          </button>
          
          {/* Coming Soon Tab */}
          <button
            onClick={() => setActiveTab('coming-soon')}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all flex-1 min-w-0",
              activeTab === 'coming-soon' 
                ? "bg-amber-100 text-amber-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Construction className="w-5 h-5" />
            <span className="text-[10px] font-medium">Soon</span>
          </button>
          
          {/* News Tab */}
          <button
            onClick={() => setActiveTab('news')}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all relative flex-1 min-w-0",
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
            <span className="text-[10px] font-medium">News</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Home Tab Content
function HomeTabContent() {
  return (
    <ScrollArea className="flex-1 h-full w-full">
      <div className="px-3 py-4 space-y-3 pb-24 w-full max-w-full overflow-x-hidden box-border">
        {/* Quick Actions */}
        <SuiteQuickActionsBar variant="mobile" />
        
        {/* Search and Sync */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-full">
          <div className="min-w-0 w-full">
            <MasterSearchButton />
          </div>
          <div className="min-w-0 w-full">
            <MasterSyncButton />
          </div>
        </div>
        
        {/* Tabbed Interface for Events + Handler Activity */}
        <EventsHandlerTabs />
      </div>
    </ScrollArea>
  );
}

function EventsHandlerTabs() {
  return (
    <Tabs defaultValue="events" className="w-full max-w-full overflow-x-hidden">
      <TabsList className="grid grid-cols-4 w-full mb-3 h-11 bg-gray-100 p-1">
        <TabsTrigger 
          value="events" 
          className="gap-1 text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Events</span>
        </TabsTrigger>
        {HANDLERS.map(h => (
          <TabsTrigger 
            key={h.name} 
            value={h.name.toLowerCase()} 
            className={`gap-1 text-xs ${
              h.colorScheme === 'violet' 
                ? 'data-[state=active]:bg-violet-500 data-[state=active]:text-white' 
                : h.colorScheme === 'emerald'
                ? 'data-[state=active]:bg-emerald-500 data-[state=active]:text-white'
                : 'data-[state=active]:bg-blue-500 data-[state=active]:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {h.name}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <TabsContent value="events" className="mt-0">
        <TodayEventsHero />
      </TabsContent>
      
      {HANDLERS.map(h => (
        <TabsContent key={h.name} value={h.name.toLowerCase()} className="mt-0 space-y-3">
          <HandlerActivitySection handlerName={h.name} colorScheme={h.colorScheme} />
          <HandlerStarClients handlerName={h.name} colorScheme={h.colorScheme} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Modules Tab Content
function ModulesTabContent() {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="px-4 py-4 space-y-4 pb-24">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-bold text-gray-900">Active Modules</h2>
        </div>
        
        <SuiteModuleGrid variant="active" />
      </div>
    </ScrollArea>
  );
}

// Coming Soon Tab Content
function ComingSoonTabContent() {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="px-4 py-4 space-y-4 pb-24">
        <SuiteModuleGrid variant="coming-soon" />
      </div>
    </ScrollArea>
  );
}
