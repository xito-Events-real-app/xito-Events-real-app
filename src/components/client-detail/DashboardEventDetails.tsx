import { useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { EventDetail, EventDetailsData } from "@/hooks/useEventDetails";
import { getMonthName } from "@/lib/nepali-months";

interface DashboardEventDetailsProps {
  eventDetailsData: EventDetailsData | null;
  isLoading?: boolean;
}

// Format time for display (e.g., "8:00 AM")
function formatTime(time: string): string {
  if (!time) return '';
  // If already formatted, return as-is
  if (time.includes('AM') || time.includes('PM')) return time;
  
  // Try to parse 24h format
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

const DashboardEventDetails = ({ eventDetailsData, isLoading }: DashboardEventDetailsProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 mt-4 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-32 mb-4" />
        <div className="flex gap-4">
          <div className="w-1/4 space-y-2">
            <div className="h-16 bg-slate-700 rounded" />
            <div className="h-16 bg-slate-700 rounded" />
          </div>
          <div className="w-3/4 space-y-4">
            <div className="h-8 bg-slate-700 rounded" />
            <div className="h-8 bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!eventDetailsData?.events?.length) {
    return null;
  }

  const events = eventDetailsData.events;
  const selectedEvent = events[selectedIndex] || events[0];

  // Build venue line
  const venueLocation = [
    selectedEvent.venueName,
    selectedEvent.venueArea,
    selectedEvent.venueCity
  ].filter(Boolean).join(', ');

  const venueTimeRange = selectedEvent.eventStartTime && selectedEvent.eventEndTime
    ? `${formatTime(selectedEvent.eventStartTime)} - ${formatTime(selectedEvent.eventEndTime)}`
    : selectedEvent.eventStartTime 
      ? formatTime(selectedEvent.eventStartTime)
      : '';

  // Build parlour line
  const parlourLocation = [
    selectedEvent.parlourName,
    selectedEvent.parlourArea,
    selectedEvent.parlourCity
  ].filter(Boolean).join(', ');

  const parlourTimeRange = selectedEvent.parlourStartTime && selectedEvent.parlourEndTime
    ? `${formatTime(selectedEvent.parlourStartTime)} - ${formatTime(selectedEvent.parlourEndTime)}`
    : selectedEvent.parlourStartTime 
      ? formatTime(selectedEvent.parlourStartTime)
      : '';

  return (
    <div className="bg-slate-800/60 rounded-xl p-4 mt-4 border border-slate-700/50">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
        Event Details
      </h3>

      <div className="flex gap-4">
        {/* LEFT - Vertical Event Tabs */}
        <div className="w-1/4 min-w-[140px] space-y-2">
          {events.map((event, idx) => {
            const monthName = getMonthName(parseInt(event.eventMonth) || 0);
            const isSelected = idx === selectedIndex;
            
            return (
              <button
                key={event.eventIndex}
                onClick={() => setSelectedIndex(idx)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  isSelected 
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'bg-slate-700/50 text-white/80 hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-bold uppercase">
                  {monthName} {event.eventDay}
                </div>
                <div className={`text-xs mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-white/60'}`}>
                  {event.eventName || 'Event'}
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT - Venue & Parlour Details */}
        <div className="w-3/4 space-y-4">
          {/* Venue Section */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Venue
            </div>
            {venueLocation ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-base font-bold text-white">
                  {selectedEvent.venueName}
                </span>
                {(selectedEvent.venueArea || selectedEvent.venueCity) && (
                  <span className="text-base text-white/80">
                    {[selectedEvent.venueArea, selectedEvent.venueCity].filter(Boolean).join(', ')}
                  </span>
                )}
                {selectedEvent.venueMap && (
                  <a
                    href={selectedEvent.venueMap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {venueTimeRange && (
                  <span className="text-base font-medium text-emerald-400">
                    {venueTimeRange}
                  </span>
                )}
                {selectedEvent.guestCount && (
                  <span className="text-base font-medium text-amber-400">
                    ({selectedEvent.guestCount} Guests)
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-white/40 italic">No venue details</span>
            )}
          </div>

          {/* Parlour Section */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
              Parlour
            </div>
            {parlourLocation ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-base font-bold text-white">
                  {selectedEvent.parlourName}
                </span>
                {(selectedEvent.parlourArea || selectedEvent.parlourCity) && (
                  <span className="text-base text-white/80">
                    {[selectedEvent.parlourArea, selectedEvent.parlourCity].filter(Boolean).join(', ')}
                  </span>
                )}
                {selectedEvent.parlourMap && (
                  <a
                    href={selectedEvent.parlourMap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {parlourTimeRange && (
                  <span className="text-base font-medium text-emerald-400">
                    {parlourTimeRange}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-white/40 italic">No parlour details</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEventDetails;
