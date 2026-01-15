import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarPlus, TrendingUp, Loader2, Menu, FileText, SendHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { getClients, ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Dashboard() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getClients(50);
      setClients(data);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Calculate stats
  const totalClients = clients.length;
  const today = new Date().toISOString().split("T")[0];
  const todaysClients = clients.filter(c => c.inquiryDateAD?.startsWith(today));
  
  // Get current BS month (approximate)
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthClients = clients.filter(c => {
    const month = parseInt(c.eventMonth || "0");
    return month === currentMonth || month === currentMonth + 1;
  }).length;

  // Quotation stats
  const quotationPendingCount = clients.filter(c => 
    getCurrentStatus(c.statusLog || '').toUpperCase().includes('QUOTATION PENDING')
  ).length;
  const quotationSentCount = clients.filter(c => 
    getCurrentStatus(c.statusLog || '').toUpperCase().includes('QUOTATION SENT')
  ).length;

  const stats = [
    { label: "Total", value: totalClients, icon: Users, color: "gradient-primary" },
    { label: "This Month", value: thisMonthClients, icon: CalendarPlus, color: "gradient-secondary" },
    { label: "Today", value: todaysClients.length, icon: TrendingUp, color: "gradient-accent" },
  ];

  const quotationStats = [
    { label: "Quotation Pending", value: quotationPendingCount, icon: FileText, color: "bg-blue-600" },
    { label: "Quotation Sent", value: quotationSentCount, icon: SendHorizontal, color: "bg-purple-600" },
  ];

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
          {stats.map((stat) => {
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

        {/* Quotation Stats */}
        <div className="grid grid-cols-2 gap-3">
          {quotationStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-soft border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {isLoading ? "—" : stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
