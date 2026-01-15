import { useState, useMemo } from "react";
import { ClientData, updateClientStatus, updateClientHandler, logCallAttempt, getCurrentStatus } from "@/lib/sheets-api";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay } from "@/lib/nepali-months";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2, Clock, AlertTriangle, UserCog, Phone, MessageCircle, Edit, History, Bell, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Parse call log to get structured entries
interface CallEntry {
  number: number;
  type: string;
  time: string;
  date: string;
  label: string;
  timestamp: Date | null;
}

// Safari-compatible time parsing helper
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  // Parse "12:53 PM" or "1:30 AM" format
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return { hours, minutes };
}

function parseCallLog(callLog: string): CallEntry[] {
  if (!callLog) return [];
  const lines = callLog.split('\n').filter(Boolean);
  return lines.map(line => {
    // Parse "1ST DIRECT CALL AT 12:53 PM ON 2026-01-16"
    const match = line.match(/(\d+)(?:ST|ND|RD|TH)\s+(DIRECT|WHATSAPP)\s+CALL\s+AT\s+(.+)\s+ON\s+(.+)/i);
    if (match) {
      const [, num, type, time, date] = match;
      let timestamp: Date | null = null;
      try {
        // Safari-compatible date parsing
        const timeParsed = parseTimeString(time.trim());
        const dateParts = date.trim().split('-');
        if (timeParsed && dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
          const day = parseInt(dateParts[2]);
          timestamp = new Date(year, month, day, timeParsed.hours, timeParsed.minutes);
          if (isNaN(timestamp.getTime())) timestamp = null;
        }
      } catch {
        timestamp = null;
      }
      return {
        number: parseInt(num),
        type: type.toUpperCase(),
        time,
        date,
        label: line,
        timestamp
      };
    }
    return { number: 0, type: '', time: '', date: '', label: line, timestamp: null };
  });
}

// Get time since last call - returns both display text and hours for reminder check
function getLastCallInfo(callLog: string): { displayText: string; hoursSinceLastCall: number } | null {
  const entries = parseCallLog(callLog);
  if (entries.length === 0) return null;
  
  const lastEntry = entries[entries.length - 1];
  if (!lastEntry.timestamp) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - lastEntry.timestamp.getTime();
  if (diffMs < 0) return null;
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMins = diffMins % 60;

  let displayText: string;
  if (diffDays > 0) {
    displayText = `${diffDays}D ${remainingHours}H ${remainingMins}M AGO`;
  } else if (remainingHours > 0) {
    displayText = `${remainingHours}H ${remainingMins}M AGO`;
  } else {
    displayText = `${remainingMins}M AGO`;
  }

  return { displayText, hoursSinceLastCall: diffHours + (diffMins / 60) };
}

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

// Get time since status was set (compared to now) - returns hours for reminder check
function getStatusTimeAgo(statusLog?: string): { displayText: string; timestamp: Date; hoursSinceStatus: number } | null {
  if (!statusLog) return null;
  
  const lines = statusLog.split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  
  const lastLine = lines[lines.length - 1];
  const timestamp = parseStatusTimestamp(lastLine);
  if (!timestamp) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  if (diffMs < 0) return null;
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  return {
    displayText: formatDuration(diffMs) + " AGO",
    timestamp,
    hoursSinceStatus: diffHours + (diffMins % 60) / 60
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
  onEditClick?: (client: ClientData) => void;
  statusOptions: string[];
  handlerOptions?: string[];
  currentStatusCategory?: string;
  onStatusChange?: (client: ClientData, newStatus: string, newStatusLog: string) => void;
  onHandlerChange?: (client: ClientData, handler: string) => void;
}

export function FreshClientCard({ client, onEditClick, statusOptions, handlerOptions = [], currentStatusCategory, onStatusChange, onHandlerChange }: FreshClientCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingHandler, setIsUpdatingHandler] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [currentStatusLog, setCurrentStatusLog] = useState(client.statusLog || '');
  const [currentHandler, setCurrentHandler] = useState(client.clientHandler || '');
  const [currentCallLog, setCurrentCallLog] = useState(client.callLog || '');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCallHistoryDialog, setShowCallHistoryDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // NUMBER PROVIDED post-call dialog states
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [showStatusSelectionDialog, setShowStatusSelectionDialog] = useState(false);
  
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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditClick) {
      onEditClick(client);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleStatusClick = (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation();
    
    if (!client.rowNumber) {
      toast.error("Cannot update: missing row number");
      return;
    }

    if (newStatus.toUpperCase() === currentStatus) {
      return; // Same status, no update needed
    }

    // Store pending status and show confirmation dialog
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !client.rowNumber) return;

    setIsUpdating(true);
    try {
      const result = await updateClientStatus(
        client.rowNumber,
        pendingStatus,
        currentStatusLog
      );
      setCurrentStatusLog(result.statusLog);
      toast.success(`Status updated to ${pendingStatus}`);
      
      if (onStatusChange) {
        onStatusChange(client, pendingStatus, result.statusLog);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
      setPendingStatus(null);
    }
  };

  const cancelStatusChange = () => {
    setShowConfirmDialog(false);
    setPendingStatus(null);
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

  // Call log info for CALL NOT RECEIVED category
  const callEntries = useMemo(() => parseCallLog(currentCallLog), [currentCallLog]);
  const callCount = callEntries.length;
  const lastCallInfo = useMemo(() => getLastCallInfo(currentCallLog), [currentCallLog]);
  const lastCallTimeAgo = lastCallInfo?.displayText || null;
  const isCallNotReceived = currentStatusCategory?.toUpperCase().includes('CALL NOT');
  const isNumberProvided = currentStatusCategory?.toUpperCase().includes('NUMBER PROVIDED');
  const isJustEnquired = currentStatusCategory?.toUpperCase() === 'JUST ENQUIRED';
  
  // Check if client has contact info
  const hasContactNumber = !!(client.contactNo || client.whatsappNo);
  
  // Universal action reminder: alert if >6 hours in current status
  const REMINDER_THRESHOLD_HOURS = 6;
  const STATUSES_EXCLUDED_FROM_REMINDER = ['BOOKED', 'CANCELLED'];
  
  const reminderInfo = useMemo(() => {
    const category = currentStatusCategory?.toUpperCase() || '';
    
    // Skip reminder for BOOKED and CANCELLED clients
    if (STATUSES_EXCLUDED_FROM_REMINDER.some(s => category.includes(s))) {
      return null;
    }
    
    // Special case for CALL NOT RECEIVED - use call log tracking
    if (isCallNotReceived) {
      if (callCount === 0) {
        return { show: true, message: "NO CALLS MADE YET - CALL NOW!" };
      }
      if (lastCallInfo && lastCallInfo.hoursSinceLastCall >= REMINDER_THRESHOLD_HOURS) {
        return { show: true, message: `CALL REMINDER: ${REMINDER_THRESHOLD_HOURS}+ HOURS SINCE LAST CALL` };
      }
      return null;
    }
    
    // For all other categories - check time since status was set
    if (!statusTimeAgo || statusTimeAgo.hoursSinceStatus < REMINDER_THRESHOLD_HOURS) {
      return null;
    }
    
    // Generate category-specific message
    let message = `ACTION NEEDED: ${REMINDER_THRESHOLD_HOURS}+ HOURS IN THIS STATUS`;
    
    if (category.includes('JUST ENQUIRED')) {
      message = "ACTION NEEDED: Client waiting 6+ hours!";
    } else if (category.includes('NUMBER PROVIDED')) {
      message = "FOLLOW UP NEEDED: 6+ hours since number provided!";
    } else if (category.includes('TEXTED')) {
      message = "NO RESPONSE: 6+ hours since texted!";
    } else if (category.includes('BARGAINING')) {
      message = "FOLLOW UP: Bargaining ongoing 6+ hours!";
    } else if (category.includes('ADVANCE')) {
      message = "URGENT: Advance pending 6+ hours!";
    } else if (category.includes('POSTPONED')) {
      message = "RE-ENGAGE: Client postponed 6+ hours ago!";
    }
    
    return { show: true, message };
  }, [currentStatusCategory, isCallNotReceived, callCount, lastCallInfo, statusTimeAgo]);

  // Handle call action for CALL NOT RECEIVED
  const handleCallAgain = async (e: React.MouseEvent, callType: 'DIRECT' | 'WHATSAPP') => {
    e.stopPropagation();
    
    if (!client.rowNumber) {
      toast.error("Cannot log call: missing row number");
      return;
    }

    setIsLoggingCall(true);
    try {
      const result = await logCallAttempt(client.rowNumber, callType, currentCallLog);
      setCurrentCallLog(result.callLog);
      toast.success(`${callType} call logged`);
      
      // Open the appropriate app
      if (callType === 'DIRECT' && client.contactNo) {
        window.location.href = `tel:${client.contactNo}`;
      } else if (callType === 'WHATSAPP' && client.whatsappNo) {
        const cleanNumber = client.whatsappNo.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
      }
    } catch (err) {
      console.error("Failed to log call:", err);
      toast.error("Failed to log call");
    } finally {
      setIsLoggingCall(false);
    }
  };

  // Handle call action for NUMBER PROVIDED and JUST ENQUIRED (with post-call follow-up)
  const handleCallWithFollowUp = async (e: React.MouseEvent, callType: 'DIRECT' | 'WHATSAPP') => {
    e.stopPropagation();
    
    if (!client.rowNumber) {
      toast.error("Cannot log call: missing row number");
      return;
    }

    setIsLoggingCall(true);
    try {
      // Log the call to Column Y
      const result = await logCallAttempt(client.rowNumber, callType, currentCallLog);
      setCurrentCallLog(result.callLog);
      toast.success(`${callType} call logged`);
      
      // Open the appropriate app
      if (callType === 'DIRECT' && client.contactNo) {
        window.location.href = `tel:${client.contactNo}`;
      } else if (callType === 'WHATSAPP' && client.whatsappNo) {
        const cleanNumber = client.whatsappNo.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
      }
      
      // Show post-call dialog after a short delay (to allow phone app to open)
      setTimeout(() => {
        setShowPostCallDialog(true);
      }, 500);
      
    } catch (err) {
      console.error("Failed to log call:", err);
      toast.error("Failed to log call");
    } finally {
      setIsLoggingCall(false);
    }
  };

  // Handle "Ask for Number" - Open Business Suite
  const handleAskForNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Try to open Business Suite app (Facebook/Meta Business Suite)
    // On mobile, this will attempt to open the app or redirect to the web version
    window.open('fb://business_suite', '_blank');
    // Fallback to web version after a short delay if app doesn't open
    setTimeout(() => {
      window.open('https://business.facebook.com', '_blank');
    }, 300);
  };

  // Handle "No" - Client didn't pick up
  const handleCallNotPicked = () => {
    setShowPostCallDialog(false);
    // Offer to move to CALL NOT RECEIVED
    setPendingStatus('CALL NOT RECEIVED');
    setShowConfirmDialog(true);
  };

  // Handle "Yes" - Client picked up
  const handleCallPicked = () => {
    setShowPostCallDialog(false);
    setShowStatusSelectionDialog(true);
  };

  // Handle status selection after call was picked
  const handleNewStatusSelection = (newStatus: string) => {
    setShowStatusSelectionDialog(false);
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  };

  return (
    <div 
      className="flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-border/50"
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

        {/* Right Side Container - Call Again Button + Location Badge */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {/* CALL Button - For JUST ENQUIRED (Green) - Only if has contact number */}
          {isJustEnquired && hasContactNumber && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoggingCall}
                >
                  {isLoggingCall ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem 
                  onClick={(e) => handleCallWithFollowUp(e, 'DIRECT')}
                  className="cursor-pointer"
                >
                  <Phone className="w-4 h-4 mr-2" /> Direct Call
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => handleCallWithFollowUp(e, 'WHATSAPP')}
                  className="cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* ASK FOR NUMBER Button - For JUST ENQUIRED without contact */}
          {isJustEnquired && !hasContactNumber && (
            <Button 
              variant="default" 
              size="sm" 
              className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleAskForNumber}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Ask for Number
            </Button>
          )}

          {/* CALL Button - For NUMBER PROVIDED (Green) */}
          {isNumberProvided && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoggingCall}
                >
                  {isLoggingCall ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem 
                  onClick={(e) => handleCallWithFollowUp(e, 'DIRECT')}
                  className="cursor-pointer"
                >
                  <Phone className="w-4 h-4 mr-2" /> Direct Call
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => handleCallWithFollowUp(e, 'WHATSAPP')}
                  className="cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* CALL AGAIN Button - Only for CALL NOT RECEIVED (Red) */}
          {isCallNotReceived && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoggingCall}
                >
                  {isLoggingCall ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-3 h-3 mr-1" />
                      Call Again
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem 
                  onClick={(e) => handleCallAgain(e, 'DIRECT')}
                  className="cursor-pointer"
                >
                  <Phone className="w-4 h-4 mr-2" /> Direct Call
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => handleCallAgain(e, 'WHATSAPP')}
                  className="cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Location Badge */}
          {location && (
            <div className="text-right">
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
                  onClick={(e) => handleStatusClick(e, status)}
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

      {/* Universal Action Reminder Alert */}
      {reminderInfo?.show && (
        <div className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/30 px-2 py-2 rounded-md border border-red-300 dark:border-red-700 animate-pulse">
          <Bell className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="font-semibold text-red-700 dark:text-red-400">
            ⚠️ {reminderInfo.message}
          </span>
        </div>
      )}

      {/* Call Tracking Info - Only for CALL NOT RECEIVED */}
      {isCallNotReceived && (
        <div className="flex flex-col gap-1.5 text-xs bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-md border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <span className="font-medium text-orange-700 dark:text-orange-400">
              CALLED: {callCount} {callCount === 1 ? 'TIME' : 'TIMES'}
            </span>
            {callCount > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCallHistoryDialog(true);
                }}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {lastCallTimeAgo && (
            <div className="text-sm font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800/40 px-2 py-1 rounded">
              🕐 LAST CALLED {lastCallTimeAgo}
            </div>
          )}
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
        
        {/* ADDED X AGO - Right (for JUST ENQUIRED only) */}
        {currentStatusCategory === 'JUST ENQUIRED' && enquiryInfo && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium ml-auto">
            <span>ADDED {enquiryInfo.displayText.toUpperCase().replace(' AGO', '')} AGO</span>
          </div>
        )}
        
        {/* NUMBER PROVIDED X AGO - Right (for NUMBER PROVIDED) */}
        {isNumberProvided && statusTimeAgo && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-auto">
            <span>NUMBER PROVIDED {statusTimeAgo.displayText}</span>
          </div>
        )}
        
        {/* Status Time Ago - Right (for other categories except CALL NOT RECEIVED which has its own display) */}
        {currentStatusCategory !== 'JUST ENQUIRED' && currentStatusCategory !== 'NUMBER PROVIDED' && !isCallNotReceived && statusTimeAgo && (
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

      {/* Expand/Collapse Touch Area */}
      <div 
        className="flex items-center justify-center py-2 cursor-pointer border-t border-border/30 mt-1 hover:bg-muted/30 rounded-md transition-colors"
        onClick={toggleExpand}
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground ml-1">
          {isExpanded ? "Tap to collapse" : "Tap to expand"}
        </span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 pt-3 border-t border-border/50 space-y-3 animate-fade-in">
          {/* Contact Information */}
          <div className="space-y-2">
            {client.contactNo && (
              <a 
                href={`tel:${client.contactNo}`} 
                className="flex items-center gap-2 text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-4 h-4" />
                {client.contactNo}
              </a>
            )}
            {client.whatsappNo && (
              <a 
                href={`https://wa.me/${client.whatsappNo.replace(/\D/g, '')}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="w-4 h-4" />
                {client.whatsappNo}
              </a>
            )}
          </div>
          
          {/* Location Details */}
          {client.currentCountry && (
            <div className="text-sm">
              <span className="text-muted-foreground">Location:</span> {client.currentCountry}
            </div>
          )}
          
          {/* Full Event Details */}
          {events.length > 0 && (
            <div className="text-sm space-y-1">
              <span className="text-muted-foreground font-medium">All Events:</span>
              {events.map((event, i) => (
                <p key={i} className="text-sm pl-2 text-foreground">
                  {event.year} {event.monthName} {event.day} - {event.eventName}
                </p>
              ))}
            </div>
          )}
          
          {/* Description */}
          {client.description && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes:</span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">{client.description}</p>
            </div>
          )}
          
          {/* Edit Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleEditClick}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Client
          </Button>
        </div>
      )}

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Do you want to change status of <strong className="text-foreground">{client.clientName}</strong> to <strong className="text-foreground">{pendingStatus?.toUpperCase()}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange}>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Call History Dialog */}
      <Dialog open={showCallHistoryDialog} onOpenChange={setShowCallHistoryDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Call History - {client.clientName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {callEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No calls logged yet</p>
            ) : (
              callEntries.map((entry, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "text-sm px-3 py-2 rounded-md",
                    entry.type === 'WHATSAPP' 
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {entry.type === 'WHATSAPP' ? (
                      <MessageCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Phone className="w-3.5 h-3.5" />
                    )}
                    <span className="font-medium">{entry.label}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-Call Follow-up Dialog - NUMBER PROVIDED */}
      <AlertDialog open={showPostCallDialog} onOpenChange={setShowPostCallDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-600" />
              Call Follow-up
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Did <strong className="text-foreground">{client.clientName}</strong> pick your call?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCallNotPicked}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleCallPicked} className="bg-emerald-600 hover:bg-emerald-700">
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Selection Dialog - After call picked */}
      <Dialog open={showStatusSelectionDialog} onOpenChange={setShowStatusSelectionDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>What is the new status for this client?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {statusOptions
              .filter(status => !['JUST ENQUIRED', 'NUMBER PROVIDED'].includes(status.toUpperCase()))
              .map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left",
                    getStatusColor(status)
                  )}
                  onClick={() => handleNewStatusSelection(status)}
                >
                  {status}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}