import { useState, useMemo, useRef, useCallback } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, CalendarPlus, TrendingUp, Menu, 
  MessageSquare, PhoneOff, FileText, SendHorizontal, 
  Scale, Clock, CheckCircle, XCircle, CalendarX,
  Phone, ChevronRight, RefreshCw, User
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentStatus } from "@/lib/sheets-api";
import { Sidebar } from "@/components/layout/Sidebar";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { cn } from "@/lib/utils";

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
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showHandlers, setShowHandlers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const scrollTop = useRef(0);
  const pullThreshold = 120;

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

  const handleHandlerClick = (handler: string) => {
    navigate(`/handler/${encodeURIComponent(handler)}`);
  };

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current) {
      scrollTop.current = containerRef.current.scrollTop;
    }
    touchStartY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || scrollTop.current > 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    if (diff > 0) {
      // Resistance factor for natural feel
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, pullThreshold + 30);
      setPullDistance(distance);
      
      if (distance >= pullThreshold && !showHandlers) {
        setShowHandlers(true);
      }
    }
  }, [isPulling, showHandlers]);

  const handleTouchEnd = useCallback(() => {
    setIsPulling(false);
    
    if (pullDistance < pullThreshold) {
      setPullDistance(0);
      setShowHandlers(false);
    } else {
      // Snap to revealed position
      setPullDistance(pullThreshold);
    }
  }, [pullDistance]);

  const hideHandlers = () => {
    setPullDistance(0);
    setShowHandlers(false);
  };

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

      {/* Hidden Handler Panel - Revealed on Pull */}
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out overflow-hidden",
          showHandlers ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ 
          height: showHandlers ? `${pullThreshold}px` : '0px',
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)'
        }}
      >
        <div className="px-4 py-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/90 uppercase tracking-wider">
              Team Handlers
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={hideHandlers}
              className="text-white/80 hover:text-white hover:bg-white/10 h-6 px-2 text-xs"
            >
              Hide
            </Button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto flex-1 items-center pb-1 scrollbar-hide">
            {handlers.map((handler, idx) => {
              const initials = handler.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const clientCount = handlerCounts[handler] || 0;
              const colorClass = handlerColors[idx % handlerColors.length];
              
              return (
                <button
                  key={handler}
                  onClick={() => handleHandlerClick(handler)}
                  className="flex flex-col items-center gap-1 shrink-0 group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-lg",
                    "transform transition-all group-active:scale-95",
                    "ring-2 ring-white/30",
                    colorClass
                  )}>
                    {initials || <User className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] text-white font-medium max-w-[60px] truncate">
                    {handler.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-white/70 -mt-0.5">
                    {clientCount} client{clientCount !== 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
            
            {handlers.length === 0 && (
              <p className="text-white/70 text-sm">No handlers configured</p>
            )}
          </div>
        </div>
      </div>

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
        {/* Pull indicator */}
        {isPulling && pullDistance > 0 && !showHandlers && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
            style={{ top: Math.max(pullDistance - 40, 10) }}
          >
            <div className={cn(
              "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center transition-all",
              pullDistance >= pullThreshold * 0.8 && "bg-primary/40 scale-110"
            )}>
              <ChevronRight 
                className={cn(
                  "w-5 h-5 text-primary rotate-90 transition-transform",
                  pullDistance >= pullThreshold * 0.8 && "rotate-[270deg]"
                )} 
              />
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              {pullDistance >= pullThreshold * 0.8 ? "Release" : "Pull for handlers"}
            </span>
          </div>
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
