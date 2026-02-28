import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCurrentStatus, DropdownData } from "@/lib/sheets-api";
import { CalendarDayPopup, CalendarClientInfo } from "@/components/shared/CalendarDayPopup";
import { useBulkEventDetails } from "@/hooks/useBulkEventDetails";
import { parseEventDetails, getMonthName, NEPALI_MONTHS } from "@/lib/nepali-months";
import { isBSDatePast } from "@/lib/nepali-date";
import { DesktopClientRow } from "./DesktopClientRow";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import { getStatusConfig, sortCategoriesByOrder, normalizeStatus } from "@/lib/status-config";
import {
  Users,
  CalendarPlus,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  CheckCircle,
  Flame,
  Calendar,
  Snowflake,
} from "lucide-react";

interface DesktopDashboardProps {
  clients: any[];
  allClients?: any[];
  handlers: string[];
  handlerCounts: Record<string, number>;
  isLoading: boolean;
  onSync: () => void;
  isSyncing: boolean;
  hasActiveFilter?: boolean;
  selectedHandler?: string | null;
  selectedCategory?: string | null;
  selectedHotDate?: string | null;
  onClearHandler?: () => void;
  onClearCategory?: () => void;
  onHotDateFilter?: (dateKey: string | null) => void;
  onClearHotDate?: () => void;
  onClearAllFilters?: () => void;
  dropdowns?: DropdownData;
  onClientUpdate?: (updatedClient: any) => void;
}

// Handler avatar colors
const handlerColors = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-yellow-600',
];

// Event colors for variety
const eventColors = [
  'border-l-emerald-500 bg-emerald-500/5',
  'border-l-blue-500 bg-blue-500/5',
  'border-l-purple-500 bg-purple-500/5',
  'border-l-amber-500 bg-amber-500/5',
  'border-l-pink-500 bg-pink-500/5',
];

export function DesktopDashboard({
  clients,
  allClients,
  handlers,
  handlerCounts,
  isLoading,
  onSync,
  isSyncing,
  hasActiveFilter = false,
  selectedHandler,
  selectedCategory,
  selectedHotDate,
  onClearHandler,
  onClearCategory,
  onHotDateFilter,
  onClearHotDate,
  onClearAllFilters,
  dropdowns,
  onClientUpdate,
}: DesktopDashboardProps) {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showAllOpenDates, setShowAllOpenDates] = useState(false);
  const [showColdDates, setShowColdDates] = useState(false);
  const [hoveredCalDay, setHoveredCalDay] = useState<string | null>(null);

  // Sort clients so BOOKED clients appear first
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const statusA = getCurrentStatus(a.statusLog || '').toUpperCase();
      const statusB = getCurrentStatus(b.statusLog || '').toUpperCase();
      
      const isBookedA = statusA.includes('BOOKED') && !statusA.includes('BOOKED SOMEWHERE ELSE');
      const isBookedB = statusB.includes('BOOKED') && !statusB.includes('BOOKED SOMEWHERE ELSE');
      
      if (isBookedA && !isBookedB) return -1;
      if (!isBookedA && isBookedB) return 1;
      return 0;
    });
  }, [clients]);

  // Use allClients for stats if available, otherwise use filtered clients
  const statsClients = allClients || clients;

  // Fetch bulk event details for venue data (booked clients only)
  const bookedClientIds = useMemo(
    () => statsClients
      .filter(c => {
        const status = getCurrentStatus(c.statusLog || '').toUpperCase();
        return status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE');
      })
      .map(c => c.registeredDateTimeAD)
      .filter(Boolean) as string[],
    [statsClients]
  );
  const { eventDetailsMap } = useBulkEventDetails(bookedClientIds);

  // Calculate stats from ALL clients (not filtered)
  const totalClients = statsClients.length;
  // Use local date for Nepal timezone (not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todaysClients = statsClients.filter(c => c.inquiryDateAD?.startsWith(today));
  
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthClients = statsClients.filter(c => {
    const month = parseInt(c.eventMonth || "0");
    return month === currentMonth || month === currentMonth + 1;
  }).length;

  // Group clients by status (from ALL clients for stats)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    statsClients.forEach(client => {
      const rawStatus = getCurrentStatus(client.statusLog || '').toUpperCase();
      const status = normalizeStatus(rawStatus);
      if (status !== 'UNTOUCHED') {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    return counts;
  }, [statsClients]);

  // Get ordered categories with counts (sorted by canonical order)
  const categoryStats = useMemo(() => {
    const stats: { status: string; count: number; config: ReturnType<typeof getStatusConfig> }[] = [];
    Object.keys(statusCounts).forEach(status => {
      if (status !== 'UNTOUCHED') {
        stats.push({
          status,
          count: statusCounts[status],
          config: getStatusConfig(status)
        });
      }
    });
    return sortCategoriesByOrder(stats);
  }, [statusCounts]);

  // Urgent booked clients (events in ≤7 days) - from ALL clients
  const urgentBookedClients = useMemo(() => {
    const now = new Date();
    return statsClients
      .filter(client => {
        const status = getCurrentStatus(client.statusLog || '').toUpperCase();
        if (!status.includes('BOOKED')) return false;
        const eventDateAD = client.eventDateAD;
        if (!eventDateAD) return false;
        try {
          const dateParts = eventDateAD.split('-');
          if (dateParts.length < 3) return false;
          const eventDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const diffMs = eventDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        } catch {
          return false;
        }
      })
      .map(client => {
        const dateParts = client.eventDateAD!.split('-');
        const eventDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        const diffMs = eventDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { ...client, daysRemaining };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [statsClients]);

  // Booked count for stats card
  const booked = Object.keys(statusCounts).filter(s => s.includes('BOOKED') && !s.includes('BOOKED SOMEWHERE ELSE')).reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

  // Hot Dates calculation - group by event date, categorize by status
  const hotDates = useMemo(() => {
    const ENQUIRY_ON_STATUSES = [
      'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
      'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
    ];
    
    const GONE_ELSEWHERE_STATUSES = [
      'CANCELLED BY CLIENT', 'CANCELLED BY US', 'BOOKED SOMEWHERE ELSE'
    ];

    const dateGroups: Record<string, {
      dateKey: string;
      year: string;
      month: string;
      monthName: string;
      day: string;
      booked: { clientName: string; eventName: string }[];
      enquiryOn: { clientName: string; eventName: string }[];
      goneElsewhere: { clientName: string; eventName: string }[];
    }> = {};

    statsClients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );

      events.forEach(event => {
        if (!event.year || !event.month || !event.day) return;
        if (isBSDatePast(event.year, event.month, event.day)) return;
        
        const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
        
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            dateKey,
            year: event.year,
            month: event.month,
            monthName: event.monthName,
            day: event.day,
            booked: [],
            enquiryOn: [],
            goneElsewhere: []
          };
        }

        const entry = { clientName: client.clientName || 'Unknown', eventName: event.eventName || 'Event' };

        // Categorize by status
        if (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE')) {
          dateGroups[dateKey].booked.push(entry);
        } else if (GONE_ELSEWHERE_STATUSES.some(s => status.includes(s))) {
          dateGroups[dateKey].goneElsewhere.push(entry);
        } else if (ENQUIRY_ON_STATUSES.some(s => status.includes(s))) {
          dateGroups[dateKey].enquiryOn.push(entry);
        }
      });
    });

    // Sort by total count (hottest dates first), take top 6
    return Object.values(dateGroups)
      .map(d => ({
        ...d,
        totalCount: d.booked.length + d.enquiryOn.length + d.goneElsewhere.length
      }))
      .filter(d => d.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 6);
  }, [statsClients]);

  // Cold Dates calculation - dates with enquiries but ZERO bookings
  const coldDates = useMemo(() => {
    const ENQUIRY_ON_STATUSES = [
      'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
      'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
    ];

    const dateMap: Record<string, {
      dateKey: string;
      year: string;
      month: string;
      monthName: string;
      day: string;
      bookedCount: number;
      enquiringClients: Array<{
        clientName: string;
        eventName: string;
        status: string;
        statusShort: string;
        handler: string;
        handlerInitials: string;
        id: string;
      }>;
    }> = {};

    statsClients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );

      events.forEach(event => {
        if (!event.year || !event.month || !event.day) return;
        if (isBSDatePast(event.year, event.month, event.day)) return;
        
        const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
        
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = {
            dateKey,
            year: event.year,
            month: event.month,
            monthName: event.monthName,
            day: event.day,
            bookedCount: 0,
            enquiringClients: []
          };
        }

        // Count booked clients
        if (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE')) {
          dateMap[dateKey].bookedCount++;
        }
        
        // Track enquiring clients
        if (ENQUIRY_ON_STATUSES.some(s => status.includes(s))) {
          const handler = client.clientHandler || client.whoAdded || '';
          dateMap[dateKey].enquiringClients.push({
            clientName: client.clientName || 'Unknown',
            eventName: event.eventName || 'Event',
            status: status,
            statusShort: status.split(' ')[0],
            handler: handler,
            handlerInitials: handler.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            id: client.registeredDateTimeAD || client.rowNumber?.toString() || ''
          });
        }
      });
    });

    // Filter to only dates with ZERO booked and at least 1 enquiring
    // Sort by nearest month first, then by enquiry count
    return Object.values(dateMap)
      .filter(d => d.bookedCount === 0 && d.enquiringClients.length > 0)
      .sort((a, b) => {
        // Push ** dates to the end
        const aIsUnknown = a.day.includes('*');
        const bIsUnknown = b.day.includes('*');
        if (aIsUnknown && !bIsUnknown) return 1;
        if (!aIsUnknown && bIsUnknown) return -1;
        
        // Sort by year first (2082 before 2083)
        const yearDiff = parseInt(a.year) - parseInt(b.year);
        if (yearDiff !== 0) return yearDiff;
        
        // Then by month, then by day
        const monthDiff = parseInt(a.month) - parseInt(b.month);
        if (monthDiff !== 0) return monthDiff;
        
        return parseInt(a.day) - parseInt(b.day);
      });
  }, [statsClients]);

  // Unified Calendar Data - All days with open/booked status, event counts, and ADVANCE PENDING counts
  const calendarData = useMemo(() => {
    const bookedMap = new Map<string, number>();
    const advancePendingMap = new Map<string, number>();
    const clientDetailsMap = new Map<string, CalendarClientInfo[]>();
    const unknownDayMap = new Map<string, CalendarClientInfo[]>();
    
    statsClients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );
      
      events.forEach(event => {
        if (!event.year || !event.month) return;
        const isUnknownDay = !event.day || event.day === '**' || String(event.day).startsWith('**');
        const isBooked = status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE');
        const isAdvancePending = status.includes('ADVANCE PENDING');

        if (isUnknownDay) {
          if (isBooked || isAdvancePending) {
            const monthKey = `${event.year}-${event.month}`;
            if (!unknownDayMap.has(monthKey)) unknownDayMap.set(monthKey, []);
            const clientEventDetails = client.registeredDateTimeAD ? eventDetailsMap[client.registeredDateTimeAD] : undefined;
            const matchingDetail = clientEventDetails?.find(d => d.eventName === event.eventName);
            unknownDayMap.get(monthKey)!.push({
              clientName: client.clientName || 'Unknown',
              eventName: event.eventName || 'Event',
              registeredDateTimeAD: client.registeredDateTimeAD,
              originalRowNumber: client.rowNumber,
              contactNo: client.contactNo,
              whatsappNo: client.whatsappNo,
              eventLocation: client.eventLocation,
              eventCity: client.eventCity,
              venueName: matchingDetail?.venueName || '',
              venueArea: matchingDetail?.venueArea || '',
            });
          }
        } else {
          const dateKey = `${event.year}-${event.month}-${event.day}`;
          
          if (isBooked) {
            bookedMap.set(dateKey, (bookedMap.get(dateKey) || 0) + 1);
            
            if (!clientDetailsMap.has(dateKey)) clientDetailsMap.set(dateKey, []);
            const clientEventDetails = client.registeredDateTimeAD ? eventDetailsMap[client.registeredDateTimeAD] : undefined;
            const matchingDetail = clientEventDetails?.find(d => d.eventName === event.eventName);
            
            clientDetailsMap.get(dateKey)!.push({
              clientName: client.clientName || 'Unknown',
              eventName: event.eventName || 'Event',
              registeredDateTimeAD: client.registeredDateTimeAD,
              originalRowNumber: client.rowNumber,
              contactNo: client.contactNo,
              whatsappNo: client.whatsappNo,
              eventLocation: client.eventLocation,
              eventCity: client.eventCity,
              venueName: matchingDetail?.venueName || '',
              venueArea: matchingDetail?.venueArea || '',
            });
          } else if (isAdvancePending) {
            advancePendingMap.set(dateKey, (advancePendingMap.get(dateKey) || 0) + 1);
          }
        }
      });
    });
    
    // Days per Nepali month (approximate - varies by year)
    const daysPerMonth: Record<number, number> = {
      1: 31, 2: 31, 3: 32, 4: 32, 5: 31, 6: 31,
      7: 30, 8: 29, 9: 30, 10: 29, 11: 30, 12: 30
    };
    
    const startMonth = 10; // MAGH
    const startYear = 2082;
    
    const result: { 
      month: number; 
      year: number; 
      monthName: string; 
      days: { day: number; isBooked: boolean; eventCount: number; advancePendingCount: number; clients: CalendarClientInfo[] }[];
      bookedCount: number;
      unknownDayClients: CalendarClientInfo[];
    }[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthNum = ((startMonth - 1 + i) % 12) + 1;
      const yearNum = startYear + Math.floor((startMonth - 1 + i) / 12);
      const monthName = NEPALI_MONTHS[monthNum];
      const daysInMonth = daysPerMonth[monthNum] || 30;
      
      const days: { day: number; isBooked: boolean; eventCount: number; advancePendingCount: number; clients: CalendarClientInfo[] }[] = [];
      let bookedCount = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${yearNum}-${monthNum}-${day}`;
        const eventCount = bookedMap.get(dateKey) || 0;
        const advancePendingCount = advancePendingMap.get(dateKey) || 0;
        const isBooked = eventCount > 0;
        if (isBooked) bookedCount++;
        days.push({ day, isBooked, eventCount, advancePendingCount, clients: clientDetailsMap.get(dateKey) || [] });
      }
      
      const monthKey = `${yearNum}-${monthNum}`;
      result.push({ month: monthNum, year: yearNum, monthName, days, bookedCount, unknownDayClients: unknownDayMap.get(monthKey) || [] });
    }
    
    return result;
  }, [statsClients, eventDetailsMap]);

  return (
    <div className="p-6 space-y-6">
      {/* Filtered Results Table - Full screen when filters active */}
      {hasActiveFilter ? (
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b-2 border-primary/20">
                    <TableHead className="w-[200px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                      Client Info
                    </TableHead>
                    <TableHead className="w-[280px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Events & Dates
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-foreground uppercase tracking-wide text-xs py-4">
                      Category Details
                    </TableHead>
                    <TableHead className="font-bold text-foreground uppercase tracking-wide text-xs py-4 text-right w-[140px]">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium">No clients match the selected filters</p>
                          <Button variant="outline" size="sm" onClick={onClearAllFilters}>
                            Clear All Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedClients.map((client) => (
                      <DesktopClientRow
                        key={client.rowNumber}
                        client={client}
                        category={selectedCategory || getCurrentStatus(client.statusLog)}
                        handlers={handlers}
                        statuses={dropdowns?.clientStatuses || []}
                        mindsetOptions={dropdowns?.mindsetOptions || []}
                        paymentTypes={dropdowns?.paymentTypes || []}
                        banks={dropdowns?.banks || []}
                        onClientUpdate={onClientUpdate}
                        onOpenDetail={(c) => setSelectedClient(c)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        /* Normal Dashboard View - No Filters */
        <>
          {/* Compact Stats Row + Quick Actions */}
          <div className="flex items-center gap-4">
            {/* Compact Stats - inline flex */}
            <div className="flex gap-3 flex-1">
              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{isLoading ? "—" : totalClients}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-secondary flex items-center justify-center">
                    <CalendarPlus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{isLoading ? "—" : thisMonthClients}</p>
                    <p className="text-xs text-muted-foreground">This Month</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{isLoading ? "—" : todaysClients.length}</p>
                    <p className="text-xs text-muted-foreground">Today's Enquiries</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{isLoading ? "—" : booked}</p>
                    <p className="text-xs text-muted-foreground">Booked</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compact Quick Actions */}
            <div className="flex gap-2">
              <Link to="/client-tracker/quick-add">
                <Button size="sm" className="h-9 gradient-primary text-white">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Client
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm"
                className="h-9"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-1", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Sync"}
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="space-y-4">
            {/* Booking Calendar Section */}
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Booking Calendar</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      (Plain = Open, 
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[8px]">●</span> Booked,
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[8px]">●</span> Advance)
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-6"
                    onClick={() => setShowAllOpenDates(!showAllOpenDates)}
                  >
                    {showAllOpenDates ? "Show Less" : "View All Year"}
                    <ChevronRight className={cn("w-3 h-3 ml-1 transition-transform", showAllOpenDates && "rotate-90")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-2 space-y-1.5">
                {/* Unified Calendar View - All days shown */}
                {(showAllOpenDates ? calendarData : calendarData.slice(0, 4)).map((monthData) => (
                  <div 
                    key={`cal-${monthData.year}-${monthData.month}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border/50"
                  >
                    {/* Month Badge */}
                    <Badge className="bg-gradient-to-r from-blue-500 to-green-500 text-white text-xs min-w-[110px] justify-center shrink-0">
                      {monthData.monthName} {monthData.year}
                    </Badge>
                    
                    {/* Separator */}
                    <span className="text-muted-foreground font-medium">:</span>
                    
                    {/* All Days - Open as plain numbers, Booked as concentric circles */}
                    <div className="flex-1 flex flex-wrap gap-x-1 gap-y-1.5 min-w-0 items-center">
                      {monthData.days.map(({ day, isBooked, eventCount, advancePendingCount, clients: dayClients }) => {
                        const hasAdvancePending = advancePendingCount > 0;
                        const calDayKey = `${monthData.year}-${monthData.month}-${day}`;
                        
                        if (isBooked) {
                          // BOOKED: Concentric circles + optional yellow outer ring for advance pending
                          const totalRingSize = 20 + (eventCount - 1) * 8 + (hasAdvancePending ? 8 : 0);
                          return (
                            <div
                              key={day}
                              className="relative"
                              onMouseEnter={() => setHoveredCalDay(calDayKey)}
                              onMouseLeave={() => setHoveredCalDay(null)}
                            >
                              <button 
                                onClick={() => onHotDateFilter?.(calDayKey)}
                                className={cn(
                                  "relative inline-flex items-center justify-center cursor-pointer transition-all hover:scale-110",
                                  selectedHotDate === calDayKey
                                    ? "ring-2 ring-offset-2 ring-green-500 rounded-full"
                                    : ""
                                )}
                                style={{ 
                                  width: `${totalRingSize}px`,
                                  height: `${totalRingSize}px`
                                }}
                                title={`${eventCount} booked${hasAdvancePending ? ` + ${advancePendingCount} advance pending` : ''} on day ${day}`}
                              >
                                {/* Yellow outer ring for advance pending */}
                                {hasAdvancePending && (
                                  <span 
                                    className="absolute rounded-full border-2 border-amber-500"
                                    style={{ width: `${totalRingSize}px`, height: `${totalRingSize}px` }}
                                  />
                                )}
                                {/* Green outer rings for booked events */}
                                {Array.from({ length: eventCount - 1 }, (_, i) => {
                                  const ringIndex = eventCount - 1 - i;
                                  const size = 20 + ringIndex * 8;
                                  return (
                                    <span 
                                      key={ringIndex}
                                      className="absolute rounded-full border-2 border-green-500"
                                      style={{ width: `${size}px`, height: `${size}px` }}
                                    />
                                  );
                                })}
                                {/* Inner filled circle with day number */}
                                <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold z-10">
                                  {day}
                                </span>
                              </button>
                              
                              {/* Floating Bubble Popup */}
                              {hoveredCalDay === calDayKey && dayClients.length > 0 && (
                                <CalendarDayPopup
                                  monthName={monthData.monthName}
                                  day={day}
                                  year={monthData.year}
                                  clients={dayClients}
                                />
                              )}
                            </div>
                          );
                        } else if (hasAdvancePending) {
                          // ADVANCE PENDING ONLY: Yellow text/circle
                          return (
                            <button 
                              key={day}
                              onClick={() => onHotDateFilter?.(calDayKey)}
                              className={cn(
                                "w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold",
                                "cursor-pointer rounded-full transition-all",
                                "text-amber-600 bg-amber-500/20 hover:bg-amber-500/30",
                                selectedHotDate === calDayKey
                                  ? "ring-2 ring-amber-500 bg-amber-500/30"
                                  : ""
                              )}
                              title={`${advancePendingCount} advance pending on day ${day}`}
                            >
                              {day}
                            </button>
                          );
                        } else {
                          // OPEN: Plain number
                          return (
                            <button 
                              key={day}
                              onClick={() => onHotDateFilter?.(calDayKey)}
                              className={cn(
                                "w-5 h-5 flex items-center justify-center font-mono text-[10px] text-muted-foreground",
                                "cursor-pointer hover:text-foreground hover:bg-muted rounded transition-all",
                                selectedHotDate === calDayKey
                                  ? "ring-2 ring-primary bg-primary/10 text-foreground"
                                  : ""
                              )}
                              title={`Day ${day} - Click to filter`}
                            >
                              {day}
                            </button>
                          );
                        }
                      })}
                      
                      {/* Unknown day (**) events */}
                      {monthData.unknownDayClients.length > 0 && (
                        <div className="relative ml-1">
                          <span 
                            className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] font-bold cursor-default"
                            title={`${monthData.unknownDayClients.length} events with unknown date: ${monthData.unknownDayClients.map(c => c.clientName).join(', ')}`}
                          >
                            **
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Booked Count Badge */}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs shrink-0",
                        monthData.bookedCount > 0 
                          ? "border-green-500 text-green-600" 
                          : "text-muted-foreground"
                      )}
                    >
                      {monthData.bookedCount} booked
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Full Width Content */}
            <div className="space-y-4">
              {/* Hot Dates / Cold Dates Section */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={showColdDates ? "ghost" : "default"}
                        size="sm" 
                        className={cn(
                          "transition-all",
                          !showColdDates && "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                        )}
                        onClick={() => setShowColdDates(false)}
                      >
                        <Flame className="w-4 h-4 mr-1" />
                        Hot Dates
                        <Badge variant="secondary" className="ml-2 bg-white/20">{hotDates.length}</Badge>
                      </Button>
                      <Button 
                        variant={showColdDates ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "transition-all",
                          showColdDates && "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
                        )}
                        onClick={() => setShowColdDates(true)}
                      >
                        <Snowflake className="w-4 h-4 mr-1" />
                        Cold Dates
                        <Badge variant="secondary" className="ml-2 bg-white/20">{coldDates.length}</Badge>
                      </Button>
                    </div>
                    {!showColdDates && (
                      <Link to="/client-tracker/hot-dates">
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          View All
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {showColdDates ? (
                    /* Cold Dates Grid - Show ALL dates */
                    coldDates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No cold dates found - all enquiry dates have bookings! 🎉
                      </p>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 pr-4">
                          {coldDates.map((dateInfo) => (
                            <div
                              key={dateInfo.dateKey}
                              className="border rounded-lg p-3 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 hover:border-cyan-500/50 transition-colors"
                            >
                              {/* Cold Date Header */}
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/20">
                                <Snowflake className="w-4 h-4 text-cyan-500" />
                                <span className="text-sm font-bold text-cyan-700">{dateInfo.year}</span>
                                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                                  {dateInfo.monthName} {dateInfo.day}
                                </Badge>
                                <Badge variant="outline" className="ml-auto text-cyan-600 border-cyan-500/30">
                                  {dateInfo.enquiringClients.length}
                                </Badge>
                              </div>
                              
                              {/* Client List - ALL clients */}
                              <div className="space-y-1.5">
                                {dateInfo.enquiringClients.map((client, i) => (
                                  <Link 
                                    key={i}
                                    to={`/client-tracker/client/${client.id}`}
                                    className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2 rounded hover:bg-cyan-500/10 transition-colors group"
                                  >
                                    <span className="font-semibold text-sm text-foreground group-hover:text-cyan-600">
                                      {client.clientName}
                                    </span>
                                    <span className="text-xs text-amber-600">
                                      • {client.eventName}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 shrink-0 bg-slate-100">
                                      {client.status}
                                    </Badge>
                                    <span className="text-xs font-bold text-cyan-600">
                                      {client.handlerInitials}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )
                  ) : (
                    /* Hot Dates Grid */
                    hotDates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No event dates found
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-4">
                        {hotDates.map((dateInfo) => (
                          <button
                            key={dateInfo.dateKey}
                            onClick={() => onHotDateFilter?.(dateInfo.dateKey)}
                            className={cn(
                              "border rounded-lg p-3 transition-all text-left w-full",
                              selectedHotDate === dateInfo.dateKey
                                ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30"
                                : "hover:border-orange-500/50 hover:bg-orange-500/5"
                            )}
                          >
                            {/* Date Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
                                  {dateInfo.monthName} {dateInfo.day}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{dateInfo.year}</span>
                              </div>
                              <span className="text-lg font-bold">{dateInfo.totalCount}</span>
                            </div>

                            {/* Three Category Rows */}
                            <div className="space-y-2">
                              {/* BOOKED */}
                              <div className="flex items-start gap-2">
                                <Badge className="bg-green-500 text-white text-[10px] shrink-0 w-14 justify-center">
                                  BOOKED
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-green-600 text-sm">{dateInfo.booked.length}</span>
                                  {dateInfo.booked.slice(0, 2).map((c, i) => (
                                    <div key={i} className="text-[10px] text-muted-foreground truncate">
                                      {c.eventName} • {c.clientName}
                                    </div>
                                  ))}
                                  {dateInfo.booked.length > 2 && (
                                    <span className="text-[10px] text-green-500">
                                      +{dateInfo.booked.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* ENQUIRY ON */}
                              <div className="flex items-start gap-2">
                                <Badge className="bg-amber-500 text-white text-[10px] shrink-0 w-14 justify-center">
                                  ENQUIRY
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-amber-600 text-sm">{dateInfo.enquiryOn.length}</span>
                                  {dateInfo.enquiryOn.slice(0, 2).map((c, i) => (
                                    <div key={i} className="text-[10px] text-muted-foreground truncate">
                                      {c.eventName} • {c.clientName}
                                    </div>
                                  ))}
                                  {dateInfo.enquiryOn.length > 2 && (
                                    <span className="text-[10px] text-amber-500">
                                      +{dateInfo.enquiryOn.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* GONE ELSEWHERE */}
                              <div className="flex items-start gap-2">
                                <Badge className="bg-gray-500 text-white text-[10px] shrink-0 w-14 justify-center">
                                  GONE
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-gray-600 text-sm">{dateInfo.goneElsewhere.length}</span>
                                  {dateInfo.goneElsewhere.slice(0, 2).map((c, i) => (
                                    <div key={i} className="text-[10px] text-muted-foreground truncate">
                                      {c.eventName} • {c.clientName}
                                    </div>
                                  ))}
                                  {dateInfo.goneElsewhere.length > 2 && (
                                    <span className="text-[10px] text-gray-400">
                                      +{dateInfo.goneElsewhere.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Client Categories Grid */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Client Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {categoryStats.map(({ status, count, config }) => {
                      const Icon = config.icon;
                      return (
                        <div
                          key={status}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 cursor-pointer transition-all"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.color)}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-bold">{count}</p>
                            <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Urgent Events Table */}
              {urgentBookedClients.length > 0 && (
                <Card className="shadow-sm border-red-500/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <CardTitle className="text-base font-semibold text-red-500">
                        Urgent Events ({urgentBookedClients.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Days Left</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {urgentBookedClients.slice(0, 5).map((client) => (
                          <TableRow key={client.rowNumber}>
                            <TableCell className="font-medium">{client.clientName}</TableCell>
                            <TableCell>{client.events || "Event"}</TableCell>
                            <TableCell>{client.eventDateAD}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                client.daysRemaining <= 1 
                                  ? "bg-red-500/20 text-red-600" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {client.daysRemaining === 0 ? "TODAY" : `${client.daysRemaining} days`}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Today's Activity Summary - Full Width */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Today's Enquiries</CardTitle>
              </CardHeader>
              <CardContent>
                {todaysClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No enquiries today yet
                  </p>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {todaysClients.slice(0, 10).map((client, idx) => (
                      <div
                        key={client.rowNumber || idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.events || "No event"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {/* Client Detail Sheet */}
      <ClientDetailSheet
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onSave={(updatedClient) => setSelectedClient(updatedClient)}
      />
    </div>
  );
}
