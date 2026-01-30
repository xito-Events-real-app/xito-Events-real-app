import { Link } from "react-router-dom";
import { useBookedCachedData } from "@/hooks/useBookedCachedData";
import { useBulkEventDetails } from "@/hooks/useBulkEventDetails";
import { Calendar, Sparkles, ArrowRight, Clock, MapPin, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Helper to get upcoming events
function getUpcomingEvents(clients: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const events: { client: any; eventName: string; eventDate: Date; daysUntil: number; dateStr: string; eventIndex: number }[] = [];
  
  clients.forEach(client => {
    const eventDates = client.eventDateAD?.split('\n') || [];
    const eventNames = client.event?.split('\n') || [];
    
    eventDates.forEach((dateStr: string, idx: number) => {
      if (!dateStr?.trim()) return;
      
      const eventDate = new Date(dateStr.trim());
      if (isNaN(eventDate.getTime())) return;
      
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include future events (including today)
      if (daysUntil >= 0) {
        events.push({
          client,
          eventName: eventNames[idx] || eventNames[0] || 'Event',
          eventDate,
          daysUntil,
          dateStr: dateStr.trim(),
          eventIndex: idx
        });
      }
    });
  });
  
  // Sort by date (soonest first)
  return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

// Format days until
function formatDaysUntil(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

// Format venue/parlour display
function formatVenueDisplay(name: string, area: string, city: string): string {
  if (!name) return '';
  const parts = [name];
  if (area) parts.push(area);
  if (city && city !== area) parts.push(city);
  return parts.join(', ');
}

// Format time range
function formatTimeRange(start: string, end: string): string {
  if (!start && !end) return '';
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export function TodayEventsHero() {
  const { clients: bookedClients, isLoading } = useBookedCachedData();
  const upcomingEvents = useMemo(() => getUpcomingEvents(bookedClients), [bookedClients]);
  
  // Extract unique client IDs for bulk fetch (limit to first 30 events)
  const clientIds = useMemo(() => {
    const limitedEvents = upcomingEvents.slice(0, 30);
    return [...new Set(limitedEvents.map(e => e.client.registeredDateTimeAD || '').filter(Boolean))];
  }, [upcomingEvents]);
  
  const { eventDetailsMap, isLoading: isLoadingDetails } = useBulkEventDetails(clientIds);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  const hasEvents = upcomingEvents.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm">
      {/* Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
        hasEvents 
          ? "from-emerald-500 to-teal-600" 
          : "from-gray-300 to-gray-400"
      )} />

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8 pl-5 md:pl-7">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
            hasEvents 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
              : "bg-gradient-to-br from-gray-400 to-gray-500"
          )}>
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Upcoming Events
            </h2>
            <p className="text-sm text-gray-500">
              {hasEvents 
                ? `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} scheduled`
                : "No upcoming events"
              }
            </p>
          </div>
        </div>

        {/* Events List - Scrollable with fixed height container */}
        {hasEvents ? (
          <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-3">
              {upcomingEvents.slice(0, 30).map((event, idx) => {
                  const clientId = event.client.registeredDateTimeAD || event.client.originalRowNumber;
                  const isToday = event.daysUntil === 0;
                  const isTomorrow = event.daysUntil === 1;
                  const isUrgent = event.daysUntil <= 3;
                  
                  // Get event details from bulk fetch
                  const clientDetails = eventDetailsMap[event.client.registeredDateTimeAD || ''] || [];
                  const eventDetail = clientDetails.find(d => d.eventIndex === event.eventIndex);
                  
                  const venueDisplay = eventDetail ? formatVenueDisplay(
                    eventDetail.venueName, 
                    eventDetail.venueArea, 
                    eventDetail.venueCity
                  ) : '';
                  const venueTime = eventDetail ? formatTimeRange(
                    eventDetail.eventStartTime, 
                    eventDetail.eventEndTime
                  ) : '';
                  const parlourDisplay = eventDetail ? formatVenueDisplay(
                    eventDetail.parlourName, 
                    eventDetail.parlourArea, 
                    eventDetail.parlourCity
                  ) : '';
                  const parlourTime = eventDetail ? formatTimeRange(
                    eventDetail.parlourStartTime, 
                    eventDetail.parlourEndTime
                  ) : '';
                  
                  const hasVenue = Boolean(venueDisplay);
                  const hasParlour = Boolean(parlourDisplay);
                  const hasDetails = hasVenue || hasParlour;
                  
                  return (
                    <Link 
                      key={`${event.client.clientName}-${event.dateStr}-${idx}`}
                      to={`/client-tracker/client/${encodeURIComponent(clientId)}`}
                      className="block p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300 transition-all group"
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          {isToday ? (
                            <>
                              <Sparkles className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs font-medium text-white uppercase tracking-wide px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm">
                                TODAY
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                isTomorrow 
                                  ? "bg-amber-100 text-amber-700"
                                  : isUrgent
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-100 text-gray-600"
                              )}>
                                {formatDaysUntil(event.daysUntil)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-semibold truncate group-hover:text-emerald-700 transition-colors">
                            {event.client.clientName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {event.eventName}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                      
                      {/* Event Details - Venue & Parlour */}
                      {hasDetails && (
                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
                          {/* Venue */}
                          <div className="flex items-start gap-2 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              {hasVenue ? (
                                <>
                                  <span className="text-gray-700 font-medium">{venueDisplay}</span>
                                  {venueTime && (
                                    <span className="text-gray-500 ml-1.5">• {venueTime}</span>
                                  )}
                                  {eventDetail?.guestCount && (
                                    <span className="text-gray-400 ml-1.5">({eventDetail.guestCount} guests)</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400 italic">Venue not set</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Parlour */}
                          <div className="flex items-start gap-2 text-xs">
                            <Scissors className="w-3.5 h-3.5 text-pink-500 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              {hasParlour ? (
                                <>
                                  <span className="text-gray-700 font-medium">{parlourDisplay}</span>
                                  {parlourTime && (
                                    <span className="text-gray-500 ml-1.5">• {parlourTime}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400 italic">Parlour not set</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Loading indicator for details */}
                      {isLoadingDetails && !hasDetails && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                        </div>
                      )}
                    </Link>
                  );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-gray-500 text-sm">
              All caught up! No upcoming events scheduled. Check the Booked Clients module to add new events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
