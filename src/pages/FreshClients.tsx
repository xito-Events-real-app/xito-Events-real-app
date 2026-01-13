import { useState, useEffect, useMemo, useRef } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, RefreshCw, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
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

  // Get unique statuses that have clients (in order of statusOptions)
  const activeStatuses = useMemo(() => {
    const statusesWithClients = Object.keys(clientsByStatus);
    
    // Maintain order based on statusOptions, then add any not in options
    const orderedStatuses: string[] = [];
    
    // First add statuses from options that have clients
    statusOptions.forEach(status => {
      const normalizedStatus = status.toUpperCase();
      if (statusesWithClients.includes(normalizedStatus)) {
        orderedStatuses.push(normalizedStatus);
      }
    });
    
    // Add any remaining statuses not in options
    statusesWithClients.forEach(status => {
      if (!orderedStatuses.includes(status)) {
        orderedStatuses.push(status);
      }
    });

    return orderedStatuses;
  }, [clientsByStatus, statusOptions]);

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
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4 animate-fade-in pb-24">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

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
            {/* Status Header with Navigation */}
            <div className="flex items-center justify-between gap-2 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevPage}
                disabled={currentPageIndex === 0}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex-1 text-center">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  {currentStatus}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {currentClients.length} client{currentClients.length !== 1 ? 's' : ''} • Page {currentPageIndex + 1} of {activeStatuses.length}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextPage}
                disabled={currentPageIndex === activeStatuses.length - 1}
                className="shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Page Indicator Dots */}
            <div className="flex justify-center gap-1.5 py-2">
              {activeStatuses.map((status, idx) => (
                <button
                  key={status}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentPageIndex 
                      ? "bg-primary w-4" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  aria-label={`Go to ${status}`}
                />
              ))}
            </div>

            {/* Client Cards with Swipe */}
            <Card className="shadow-soft overflow-hidden">
              <CardContent 
                ref={containerRef}
                className="p-4"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {currentClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No clients in this category
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
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

            {/* Swipe Hint */}
            <p className="text-xs text-muted-foreground text-center">
              ← Swipe left or right to change category →
            </p>
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