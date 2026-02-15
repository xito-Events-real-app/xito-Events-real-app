import { EventDetail } from "@/hooks/useEventDetails";
import { ClientContactDetails } from "@/lib/client-contact-api";

export interface AssignmentRow {
  event_year: string | null;
  event_month: string | null;
  event_day: string | null;
  event: string;
  client_name: string | null;
  registered_date_time_ad: string;
}

export interface CachedEventDetails {
  events: EventDetail[];
}

export interface CachedContactDetails extends ClientContactDetails {}

export interface DetailsCacheState {
  eventDetails: Map<string, CachedEventDetails>;
  contactDetails: Map<string, ClientContactDetails>;
  loading: Set<string>;
}
