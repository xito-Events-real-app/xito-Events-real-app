import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon, User, Phone, MapPin, Loader2 } from "lucide-react";
import { searchClients, isSheetsConfigured, ClientData } from "@/lib/sheets-api";
import { Link } from "react-router-dom";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isConfigured = isSheetsConfigured();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2 && isConfigured) {
        setIsSearching(true);
        try {
          const clients = await searchClients(query);
          setResults(clients);
        } catch (error) {
          console.error("Search error:", error);
          setResults([]);
        } finally {
          setIsSearching(false);
          setHasSearched(true);
        }
      } else if (query.trim().length < 2) {
        setResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isConfigured]);

  return (
    <AppLayout>
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
          {isSearching && (
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
          </div>
        )}

        {/* Results */}
        {hasSearched && query && results.length === 0 && !isSearching && (
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
            {results.map((client, i) => (
              <Card key={i} className="shadow-soft press-effect cursor-pointer hover:border-primary/50 transition-colors">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Added: {client.registeredDateBS || client.registeredDateTimeAD?.split("T")[0]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
