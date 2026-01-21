import { useMemo } from "react";
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
import { getCurrentStatus } from "@/lib/sheets-api";
import { parseEventDetails, getMonthName } from "@/lib/nepali-months";
import {
  Users,
  CalendarPlus,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  ChevronRight,
  Phone,
  MessageSquare,
  PhoneOff,
  FileText,
  SendHorizontal,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  CalendarX,
  ArrowRight,
  RefreshCw,
  MessageCircle,
  MapPin,
  Calendar,
  Sparkles,
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
}

// Get icon and color for each status category
const getStatusConfig = (status: string) => {
  const s = status.toUpperCase();
  if (s.includes('JUST ENQUIRED')) return { icon: Users, color: 'bg-emerald-600', textColor: 'text-emerald-600', label: 'Just Enquired' };
  if (s.includes('NUMBER PROVIDED')) return { icon: Phone, color: 'bg-teal-600', textColor: 'text-teal-600', label: 'Number Provided' };
  if (s.includes('TEXTED')) return { icon: MessageSquare, color: 'bg-yellow-500', textColor: 'text-yellow-500', label: 'Texted' };
  if (s.includes('CALL NOT')) return { icon: PhoneOff, color: 'bg-orange-500', textColor: 'text-orange-500', label: 'Call Not Received' };
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return { icon: FileText, color: 'bg-blue-500', textColor: 'text-blue-500', label: 'Quotation Pending' };
  if (s.includes('QUOTATION SENT')) return { icon: SendHorizontal, color: 'bg-indigo-500', textColor: 'text-indigo-500', label: 'Quotation Sent' };
  if (s.includes('BARGAINING')) return { icon: Scale, color: 'bg-purple-500', textColor: 'text-purple-500', label: 'Bargaining' };
  if (s.includes('ADVANCE PENDING')) return { icon: Clock, color: 'bg-pink-500', textColor: 'text-pink-500', label: 'Advance Pending' };
  if (s.includes('BOOKED')) return { icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-500', label: 'Booked' };
  if (s.includes('CANCELLED')) return { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-500', label: 'Cancelled' };
  if (s.includes('POSTPONED')) return { icon: CalendarX, color: 'bg-slate-500', textColor: 'text-slate-500', label: 'Postponed' };
  return { icon: Users, color: 'bg-gray-500', textColor: 'text-gray-500', label: status };
};

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
}: DesktopDashboardProps) {
  const navigate = useNavigate();

  // Use allClients for stats if available, otherwise use filtered clients
  const statsClients = allClients || clients;

  // Calculate stats from ALL clients (not filtered)
  const totalClients = statsClients.length;
  const today = new Date().toISOString().split("T")[0];
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

  // Get ordered categories with counts
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
    return stats.sort((a, b) => b.count - a.count);
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

  // Pipeline stats (from ALL clients)
  const quotationPending = statusCounts['CALLED: QUOTATION PENDING'] || 0;
  const quotationSent = statusCounts['QUOTATION SENT: REVIEW PENDING'] || 0;
  const bargaining = Object.keys(statusCounts).filter(s => s.includes('BARGAINING')).reduce((sum, s) => sum + (statusCounts[s] || 0), 0);
  const booked = Object.keys(statusCounts).filter(s => s.includes('BOOKED')).reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

  // Format phone number for WhatsApp
  const formatWhatsAppNumber = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

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
                      Client Name
                    </TableHead>
                    <TableHead className="w-[200px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Event Name
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        Event Date
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] font-bold text-foreground uppercase tracking-wide text-xs py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        City
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] font-bold text-foreground uppercase tracking-wide text-xs py-4 text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
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
                    clients.map((client, clientIdx) => {
                      // Parse events with their dates
                      const events = parseEventDetails(
                        client.events || '',
                        client.eventYear || '',
                        client.eventMonth || '',
                        client.eventDay || ''
                      );

                      const contactNumber = client.whatsappNo || client.contactNo || '';
                      const whatsappNumber = formatWhatsAppNumber(contactNumber);
                      // Fix: Use eventCity (Column K) instead of eventCityName
                      const cityName = client.eventCity || client.eventLocation || '';
                      
                      // If no events, show single row
                      if (events.length === 0) {
                        return (
                          <TableRow 
                            key={client.rowNumber} 
                            className="hover:bg-muted/50 transition-colors group"
                          >
                            <TableCell className="font-semibold py-4">
                              <span className="text-foreground">{client.clientName || 'Unnamed Client'}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-muted-foreground italic text-sm">No events</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-muted-foreground">—</span>
                            </TableCell>
                            <TableCell className="py-4">
                              {cityName ? (
                                <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                                  <MapPin className="w-3 h-3" />
                                  {cityName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <TooltipProvider>
                                <div className="flex items-center justify-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={contactNumber ? `tel:${contactNumber}` : undefined}
                                        className={cn(
                                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                          contactNumber 
                                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:scale-110 hover:shadow-lg hover:shadow-green-500/20" 
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                        onClick={(e) => !contactNumber && e.preventDefault()}
                                      >
                                        <Phone className="w-4 h-4" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{contactNumber || 'No contact number'}</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={whatsappNumber ? `https://wa.me/${whatsappNumber}` : undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                          whatsappNumber 
                                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20" 
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                        onClick={(e) => !whatsappNumber && e.preventDefault()}
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{contactNumber || 'No contact number'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      // Multiple events - render each event as a separate row
                      return events.map((event, eventIdx) => {
                        const colorClass = eventColors[eventIdx % eventColors.length];
                        const isFirstRow = eventIdx === 0;
                        const isLastRow = eventIdx === events.length - 1;
                        
                        return (
                          <TableRow 
                            key={`${client.rowNumber}-${eventIdx}`}
                            className={cn(
                              "transition-colors group",
                              isFirstRow && "border-t-2 border-t-muted/50",
                              !isLastRow && "border-b-0",
                              "hover:bg-muted/30"
                            )}
                          >
                            {/* Client Name - only on first row with rowSpan */}
                            {isFirstRow && (
                              <TableCell 
                                className="font-semibold py-4 align-top"
                                rowSpan={events.length}
                              >
                                <span className="text-foreground">{client.clientName || 'Unnamed Client'}</span>
                              </TableCell>
                            )}
                            
                            {/* Event Name - each row */}
                            <TableCell className="py-3">
                              <div className={cn(
                                "px-3 py-2 rounded-lg border-l-4 transition-all group-hover:scale-[1.02]",
                                colorClass
                              )}>
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                                  <span className="font-medium text-sm">{event.eventName || 'Event'}</span>
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Event Date - each row */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-sm font-medium text-amber-700">
                                  {event.monthName} {event.day}{event.year ? `, ${event.year}` : ''}
                                </span>
                              </div>
                            </TableCell>
                            
                            {/* City - only on first row with rowSpan */}
                            {isFirstRow && (
                              <TableCell className="py-4 align-top" rowSpan={events.length}>
                                {cityName ? (
                                  <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 py-1.5 px-3">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {cityName}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )}
                            
                            {/* Actions - only on first row with rowSpan */}
                            {isFirstRow && (
                              <TableCell className="py-4 align-top" rowSpan={events.length}>
                                <TooltipProvider>
                                  <div className="flex items-center justify-center gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a
                                          href={contactNumber ? `tel:${contactNumber}` : undefined}
                                          className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                            contactNumber 
                                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:scale-110 hover:shadow-lg hover:shadow-green-500/20" 
                                              : "bg-muted text-muted-foreground cursor-not-allowed"
                                          )}
                                          onClick={(e) => !contactNumber && e.preventDefault()}
                                        >
                                          <Phone className="w-4 h-4" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{contactNumber || 'No contact number'}</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a
                                          href={whatsappNumber ? `https://wa.me/${whatsappNumber}` : undefined}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                            whatsappNumber 
                                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20" 
                                              : "bg-muted text-muted-foreground cursor-not-allowed"
                                          )}
                                          onClick={(e) => !whatsappNumber && e.preventDefault()}
                                        >
                                          <MessageCircle className="w-4 h-4" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{contactNumber || 'No contact number'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TooltipProvider>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      });
                    })
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
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Pipeline + Categories */}
            <div className="col-span-8 space-y-6">
              {/* Sales Pipeline */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Sales Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-blue-500/10 rounded-lg p-3 cursor-pointer hover:bg-blue-500/20 transition-colors">
                      <p className="text-2xl font-bold text-blue-600">{quotationPending}</p>
                      <p className="text-xs text-muted-foreground">Quotation Pending</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 bg-indigo-500/10 rounded-lg p-3 cursor-pointer hover:bg-indigo-500/20 transition-colors">
                      <p className="text-2xl font-bold text-indigo-600">{quotationSent}</p>
                      <p className="text-xs text-muted-foreground">Quotation Sent</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 bg-purple-500/10 rounded-lg p-3 cursor-pointer hover:bg-purple-500/20 transition-colors">
                      <p className="text-2xl font-bold text-purple-600">{bargaining}</p>
                      <p className="text-xs text-muted-foreground">Bargaining</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 bg-green-500/10 rounded-lg p-3 cursor-pointer hover:bg-green-500/20 transition-colors">
                      <p className="text-2xl font-bold text-green-600">{booked}</p>
                      <p className="text-xs text-muted-foreground">Booked</p>
                    </div>
                  </div>
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

            {/* Right Column: Handlers + Today */}
            <div className="col-span-4 space-y-6">
              {/* Handlers Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Team Handlers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {handlers.map((handler, idx) => {
                        const count = handlerCounts[handler] || 0;
                        const colorClass = handlerColors[idx % handlerColors.length];
                        const initials = handler.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        
                        return (
                          <Link
                            key={handler}
                            to={`/client-tracker/handler/${encodeURIComponent(handler)}?stay=true`}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br text-white font-bold",
                              colorClass
                            )}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{handler}</p>
                              <p className="text-xs text-muted-foreground">{count} clients</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Today's Activity Summary */}
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
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {todaysClients.slice(0, 10).map((client, idx) => (
                          <div
                            key={client.rowNumber || idx}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{client.clientName}</p>
                              <p className="text-xs text-muted-foreground truncate">{client.events || "No event"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
