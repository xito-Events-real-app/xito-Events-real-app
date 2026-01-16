import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays, isToday } from "date-fns";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ChevronLeft, ChevronRight, Search, Calendar, 
  Users, Phone, MapPin, CalendarDays,
  MessageSquare, PhoneOff, FileText, SendHorizontal, 
  Scale, Clock, CheckCircle, XCircle, CalendarX
} from "lucide-react";
import { getCurrentStatus } from "@/lib/sheets-api";
import { useCachedData } from "@/hooks/useCachedData";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
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

// Get initials from name
const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function Today() {
  const navigate = useNavigate();
  const { 
    clients, 
    isLoading, 
    isFromCache, 
    isSyncing, 
    lastSyncedAt,
    pendingSyncs 
  } = useCachedData();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
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

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    const nextDate = addDays(selectedDate, 1);
    if (nextDate <= new Date()) {
      setSelectedDate(nextDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const filteredClients = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    return clients.filter(client => {
      // Match by inquiry date (AD format: yyyy-MM-dd)
      const matchesDate = client.inquiryDateAD?.startsWith(dateStr);
      
      // Match search query
      const matchesSearch = !searchQuery || 
        client.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contactNo?.includes(searchQuery) ||
        client.eventLocation?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDate && matchesSearch;
    });
  }, [clients, selectedDate, searchQuery]);

  const handleClientClick = (client: { statusLog?: string }) => {
    const currentStatus = getCurrentStatus(client.statusLog || '').toUpperCase();
    navigate(`/fresh-clients?category=${encodeURIComponent(currentStatus)}`);
  };

  const canGoForward = addDays(selectedDate, 1) <= new Date();

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

      {/* Header with Date Navigation */}
      <div className="sticky top-0 z-40 glass border-b border-border safe-top">
        <div className="px-4 py-3">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousDay}
              className="shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-foreground">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, 'EEEE')}
                {isToday(selectedDate) && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextDay}
              disabled={!canGoForward}
              className="shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Today Button (when not on today) */}
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="w-full mb-3"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Go to Today
            </Button>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {isLoading && clients.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-1">
              {searchQuery ? "No clients found" : "No clients on this date"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? "Try a different search term" 
                : `No inquiries were recorded on ${format(selectedDate, 'MMMM d, yyyy')}`
              }
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground px-1">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} 
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
            
            {filteredClients.map((client, index) => {
              const currentStatus = getCurrentStatus(client.statusLog || '').toUpperCase();
              const config = getStatusConfig(currentStatus);
              const StatusIcon = config.icon;
              const displayName = client.clientHandler || client.whoAdded || client.clientName;
              const initials = getInitials(displayName);
              
              // Parse first event
              const eventTypes = client.events?.split('\n') || [];
              const eventDates = client.eventYear?.split('\n') || [];
              const firstEvent = eventTypes[0] || 'Event';
              const firstEventDate = eventDates[0] ? `${eventDates[0]}/${client.eventMonth?.split('\n')[0] || ''}/${client.eventDay?.split('\n')[0] || ''}` : '';
              
              return (
                <Card 
                  key={index}
                  className="shadow-soft border-0 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                  onClick={() => handleClientClick(client)}
                >
                  <CardContent className="p-4">
                    {/* Status Badge - Prominent at top */}
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white mb-3",
                      config.color
                    )}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </div>
                    
                    {/* Client Info */}
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={cn(
                          "text-white font-semibold text-sm",
                          client.clientHandler ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-primary to-primary/80"
                        )}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {client.clientName || "Unknown"}
                        </h3>
                        
                        {client.contactNo && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{client.contactNo}</span>
                          </div>
                        )}
                        
                        {client.eventLocation && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{client.eventLocation}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {firstEvent}{firstEventDate && ` • ${firstEventDate}`}
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </AppLayout>
  );
}
