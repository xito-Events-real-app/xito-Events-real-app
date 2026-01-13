import { ClientData } from "@/lib/sheets-api";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";

interface FreshClientCardProps {
  client: ClientData;
  onClick?: (client: ClientData) => void;
}

export function FreshClientCard({ client, onClick }: FreshClientCardProps) {
  const initials = getHandlerInitials(client.whoAdded || '');
  const events = parseEventDetails(
    client.events || '',
    client.eventYear || '',
    client.eventMonth || '',
    client.eventDay || ''
  );
  const location = formatLocationDisplay(client.eventLocation || '', client.eventCity || '');

  const handleClick = () => {
    if (onClick) {
      onClick(client);
    }
  };

  return (
    <div 
      className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50 active:scale-[0.98]"
      onClick={handleClick}
    >
      {/* Handler Initials Avatar */}
      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-white">{initials}</span>
      </div>

      {/* Client Details */}
      <div className="flex-1 min-w-0">
        {/* Client Name */}
        <p className="text-sm font-semibold text-foreground truncate">
          {client.clientName}
        </p>

        {/* Event Details */}
        {events.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {events.slice(0, 3).map((event, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {event.year} {event.monthName} {event.day} {event.eventName}
              </p>
            ))}
            {events.length > 3 && (
              <p className="text-xs text-muted-foreground/70">
                +{events.length - 3} more events
              </p>
            )}
          </div>
        )}

        {/* Current City/Country */}
        {client.currentCountry && (
          <p className="text-xs text-primary/80 mt-1">
            📍 {client.currentCountry}
          </p>
        )}
      </div>

      {/* Location Badge - Right Side */}
      {location && (
        <div className="shrink-0 text-right">
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-md",
            location.type === 'IV' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            location.type === 'OV' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            location.type === 'MX' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            location.type === 'AB' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          )}>
            {location.type}
          </span>
          {location.city && (
            <p className="text-xs text-muted-foreground mt-1 max-w-20 truncate">
              {location.city}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
