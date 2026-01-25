import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { 
  Users, CalendarPlus, TrendingUp, Menu, 
  ChevronRight, RefreshCw, AlertTriangle, Bell, Flame, CheckCircle
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
import { getStatusConfig, sortCategoriesByOrder } from "@/lib/status-config";
import { parseEventDetails } from "@/lib/nepali-months";
import { isBSDatePast } from "@/lib/nepali-date";

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
  const [showHotDatesDrawer, setShowHotDatesDrawer] = useState(false);
  const [selectedMobileHotDate, setSelectedMobileHotDate] = useState<string | null>(null);

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
  // Use local date for Nepal timezone (not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

  // Get ordered categories with counts (excluding UNTOUCHED, sorted by canonical order)
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
    
    // Sort by canonical order
    return sortCategoriesByOrder(stats);
  }, [statusOptions, statusCounts]);

  const basicStats = [
    { label: "Total", value: totalClients, icon: Users, color: "gradient-primary" },
    { label: "This Month", value: thisMonthClients, icon: CalendarPlus, color: "gradient-secondary" },
    { label: "Today", value: todaysClients.length, icon: TrendingUp, color: "gradient-accent" },
  ];

  // Hot Dates calculation - group clients by event date
  const hotDates = useMemo(() => {
    const ENQUIRY_ON_STATUSES = [
      'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
      'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
    ];
    
    const GONE_ELSEWHERE_STATUSES = [
      'CANCELLED BY CLIENT', 'CANCELLED BY US', 'BOOKED SOMEWHERE ELSE'
    ];

    interface DateGroup {
      dateKey: string;
      year: string;
      month: string;
      monthName: string;
      day: string;
      booked: { clientName: string; eventName: string }[];
      enquiryOn: { clientName: string; eventName: string }[];
      goneElsewhere: { clientName: string; eventName: string }[];
      totalCount: number;
      isCompleted: boolean;
    }

    const dateGroups: Record<string, DateGroup> = {};

    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      const parsedEvents = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );

      parsedEvents.forEach(event => {
        if (!event.year || !event.month || !event.day) return;
        
        const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${event.day.padStart(2, '0')}`;
        
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            dateKey,
            year: event.year,
            month: event.month,
            monthName: event.monthName,
            day: event.day,
            booked: [],
            enquiryOn: [],
            goneElsewhere: [],
            totalCount: 0,
            isCompleted: isBSDatePast(event.year, event.month, event.day)
          };
        }

        const entry = { clientName: client.clientName || 'Unnamed', eventName: event.eventName };

        if (status.includes('BOOKED') && !status.includes('SOMEWHERE ELSE')) {
          dateGroups[dateKey].booked.push(entry);
        } else if (GONE_ELSEWHERE_STATUSES.some(s => status.includes(s))) {
          dateGroups[dateKey].goneElsewhere.push(entry);
        } else if (ENQUIRY_ON_STATUSES.some(s => status.includes(s))) {
          dateGroups[dateKey].enquiryOn.push(entry);
        }
      });
    });

    return Object.values(dateGroups)
      .map(d => ({
        ...d,
        totalCount: d.booked.length + d.enquiryOn.length + d.goneElsewhere.length
      }))
      .filter(d => d.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 6);
  }, [clients]);

  // Filter clients by selected mobile hot date
  const mobileHotDateFilteredClients = useMemo(() => {
    if (!selectedMobileHotDate) return [];
    
    const [hYear, hMonth, hDay] = selectedMobileHotDate.split('-').map(s => parseInt(s));
    
    return clients.filter(client => {
      const years = (client.eventYear || '').split('\n').filter(Boolean);
      const months = (client.eventMonth || '').split('\n').filter(Boolean);
      const days = (client.eventDay || '').split('\n').filter(Boolean);
      
      for (let i = 0; i < Math.max(years.length, months.length, days.length); i++) {
        const y = parseInt(years[i]) || 0;
        const m = parseInt(months[i]) || 0;
        const d = parseInt(days[i]) || 0;
        if (y === hYear && m === hMonth && d === hDay) {
          return true;
        }
      }
      return false;
    });
  }, [clients, selectedMobileHotDate]);

  // Get selected hot date info for display
  const selectedHotDateInfo = useMemo(() => {
    if (!selectedMobileHotDate) return null;
    return hotDates.find(d => d.dateKey === selectedMobileHotDate) || null;
  }, [hotDates, selectedMobileHotDate]);

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
  // DesktopAppLayout now handles filtering and passes props to DesktopDashboard
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
          dropdowns={dropdowns}
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
          {/* Hot Dates Section - Replaces Quick Add on mobile */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
                  Hot Dates
                </h3>
              </div>
              <Link 
                to="/client-tracker/hot-dates" 
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            
            {/* Horizontal Scrollable Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {hotDates.length > 0 ? (
                hotDates.slice(0, 4).map((date) => {
                  const isSelected = selectedMobileHotDate === date.dateKey;
                  return (
                    <button
                      key={date.dateKey}
                      onClick={() => setSelectedMobileHotDate(isSelected ? null : date.dateKey)}
                      className={cn(
                        "shrink-0 px-3 py-2 rounded-lg transition-all active:scale-95 relative",
                        date.isCompleted && "opacity-50",
                        isSelected
                          ? "bg-gradient-to-r from-orange-500 to-red-500 border-2 border-orange-400 ring-2 ring-orange-500/30 shadow-lg"
                          : "bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 hover:border-orange-500/50"
                      )}
                    >
                      {/* Completed indicator */}
                      {date.isCompleted && (
                        <span className="absolute -top-1 -right-1 bg-muted-foreground text-white rounded-full w-4 h-4 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3" />
                        </span>
                      )}
                      <div className={cn(
                        "font-semibold text-sm",
                        isSelected ? "text-white" : "text-foreground"
                      )}>
                        {date.monthName} {date.day}
                      </div>
                      <div className="flex gap-1.5 text-xs mt-1 justify-center">
                        <span className={cn("font-bold", isSelected ? "text-green-200" : "text-green-600")}>{date.booked.length}</span>
                        <span className={cn("font-bold", isSelected ? "text-amber-200" : "text-amber-600")}>{date.enquiryOn.length}</span>
                        <span className={cn("font-bold", isSelected ? "text-gray-300" : "text-gray-500")}>{date.goneElsewhere.length}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground py-2">
                  No hot dates yet
                </div>
              )}
              
              {hotDates.length > 4 && (
                <button
                  onClick={() => navigate('/client-tracker/hot-dates')}
                  className="shrink-0 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 flex items-center gap-1 hover:border-muted-foreground/50 transition-all"
                >
                  <span className="text-xs text-muted-foreground">+{hotDates.length - 4} more</span>
                </button>
              )}
            </div>

            {/* Filtered Clients List - Show when a hot date is selected */}
            {selectedMobileHotDate && selectedHotDateInfo && (
              <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        {selectedHotDateInfo.monthName} {selectedHotDateInfo.day}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {mobileHotDateFilteredClients.length} clients
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedMobileHotDate(null)}
                      className="h-7 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {mobileHotDateFilteredClients.map((client) => {
                      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
                      const isBooked = status.includes('BOOKED') && !status.includes('SOMEWHERE ELSE');
                      const isGone = status.includes('CANCELLED') || status.includes('SOMEWHERE ELSE');
                      
                      return (
                        <div 
                          key={client.rowNumber}
                          onClick={() => navigate(`/client-tracker/client/${client.registeredDateTimeAD}`)}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] border",
                            isBooked 
                              ? "bg-green-500/10 border-green-500/30" 
                              : isGone 
                                ? "bg-gray-500/10 border-gray-500/30"
                                : "bg-amber-500/10 border-amber-500/30"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                            isBooked 
                              ? "bg-gradient-to-br from-green-500 to-green-700" 
                              : isGone 
                                ? "bg-gradient-to-br from-gray-500 to-gray-700"
                                : "bg-gradient-to-br from-amber-500 to-amber-700"
                          )}>
                            {isBooked ? "B" : isGone ? "G" : "E"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {client.clientName || 'Unnamed'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {client.events || 'Event'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hot Dates Drawer */}
          <Drawer open={showHotDatesDrawer} onOpenChange={setShowHotDatesDrawer}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Hot Dates
                </DrawerTitle>
              </DrawerHeader>
              
              <ScrollArea className="h-[60vh] px-4">
                <div className="space-y-4 pb-4">
                  {hotDates.map((date) => (
                    <Card key={date.dateKey} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        {/* Date Header */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                            {date.monthName} {date.day}, {date.year}
                          </Badge>
                          <span className="text-lg font-bold">{date.totalCount}</span>
                        </div>
                        
                        {/* Three Categories */}
                        <div className="space-y-3">
                          {/* BOOKED */}
                          {date.booked.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-green-500 text-white text-xs">BOOKED</Badge>
                                <span className="font-semibold text-green-600">{date.booked.length}</span>
                              </div>
                              {date.booked.slice(0, 3).map((c, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-2">
                                  {c.eventName} • {c.clientName}
                                </p>
                              ))}
                              {date.booked.length > 3 && (
                                <p className="text-xs text-green-500 pl-2">+{date.booked.length - 3} more</p>
                              )}
                            </div>
                          )}
                          
                          {/* ENQUIRY ON */}
                          {date.enquiryOn.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-amber-500 text-white text-xs">ENQUIRY</Badge>
                                <span className="font-semibold text-amber-600">{date.enquiryOn.length}</span>
                              </div>
                              {date.enquiryOn.slice(0, 3).map((c, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-2">
                                  {c.eventName} • {c.clientName}
                                </p>
                              ))}
                              {date.enquiryOn.length > 3 && (
                                <p className="text-xs text-amber-500 pl-2">+{date.enquiryOn.length - 3} more</p>
                              )}
                            </div>
                          )}
                          
                          {/* GONE ELSEWHERE */}
                          {date.goneElsewhere.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-gray-500 text-white text-xs">GONE</Badge>
                                <span className="font-semibold text-gray-600">{date.goneElsewhere.length}</span>
                              </div>
                              {date.goneElsewhere.slice(0, 3).map((c, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-2">
                                  {c.eventName} • {c.clientName}
                                </p>
                              ))}
                              {date.goneElsewhere.length > 3 && (
                                <p className="text-xs text-gray-500 pl-2">+{date.goneElsewhere.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              <DrawerFooter>
                <Button onClick={() => navigate('/client-tracker/hot-dates')} variant="outline">
                  View Full Page
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

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
