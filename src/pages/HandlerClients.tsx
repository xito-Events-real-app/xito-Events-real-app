import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, LayoutDashboard } from "lucide-react";

import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { FreshClientCard } from "@/components/dashboard/FreshClientCard";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { useCachedData } from "@/hooks/useCachedData";
import { updateClientInCache } from "@/lib/cache-manager";
import { cn } from "@/lib/utils";
import { getDeviceHandler } from "@/lib/handler-memory";

export default function HandlerClients() {
  const { handlerName } = useParams<{ handlerName: string }>();
  const navigate = useNavigate();
  const decodedHandlerName = decodeURIComponent(handlerName || '');
  
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Filter clients by handler
  const handlerClients = useMemo(() => {
    return clients.filter(client => 
      client.clientHandler?.toLowerCase() === decodedHandlerName.toLowerCase() ||
      client.whoAdded?.toLowerCase() === decodedHandlerName.toLowerCase()
    );
  }, [clients, decodedHandlerName]);

  // Sync local clients with filtered data
  useEffect(() => {
    setLocalClients(handlerClients);
  }, [handlerClients]);

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

  // Group clients by their current status
  const clientsByStatus = useMemo(() => {
    const grouped: Record<string, ClientData[]> = {};
    
    localClients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '');
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(client);
    });

    return grouped;
  }, [localClients]);

  // Get unique statuses that have clients
  const activeStatuses = useMemo(() => {
    const statusesWithClients = Object.keys(clientsByStatus);
    const orderedStatuses: string[] = [];
    
    if (statusesWithClients.includes('JUST ENQUIRED')) {
      orderedStatuses.push('JUST ENQUIRED');
    }
    
    statusOptions.forEach(status => {
      const normalizedStatus = status.toUpperCase();
      if (statusesWithClients.includes(normalizedStatus) && 
          normalizedStatus !== 'UNTOUCHED' && 
          normalizedStatus !== 'JUST ENQUIRED') {
        orderedStatuses.push(normalizedStatus);
      }
    });
    
    statusesWithClients.forEach(status => {
      if (!orderedStatuses.includes(status) && 
          status.toUpperCase() !== 'UNTOUCHED' && 
          status.toUpperCase() !== 'JUST ENQUIRED') {
        orderedStatuses.push(status);
      }
    });

    return orderedStatuses;
  }, [clientsByStatus, statusOptions]);

  // Get status color
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
    return 'bg-muted text-foreground';
  };

  // Handle status change
  const handleStatusChange = async (client: ClientData, newStatus: string, newStatusLog: string) => {
    setLocalClients(prev => prev.map(c => 
      c.registeredDateTimeAD === client.registeredDateTimeAD
        ? { ...c, statusLog: newStatusLog }
        : c
    ));
    
    if (client.rowNumber) {
      await updateClientInCache(client.rowNumber, { statusLog: newStatusLog });
    }
  };

  // Handle handler change
  const handleHandlerChange = async (client: ClientData, handler: string) => {
    setLocalClients(prev => prev.map(c => 
      c.registeredDateTimeAD === client.registeredDateTimeAD
        ? { ...c, clientHandler: handler }
        : c
    ));
    
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

  const currentStatus = activeStatuses[currentPageIndex] || '';
  const currentClients = clientsByStatus[currentStatus] || [];

  return (
    <AppLayout>
      <SyncStatusIndicator 
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        isFromCache={isFromCache}
        lastSyncedAt={lastSyncedAt}
        isOnline={isOnline}
      />

      {/* Header with Back Button and Dashboard Link */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <PageHeader 
            title={`${decodedHandlerName}'s Clients`} 
            subtitle={`${localClients.length} total clients`}
          />
        </div>
        {/* Dashboard button - only show if this is the registered device handler */}
        {getDeviceHandler()?.name === decodedHandlerName && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <LayoutDashboard className="w-4 h-4 mr-1.5" />
            Dashboard
          </Button>
        )}
      </div>
      
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

          {/* No clients for this handler */}
          {!isLoading && !error && localClients.length === 0 && (
            <Card className="shadow-soft">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No clients assigned to {decodedHandlerName}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Swipeable Status Pages */}
          {localClients.length > 0 && activeStatuses.length > 0 && (
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
                
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {activeStatuses.map((status, idx) => (
                    <button
                      key={status}
                      onClick={() => setCurrentPageIndex(idx)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        idx === currentPageIndex 
                          ? "bg-primary w-3" 
                          : "bg-muted-foreground/30"
                      )}
                      aria-label={`Go to ${status}`}
                    />
                  ))}
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
                          key={client.rowNumber || i} 
                          client={client} 
                          onEditClick={setSelectedClient}
                          statusOptions={statusOptions}
                          handlerOptions={handlerOptions}
                          mindsetOptions={mindsetOptions}
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
        </div>

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
