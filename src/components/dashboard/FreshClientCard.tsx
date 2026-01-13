import { useState } from "react";
import { ClientData, updateClientStatus, getCurrentStatus } from "@/lib/sheets-api";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FreshClientCardProps {
  client: ClientData;
  onClick?: (client: ClientData) => void;
  statusOptions: string[];
  onStatusChange?: (client: ClientData, newStatus: string, newStatusLog: string) => void;
}

export function FreshClientCard({ client, onClick, statusOptions, onStatusChange }: FreshClientCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatusLog, setCurrentStatusLog] = useState(client.statusLog || '');
  
  const initials = getHandlerInitials(client.whoAdded || '');
  const events = parseEventDetails(
    client.events || '',
    client.eventYear || '',
    client.eventMonth || '',
    client.eventDay || ''
  );
  const location = formatLocationDisplay(client.eventLocation || '', client.eventCity || '');
  const currentStatus = getCurrentStatus(currentStatusLog);

  const handleClick = () => {
    if (onClick) {
      onClick(client);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation();
    
    if (!client.rowNumber) {
      toast.error("Cannot update: missing row number");
      return;
    }

    if (newStatus.toUpperCase() === currentStatus) {
      return; // Same status, no update needed
    }

    setIsUpdating(true);
    try {
      const result = await updateClientStatus(
        client.rowNumber,
        newStatus,
        currentStatusLog
      );
      setCurrentStatusLog(result.statusLog);
      toast.success(`Status updated to ${newStatus}`);
      
      if (onStatusChange) {
        onStatusChange(client, newStatus, result.statusLog);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Get status color based on current status
  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('UNTOUCHED')) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    if (s.includes('TEXTED')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (s.includes('CALL NOT')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (s.includes('CALLED') && s.includes('QUOTATION PENDING')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (s.includes('QUOTATION SENT')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
    if (s.includes('BARGAINING')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (s.includes('ADVANCE PENDING')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
    if (s.includes('BOOKED')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s.includes('CANCELLED')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s.includes('POSTPONED')) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div 
      className="flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50 active:scale-[0.98]"
      onClick={handleClick}
    >
      <div className="flex gap-3">
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

      {/* Status Dropdown - Bottom with Label */}
      <div className="flex items-center justify-between border-t border-border/30 pt-2 mt-1">
        <span className="text-xs text-muted-foreground font-medium">Client Status</span>
        <DropdownMenu>
          <DropdownMenuTrigger 
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
              getStatusColor(currentStatus),
              isUpdating && "opacity-50"
            )}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                {currentStatus}
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="max-h-60 overflow-y-auto z-50 bg-background"
          >
            {statusOptions.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={(e) => handleStatusChange(e, status)}
                className={cn(
                  "text-xs cursor-pointer",
                  status.toUpperCase() === currentStatus && "bg-primary/10 font-medium"
                )}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}