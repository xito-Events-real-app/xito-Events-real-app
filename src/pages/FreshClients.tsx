import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { getClients, ClientData } from "@/lib/sheets-api";
import { FreshClientCard } from "@/components/dashboard/FreshClientCard";

export default function FreshClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getClients(200);
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

  // Filter today's clients
  const today = new Date().toISOString().split("T")[0];
  const todaysClients = clients.filter(c => c.inquiryDateAD?.startsWith(today));
  const otherClients = clients.filter(c => !c.inquiryDateAD?.startsWith(today));

  return (
    <AppLayout>
      <PageHeader 
        title="Fresh Clients" 
        subtitle="All recently added clients"
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4 animate-fade-in pb-24">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">Failed to load clients</p>
              <Button variant="outline" size="sm" onClick={fetchClients}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Clients Section */}
        {!isLoading && !error && (
          <>
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Today's Clients ({todaysClients.length})
                </h2>
                
                {todaysClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No clients added today yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {todaysClients.map((client, i) => (
                      <FreshClientCard key={i} client={client} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other Recent Clients */}
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <h2 className="font-semibold text-foreground mb-3">
                  Previous Clients ({otherClients.length})
                </h2>
                
                {otherClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No previous clients
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {otherClients.map((client, i) => (
                      <FreshClientCard key={i} client={client} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
