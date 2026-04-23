import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VenueBooking } from "@/lib/xito-global-venues-api";

interface VenueBookingsPopoverProps {
  count: number;
  bookings: VenueBooking[];
}

export function VenueBookingsPopover({ count, bookings }: VenueBookingsPopoverProps) {
  if (count === 0) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
        Not booked yet
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Users className="h-3 w-3" />
          Booked {count} {count === 1 ? "time" : "times"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Booking history</p>
          <p className="text-xs text-muted-foreground">{count} client event{count === 1 ? "" : "s"}</p>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {bookings.map((b, i) => (
            <div key={i} className="px-3 py-2 text-sm">
              <div className="font-medium truncate">{b.client_name || "Unknown client"}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {b.event_name && <span className="truncate">{b.event_name}</span>}
                {b.event_date_ad && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {b.event_date_ad}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}