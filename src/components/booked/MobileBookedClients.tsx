import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Calendar, Users, Bell, AlertTriangle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { migrateExistingBookedClients, fullResyncAllBookedClients, BookedClientData, SyncDetail } from "@/lib/sheets-api";
import EventClientCard from "./EventClientCard";
import NepaliDateFilter from "./NepaliDateFilter";
import { SyncReportSheet } from "./SyncReportSheet";
import { GlobalModeToggle } from "@/components/layout/GlobalModeToggle";
import NepaliDate from "nepali-date-converter";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";

const MobileBookedClients = () => {
  const navigate = useNavigate();
  
  // Use cached data hook for faster loading
  const { 
    clients, 
    isLoading, 
    isFromCache, 
    isSyncing, 
    refreshData 
  } = useBookedCachedData();
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [isFullResyncing, setIsFullResyncing] = useState(false);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  
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

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      const result = await migrateExistingBookedClients();
      toast.success(`Migrated ${result.migratedCount} clients`);
      await refreshData();
    } catch (error) {
      console.error("Error migrating clients:", error);
      toast.error("Failed to migrate clients");
    } finally {
      setIsMigrating(false);
    }
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

  // Calculate days until event
  const getDaysUntilEvent = (client: BookedClientData): number | null => {
    let eventDate: Date | null = null;
    
    if (client.eventDateAD) {
      const parsed = new Date(client.eventDateAD);
      if (!isNaN(parsed.getTime())) {
        eventDate = parsed;
      }
    }
    
    if (!eventDate && client.eventYear && client.eventMonth && client.eventDay) {
      try {
        const bsYear = parseInt(client.eventYear);
        const bsMonth = parseInt(client.eventMonth);
        const bsDay = parseInt(client.eventDay);
        
        if (!isNaN(bsYear) && !isNaN(bsMonth) && !isNaN(bsDay) && !client.eventDay.includes('*')) {
          const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
          const adDate = nepaliDate.toJsDate();
          if (adDate && !isNaN(adDate.getTime())) {
            eventDate = adDate;
          }
        }
      } catch (error) {
        console.error('Error converting Nepali date:', error);
      }
    }
    
    if (!eventDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Check for missing dates
  const hasMissingDate = (client: BookedClientData) => 
    !client.eventYear || !client.eventMonth || !client.eventDay || client.eventDay.includes('*');

  // Filter clients
  const filteredClients = clients.filter(client => {
    if (filterYear && client.eventYear !== filterYear.toString()) return false;
    if (filterMonth && client.eventMonth !== filterMonth.toString()) return false;
    return true;
  });

  // Sort by event date (closest first)
  const sortedClients = [...filteredClients].sort((a, b) => {
    const daysA = getDaysUntilEvent(a);
    const daysB = getDaysUntilEvent(b);
    if (daysA === null && daysB === null) return 0;
    if (daysA === null) return 1;
    if (daysB === null) return -1;
    return daysA - daysB;
  });

  // Stats
  const urgentClients = sortedClients.filter(c => { const d = getDaysUntilEvent(c); return d !== null && d >= 0 && d <= 7; });
  const upcomingClients = sortedClients.filter(c => { const d = getDaysUntilEvent(c); return d !== null && d > 7 && d <= 30; });
  const missingDateClients = clients.filter(hasMissingDate);

  const resetFilters = () => { setFilterYear(null); setFilterMonth(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <GlobalModeToggle />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Booked Events</h1>
              <p className="text-xs text-slate-400">{clients.length} confirmed bookings</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refreshData} disabled={isLoading || isSyncing} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-6">
        {isLoading ? (
          <div className="space-y-3 pt-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 bg-slate-800/50" />)}</div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                <CardContent className="p-2 text-center">
                  <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-300">{clients.length}</p>
                  <p className="text-[10px] text-blue-400">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
                <CardContent className="p-2 text-center">
                  <Bell className="h-4 w-4 text-red-400 mx-auto mb-1 animate-pulse" />
                  <p className="text-lg font-bold text-red-300">{urgentClients.length}</p>
                  <p className="text-[10px] text-red-400">Urgent</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
                <CardContent className="p-2 text-center">
                  <Calendar className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-orange-300">{upcomingClients.length}</p>
                  <p className="text-[10px] text-orange-400">Upcoming</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
                <CardContent className="p-2 text-center">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-300">{missingDateClients.length}</p>
                  <p className="text-[10px] text-amber-400">No Date</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-3">
                <NepaliDateFilter selectedYear={filterYear} selectedMonth={filterMonth} onYearChange={setFilterYear} onMonthChange={setFilterMonth} onReset={resetFilters} />
              </CardContent>
            </Card>

            {/* Sync buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFullResync} 
                disabled={isFullResyncing} 
                className="flex-1 border-emerald-600 text-emerald-400"
              >
                {isFullResyncing ? (
                  <>
                    <Database className="h-4 w-4 mr-1 animate-pulse" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-1" />
                    Full Resync
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleMigrate} disabled={isMigrating} className="flex-1">
                {isMigrating ? "Migrating..." : "Migrate New"}
              </Button>
            </div>

            {/* Client List */}
            <div className="space-y-3">
              {sortedClients.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="py-8 text-center">
                    <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No events found</p>
                  </CardContent>
                </Card>
              ) : (
                sortedClients.map((client) => <EventClientCard key={client.bookedRowNumber} client={client} />)
              )}
            </div>
          </div>
        )}
      </ScrollArea>
      
      {/* Sync Report Sheet */}
      <SyncReportSheet
        open={syncReportOpen}
        onOpenChange={setSyncReportOpen}
        report={syncReport}
      />
    </div>
  );
};

export default MobileBookedClients;
