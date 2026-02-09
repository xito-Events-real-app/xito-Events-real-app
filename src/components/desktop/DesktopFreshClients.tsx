import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import {
  Search,
  Filter,
  ChevronDown,
  Users,
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
  Eye,
  Edit,
} from "lucide-react";

interface DesktopFreshClientsProps {
  clients: ClientData[];
  statusOptions: string[];
  handlerOptions: string[];
  mindsetOptions: string[];
  paymentTypes: string[];
  banks: string[];
  isLoading: boolean;
  onRefresh: () => void;
}

// Get status config
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
  if (s === 'LOST') return { icon: XCircle, color: 'bg-rose-700', textColor: 'text-rose-700', label: 'Lost' };
  return { icon: Users, color: 'bg-gray-500', textColor: 'text-gray-500', label: status };
};

export function DesktopFreshClients({
  clients,
  statusOptions,
  handlerOptions,
  mindsetOptions,
  paymentTypes,
  banks,
  isLoading,
  onRefresh,
}: DesktopFreshClientsProps) {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(categoryParam || "all");
  const [handlerFilter, setHandlerFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  // Get unique statuses from clients
  const activeStatuses = useMemo(() => {
    const statuses = new Set<string>();
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      if (status !== 'UNTOUCHED') {
        statuses.add(status);
      }
    });
    return Array.from(statuses);
  }, [clients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      
      // Status filter
      if (statusFilter !== "all" && status !== statusFilter.toUpperCase()) {
        return false;
      }
      
      // Handler filter
      if (handlerFilter !== "all") {
        const handler = client.clientHandler || client.whoAdded || '';
        if (handler !== handlerFilter) {
          return false;
        }
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = (client.clientName || '').toLowerCase();
        const phone = (client.whatsappNo || client.contactNo || '').toLowerCase();
        const event = (client.events || '').toLowerCase();
        const location = (client.eventLocation || '').toLowerCase();
        
        if (!name.includes(query) && !phone.includes(query) && !event.includes(query) && !location.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [clients, statusFilter, handlerFilter, searchQuery]);

  // Group by status for tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      if (status !== 'UNTOUCHED') {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    return counts;
  }, [clients]);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fresh Clients</h1>
          <p className="text-muted-foreground">{filteredClients.length} of {clients.length} clients</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {activeStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {getStatusConfig(status).label} ({statusCounts[status] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Handler Filter */}
          <Select value={handlerFilter} onValueChange={setHandlerFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Handlers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Handlers</SelectItem>
              {handlerOptions.map(handler => (
                <SelectItem key={handler} value={handler}>{handler}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          All ({clients.length})
        </Button>
        {activeStatuses.map(status => {
          const config = getStatusConfig(status);
          const count = statusCounts[status] || 0;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={cn(
                statusFilter === status && config.color,
                statusFilter === status && "text-white border-0"
              )}
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[200px]">Client Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Handler</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading clients...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No clients found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client, idx) => {
                    const status = getCurrentStatus(client.statusLog || '').toUpperCase();
                    const config = getStatusConfig(status);
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={client.rowNumber || idx} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {client.clientName || 'Unnamed Client'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {(client.whatsappNo || client.contactNo) && (
                              <a 
                                href={`tel:${client.whatsappNo || client.contactNo}`}
                                className="text-primary hover:underline"
                              >
                                {client.whatsappNo || client.contactNo}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate" title={client.events}>
                            {client.events || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[120px] truncate" title={client.eventLocation}>
                            {client.eventLocation || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.clientHandler || client.whoAdded || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", config.color, "text-white border-0")}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.eventDateAD || client.inquiryDateAD || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedClient(client)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Client Detail Sheet */}
      <ClientDetailSheet
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onSave={() => {
          setSelectedClient(null);
          onRefresh();
        }}
      />
    </div>
  );
}
