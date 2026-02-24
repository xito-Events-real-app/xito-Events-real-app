import { useState } from "react";
import { MapPin, Phone, ExternalLink } from "lucide-react";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { AssignmentRow } from "./types";
import CrewScheduleClientSheet from "./CrewScheduleClientSheet";
import CrewScheduleEventSheet from "./CrewScheduleEventSheet";

interface Props {
  assignment: AssignmentRow;
  eventDetails?: EventDetail[];
  contactDetails?: ClientContactDetails | null;
  isLoadingDetails: boolean;
  onRequestDetails: (registeredDateTimeAD: string) => void;
  showDatePill?: boolean;
  freelancerPhones?: Map<string, string>;
  freelancerName?: string;
}

export default function EventDetailCard({ assignment, eventDetails, contactDetails, isLoadingDetails, onRequestDetails, showDatePill, freelancerPhones, freelancerName }: Props) {
  const [clientSheetOpen, setClientSheetOpen] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);

  const day = assignment.event_day || "";
  const month = parseInt(assignment.event_month || "0");
  const year = assignment.event_year || "";
  const monthName = nepaliMonthsEnglish[month - 1] || "";

  const matchingEvent = eventDetails?.find(
    e => e.eventName?.trim().toUpperCase() === assignment.event?.trim().toUpperCase()
  ) || eventDetails?.[0];

  return (
    <>
      <div className="w-full bg-white/10 backdrop-blur rounded-xl p-3 text-left">
        <div className="min-w-0">
          {showDatePill && (
            <span className="inline-block bg-gradient-to-r from-orange-500/80 to-purple-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1">
              {day} {monthName} {year}
            </span>
          )}
          <p className="text-sm font-semibold text-white truncate">
            {!showDatePill && <span className="text-emerald-400">{day} {monthName}</span>}
            {!showDatePill && <span className="text-white/30 mx-1.5">—</span>}
            <span>{assignment.event}</span>
          </p>
          {assignment.client_name && (
            <button
              onClick={() => {
                if (!eventDetails && !isLoadingDetails) onRequestDetails(assignment.registered_date_time_ad);
                setClientSheetOpen(true);
              }}
              className="text-[10px] text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded mt-1 inline-block hover:bg-violet-500/30 transition-colors"
            >
              {assignment.client_name}
            </button>
          )}
          <button
            onClick={() => {
              if (!eventDetails && !isLoadingDetails) onRequestDetails(assignment.registered_date_time_ad);
              setEventSheetOpen(true);
            }}
            className="w-full mt-2 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            {isLoadingDetails ? "Loading..." : "Full Details"}
          </button>
        </div>
      </div>

      <CrewScheduleClientSheet
        open={clientSheetOpen}
        onOpenChange={setClientSheetOpen}
        contactDetails={contactDetails}
        eventDetails={eventDetails}
        clientName={assignment.client_name || undefined}
        isLoading={isLoadingDetails}
      />

      <CrewScheduleEventSheet
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        assignment={assignment}
        eventDetail={matchingEvent}
        contactDetails={contactDetails}
        freelancerPhones={freelancerPhones}
        freelancerName={freelancerName}
        isLoading={isLoadingDetails}
      />
    </>
  );
}
