import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { normalizeStatus } from "@/lib/status-config";
import { EARLY_PIPELINE, hasAnyPastEventDate, isAlmostLost, getColdDatesClients } from "@/lib/fresh-client-utils";
import { FreshClientCard } from "@/components/dashboard/FreshClientCard";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { updateClientInCache } from "@/lib/cache-manager";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function FreshClients() {
  const [searchParams] = useSearchParams();
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
  
  const [localClients, setLocalClients] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [initialCategorySet, setInitialCategorySet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sync local clients with cached data
  useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusOptions = dropdowns?.clientStatuses || [];
  const handlerOptions = dropdowns?.whatsappOwners || [];
  const mindsetOptions = dropdowns?.mindsetOptions || [];
  const paymentTypes = dropdowns?.paymentTypes || [];
  const banks = dropdowns?.banks || [];

  // Group clients by their current status (normalized), with special overrides
  const clientsByStatus = useMemo(() => {
    const grouped: Record<string, ClientData[]> = {};
    
    localClients.forEach(client => {
      const rawStatus = getCurrentStatus(client.statusLog || '');
      const status = normalizeStatus(rawStatus);
      if (status === 'UNTOUCHED') return;

      // Check LOST first (past dates), then ALMOST LOST (< 30 days)
      let assignedStatus = status;
      if (EARLY_PIPELINE.includes(status)) {
        if (hasAnyPastEventDate(client)) {
          assignedStatus = 'LOST';
        } else if (isAlmostLost(client)) {
          assignedStatus = 'ALMOST LOST';
        }
      }

      if (!grouped[assignedStatus]) grouped[assignedStatus] = [];
      grouped[assignedStatus].push(client);
    });

    // Add COLD DATES group
    const coldClients = getColdDatesClients(localClients);
    if (coldClients.length > 0) {
      grouped['COLD DATES'] = coldClients;
    }

    return grouped;
  }, [localClients]);

  // Get unique statuses that have clients, with JUST ENQUIRED first, excluding UNTOUCHED
  const activeStatuses = useMemo(() => {
    const statusesWithClients = Object.keys(clientsByStatus);
    const orderedStatuses: string[] = [];
    
    // JUST ENQUIRED always comes first if it has clients
    if (statusesWithClients.includes('JUST ENQUIRED')) {
      orderedStatuses.push('JUST ENQUIRED');
    }
    
    // Then add other statuses from options that have clients (excluding UNTOUCHED and JUST ENQUIRED)
    statusOptions.forEach(status => {
      const normalizedStatus = status.toUpperCase();
      if (statusesWithClients.includes(normalizedStatus) && 
          normalizedStatus !== 'UNTOUCHED' && 
          normalizedStatus !== 'JUST ENQUIRED') {
        orderedStatuses.push(normalizedStatus);
      }
    });
    
    // Add any remaining statuses not in options (excluding special categories)
    const SPECIAL_CATEGORIES = ['UNTOUCHED', 'JUST ENQUIRED', 'LOST', 'ALMOST LOST', 'COLD DATES'];
    statusesWithClients.forEach(status => {
      if (!orderedStatuses.includes(status) && !SPECIAL_CATEGORIES.includes(status.toUpperCase())) {
        orderedStatuses.push(status);
      }
    });

    // Special categories after separator: ALMOST LOST, COLD DATES, LOST
    if (statusesWithClients.includes('ALMOST LOST')) orderedStatuses.push('ALMOST LOST');
    if (statusesWithClients.includes('COLD DATES')) orderedStatuses.push('COLD DATES');
    if (statusesWithClients.includes('LOST')) orderedStatuses.push('LOST');

    return orderedStatuses;
  }, [clientsByStatus, statusOptions]);

  // Navigate to category from URL query param
  useEffect(() => {
    if (initialCategorySet || activeStatuses.length === 0) return;
    
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const categoryIndex = activeStatuses.findIndex(
        s => s.toUpperCase() === categoryParam.toUpperCase()
      );
      if (categoryIndex !== -1) {
        setCurrentPageIndex(categoryIndex);
      }
    }
    setInitialCategorySet(true);
  }, [searchParams, activeStatuses, initialCategorySet]);

  // Get status color based on current status
  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('JUST ENQUIRED')) return 'bg-emerald-600 text-white';
    if (s.includes('UNTOUCHED')) return 'bg-gray-500 text-white';
    if (s.includes('TEXTED')) return 'bg-yellow-500 text-white';
    if (s.includes('CALL NOT')) return 'bg-orange-500 text-white';
    if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return 'bg-blue-500 text-white';
    if (s.includes('QUOTATION SENT')) return 'bg-indigo-500 text-white';
    if (s.includes('BARGAINING')) return 'bg-purple-500 text-white';
    if (s.includes('ADVANCE PENDING')) return 'bg-pink-500 text-white';
    if (s.includes('BOOKED')) return 'bg-green-500 text-white';
    if (s.includes('CANCELLED')) return 'bg-red-500 text-white';
    if (s.includes('POSTPONED')) return 'bg-slate-500 text-white';
    if (s === 'LOST') return 'bg-rose-700 text-white';
    if (s === 'ALMOST LOST') return 'bg-amber-600 text-white';
    if (s === 'COLD DATES') return 'bg-cyan-600 text-white';
    return 'bg-muted text-foreground';
  };

  // Handle status change - update client in local state AND cache
  const handleStatusChange = async (client: ClientData, newStatus: string, newStatusLog: string) => {
    // Update local state immediately
    setLocalClients(prev => prev.map(c => 
      c.registeredDateTimeAD === client.registeredDateTimeAD
        ? { ...c, statusLog: newStatusLog }
        : c
    ));
    
    // Update cache
    if (client.rowNumber) {
      await updateClientInCache(client.rowNumber, { statusLog: newStatusLog });
    }
  };

  // Handle handler change - update client in local state AND cache
  const handleHandlerChange = async (client: ClientData, handler: string) => {
    // Update local state immediately
    setLocalClients(prev => prev.map(c => 
      c.registeredDateTimeAD === client.registeredDateTimeAD
        ? { ...c, clientHandler: handler }
        : c
    ));
    
    // Update cache
    if (client.rowNumber) {
      await updateClientInCache(client.rowNumber, { clientHandler: handler });
    }
  };

  // Touch handlers for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentPageIndex < activeStatuses.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  // Navigate to previous/next page
  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < activeStatuses.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  // Current status and clients for this page
  const currentStatus = activeStatuses[currentPageIndex] || 'UNTOUCHED';
  const currentClients = clientsByStatus[currentStatus] || [];

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

      <PageHeader 
        title="Fresh Clients" 
        subtitle={`${localClients.length} total clients`}
      />
      
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="px-4 py-4 w-full space-y-4 animate-fade-in flex-1 flex flex-col overflow-hidden">

          {/* Loading State */}
          {isLoading && localClients.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && localClients.length === 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">Failed to load clients</p>
                <Button variant="outline" size="sm" onClick={refreshData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Swipeable Status Pages */}
          {(localClients.length > 0 || !isLoading) && activeStatuses.length > 0 && (
            <>
              {/* Top Navigation Bar */}
              <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={currentPageIndex === 0}
                  className="shrink-0 h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {/* Page Indicator Dots with separator before special categories */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {activeStatuses.map((status, idx) => {
                    const SPECIAL = ['ALMOST LOST', 'COLD DATES', 'LOST'];
                    const isSpecial = SPECIAL.includes(status);
                    const prevIsSpecial = idx > 0 && SPECIAL.includes(activeStatuses[idx - 1]);
                    const showSeparator = isSpecial && !prevIsSpecial;
                    
                    return (
                      <span key={status} className="flex items-center gap-1.5">
                        {showSeparator && (
                          <span className="w-px h-3 bg-muted-foreground/40 mx-0.5" />
                        )}
                        <button
                          onClick={() => setCurrentPageIndex(idx)}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all",
                            idx === currentPageIndex 
                              ? "bg-primary w-3" 
                              : isSpecial
                              ? "bg-amber-400/60"
                              : "bg-muted-foreground/30"
                          )}
                          aria-label={`Go to ${status}`}
                        />
                      </span>
                    );
                  })}
                </div>

                <span className="text-xs text-muted-foreground min-w-[32px] text-center">
                  {currentPageIndex + 1}/{activeStatuses.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPageIndex === activeStatuses.length - 1}
                  className="shrink-0 h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Colored Status Header */}
              <div className={cn(
                "rounded-xl px-4 py-3 text-center",
                getStatusColor(currentStatus)
              )}>
                <h2 className="text-lg font-bold uppercase tracking-wide">
                  {currentStatus}
                </h2>
                <p className="text-xs opacity-80">
                  {currentClients.length} client{currentClients.length !== 1 ? 's' : ''}
                  {currentStatus === 'ALMOST LOST' && ' • Events in less than 1 month'}
                  {currentStatus === 'COLD DATES' && ' • Dates with enquiries but no bookings'}
                </p>
              </div>

              {/* Client Cards with Swipe */}
              <Card className="shadow-soft overflow-hidden flex-1 flex flex-col">
                <CardContent 
                  ref={containerRef}
                  className="p-4 flex-1 flex flex-col overflow-hidden"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {currentClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No clients in this category
                    </p>
                  ) : (
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {currentClients.map((client, i) => (
                        <FreshClientCard 
                          key={client.registeredDateTimeAD || `${client.rowNumber}-${i}`} 
                          client={client} 
                          onEditClick={setSelectedClient}
                          statusOptions={statusOptions}
                          handlerOptions={handlerOptions}
                          mindsetOptions={mindsetOptions}
                          paymentTypes={paymentTypes}
                          banks={banks}
                          currentStatusCategory={currentStatus}
                          onStatusChange={handleStatusChange}
                          onHandlerChange={handleHandlerChange}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!isLoading && !error && activeStatuses.length === 0 && localClients.length === 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No clients found</p>
              </CardContent>
            </Card>
          )}
        </div>

        
        {/* Client Detail Sheet */}
        <ClientDetailSheet
          client={selectedClient}
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onSave={() => {
            setSelectedClient(null);
            refreshData();
          }}
        />
      </div>
    </AppLayout>
  );
}
