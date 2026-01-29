import { MapPin, ExternalLink } from "lucide-react";
import { EventDetailsData, EventDetail } from "@/hooks/useEventDetails";
import { getMonthName } from "@/lib/nepali-months";

interface ClientEventsData {
  events: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
}

interface DashboardEventDetailsProps {
  eventDetailsData: EventDetailsData | null;
  isLoading?: boolean;
  clientEvents?: ClientEventsData;
}

// Build basic events from client data when no detailed event data exists
function buildBasicEvents(clientData?: ClientEventsData): EventDetail[] {
  if (!clientData?.events) return [];
  
  const names = clientData.events.split('\n');
  const years = clientData.eventYear?.split('\n') || [];
  const months = clientData.eventMonth?.split('\n') || [];
  const days = clientData.eventDay?.split('\n') || [];
  
  return names
    .map((name, i) => ({
      eventIndex: i,
      eventName: name.trim(),
      eventYear: years[i]?.trim() || '',
      eventMonth: months[i]?.trim() || '',
      eventDay: days[i]?.trim() || '',
      eventDateAD: '',
      // All logistics fields empty for non-booked clients
      venueType: '',
      venueName: '',
      venueArea: '',
      venueCity: '',
      venueMap: '',
      eventStartTime: '',
      eventEndTime: '',
      parlourType: '',
      parlourName: '',
      parlourArea: '',
      parlourCity: '',
      parlourMap: '',
      parlourStartTime: '',
      parlourEndTime: '',
      doGroomComeInMehndi: '',
      guestCount: '',
      eventDemands: [],
      eventReferences: []
    }))
    .filter(e => e.eventName);
}

// Format time for display (e.g., "8:00 AM")
function formatTime(time: string): string {
  if (!time) return '';
  if (time.includes('AM') || time.includes('PM')) return time;
  
  const match = time.match(/(\d{1,2}):?(\d{2})?/);
  if (match) {
    let hours = parseInt(match[1]);
    const mins = match[2] || '00';
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins} ${isPM ? 'PM' : 'AM'}`;
  }
  return time;
}

const DashboardEventDetails = ({ eventDetailsData, isLoading, clientEvents }: DashboardEventDetailsProps) => {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 mt-4 animate-pulse">
        <div className="h-5 bg-slate-700 rounded w-28 mb-3" />
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="w-1/4 h-12 bg-slate-700 rounded" />
            <div className="w-3/4 h-12 bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Use detailed event data if available, otherwise build from client events
  const events = eventDetailsData?.events?.length 
    ? eventDetailsData.events 
    : buildBasicEvents(clientEvents);

  if (!events.length) {
    return null;
  }

  return (
    <div className="bg-slate-800/60 rounded-xl p-4 mt-4 border border-slate-700/50">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
        Event Details
      </h3>

      <div className="space-y-3">
        {events.map((event, idx) => {
          const monthName = getMonthName(parseInt(event.eventMonth) || 0);
          
          // Build venue line
          const venueLocation = [event.venueName, event.venueArea, event.venueCity].filter(Boolean).join(', ');
          const venueTimeRange = event.eventStartTime && event.eventEndTime
            ? `${formatTime(event.eventStartTime)} - ${formatTime(event.eventEndTime)}`
            : event.eventStartTime ? formatTime(event.eventStartTime) : '';

          // Build parlour line
          const parlourLocation = [event.parlourName, event.parlourArea, event.parlourCity].filter(Boolean).join(', ');
          const parlourTimeRange = event.parlourStartTime && event.parlourEndTime
            ? `${formatTime(event.parlourStartTime)} - ${formatTime(event.parlourEndTime)}`
            : event.parlourStartTime ? formatTime(event.parlourStartTime) : '';

          return (
            <div 
              key={event.eventIndex} 
              className="flex gap-4 border-b border-slate-700/30 pb-3 last:border-0 last:pb-0"
            >
              {/* LEFT - Event Name/Date */}
              <div className="w-1/4 min-w-[100px]">
                <div className="text-sm font-bold uppercase text-emerald-400">
                  {monthName} {event.eventDay}
                </div>
                <div className="text-xs text-white/70 mt-0.5">
                  {event.eventName || 'Event'}
                </div>
              </div>

              {/* RIGHT - Venue & Parlour */}
              <div className="w-3/4 space-y-1.5">
                {/* Venue */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-amber-400">Venue:</span>
                  {venueLocation ? (
                    <>
                      <span className="text-sm font-semibold text-white">{event.venueName}</span>
                      {(event.venueArea || event.venueCity) && (
                        <span className="text-xs text-white/70">
                          {[event.venueArea, event.venueCity].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {event.venueMap && (
                        <a
                          href={event.venueMap}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                        >
                          <MapPin className="h-3 w-3" />
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {venueTimeRange && (
                        <span className="text-xs font-medium text-emerald-400">{venueTimeRange}</span>
                      )}
                      {event.guestCount && (
                        <span className="text-xs font-medium text-amber-400">({event.guestCount})</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-white/40 italic">Not set</span>
                  )}
                </div>

                {/* Parlour */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-purple-400">Parlour:</span>
                  {parlourLocation ? (
                    <>
                      <span className="text-sm font-semibold text-white">{event.parlourName}</span>
                      {(event.parlourArea || event.parlourCity) && (
                        <span className="text-xs text-white/70">
                          {[event.parlourArea, event.parlourCity].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {event.parlourMap && (
                        <a
                          href={event.parlourMap}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                        >
                          <MapPin className="h-3 w-3" />
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {parlourTimeRange && (
                        <span className="text-xs font-medium text-emerald-400">{parlourTimeRange}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-white/40 italic">Not set</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardEventDetails;
