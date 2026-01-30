import { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { openWhatsApp } from "@/lib/whatsapp-utils";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { parseEventDetails, NEPALI_MONTHS } from "@/lib/nepali-months";
import { isBSDatePast } from "@/lib/nepali-date";
import { getBookingDate, getRelativeTime } from "@/lib/client-card-utils";
import { getClientDetailPath } from "@/lib/client-navigation";
import {
  Users,
  Calendar,
  Clock,
  Flame,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Phone,
  MessageCircle,
  CalendarDays,
} from "lucide-react";
import NepaliDate from "nepali-date-converter";
import { BookedClientData, ClientData } from "@/lib/sheets-api";

interface AdvancePendingClient {
  events?: string;
  eventYear?: string;
  eventMonth?: string;
  eventDay?: string;
}

interface DesktopBookedDashboardProps {
  clients: BookedClientData[];
  isLoading: boolean;
  onSync: () => void;
  isSyncing: boolean;
  hasActiveFilter?: boolean;
  selectedCategory?: string | null;
  selectedHotDate?: string | null;
  onHotDateFilter?: (dateKey: string | null) => void;
  onClearCategory?: () => void;
  onClearHotDate?: () => void;
  onClearAllFilters?: () => void;
  // Hot Dates filter props
  hotDatesSortOrder?: 'ascending' | 'descending' | 'popularity';
  selectedMonth?: string | null;
  // Client-wise view - includes originalRowNumber for reliable navigation
  allClients?: { name: string; registeredDateTimeAD: string; originalRowNumber?: number }[];
  // ADVANCE PENDING clients from tracker for calendar overlay
  advancePendingClients?: AdvancePendingClient[];
}

export function DesktopBookedDashboard({
  clients,
  isLoading,
  onSync,
  isSyncing,
  hasActiveFilter = false,
  selectedCategory,
  selectedHotDate,
  onHotDateFilter,
  onClearCategory,
  onClearHotDate,
  onClearAllFilters,
  hotDatesSortOrder = 'popularity',
  selectedMonth,
  allClients = [],
  advancePendingClients = [],
}: DesktopBookedDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAllOpenDates, setShowAllOpenDates] = useState(false);
  const [showClientWise, setShowClientWise] = useState(false);

  // Total unique clients
  const uniqueClientCount = useMemo(() => {
    return new Set(clients.map(c => c.clientName?.toLowerCase().trim())).size;
  }, [clients]);

  // Calculate all events with dates for remaining/total calculation
  const eventStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalEvents = 0;
    let remainingEvents = 0;
    
    clients.forEach(client => {
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );
      
      events.forEach(event => {
        if (event.year && event.month && event.day && !event.day.includes('*')) {
          totalEvents++;
          
          try {
            const bsYear = parseInt(event.year);
            const bsMonth = parseInt(event.month);
            const bsDay = parseInt(event.day);
            
            if (!isNaN(bsYear) && !isNaN(bsMonth) && !isNaN(bsDay)) {
              const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
              const eventDate = nepaliDate.toJsDate();
              eventDate.setHours(0, 0, 0, 0);
              
              if (eventDate >= today) {
                remainingEvents++;
              }
            }
          } catch (e) {
            // If conversion fails, count as remaining
            remainingEvents++;
          }
        }
      });
    });
    
    return { total: totalEvents, remaining: remainingEvents };
  }, [clients]);

  // Find last booking date
  const lastBookingInfo = useMemo(() => {
    let latestDate: Date | null = null;
    
    clients.forEach(client => {
      const bookingDate = getBookingDate(client.statusLog);
      if (bookingDate) {
        if (!latestDate || bookingDate > latestDate) {
          latestDate = bookingDate;
        }
      }
    });
    
    return latestDate ? getRelativeTime(latestDate) : 'N/A';
  }, [clients]);

  // Find next upcoming event
  const nextEventInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let soonestEvent: { 
      clientName: string; 
      eventName: string; 
      dateDisplay: string; 
      daysRemaining: number;
    } | null = null;
    
    clients.forEach(client => {
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );
      
      events.forEach(event => {
        if (event.year && event.month && event.day && !event.day.includes('*')) {
          try {
            const bsYear = parseInt(event.year);
            const bsMonth = parseInt(event.month);
            const bsDay = parseInt(event.day);
            
            if (!isNaN(bsYear) && !isNaN(bsMonth) && !isNaN(bsDay)) {
              const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
              const eventDate = nepaliDate.toJsDate();
              eventDate.setHours(0, 0, 0, 0);
              
              if (eventDate >= today) {
                const daysRemaining = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (!soonestEvent || daysRemaining < soonestEvent.daysRemaining) {
                  soonestEvent = {
                    clientName: client.clientName || 'Unknown',
                    eventName: event.eventName || 'Event',
                    dateDisplay: `${event.monthName} ${event.day}`,
                    daysRemaining,
                  };
                }
              }
            }
          } catch (e) {}
        }
      });
    });
    
    return soonestEvent;
  }, [clients]);

  // Hot Dates - Booked only (no enquiry/gone) - includes client IDs for navigation
  const hotDates = useMemo(() => {
    const dateGroups: Record<string, {
      dateKey: string;
      year: string;
      month: string;
      monthName: string;
      day: string;
      events: { clientName: string; eventName: string; originalRowNumber?: number; registeredDateTimeAD?: string }[];
      isCompleted: boolean;
    }> = {};

    clients.forEach(client => {
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );

      events.forEach(event => {
        if (!event.year || !event.month || !event.day) return;
        
        const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
        
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            dateKey,
            year: event.year,
            month: event.month,
            monthName: event.monthName,
            day: event.day,
            events: [],
            isCompleted: isBSDatePast(event.year, event.month, event.day)
          };
        }

        // Store client IDs directly to avoid re-lookup
        dateGroups[dateKey].events.push({ 
          clientName: client.clientName || 'Unknown', 
          eventName: event.eventName || 'Event',
          originalRowNumber: client.originalRowNumber,
          registeredDateTimeAD: client.registeredDateTimeAD
        });
      });
    });

    let result = Object.values(dateGroups).filter(d => d.events.length > 0);
    
    // Apply month filter
    if (selectedMonth) {
      const [filterYear, filterMonth] = selectedMonth.split('-');
      result = result.filter(d => d.year === filterYear && d.month === filterMonth);
    }
    
    // Apply sort order
    if (hotDatesSortOrder === 'ascending') {
      result.sort((a, b) => {
        const dateA = `${a.year}-${a.month.padStart(2, '0')}-${a.day.padStart(2, '0')}`;
        const dateB = `${b.year}-${b.month.padStart(2, '0')}-${b.day.padStart(2, '0')}`;
        return dateA.localeCompare(dateB);
      });
    } else if (hotDatesSortOrder === 'descending') {
      result.sort((a, b) => {
        const dateA = `${a.year}-${a.month.padStart(2, '0')}-${a.day.padStart(2, '0')}`;
        const dateB = `${b.year}-${b.month.padStart(2, '0')}-${b.day.padStart(2, '0')}`;
        return dateB.localeCompare(dateA);
      });
    } else {
      result.sort((a, b) => b.events.length - a.events.length);
    }
    
    return result;
  }, [clients, hotDatesSortOrder, selectedMonth]);

  // Calendar Data - booked clients + advance pending from tracker
  const calendarData = useMemo(() => {
    const bookedMap = new Map<string, number>();
    const advancePendingMap = new Map<string, number>();
    
    // Count booked events
    clients.forEach(client => {
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );
      
      events.forEach(event => {
        if (event.year && event.month && event.day && event.day !== '**') {
          const dateKey = `${event.year}-${event.month}-${event.day}`;
          bookedMap.set(dateKey, (bookedMap.get(dateKey) || 0) + 1);
        }
      });
    });
    
    // Count advance pending events from tracker clients
    advancePendingClients.forEach(client => {
      const events = parseEventDetails(
        client.events || '',
        client.eventYear || '',
        client.eventMonth || '',
        client.eventDay || ''
      );
      
      events.forEach(event => {
        if (event.year && event.month && event.day && event.day !== '**') {
          const dateKey = `${event.year}-${event.month}-${event.day}`;
          advancePendingMap.set(dateKey, (advancePendingMap.get(dateKey) || 0) + 1);
        }
      });
    });
    
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
      days: { day: number; isBooked: boolean; eventCount: number; advancePendingCount: number }[];
      bookedCount: number;
    }[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthNum = ((startMonth - 1 + i) % 12) + 1;
      const yearNum = startYear + Math.floor((startMonth - 1 + i) / 12);
      const monthName = NEPALI_MONTHS[monthNum];
      const daysInMonth = daysPerMonth[monthNum] || 30;
      
      const days: { day: number; isBooked: boolean; eventCount: number; advancePendingCount: number }[] = [];
      let bookedCount = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${yearNum}-${monthNum}-${day}`;
        const eventCount = bookedMap.get(dateKey) || 0;
        const advancePendingCount = advancePendingMap.get(dateKey) || 0;
        const isBooked = eventCount > 0;
        if (isBooked) bookedCount++;
        days.push({ day, isBooked, eventCount, advancePendingCount });
      }
      
      result.push({ month: monthNum, year: yearNum, monthName, days, bookedCount });
    }
    
    return result;
  }, [clients, advancePendingClients]);

  // Sort clients by event date
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const getEventDate = (client: BookedClientData): Date | null => {
        if (!client.eventYear || !client.eventMonth || !client.eventDay) return null;
        try {
          const bsYear = parseInt(client.eventYear);
          const bsMonth = parseInt(client.eventMonth);
          const bsDay = parseInt(client.eventDay);
          if (client.eventDay.includes('*')) return null;
          const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
          return nepaliDate.toJsDate();
        } catch { return null; }
      };
      
      const dateA = getEventDate(a);
      const dateB = getEventDate(b);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  }, [clients]);

  return (
    <div className="p-6 space-y-6">
      {/* Filtered Results Table - Full screen when filters active */}
      {hasActiveFilter ? (
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardContent className="p-0">
            <TooltipProvider>
              <ScrollArea className="h-[calc(100vh-220px)]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-b-2 border-green-500/20">
                      <TableHead className="w-[200px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                        Client
                      </TableHead>
                      <TableHead className="w-[280px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                        Events & Dates
                      </TableHead>
                      <TableHead className="font-bold text-foreground uppercase tracking-wide text-xs py-4">
                        Location
                      </TableHead>
                      <TableHead className="font-bold text-foreground uppercase tracking-wide text-xs py-4">
                        Handler
                      </TableHead>
                      <TableHead className="font-bold text-foreground uppercase tracking-wide text-xs py-4 text-right w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
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
                      sortedClients.map((client) => {
                        const events = parseEventDetails(
                          client.events || '',
                          client.eventYear || '',
                          client.eventMonth || '',
                          client.eventDay || ''
                        );
                        
                        return (
                          <TableRow key={client.bookedRowNumber} className="hover:bg-muted/30">
                            <TableCell>
                              <button 
                              onClick={() => navigate(getClientDetailPath(client), { state: { from: location.pathname } })}
                                className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left"
                              >
                                {client.clientName}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {events.map((event, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {event.eventName}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {event.year} {event.monthName} {event.day.includes('*') ? '**' : event.day}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {client.eventCity || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {client.clientHandler || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`tel:${client.contactNo}`, '_self')}>
                                      <Phone className="h-4 w-4 text-blue-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{client.contactNo || 'No number'}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openWhatsApp(client.whatsappNo || '')}>
                                      <MessageCircle className="h-4 w-4 text-green-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{client.whatsappNo || client.contactNo || 'No number'}</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TooltipProvider>
          </CardContent>
        </Card>
      ) : (
        /* Normal Dashboard View */
        <>
          {/* Stats Row */}
          <div className="flex items-center gap-4">
            <div className="flex gap-3 flex-1">
              {/* Total Clients */}
              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{isLoading ? "—" : uniqueClientCount}</p>
                    <p className="text-xs text-muted-foreground">Total Clients</p>
                  </div>
                </CardContent>
              </Card>

              {/* Total Events (remaining/total) */}
              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {isLoading ? "—" : `${eventStats.remaining}/${eventStats.total}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </div>
                </CardContent>
              </Card>

              {/* Last Booking */}
              <Card className="shadow-sm flex-1">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{isLoading ? "—" : lastBookingInfo}</p>
                    <p className="text-xs text-muted-foreground">Last Booking</p>
                  </div>
                </CardContent>
              </Card>

              {/* Next Event */}
              <Card className="shadow-sm flex-1 relative overflow-hidden">
                {nextEventInfo && (
                  <Badge className="absolute top-1 right-1 bg-red-500 text-white text-[10px]">
                    {nextEventInfo.daysRemaining} days
                  </Badge>
                )}
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {nextEventInfo ? (
                      <>
                        <p className="text-sm font-bold truncate">
                          {nextEventInfo.eventName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {nextEventInfo.clientName} • {nextEventInfo.dateDisplay}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold">No Events</p>
                        <p className="text-xs text-muted-foreground">Next Event</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
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

          {/* Booking Calendar Section */}
          <Card className="shadow-sm border-green-500/20">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-sm">Booking Calendar</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    (<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[8px]">●</span> Booked,
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
              {(showAllOpenDates ? calendarData : calendarData.slice(0, 4)).map((monthData) => (
                <div 
                  key={`cal-${monthData.year}-${monthData.month}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border/50"
                >
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs min-w-[110px] justify-center shrink-0">
                    {monthData.monthName} {monthData.year}
                  </Badge>
                  
                  <span className="text-muted-foreground font-medium">:</span>
                  
                  <div className="flex-1 flex flex-wrap gap-x-1 gap-y-1.5 min-w-0 items-center">
                    {monthData.days.map(({ day, isBooked, eventCount, advancePendingCount }) => {
                      const isPast = isBSDatePast(monthData.year, monthData.month, day);
                      const hasAdvancePending = advancePendingCount > 0;
                      
                      if (isBooked) {
                        // BOOKED: Concentric circles + optional yellow outer ring for advance pending
                        const totalRingSize = 20 + (eventCount - 1) * 8 + (hasAdvancePending ? 8 : 0);
                        return (
                          <button 
                            key={day}
                            onClick={() => onHotDateFilter?.(`${monthData.year}-${monthData.month}-${day}`)}
                            className={cn(
                              "relative inline-flex items-center justify-center cursor-pointer transition-all hover:scale-110",
                              isPast && "opacity-40",
                              selectedHotDate === `${monthData.year}-${monthData.month}-${day}` 
                                ? "ring-2 ring-offset-2 ring-green-500 rounded-full"
                                : ""
                            )}
                            style={{ 
                              width: `${totalRingSize}px`,
                              height: `${totalRingSize}px`
                            }}
                            title={`${eventCount} booked${hasAdvancePending ? ` + ${advancePendingCount} advance pending` : ''}${isPast ? ' (Completed)' : ''} on day ${day}`}
                          >
                            {/* Yellow outer ring for advance pending */}
                            {hasAdvancePending && (
                              <span 
                                className={cn(
                                  "absolute rounded-full border-2",
                                  isPast ? "border-muted-foreground" : "border-amber-500"
                                )}
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
                                  className={cn(
                                    "absolute rounded-full border-2",
                                    isPast ? "border-muted-foreground" : "border-green-500"
                                  )}
                                  style={{ width: `${size}px`, height: `${size}px` }}
                                />
                              );
                            })}
                            {/* Inner filled circle with day number or checkmark */}
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 text-white",
                              isPast ? "bg-muted-foreground" : "bg-green-500"
                            )}>
                              {isPast ? <CheckCircle className="w-3 h-3" /> : day}
                            </span>
                          </button>
                        );
                      } else if (hasAdvancePending) {
                        // ADVANCE PENDING ONLY: Yellow text/circle
                        return (
                          <button 
                            key={day}
                            onClick={() => onHotDateFilter?.(`${monthData.year}-${monthData.month}-${day}`)}
                            className={cn(
                              "w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold",
                              "cursor-pointer rounded-full transition-all",
                              isPast ? "text-muted-foreground bg-muted" : "text-amber-600 bg-amber-500/20 hover:bg-amber-500/30",
                              selectedHotDate === `${monthData.year}-${monthData.month}-${day}` 
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
                          <span 
                            key={day}
                            className="w-5 h-5 flex items-center justify-center font-mono text-[10px] text-muted-foreground/50"
                          >
                            {day}
                          </span>
                        );
                      }
                    })}
                  </div>
                  
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

          {/* Hot Dates Section - Booked Only */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Hot Dates
                  <Badge variant="outline" className="text-xs ml-2 text-green-600 border-green-500">
                    Booked Events Only
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* CLIENT WISE Toggle Button */}
                  <Button
                    variant={showClientWise ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowClientWise(!showClientWise)}
                    className={cn(
                      "text-xs h-7",
                      showClientWise 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "border-blue-500 text-blue-600 hover:bg-blue-500/10"
                    )}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    CLIENT WISE
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    {showClientWise ? `${allClients.length} clients` : `Top ${hotDates.length} dates`}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showClientWise ? (
                // CLIENT WISE View - Show individual client cards
                (() => {
                  // Filter clients by selected month
                  const filteredClientList = selectedMonth 
                    ? allClients.filter(client => {
                        const clientData = clients.find(c => c.clientName === client.name);
                        if (!clientData) return false;
                        
                        const events = parseEventDetails(
                          clientData.events || '',
                          clientData.eventYear || '',
                          clientData.eventMonth || '',
                          clientData.eventDay || ''
                        );
                        
                        const [filterYear, filterMonth] = selectedMonth.split('-');
                        return events.some(event => 
                          event.year === filterYear && event.month === filterMonth
                        );
                      })
                    : allClients;
                  
                  return filteredClientList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No clients found {selectedMonth ? "for selected month" : ""}
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {filteredClientList.map((client) => {
                        // Get events for this client, filtered by selected month if applicable
                        const clientEvents = clients
                          .filter(c => c.clientName === client.name)
                          .flatMap(c => parseEventDetails(
                            c.events || '',
                            c.eventYear || '',
                            c.eventMonth || '',
                            c.eventDay || ''
                          ))
                          .filter(event => {
                            if (!selectedMonth) return true;
                            const [filterYear, filterMonth] = selectedMonth.split('-');
                            return event.year === filterYear && event.month === filterMonth;
                          });
                        
                        return (
                          <button
                            key={`${client.name}-${client.registeredDateTimeAD}`}
                            onClick={() => navigate(getClientDetailPath(client), { state: { from: location.pathname } })}
                            className={cn(
                              "border rounded-lg p-3 transition-all text-left w-full relative overflow-hidden",
                              "hover:border-green-500/50 hover:bg-green-500/5"
                            )}
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <span className="font-semibold text-sm">{client.name}</span>
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs shrink-0">
                                {clientEvents.length} events
                              </Badge>
                            </div>
                            <ScrollArea className={clientEvents.length > 3 ? "h-24" : ""}>
                              <div className="space-y-1">
                                {clientEvents.map((event, i) => (
                                  <div key={i} className="text-[10px] text-muted-foreground border-l-2 border-green-500 pl-2 py-0.5">
                                    <span className="font-medium text-foreground">{event.eventName}</span>
                                    <span> • {event.monthName} {event.day}, {event.year}</span>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                // Original Hot Dates View
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
                          "border rounded-lg p-3 transition-all text-left w-full relative overflow-hidden",
                          dateInfo.isCompleted && "opacity-50",
                          selectedHotDate === dateInfo.dateKey
                            ? "border-green-500 bg-green-500/10 ring-2 ring-green-500/30"
                            : "hover:border-green-500/50 hover:bg-green-500/5"
                        )}
                      >
                        {/* COMPLETED Stamp */}
                        {dateInfo.isCompleted && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                            <Badge 
                              variant="outline" 
                              className="bg-background/90 text-muted-foreground border-2 border-muted-foreground/50 rotate-[-15deg] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-md"
                            >
                              Completed
                            </Badge>
                          </div>
                        )}
                        {/* Date Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {dateInfo.isCompleted ? (
                              <CheckCircle className="w-3 h-3 text-muted-foreground" />
                            ) : null}
                            <Badge className={cn(
                              "text-white text-xs",
                              dateInfo.isCompleted 
                                ? "bg-muted-foreground" 
                                : "bg-gradient-to-r from-green-500 to-emerald-500"
                            )}>
                              {dateInfo.monthName} {dateInfo.day}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{dateInfo.year}</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">{dateInfo.events.length}</span>
                        </div>

                        {/* Events List - Show ALL events with scroll if needed */}
                        <ScrollArea className={dateInfo.events.length > 5 ? "h-28" : ""}>
                          <div className="space-y-1">
                            {dateInfo.events.map((c, i) => (
                                <button
                                  key={`${c.clientName}-${c.registeredDateTimeAD}-${i}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(getClientDetailPath(c), { state: { from: location.pathname } });
                                  }}
                                  className="w-full text-left text-[10px] text-muted-foreground truncate border-l-2 border-green-500 pl-2 hover:bg-green-500/10 rounded-r py-0.5 transition-colors cursor-pointer"
                                >
                                  <span className="font-medium text-foreground">{c.eventName}</span>
                                  <span className="hover:text-primary hover:underline"> • {c.clientName}</span>
                                </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </button>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
