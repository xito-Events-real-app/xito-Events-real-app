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
import { cn } from "@/lib/utils";
import { getCurrentStatus } from "@/lib/sheets-api";
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
} from "lucide-react";

interface DesktopDashboardProps {
  clients: any[];
  handlers: string[];
  handlerCounts: Record<string, number>;
  isLoading: boolean;
  onSync: () => void;
  isSyncing: boolean;
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

export function DesktopDashboard({
  clients,
  handlers,
  handlerCounts,
  isLoading,
  onSync,
  isSyncing,
}: DesktopDashboardProps) {
  const navigate = useNavigate();

  // Calculate stats
  const totalClients = clients.length;
  const today = new Date().toISOString().split("T")[0];
  const todaysClients = clients.filter(c => c.inquiryDateAD?.startsWith(today));
  
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthClients = clients.filter(c => {
    const month = parseInt(c.eventMonth || "0");
    return month === currentMonth || month === currentMonth + 1;
  }).length;

  // Group clients by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [clients]);

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

  // Urgent booked clients (events in ≤7 days)
  const urgentBookedClients = useMemo(() => {
    const now = new Date();
    return clients
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
  }, [clients]);

  // Pipeline stats
  const quotationPending = statusCounts['CALLED: QUOTATION PENDING'] || 0;
  const quotationSent = statusCounts['QUOTATION SENT: REVIEW PENDING'] || 0;
  const bargaining = Object.keys(statusCounts).filter(s => s.includes('BARGAINING')).reduce((sum, s) => sum + (statusCounts[s] || 0), 0);
  const booked = Object.keys(statusCounts).filter(s => s.includes('BOOKED')).reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

  const handleCategoryClick = (status: string) => {
    navigate(`/client-tracker/fresh-clients?category=${encodeURIComponent(status)}`);
  };

  return (
    <div className="p-6 space-y-6">
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

          <Card 
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/client-tracker/today")}
          >
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
                <div 
                  className="flex-1 bg-blue-500/10 rounded-lg p-3 cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => handleCategoryClick('CALLED: QUOTATION PENDING')}
                >
                  <p className="text-2xl font-bold text-blue-600">{quotationPending}</p>
                  <p className="text-xs text-muted-foreground">Quotation Pending</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <div 
                  className="flex-1 bg-indigo-500/10 rounded-lg p-3 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                  onClick={() => handleCategoryClick('QUOTATION SENT: REVIEW PENDING')}
                >
                  <p className="text-2xl font-bold text-indigo-600">{quotationSent}</p>
                  <p className="text-xs text-muted-foreground">Quotation Sent</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <div 
                  className="flex-1 bg-purple-500/10 rounded-lg p-3 cursor-pointer hover:bg-purple-500/20 transition-colors"
                  onClick={() => handleCategoryClick('BARGAINING IS ON')}
                >
                  <p className="text-2xl font-bold text-purple-600">{bargaining}</p>
                  <p className="text-xs text-muted-foreground">Bargaining</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <div 
                  className="flex-1 bg-green-500/10 rounded-lg p-3 cursor-pointer hover:bg-green-500/20 transition-colors"
                  onClick={() => handleCategoryClick('BOOKED')}
                >
                  <p className="text-2xl font-bold text-green-600">{booked}</p>
                  <p className="text-xs text-muted-foreground">Booked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Categories Grid */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Client Categories</CardTitle>
                <Link to="/client-tracker/fresh-clients">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    View All <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {categoryStats.map(({ status, count, config }) => {
                  const Icon = config.icon;
                  return (
                    <div
                      key={status}
                      onClick={() => handleCategoryClick(status)}
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
                          <Badge variant={client.daysRemaining <= 1 ? "destructive" : "secondary"}>
                            {client.daysRemaining === 0 ? "TODAY" : `${client.daysRemaining} days`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCategoryClick('BOOKED')}
                          >
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

        {/* Right Column: Handlers */}
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
    </div>
  );
}
