import { useNavigate, useLocation } from "react-router-dom";
import { getClientDetailPath } from "@/lib/client-navigation";
import { Phone, MessageCircle, MapPin, Building2, Navigation } from "lucide-react";

export interface CalendarClientInfo {
  clientName: string;
  eventName: string;
  registeredDateTimeAD?: string;
  originalRowNumber?: number;
  contactNo?: string;
  whatsappNo?: string;
  eventLocation?: string;
  eventCity?: string;
  venueName?: string;
  venueArea?: string;
}

interface CalendarDayPopupProps {
  monthName: string;
  day: number;
  year: number;
  clients: CalendarClientInfo[];
}

export function CalendarDayPopup({ monthName, day, year, clients }: CalendarDayPopupProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (clients.length === 0) return null;

  return (
    <div className="calendar-bubble absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 min-w-[340px] max-w-[420px]">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            {monthName} {day}, {year}
          </p>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {clients.length} event{clients.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Client entries */}
        {clients.map((client, idx) => (
          <div
            key={`${client.clientName}-${idx}`}
            className="rounded-lg border border-border/60 p-3 hover:bg-primary/5 hover:border-primary/30 transition-all space-y-2"
          >
            {/* Event + Client Name - Clickable */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(getClientDetailPath(client), { state: { from: location.pathname } });
              }}
              className="flex items-start gap-2 w-full text-left hover:text-primary transition-colors group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold group-hover:text-primary transition-colors">{client.clientName}</p>
                <p className="text-xs text-muted-foreground">{client.eventName}</p>
              </div>
            </button>

            {/* Details grid */}
            <div className="grid gap-1.5 pl-4">
              {/* Venue */}
              {client.venueName && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="font-medium">{client.venueName}</span>
                  {client.venueArea && (
                    <span className="text-muted-foreground">• {client.venueArea}</span>
                  )}
                </div>
              )}

              {/* Location */}
              {(client.eventCity || client.eventLocation) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{client.eventCity}{client.eventCity && client.eventLocation ? ` (${client.eventLocation})` : client.eventLocation}</span>
                </div>
              )}

              {/* Contact + WhatsApp row */}
              <div className="flex items-center gap-3 flex-wrap">
                {client.contactNo && (
                  <a
                    href={`tel:${client.contactNo}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{client.contactNo}</span>
                  </a>
                )}

                {client.whatsappNo && (
                  <a
                    href={`https://wa.me/${client.whatsappNo.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3 shrink-0" />
                    <span>{client.whatsappNo}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Arrow pointing down */}
      <div className="flex justify-center">
        <div className="w-3 h-3 bg-card border-r border-b border-border rotate-45 -mt-1.5" />
      </div>
    </div>
  );
}
