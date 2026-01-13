import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarPlus, TrendingUp, Loader2, AlertTriangle, RefreshCw, ChevronRight, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { getClients, ClientData } from "@/lib/sheets-api";
import { FreshClientCard } from "@/components/dashboard/FreshClientCard";
import { ClientDetailSheet } from "@/components/dashboard/ClientDetailSheet";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Dashboard() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

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

  const stats = [
    { label: "Total", value: totalClients, icon: Users, color: "gradient-primary" },
    { label: "This Month", value: thisMonthClients, icon: CalendarPlus, color: "gradient-secondary" },
    { label: "Today", value: todaysClients.length, icon: TrendingUp, color: "gradient-accent" },
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

        {/* Fresh Clients Section */}
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Fresh Clients
              </h2>
              <Link to="/fresh-clients">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && error && (
              <div className="text-center py-6 space-y-3">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">Failed to load clients</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={fetchClients}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry
                  </Button>
                  <Link to="/settings">
                    <Button variant="outline" size="sm">
                      Check Settings
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {!isLoading && !error && clients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No clients yet. Add your first client!
              </p>
            )}

            {!isLoading && !error && clients.length > 0 && (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {clients.slice(0, 10).map((client, i) => (
                  <FreshClientCard key={i} client={client} onClick={setSelectedClient} />
                ))}
                {clients.length > 10 && (
                  <Link to="/fresh-clients" className="block">
                    <div className="text-center py-3 text-sm text-primary hover:underline">
                      View all {clients.length} clients →
                    </div>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
      
      {/* Client Detail Sheet */}
      <ClientDetailSheet
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </AppLayout>
  );
}
