import { useNavigate, useLocation } from "react-router-dom";
import { getClientDetailPath } from "@/lib/client-navigation";
import { Phone, MessageCircle, MapPin } from "lucide-react";

export interface CalendarClientInfo {
  clientName: string;
  eventName: string;
  registeredDateTimeAD?: string;
  originalRowNumber?: number;
  contactNo?: string;
  whatsappNo?: string;
  eventLocation?: string;
  eventCity?: string;
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
    <div className="calendar-bubble absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[300px]">
      <div className="bg-card border border-border rounded-xl shadow-xl p-3 space-y-1.5">
        {/* Header */}
        <p className="text-xs font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {monthName} {day}, {year}
          <span className="text-muted-foreground font-normal ml-auto">{clients.length} event{clients.length > 1 ? 's' : ''}</span>
        </p>

        {/* Client entries */}
        {clients.map((client, idx) => (
          <div
            key={`${client.clientName}-${idx}`}
            className="rounded-lg border border-border/50 p-2 hover:bg-primary/5 transition-colors space-y-1"
          >
            {/* Event + Client Name - Clickable */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(getClientDetailPath(client), { state: { from: location.pathname } });
              }}
              className="flex items-center gap-1.5 w-full text-left text-xs font-semibold hover:text-primary transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="truncate">{client.eventName}</span>
              <span className="text-muted-foreground font-normal truncate">— {client.clientName}</span>
            </button>

            {/* Details row */}
            <div className="flex items-center gap-2 pl-3.5 flex-wrap">
              {/* Location */}
              {(client.eventCity || client.eventLocation) && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[100px]">{client.eventCity || client.eventLocation}</span>
                </span>
              )}

              {/* Contact */}
              {client.contactNo && (
                <a
                  href={`tel:${client.contactNo}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
                  title={`Call ${client.contactNo}`}
                >
                  <Phone className="w-2.5 h-2.5 shrink-0" />
                  <span>{client.contactNo}</span>
                </a>
              )}

              {/* WhatsApp */}
              {client.whatsappNo && (
                <a
                  href={`https://wa.me/${client.whatsappNo.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-[10px] text-green-600 hover:text-green-700 transition-colors"
                  title={`WhatsApp ${client.whatsappNo}`}
                >
                  <MessageCircle className="w-2.5 h-2.5 shrink-0" />
                  <span>{client.whatsappNo}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Arrow pointing down */}
      <div className="flex justify-center">
        <div className="w-2.5 h-2.5 bg-card border-r border-b border-border rotate-45 -mt-1.5" />
      </div>
    </div>
  );
}
