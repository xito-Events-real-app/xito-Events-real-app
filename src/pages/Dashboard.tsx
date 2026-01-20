import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, CalendarPlus, TrendingUp, Menu, 
  MessageSquare, PhoneOff, FileText, SendHorizontal, 
  Scale, Clock, CheckCircle, XCircle, CalendarX,
  Phone, ChevronRight, RefreshCw, AlertTriangle, Bell
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
import { getDesktopMode } from "@/hooks/useDesktopMode";
import { DesktopAppLayout, DesktopDashboard } from "@/components/desktop";

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
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Check desktop mode on mount
  useEffect(() => {
    setIsDesktopMode(getDesktopMode());
  }, []);

  // NO auto-redirect on mount - app always opens to Dashboard
  // Handler selection happens on pull-to-refresh

  // Pull to refresh state (pull DOWN for handler jackpot)
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  
  // Swipe left state (for date converter)
  const [swipeLeftDistance, setSwipeLeftDistance] = useState(0);
  const swipeStartedFromLeft = useRef(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const scrollTop = useRef(0);
  const pullThreshold = 120;
  const swipeLeftThreshold = 60;
  
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

  // Get BOOKED clients with events in less than 7 days
  const urgentBookedClients = useMemo(() => {
    const now = new Date();
    return clients
      .filter(client => {
        const status = getCurrentStatus(client.statusLog || '').toUpperCase();
        if (!status.includes('BOOKED')) return false;
        
        // Parse event date (AD format: YYYY-MM-DD or similar)
        const eventDateAD = client.eventDateAD;
        if (!eventDateAD) return false;
        
        try {
          // Parse date parts manually for Safari compatibility
          const dateParts = eventDateAD.split('-');
          if (dateParts.length < 3) return false;
          
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          
          const eventDate = new Date(year, month, day);
          if (isNaN(eventDate.getTime())) return false;
          
          const diffMs = eventDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          return diffDays >= 0 && diffDays <= 7;
        } catch {
          return false;
        }
      })
      .map(client => {
        // Calculate days remaining
        const eventDateAD = client.eventDateAD!;
        const dateParts = eventDateAD.split('-');
        const eventDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        const diffMs = eventDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        return {
          ...client,
          daysRemaining
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [clients]);

  const handleCategoryClick = (status: string) => {
    navigate(`/client-tracker/fresh-clients?category=${encodeURIComponent(status)}`);
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
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;
    touchStartX.current = startX;
    touchStartY.current = startY;
    setIsPulling(true);
    
    // Check if touch started from left edge of screen (for date converter)
    swipeStartedFromLeft.current = startX < 40;
  }, [initAudio]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;
    const diffX = currentX - touchStartX.current;
    
    // SWIPE RIGHT from left edge - Date Converter (priority check)
    if (swipeStartedFromLeft.current && diffX > 0 && !showDateConverter) {
      const resistance = 0.8;
      const distance = Math.min(diffX * resistance, swipeLeftThreshold + 30);
      setSwipeLeftDistance(distance);
      
      // Open date converter when threshold reached
      if (distance >= swipeLeftThreshold) {
        setShowDateConverter(true);
        setSwipeLeftDistance(0);
        swipeStartedFromLeft.current = false;
      }
      return; // Don't process other gestures
    }
    
    // PULL DOWN - Handler Jackpot (existing behavior)
    if (diffY > 0 && isPulling && scrollTop.current <= 0) {
      // Resistance factor for natural feel
      const resistance = 0.5;
      const distance = Math.min(diffY * resistance, pullThreshold + 30);
      setPullDistance(distance);
      
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
  }, [isPulling, showJackpot, showDateConverter, handlers]);

  const handleTouchEnd = useCallback(() => {
    setIsPulling(false);
    swipeStartedFromLeft.current = false;
    setSwipeLeftDistance(0);
    
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
  }, [pullDistance, showJackpot]);

  const handleJackpotSelect = (handler: string, shouldRemember: boolean) => {
    setShowJackpot(false);
    setSoloHandler(null);
    
    if (shouldRemember) {
      saveDeviceHandler(handler);
      toast.success(`Device registered to ${handler}!`, { duration: 2000 });
    }
    
    navigate(`/client-tracker/handler/${encodeURIComponent(handler)}`);
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

  // Desktop Mode - Render completely different UI
  if (isDesktopMode) {
    return (
      <DesktopAppLayout>
        <DesktopDashboard
          clients={clients}
          handlers={handlers}
          handlerCounts={handlerCounts}
          isLoading={isLoading}
          onSync={refreshData}
          isSyncing={isSyncing}
        />
      </DesktopAppLayout>
    );
  }

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

        {/* Swipe left indicator for Date Converter */}
        {swipeLeftDistance > 0 && !showDateConverter && (
          <div 
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center"
            style={{ 
              transform: `translateX(${swipeLeftDistance}px) translateY(-50%)`,
            }}
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              swipeLeftDistance >= swipeLeftThreshold * 0.8 
                ? "bg-gradient-to-br from-purple-500 to-indigo-600 scale-110 shadow-lg shadow-purple-500/50" 
                : "bg-gradient-to-br from-purple-500/30 to-indigo-600/30"
            )}>
              <span className={cn(
                "text-xl transition-all",
                swipeLeftDistance >= swipeLeftThreshold * 0.8 ? "animate-pulse" : ""
              )}>
                🕉️
              </span>
            </div>
          </div>
        )}

        {/* Header with Menu Button - Hide in desktop mode (top nav handles it) */}
        {!isDesktopMode && (
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="pl-24">
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
        )}
        
        <div className={cn(
          "px-4 py-4 space-y-4 animate-fade-in",
          isDesktopMode ? "max-w-7xl mx-auto" : "max-w-lg mx-auto"
        )}>
          {/* Quick Action - Smaller in desktop mode */}
          <Link to="/quick-add" className={isDesktopMode ? "block max-w-md" : ""}>
            <Button 
              className="w-full h-14 text-lg font-semibold gradient-primary text-white shadow-lg press-effect"
              size="lg"
            >
              <CalendarPlus className="w-5 h-5 mr-2" />
              Quick Add Client
            </Button>
          </Link>

          {/* Urgent Events Alert - BOOKED clients with events in ≤7 days */}
          {urgentBookedClients.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="relative">
                  <Bell className="w-4 h-4 text-red-500" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                </div>
                <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide">
                  Urgent Events ({urgentBookedClients.length})
                </h3>
              </div>
              <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10 shadow-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(239,68,68,0.15),transparent_50%)] pointer-events-none" />
                <CardContent className="p-3 relative">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {urgentBookedClients.map((client) => (
                      <div 
                        key={client.rowNumber}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]",
                          client.daysRemaining <= 1 
                            ? "bg-red-500/20 animate-pulse border border-red-500/40" 
                            : client.daysRemaining <= 3 
                              ? "bg-red-500/10 border border-red-500/20"
                              : "bg-orange-500/10 border border-orange-500/20"
                        )}
                        onClick={() => handleCategoryClick('BOOKED')}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-white",
                          client.daysRemaining <= 1 
                            ? "bg-gradient-to-br from-red-500 to-red-700" 
                            : client.daysRemaining <= 3 
                              ? "bg-gradient-to-br from-red-500 to-orange-500"
                              : "bg-gradient-to-br from-orange-500 to-amber-500"
                        )}>
                          {client.daysRemaining === 0 ? "TODAY" : client.daysRemaining}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {client.clientName || 'Unnamed Client'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client.events || 'Event'} • {client.eventDateAD}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={cn(
                            "text-xs font-bold uppercase",
                            client.daysRemaining <= 1 ? "text-red-500" : 
                            client.daysRemaining <= 3 ? "text-orange-500" : "text-amber-500"
                          )}>
                            {client.daysRemaining === 0 ? "TODAY!" : 
                             client.daysRemaining === 1 ? "TOMORROW" : 
                             `${client.daysRemaining} DAYS`}
                          </span>
                          <AlertTriangle className={cn(
                            "w-4 h-4 mt-1",
                            client.daysRemaining <= 1 ? "text-red-500 animate-bounce" : "text-orange-500"
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stats Grid */}
          <div className={cn(
            "grid gap-3",
            isDesktopMode ? "grid-cols-4" : "grid-cols-3"
          )}>
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
                  onClick={() => isClickable && navigate("/client-tracker/today")}
                >
                  <CardContent className={cn(
                    "text-center",
                    isDesktopMode ? "p-4" : "p-3"
                  )}>
                    <div className={cn(
                      "rounded-xl flex items-center justify-center mx-auto mb-1",
                      stat.color,
                      isDesktopMode ? "w-12 h-12" : "w-9 h-9"
                    )}>
                      <Icon className={cn(
                        "text-white",
                        isDesktopMode ? "w-6 h-6" : "w-4 h-4"
                      )} />
                    </div>
                    <p className={cn(
                      "font-bold text-foreground",
                      isDesktopMode ? "text-2xl" : "text-xl"
                    )}>
                      {isLoading ? "—" : stat.value}
                    </p>
                    <p className={cn(
                      "text-muted-foreground",
                      isDesktopMode ? "text-sm" : "text-xs"
                    )}>{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Category Stats - Clickable */}
          {categoryStats.length > 0 && (
            <div className="space-y-2">
              <h3 className={cn(
                "font-semibold text-muted-foreground uppercase tracking-wide px-1",
                isDesktopMode ? "text-base" : "text-sm"
              )}>
                Client Categories
              </h3>
              <div className={cn(
                "grid gap-2",
                isDesktopMode ? "grid-cols-4" : "grid-cols-2"
              )}>
                {categoryStats.map(({ status, count, config }) => {
                  const Icon = config.icon;
                  return (
                    <Card 
                      key={status} 
                      className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                      onClick={() => handleCategoryClick(status)}
                    >
                      <CardContent className={cn(
                        isDesktopMode ? "p-4" : "p-3"
                      )}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "rounded-lg flex items-center justify-center shrink-0",
                            config.color,
                            isDesktopMode ? "w-12 h-12" : "w-9 h-9"
                          )}>
                            <Icon className={cn(
                              "text-white",
                              isDesktopMode ? "w-6 h-6" : "w-4 h-4"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-bold text-foreground",
                              isDesktopMode ? "text-xl" : "text-lg"
                            )}>
                              {isLoading ? "—" : count}
                            </p>
                            <p className={cn(
                              "text-muted-foreground truncate leading-tight",
                              isDesktopMode ? "text-sm" : "text-[10px]"
                            )}>
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
