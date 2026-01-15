import { useState, useEffect, useMemo, useRef } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

import { getClients, ClientData, getCurrentStatus, getDropdowns } from "@/lib/sheets-api";
import { FreshClientCard } from "@/components/dashboard/FreshClientCard";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import { cn } from "@/lib/utils";

export default function FreshClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clientsData, dropdowns] = await Promise.all([
        getClients(200),
        getDropdowns()
      ]);
      setClients(clientsData);
      setStatusOptions(dropdowns.clientStatuses || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group clients by their current status
  const clientsByStatus = useMemo(() => {
    const grouped: Record<string, ClientData[]> = {};
    
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '');
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(client);
    });

    return grouped;
  }, [clients]);

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
    
    // Add any remaining statuses not in options (excluding UNTOUCHED and JUST ENQUIRED)
    statusesWithClients.forEach(status => {
      if (!orderedStatuses.includes(status) && 
          status.toUpperCase() !== 'UNTOUCHED' && 
          status.toUpperCase() !== 'JUST ENQUIRED') {
        orderedStatuses.push(status);
      }
    });

    return orderedStatuses;
  }, [clientsByStatus, statusOptions]);

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
    return 'bg-muted text-foreground';
  };

  // Handle status change - update client in local state
  const handleStatusChange = (client: ClientData, newStatus: string, newStatusLog: string) => {
    setClients(prev => prev.map(c => 
      c.rowNumber === client.rowNumber 
        ? { ...c, statusLog: newStatusLog }
        : c
    ));
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
      <PageHeader 
        title="Fresh Clients" 
        subtitle={`${clients.length} total clients`}
      />
      
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="px-4 py-4 max-w-lg mx-auto w-full space-y-4 animate-fade-in flex-1 overflow-hidden">

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">Failed to load clients</p>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Swipeable Status Pages */}
          {!isLoading && !error && activeStatuses.length > 0 && (
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
                
                {/* Page Indicator Dots */}
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
              <Card className="shadow-soft overflow-hidden flex-1">
                <CardContent 
                  ref={containerRef}
                  className="p-4 h-full"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {currentClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No clients in this category
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {currentClients.map((client, i) => (
                        <FreshClientCard 
                          key={client.rowNumber || i} 
                          client={client} 
                          onClick={setSelectedClient}
                          statusOptions={statusOptions}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!isLoading && !error && activeStatuses.length === 0 && (
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
            fetchData();
          }}
        />
      </div>
    </AppLayout>
  );
}