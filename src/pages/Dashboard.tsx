import { useState, useEffect, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, CalendarPlus, TrendingUp, Menu, 
  MessageSquare, PhoneOff, FileText, SendHorizontal, 
  Scale, Clock, CheckCircle, XCircle, CalendarX,
  Phone, ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getClients, ClientData, getCurrentStatus, getDropdowns } from "@/lib/sheets-api";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

// Get icon and color for each status category
const getStatusConfig = (status: string) => {
  const s = status.toUpperCase();
  if (s.includes('JUST ENQUIRED')) return { icon: Users, color: 'bg-emerald-600', label: 'Just Enquired' };
  if (s.includes('NUMBER PROVIDED')) return { icon: Phone, color: 'bg-teal-600', label: 'Number Provided' };
  if (s.includes('TEXTED')) return { icon: MessageSquare, color: 'bg-yellow-500', label: 'Texted' };
  if (s.includes('CALL NOT')) return { icon: PhoneOff, color: 'bg-orange-500', label: 'Call Not Received' };
  if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return { icon: FileText, color: 'bg-blue-500', label: 'Quotation Pending' };
  if (s.includes('QUOTATION SENT')) return { icon: SendHorizontal, color: 'bg-indigo-500', label: 'Quotation Sent' };
  if (s.includes('BARGAINING')) return { icon: Scale, color: 'bg-purple-500', label: 'Bargaining' };
  if (s.includes('ADVANCE PENDING')) return { icon: Clock, color: 'bg-pink-500', label: 'Advance Pending' };
  if (s.includes('BOOKED')) return { icon: CheckCircle, color: 'bg-green-500', label: 'Booked' };
  if (s.includes('CANCELLED')) return { icon: XCircle, color: 'bg-red-500', label: 'Cancelled' };
  if (s.includes('POSTPONED')) return { icon: CalendarX, color: 'bg-slate-500', label: 'Postponed' };
  return { icon: Users, color: 'bg-gray-500', label: status };
};

export default function Dashboard() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const navigate = useNavigate();

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
      console.error("Failed to fetch clients:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate basic stats
  const totalClients = clients.length;
  const today = new Date().toISOString().split("T")[0];
  const todaysClients = clients.filter(c => c.inquiryDateAD?.startsWith(today));
  
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthClients = clients.filter(c => {
    const month = parseInt(c.eventMonth || "0");
    return month === currentMonth || month === currentMonth + 1;
  }).length;

  // Group clients by status and count
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    clients.forEach(client => {
      const status = getCurrentStatus(client.statusLog || '').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return counts;
  }, [clients]);

  // Get ordered categories with counts (excluding UNTOUCHED)
  const categoryStats = useMemo(() => {
    const stats: { status: string; count: number; config: ReturnType<typeof getStatusConfig> }[] = [];
    
    // First add statuses from options that have clients
    statusOptions.forEach(status => {
      const normalizedStatus = status.toUpperCase();
      if (normalizedStatus !== 'UNTOUCHED' && statusCounts[normalizedStatus]) {
        stats.push({
          status: normalizedStatus,
          count: statusCounts[normalizedStatus],
          config: getStatusConfig(normalizedStatus)
        });
      }
    });
    
    // Add any remaining statuses not in options
    Object.keys(statusCounts).forEach(status => {
      if (status !== 'UNTOUCHED' && !stats.find(s => s.status === status)) {
        stats.push({
          status,
          count: statusCounts[status],
          config: getStatusConfig(status)
        });
      }
    });
    
    return stats;
  }, [statusOptions, statusCounts]);

  const basicStats = [
    { label: "Total", value: totalClients, icon: Users, color: "gradient-primary" },
    { label: "This Month", value: thisMonthClients, icon: CalendarPlus, color: "gradient-secondary" },
    { label: "Today", value: todaysClients.length, icon: TrendingUp, color: "gradient-accent" },
  ];

  const handleCategoryClick = (status: string) => {
    navigate(`/fresh-clients?category=${encodeURIComponent(status)}`);
  };

  return (
    <AppLayout>
      {/* Header with Menu Button */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <PageHeader 
            title="WTN Client Tracker" 
            subtitle="Wedding & Event Management"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="shrink-0"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Quick Action */}
        <Link to="/quick-add">
          <Button 
            className="w-full h-14 text-lg font-semibold gradient-primary text-white shadow-lg press-effect"
            size="lg"
          >
            <CalendarPlus className="w-5 h-5 mr-2" />
            Quick Add Client
          </Button>
        </Link>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {basicStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-soft border-0">
                <CardContent className="p-3 text-center">
                  <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-1`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {isLoading ? "—" : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Category Stats - Clickable */}
        {categoryStats.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Client Categories
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categoryStats.map(({ status, count, config }) => {
                const Icon = config.icon;
                return (
                  <Card 
                    key={status} 
                    className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                    onClick={() => handleCategoryClick(status)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          config.color
                        )}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-foreground">
                            {isLoading ? "—" : count}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">
                            {config.label}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Show setup notice only on error */}
        {error && (
          <Card className="border-2 border-dashed border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">⚠️ Connection Issue</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Check your Google Sheets configuration in Settings.
              </p>
              <Link to="/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </AppLayout>
  );
}
