import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarPlus, TrendingUp, Clock, Loader2, User, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { getClients, isSheetsConfigured, ClientData } from "@/lib/sheets-api";

export default function Dashboard() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isConfigured = isSheetsConfigured();

  useEffect(() => {
    async function fetchClients() {
      if (!isConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getClients(50);
        setClients(data);
      } catch (err) {
        console.error("Failed to fetch clients:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }

    fetchClients();
  }, [isConfigured]);

  // Calculate stats
  const totalClients = clients.length;
  const today = new Date().toISOString().split("T")[0];
  const todaysInquiries = clients.filter(c => c.inquiryDateAD?.startsWith(today)).length;
  
  // Get current BS month (approximate)
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthClients = clients.filter(c => {
    const month = parseInt(c.eventMonth || "0");
    return month === currentMonth || month === currentMonth + 1;
  }).length;

  const stats = [
    { label: "Total Clients", value: totalClients, icon: Users, color: "gradient-primary" },
    { label: "This Month", value: thisMonthClients, icon: CalendarPlus, color: "gradient-secondary" },
    { label: "Today's Inquiries", value: todaysInquiries, icon: TrendingUp, color: "gradient-accent" },
  ];

  const recentClients = clients.slice(0, 5);

  return (
    <AppLayout>
      <PageHeader 
        title="WTN Client Tracker" 
        subtitle="Wedding & Event Management"
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
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
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "—" : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent Clients</h2>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && !isConfigured && (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  <Link to="/settings" className="text-primary underline">Configure Google Sheets</Link> to see clients
                </p>
              </div>
            )}

            {!isLoading && isConfigured && recentClients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No clients yet. Add your first client!
              </p>
            )}

            {!isLoading && recentClients.length > 0 && (
              <div className="space-y-3">
                {recentClients.map((client, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.source} • {client.registeredDateBS || "Today"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Notice (only if not configured) */}
        {!isConfigured && (
          <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">⚡ Setup Required</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your Google Sheets to enable data sync.
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
    </AppLayout>
  );
}
