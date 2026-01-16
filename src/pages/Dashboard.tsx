import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, CalendarPlus, TrendingUp, Menu, 
  MessageSquare, PhoneOff, FileText, SendHorizontal, 
  Scale, Clock, CheckCircle, XCircle, CalendarX,
  Phone, ChevronRight, RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentStatus } from "@/lib/sheets-api";
import { Sidebar } from "@/components/layout/Sidebar";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { cn } from "@/lib/utils";
import { HandlerJackpotPopup } from "@/components/dashboard/HandlerJackpotPopup";
import { DateConverterDrawer } from "@/components/dashboard/DateConverterDrawer";
import { getDeviceHandler, saveDeviceHandler, isDeviceHandlerValid } from "@/lib/handler-memory";
import { toast } from "sonner";
// Get icon and color for each status category
const getStatusConfig = (status: string) => {
  const s = status.toUpperCase();
  if (s.includes('JUST ENQUIRED')) return { icon: Users, color: 'bg-emerald-600', label: 'Just Enquired' };
  if (s.includes('NUMBER PROVIDED')) return { icon: Phone, color: 'bg-teal-600', label: 'Number Provided' };
  if (s.includes('TEXTED')) return { icon: MessageSquare, color: 'bg-yellow-500', label: 'Texted' };
  if (s.includes('CALL NOT')) return { icon: PhoneOff, color: 'bg-orange-500', label: 'Call Not Received' };
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return { icon: FileText, color: 'bg-blue-500', label: 'Quotation Pending' };
  if (s.includes('QUOTATION SENT')) return { icon: SendHorizontal, color: 'bg-indigo-500', label: 'Quotation Sent' };
  if (s.includes('BARGAINING')) return { icon: Scale, color: 'bg-purple-500', label: 'Bargaining' };
  if (s.includes('ADVANCE PENDING')) return { icon: Clock, color: 'bg-pink-500', label: 'Advance Pending' };
  if (s.includes('BOOKED')) return { icon: CheckCircle, color: 'bg-green-500', label: 'Booked' };
  if (s.includes('CANCELLED')) return { icon: XCircle, color: 'bg-red-500', label: 'Cancelled' };
  if (s.includes('POSTPONED')) return { icon: CalendarX, color: 'bg-slate-500', label: 'Postponed' };
  return { icon: Users, color: 'bg-gray-500', label: status };
};

// Handler avatar colors
const handlerColors = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-yellow-600',
];

// Casino audio URL
const CASINO_AUDIO_URL = "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3";

export default function Dashboard() {
  const { 
    clients, 
    dropdowns, 
    isLoading, 
    isFromCache, 
    isSyncing, 
    lastSyncedAt,
    pendingSyncs,
    refreshData,
    error 
  } = useCachedData();
  
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [soloHandler, setSoloHandler] = useState<{ name: string; colorClass: string } | null>(null);
  const [showDateConverter, setShowDateConverter] = useState(false);

  // NO auto-redirect on mount - app always opens to Dashboard
  // Handler selection happens on pull-to-refresh

  // Pull to refresh state (pull DOWN for handler jackpot)
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  
  // Swipe up state (for date converter)
  const [swipeUpDistance, setSwipeUpDistance] = useState(0);
  const [isSwipingUp, setIsSwipingUp] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const scrollTop = useRef(0);
  const pullThreshold = 120;
  const swipeUpThreshold = 80;
  
  // Audio refs
  const casinoAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioInitialized = useRef(false);

  // Listen for online/offline status
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const statusOptions = dropdowns?.clientStatuses || [];
  const handlers = dropdowns?.whatsappOwners || [];

  // Get client count per handler
  const handlerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(client => {
      const handler = client.clientHandler || client.whoAdded || '';
      if (handler) {
        counts[handler] = (counts[handler] || 0) + 1;
      }
    });
    return counts;
  }, [clients]);

  // Calculate basic stats
  const totalClients = clients.length;
  const today = new Date().toISOString().split("T")[0];
  const todaysClients = clients.filter(c => c.inquiryDateAD?.startsWith(today));
  
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthClients = clients.filter(c => {
    const month = parseInt(c.eventMonth || "0");
    return month === currentMonth || month === currentMonth + 1;
  }).length;

  // Group clients by status and count
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return counts;
  }, [clients]);

  // Get ordered categories with counts (excluding UNTOUCHED)
  const categoryStats = useMemo(() => {
    const stats: { status: string; count: number; config: ReturnType<typeof getStatusConfig> }[] = [];
    
    // First add statuses from options that have clients
    statusOptions.forEach(status => {
      const normalizedStatus = status.toUpperCase();
      if (normalizedStatus !== 'UNTOUCHED' && statusCounts[normalizedStatus]) {
        stats.push({
          status: normalizedStatus,
          count: statusCounts[normalizedStatus],
          config: getStatusConfig(normalizedStatus)
        });
      }
    });
    
    // Add any remaining statuses not in options
    Object.keys(statusCounts).forEach(status => {
      if (status !== 'UNTOUCHED' && !stats.find(s => s.status === status)) {
        stats.push({
          status,
          count: statusCounts[status],
          config: getStatusConfig(status)
        });
      }
    });
    
    return stats;
  }, [statusOptions, statusCounts]);

  const basicStats = [
    { label: "Total", value: totalClients, icon: Users, color: "gradient-primary" },
    { label: "This Month", value: thisMonthClients, icon: CalendarPlus, color: "gradient-secondary" },
    { label: "Today", value: todaysClients.length, icon: TrendingUp, color: "gradient-accent" },
  ];

  const handleCategoryClick = (status: string) => {
    navigate(`/fresh-clients?category=${encodeURIComponent(status)}`);
  };


  // Initialize audio on first touch
  const initAudio = useCallback(() => {
    if (!audioInitialized.current) {
      casinoAudioRef.current = new Audio(CASINO_AUDIO_URL);
      casinoAudioRef.current.loop = true;
      casinoAudioRef.current.volume = 0;
      audioInitialized.current = true;
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (casinoAudioRef.current) {
        casinoAudioRef.current.pause();
        casinoAudioRef.current = null;
      }
    };
  }, []);

  // Pull to refresh handlers with audio fade-in
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    initAudio();
    if (containerRef.current) {
      scrollTop.current = containerRef.current.scrollTop;
    }
    touchStartY.current = e.touches[0].clientY;
    setIsPulling(true);
    setIsSwipingUp(true);
  }, [initAudio]);

  // Check if at bottom of scroll
  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollTop + clientHeight >= scrollHeight - 10;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    // PULL DOWN - Handler Jackpot (existing behavior)
    if (diff > 0 && isPulling && scrollTop.current <= 0) {
      // Resistance factor for natural feel
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, pullThreshold + 30);
      setPullDistance(distance);
      setSwipeUpDistance(0);
      
      // Calculate pull progress (0 to 1)
      const pullProgress = distance / pullThreshold;
      
      // Start fading in audio at 10% pull
      if (pullProgress > 0.1 && casinoAudioRef.current) {
        // Volume increases from 0 to 0.4 as we pull
        const targetVolume = Math.min(pullProgress * 0.5, 0.4);
        casinoAudioRef.current.volume = targetVolume;
        
        // Start playing if not already
        if (casinoAudioRef.current.paused) {
          casinoAudioRef.current.play().catch(() => {});
        }
      }
      
      // Show jackpot popup when threshold reached
      if (distance >= pullThreshold && !showJackpot) {
        // Check if device has a valid handler (within 24 hours)
        const savedHandler = getDeviceHandler();
        const isValid = isDeviceHandlerValid();
        
        if (savedHandler && isValid) {
          // SOLO MODE - Show only their handler, auto-redirect
          const handlerIdx = handlers.findIndex(h => h === savedHandler.name);
          setSoloHandler({
            name: savedHandler.name,
            colorClass: handlerColors[handlerIdx >= 0 ? handlerIdx % handlerColors.length : 0],
          });
        }
        
        setShowJackpot(true);
        setPullDistance(0);
      }
    }
    // SWIPE UP - Date Converter
    else if (diff < 0 && isSwipingUp && isAtBottom()) {
      const upDiff = Math.abs(diff);
      const resistance = 0.6;
      const distance = Math.min(upDiff * resistance, swipeUpThreshold + 20);
      setSwipeUpDistance(distance);
      setPullDistance(0);
      
      // Open date converter when threshold reached
      if (distance >= swipeUpThreshold && !showDateConverter) {
        setShowDateConverter(true);
        setSwipeUpDistance(0);
      }
    }
  }, [isPulling, isSwipingUp, showJackpot, showDateConverter, handlers, isAtBottom]);

  const handleTouchEnd = useCallback(() => {
    setIsPulling(false);
    setIsSwipingUp(false);
    
    // Reset pull distance if didn't reach threshold
    if (pullDistance < pullThreshold) {
      setPullDistance(0);
      
      // Fade out audio if didn't reach threshold
      if (casinoAudioRef.current && !showJackpot) {
        const fadeOut = setInterval(() => {
          if (casinoAudioRef.current && casinoAudioRef.current.volume > 0.05) {
            casinoAudioRef.current.volume -= 0.05;
          } else {
            clearInterval(fadeOut);
            if (casinoAudioRef.current) {
              casinoAudioRef.current.pause();
              casinoAudioRef.current.currentTime = 0;
            }
          }
        }, 30);
      }
    }
    
    // Reset swipe up distance
    if (swipeUpDistance < swipeUpThreshold) {
      setSwipeUpDistance(0);
    }
  }, [pullDistance, swipeUpDistance, showJackpot]);

  const handleJackpotSelect = (handler: string, shouldRemember: boolean) => {
    setShowJackpot(false);
    setSoloHandler(null);
    
    if (shouldRemember) {
      saveDeviceHandler(handler);
      toast.success(`Device registered to ${handler}!`, { duration: 2000 });
    }
    
    navigate(`/handler/${encodeURIComponent(handler)}`);
  };

  const handleJackpotClose = () => {
    setShowJackpot(false);
    setSoloHandler(null);
  };

  // Prepare handlers data for jackpot popup
  const jackpotHandlers = handlers.map((handler, idx) => ({
    name: handler,
    clientCount: handlerCounts[handler] || 0,
    colorClass: handlerColors[idx % handlerColors.length],
  }));

  return (
    <AppLayout>
      {/* Sync Status Indicator */}
      <SyncStatusIndicator 
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        isFromCache={isFromCache}
        lastSyncedAt={lastSyncedAt}
        isOnline={isOnline}
      />

      {/* Jackpot Handler Popup */}
      <HandlerJackpotPopup
        isOpen={showJackpot}
        handlers={jackpotHandlers}
        onSelectHandler={handleJackpotSelect}
        onClose={handleJackpotClose}
        casinoAudioRef={casinoAudioRef}
        soloHandler={soloHandler}
      />

      {/* Date Converter Drawer */}
      <DateConverterDrawer
        isOpen={showDateConverter}
        onClose={() => setShowDateConverter(false)}
      />

      {/* Main Content - Moves down when pulled */}
      <div 
        ref={containerRef}
        className="transition-transform duration-200 ease-out overflow-y-auto h-full"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull indicator with casino theme */}
        {isPulling && pullDistance > 0 && !showJackpot && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
            style={{ top: Math.max(pullDistance - 40, 10) }}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              pullDistance >= pullThreshold * 0.8 
                ? "bg-gradient-to-br from-yellow-400 to-amber-500 scale-110 shadow-lg shadow-yellow-400/50" 
                : "bg-gradient-to-br from-yellow-400/20 to-amber-500/20"
            )}>
              <span className={cn(
                "text-lg transition-all",
                pullDistance >= pullThreshold * 0.8 ? "animate-bounce" : ""
              )}>
                🎰
              </span>
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium transition-colors",
              pullDistance >= pullThreshold * 0.8 
                ? "text-yellow-500" 
                : "text-muted-foreground"
            )}>
              {pullDistance >= pullThreshold * 0.8 ? "🎉 Release!" : "Pull for handlers"}
            </span>
          </div>
        )}

        {/* Golden glow effect near threshold */}
        {isPulling && pullDistance >= pullThreshold * 0.7 && !showJackpot && (
          <div 
            className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at 50% 0%, rgba(255, 215, 0, ${(pullDistance / pullThreshold) * 0.3}) 0%, transparent 50%)`,
              opacity: (pullDistance - pullThreshold * 0.7) / (pullThreshold * 0.3),
            }}
          />
        )}

        {/* Swipe up indicator for Date Converter */}
        {isSwipingUp && swipeUpDistance > 0 && !showDateConverter && (
          <div 
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
            style={{ 
              transform: `translateY(-${swipeUpDistance}px)`,
            }}
          >
            <span className={cn(
              "text-[10px] mb-1 font-medium transition-colors",
              swipeUpDistance >= swipeUpThreshold * 0.8 
                ? "text-purple-400" 
                : "text-muted-foreground"
            )}>
              {swipeUpDistance >= swipeUpThreshold * 0.8 ? "Release for Date Converter" : "Swipe up"}
            </span>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              swipeUpDistance >= swipeUpThreshold * 0.8 
                ? "bg-gradient-to-br from-purple-500 to-indigo-600 scale-110 shadow-lg shadow-purple-500/50" 
                : "bg-gradient-to-br from-purple-500/20 to-indigo-600/20"
            )}>
              <span className={cn(
                "text-lg transition-all",
                swipeUpDistance >= swipeUpThreshold * 0.8 ? "animate-bounce" : ""
              )}>
                🕉️
              </span>
            </div>
          </div>
        )}

        {/* Purple glow effect for swipe up */}
        {isSwipingUp && swipeUpDistance >= swipeUpThreshold * 0.7 && !showDateConverter && (
          <div 
            className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at 50% 100%, rgba(139, 92, 246, ${(swipeUpDistance / swipeUpThreshold) * 0.3}) 0%, transparent 50%)`,
              opacity: (swipeUpDistance - swipeUpThreshold * 0.7) / (swipeUpThreshold * 0.3),
            }}
          />
        )}

        {/* Header with Menu Button */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <PageHeader 
              title="WTN Client Tracker" 
              subtitle="Wedding & Event Management"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              disabled={isSyncing}
              className="shrink-0"
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="px-4 py-4 max-w-lg mx-auto space-y-4 animate-fade-in">
          {/* Quick Action */}
          <Link to="/quick-add">
            <Button 
              className="w-full h-14 text-lg font-semibold gradient-primary text-white shadow-lg press-effect"
              size="lg"
            >
              <CalendarPlus className="w-5 h-5 mr-2" />
              Quick Add Client
            </Button>
          </Link>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {basicStats.map((stat) => {
              const Icon = stat.icon;
              const isClickable = stat.label === "Today";
              return (
                <Card 
                  key={stat.label} 
                  className={cn(
                    "shadow-soft border-0",
                    isClickable && "cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                  )}
                  onClick={() => isClickable && navigate("/today")}
                >
                  <CardContent className="p-3 text-center">
                    <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-1`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoading ? "—" : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Category Stats - Clickable */}
          {categoryStats.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Client Categories
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categoryStats.map(({ status, count, config }) => {
                  const Icon = config.icon;
                  return (
                    <Card 
                      key={status} 
                      className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                      onClick={() => handleCategoryClick(status)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            config.color
                          )}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-foreground">
                              {isLoading ? "—" : count}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate leading-tight">
                              {config.label}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show setup notice only on error */}
          {error && (
            <Card className="border-2 border-dashed border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">⚠️ Connection Issue</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Check your Google Sheets configuration in Settings.
                </p>
                <Link to="/settings">
                  <Button variant="outline" size="sm" className="w-full">
                    Go to Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </AppLayout>
  );
}
