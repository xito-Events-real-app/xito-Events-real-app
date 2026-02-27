import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { getCurrentBSDate } from "@/lib/nepali-date";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";
import EventDetailCard from "./EventDetailCard";
import { AssignmentRow } from "./types";

interface Props {
  assignments: AssignmentRow[];
  eventDetailsCache: Map<string, { events: EventDetail[] }>;
  contactDetailsCache: Map<string, ClientContactDetails>;
  loadingKeys: Set<string>;
  onRequestDetails: (registeredDateTimeAD: string) => void;
  freelancerPhones?: Map<string, string>;
  freelancerName?: string;
}

export default function UpcomingEventsSection({ assignments, eventDetailsCache, contactDetailsCache, loadingKeys, onRequestDetails, freelancerPhones, freelancerName }: Props) {
  const upcomingEvents = useMemo(() => {
    const today = getCurrentBSDate();
    const tY = today.year;
    const tM = today.month;
    const tD = today.day as number;

    return assignments
      .filter(a => {
        // Skip unknown-day events
        if (!a.event_day || a.event_day.includes('**')) return false;
        
        const y = parseInt(a.event_year || "0");
        const m = parseInt(a.event_month || "0");
        const d = parseInt(a.event_day || "0");
        return y > tY || (y === tY && m > tM) || (y === tY && m === tM && d >= tD);
      })
      .sort((a, b) => {
        const ay = parseInt(a.event_year || "0"), am = parseInt(a.event_month || "0"), ad = parseInt(a.event_day || "0");
        const by = parseInt(b.event_year || "0"), bm = parseInt(b.event_month || "0"), bd = parseInt(b.event_day || "0");
        return ay !== by ? ay - by : am !== bm ? am - bm : ad - bd;
      });
  }, [assignments]);

  if (upcomingEvents.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-bold text-white">Upcoming Events</h2>
        <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {upcomingEvents.length}
        </span>
      </div>
      <div className="space-y-2">
        {upcomingEvents.map((ev, i) => {
          const cached = eventDetailsCache.get(ev.registered_date_time_ad);
          const contact = contactDetailsCache.get(ev.registered_date_time_ad);
          return (
            <EventDetailCard
              key={`${ev.registered_date_time_ad}-${ev.event}-${i}`}
              assignment={ev}
              eventDetails={cached?.events}
              contactDetails={contact}
              isLoadingDetails={loadingKeys.has(ev.registered_date_time_ad)}
              onRequestDetails={onRequestDetails}
              showDatePill
              freelancerPhones={freelancerPhones}
              freelancerName={freelancerName}
            />
          );
        })}
      </div>
    </div>
  );
}
