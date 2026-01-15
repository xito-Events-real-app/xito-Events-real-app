import { useState, useMemo } from "react";
import { ClientData, updateClientStatus, updateClientHandler, getCurrentStatus } from "@/lib/sheets-api";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Clock, AlertTriangle, UserCog } from "lucide-react";
import { toast } from "sonner";

// Format time duration as "X DAY Y HR Z MIN"
function formatDuration(diffMs: number): string {
  if (diffMs < 0) return "";
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMins = diffMins % 60;

  if (diffDays > 0) {
    return `${diffDays} DAY ${remainingHours} HR ${remainingMins} MIN`;
  } else if (remainingHours > 0) {
    return `${remainingHours} HR ${remainingMins} MIN`;
  } else {
    return `${remainingMins} MIN`;
  }
}

// Parse timestamp from status log entry like "bargaining is on - 01/13/2026, 19:43:24"
function parseStatusTimestamp(statusEntry: string): Date | null {
  try {
    // Format: "STATUS - MM/DD/YYYY, HH:MM:SS"
    const parts = statusEntry.split(' - ');
    if (parts.length < 2) return null;
    
    const timestampStr = parts[parts.length - 1].trim();
    // Parse MM/DD/YYYY, HH:MM:SS
    const dateTimeMatch = timestampStr.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
    if (!dateTimeMatch) return null;
    
    const [, month, day, year, hour, min, sec] = dateTimeMatch;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(min),
      parseInt(sec)
    );
    
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Get time since status was set (compared to now)
function getStatusTimeAgo(statusLog?: string): { displayText: string; timestamp: Date } | null {
  if (!statusLog) return null;
  
  const lines = statusLog.split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  
  const lastLine = lines[lines.length - 1];
  const timestamp = parseStatusTimestamp(lastLine);
  if (!timestamp) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  if (diffMs < 0) return null;
  
  return {
    displayText: formatDuration(diffMs) + " AGO",
    timestamp
  };
}

// Get total time from enquiry to when status was set (for ADVANCE PENDING, BOOKED, POSTPONED)
function getTotalTimeInfo(
  statusLog?: string,
  inquiryDateAD?: string,
  inquiryTime?: string,
  currentStatus?: string
): string | null {
  // Only show for specific statuses
  const showForStatuses = ['ADVANCE PENDING', 'BOOKED', 'POSTPONED'];
  if (!currentStatus || !showForStatuses.some(s => currentStatus.toUpperCase().includes(s))) {
    return null;
  }
  
  if (!inquiryDateAD || !statusLog) return null;
  
  // Parse enquiry datetime
  let enquiryDateTime: Date;
  try {
    if (inquiryTime) {
      enquiryDateTime = new Date(`${inquiryDateAD} ${inquiryTime}`);
    } else {
      enquiryDateTime = new Date(inquiryDateAD);
    }
    if (isNaN(enquiryDateTime.getTime())) return null;
  } catch {
    return null;
  }
  
  // Find when client reached current status
  const lines = statusLog.split('\n').filter(Boolean);
  let targetTimestamp: Date | null = null;
  
  for (const line of lines) {
    const statusPart = line.split(' - ')[0].trim().toUpperCase();
    if (showForStatuses.some(s => statusPart.includes(s))) {
      const timestamp = parseStatusTimestamp(line);
      if (timestamp) {
        targetTimestamp = timestamp;
        break; // Use first occurrence of target status
      }
    }
  }
  
  if (!targetTimestamp) return null;
  
  // Calculate time from enquiry to when status was set
  const diffMs = targetTimestamp.getTime() - enquiryDateTime.getTime();
  if (diffMs < 0) return null;
  
  return formatDuration(diffMs);
}

// Calculate time elapsed since inquiry
function getEnquiryTimeInfo(inquiryDateAD?: string, inquiryTime?: string) {
  if (!inquiryDateAD) return null;

  try {
    // Parse the date and time
    let inquiryDateTime: Date;
    
    if (inquiryTime) {
      // Combine date and time
      inquiryDateTime = new Date(`${inquiryDateAD} ${inquiryTime}`);
    } else {
      inquiryDateTime = new Date(inquiryDateAD);
    }

    if (isNaN(inquiryDateTime.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - inquiryDateTime.getTime();
    
    if (diffMs < 0) return null; // Future date
    
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = Math.floor(diffHours % 24);
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Format the display string
    let displayText = "";
    if (diffDays > 0) {
      displayText = `${diffDays}d ${remainingHours}h ${diffMins}m ago`;
    } else if (remainingHours > 0) {
      displayText = `${remainingHours}h ${diffMins}m ago`;
    } else {
      displayText = `${diffMins}m ago`;
    }

    // Determine urgency level
    let urgency: 'normal' | 'warning' | 'urgent' | 'critical' = 'normal';
    if (diffHours >= 24) {
      urgency = 'critical'; // Red + flashing
    } else if (diffHours >= 12) {
      urgency = 'urgent'; // Red
    } else if (diffHours >= 3) {
      urgency = 'warning'; // Orange/Yellow
    }
    // else normal = gray

    return { displayText, urgency, totalHours: diffHours };
  } catch (e) {
    console.error("Error parsing inquiry date/time:", e);
    return null;
  }
}

interface FreshClientCardProps {
  client: ClientData;
  onClick?: (client: ClientData) => void;
  statusOptions: string[];
  handlerOptions?: string[];
  currentStatusCategory?: string;
  onStatusChange?: (client: ClientData, newStatus: string, newStatusLog: string) => void;
  onHandlerChange?: (client: ClientData, handler: string) => void;
}

export function FreshClientCard({ client, onClick, statusOptions, handlerOptions = [], currentStatusCategory, onStatusChange, onHandlerChange }: FreshClientCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingHandler, setIsUpdatingHandler] = useState(false);
  const [currentStatusLog, setCurrentStatusLog] = useState(client.statusLog || '');
  const [currentHandler, setCurrentHandler] = useState(client.clientHandler || '');
  
  // Use handler initials if set, otherwise fall back to who added
  const displayInitials = getHandlerInitials(currentHandler || client.whoAdded || '');
  const hasHandler = !!currentHandler;
  
  const events = parseEventDetails(
    client.events || '',
    client.eventYear || '',
    client.eventMonth || '',
    client.eventDay || ''
  );
  const location = formatLocationDisplay(client.eventLocation || '', client.eventCity || '');
  const currentStatus = getCurrentStatus(currentStatusLog);

  // Statuses that require handler to be set (after NUMBER PROVIDED)
  const statusesRequiringHandler = ['TEXTED', 'CALL NOT PICKED', 'CALLED QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING IS ON', 'ADVANCE PENDING', 'BOOKED', 'CANCELLED', 'POSTPONED'];
  const requiresHandler = statusesRequiringHandler.some(s => currentStatus.toUpperCase().includes(s.toUpperCase()));
  const showHandlerWarning = requiresHandler && !currentHandler;

  // Show handler dropdown for NUMBER PROVIDED and after
  const statusesWithHandlerOption = ['NUMBER PROVIDED', ...statusesRequiringHandler];
  const showHandlerDropdown = currentStatusCategory && statusesWithHandlerOption.some(s => currentStatusCategory.toUpperCase().includes(s.toUpperCase()));

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

  const handleHandlerChange = async (e: React.MouseEvent, handler: string) => {
    e.stopPropagation();
    
    if (!client.rowNumber) {
      toast.error("Cannot update: missing row number");
      return;
    }

    if (handler === currentHandler) {
      return; // Same handler, no update needed
    }

    setIsUpdatingHandler(true);
    try {
      await updateClientHandler(client.rowNumber, handler);
      setCurrentHandler(handler);
      toast.success(`Handler set to ${handler}`);
      
      if (onHandlerChange) {
        onHandlerChange(client, handler);
      }
    } catch (err) {
      console.error("Failed to update handler:", err);
      toast.error("Failed to update handler");
    } finally {
      setIsUpdatingHandler(false);
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

  // Calculate enquiry time info
  const enquiryInfo = useMemo(() => 
    getEnquiryTimeInfo(client.inquiryDateAD, client.inquiryTime), 
    [client.inquiryDateAD, client.inquiryTime]
  );

  // Calculate time since status was set (compared to now)
  const statusTimeAgo = useMemo(() => 
    getStatusTimeAgo(currentStatusLog), 
    [currentStatusLog]
  );

  // Calculate total time from enquiry to status set (for specific statuses)
  const totalTimeInfo = useMemo(() => 
    getTotalTimeInfo(currentStatusLog, client.inquiryDateAD, client.inquiryTime, currentStatus), 
    [currentStatusLog, client.inquiryDateAD, client.inquiryTime, currentStatus]
  );

  return (
    <div 
      className="flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50 active:scale-[0.98]"
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Handler Initials Avatar - highlighted if handler assigned */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          hasHandler ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "gradient-primary"
        )}>
          <span className="text-xs font-bold text-white">{displayInitials}</span>
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

      {/* Status and Handler Row */}
      <div className="flex items-center justify-between border-t border-border/30 pt-2 mt-1 gap-2">
        {/* Status Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
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
              align="start" 
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

        {/* Handler Dropdown - Only show for NUMBER PROVIDED and after */}
        {showHandlerDropdown && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Handler:</span>
            <DropdownMenu>
              <DropdownMenuTrigger 
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                  currentHandler 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  isUpdatingHandler && "opacity-50"
                )}
                disabled={isUpdatingHandler}
              >
                {isUpdatingHandler ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <UserCog className="w-3 h-3" />
                    {currentHandler || "Select"}
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="max-h-60 overflow-y-auto z-50 bg-background"
              >
                {handlerOptions.map((handler) => (
                  <DropdownMenuItem
                    key={handler}
                    onClick={(e) => handleHandlerChange(e, handler)}
                    className={cn(
                      "text-xs cursor-pointer",
                      handler === currentHandler && "bg-primary/10 font-medium"
                    )}
                  >
                    {handler}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Handler Warning */}
      {showHandlerWarning && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-md">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Handler not selected</span>
        </div>
      )}

      {/* Time Information Row */}
      <div className="flex items-center justify-between pt-1 border-t border-border/20 gap-2">
        {/* Enquiry Time - Left */}
        {enquiryInfo && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            enquiryInfo.urgency === 'normal' && "text-gray-500 dark:text-gray-400",
            enquiryInfo.urgency === 'warning' && "text-amber-600 dark:text-amber-400",
            enquiryInfo.urgency === 'urgent' && "text-red-500 dark:text-red-400",
            enquiryInfo.urgency === 'critical' && "text-red-600 dark:text-red-400 animate-pulse font-medium"
          )}>
            <Clock className={cn(
              "w-3 h-3",
              enquiryInfo.urgency === 'critical' && "animate-pulse"
            )} />
            <span>Enquiry: {enquiryInfo.displayText}</span>
          </div>
        )}
        
        {/* Status Time Ago - Right */}
        {statusTimeAgo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <span>{currentStatus}: {statusTimeAgo.displayText}</span>
          </div>
        )}
      </div>

      {/* Total Time for ADVANCE PENDING, BOOKED, POSTPONED */}
      {totalTimeInfo && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
          <Clock className="w-3 h-3" />
          <span>TOTAL TIME: {totalTimeInfo}</span>
        </div>
      )}
    </div>
  );
}