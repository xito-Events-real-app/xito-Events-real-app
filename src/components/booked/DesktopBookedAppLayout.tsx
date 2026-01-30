import { ReactNode, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopBookedSidebar, HotDatesSortOrder } from "./DesktopBookedSidebar";
import { DesktopBookedDashboard } from "./DesktopBookedDashboard";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { fullResyncAllBookedClients, fullSyncEventDetails, cleanupDuplicateBookedFromTracker, BookedClientData, SyncDetail, getCurrentStatus } from "@/lib/sheets-api";
import { parseEventDetails, NEPALI_MONTHS } from "@/lib/nepali-months";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RefreshCw, Database, X, Calendar, CheckCircle, Copy, ArrowUpCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { useCachedData } from "@/hooks/useCachedData";
import { SyncReportSheet } from "./SyncReportSheet";

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
  
  // Also fetch tracker clients to show ADVANCE PENDING in calendar
  const { clients: trackerClients } = useCachedData();
  
  // Extract ADVANCE PENDING clients from tracker for calendar overlay
  const advancePendingClients = useMemo(() => {
    return trackerClients.filter(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      return status.includes('ADVANCE PENDING');
    });
  }, [trackerClients]);
  const [isFullResyncing, setIsFullResyncing] = useState(false);
  const [isEventDetailsSyncing, setIsEventDetailsSyncing] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Sync report state
  const [syncReportOpen, setSyncReportOpen] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    copiedCount: number;
    syncedCount: number;
    skippedCount: number;
    notFoundCount: number;
    totalBooked: number;
    syncDetails?: SyncDetail[];
  } | null>(null);
  
  // Event Details sync report state
  const [eventDetailsReportOpen, setEventDetailsReportOpen] = useState(false);
  const [eventDetailsReport, setEventDetailsReport] = useState<{
    copiedCount: number;
    updatedCount: number;
    totalEvents: number;
  } | null>(null);
  
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
      
      // Store report for display
      setSyncReport({
        copiedCount: result.copiedCount,
        syncedCount: result.syncedCount,
        skippedCount: result.skippedCount,
        notFoundCount: result.notFoundCount,
        totalBooked: result.totalBooked,
        syncDetails: result.syncDetails
      });
      
      // Show report sheet
      setSyncReportOpen(true);
      
      await refreshData();
    } catch (error) {
      console.error("Error performing full resync:", error);
      toast.error("Failed to perform full resync");
    } finally {
      setIsFullResyncing(false);
    }
  };

  const handleSyncEventDetails = async () => {
    try {
      setIsEventDetailsSyncing(true);
      const result = await fullSyncEventDetails();
      
      // Store report for display
      setEventDetailsReport({
        copiedCount: result.copiedCount,
        updatedCount: result.updatedCount,
        totalEvents: result.totalEvents
      });
      
      // Show report sheet
      setEventDetailsReportOpen(true);
      
      toast.success(`Event Details synced: ${result.copiedCount} new, ${result.updatedCount} updated`);
    } catch (error) {
      console.error("Error syncing event details:", error);
      toast.error("Failed to sync event details. Make sure the 'BOOKED CLIENTS EVENT DETAILS' sheet exists.");
    } finally {
      setIsEventDetailsSyncing(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      setIsCleaningUp(true);
      const result = await cleanupDuplicateBookedFromTracker();
      if (result.deletedCount > 0) {
        toast.success(`Cleaned up ${result.deletedCount} duplicate(s) from Client Tracker`);
      } else {
        toast.info("No duplicates found - Client Tracker is clean!");
      }
      await refreshData();
    } catch (error) {
      console.error("Error cleaning up duplicates:", error);
      toast.error("Failed to cleanup duplicates");
    } finally {
      setIsCleaningUp(false);
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

  // Compute unique clients list for dropdown - include originalRowNumber for reliable navigation
  const uniqueClients = useMemo(() => {
    const seen = new Map<string, { 
      name: string; 
      registeredDateTimeAD: string;
      originalRowNumber?: number;
    }>();
    clients.forEach(c => {
      const key = c.clientName?.toLowerCase() || '';
      if (c.clientName && !seen.has(key)) {
        seen.set(key, {
          name: c.clientName,
          registeredDateTimeAD: c.registeredDateTimeAD || '',
          originalRowNumber: c.originalRowNumber
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
              onClick={handleCleanupDuplicates} 
              disabled={isCleaningUp}
              className="border-red-600 text-red-600 hover:bg-red-600/10"
            >
              {isCleaningUp ? (
                <>
                  <Trash2 className="h-4 w-4 mr-2 animate-pulse" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cleanup Duplicates
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSyncEventDetails} 
              disabled={isEventDetailsSyncing}
              className="border-amber-600 text-amber-600 hover:bg-amber-600/10"
            >
              {isEventDetailsSyncing ? (
                <>
                  <Calendar className="h-4 w-4 mr-2 animate-pulse" />
                  Syncing...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Sync Event Details
                </>
              )}
            </Button>
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
            advancePendingClients={advancePendingClients}
          />
        </main>
      </div>
      
      {/* Sync Report Sheet */}
      <SyncReportSheet
        open={syncReportOpen}
        onOpenChange={setSyncReportOpen}
        report={syncReport}
      />
      
      {/* Event Details Sync Report Sheet */}
      <Sheet open={eventDetailsReportOpen} onOpenChange={setEventDetailsReportOpen}>
        <SheetContent className="w-[400px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Event Details Sync Report
            </SheetTitle>
            <SheetDescription>
              Synced client data to BOOKED CLIENTS EVENT DETAILS sheet
            </SheetDescription>
          </SheetHeader>
          
          {eventDetailsReport && (
            <div className="mt-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Copy className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-700">{eventDetailsReport.copiedCount}</span>
                  </div>
                  <p className="text-xs text-green-600">New Copied</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-700">{eventDetailsReport.updatedCount}</span>
                  </div>
                  <p className="text-xs text-blue-600">Updated</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-slate-600" />
                    <span className="text-2xl font-bold text-slate-700">{eventDetailsReport.totalEvents}</span>
                  </div>
                  <p className="text-xs text-slate-600">Total Booked</p>
                </div>
              </div>
              
              {/* Explanation */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">What was synced:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Columns A-C:</strong> Client ID, Registration Date BS, Client Name</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Columns D-H:</strong> Events, Year, Month, Day, Date AD</span>
                  </li>
                  <li className="flex items-start gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Columns J-AH:</strong> Preserved (user-entered venue, parlour, pre-shoot details)</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => setEventDetailsReportOpen(false)} 
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                Done
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
