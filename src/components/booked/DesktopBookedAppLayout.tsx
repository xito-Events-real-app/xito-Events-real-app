import { ReactNode, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopBookedSidebar, HotDatesSortOrder } from "./DesktopBookedSidebar";
import { DesktopBookedDashboard } from "./DesktopBookedDashboard";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { fullResyncAllBookedClients, BookedClientData } from "@/lib/sheets-api";
import { parseEventDetails, NEPALI_MONTHS } from "@/lib/nepali-months";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";

export function DesktopBookedAppLayout() {
  const navigate = useNavigate();
  
  // Use cached data hook for faster loading
  const { 
    clients, 
    isLoading, 
    isFromCache, 
    isSyncing, 
    lastSyncedAt, 
    refreshData,
    error 
  } = useBookedCachedData();
  
  const [isFullResyncing, setIsFullResyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedHotDate, setSelectedHotDate] = useState<string | null>(null);
  
  // Hot Dates filter state
  const [hotDatesSortOrder, setHotDatesSortOrder] = useState<HotDatesSortOrder>('popularity');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const handleSync = async () => {
    await refreshData();
  };

  const handleFullResync = async () => {
    try {
      setIsFullResyncing(true);
      // Force sync to always copy ALL data from Client Tracker to Booked Clients
      const result = await fullResyncAllBookedClients(true);
      
      const messages: string[] = [];
      if (result.copiedCount > 0) {
        messages.push(`Found & copied ${result.copiedCount} missing booked clients`);
      }
      if (result.syncedCount > 0) {
        messages.push(`Updated ${result.syncedCount} existing clients`);
      }
      
      if (messages.length > 0) {
        toast.success(messages.join('. '));
      } else {
        toast.info("All booked clients are already synchronized");
      }
      
      await refreshData();
    } catch (error) {
      console.error("Error performing full resync:", error);
      toast.error("Failed to perform full resync");
    } finally {
      setIsFullResyncing(false);
    }
  };

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

  // Compute unique clients list for dropdown
  const uniqueClients = useMemo(() => {
    const seen = new Map<string, { name: string; registeredDateTimeAD: string }>();
    clients.forEach(c => {
      const key = c.clientName?.toLowerCase() || '';
      if (c.clientName && !seen.has(key)) {
        seen.set(key, {
          name: c.clientName,
          registeredDateTimeAD: c.registeredDateTimeAD || ''
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  // Filter clients based on hot date
  const filteredClients = useMemo(() => {
    let result = clients;
    
    // Hot date filter
    if (selectedHotDate) {
      const [hYear, hMonth, hDay] = selectedHotDate.split('-').map(Number);
      
      result = result.filter(client => {
        const events = parseEventDetails(
          client.events || '',
          client.eventYear || '',
          client.eventMonth || '',
          client.eventDay || ''
        );
        
        return events.some(event => {
          const y = parseInt(event.year) || 0;
          const m = parseInt(event.month) || 0;
          const d = parseInt(event.day) || 0;
          return y === hYear && m === hMonth && d === hDay;
        });
      });
    }
    
    return result;
  }, [clients, selectedHotDate]);

  // Calculate available months from clients data for filter dropdown
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    clients.forEach(client => {
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );
      events.forEach(event => {
        if (event.year && event.month) {
          monthSet.add(`${event.year}-${event.month}`);
        }
      });
    });
    return Array.from(monthSet)
      .map(v => {
        const [year, month] = v.split('-');
        const monthNum = parseInt(month);
        return { 
          value: v, 
          label: `${NEPALI_MONTHS[monthNum] || `Month ${monthNum}`} ${year}` 
        };
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [clients]);

  // Check if any filter is active
  const hasActiveFilter = selectedCategory !== null || selectedHotDate !== null;

  const handleClearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedHotDate(null);
    setSelectedMonth(null);
  };

  const totalClients = clients.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Sync Status Indicator */}
      <SyncStatusIndicator 
        pendingSyncs={0}
        isSyncing={isSyncing || isFullResyncing}
        isFromCache={isFromCache}
        lastSyncedAt={lastSyncedAt}
        isOnline={isOnline}
      />

      {/* Sidebar */}
      <DesktopBookedSidebar
        totalClients={totalClients}
        selectedCategory={selectedCategory}
        onCategoryFilter={setSelectedCategory}
        hotDatesSortOrder={hotDatesSortOrder}
        onSortChange={setHotDatesSortOrder}
        selectedMonth={selectedMonth}
        onMonthFilter={setSelectedMonth}
        availableMonths={availableMonths}
      />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Booked Clients Dashboard</h1>
            
            {/* Active Filters */}
            {hasActiveFilter && (
              <div className="flex items-center gap-2">
                {selectedHotDate && (
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                    Date: {selectedHotDate}
                    <button onClick={() => setSelectedHotDate(null)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="outline" className="gap-1 border-purple-500 text-purple-600">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory(null)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearAllFilters} className="text-xs h-7">
                  Clear All
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleFullResync} 
              disabled={isFullResyncing}
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-600/10"
            >
              {isFullResyncing ? (
                <>
                  <Database className="h-4 w-4 mr-2 animate-pulse" />
                  Syncing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Full Resync
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSync} 
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="bg-muted/30 min-h-[calc(100vh-56px)]">
          <DesktopBookedDashboard
            clients={filteredClients}
            isLoading={isLoading}
            onSync={handleSync}
            isSyncing={isSyncing}
            hasActiveFilter={hasActiveFilter}
            selectedCategory={selectedCategory}
            selectedHotDate={selectedHotDate}
            onHotDateFilter={setSelectedHotDate}
            onClearCategory={() => setSelectedCategory(null)}
            onClearHotDate={() => setSelectedHotDate(null)}
            onClearAllFilters={handleClearAllFilters}
            hotDatesSortOrder={hotDatesSortOrder}
            selectedMonth={selectedMonth}
            allClients={uniqueClients}
          />
        </main>
      </div>
    </div>
  );
}
