import { MapPin, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventDetailsData, EventDetail } from "@/hooks/useEventDetails";
import { getMonthName } from "@/lib/nepali-months";
import { FreelancerAssignment } from "@/lib/freelancer-assignment-api";

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
  freelancerAssignments?: FreelancerAssignment[];
}

// Role config for display
const ROLE_CONFIG: { field: keyof FreelancerAssignment; label: string; color: string }[] = [
  { field: 'photographerBride', label: 'PB', color: 'text-amber-600 bg-amber-50' },
  { field: 'videographerBride', label: 'VB', color: 'text-purple-600 bg-purple-50' },
  { field: 'photographerGroom', label: 'PG', color: 'text-amber-700 bg-amber-50' },
  { field: 'videographerGroom', label: 'VG', color: 'text-purple-700 bg-purple-50' },
  { field: 'extraPhotographer', label: 'EP', color: 'text-orange-600 bg-orange-50' },
  { field: 'extraVideographer', label: 'EV', color: 'text-fuchsia-600 bg-fuchsia-50' },
  { field: 'assistant', label: 'Asst', color: 'text-emerald-600 bg-emerald-50' },
  { field: 'iphoneShooter', label: 'iPhone', color: 'text-cyan-600 bg-cyan-50' },
  { field: 'droneOperator', label: 'Drone', color: 'text-sky-600 bg-sky-50' },
  { field: 'fpvOperator', label: 'FPV', color: 'text-teal-600 bg-teal-50' },
];

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

// Find matching assignment for an event
function findAssignment(assignments: FreelancerAssignment[] | undefined, event: EventDetail): FreelancerAssignment | undefined {
  if (!assignments?.length) return undefined;
  return assignments.find(a => {
    const nameMatch = a.event?.trim().toLowerCase() === event.eventName?.trim().toLowerCase();
    const monthMatch = String(a.eventMonth)?.trim() === String(event.eventMonth)?.trim();
    const dayMatch = String(a.eventDay)?.trim() === String(event.eventDay)?.trim();
    return nameMatch && monthMatch && dayMatch;
  });
}

const DashboardEventDetails = ({ eventDetailsData, isLoading, clientEvents, freelancerAssignments }: DashboardEventDetailsProps) => {
  const navigate = useNavigate();
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

  // Merge logistics data with client events to show ALL events
  // Logistics sheet may have fewer events than client record (e.g., after adding new events)
  const logisticsEvents = eventDetailsData?.events || [];
  const basicEvents = buildBasicEvents(clientEvents);
  
  // Match logistics events to client events by name+month+day (not by index, since positions can shift)
  const events = basicEvents.length > 0
    ? basicEvents.map((basic, i) => {
        const match = logisticsEvents.find(
          le => le.eventName?.trim().toLowerCase() === basic.eventName?.trim().toLowerCase()
            && String(le.eventMonth)?.trim() === String(basic.eventMonth)?.trim()
            && String(le.eventDay)?.trim() === String(basic.eventDay)?.trim()
        );
        return match ? { ...match, eventIndex: i } : basic;
      })
    : logisticsEvents;

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

          const assignment = findAssignment(freelancerAssignments, event);
          const assignedRoles = assignment
            ? ROLE_CONFIG.filter(r => assignment[r.field] && String(assignment[r.field]).trim())
            : [];

          return (
            <div 
              key={event.eventIndex} 
              className="flex gap-4 border-b border-slate-700/30 pb-3 last:border-0 last:pb-0"
            >
              {/* LEFT - Event Name/Date */}
              <div className="w-1/5 min-w-[80px]">
                <div className="text-sm font-bold uppercase text-emerald-400">
                  {monthName} {event.eventDay}
                </div>
                <div className="text-xs text-white/70 mt-0.5">
                  {event.eventName || 'Event'}
                </div>
              </div>

              {/* MIDDLE - Venue & Parlour */}
              <div className={`${assignedRoles.length ? 'w-2/5' : 'w-4/5'} space-y-1.5`}>
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

              {/* RIGHT - Assigned Freelancers */}
              {assignedRoles.length > 0 && (
                <div className="w-2/5 space-y-1">
                  {assignedRoles.map(role => (
                    <div key={role.field} className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${role.color}`}>
                        {role.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/freelancer/${encodeURIComponent(String(assignment![role.field]))}`);
                        }}
                        className="text-xs text-white/90 truncate hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {String(assignment![role.field])}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardEventDetails;
