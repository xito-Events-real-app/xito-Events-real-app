import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Clock, Phone, Loader2, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { nepaliMonthsEnglish } from "@/lib/nepali-date";
import { AssignmentRow } from "./types";

interface Props {
  assignment: AssignmentRow;
  eventDetails?: EventDetail[];
  contactDetails?: ClientContactDetails | null;
  isLoadingDetails: boolean;
  onRequestDetails: (registeredDateTimeAD: string) => void;
  showDatePill?: boolean;
}

function DetailRow({ label, value, isPhone, isMap }: { label: string; value?: string; isPhone?: boolean; isMap?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-white/50 text-[10px]">{label}</span>
      {isPhone ? (
        <button
          onClick={(e) => { e.stopPropagation(); openWhatsApp(value); }}
          className="text-emerald-400 text-[11px] font-medium"
        >
          {value}
        </button>
      ) : isMap ? (
        <a href={value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="text-violet-400 text-[10px] flex items-center gap-0.5">
          Open Map <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className="text-white/80 text-[11px] text-right max-w-[60%] truncate">{value}</span>
      )}
    </div>
  );
}

function ContactSection({ title, borderColor, name, contact, whatsapp, city, area }: {
  title: string; borderColor: string; name?: string; contact?: string; whatsapp?: string; city?: string; area?: string;
}) {
  if (!name && !contact && !whatsapp && !city) return null;
  return (
    <div className={`border-l-2 ${borderColor} pl-2 py-1 space-y-0.5`}>
      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{title}</p>
      <DetailRow label="Name" value={name} />
      <DetailRow label="Contact" value={contact} isPhone />
      <DetailRow label="WhatsApp" value={whatsapp} isPhone />
      {(city || area) && <DetailRow label="Location" value={[city, area].filter(Boolean).join(", ")} />}
    </div>
  );
}

function VenueSection({ title, borderColor, type, name, city, area, mapLink, startTime, endTime }: {
  title: string; borderColor: string; type?: string; name?: string; city?: string; area?: string;
  mapLink?: string; startTime?: string; endTime?: string;
}) {
  if (!name && !type && !startTime) return null;
  return (
    <div className={`border-l-2 ${borderColor} pl-2 py-1 space-y-0.5`}>
      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{title}</p>
      <DetailRow label="Type" value={type} />
      <DetailRow label="Name" value={name} />
      {(city || area) && <DetailRow label="Location" value={[city, area].filter(Boolean).join(", ")} />}
      {(startTime || endTime) && (
        <div className="flex items-center gap-1 py-0.5">
          <Clock className="w-3 h-3 text-white/40" />
          <span className="text-white/70 text-[11px]">{[startTime, endTime].filter(Boolean).join(" - ")}</span>
        </div>
      )}
      {mapLink && <DetailRow label="Map" value={mapLink} isMap />}
    </div>
  );
}

export default function EventDetailCard({ assignment, eventDetails, contactDetails, isLoadingDetails, onRequestDetails, showDatePill }: Props) {
  const [expanded, setExpanded] = useState(false);

  const day = assignment.event_day || "";
  const month = parseInt(assignment.event_month || "0");
  const year = assignment.event_year || "";
  const monthName = nepaliMonthsEnglish[month - 1] || "";

  // Find matching event detail for this specific event
  const matchingEvent = eventDetails?.find(
    e => e.eventName?.trim().toUpperCase() === assignment.event?.trim().toUpperCase()
  ) || eventDetails?.[0];

  const handleExpand = (isOpen: boolean) => {
    setExpanded(isOpen);
    if (isOpen && !eventDetails && !isLoadingDetails) {
      onRequestDetails(assignment.registered_date_time_ad);
    }
  };

  return (
    <Collapsible open={expanded} onOpenChange={handleExpand}>
      <CollapsibleTrigger asChild>
        <button className="w-full bg-white/10 backdrop-blur rounded-xl p-3 text-left transition-all hover:bg-white/15">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {showDatePill && (
                <span className="inline-block bg-gradient-to-r from-orange-500/80 to-purple-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1">
                  {day} {monthName} {year}
                </span>
              )}
              <p className="text-sm font-semibold text-white truncate">
                {!showDatePill && <span className="text-emerald-400">{day} {monthName}</span>}
                {!showDatePill && <span className="text-white/30 mx-1.5">—</span>}
                {assignment.event}
              </p>
              {assignment.client_name && (
                <span className="text-[10px] text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  {assignment.client_name}
                </span>
              )}
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-white/5 rounded-b-xl px-3 pb-3 pt-1 space-y-2 -mt-1">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              <span className="text-xs text-violet-300 ml-2">Loading details...</span>
            </div>
          ) : (
            <>
              <ContactSection
                title="Bride"
                borderColor="border-l-rose-400"
                name={contactDetails?.brideFullName}
                contact={contactDetails?.brideContactNumber}
                whatsapp={contactDetails?.brideWhatsappNumber}
                city={contactDetails?.brideHomeCity}
                area={contactDetails?.brideHomeArea}
              />
              <ContactSection
                title="Groom"
                borderColor="border-l-sky-400"
                name={contactDetails?.groomFullName}
                contact={contactDetails?.groomContactNumber}
                whatsapp={contactDetails?.groomWhatsappNumber}
                city={contactDetails?.groomHomeCity}
                area={contactDetails?.groomHomeArea}
              />
              <VenueSection
                title="Venue"
                borderColor="border-l-amber-400"
                type={matchingEvent?.venueType}
                name={matchingEvent?.venueName}
                city={matchingEvent?.venueCity}
                area={matchingEvent?.venueArea}
                mapLink={matchingEvent?.venueMap}
                startTime={matchingEvent?.eventStartTime}
                endTime={matchingEvent?.eventEndTime}
              />
              <VenueSection
                title="Parlour"
                borderColor="border-l-purple-400"
                type={matchingEvent?.parlourType}
                name={matchingEvent?.parlourName}
                city={matchingEvent?.parlourCity}
                area={matchingEvent?.parlourArea}
                mapLink={matchingEvent?.parlourMap}
                startTime={matchingEvent?.parlourStartTime}
                endTime={matchingEvent?.parlourEndTime}
              />
              {!contactDetails && !matchingEvent && (
                <p className="text-[10px] text-white/30 text-center py-2">No additional details available</p>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
