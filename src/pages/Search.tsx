import { useState, useEffect, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon, User, Phone, MapPin, Loader2, ChevronRight } from "lucide-react";
import { isSheetsConfigured, ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { useCachedData } from "@/hooks/useCachedData";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { Link, useNavigate } from "react-router-dom";

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { 
    clients, 
    isLoading, 
    isFromCache, 
    isSyncing, 
    lastSyncedAt,
    pendingSyncs 
  } = useCachedData();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isConfigured = isSheetsConfigured();

  const handleClientClick = (client: ClientData) => {
    const currentStatus = getCurrentStatus(client.statusLog || "");
    if (currentStatus) {
      navigate(`/fresh-clients?category=${encodeURIComponent(currentStatus)}`);
    } else {
      navigate("/fresh-clients");
    }
  };

  // Search from cached data locally (instant search)
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    
    const searchLower = query.toLowerCase();
    
    return clients.filter(client => {
      const nameMatch = client.clientName?.toLowerCase().includes(searchLower);
      const phoneMatch = client.contactNo?.includes(query);
      const locationMatch = client.eventLocation?.toLowerCase().includes(searchLower);
      const cityMatch = client.eventCity?.toLowerCase().includes(searchLower);
      
      return nameMatch || phoneMatch || locationMatch || cityMatch;
    });
  }, [query, clients]);

  const hasSearched = query.trim().length >= 2;

  return (
    <AppLayout>
      {/* Sync Status Indicator */}
      <SyncStatusIndicator 
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        isFromCache={isFromCache}
        lastSyncedAt={lastSyncedAt}
        isOnline={isOnline}
      />

      <PageHeader 
        title="Search Clients" 
        subtitle="Find by name or phone"
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {isLoading && clients.length === 0 && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Not Configured */}
        {!isConfigured && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/settings" className="text-primary underline">Configure Google Sheets</Link> to enable search
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!query && isConfigured && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl gradient-secondary flex items-center justify-center mx-auto mb-4 opacity-50">
              <SearchIcon className="w-8 h-8 text-white" />
            </div>
            <p className="text-muted-foreground">
              Start typing to search clients
            </p>
            {isFromCache && (
              <p className="text-xs text-muted-foreground mt-2">
                Searching from {clients.length} cached clients
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {hasSearched && query && results.length === 0 && (
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                No clients found matching "{query}"
              </p>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground px-1">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((client, i) => {
              const currentStatus = getCurrentStatus(client.statusLog || "");
              return (
                <Card 
                  key={i} 
                  className="shadow-soft press-effect cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleClientClick(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {client.clientName}
                        </h3>
                        {client.contactNo && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.contactNo}
                          </p>
                        )}
                        {client.eventLocation && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.eventLocation} {client.eventCity && `- ${client.eventCity}`}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            Added: {client.registeredDateBS || client.registeredDateTimeAD?.split("T")[0]}
                          </p>
                          {currentStatus && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {currentStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
