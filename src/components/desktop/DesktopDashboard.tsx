import { useMemo, useState } from "react";
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
import { parseEventDetails, getMonthName } from "@/lib/nepali-months";
import { DesktopClientRow } from "./DesktopClientRow";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import { getStatusConfig, sortCategoriesByOrder } from "@/lib/status-config";
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
  onClearHandler?: () => void;
  onClearCategory?: () => void;
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
  onClearHandler,
  onClearCategory,
  onClearAllFilters,
  dropdowns,
  onClientUpdate,
}: DesktopDashboardProps) {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Use allClients for stats if available, otherwise use filtered clients
  const statsClients = allClients || clients;

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
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-16">
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
                    clients.map((client) => (
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
          {/* Top Row: Stats + Quick Actions */}
          <div className="grid grid-cols-12 gap-6">
            {/* Stats Cards */}
            <div className="col-span-9 grid grid-cols-4 gap-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{isLoading ? "—" : totalClients}</p>
                      <p className="text-sm text-muted-foreground">Total Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                      <CalendarPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{isLoading ? "—" : thisMonthClients}</p>
                      <p className="text-sm text-muted-foreground">This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{isLoading ? "—" : todaysClients.length}</p>
                      <p className="text-sm text-muted-foreground">Today's Enquiries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{isLoading ? "—" : booked}</p>
                      <p className="text-sm text-muted-foreground">Booked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="col-span-3 space-y-3">
              <Link to="/client-tracker/quick-add">
                <Button className="w-full h-12 text-base font-semibold gradient-primary text-white shadow-lg">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add New Client
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full h-10"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Sync Data"}
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="space-y-6">
            {/* Full Width Content */}
            <div className="space-y-6">
              {/* Hot Dates Section */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      Hot Dates
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Top {hotDates.length} dates
                      </Badge>
                      <Link to="/client-tracker/hot-dates">
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          View All
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {hotDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No event dates found
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {hotDates.map((dateInfo) => (
                        <div
                          key={dateInfo.dateKey}
                          className="border rounded-lg p-3 hover:border-primary/30 transition-colors"
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
                        </div>
                      ))}
                    </div>
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
