import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { ClientData, updateClientStatus, updateClientHandler, logCallAttempt, getCurrentStatus, updateClientQuotation, updateClientMindset, updateBargainingRates, updateClientBargainedRates, updateOurCounterRates, addClientComment, updateFinalQuotation, addPayment } from "@/lib/sheets-api";
import { getHandlerInitials, parseEventDetails, formatLocationDisplay } from "@/lib/nepali-months";
import { getClientDetailPath } from "@/lib/client-navigation";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ChevronDown, ChevronUp, Loader2, Clock, AlertTriangle, UserCog, Phone, MessageCircle, Edit, History, Bell, ExternalLink, FileText, Brain, MessageSquare, Lock, Calendar, CreditCard, Plus, Banknote, CalendarDays, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NepaliDateObject, getCurrentBSDate, nepaliMonthsEnglish, bsToAD } from "@/lib/nepali-date";
import { NepaliCalendar } from "@/components/form/NepaliCalendar";
import { FinalQuotationDialog, AdvancePaymentDialog } from "@/components/status-dialogs";
import { formatNPR, parseFinalQuotation } from "@/lib/client-card-utils";
import { notifyCacheUpdate } from "@/lib/cache-manager";

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
  mindsetOptions?: string[];
  paymentTypes?: string[];
  banks?: string[];
  currentStatusCategory?: string;
  onStatusChange?: (client: ClientData, newStatus: string, newStatusLog: string) => void;
  onHandlerChange?: (client: ClientData, handler: string) => void;
  onMindsetChange?: (client: ClientData, mindset: string) => void;
  onPaymentAdded?: (client: ClientData, paymentsMade: string, remainingPayment: string) => void;
}

export function FreshClientCard({ client, onEditClick, statusOptions, handlerOptions = [], mindsetOptions = [], paymentTypes = [], banks = [], currentStatusCategory, onStatusChange, onHandlerChange, onMindsetChange, onPaymentAdded }: FreshClientCardProps) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
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
  
  // Quotation dialog states
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [quotationBasic, setQuotationBasic] = useState('');
  const [quotationStandard, setQuotationStandard] = useState('');
  const [quotationPremium, setQuotationPremium] = useState('');
  const [quotationWtnSpecial, setQuotationWtnSpecial] = useState('');
  const [isSavingQuotation, setIsSavingQuotation] = useState(false);
  const [currentQuotationData, setCurrentQuotationData] = useState(client.quotationData || '');
  
  // Mindset feature states
  const [currentMindset, setCurrentMindset] = useState(client.mindset || '');
  const [isUpdatingMindset, setIsUpdatingMindset] = useState(false);
  const [showBargainingDialog, setShowBargainingDialog] = useState(false);
  const [selectedBargainPackages, setSelectedBargainPackages] = useState<string[]>([]);
  const [clientBargainRates, setClientBargainRates] = useState<Record<string, string>>({});
  const [ourBargainRates, setOurBargainRates] = useState<Record<string, string>>({});
  const [isSavingBargain, setIsSavingBargain] = useState(false);
  const [currentOurBargainedRates, setCurrentOurBargainedRates] = useState(client.ourBargainedRates || '');
  const [currentClientBargainedRates, setCurrentClientBargainedRates] = useState(client.clientBargainedRates || '');
  
  // Comment feature states
  const [currentComments, setCurrentComments] = useState(client.comments || '');
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // Final quotation state for BOOKED clients
  const [currentFinalQuotation, setCurrentFinalQuotation] = useState(client.finalQuotation || '');
  const [showFinalQuotationDialog, setShowFinalQuotationDialog] = useState(false);
  const [newFinalQuotation, setNewFinalQuotation] = useState('');
  const [selectedFinalPackage, setSelectedFinalPackage] = useState<string>('');
  const [isSavingFinalQuotation, setIsSavingFinalQuotation] = useState(false);
  
  // Payment tracking states for BOOKED clients
  const [currentPaymentsMade, setCurrentPaymentsMade] = useState(client.paymentsMade || '');
  const [currentPaymentDatesAD, setCurrentPaymentDatesAD] = useState(client.paymentDatesAD || '');
  const [currentRemainingPayment, setCurrentRemainingPayment] = useState(client.remainingPayment || '');
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [paymentNepaliDates, setPaymentNepaliDates] = useState<NepaliDateObject[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false);
  
  // Bargaining IS ON category - dialog for client bargained rates
  const [showClientBargainDialog, setShowClientBargainDialog] = useState(false);
  const [selectedClientBargainPackages, setSelectedClientBargainPackages] = useState<string[]>([]);
  const [clientBargainPrices, setClientBargainPrices] = useState<Record<string, string>>({});
  const [isSavingClientBargain, setIsSavingClientBargain] = useState(false);
  
  // Our Counter Rate dialog states
  const [showOurCounterRateDialog, setShowOurCounterRateDialog] = useState(false);
  const [selectedCounterPackages, setSelectedCounterPackages] = useState<string[]>([]);
  const [ourCounterPrices, setOurCounterPrices] = useState<Record<string, string>>({});
  const [isSavingOurCounter, setIsSavingOurCounter] = useState(false);
  
  // ADVANCE PENDING interception state
  const [showAdvancePendingDialog, setShowAdvancePendingDialog] = useState(false);
  const [isSavingAdvancePending, setIsSavingAdvancePending] = useState(false);
  
  // BOOKED interception state
  const [showBookedPaymentDialog, setShowBookedPaymentDialog] = useState(false);
  const [isSavingBookedPayment, setIsSavingBookedPayment] = useState(false);
  
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
  
  // Check if this is BOOKED category
  const isBooked = currentStatusCategory?.toUpperCase().includes('BOOKED') || currentStatus.toUpperCase().includes('BOOKED');

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

    // INTERCEPT: If moving to QUOTATION SENT, ALWAYS show quotation dialog first
    const isToQuotationSent = newStatus.toUpperCase().includes('QUOTATION SENT');
    
    if (isToQuotationSent) {
      // Show quotation dialog - user must enter quotation before status change
      setPendingStatus(newStatus);
      setShowQuotationDialog(true);
      return;
    }
    
    // INTERCEPT: If moving to ADVANCE PENDING, show final quotation dialog
    const isToAdvancePending = newStatus.toUpperCase().includes('ADVANCE PENDING');
    if (isToAdvancePending) {
      setPendingStatus(newStatus);
      setShowAdvancePendingDialog(true);
      return;
    }
    
    // INTERCEPT: If moving to BOOKED (but not BOOKED SOMEWHERE ELSE), show payment dialog
    const isToBooked = newStatus.toUpperCase().includes('BOOKED') && 
                       !newStatus.toUpperCase().includes('SOMEWHERE ELSE');
    if (isToBooked) {
      setPendingStatus(newStatus);
      setShowBookedPaymentDialog(true);
      return;
    }

    // Normal flow for other status changes
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
  const isQuotationPending = currentStatusCategory?.toUpperCase().includes('QUOTATION PENDING');
  const isQuotationSent = currentStatusCategory?.toUpperCase().includes('QUOTATION SENT');
  const isBargainingIsOn = currentStatusCategory?.toUpperCase().includes('BARGAINING IS ON');

  // Parse mindset entry to get name and timestamp
  const parsedMindset = useMemo(() => {
    if (!currentMindset) return { name: '', timestamp: null as Date | null, hoursAgo: 0 };
    const parts = currentMindset.split(' - ');
    const name = parts[0]?.trim() || '';
    let timestamp: Date | null = null;
    let hoursAgo = 0;
    if (parts.length >= 2) {
      const ts = parseStatusTimestamp(currentMindset);
      if (ts) {
        timestamp = ts;
        const diffMs = Date.now() - ts.getTime();
        hoursAgo = diffMs / (1000 * 60 * 60);
      }
    }
    return { name, timestamp, hoursAgo };
  }, [currentMindset]);

  // Parse comments to get structured entries
  interface CommentEntry {
    text: string;
    timestamp: string;
  }
  
  // Helper to calculate relative time from timestamp
  const getRelativeTime = (timestampStr: string): string => {
    try {
      // Parse "MM/DD/YYYY HH:MM" format
      const match = timestampStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      if (!match) return timestampStr;
      
      const [, month, day, year, hours, mins] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(mins)
      );
      
      if (isNaN(date.getTime())) return timestampStr;
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0) return timestampStr;
      
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays}d ${diffHours % 24}h ago`;
      } else if (diffHours > 0) {
        return `${diffHours}h ${diffMins % 60}m ago`;
      } else {
        return `${diffMins}m ago`;
      }
    } catch {
      return timestampStr;
    }
  };

  const parsedComments = useMemo((): CommentEntry[] => {
    if (!currentComments) return [];
    // Support both ||| delimiter (new) and \n delimiter (legacy)
    const delimiter = currentComments.includes('|||') ? '|||' : '\n';
    const entries = currentComments.split(delimiter).filter(Boolean);
    return entries.map(entry => {
      // Parse "[MM/DD/YYYY HH:MM] Comment text" - text can be multi-line
      const match = entry.match(/^\[([^\]]+)\]\s*([\s\S]+)$/);
      if (match) {
        return { timestamp: match[1], text: match[2].trim() };
      }
      return { timestamp: '', text: entry.trim() };
    });
  }, [currentComments]);
  
  const commentCount = parsedComments.length;
  const lastComment = parsedComments.length > 0 ? parsedComments[parsedComments.length - 1] : null;

  const getMindsetColor = (mindset: string): string => {
    const m = mindset.toUpperCase();
    if (m.includes('NOT SEEN')) return 'bg-gray-500 text-white';
    if (m.includes('IGNORED')) return 'bg-red-500 text-white';
    if (m.includes('BARGAINING')) return 'bg-amber-500 text-white';
    if (m.includes('EXPENSIVE')) return 'bg-pink-500 text-white';
    if (m.includes('READY TO PAY')) return 'bg-green-500 text-white';
    if (m.includes('NEED TIME') || m.includes('NEED MORE TIME')) return 'bg-blue-500 text-white';
    if (m.includes('FAMILY')) return 'bg-purple-500 text-white';
    if (m.includes('OFFICE')) return 'bg-indigo-500 text-white';
    if (m.includes('POSTPONED')) return 'bg-slate-500 text-white';
    if (m.includes('BOOKED SOMEWHERE')) return 'bg-red-600 text-white';
    return 'bg-gray-400 text-white';
  };

  const handleMindsetChange = async (e: React.MouseEvent, newMindset: string) => {
    e.stopPropagation();
    if (!client.rowNumber) {
      toast.error("Cannot update: missing row number");
      return;
    }

    // For BARGAINING, show the bargaining dialog
    if (newMindset.toUpperCase().includes('BARGAINING')) {
      setShowBargainingDialog(true);
      return;
    }

    setIsUpdatingMindset(true);
    try {
      const result = await updateClientMindset(client.rowNumber, newMindset);
      setCurrentMindset(result.mindset);
      toast.success(`Mindset set to ${newMindset}`);
      if (onMindsetChange) onMindsetChange(client, result.mindset);
    } catch (err) {
      console.error("Failed to update mindset:", err);
      toast.error("Failed to update mindset");
    } finally {
      setIsUpdatingMindset(false);
    }
  };

  const handleSaveBargaining = async () => {
    if (!client.rowNumber) {
      toast.error("Cannot save: missing row number");
      return;
    }
    if (selectedBargainPackages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }

    setIsSavingBargain(true);
    try {
      // Build rate strings
      const ourLines: string[] = [];
      const clientLines: string[] = [];
      selectedBargainPackages.forEach(tier => {
        if (ourBargainRates[tier]) ourLines.push(`${tier}: NPR ${formatNPR(ourBargainRates[tier])}/-`);
        if (clientBargainRates[tier]) clientLines.push(`${tier}: NPR ${formatNPR(clientBargainRates[tier])}/-`);
      });

      await updateBargainingRates(client.rowNumber, ourLines.join('\n'), clientLines.join('\n'));
      const mindsetResult = await updateClientMindset(client.rowNumber, 'BARGAINING');
      
      setCurrentMindset(mindsetResult.mindset);
      setCurrentOurBargainedRates(ourLines.join('\n'));
      setCurrentClientBargainedRates(clientLines.join('\n'));
      setShowBargainingDialog(false);
      
      // Reset form
      setSelectedBargainPackages([]);
      setClientBargainRates({});
      setOurBargainRates({});

      // Ask to move to BARGAINING IS ON
      const bargainingStatus = statusOptions.find(s => s.toUpperCase().includes('BARGAINING IS ON'));
      if (bargainingStatus) {
        setPendingStatus(bargainingStatus);
        setShowConfirmDialog(true);
      }
      toast.success("Bargaining details saved");
    } catch (err) {
      console.error("Failed to save bargaining:", err);
      toast.error("Failed to save bargaining details");
    } finally {
      setIsSavingBargain(false);
    }
  };

  // Handle saving client bargained rates (for BARGAINING IS ON category)
  const handleSaveClientBargain = async () => {
    if (!client.rowNumber) {
      toast.error("Cannot save: missing row number");
      return;
    }
    if (selectedClientBargainPackages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }

    // Check if at least one price is filled
    const hasPrice = selectedClientBargainPackages.some(pkg => clientBargainPrices[pkg]?.trim());
    if (!hasPrice) {
      toast.error("Please enter at least one bargained price");
      return;
    }

    setIsSavingClientBargain(true);
    try {
      // Build client rates string from existing + new values
      const existingRates = parseQuotationData(currentClientBargainedRates);
      const existingRatesMap: Record<string, string> = {};
      existingRates.forEach(r => {
        existingRatesMap[r.tier] = r.amount;
      });

      // Update with new values
      selectedClientBargainPackages.forEach(tier => {
        if (clientBargainPrices[tier]?.trim()) {
          existingRatesMap[tier] = `NPR ${formatNPR(clientBargainPrices[tier])}/-`;
        }
      });

      // Build final string
      const clientLines = Object.entries(existingRatesMap)
        .filter(([_, amount]) => amount)
        .map(([tier, amount]) => `${tier}: ${amount}`);

      const newClientRates = clientLines.join('\n');

      await updateClientBargainedRates(client.rowNumber, newClientRates);
      
      setCurrentClientBargainedRates(newClientRates);
      setShowClientBargainDialog(false);
      
      // Reset form
      setSelectedClientBargainPackages([]);
      setClientBargainPrices({});

      toast.success("Client bargained prices saved");
    } catch (err) {
      console.error("Failed to save client bargained rates:", err);
      toast.error("Failed to save bargained prices");
    } finally {
      setIsSavingClientBargain(false);
    }
  };

  // Handle saving our counter rates (for BARGAINING IS ON category)
  const handleSaveOurCounterRate = async () => {
    if (!client.rowNumber) {
      toast.error("Cannot save: missing row number");
      return;
    }
    if (selectedCounterPackages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }

    // Check if at least one price is filled
    const hasPrice = selectedCounterPackages.some(pkg => ourCounterPrices[pkg]?.trim());
    if (!hasPrice) {
      toast.error("Please enter at least one counter rate");
      return;
    }

    setIsSavingOurCounter(true);
    try {
      // Build our rates string from existing + new values
      const existingRates = parseQuotationData(currentOurBargainedRates);
      const existingRatesMap: Record<string, string> = {};
      existingRates.forEach(r => {
        existingRatesMap[r.tier] = r.amount;
      });

      // Update with new values
      selectedCounterPackages.forEach(tier => {
        if (ourCounterPrices[tier]?.trim()) {
          existingRatesMap[tier] = `NPR ${formatNPR(ourCounterPrices[tier])}/-`;
        }
      });

      // Build final string
      const ourLines = Object.entries(existingRatesMap)
        .filter(([_, amount]) => amount)
        .map(([tier, amount]) => `${tier}: ${amount}`);

      const newOurRates = ourLines.join('\n');

      await updateOurCounterRates(client.rowNumber, newOurRates);
      
      setCurrentOurBargainedRates(newOurRates);
      setShowOurCounterRateDialog(false);
      
      // Reset form
      setSelectedCounterPackages([]);
      setOurCounterPrices({});

      toast.success("Our counter rates saved");
    } catch (err) {
      console.error("Failed to save our counter rates:", err);
      toast.error("Failed to save counter rates");
    } finally {
      setIsSavingOurCounter(false);
    }
  };
  
  // Handle adding a new comment
  const handleAddComment = async () => {
    if (!client.rowNumber) {
      toast.error("Cannot add comment: missing row number");
      return;
    }
    
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsAddingComment(true);
    try {
      const result = await addClientComment(client.rowNumber, newComment.trim(), currentComments);
      setCurrentComments(result.comments);
      setNewComment('');
      toast.success("Comment added");
    } catch (err) {
      console.error("Failed to add comment:", err);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };
  
  // Check if client has contact info
  const hasContactNumber = !!(client.contactNo || client.whatsappNo);
  
  // Check if at least one quotation field is filled
  const isAtLeastOneQuotationFilled = !!(quotationBasic || quotationStandard || quotationPremium || quotationWtnSpecial);
  
  // Universal action reminder: alert if >6 hours in current status (3 hours for NUMBER PROVIDED)
  const DEFAULT_REMINDER_THRESHOLD_HOURS = 6;
  const NUMBER_PROVIDED_THRESHOLD_HOURS = 3;
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
      if (lastCallInfo && lastCallInfo.hoursSinceLastCall >= DEFAULT_REMINDER_THRESHOLD_HOURS) {
        return { show: true, message: `CALL REMINDER: ${DEFAULT_REMINDER_THRESHOLD_HOURS}+ HOURS SINCE LAST CALL` };
      }
      return null;
    }
    
    // Special case for NUMBER PROVIDED - 3 hour threshold if no calls made
    if (isNumberProvided) {
      // If calls have been made, don't show warning
      if (callCount > 0) {
        return null;
      }
      // Check if 3+ hours since number was provided and no calls made
      if (statusTimeAgo && statusTimeAgo.hoursSinceStatus >= NUMBER_PROVIDED_THRESHOLD_HOURS) {
        return { show: true, message: "FOLLOW UP NEEDED: 3+ hours since number provided and not called yet!" };
      }
      return null;
    }
    
    // For all other categories - check time since status was set (6 hour threshold)
    if (!statusTimeAgo || statusTimeAgo.hoursSinceStatus < DEFAULT_REMINDER_THRESHOLD_HOURS) {
      return null;
    }
    
    // Generate category-specific message
    let message = `ACTION NEEDED: ${DEFAULT_REMINDER_THRESHOLD_HOURS}+ HOURS IN THIS STATUS`;
    
    if (category.includes('JUST ENQUIRED')) {
      message = "ACTION NEEDED: Client waiting 6+ hours!";
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
  }, [currentStatusCategory, isCallNotReceived, isNumberProvided, callCount, lastCallInfo, statusTimeAgo]);

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
        openWhatsApp(client.whatsappNo);
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
        openWhatsApp(client.whatsappNo);
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

  // Format number with Indian/Nepali comma format: 1,00,000
  const formatNPR = (value: string): string => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (isNaN(num)) return '';
    // Use Indian numbering system (lakhs, crores)
    return num.toLocaleString('en-IN');
  };

  // Parse quotation data for display
  const parseQuotationData = (data: string): { tier: string; amount: string }[] => {
    if (!data) return [];
    return data.split('\n').map(line => {
      const [tier, ...rest] = line.split(': ');
      return { tier: tier?.trim() || '', amount: rest.join(': ')?.trim() || '' };
    }).filter(q => q.tier && q.amount);
  };

  // Handle quotation dialog cancel
  const handleQuotationDialogClose = () => {
    setShowQuotationDialog(false);
    setPendingStatus(null); // Clear pending status since user cancelled
    // Reset form fields
    setQuotationBasic('');
    setQuotationStandard('');
    setQuotationPremium('');
    setQuotationWtnSpecial('');
  };

  // Handle save quotation
  const handleSaveQuotation = async () => {
    if (!client.rowNumber) {
      toast.error("Cannot save: missing row number");
      return;
    }
    
    if (!isAtLeastOneQuotationFilled) {
      toast.error("Please fill at least one quotation field");
      return;
    }

    setIsSavingQuotation(true);
    
    try {
      // Build quotation string
      const lines: string[] = [];
      if (quotationBasic) lines.push(`BASIC: NPR ${formatNPR(quotationBasic)}/-`);
      if (quotationStandard) lines.push(`STANDARD: NPR ${formatNPR(quotationStandard)}/-`);
      if (quotationPremium) lines.push(`PREMIUM: NPR ${formatNPR(quotationPremium)}/-`);
      if (quotationWtnSpecial) lines.push(`WTN SPECIAL: NPR ${formatNPR(quotationWtnSpecial)}/-`);
      
      const quotationData = lines.join('\n');
      
      // Save to Column V
      await updateClientQuotation(client.rowNumber, quotationData);
      
      // Update local state
      setCurrentQuotationData(quotationData);
      
      // Close dialog
      setShowQuotationDialog(false);
      
      // Reset form
      setQuotationBasic('');
      setQuotationStandard('');
      setQuotationPremium('');
      setQuotationWtnSpecial('');
      
      // If pendingStatus was set from handleStatusClick interception, show confirmation
      // Otherwise find the QUOTATION SENT status
      if (pendingStatus) {
        setShowConfirmDialog(true);
      } else {
        const quotationSentStatus = statusOptions.find(s => s.toUpperCase().includes('QUOTATION SENT'));
        if (quotationSentStatus) {
          setPendingStatus(quotationSentStatus);
          setShowConfirmDialog(true);
        }
      }
      
      toast.success("Quotation saved successfully");
    } catch (err) {
      console.error("Failed to save quotation:", err);
      toast.error("Failed to save quotation");
    } finally {
      setIsSavingQuotation(false);
    }
  };

  // Handle ADVANCE PENDING final quotation save
  const handleSaveAdvancePendingQuotation = async (packageName: string, amount: string) => {
    if (!client.rowNumber) return;
    
    const finalData = `${packageName}: NPR ${formatNPR(amount)}/-`;
    
    setIsSavingAdvancePending(true);
    try {
      // Save final quotation
      const quotationResult = await updateFinalQuotation(client.rowNumber, finalData);
      setCurrentFinalQuotation(quotationResult.finalQuotation);
      
      // Update status to ADVANCE PENDING
      const statusResult = await updateClientStatus(client.rowNumber, pendingStatus || 'ADVANCE PENDING', currentStatusLog);
      setCurrentStatusLog(statusResult.statusLog);
      
      if (onStatusChange) {
        onStatusChange(client, pendingStatus || 'ADVANCE PENDING', statusResult.statusLog);
      }
      
      toast.success('Final quotation locked & status updated to ADVANCE PENDING');
      setShowAdvancePendingDialog(false);
      setPendingStatus(null);
    } catch (err) {
      console.error('Failed to save final quotation:', err);
      toast.error('Failed to save final quotation');
    } finally {
      setIsSavingAdvancePending(false);
    }
  };

  // Handle BOOKED advance payment save
  const handleSaveBookedPayment = async (data: {
    amount: string;
    paymentType: string;
    bank: string;
    nepaliDate: string;
    adDate: string;
  }) => {
    if (!client.rowNumber) return;
    
    const parsedFinal = parseFinalQuotation(currentFinalQuotation);
    const finalAmount = parsedFinal ? parseInt(parsedFinal.amount.replace(/[^0-9]/g, '')) : 0;
    
    setIsSavingBookedPayment(true);
    try {
      // Add payment
      const paymentResult = await addPayment(
        client.rowNumber,
        data.amount,
        data.paymentType,
        data.nepaliDate,
        data.adDate,
        data.bank,
        currentPaymentsMade,
        currentPaymentDatesAD,
        finalAmount,
        client.registeredDateTimeAD,
        client.clientName
      );
      
      setCurrentPaymentsMade(paymentResult.paymentsMade);
      setCurrentRemainingPayment(paymentResult.remainingPayment);
      
      // Update status to BOOKED
      const statusResult = await updateClientStatus(client.rowNumber, pendingStatus || 'BOOKED', currentStatusLog);
      setCurrentStatusLog(statusResult.statusLog);
      
      if (onStatusChange) {
        onStatusChange(client, pendingStatus || 'BOOKED', statusResult.statusLog);
      }
      
      if (onPaymentAdded) {
        onPaymentAdded(client, paymentResult.paymentsMade, paymentResult.remainingPayment);
      }
      
      // Invalidate booked clients cache to force refresh on next access
      notifyCacheUpdate('booked-clients-invalidate');
      
      toast.success('Payment recorded & status updated to BOOKED');
      setShowBookedPaymentDialog(false);
      setPendingStatus(null);
    } catch (err) {
      console.error('Failed to save payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setIsSavingBookedPayment(false);
    }
  };

  // Get tier-specific colors for quotation display
  const getQuotationTierColor = (tier: string): string => {
    const upperTier = tier.toUpperCase();
    if (upperTier.includes('BASIC')) return 'bg-slate-500 text-white';
    if (upperTier.includes('STANDARD')) return 'bg-blue-600 text-white';
    if (upperTier.includes('PREMIUM')) return 'bg-purple-600 text-white';
    if (upperTier.includes('WTN') || upperTier.includes('SPECIAL')) return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
    return 'bg-gray-500 text-white';
  };

  // Calculate days remaining until first event for BOOKED clients
  const getDaysRemainingInfo = useMemo(() => {
    if (!isBooked || events.length === 0) return null;
    
    // Get the first event date
    const firstEvent = events[0];
    if (!firstEvent.year || !firstEvent.monthName || !firstEvent.day) return null;
    
    // Try to get event date from AD date column
    const eventDateStr = client.eventDateAD;
    if (eventDateStr) {
      // Parse the first AD date (might have multiple dates separated by newlines)
      const firstDateStr = eventDateStr.split('\n')[0].trim();
      if (firstDateStr && firstDateStr !== '**') {
        try {
          // Handle date formats like "2026-02-15" or "2026-2-**"
          const dateParts = firstDateStr.split('-');
          if (dateParts.length >= 2) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
            const day = dateParts[2] === '**' ? 15 : parseInt(dateParts[2]); // Use middle of month if unknown day
            
            const eventDate = new Date(year, month, day);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            
            const diffMs = eventDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            
            if (!isNaN(daysRemaining)) {
              // Determine urgency based on days remaining
              let urgency: 'critical' | 'urgent' | 'warning' | 'safe' = 'safe';
              if (daysRemaining <= 7) urgency = 'critical';
              else if (daysRemaining <= 30) urgency = 'urgent';
              else if (daysRemaining <= 60) urgency = 'warning';
              
              return { daysRemaining, urgency };
            }
          }
        } catch {
          return null;
        }
      }
    }
    return null;
  }, [isBooked, events, client.eventDateAD]);

  // Parse final quotation to extract package and amount
  const parseFinalQuotation = (data: string): { package: string; amount: string } | null => {
    if (!data) return null;
    // Format: "PACKAGE: NPR X,XX,XXX/-" or just "NPR X,XX,XXX/-"
    const match = data.match(/^(?:([A-Z\s]+):\s*)?NPR\s+([\d,]+)\/-$/);
    if (match) {
      return { 
        package: match[1]?.trim() || '', 
        amount: `NPR ${match[2]}/-` 
      };
    }
    // Fallback - just return the data as amount
    return { package: '', amount: data };
  };

  // Get parsed final quotation for display
  const parsedFinalQuotation = useMemo(() => {
    return parseFinalQuotation(currentFinalQuotation);
  }, [currentFinalQuotation]);

  // Handle save final quotation
  const handleSaveFinalQuotation = async () => {
    if (!client.rowNumber) {
      toast.error("Cannot save: missing row number");
      return;
    }
    
    if (!newFinalQuotation.trim()) {
      toast.error("Please enter the final quotation amount");
      return;
    }
    
    if (!selectedFinalPackage) {
      toast.error("Please select a package");
      return;
    }

    setIsSavingFinalQuotation(true);
    
    try {
      // Format: "PACKAGE: NPR X,XX,XXX/-"
      const formattedAmount = `${selectedFinalPackage}: NPR ${formatNPR(newFinalQuotation)}/-`;
      
      // Save to Column AD
      await updateFinalQuotation(client.rowNumber, formattedAmount);
      
      // Update local state
      setCurrentFinalQuotation(formattedAmount);
      
      // Close dialog and reset
      setShowFinalQuotationDialog(false);
      setNewFinalQuotation('');
      setSelectedFinalPackage('');
      
      toast.success("Final quotation saved");
    } catch (err) {
      console.error("Failed to save final quotation:", err);
      toast.error("Failed to save final quotation");
    } finally {
      setIsSavingFinalQuotation(false);
    }
  };

  // Get color classes for days remaining display
  const getDaysRemainingColor = (urgency: 'critical' | 'urgent' | 'warning' | 'safe'): string => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white border-red-600 animate-pulse';
      case 'urgent': return 'bg-orange-500 text-white border-orange-600';
      case 'warning': return 'bg-amber-400 text-amber-900 border-amber-500';
      case 'safe': return 'bg-green-500 text-white border-green-600';
    }
  };

  return (
    <div 
      className="flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-border/50"
    >
      {/* Quotation Display Banner - For QUOTATION SENT category - TOP OF CARD */}
      {isQuotationSent && currentQuotationData && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-lg p-2 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Quotation Sent</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parseQuotationData(currentQuotationData).map((q, i) => (
              <div key={i} className={cn(
                "px-2 py-1 rounded-md text-xs font-medium shadow-sm",
                getQuotationTierColor(q.tier)
              )}>
                <span className="opacity-80">{q.tier}:</span> <span className="font-bold">{q.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BARGAINING IS ON Banner - Show quotation comparison and client bargained prices */}
      {isBargainingIsOn && currentQuotationData && (
        <div className="bg-gradient-to-r from-purple-50 to-amber-50 dark:from-purple-950/50 dark:to-amber-950/50 rounded-lg p-3 border border-purple-300 dark:border-purple-700 space-y-3">
          {/* Our Proposal Section */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Our Proposal</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {parseQuotationData(currentQuotationData).map((q, i) => (
                <div key={i} className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium shadow-sm",
                  getQuotationTierColor(q.tier)
                )}>
                  <span className="opacity-80">{q.tier}:</span> <span className="font-bold">{q.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client Bargained Prices Section */}
          {currentClientBargainedRates && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Banknote className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Client Bargaining For</span>
              </div>
              <div className="space-y-1.5">
                {parseQuotationData(currentClientBargainedRates).map((clientRate, i) => {
                  // Find corresponding our rate
                  const ourQuote = parseQuotationData(currentQuotationData).find(q => q.tier === clientRate.tier);
                  const ourAmount = ourQuote ? parseInt(ourQuote.amount.replace(/[^0-9]/g, '')) : 0;
                  const clientAmount = parseInt(clientRate.amount.replace(/[^0-9]/g, ''));
                  const difference = ourAmount - clientAmount;
                  
                  return (
                    <div key={i} className="flex items-center gap-2 flex-wrap bg-white/50 dark:bg-black/20 px-2 py-1.5 rounded-md">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                        getQuotationTierColor(clientRate.tier)
                      )}>
                        {clientRate.tier}
                      </span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {clientRate.amount}
                      </span>
                      {difference > 0 && (
                        <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                          ↓ NPR {difference.toLocaleString('en-IN')}/- less
                        </span>
                      )}
                      {difference < 0 && (
                        <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                          ↑ NPR {Math.abs(difference).toLocaleString('en-IN')}/- more
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Our Counter Rate Section */}
          {currentOurBargainedRates && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowRightLeft className="w-3 h-3 text-green-600 dark:text-green-400" />
                <span className="text-[10px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Our Counter Rate</span>
              </div>
              <div className="space-y-1.5">
                {parseQuotationData(currentOurBargainedRates).map((ourCounter, i) => {
                  // Find corresponding client rate and original rate
                  const originalQuote = parseQuotationData(currentQuotationData).find(q => q.tier === ourCounter.tier);
                  const clientRate = parseQuotationData(currentClientBargainedRates).find(q => q.tier === ourCounter.tier);
                  
                  const originalAmount = originalQuote ? parseInt(originalQuote.amount.replace(/[^0-9]/g, '')) : 0;
                  const counterAmount = parseInt(ourCounter.amount.replace(/[^0-9]/g, ''));
                  const clientAmount = clientRate ? parseInt(clientRate.amount.replace(/[^0-9]/g, '')) : 0;
                  
                  const discountFromOriginal = originalAmount - counterAmount;
                  const gapFromClient = counterAmount - clientAmount;
                  
                  return (
                    <div key={i} className="flex items-center gap-2 flex-wrap bg-green-50/50 dark:bg-green-900/20 px-2 py-1.5 rounded-md">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                        getQuotationTierColor(ourCounter.tier)
                      )}>
                        {ourCounter.tier}
                      </span>
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        {ourCounter.amount}
                      </span>
                      {discountFromOriginal > 0 && (
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          ↓ {discountFromOriginal.toLocaleString('en-IN')}/- off
                        </span>
                      )}
                      {gapFromClient > 0 && clientAmount > 0 && (
                        <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                          Gap: {gapFromClient.toLocaleString('en-IN')}/-
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Add/Edit Client Bargained Price Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/40"
              onClick={(e) => {
                e.stopPropagation();
                // Pre-fill existing bargained prices if any
                if (currentClientBargainedRates) {
                  const existing = parseQuotationData(currentClientBargainedRates);
                  const prices: Record<string, string> = {};
                  const packages: string[] = [];
                  existing.forEach(r => {
                    packages.push(r.tier);
                    prices[r.tier] = r.amount.replace(/[^0-9]/g, '');
                  });
                  setSelectedClientBargainPackages(packages);
                  setClientBargainPrices(prices);
                }
                setShowClientBargainDialog(true);
              }}
            >
              <Banknote className="w-3 h-3 mr-1" />
              {currentClientBargainedRates ? 'Edit Client' : 'Client Rate'}
            </Button>

            {/* Add/Edit Our Counter Rate Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-green-400 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/40"
              onClick={(e) => {
                e.stopPropagation();
                // Pre-fill existing counter rates if any
                if (currentOurBargainedRates) {
                  const existing = parseQuotationData(currentOurBargainedRates);
                  const prices: Record<string, string> = {};
                  const packages: string[] = [];
                  existing.forEach(r => {
                    packages.push(r.tier);
                    prices[r.tier] = r.amount.replace(/[^0-9]/g, '');
                  });
                  setSelectedCounterPackages(packages);
                  setOurCounterPrices(prices);
                }
                setShowOurCounterRateDialog(true);
              }}
            >
              <ArrowRightLeft className="w-3 h-3 mr-1" />
              {currentOurBargainedRates ? 'Edit Counter' : 'Our Counter'}
            </Button>
          </div>
        </div>
      )}

      {/* BOOKED Banner - Final Quotation + Payments + Days Remaining */}
      {isBooked && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-lg p-3 border border-green-300 dark:border-green-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            {/* Final Quotation + Paid Section */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Package Badge */}
                {parsedFinalQuotation?.package && (
                  <span className={cn(
                    "inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide",
                    getQuotationTierColor(parsedFinalQuotation.package)
                  )}>
                    {parsedFinalQuotation.package}
                  </span>
                )}
                {/* Total Package */}
                {parsedFinalQuotation ? (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      const parsed = parseFinalQuotation(currentFinalQuotation);
                      if (parsed) {
                        setNewFinalQuotation(parsed.amount.replace(/[^0-9]/g, ''));
                        setSelectedFinalPackage(parsed.package);
                      }
                      setShowFinalQuotationDialog(true);
                    }}
                    className="text-sm font-bold text-green-800 dark:text-green-200 cursor-pointer hover:underline"
                  >
                    🔒 {parsedFinalQuotation.amount}
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-green-700 hover:bg-green-100 dark:text-green-400 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFinalQuotationDialog(true);
                    }}
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Set Quote
                  </Button>
                )}
                
                {/* Paid Amount Display */}
                {currentPaymentsMade && (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                    💰 PAID: {(() => {
                      const payments = currentPaymentsMade.split('\n').filter(Boolean);
                      let total = 0;
                      for (const entry of payments) {
                        const match = entry.match(/NPR\s*([\d,]+)\/-/);
                        if (match) total += parseInt(match[1].replace(/,/g, ''));
                      }
                      return `NPR ${total.toLocaleString('en-IN')}/-`;
                    })()}
                  </span>
                )}
              </div>
              
              {/* Remaining Payment */}
              {currentRemainingPayment && (
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                  ⏳ Remaining: {currentRemainingPayment}
                </div>
              )}
            </div>
            
            {/* Days Remaining */}
            {getDaysRemainingInfo && (
              <div className={cn(
                "flex flex-col items-center justify-center px-2 py-1 rounded-lg border-2 min-w-[60px]",
                getDaysRemainingColor(getDaysRemainingInfo.urgency)
              )}>
                <span className="text-xl font-bold leading-none">{getDaysRemainingInfo.daysRemaining}</span>
                <span className="text-[9px] font-medium uppercase">Days</span>
              </div>
            )}
          </div>
          
          {/* Add Payment Button */}
          {parsedFinalQuotation && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs border-blue-400 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/40"
              onClick={(e) => {
                e.stopPropagation();
                setShowPaymentDrawer(true);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Payment
            </Button>
          )}
        </div>
      )}

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
          {/* Client Name - Clickable to navigate to detail */}
          <button 
            onClick={() => navigate(getClientDetailPath(client), { state: { from: routerLocation.pathname } })}
            className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors text-left w-full"
          >
            {client.clientName}
          </button>

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

          {/* CALL Button - For NUMBER PROVIDED (Green, with follow-up) */}
          {isNumberProvided && hasContactNumber && (
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

          {/* CALL AGAIN Button - For CALL NOT RECEIVED (Red) */}
          {isCallNotReceived && hasContactNumber && (
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

          {/* Universal CALL Button - For ALL OTHER categories with contact (Green) */}
          {!isJustEnquired && !isNumberProvided && !isCallNotReceived && hasContactNumber && (
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

        {/* Mindset Dropdown - Only for QUOTATION SENT */}
        {isQuotationSent && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Mindset:</span>
            <DropdownMenu>
              <DropdownMenuTrigger 
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                  parsedMindset.name 
                    ? getMindsetColor(parsedMindset.name)
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                  isUpdatingMindset && "opacity-50"
                )}
                disabled={isUpdatingMindset}
              >
                {isUpdatingMindset ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Brain className="w-3 h-3" />
                    {parsedMindset.name || "Select"}
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="max-h-60 overflow-y-auto z-50 bg-background"
              >
                {mindsetOptions.map((mindset) => (
                  <DropdownMenuItem
                    key={mindset}
                    onClick={(e) => handleMindsetChange(e, mindset)}
                    className={cn(
                      "text-xs cursor-pointer",
                      mindset.toUpperCase() === parsedMindset.name.toUpperCase() && "bg-primary/10 font-medium"
                    )}
                  >
                    {mindset}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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

      {/* Mindset Display and Warning - Only for QUOTATION SENT */}
      {isQuotationSent && parsedMindset.name && (
        <>
          {/* Mindset Tag with Time Tracking for NOT SEEN / IGNORED */}
          {(parsedMindset.name.toUpperCase().includes('NOT SEEN') || parsedMindset.name.toUpperCase().includes('IGNORED')) && (
            <div className="flex flex-col gap-1.5">
              <div className={cn(
                "flex items-center gap-2 text-xs px-3 py-2 rounded-md",
                parsedMindset.name.toUpperCase().includes('NOT SEEN') 
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              )}>
                <Brain className="w-3.5 h-3.5" />
                <span className="font-semibold">{parsedMindset.name.toUpperCase()} FROM {formatDuration(parsedMindset.timestamp ? Date.now() - parsedMindset.timestamp.getTime() : 0)} AGO</span>
              </div>
              
              {/* 6 Hour Warning Banner */}
              {parsedMindset.hoursAgo >= 6 && (
                <div className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-md border border-red-300 dark:border-red-700 animate-pulse">
                  <Bell className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    ⚠️ FOLLOW UP NEEDED - {parsedMindset.name.toUpperCase()} FOR {formatDuration(parsedMindset.timestamp ? Date.now() - parsedMindset.timestamp.getTime() : 0)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Other Mindset Tags (not NOT SEEN or IGNORED) */}
          {!parsedMindset.name.toUpperCase().includes('NOT SEEN') && !parsedMindset.name.toUpperCase().includes('IGNORED') && (
            <div className={cn(
              "flex items-center gap-2 text-xs px-3 py-2 rounded-md",
              getMindsetColor(parsedMindset.name)
            )}>
              <Brain className="w-3.5 h-3.5" />
              <span className="font-semibold">{parsedMindset.name.toUpperCase()}</span>
              {parsedMindset.timestamp && (
                <span className="opacity-70">({formatDuration(Date.now() - parsedMindset.timestamp.getTime())} ago)</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Universal Call Tracking Info - Shows for ALL categories when calls exist */}
      {callCount > 0 && (
        <div className={cn(
          "flex flex-col gap-1.5 text-xs px-3 py-2 rounded-md border",
          isCallNotReceived 
            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        )}>
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              isCallNotReceived 
                ? "text-orange-700 dark:text-orange-400"
                : "text-blue-700 dark:text-blue-400"
            )}>
              CALLED: {callCount} {callCount === 1 ? 'TIME' : 'TIMES'}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowCallHistoryDialog(true);
              }}
              className={cn(
                isCallNotReceived 
                  ? "text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                  : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              )}
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
          {lastCallTimeAgo && (
            <div className={cn(
              "text-sm font-bold px-2 py-1 rounded",
              isCallNotReceived 
                ? "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800/40"
                : "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/40"
            )}>
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

      {/* Comment Section - Universal for all cards */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setShowCommentDialog(true);
          }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {commentCount > 0 ? (
            <span className="font-medium">{commentCount}</span>
          ) : (
            <span>+</span>
          )}
        </Button>
        {lastComment && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCommentDialog(true);
            }}
            className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-start gap-1">
              <span>💬</span>
              <span className="whitespace-pre-wrap break-words">{lastComment.text}</span>
            </div>
            {lastComment.timestamp && (
              <span className="text-[10px] opacity-70 block mt-0.5">
                🕐 {getRelativeTime(lastComment.timestamp)}
              </span>
            )}
          </button>
        )}
      </div>

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

      {/* Quotation Input Dialog - For CALLED: QUOTATION PENDING */}
      <Dialog open={showQuotationDialog} onOpenChange={(open) => !open && handleQuotationDialogClose()}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Enter Quotation Amounts
            </DialogTitle>
            <DialogDescription>
              Enter the prices quoted to {client.clientName}. At least one is required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* BASIC */}
            <div className="space-y-1.5">
              <Label htmlFor="basic" className="text-sm font-medium">BASIC</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">NPR</span>
                <Input
                  id="basic"
                  type="number"
                  placeholder="e.g., 50000"
                  value={quotationBasic}
                  onChange={(e) => setQuotationBasic(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">/-</span>
              </div>
            </div>
            
            {/* STANDARD */}
            <div className="space-y-1.5">
              <Label htmlFor="standard" className="text-sm font-medium">STANDARD</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">NPR</span>
                <Input
                  id="standard"
                  type="number"
                  placeholder="e.g., 75000"
                  value={quotationStandard}
                  onChange={(e) => setQuotationStandard(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">/-</span>
              </div>
            </div>
            
            {/* PREMIUM */}
            <div className="space-y-1.5">
              <Label htmlFor="premium" className="text-sm font-medium">PREMIUM</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">NPR</span>
                <Input
                  id="premium"
                  type="number"
                  placeholder="e.g., 100000"
                  value={quotationPremium}
                  onChange={(e) => setQuotationPremium(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">/-</span>
              </div>
            </div>
            
            {/* WTN SPECIAL */}
            <div className="space-y-1.5">
              <Label htmlFor="wtnspecial" className="text-sm font-medium">WTN SPECIAL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">NPR</span>
                <Input
                  id="wtnspecial"
                  type="number"
                  placeholder="e.g., 125000"
                  value={quotationWtnSpecial}
                  onChange={(e) => setQuotationWtnSpecial(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">/-</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleQuotationDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveQuotation}
              disabled={!isAtLeastOneQuotationFilled || isSavingQuotation}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSavingQuotation ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Send to Quotation Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bargaining Dialog - For QUOTATION SENT mindset */}
      <Dialog open={showBargainingDialog} onOpenChange={setShowBargainingDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-600" />
              Bargaining Details
            </DialogTitle>
            <DialogDescription>
              Which packages is {client.clientName} bargaining about? Select packages and enter bargaining rates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Package Selection from Quotation Data */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Package(s)</Label>
              {parseQuotationData(currentQuotationData).length > 0 ? (
                <div className="space-y-2">
                  {parseQuotationData(currentQuotationData).map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox 
                        id={`pkg-${q.tier}`}
                        checked={selectedBargainPackages.includes(q.tier)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBargainPackages([...selectedBargainPackages, q.tier]);
                          } else {
                            setSelectedBargainPackages(selectedBargainPackages.filter(t => t !== q.tier));
                            // Clear rates for unchecked package
                            const newClientRates = { ...clientBargainRates };
                            const newOurRates = { ...ourBargainRates };
                            delete newClientRates[q.tier];
                            delete newOurRates[q.tier];
                            setClientBargainRates(newClientRates);
                            setOurBargainRates(newOurRates);
                          }
                        }}
                      />
                      <label 
                        htmlFor={`pkg-${q.tier}`}
                        className={cn(
                          "text-sm font-medium cursor-pointer px-2 py-1 rounded",
                          getQuotationTierColor(q.tier)
                        )}
                      >
                        {q.tier}: {q.amount}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No quotation data available</p>
              )}
            </div>
            
            {/* Rate Inputs for Selected Packages */}
            {selectedBargainPackages.length > 0 && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">Enter Bargaining Rates</Label>
                {selectedBargainPackages.map((tier) => (
                  <div key={tier} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded",
                      getQuotationTierColor(tier)
                    )}>
                      {tier}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Client's Rate</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">NPR</span>
                          <Input
                            type="number"
                            placeholder="Client's rate"
                            value={clientBargainRates[tier] || ''}
                            onChange={(e) => setClientBargainRates({ ...clientBargainRates, [tier]: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Our New Rate</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">NPR</span>
                          <Input
                            type="number"
                            placeholder="Our new rate"
                            value={ourBargainRates[tier] || ''}
                            onChange={(e) => setOurBargainRates({ ...ourBargainRates, [tier]: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowBargainingDialog(false);
              setSelectedBargainPackages([]);
              setClientBargainRates({});
              setOurBargainRates({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBargaining}
              disabled={selectedBargainPackages.length === 0 || isSavingBargain}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSavingBargain ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Save & Move to Bargaining
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Bargained Price Dialog - For BARGAINING IS ON category */}
      <Dialog open={showClientBargainDialog} onOpenChange={setShowClientBargainDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              Client Bargained Price
            </DialogTitle>
            <DialogDescription>
              Select packages and enter the prices {client.clientName} is bargaining for.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Package Selection from Original Quotation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Package(s) to Bargain</Label>
              {parseQuotationData(currentQuotationData).length > 0 ? (
                <div className="space-y-2">
                  {parseQuotationData(currentQuotationData).map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox 
                        id={`client-pkg-${q.tier}`}
                        checked={selectedClientBargainPackages.includes(q.tier)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClientBargainPackages([...selectedClientBargainPackages, q.tier]);
                          } else {
                            setSelectedClientBargainPackages(selectedClientBargainPackages.filter(t => t !== q.tier));
                            const newPrices = { ...clientBargainPrices };
                            delete newPrices[q.tier];
                            setClientBargainPrices(newPrices);
                          }
                        }}
                      />
                      <label 
                        htmlFor={`client-pkg-${q.tier}`}
                        className={cn(
                          "text-sm font-medium cursor-pointer px-2 py-1 rounded",
                          getQuotationTierColor(q.tier)
                        )}
                      >
                        {q.tier}: {q.amount}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No quotation data available</p>
              )}
            </div>
            
            {/* Price Inputs for Selected Packages */}
            {selectedClientBargainPackages.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Enter Client's Bargained Prices</Label>
                {selectedClientBargainPackages.map((tier) => {
                  const ourQuote = parseQuotationData(currentQuotationData).find(q => q.tier === tier);
                  return (
                    <div key={tier} className="space-y-1 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded",
                          getQuotationTierColor(tier)
                        )}>
                          {tier}
                        </span>
                        {ourQuote && (
                          <span className="text-[10px] text-muted-foreground">
                            Our: {ourQuote.amount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">NPR</span>
                        <Input
                          type="number"
                          placeholder="Client's price"
                          value={clientBargainPrices[tier] || ''}
                          onChange={(e) => setClientBargainPrices({ ...clientBargainPrices, [tier]: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">/-</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowClientBargainDialog(false);
              setSelectedClientBargainPackages([]);
              setClientBargainPrices({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveClientBargain}
              disabled={selectedClientBargainPackages.length === 0 || isSavingClientBargain}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSavingClientBargain ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Banknote className="w-4 h-4 mr-2" />
              )}
              Save Bargained Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Our Counter Rate Dialog - For BARGAINING IS ON category */}
      <Dialog open={showOurCounterRateDialog} onOpenChange={setShowOurCounterRateDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-green-600" />
              Our Counter Rate
            </DialogTitle>
            <DialogDescription>
              Enter our counter-offer prices for {client.clientName}'s bargaining.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Package Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Package(s)</Label>
              {parseQuotationData(currentQuotationData).length > 0 ? (
                <div className="space-y-2">
                  {parseQuotationData(currentQuotationData).map((q, i) => {
                    const clientRate = parseQuotationData(currentClientBargainedRates).find(r => r.tier === q.tier);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox 
                          id={`counter-pkg-${q.tier}`}
                          checked={selectedCounterPackages.includes(q.tier)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCounterPackages([...selectedCounterPackages, q.tier]);
                            } else {
                              setSelectedCounterPackages(selectedCounterPackages.filter(t => t !== q.tier));
                              const newPrices = { ...ourCounterPrices };
                              delete newPrices[q.tier];
                              setOurCounterPrices(newPrices);
                            }
                          }}
                        />
                        <label 
                          htmlFor={`counter-pkg-${q.tier}`}
                          className="flex flex-col"
                        >
                          <span className={cn(
                            "text-sm font-medium px-2 py-1 rounded",
                            getQuotationTierColor(q.tier)
                          )}>
                            {q.tier}: {q.amount}
                          </span>
                          {clientRate && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-2 mt-0.5">
                              Client wants: {clientRate.amount}
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No quotation data available</p>
              )}
            </div>
            
            {/* Price Inputs for Selected Packages */}
            {selectedCounterPackages.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Enter Our Counter Prices</Label>
                {selectedCounterPackages.map((tier) => {
                  const ourQuote = parseQuotationData(currentQuotationData).find(q => q.tier === tier);
                  const clientRate = parseQuotationData(currentClientBargainedRates).find(q => q.tier === tier);
                  return (
                    <div key={tier} className="space-y-1 p-3 bg-green-50/50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded",
                          getQuotationTierColor(tier)
                        )}>
                          {tier}
                        </span>
                        <div className="flex gap-2 text-[10px]">
                          {ourQuote && (
                            <span className="text-muted-foreground">
                              Original: {ourQuote.amount}
                            </span>
                          )}
                          {clientRate && (
                            <span className="text-amber-600 dark:text-amber-400">
                              Client: {clientRate.amount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">NPR</span>
                        <Input
                          type="number"
                          placeholder="Our counter price"
                          value={ourCounterPrices[tier] || ''}
                          onChange={(e) => setOurCounterPrices({ ...ourCounterPrices, [tier]: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">/-</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowOurCounterRateDialog(false);
              setSelectedCounterPackages([]);
              setOurCounterPrices({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveOurCounterRate}
              disabled={selectedCounterPackages.length === 0 || isSavingOurCounter}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSavingOurCounter ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRightLeft className="w-4 h-4 mr-2" />
              )}
              Save Counter Rates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Drawer - Better mobile keyboard handling */}
      <Drawer open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DrawerContent onClick={(e) => e.stopPropagation()}>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments for {client.clientName}
            </DrawerTitle>
            <DrawerDescription>
              {commentCount > 0 ? `${commentCount} comment${commentCount > 1 ? 's' : ''}` : 'No comments yet'}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 pb-4">
            {/* Add New Comment - At top for easy access */}
            <div className="space-y-3 pb-4 border-b border-border mb-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment... (paste multi-line text here)"
                className="min-h-[100px] resize-none text-base"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowCommentDialog(false);
                    setNewComment('');
                  }}
                >
                  Close
                </Button>
                <Button 
                  size="sm"
                  onClick={handleAddComment}
                  disabled={isAddingComment || !newComment.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isAddingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-1" />
                  )}
                  Add Comment
                </Button>
              </div>
            </div>
            
            {/* Comment History */}
            <ScrollArea className="h-[40vh]">
              {parsedComments.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {[...parsedComments].reverse().map((comment, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          📅 {comment.timestamp}
                        </span>
                        <span className="text-[10px] text-primary font-medium">
                          🕐 {getRelativeTime(comment.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {comment.text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Final Quotation Dialog - For BOOKED clients */}
      <Dialog open={showFinalQuotationDialog} onOpenChange={(open) => {
        if (!open) {
          setShowFinalQuotationDialog(false);
          setNewFinalQuotation('');
          setSelectedFinalPackage('');
        }
      }}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              Final Quotation
            </DialogTitle>
            <DialogDescription>
              Select package and enter the final confirmed price for {client.clientName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Package Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Package</Label>
              <div className="grid grid-cols-2 gap-2">
                {['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'].map((pkg) => (
                  <Button
                    key={pkg}
                    type="button"
                    variant={selectedFinalPackage === pkg ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "h-10 text-xs font-semibold transition-all",
                      selectedFinalPackage === pkg 
                        ? getQuotationTierColor(pkg)
                        : "hover:border-primary"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFinalPackage(pkg);
                    }}
                  >
                    {pkg}
                  </Button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="finalQuote" className="text-sm font-medium">Final Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">NPR</span>
                <Input
                  id="finalQuote"
                  type="number"
                  placeholder="e.g., 85000"
                  value={newFinalQuotation}
                  onChange={(e) => setNewFinalQuotation(e.target.value)}
                  className="flex-1 text-lg font-semibold"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm text-muted-foreground">/-</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowFinalQuotationDialog(false);
              setNewFinalQuotation('');
              setSelectedFinalPackage('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFinalQuotation}
              disabled={!newFinalQuotation.trim() || !selectedFinalPackage || isSavingFinalQuotation}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSavingFinalQuotation ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Save Final Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Drawer - For BOOKED clients */}
      <Drawer open={showPaymentDrawer} onOpenChange={setShowPaymentDrawer}>
        <DrawerContent onClick={(e) => e.stopPropagation()} className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Banknote className="w-4 h-4 text-blue-600" />
              Add Payment - {client.clientName}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Record a new payment for this booking
            </DrawerDescription>
          </DrawerHeader>
          
          <ScrollArea className="flex-1 max-h-[calc(90vh-120px)] px-4">
            <div className="space-y-3 pb-4">
              {/* 1. Payment Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">1. Received Amount *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">NPR</span>
                  <Input
                    type="number"
                    placeholder="e.g., 30000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 text-base font-semibold h-9"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-muted-foreground">/-</span>
                </div>
              </div>
              {/* 2. Payment Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">2. Amount Type *</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {paymentTypes.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedPaymentType === type ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-8 text-xs font-semibold",
                        selectedPaymentType === type && "bg-blue-600 hover:bg-blue-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPaymentType(type);
                      }}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 3. Nepali Date Calendar */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">3. Date of Payment (BS) *</Label>
                {paymentNepaliDates.length > 0 ? (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium text-foreground text-sm">
                      {paymentNepaliDates[0].year}-{String(paymentNepaliDates[0].month).padStart(2, '0')}-{String(paymentNepaliDates[0].day).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({nepaliMonthsEnglish[paymentNepaliDates[0].month - 1]})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPaymentCalendar(true);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-9 justify-start text-muted-foreground text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPaymentCalendar(true);
                    }}
                  >
                    <CalendarDays className="w-3.5 h-3.5 mr-2" />
                    Select payment date
                  </Button>
                )}
                
                {showPaymentCalendar && (
                  <div className="mt-2 border rounded-lg p-2 bg-background" onClick={(e) => e.stopPropagation()}>
                    <NepaliCalendar
                      selectedDates={paymentNepaliDates}
                      onDateSelect={(dates) => {
                        // Only take the last selected date (single select behavior)
                        if (dates.length > 0) {
                          setPaymentNepaliDates([dates[dates.length - 1]]);
                          setShowPaymentCalendar(false);
                        } else {
                          setPaymentNepaliDates([]);
                        }
                      }}
                      multiSelect={false}
                    />
                  </div>
                )}
              </div>

              {/* 4. Bank */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">4. Bank *</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {banks.map((bank) => (
                    <Button
                      key={bank}
                      type="button"
                      variant={selectedBank === bank ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-8 text-xs font-semibold",
                        selectedBank === bank && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBank(bank);
                      }}
                    >
                      {bank}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full h-10 text-sm bg-blue-600 hover:bg-blue-700 mt-2"
                disabled={!paymentAmount || !selectedPaymentType || paymentNepaliDates.length === 0 || !selectedBank || isAddingPayment}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!client.rowNumber) {
                    toast.error("Cannot add payment: missing row number");
                    return;
                  }
                  
                  // Extract numeric amount from final quotation
                  const parsed = parseFinalQuotation(currentFinalQuotation);
                  const finalAmount = parsed ? parseInt(parsed.amount.replace(/[^0-9]/g, '')) : 0;
                  
                  if (!finalAmount) {
                    toast.error("No final quotation set");
                    return;
                  }
                  
                  // Format the Nepali date as YYYY-MM-DD
                  const selectedDate = paymentNepaliDates[0];
                  const formattedNepaliDate = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
                  
                  // Convert Nepali date to AD for storage
                  const adDateResult = bsToAD(selectedDate.year, selectedDate.month, selectedDate.day as number);
                  const formattedADDate = adDateResult instanceof Date 
                    ? adDateResult.toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]; // Fallback to today if conversion fails
                  
                  setIsAddingPayment(true);
                  try {
                    const result = await addPayment(
                      client.rowNumber,
                      paymentAmount,
                      selectedPaymentType,
                      formattedNepaliDate,
                      formattedADDate,
                      selectedBank,
                      currentPaymentsMade,
                      currentPaymentDatesAD,
                      finalAmount,
                      client.registeredDateTimeAD,
                      'tracker'
                    );
                    
                    setCurrentPaymentsMade(result.paymentsMade);
                    setCurrentPaymentDatesAD(result.paymentDatesAD);
                    setCurrentRemainingPayment(result.remainingPayment);
                    
                    toast.success(`Payment of NPR ${parseInt(paymentAmount).toLocaleString('en-IN')}/- recorded!`);
                    
                    // Reset form
                    setPaymentAmount('');
                    setSelectedPaymentType('');
                    setPaymentNepaliDates([]);
                    setSelectedBank('');
                    setShowPaymentDrawer(false);
                    setShowPaymentCalendar(false);
                    
                    if (onPaymentAdded) {
                      onPaymentAdded(client, result.paymentsMade, result.remainingPayment);
                    }
                  } catch (err) {
                    console.error("Failed to add payment:", err);
                    toast.error("Failed to record payment");
                  } finally {
                    setIsAddingPayment(false);
                  }
                }}
              >
                {isAddingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Save Payment
              </Button>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* ADVANCE PENDING Interception Dialog */}
      <FinalQuotationDialog
        open={showAdvancePendingDialog}
        onOpenChange={(open) => {
          setShowAdvancePendingDialog(open);
          if (!open) setPendingStatus(null);
        }}
        clientName={client.clientName || 'Client'}
        existingQuotationData={currentQuotationData}
        onSave={handleSaveAdvancePendingQuotation}
        isSaving={isSavingAdvancePending}
      />

      {/* BOOKED Interception Dialog */}
      <AdvancePaymentDialog
        open={showBookedPaymentDialog}
        onOpenChange={(open) => {
          setShowBookedPaymentDialog(open);
          if (!open) setPendingStatus(null);
        }}
        clientName={client.clientName || 'Client'}
        finalQuotation={currentFinalQuotation}
        paymentTypes={paymentTypes}
        banks={banks}
        onSave={handleSaveBookedPayment}
        isSaving={isSavingBookedPayment}
      />
    </div>
  );
}