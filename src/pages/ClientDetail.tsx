import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Phone, MessageCircle, Mail, MapPin, Calendar, User, Clock, DollarSign, FileText, Activity, MessageSquare, Briefcase, Pencil, Loader2, Plus, CreditCard, RefreshCw, RotateCcw, Send } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useCachedData } from "@/hooks/useCachedData";
import { useDropdownData } from "@/hooks/useDropdownData";
import { updateClient, ClientData, logCallAttempt, addClientComment, updateFinalQuotation, updateClientPriority, updateBenzoKeepNotes, deleteClient, addPayment, updateClientStatus } from "@/lib/sheets-api";
import { generateCallLogEntry, generateStatusLogEntry, generateCommentEntry, computePaymentUpdate } from "@/lib/timestamp-utils";
import { migrateClientToBookedInCache } from "@/lib/clients-supabase-cache";
import { Checkbox } from "@/components/ui/checkbox";
import { forceResetDatabase, notifyCacheUpdate } from "@/lib/cache-manager";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  formatBSDateDisplay, 
  parsePayments, 
  getPaymentTypeBadgeColor,
  parseQuotationData,
  getQuotationTierColor,
  parseMindset,
  getMindsetColor,
  parseCallLog,
  parseComments,
  getRelativeTime,
  getCurrentStatus,
  formatNPR,
  parseFinalQuotation,
  getTotalPaid,
  getMonthColorClasses,
  parseInquiryMonth,
  getDetailedEnquiryInfo,
  getDaysUntilEvent
} from "@/lib/client-card-utils";
import { nepaliMonthsEnglish, NepaliDateObject, bsToAD, isUnknownDay, getDayForStorage, getCurrentBSDate } from "@/lib/nepali-date";
import { getMonthName } from "@/lib/nepali-months";
import NepaliDate from "nepali-date-converter";
import PaymentDrawer from "@/components/finance/PaymentDrawer";
import { ClientDetailSidebar, ClientHeroSection, SectionType, EventDetailsSummaryCard, FullScreenEventCard, ClientDetailsCard, BenzoKeepDialog, BenzoKeepViewer, DeleteClientDialog, ClientFilesSection, DeliverablesSection, EditProductionSection, AlbumSection } from "@/components/client-detail";
import FreelancerAssignmentSection from "@/components/client-detail/FreelancerAssignmentSection";
import { updateRequiredCrewCategories } from "@/lib/freelancer-assignment-api";
import { EventDetailCard } from "@/components/client-detail/EventDetailCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEventDetails } from "@/hooks/useEventDetails";
import { useFreelancerAssignments } from "@/hooks/useFreelancerAssignments";
import { useClientContactDetails } from "@/hooks/useClientContactDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { FinalQuotationDialog, AdvancePaymentDialog } from "@/components/status-dialogs";
import BookedStatusPasswordDialog from "@/components/shared/BookedStatusPasswordDialog";

// Helper to convert AD date to BS formatted string
function formatADtoBS(adDateStr: string): string {
  if (!adDateStr) return '';
  try {
    const parts = adDateStr.split(/[-T]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      const np = new NepaliDate(date);
      return `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()}`;
    }
  } catch {}
  return adDateStr;
}

// Helper to convert AD timestamp to BS with time
function formatADtoBSWithTime(adDateStr: string): string {
  if (!adDateStr) return '';
  try {
    let timeStr = '';
    const parts = adDateStr.split('T');
    const dateParts = parts[0].split('-').map(Number);
    
    if (parts.length > 1) {
      const timeMatch = parts[1].match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const mins = parseInt(timeMatch[2]);
        const isPM = hours >= 12;
        const displayHours = hours % 12 || 12;
        timeStr = ` at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      }
    }
    
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const np = new NepaliDate(date);
    return `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()}${timeStr}`;
  } catch {}
  return adDateStr;
}

// Get event type color
function getEventTypeColor(eventName: string): string {
  const upper = eventName.toUpperCase();
  if (upper.includes('WEDDING')) return 'bg-primary/10 text-primary border-primary/30';
  if (upper.includes('RECEPTION')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300';
  if (upper.includes('ENGAGEMENT')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-300';
  if (upper.includes('PRE')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300';
  return 'bg-muted text-muted-foreground border-muted';
}

// Get status color
function getStatusColor(status: string): string {
  const upper = status.toUpperCase();
  if (upper.includes('BOOKED') && !upper.includes('SOMEWHERE')) return 'bg-emerald-500 text-white';
  if (upper.includes('CANCELLED')) return 'bg-red-500 text-white';
  if (upper.includes('QUOTATION SENT')) return 'bg-blue-500 text-white';
  if (upper.includes('BARGAINING')) return 'bg-amber-500 text-white';
  if (upper.includes('ADVANCE')) return 'bg-violet-500 text-white';
  if (upper.includes('POSTPONED')) return 'bg-gray-500 text-white';
  return 'bg-slate-500 text-white';
}

const ClientDetail = () => {
  const { rowNumber } = useParams<{ rowNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { clients, isLoading, updateClient: updateClientCache, refreshData } = useCachedData();
  const { data: dropdowns } = useDropdownData();

  // Netflix-style sidebar section state
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // FAB state
  const [showFab, setShowFab] = useState(false);
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [currentStatusLog, setCurrentStatusLog] = useState("");
  const [currentPaymentsMade, setCurrentPaymentsMade] = useState("");
  const [currentRemainingPayment, setCurrentRemainingPayment] = useState("");

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [currentComments, setCurrentComments] = useState("");

  // Quotation dialog state
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [quotationAmounts, setQuotationAmounts] = useState<Record<string, string>>({});
  const [isSavingQuotation, setIsSavingQuotation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [currentQuotationData, setCurrentQuotationData] = useState("");

  // ADVANCE PENDING interception state
  const [showAdvancePendingDialog, setShowAdvancePendingDialog] = useState(false);
  const [isSavingAdvancePending, setIsSavingAdvancePending] = useState(false);
  
  // BOOKED interception state
  const [showBookedPaymentDialog, setShowBookedPaymentDialog] = useState(false);
  const [isSavingBookedPayment, setIsSavingBookedPayment] = useState(false);
  const [currentFinalQuotation, setCurrentFinalQuotation] = useState("");

  // BOOKED - Save-only final quotation dialog (no status change)
  const [showFinalQuotationSaveDialog, setShowFinalQuotationSaveDialog] = useState(false);

  // Event details editing state
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);

  // Priority (star rating) state
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  // BARGAINING IS ON interception state
  const [showBargainingDialog, setShowBargainingDialog] = useState(false);
  const [selectedBargainPackages, setSelectedBargainPackages] = useState<string[]>([]);
  const [clientBargainRates, setClientBargainRates] = useState<Record<string, string>>({});
  const [ourBargainRates, setOurBargainRates] = useState<Record<string, string>>({});
  const [isSavingBargain, setIsSavingBargain] = useState(false);

  // Benzo Keep Notes state
  const [showBenzoKeepDialog, setShowBenzoKeepDialog] = useState(false);
  const [isSavingKeepNotes, setIsSavingKeepNotes] = useState(false);
  const [currentKeepNotes, setCurrentKeepNotes] = useState("");

  // Delete client state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const fromState = location.state as { 
    from?: string; 
    searchContext?: string;  // Flag for search sequential navigation
    filters?: any; 
    scrollPosition?: number;
    searchQuery?: string;
    resultIds?: (number | string)[];
    currentIndex?: number;
  } | null;

  // Compute previous/next client IDs for navigation
  const { prevClientId, nextClientId, currentPosition, totalCount, isFromSearch } = useMemo(() => {
    // If coming from search with result context (use searchContext flag, not from)
    if (fromState?.searchContext === 'search' && fromState.resultIds && fromState.currentIndex !== undefined) {
      const ids = fromState.resultIds;
      const idx = fromState.currentIndex;
      return {
        prevClientId: idx > 0 ? ids[idx - 1] : null,
        nextClientId: idx < ids.length - 1 ? ids[idx + 1] : null,
        currentPosition: idx + 1,
        totalCount: ids.length,
        isFromSearch: true
      };
    }
    
    // Default: navigate through all clients
    const allIds = clients.map(c => c.rowNumber || c.registeredDateTimeAD);
    const currentIdx = allIds.findIndex(id => String(id) === rowNumber);
    
    return {
      prevClientId: currentIdx > 0 ? allIds[currentIdx - 1] : null,
      nextClientId: currentIdx < allIds.length - 1 ? allIds[currentIdx + 1] : null,
      currentPosition: currentIdx >= 0 ? currentIdx + 1 : 0,
      totalCount: allIds.length,
      isFromSearch: false
    };
  }, [fromState, clients, rowNumber]);

  // Navigation handlers
  const handleNavigatePrev = useCallback(() => {
    if (!prevClientId) return;
    const newIndex = (fromState?.currentIndex ?? 0) - 1;
    navigate(`/client-tracker/client/${prevClientId}`, {
      state: {
        ...fromState,
        currentIndex: newIndex
      }
    });
  }, [prevClientId, fromState, navigate]);

  const handleNavigateNext = useCallback(() => {
    if (!nextClientId) return;
    const newIndex = (fromState?.currentIndex ?? 0) + 1;
    navigate(`/client-tracker/client/${nextClientId}`, {
      state: {
        ...fromState,
        currentIndex: newIndex
      }
    });
  }, [nextClientId, fromState, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft' && prevClientId) {
        handleNavigatePrev();
      } else if (e.key === 'ArrowRight' && nextClientId) {
        handleNavigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevClientId, nextClientId, handleNavigatePrev, handleNavigateNext]);

  const client = useMemo(() => {
    if (!rowNumber || !clients.length) return null;
    
    // First try: exact rowNumber match
    const byRowNumber = clients.find(c => String(c.rowNumber) === rowNumber);
    if (byRowNumber) return byRowNumber;
    
    // Second try: match by registeredDateTimeAD (decoded from URL)
    const decodedId = decodeURIComponent(rowNumber);
    const byRegDateTime = clients.find(c => c.registeredDateTimeAD === decodedId);
    if (byRegDateTime) return byRegDateTime;
    
    return null;
  }, [clients, rowNumber]);

  // Fetch event details for this client (for the expandable event cards)
  const { 
    data: eventDetailsData, 
    isLoading: eventDetailsLoading, 
    updateEventDetail,
    refetch: refetchEventDetails
  } = useEventDetails(client?.registeredDateTimeAD);

  // Re-fetch event details when client event fields change (after edit) - skip initial mount
  // Also ensures event_details_cache has skeleton rows for any new events
  const eventFieldsRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${client?.events}|${client?.eventYear}|${client?.eventMonth}|${client?.eventDay}`;
    if (eventFieldsRef.current === null) {
      eventFieldsRef.current = key;
      return;
    }
    if (key !== eventFieldsRef.current && client?.registeredDateTimeAD) {
      eventFieldsRef.current = key;

      // Insert any missing skeleton rows into event_details_cache before refetching
      const syncMissingEvents = async () => {
        const regId = client.registeredDateTimeAD;
        const newEvents = (client.events || '').split('\n').filter(Boolean);
        const newYears = (client.eventYear || '').split('\n');
        const newMonths = (client.eventMonth || '').split('\n');
        const newDays = (client.eventDay || '').split('\n');
        const newDatesAD = (client.eventDateAD || '').split('\n');

        const { data: existingRows } = await supabase
          .from('event_details_cache')
          .select('event_index, event_name, event_month, event_day')
          .eq('registered_date_time_ad', regId);

        const skeletons: any[] = [];
        for (let i = 0; i < newEvents.length; i++) {
          const exists = existingRows?.some(r =>
            r.event_name === newEvents[i] && r.event_month === newMonths[i] && r.event_day === newDays[i]
          );
          if (!exists) {
            skeletons.push({
              registered_date_time_ad: regId,
              event_index: i,
              event_name: newEvents[i],
              event_year: newYears[i] || '',
              event_month: newMonths[i] || '',
              event_day: newDays[i] || '',
              event_date_ad: newDatesAD[i] || '',
              synced_to_sheet: false,
            });
          }
        }

        if (skeletons.length > 0) {
          await supabase.from('event_details_cache').upsert(skeletons, {
            onConflict: 'registered_date_time_ad,event_index'
          });
        }

        refetchEventDetails();
      };

      syncMissingEvents().then(async () => {
        // Also sync freelancer_assignments: insert new events, delete orphans
        if (client.registeredDateTimeAD) {
          const currentStatus = getCurrentStatus(client.statusLog || '').toUpperCase();
          if (currentStatus === 'BOOKED') {
            try {
              if ((client.events || '').trim()) {
                const { ensureFreelancerAssignmentRows } = await import('@/lib/freelancer-assignment-cache');
                await ensureFreelancerAssignmentRows(
                  client.registeredDateTimeAD,
                  client.clientName || '',
                  client.registeredDateBS || '',
                  client.events || '',
                  client.eventYear || '',
                  client.eventMonth || '',
                  client.eventDay || '',
                  client.eventDateAD || ''
                );
              } else {
                // BOOKED client with no events: remove stale assignment rows
                await supabase
                  .from('freelancer_assignments')
                  .delete()
                  .eq('registered_date_time_ad', client.registeredDateTimeAD);
              }
              window.dispatchEvent(new Event('clients-invalidate'));
              window.dispatchEvent(new Event('booked-clients-invalidate'));
            } catch (err) {
              console.warn('[ClientDetail] Failed to sync freelancer assignments:', err);
            }
          }
        }
      }).catch(err => {
        console.warn('[ClientDetail] Failed to sync missing event rows:', err);
        refetchEventDetails();
      });
    }
  }, [client?.events, client?.eventYear, client?.eventMonth, client?.eventDay]);

  // Fetch freelancer assignments for dashboard display
  const {
    assignments: freelancerAssignments,
    freelancers: allFreelancers,
    refetch: refetchFreelancerAssignments,
    updateAssignment: updateFreelancerAssignmentFromHook,
  } = useFreelancerAssignments(client?.registeredDateTimeAD);

  // Fetch client contact details (lazy-loaded: only when contact tab is active)
  const {
    data: contactDetailsData,
    isLoading: contactDetailsLoading,
    isResyncing: contactDetailsResyncing,
    updateContactDetails,
    resyncClient: resyncContactDetails,
    markFormAsSent,
  } = useClientContactDetails(client?.registeredDateTimeAD, activeSection === 'clientDetails');


  const handleEdit = () => {
    if (!client) return;
    navigate(`/client-tracker/quick-add?edit=true`, {
      state: {
        clientData: client,
        returnState: fromState
      }
    });
  };

  const handleBack = () => {
    // Priority 1: Use the from state if available (passed from navigation source)
    if (fromState?.from) {
      navigate(fromState.from, { 
        state: fromState.filters 
      });
      return;
    }
    
    // Priority 2: Try browser history if available
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    
    // Priority 3: Default to client tracker dashboard
    navigate('/client-tracker');
  };

  // FAB handlers — Supabase-first: update local + cache instantly, Sheets in background
  const handleCall = async (type: 'DIRECT' | 'WHATSAPP') => {
    if (!client) return;
    
    setIsLoggingCall(true);
    try {
      // Step 1: Compute new call log locally — use callLog, NOT statusLog
      const existingCallLog = client.callLog || '';
      const newCallLog = generateCallLogEntry(type, existingCallLog);
      
      // Update cache with call log (NOT status log) — push scheduler handles Sheets sync
      if (updateClientCache) {
        await updateClientCache({ ...client, callLog: newCallLog });
      }
      
      // Open phone/WhatsApp immediately
      const phoneNumber = type === 'DIRECT' ? client.contactNo : client.whatsappNo;
      if (type === 'DIRECT' && phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
      } else if (type === 'WHATSAPP' && phoneNumber) {
        openWhatsApp(phoneNumber);
      }
      
      toast({ title: "Success", description: `${type} call logged` });
      // No direct logCallAttempt() call — cache write + schedulePushToSheets handles it
    } catch (err) {
      console.error('Failed to log call:', err);
      toast({ title: "Error", description: "Failed to log call", variant: "destructive" });
    } finally {
      setIsLoggingCall(false);
      setShowFab(false);
    }
  };

  const [showBookedPasswordDialog, setShowBookedPasswordDialog] = useState(false);
  const [bookedPendingStatus, setBookedPendingStatus] = useState("");

  const handleStatusChange = async (newStatus: string) => {
    if (!client) return;

    // GATE: If client is currently BOOKED, require password first
    const isCurrentlyBooked =
      client._source === 'booked' ||
      (getCurrentStatus(currentStatusLog).toUpperCase().includes('BOOKED') &&
       !getCurrentStatus(currentStatusLog).toUpperCase().includes('SOMEWHERE ELSE'));

    if (isCurrentlyBooked) {
      setBookedPendingStatus(newStatus);
      setShowBookedPasswordDialog(true);
      return;
    }
    
    // INTERCEPT: If moving to QUOTATION SENT, ALWAYS show quotation dialog first
    const isToQuotationSent = newStatus.toUpperCase().includes('QUOTATION SENT');
    
    if (isToQuotationSent) {
      setPendingStatus(newStatus);
      setShowQuotationDialog(true);
      return;
    }
    
    // INTERCEPT: If moving to BARGAINING IS ON, show bargaining dialog
    const isToBargaining = newStatus.toUpperCase().includes('BARGAINING');
    if (isToBargaining) {
      setPendingStatus(newStatus);
      setShowBargainingDialog(true);
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
    
    // Continue with normal status change
    await performStatusChange(newStatus);
  };

  const handleBookedPasswordConfirm = () => {
    if (bookedPendingStatus) {
      performStatusChange(bookedPendingStatus);
      setBookedPendingStatus("");
    }
  };

  const performStatusChange = async (newStatus: string) => {
    if (!client) return;
    
    setIsChangingStatus(true);
    try {
      // Supabase-first: compute new status log locally
      const existingLog = currentStatusLog || client.statusLog || '';
      const newStatusLog = generateStatusLogEntry(newStatus, existingLog);
      setCurrentStatusLog(newStatusLog);
      
      // CRITICAL: Update global cache to sync across the app
      if (updateClientCache) {
        await updateClientCache({ 
          ...client, 
          statusLog: newStatusLog 
        });
      }
      
      toast({ title: "Success", description: `Status changed to ${newStatus}` });

      // Background: also trigger direct sheet status update (ID-first)
      updateClientStatus(
        client.rowNumber || 0, newStatus, existingLog, client.registeredDateTimeAD
      ).catch(err => console.warn('[STATUS] Background sheet sync failed:', err));
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setIsChangingStatus(false);
      setShowFab(false);
    }
  };

  // Handle quotation save and status update — Supabase-first
  const handleSaveQuotation = async () => {
    if (!client) return;
    
    const tiers = ['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'];
    const filledQuotations = tiers
      .filter(tier => quotationAmounts[tier]?.trim())
      .map(tier => `${tier}: NPR ${formatNPR(quotationAmounts[tier])}/-`);
    
    if (filledQuotations.length === 0) {
      toast({ title: "Please enter at least one quotation amount", variant: "destructive" });
      return;
    }
    
    const quotationData = filledQuotations.join('\n');
    const existingLog = currentStatusLog || client.statusLog || '';
    const newStatusLog = generateStatusLogEntry('QUOTATION SENT : REVIEW PENDING', existingLog);
    
    setIsSavingQuotation(true);
    try {
      // Instant: update state + cache
      setCurrentQuotationData(quotationData);
      setCurrentStatusLog(newStatusLog);
      
      if (updateClientCache) {
        await updateClientCache({
          ...client,
          quotationData: quotationData,
          statusLog: newStatusLog
        });
      }
      
      toast({ title: "Quotation saved & status updated" });
      setShowQuotationDialog(false);
      setQuotationAmounts({});
      setPendingStatus("");

      // Background sync handled by push-sync process (synced_to_sheet: false)
    } catch (err) {
      console.error('Failed to save quotation:', err);
      toast({ title: "Failed to save quotation", variant: "destructive" });
    } finally {
      setIsSavingQuotation(false);
    }
  };

  // Handle ADVANCE PENDING final quotation save — Supabase-first
  const handleSaveAdvancePendingQuotation = async (packageName: string, amount: string) => {
    if (!client) return;
    
    const finalData = `${packageName}: NPR ${formatNPR(amount)}/-`;
    const existingLog = currentStatusLog || client.statusLog || '';
    const newStatusLog = generateStatusLogEntry(pendingStatus, existingLog);
    
    setIsSavingAdvancePending(true);
    try {
      // Instant: update state + cache
      setCurrentFinalQuotation(finalData);
      setCurrentStatusLog(newStatusLog);
      
      if (updateClientCache) {
        await updateClientCache({
          ...client,
          finalQuotation: finalData,
          statusLog: newStatusLog
        });
      }
      
      toast({ title: "Final quotation locked & status updated to ADVANCE PENDING" });
      setShowAdvancePendingDialog(false);
      setPendingStatus("");

      // Background sync handled by push-sync process (synced_to_sheet: false)
    } catch (err) {
      console.error('Failed to save final quotation:', err);
      toast({ title: "Failed to save final quotation", variant: "destructive" });
    } finally {
      setIsSavingAdvancePending(false);
    }
  };

  // Handle BARGAINING IS ON — Supabase-first
  const handleSaveBargaining = async () => {
    if (!client) return;
    
    if (selectedBargainPackages.length === 0) {
      toast({ title: "Please select at least one package", variant: "destructive" });
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

      const existingLog = currentStatusLog || client.statusLog || '';
      const newStatusLog = generateStatusLogEntry(pendingStatus, existingLog);

      // Instant: update state + cache
      setCurrentStatusLog(newStatusLog);
      if (updateClientCache) {
        await updateClientCache({
          ...client,
          ourBargainedRates: ourLines.join('\n'),
          clientBargainedRates: clientLines.join('\n'),
          statusLog: newStatusLog
        });
      }
      
      toast({ title: "Bargaining details saved & status updated" });
      setShowBargainingDialog(false);
      setSelectedBargainPackages([]);
      setClientBargainRates({});
      setOurBargainRates({});
      setPendingStatus("");

      // Background sync handled by push-sync process (synced_to_sheet: false)
    } catch (err) {
      console.error('Failed to save bargaining:', err);
      toast({ title: "Failed to save bargaining details", variant: "destructive" });
    } finally {
      setIsSavingBargain(false);
    }
  };

  // Handle BOOKED client - Save ONLY final quotation — Supabase-first
  const handleSaveFinalQuotationOnly = async (packageName: string, amount: string) => {
    if (!client) return;
    
    const finalData = `${packageName}: NPR ${formatNPR(amount)}/-`;
    
    setIsSavingAdvancePending(true);
    try {
      // Instant: update state + cache
      setCurrentFinalQuotation(finalData);
      if (updateClientCache) {
        await updateClientCache({ ...client, finalQuotation: finalData });
      }
      
      toast({ title: "Final quotation saved" });
      setShowFinalQuotationSaveDialog(false);

      // Background: sync to Sheets
      updateFinalQuotation(client.rowNumber, finalData, client.registeredDateTimeAD).catch(err => {
        console.warn('[FINAL QUOTATION] Background sheet sync failed:', err);
      });
    } catch (err) {
      console.error('Failed to save final quotation:', err);
      toast({ title: "Failed to save final quotation", variant: "destructive" });
    } finally {
      setIsSavingAdvancePending(false);
    }
  };

  // Handle BOOKED advance payment save — Supabase-first
  const handleSaveBookedPayment = async (data: {
    amount: string;
    paymentType: string;
    bank: string;
    nepaliDate: string;
    adDate: string;
  }) => {
    if (!client?.registeredDateTimeAD) return;

    const parsedFinal = parseFinalQuotation(currentFinalQuotation || client.finalQuotation || '');
    const finalAmount = parsedFinal ? parseInt(parsedFinal.amount.replace(/[^0-9]/g, '')) : 0;

    setIsSavingBookedPayment(true);
    try {
      // ── Step 1: Compute status log locally ──
      const newStatusLog = generateStatusLogEntry(pendingStatus, currentStatusLog || client.statusLog || '');

      // ── Step 2: Compute payment fields locally (mirrors backend exactly) ──
      const { updatedPaymentsMade, updatedPaymentDatesAD, remainingPayment } = computePaymentUpdate({
        paymentAmount: data.amount,
        paymentType: data.paymentType,
        nepaliDate: data.nepaliDate,
        nepaliDateAD: data.adDate,
        bank: data.bank,
        existingPaymentsMade: currentPaymentsMade || client.paymentsMade || '',
        existingPaymentDatesAD: client.paymentDatesAD || '',
        finalQuotationAmount: finalAmount,
      });

      // ── Step 3: Instant Supabase update — flip to 'booked' + write all payment fields ──
      await migrateClientToBookedInCache(
        client.registeredDateTimeAD,
        newStatusLog,
        updatedPaymentsMade,
        updatedPaymentDatesAD,
        remainingPayment,
      );

      // ── Step 3b: Ensure crew table rows exist ──
      if (client.events && client.registeredDateTimeAD) {
        const { ensureFreelancerAssignmentRows } = await import('@/lib/freelancer-assignment-cache');
        await ensureFreelancerAssignmentRows(
          client.registeredDateTimeAD,
          client.clientName || '',
          client.registeredDateBS || '',
          client.events || '',
          client.eventYear || '',
          client.eventMonth || '',
          client.eventDay || '',
          client.eventDateAD || ''
        );
      }

      // ── Step 4: Update local React state instantly ──
      setCurrentStatusLog(newStatusLog);
      setCurrentPaymentsMade(updatedPaymentsMade);
      setCurrentRemainingPayment(remainingPayment);

      if (updateClientCache) {
        updateClientCache({
          ...client,
          statusLog: newStatusLog,
          paymentsMade: updatedPaymentsMade,
          paymentDatesAD: updatedPaymentDatesAD,
          remainingPayment,
          _source: 'booked',
        });
      }

      notifyCacheUpdate('booked-clients-invalidate');
      toast({ title: `Payment recorded & status updated to BOOKED` });
      setShowBookedPaymentDialog(false);
      setPendingStatus("");

      // Background: proper sheet MOVE (tracker -> booked + downstream syncs)
      // Then chain addPayment AFTER move completes with the correct booked row number
      if (client.registeredDateTimeAD) {
        updateClientStatus(client.rowNumber || 0, pendingStatus, currentStatusLog || client.statusLog || '', client.registeredDateTimeAD)
          .then(async (result) => {
            if (result?.movedToBooked || result?.success) {
              const { confirmBookedMigrationSync } = await import('@/lib/clients-supabase-cache');
              await confirmBookedMigrationSync(client.registeredDateTimeAD!, result.actualRowNumber);
              console.log(`[BOOKED MOVE] Successfully moved to BOOKED CLIENTS row ${result.actualRowNumber}`);
            }

            // SEQUENTIAL: call addPayment with the CORRECT booked row number
            const targetRow = result?.actualRowNumber || client.rowNumber;
            addPayment(
              targetRow, data.amount, data.paymentType, data.nepaliDate, data.adDate, data.bank,
              client.paymentsMade || '', client.paymentDatesAD || '', finalAmount,
              client.registeredDateTimeAD, client.clientName || ''
            ).catch(err => {
              console.warn('[BACKGROUND] Income sync via addPayment failed:', err);
            });
          })
          .catch(async (err) => {
            console.error('[BOOKED MOVE] Sheet MOVE FAILED:', err);
            toast({ title: '⚠️ Sheet sync failed', description: 'Client saved locally but may not appear in Google Sheets. Please run Master Sync.', variant: 'destructive' });
          });
      }
    } catch (err) {
      console.error('Failed to save payment:', err);
      toast({ title: "Failed to record payment", variant: "destructive" });
    } finally {
      setIsSavingBookedPayment(false);
    }
  };

  // Handle deleting a client — Supabase-first
  const handleDeleteClient = async () => {
    if (!client?.registeredDateTimeAD) return;
    
    setIsDeletingClient(true);
    try {
      const regId = client.registeredDateTimeAD;
      const sheetSource = (client._source === 'booked' ? 'booked' : 'tracker') as 'tracker' | 'booked';
      
      // 1. Delete from Supabase cache tables instantly
      const { supabase } = await import("@/integrations/supabase/client");
      await Promise.all([
        supabase.from('clients_cache').delete().eq('registered_date_time_ad', regId),
        supabase.from('event_details_cache').delete().eq('registered_date_time_ad', regId),
        supabase.from('contact_details_cache').delete().eq('registered_date_time_ad', regId),
        supabase.from('freelancer_assignments').delete().eq('registered_date_time_ad', regId),
        supabase.from('freelancer_event_settings').delete().eq('registered_date_time_ad', regId),
      ]);

      // 2. Invalidate caches so other modules reflect the deletion
      window.dispatchEvent(new Event('clients-invalidate'));
      window.dispatchEvent(new Event('booked-clients-invalidate'));

      // 3. Show success toast
      toast({ title: "Client deleted", description: `${client.clientName} has been permanently deleted` });
      
      // 3. Navigate back
      navigate('/client-tracker');

      // 4. Fire Sheets delete in background
      deleteClient(regId, sheetSource).catch(err => {
        console.warn('[DELETE] Background sheet delete failed:', err);
      });
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast({ title: "Failed to delete client", description: "Please try again", variant: "destructive" });
    } finally {
      setIsDeletingClient(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle updating client priority (star rating) — Supabase-first
  const handlePriorityChange = async (priority: number) => {
    if (!client) return;
    
    setIsUpdatingPriority(true);
    try {
      // Instant: update cache
      if (updateClientCache) {
        await updateClientCache({ ...client, priority: priority.toString() });
      }
      
      toast({ 
        title: priority > 0 ? `Priority set to ${priority} star${priority !== 1 ? 's' : ''}` : "Priority cleared"
      });

      // Background: sync to Sheets (skip if rowNumber is invalid — push scheduler will handle it)
      if (client.rowNumber && client.rowNumber >= 2) {
        updateClientPriority(client.rowNumber, priority.toString(), client.registeredDateTimeAD).catch(err => {
          console.warn('[PRIORITY] Background sheet sync failed:', err);
        });
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
      toast({ title: "Failed to update priority", variant: "destructive" });
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Handle adding a comment (from Comments tab)
  const handleAddComment = async () => {
    if (!client || !newComment.trim()) return;
    await handleAddCommentDirect(newComment.trim());
    setNewComment('');
  };

  // Handle adding a comment directly — Supabase-first
  const handleAddCommentDirect = async (commentText: string) => {
    if (!client || !commentText.trim()) return;
    
    setIsAddingComment(true);
    try {
      // Instant: compute new comments locally and update state + cache
      const existingComments = currentComments || client.comments || '';
      const newComments = generateCommentEntry(commentText.trim(), existingComments);
      setCurrentComments(newComments);
      
      if (updateClientCache) {
        await updateClientCache({ ...client, comments: newComments });
      }
      
      toast({ title: "Comment added" });

      // Background: sync to Sheets
      addClientComment(
        client.rowNumber, 
        commentText.trim(), 
        existingComments,
        client.registeredDateTimeAD
      ).catch(err => {
        console.warn('[COMMENT] Background sheet sync failed:', err);
      });
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast({ title: "Failed to add comment", variant: "destructive" });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handlePaymentAdded = (paymentsMade: string, remainingPayment: string) => {
    setCurrentPaymentsMade(paymentsMade);
    setCurrentRemainingPayment(remainingPayment);
    if (updateClientCache && client) {
      updateClientCache({ ...client, paymentsMade, remainingPayment });
    }
    setShowPaymentDrawer(false);
  };

  // Parse events
  const events = useMemo(() => {
    if (!client) return [];
    const eventNames = (client.events || '').split('\n').filter(Boolean);
    const years = (client.eventYear || '').split('\n').filter(Boolean);
    const months = (client.eventMonth || '').split('\n').filter(Boolean);
    const days = (client.eventDay || '').split('\n').filter(Boolean);
    
    return eventNames.map((name, i) => ({
      name,
      year: years[i] || '',
      month: months[i] || '',
      day: days[i] || '',
      formatted: `${nepaliMonthsEnglish[parseInt(months[i]) - 1] || months[i]} ${days[i]}, ${years[i]}`
    }));
  }, [client]);

  // Calculate days remaining for first event
  const firstEventDaysRemaining = useMemo(() => {
    if (events.length === 0) return null;
    const firstEvent = events[0];
    if (!firstEvent.year || !firstEvent.month || !firstEvent.day) return null;
    return getDaysUntilEvent(firstEvent.year, firstEvent.month, firstEvent.day);
  }, [events]);

  // Parse inquiry info
  const inquiryInfo = useMemo(() => {
    if (!client) return null;
    return getDetailedEnquiryInfo(client.inquiryDateAD, client.inquiryTime, client.inquiryDateBS);
  }, [client]);

  // Get month for color
  const inquiryMonth = useMemo(() => {
    if (!client) return null;
    return parseInquiryMonth(client.inquiryDateBS);
  }, [client]);

  const currentStatus = client ? getCurrentStatus(currentStatusLog || client.statusLog || '') : '';
  const quotationTiers = useMemo(() => 
    parseQuotationData(currentQuotationData || client?.quotationData || ''), 
    [currentQuotationData, client?.quotationData]
  );
  const mindsetData = client ? parseMindset(client.mindset) : null;
  const callEntries = client ? parseCallLog(client.callLog) : [];
  const parsedComments = useMemo(() => 
    parseComments(currentComments || client?.comments || ''),
    [currentComments, client?.comments]
  );
  const finalQuotation = client ? parseFinalQuotation(client.finalQuotation) : null;
  const payments = client ? parsePayments(client.paymentsMade) : [];
  const totalPaid = client ? getTotalPaid(client.paymentsMade) : 0;

  // Initialize state when client changes - use all relevant fields to catch updates
  useEffect(() => {
    if (client) {
      setCurrentStatusLog(client.statusLog || '');
      setCurrentComments(client.comments || '');
      setCurrentQuotationData(client.quotationData || '');
      setCurrentPaymentsMade(client.paymentsMade || '');
      setCurrentRemainingPayment(client.remainingPayment || '');
      setCurrentFinalQuotation(client.finalQuotation || '');
      setCurrentKeepNotes(client.benzoKeepNotes || '');
    }
  }, [client?.rowNumber, client?.registeredDateTimeAD, client?.statusLog, client?.comments, client?.quotationData, client?.paymentsMade, client?.remainingPayment, client?.finalQuotation, client?.benzoKeepNotes]);

  // Handle saving Benzo Keep notes
  const handleSaveKeepNotes = async (notesData: string) => {
    if (!client?.registeredDateTimeAD) return;
    
    setIsSavingKeepNotes(true);
    try {
      // Step 1: Update UI + caches instantly
      setCurrentKeepNotes(notesData);
      if (updateClientCache) {
        await updateClientCache({ ...client, benzoKeepNotes: notesData });
      }
      toast({ title: "Note saved" });
      setShowBenzoKeepDialog(false);

      // Step 2: Sync to Google Sheets in background (non-blocking)
      updateBenzoKeepNotes(
        client.rowNumber,
        notesData,
        client.registeredDateTimeAD
      ).catch(err => {
        console.warn('[BENZO KEEP] Background sheet sync failed:', err);
      });
    } catch (err) {
      console.error('Failed to save note:', err);
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setIsSavingKeepNotes(false);
    }
  };

  // Only show loading if we have no clients AND still loading
  if (isLoading && clients.length === 0) {
    return (
      <div className="min-h-screen bg-[hsl(220,25%,8%)] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!client) {
    const handleResetLocalData = async () => {
      try {
        await forceResetDatabase();
        toast({ title: "Local data reset", description: "Reloading page..." });
        window.location.reload();
      } catch (error) {
        toast({ title: "Reset failed", description: "Please try clearing browser data manually", variant: "destructive" });
      }
    };

    return (
      <div className="min-h-screen bg-[hsl(220,25%,8%)] flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-white/60 text-center">
          <p className="text-lg mb-2">Client not found</p>
          <p className="text-sm text-white/40">This may be due to stale local data</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/client-tracker')} className="bg-white/10 hover:bg-white/20 text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <Button variant="outline" onClick={refreshData} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button variant="destructive" onClick={handleResetLocalData}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Local Data
          </Button>
        </div>
      </div>
    );
  }


  // View Mode - Netflix Style Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 flex">
      {/* Left Sidebar - Hidden on mobile */}
      {!isMobile && (
        <ClientDetailSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onBack={handleBack}
          clientName={client.clientName}
          commentsCount={parsedComments.length}
          showNavigation={totalCount > 1}
          currentPosition={currentPosition}
          totalCount={totalCount}
          onPrev={handleNavigatePrev}
          onNext={handleNavigateNext}
          canGoPrev={!!prevClientId}
          canGoNext={!!nextClientId}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile Header - Only show on mobile */}
        {isMobile && (
          <div className="sticky top-0 z-50 bg-[hsl(220,25%,8%)]/90 backdrop-blur-xl border-b border-white/10 p-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-white font-semibold flex-1 truncate">{client.clientName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Section Tabs - Match desktop sidebar sections exactly */}
        {isMobile && (
          <div className="px-4 py-3 border-b border-white/10 bg-[hsl(220,25%,8%)]">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="inline-flex gap-2">
                {([
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'events', label: 'Events' },
                  { id: 'clientDetails', label: 'Client' },
                  { id: 'registration', label: 'Registration' },
                  { id: 'inquiry', label: 'Inquiry' },
                  { id: 'sales', label: 'Sales' },
                  { id: 'activity', label: 'Activity' },
                  { id: 'comments', label: 'Comments' },
                  { id: 'financials', label: 'Financials' },
                  { id: 'keepNotes', label: 'Keep' },
                  { id: 'files', label: 'Files' },
                  { id: 'deliverables', label: 'Deliverables' },
                  { id: 'edit', label: 'Edit' },
                  { id: 'album', label: 'Album' },
                ] as { id: SectionType; label: string }[]).map((section) => (
                  <Button
                    key={section.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-full text-sm ${
                      activeSection === section.id
                        ? 'bg-primary text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {section.label}
                    {section.id === 'comments' && parsedComments.length > 0 && (
                      <span className="ml-1 text-xs">({parsedComments.length})</span>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Section Content */}
        <div className="p-4 md:p-6 animate-fade-in">
          {/* Dashboard Section - Hero Content */}
          {activeSection === 'dashboard' && (
            <ClientHeroSection
              client={client}
              currentStatus={currentStatus}
              firstEventDaysRemaining={firstEventDaysRemaining}
              onCall={handleCall}
              onStatusClick={() => setShowStatusDropdown(true)}
              onEdit={handleEdit}
              onAddComment={async (comment) => {
                await handleAddCommentDirect(comment);
              }}
              onAddQuotation={() => {
                setPendingStatus('QUOTATION SENT : REVIEW PENDING');
                setShowQuotationDialog(true);
              }}
              onAddFinalQuotation={() => {
                // For BOOKED clients: open save-only dialog (no status change)
                setShowFinalQuotationSaveDialog(true);
              }}
              onPriorityChange={handlePriorityChange}
              onBenzoKeepClick={() => setShowBenzoKeepDialog(true)}
              onDelete={() => setShowDeleteDialog(true)}
              isLoggingCall={isLoggingCall}
              isChangingStatus={isChangingStatus}
              isAddingComment={isAddingComment}
              isDeleting={isDeletingClient}
              isUpdatingPriority={isUpdatingPriority}
              eventDetailsData={eventDetailsData}
              eventDetailsLoading={eventDetailsLoading}
              freelancerAssignments={freelancerAssignments}
              registeredDateTimeAD={client?.registeredDateTimeAD}
              allFreelancers={allFreelancers}
              onAssignmentUpdate={async (eventName, eventDateAD, field, value) => {
                await updateFreelancerAssignmentFromHook(eventName, eventDateAD, field, value);
                window.dispatchEvent(new Event('clients-invalidate'));
              }}
            />
          )}

          {/* Events Section - Full Screen Expandable View */}
          {activeSection === 'events' && (
            <div className="space-y-4">
              {/* Compact Header with Client Name and Handler */}
              <div className="flex items-center justify-between py-2 px-1 border-b border-white/10 mb-4">
                <h2 className="text-lg font-bold text-white">{client.clientName}</h2>
                {client.clientHandler && (
                  <Badge variant="outline" className="text-xs text-white/70 border-white/30">
                    Handler: {client.clientHandler}
                  </Badge>
                )}
              </div>
              
              {events.length > 0 ? (
                eventDetailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                    <span className="ml-2 text-white/40">Loading event details...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(eventDetailsData?.events || events.map((e, i) => ({
                      eventIndex: i,
                      eventName: e.name,
                      eventYear: e.year || '',
                      eventMonth: e.month || '',
                      eventDay: e.day || '',
                      eventDateAD: '',
                      venueType: '',
                      venueName: '',
                      venueCity: '',
                      venueArea: '',
                      venueMap: '',
                      eventStartTime: '',
                      eventEndTime: '',
                      parlourType: '',
                      parlourName: '',
                      parlourCity: '',
                      parlourArea: '',
                      parlourMap: '',
                      parlourStartTime: '',
                      parlourEndTime: '',
                      doGroomComeInMehndi: '',
                      guestCount: '',
                      eventDemands: [],
                      eventReferences: [],
                    }))).map((eventDetail: any) => {
                      // Check if event is urgent (within 20 days and missing key fields)
                      const isUrgent = (() => {
                        if (!eventDetail.eventDateAD) return false;
                        try {
                          const eventDate = new Date(eventDetail.eventDateAD);
                          const now = new Date();
                          const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          const isMissingFields = !eventDetail.venueName || !eventDetail.eventStartTime;
                          return daysUntil <= 20 && daysUntil > 0 && isMissingFields;
                        } catch { return false; }
                      })();

                      return (
                        <FullScreenEventCard
                          key={eventDetail.eventIndex}
                          event={eventDetail}
                          eventDateAD={eventDetail.eventDateAD}
                          isExpanded={editingEventIndex === eventDetail.eventIndex}
                          onToggleExpand={() => {
                            setEditingEventIndex(
                              editingEventIndex === eventDetail.eventIndex ? null : eventDetail.eventIndex
                            );
                          }}
                          onSave={updateEventDetail}
                          isUrgent={isUrgent}
                          registeredDateTimeAD={client?.registeredDateTimeAD}
                          requiredCategories={
                            freelancerAssignments.find(
                              a => a.event?.trim().toLowerCase() === (eventDetail.eventName || '').trim().toLowerCase()
                                && String(a.eventMonth)?.trim() === String(eventDetail.eventMonth)?.trim()
                                && String(a.eventDay)?.trim() === String(eventDetail.eventDay)?.trim()
                            )?.requiredCategories || ''
                          }
                          onUpdateCategories={async (evName, evDateAD, cats) => {
                            if (client?.registeredDateTimeAD) {
                              await updateRequiredCrewCategories(client.registeredDateTimeAD, evName, evDateAD, cats);
                              await refetchFreelancerAssignments();
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center text-white/40 py-12 bg-white/5 rounded-xl border border-dashed border-white/20">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No events configured for this client</p>
                </div>
              )}
            </div>
          )}

          {/* Registration Section */}
          {activeSection === 'registration' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Registration Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Registered Date</div>
                  <div className="font-semibold text-white">{formatADtoBSWithTime(client.registeredDateTimeAD)}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Registered Date (BS)</div>
                  <div className="font-semibold text-white">{formatBSDateDisplay(client.registeredDateBS)}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Added By</div>
                  <div className="font-semibold text-white">{client.whoAdded || 'Unknown'}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Source</div>
                  <div className="font-semibold text-white">{client.source || 'Unknown'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Client Details Section */}
          {activeSection === 'clientDetails' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Client Details</h2>
              <ClientDetailsCard
                data={contactDetailsData}
                isLoading={contactDetailsLoading}
                isResyncing={contactDetailsResyncing}
                clientWhatsAppNumber={client?.whatsappNo}
                onSave={updateContactDetails}
                onResync={resyncContactDetails}
                onMarkFormSent={markFormAsSent}
              />
            </div>
          )}

          {/* Inquiry Section */}
          {activeSection === 'inquiry' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Inquiry Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Inquiry Date (BS)</div>
                  <div className="font-semibold text-white">{inquiryInfo?.bsDisplay || formatBSDateDisplay(client.inquiryDateBS)}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Inquiry Date (AD)</div>
                  <div className="font-semibold text-white">{client.inquiryDateAD || 'Not recorded'}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Inquiry Time</div>
                  <div className="font-semibold text-white">{client.inquiryTime || 'Not recorded'}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Time Since Inquiry</div>
                  <div className={`font-semibold ${
                    inquiryInfo?.urgency === 'critical' ? 'text-red-400' :
                    inquiryInfo?.urgency === 'urgent' ? 'text-orange-400' :
                    inquiryInfo?.urgency === 'warning' ? 'text-amber-400' : 'text-white'
                  }`}>
                    {inquiryInfo?.timeAgo ? `${inquiryInfo.timeAgo} ago` : 'Unknown'}
                  </div>
                </div>
              </div>
              {client.description && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-4">
                  <div className="text-xs text-white/40 mb-2">Description</div>
                  <div className="text-white/90 whitespace-pre-wrap">{client.description}</div>
                </div>
              )}
            </div>
          )}

          {/* Sales Section */}
          {activeSection === 'sales' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Sales & Quotation</h2>
              
              {/* Quotation Sent Status - Show quotation or prompt to add */}
              {currentStatus.toUpperCase().includes('QUOTATION SENT') && quotationTiers.length === 0 && (
                <div className="p-4 bg-amber-500/20 rounded-xl border border-amber-500/30 animate-fade-in">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-amber-500/30">
                      <FileText className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-amber-200">Quotation Not Recorded</div>
                      <div className="text-sm text-amber-300/70">Status shows QUOTATION SENT but no amounts are recorded</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPendingStatus('QUOTATION SENT : REVIEW PENDING');
                      setShowQuotationDialog(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Quotation Amounts
                  </Button>
                </div>
              )}

              {/* Quotation Amounts - Show if available */}
              <div>
                <div className="text-sm text-white/40 mb-3">Quotation Sent</div>
                {quotationTiers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quotationTiers.map((tier, i) => (
                      <div key={i} className={`p-4 rounded-xl ${getQuotationTierColor(tier.tier)} shadow-lg`}>
                        <div className="text-xs font-semibold opacity-80 mb-1">{tier.tier}</div>
                        <div className="text-lg font-bold">{tier.amount}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/40 p-4 bg-white/5 rounded-xl border border-dashed border-white/20 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div>No quotation amounts recorded</div>
                  </div>
                )}
              </div>

              {/* Mindset */}
              {mindsetData?.name && (
                <div>
                  <div className="text-sm text-white/40 mb-2">Client Mindset</div>
                  <Badge className={getMindsetColor(mindsetData.name)}>{mindsetData.name}</Badge>
                  {mindsetData.timestamp && (
                    <span className="text-xs text-white/40 ml-2">
                      {getRelativeTime(mindsetData.timestamp)}
                    </span>
                  )}
                </div>
              )}

              {/* Bargaining */}
              {(client.ourBargainedRates || client.clientBargainedRates) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-white/40 mb-2">Our Bargained Rates</div>
                    <div className="text-white">{client.ourBargainedRates || 'Not set'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-white/40 mb-2">Client Bargained Rates</div>
                    <div className="text-white">{client.clientBargainedRates || 'Not set'}</div>
                  </div>
                </div>
              )}

              {/* Final Quotation */}
              {finalQuotation && (
                <div>
                  <div className="text-sm text-white/40 mb-2">Final Fixed Quotation 🔒</div>
                  <div className="p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <Badge className="bg-emerald-500 text-white mb-2">{finalQuotation.package}</Badge>
                    <div className="text-2xl font-bold text-white">NPR {formatNPR(finalQuotation.amount)}/-</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Section */}
          {activeSection === 'activity' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Activity & History</h2>
              
              {/* Current Status */}
              <div>
                <div className="text-sm text-white/40 mb-2">Current Status</div>
                <Badge className={`${getStatusColor(currentStatus)} text-base px-4 py-2`}>
                  {currentStatus || 'UNTOUCHED'}
                </Badge>
              </div>

              {/* Handler */}
              <div>
                <div className="text-sm text-white/40 mb-2">Client Handler</div>
                <div className="text-white font-medium">{client.clientHandler || 'Not assigned'}</div>
              </div>

              {/* Status History */}
              {client.statusLog && (
                <div>
                  <div className="text-sm text-white/40 mb-3">Status History</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {client.statusLog.split('\n').filter(Boolean).reverse().map((status, i) => {
                      const bracketMatch = status.match(/\[(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\]/);
                      let bsDate = '';
                      if (bracketMatch) {
                        const [month, day, year] = bracketMatch[1].split('/').map(Number);
                        const [hours, mins] = bracketMatch[2].split(':').map(Number);
                        try {
                          const date = new Date(year, month - 1, day, hours, mins);
                          const np = new NepaliDate(date);
                          const isPM = hours >= 12;
                          const displayHours = hours % 12 || 12;
                          bsDate = `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()} at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                        } catch {}
                      }
                      const statusName = status.split(' [')[0].trim();
                      return (
                        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="font-medium text-white">{statusName}</div>
                          {bsDate && <div className="text-xs text-white/40">{bsDate}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Call Log */}
              {callEntries.length > 0 && (
                <div>
                  <div className="text-sm text-white/40 mb-3">Call History ({callEntries.length} calls)</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {callEntries.map((call, i) => {
                      let bsDate = call.date;
                      if (call.date) {
                        try {
                          const [year, month, day] = call.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          const np = new NepaliDate(date);
                          bsDate = `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()}`;
                        } catch {}
                      }
                      return (
                        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {call.type === 'WHATSAPP' ? (
                              <MessageCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <Phone className="h-4 w-4 text-blue-400" />
                            )}
                            <span className="text-white">{call.type}</span>
                          </div>
                          <div className="text-white/40 text-sm">
                            {bsDate} {call.time && `at ${call.time}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Section */}
          {activeSection === 'comments' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Comments</h2>
              
              {/* Add Comment */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <Plus className="h-4 w-4" />
                  Add New Comment
                </div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your comment here..."
                  className="min-h-[80px] bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={handleAddComment}
                  disabled={isAddingComment || !newComment.trim()}
                  className="gap-2 bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  {isAddingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Add Comment
                </Button>
              </div>

              {/* Existing Comments */}
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm font-medium text-white/40 mb-3">
                  Comment History ({parsedComments.length})
                </div>
                {parsedComments.length > 0 ? (
                  <div className="space-y-3">
                    {parsedComments.map((comment, i) => {
                      let bsDate = '';
                      if (comment.timestamp) {
                        try {
                          const np = new NepaliDate(comment.timestamp);
                          const hours = comment.timestamp.getHours();
                          const mins = comment.timestamp.getMinutes();
                          const isPM = hours >= 12;
                          const displayHours = hours % 12 || 12;
                          bsDate = `${nepaliMonthsEnglish[np.getMonth()]} ${np.getDate()}, ${np.getYear()} at ${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                        } catch {}
                      }
                      return (
                        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <div className="text-white whitespace-pre-wrap">{comment.text}</div>
                          {bsDate && (
                            <div className="text-xs text-white/40 mt-2">{bsDate}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-white/40 py-8 bg-white/5 rounded-xl border border-dashed border-white/20">
                    No comments yet. Add one above!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financials Section */}
          {activeSection === 'financials' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Financials & Payments</h2>
              
              {/* Summary Cards */}
              {finalQuotation && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                    <div className="text-xs text-white/40">Total Quote</div>
                    <div className="text-lg font-bold text-white">NPR {formatNPR(finalQuotation.amount)}/-</div>
                  </div>
                  <div className="p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/30 text-center">
                    <div className="text-xs text-white/40">Total Paid</div>
                    <div className="text-lg font-bold text-emerald-400">NPR {formatNPR(totalPaid)}/-</div>
                  </div>
                  <div className="p-4 bg-amber-500/20 rounded-lg border border-amber-500/30 text-center">
                    <div className="text-xs text-white/40">Remaining</div>
                    <div className="text-lg font-bold text-amber-400">
                      {client.remainingPayment || `NPR ${formatNPR(parseInt(finalQuotation.amount.replace(/,/g, '')) - totalPaid)}/-`}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Progress */}
              {finalQuotation && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/40">Payment Progress</span>
                    <span className="font-medium text-white">
                      {Math.round((totalPaid / parseInt(finalQuotation.amount.replace(/,/g, ''))) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalPaid / parseInt(finalQuotation.amount.replace(/,/g, ''))) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Payments Table */}
              {payments.length > 0 ? (
                <div>
                  <div className="text-sm text-white/40 mb-3">Payment History</div>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="text-left p-3 font-medium text-white/60">Amount</th>
                          <th className="text-left p-3 font-medium text-white/60">Type</th>
                          <th className="text-left p-3 font-medium text-white/60">Date (BS)</th>
                          <th className="text-left p-3 font-medium text-white/60">Bank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment, i) => (
                          <tr key={i} className="border-t border-white/10">
                            <td className="p-3 font-semibold text-white">{payment.amount}</td>
                            <td className="p-3">
                              <Badge className={getPaymentTypeBadgeColor(payment.type)}>{payment.type}</Badge>
                            </td>
                            <td className="p-3 text-white/80">{payment.dateBSFormatted}</td>
                            <td className="p-3 text-white/80">{payment.bank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-white/40 py-8 bg-white/5 rounded-xl border border-dashed border-white/20">
                  No payments recorded
                </div>
              )}
            </div>
          )}

          {/* Keep Notes Section */}
          {activeSection === 'keepNotes' && (
            <BenzoKeepViewer 
              notesData={currentKeepNotes || client.benzoKeepNotes}
              onEdit={() => setShowBenzoKeepDialog(true)}
            />
          )}

          {/* Files Section */}
          {activeSection === 'files' && client?.registeredDateTimeAD && (
            <ClientFilesSection
              registeredDateTimeAD={client.registeredDateTimeAD}
              clientName={client.clientName}
            />
          )}

          {/* Deliverables Section */}
          {activeSection === 'deliverables' && (
            <DeliverablesSection events={events.map(e => ({ name: e.name, month: e.month, day: e.day }))} assignments={freelancerAssignments} registeredDateTimeAD={client.registeredDateTimeAD} />
          )}

          {/* Edit & Production Section */}
          {activeSection === 'edit' && client?.registeredDateTimeAD && (
            <EditProductionSection registeredDateTimeAD={client.registeredDateTimeAD} clientName={client.clientName} />
          )}

          {/* Album Section */}
          {activeSection === 'album' && client?.registeredDateTimeAD && (
            <AlbumSection
              registeredDateTimeAD={client.registeredDateTimeAD}
              clientName={client.clientName || ''}
              assignments={freelancerAssignments}
            />
          )}

          {/* Client Link Section */}
          {activeSection === 'clientLink' && client?.registeredDateTimeAD && (
            <ClientLinkSection
              registeredDateTimeAD={client.registeredDateTimeAD}
              clientName={client.clientName || ''}
              contactNo={client.contactNo || ''}
              whatsappNo={client.whatsappNo || ''}
              brideFullName={contactDetailsData?.bride_full_name || ''}
              brideWhatsapp={contactDetailsData?.bride_whatsapp_number || ''}
              groomFullName={contactDetailsData?.groom_full_name || ''}
              groomWhatsapp={contactDetailsData?.groom_whatsapp_number || ''}
            />
          )}

          {activeSection === 'freelancers' && client?.registeredDateTimeAD && (
            <FreelancerAssignmentSection registeredDateTimeAD={client.registeredDateTimeAD} />
          )}
        </div>
      </div>

      {/* Status Change Dropdown (shown as modal overlay) */}
      <DropdownMenu open={showStatusDropdown} onOpenChange={setShowStatusDropdown}>
        <DropdownMenuTrigger asChild>
          <span className="hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-80 overflow-y-auto bg-[hsl(220,25%,12%)] border-white/20 z-[60] rounded-xl shadow-xl">
          <DropdownMenuLabel className="text-xs text-white/50">Change Status To</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          {dropdowns?.clientStatuses?.map((status) => (
            <DropdownMenuItem 
              key={status} 
              onClick={() => handleStatusChange(status)}
              className="cursor-pointer rounded-lg text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
            >
              {status}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Payment Drawer */}
      {client && (
        <PaymentDrawer
          isOpen={showPaymentDrawer}
          onClose={() => setShowPaymentDrawer(false)}
          clientName={client.clientName || ''}
          rowNumber={client.rowNumber || 0}
          registeredDateTimeAD={client.registeredDateTimeAD || ''}
          existingPaymentsMade={currentPaymentsMade || client.paymentsMade || ''}
          existingPaymentDatesAD={client.paymentDatesAD || ''}
          finalQuotationAmount={finalQuotation ? parseInt(finalQuotation.amount.replace(/,/g, '')) : 0}
          onPaymentAdded={handlePaymentAdded}
        />
      )}

      {/* Quotation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={(open) => {
        if (!open) {
          setShowQuotationDialog(false);
          setQuotationAmounts({});
          setPendingStatus("");
        }
      }}>
        <DialogContent className="max-w-sm bg-[hsl(220,25%,12%)] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Enter Quotation Amounts</DialogTitle>
            <DialogDescription className="text-white/60">
              Enter the prices quoted to {client?.clientName}. At least one is required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'].map((tier) => (
              <div key={tier} className="space-y-1.5">
                <Label className="text-white/80">{tier}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/40">NPR</span>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={quotationAmounts[tier] || ''}
                    onChange={(e) => setQuotationAmounts({ ...quotationAmounts, [tier]: e.target.value })}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowQuotationDialog(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={handleSaveQuotation} disabled={isSavingQuotation} className="bg-primary hover:bg-primary/90">
              {isSavingQuotation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save & Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADVANCE PENDING - Final Quotation Dialog */}
      <FinalQuotationDialog
        open={showAdvancePendingDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAdvancePendingDialog(false);
            setPendingStatus("");
          }
        }}
        clientName={client?.clientName || ''}
        existingQuotationData={currentQuotationData || client?.quotationData || ''}
        onSave={handleSaveAdvancePendingQuotation}
        isSaving={isSavingAdvancePending}
      />

      {/* BOOKED - Save Final Quotation ONLY (no status change) */}
      <FinalQuotationDialog
        open={showFinalQuotationSaveDialog}
        onOpenChange={(open) => {
          if (!open) setShowFinalQuotationSaveDialog(false);
        }}
        clientName={client?.clientName || ''}
        existingQuotationData={currentQuotationData || client?.quotationData || ''}
        existingFinalQuotation={currentFinalQuotation || client?.finalQuotation || ''}
        onSave={handleSaveFinalQuotationOnly}
        isSaving={isSavingAdvancePending}
        saveButtonText="Save Final Quotation"
      />

      {/* BOOKED - Advance Payment Dialog */}
      <AdvancePaymentDialog
        open={showBookedPaymentDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowBookedPaymentDialog(false);
            setPendingStatus("");
          }
        }}
        clientName={client?.clientName || ''}
        finalQuotation={currentFinalQuotation || client?.finalQuotation || ''}
        paymentTypes={dropdowns?.paymentTypes || ['ADVANCE PAYMENT', 'PARTIAL PAYMENT', 'FULL PAYMENT']}
        banks={dropdowns?.banks || ['MASTER BARUN', 'KRIPA SAVINGS', 'KRIPA CURRENT', 'ESEWA', 'KHALTI']}
        onSave={handleSaveBookedPayment}
        isSaving={isSavingBookedPayment}
      />

      {/* BARGAINING IS ON - Bargaining Details Dialog */}
      <Dialog open={showBargainingDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBargainingDialog(false);
          setSelectedBargainPackages([]);
          setClientBargainRates({});
          setOurBargainRates({});
          setPendingStatus("");
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[hsl(220,25%,12%)] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Bargaining Details
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Which packages is {client?.clientName} bargaining about? Select packages and enter bargaining rates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Package Selection from Quotation Data */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">Select Package(s)</Label>
              {parseQuotationData(currentQuotationData || client?.quotationData || '').length > 0 ? (
                <div className="space-y-2">
                  {parseQuotationData(currentQuotationData || client?.quotationData || '').map((q, i) => (
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
                        className="border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <label 
                        htmlFor={`pkg-${q.tier}`}
                        className="text-sm font-medium cursor-pointer px-2 py-1 rounded bg-white/10 text-white"
                      >
                        {q.tier}: {q.amount}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40">No quotation data available. Please add quotation first.</p>
              )}
            </div>
            
            {/* Rate Inputs for Selected Packages */}
            {selectedBargainPackages.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-white/10">
                <Label className="text-sm font-medium text-white/80">Enter Bargaining Rates</Label>
                {selectedBargainPackages.map((tier) => (
                  <div key={tier} className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {tier}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-white/50">Client's Rate</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/40">NPR</span>
                          <Input
                            type="number"
                            placeholder="Client's rate"
                            value={clientBargainRates[tier] || ''}
                            onChange={(e) => setClientBargainRates({ ...clientBargainRates, [tier]: e.target.value })}
                            className="h-8 text-sm bg-white/5 border-white/20 text-white placeholder:text-white/30"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-white/50">Our Counter Rate</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/40">NPR</span>
                          <Input
                            type="number"
                            placeholder="Our new rate"
                            value={ourBargainRates[tier] || ''}
                            onChange={(e) => setOurBargainRates({ ...ourBargainRates, [tier]: e.target.value })}
                            className="h-8 text-sm bg-white/5 border-white/20 text-white placeholder:text-white/30"
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
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBargainingDialog(false);
                setSelectedBargainPackages([]);
                setClientBargainRates({});
                setOurBargainRates({});
                setPendingStatus("");
              }}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBargaining}
              disabled={selectedBargainPackages.length === 0 || isSavingBargain}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSavingBargain ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Save & Move to Bargaining
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benzo Keep Dialog */}
      <BenzoKeepDialog
        open={showBenzoKeepDialog}
        onOpenChange={setShowBenzoKeepDialog}
        clientName={client?.clientName || ''}
        existingNotes={currentKeepNotes || client?.benzoKeepNotes}
        onSave={handleSaveKeepNotes}
        isSaving={isSavingKeepNotes}
      />

      {/* Delete Client Dialog */}
      <DeleteClientDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        clientName={client?.clientName || ''}
        onConfirmDelete={handleDeleteClient}
        isDeleting={isDeletingClient}
      />

      {/* Booked Status Password Gate */}
      <BookedStatusPasswordDialog
        open={showBookedPasswordDialog}
        onOpenChange={(open) => {
          setShowBookedPasswordDialog(open);
          if (!open) setBookedPendingStatus("");
        }}
        clientName={client?.clientName || ''}
        onConfirm={handleBookedPasswordConfirm}
      />
    </div>
  );
};

export default ClientDetail;
