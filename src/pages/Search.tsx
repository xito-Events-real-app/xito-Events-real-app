import { useState, useEffect, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, User, Phone, MapPin, Loader2, ChevronRight, Calendar, Briefcase, MessageSquare } from "lucide-react";
import { isSheetsConfigured, ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { useCachedData } from "@/hooks/useCachedData";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { Link, useNavigate } from "react-router-dom";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";

// Helper to get month names from month numbers
function getMonthNamesFromColumn(monthCol: string): string {
  if (!monthCol) return '';
  return monthCol.split('\n')
    .map(m => {
      const num = parseInt(m.trim());
      return num >= 1 && num <= 12 ? nepaliMonthsEnglish[num - 1] : '';
    })
    .filter(Boolean)
    .join(' ');
}

// Find which field matched the search query
function getMatchedField(client: ClientData, query: string): string {
  const searchLower = query.toLowerCase();
  
  if (client.clientName?.toLowerCase().includes(searchLower)) return 'Name';
  if (client.contactNo?.includes(query)) return 'Phone';
  if (client.whatsappNo?.includes(query)) return 'WhatsApp';
  if (client.email?.toLowerCase().includes(searchLower)) return 'Email';
  if (client.events?.toLowerCase().includes(searchLower)) return 'Event';
  if (client.clientHandler?.toLowerCase().includes(searchLower)) return 'Handler';
  if (client.statusLog?.toLowerCase().includes(searchLower)) return 'Status';
  if (client.eventCity?.toLowerCase().includes(searchLower)) return 'City';
  if (client.eventLocation?.toLowerCase().includes(searchLower)) return 'Location';
  if (client.source?.toLowerCase().includes(searchLower)) return 'Source';
  if (client.description?.toLowerCase().includes(searchLower)) return 'Description';
  if (client.comments?.toLowerCase().includes(searchLower)) return 'Comments';
  
  // Check month names
  const monthNames = getMonthNamesFromColumn(client.eventMonth || '');
  if (monthNames.toLowerCase().includes(searchLower)) return 'Event Month';
  
  if (client.eventYear?.includes(query)) return 'Event Year';
  if (client.registeredDateBS?.toLowerCase().includes(searchLower)) return 'Registration';
  if (client.inquiryDateBS?.toLowerCase().includes(searchLower)) return 'Inquiry Date';
  
  return 'Match';
}

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

  // Navigate to client detail with navigation context
  const handleClientClick = (client: ClientData, resultIndex: number) => {
    const clientId = client.rowNumber || encodeURIComponent(client.registeredDateTimeAD || '');
    
    // Pass search results context for left/right navigation
    navigate(`/client-tracker/client/${clientId}`, {
      state: {
        from: 'search',
        searchQuery: query,
        resultIds: results.map(r => r.rowNumber || r.registeredDateTimeAD),
        currentIndex: resultIndex
      }
    });
  };

  // Universal search - search ALL client fields
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    
    const searchLower = query.toLowerCase();
    
    return clients.filter(client => {
      // Convert month numbers to names for searching
      const monthNames = getMonthNamesFromColumn(client.eventMonth || '');
      
      // Build a searchable string from ALL client fields
      const searchableFields = [
        // Identity
        client.clientName,
        client.contactNo,
        client.whatsappNo,
        client.email,
        
        // Source & Location
        client.source,
        client.clientLocation,
        client.currentCountry,
        client.eventLocation,
        client.eventCity,
        
        // Events & Dates
        client.events,                    // Event names (WEDDING, RECEPTION)
        client.eventYear,                 // Year (2082, 2083)
        monthNames,                       // Month names (Magh, Falgun)
        client.eventMonth,                // Month numbers
        client.eventDay,                  // Day
        client.eventDateAD,               // AD dates
        client.registeredDateBS,          // BS registration date
        client.registeredDateTimeAD,      // AD registration
        client.inquiryDateBS,             // BS inquiry date
        client.inquiryDateAD,             // AD inquiry
        client.inquiryTime,               // Time
        
        // Team & Status
        client.whoAdded,                  // Who added
        client.clientHandler,             // Handler
        client.statusLog,                 // All statuses
        
        // Notes & Comments
        client.description,               // Description notes
        client.comments,                  // Live comments
        client.mindset,                   // Mindset notes
        
        // Financial
        client.quotationData,             // Quotation info
        client.finalQuotation,            // Final quotation
        client.ourBargainedRates,         // Our rates
        client.clientBargainedRates,      // Client rates
        client.paymentsMade,              // Payment history
        client.remainingPayment,          // Remaining
        
        // Company
        client.companyName,               // Company name
        client.serviceTypes,              // Service types
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableFields.includes(searchLower);
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
        subtitle="Search everything"
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Name, phone, event, date, handler, status..."
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Search by name, phone, event, date, handler...
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
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Tap to view details
              </p>
            </div>
            {results.map((client, i) => {
              const currentStatus = getCurrentStatus(client.statusLog || "");
              const matchedField = getMatchedField(client, query);
              
              // Parse events for display
              const eventNames = client.events?.split('\n').filter(Boolean) || [];
              const firstEvent = eventNames[0] || '';
              
              return (
                <Card 
                  key={i} 
                  className="shadow-soft press-effect cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
                  onClick={() => handleClientClick(client, i)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {client.clientName}
                          </h3>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5">
                            {matchedField}
                          </Badge>
                        </div>
                        
                        {client.contactNo && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.contactNo}
                          </p>
                        )}
                        
                        {firstEvent && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {firstEvent}
                            {eventNames.length > 1 && (
                              <span className="text-xs opacity-70">+{eventNames.length - 1} more</span>
                            )}
                          </p>
                        )}
                        
                        {(client.eventLocation || client.eventCity) && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.eventCity || client.eventLocation}
                          </p>
                        )}
                        
                        {client.clientHandler && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {client.clientHandler}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {client.registeredDateBS || client.registeredDateTimeAD?.split("T")[0]}
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
