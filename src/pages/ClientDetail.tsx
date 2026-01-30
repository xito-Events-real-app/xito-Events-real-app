import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft, Phone, MessageCircle, Mail, MapPin, Calendar, User, Clock, DollarSign, FileText, Activity, MessageSquare, Briefcase, Pencil, X, Check, Loader2, Plus, CreditCard, RefreshCw, RotateCcw, Send } from "lucide-react";
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
import { updateClient, ClientData, updateClientStatus, logCallAttempt, addPayment, updateClientQuotation, addClientComment, updateFinalQuotation } from "@/lib/sheets-api";
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
import { FormSection, FormInput, FormSelect, CountrySelector, PhoneInputField, NepaliCalendar } from "@/components/form";
import { EventSelector } from "@/components/form/EventSelector";
import { getCountryCodeFromName } from "@/components/form/CountrySelector";
import { valleyCities, nepalCitiesOutsideValley, clientLocationOptions } from "@/lib/form-data";
import PaymentDrawer from "@/components/finance/PaymentDrawer";
import { ClientDetailSidebar, ClientHeroSection, SectionType, EventDetailsSummaryCard, FullScreenEventCard, ClientDetailsCard } from "@/components/client-detail";
import { EventDetailCard } from "@/components/client-detail/EventDetailCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEventDetails } from "@/hooks/useEventDetails";
import { useClientContactDetails } from "@/hooks/useClientContactDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { FinalQuotationDialog, AdvancePaymentDialog } from "@/components/status-dialogs";

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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedClient, setEditedClient] = useState<ClientData | null>(null);
  
  // Extended edit state for form fields
  const [clientLocation, setClientLocation] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [currentCountryCode, setCurrentCountryCode] = useState("NP");
  const [contactNo, setContactNo] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventFromCity, setEventFromCity] = useState("");
  const [eventToCity, setEventToCity] = useState("");
  const [selectedDates, setSelectedDates] = useState<NepaliDateObject[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, string>>({});
  const [source, setSource] = useState("");
  const [whoseWhatsapp, setWhoseWhatsapp] = useState("");
  const [oldClientName, setOldClientName] = useState("");
  const [whoAdded, setWhoAdded] = useState("");
  const [clientHandler, setClientHandler] = useState("");
  const [inquiryDate, setInquiryDate] = useState<Date | undefined>(undefined);
  const [inquiryTimeInput, setInquiryTimeInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [clientNameInput, setClientNameInput] = useState("");

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

  // Event details editing state
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);

  // Get the from state to preserve filter position when going back
  const fromState = location.state as { 
    from?: string; 
    filters?: any; 
    scrollPosition?: number;
    searchQuery?: string;
    resultIds?: (number | string)[];
    currentIndex?: number;
  } | null;

  // Compute previous/next client IDs for navigation
  const { prevClientId, nextClientId, currentPosition, totalCount, isFromSearch } = useMemo(() => {
    // If coming from search with result context
    if (fromState?.from === 'search' && fromState.resultIds && fromState.currentIndex !== undefined) {
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
      // Don't navigate if editing or if focus is on an input
      if (isEditing || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
  }, [isEditing, prevClientId, nextClientId, handleNavigatePrev, handleNavigateNext]);

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
    updateEventDetail 
  } = useEventDetails(client?.registeredDateTimeAD);

  // Fetch client contact details
  const {
    data: contactDetailsData,
    isLoading: contactDetailsLoading,
    isResyncing: contactDetailsResyncing,
    updateContactDetails,
    resyncClient: resyncContactDetails,
    markFormAsSent,
  } = useClientContactDetails(client?.registeredDateTimeAD);

  // All event options for the event selector
  const allEventOptions = useMemo(() => {
    const eventsList: string[] = [];
    if (dropdowns?.preweddingEvents) eventsList.push(...dropdowns.preweddingEvents);
    if (dropdowns?.weddingEvents) eventsList.push(...dropdowns.weddingEvents);
    if (dropdowns?.postweddingEvents) eventsList.push(...dropdowns.postweddingEvents);
    return [...new Set(eventsList)];
  }, [dropdowns]);

  const sortedDates = useMemo(() => {
    return [...selectedDates].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      const dayA: number = isUnknownDay(a.day) ? 99 : (a.day as number);
      const dayB: number = isUnknownDay(b.day) ? 99 : (b.day as number);
      return dayA - dayB;
    });
  }, [selectedDates]);

  const getDateKey = (date: NepaliDateObject) => `${date.year}-${date.month}-${date.day}`;

  const handleEventChange = (date: NepaliDateObject, event: string) => {
    const key = getDateKey(date);
    setEventsByDate(prev => ({ ...prev, [key]: event }));
  };

  const handleRemoveDate = (date: NepaliDateObject) => {
    const key = getDateKey(date);
    setSelectedDates(prev => prev.filter(d => getDateKey(d) !== key));
    setEventsByDate(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Parse existing dates from client data
  const parseExistingDates = (clientData: ClientData): NepaliDateObject[] => {
    if (!clientData.eventYear || !clientData.eventMonth || !clientData.eventDay) return [];
    
    const years = clientData.eventYear.split('\n');
    const months = clientData.eventMonth.split('\n');
    const days = clientData.eventDay.split('\n');
    
    const dates: NepaliDateObject[] = [];
    for (let i = 0; i < years.length; i++) {
      if (years[i] && months[i] && days[i]) {
        const dayValue = days[i].trim();
        dates.push({
          year: parseInt(years[i]),
          month: parseInt(months[i]),
          day: dayValue === "**" ? "**" : parseInt(dayValue)
        });
      }
    }
    return dates;
  };

  // Parse source into base and sub-value
  const parseSource = (sourceStr: string): { base: string; sub: string } => {
    if (sourceStr.startsWith('WHATSAPP - ')) {
      return { base: 'WHATSAPP', sub: sourceStr.replace('WHATSAPP - ', '') };
    }
    if (sourceStr.startsWith('OLD CLIENT - ')) {
      return { base: 'OLD CLIENT', sub: sourceStr.replace('OLD CLIENT - ', '') };
    }
    return { base: sourceStr, sub: '' };
  };

  // Parse event city
  const parseEventCity = (eventLoc: string, cityStr: string): { city: string; from: string; to: string } => {
    if (eventLoc === 'MIXED' || eventLoc === 'ABROAD') {
      const parts = cityStr.split(' - ');
      return { city: '', from: parts[0] || '', to: parts[1] || '' };
    }
    return { city: cityStr, from: '', to: '' };
  };

  const handleEdit = () => {
    if (!client) return;
    setEditedClient({ ...client });
    
    setClientNameInput(client.clientName || '');
    setClientLocation(client.clientLocation || '');
    setCurrentCountry(client.currentCountry || '');
    setCurrentCountryCode(getCountryCodeFromName(client.currentCountry || 'Nepal'));
    setContactNo(client.contactNo || '');
    setWhatsappNo(client.whatsappNo || '');
    setEventLocation(client.eventLocation || '');
    setEmailInput(client.email || '');
    setDescriptionInput(client.description || '');
    
    const cityParsed = parseEventCity(client.eventLocation || '', client.eventCity || '');
    setEventCity(cityParsed.city);
    setEventFromCity(cityParsed.from);
    setEventToCity(cityParsed.to);
    
    const dates = parseExistingDates(client);
    setSelectedDates(dates);
    
    if (client.events && client.eventYear && client.eventMonth && client.eventDay) {
      const eventNames = client.events.split('\n');
      const years = client.eventYear.split('\n');
      const months = client.eventMonth.split('\n');
      const days = client.eventDay.split('\n');
      const eventsMap: Record<string, string> = {};
      
      for (let i = 0; i < years.length; i++) {
        if (years[i] && months[i] && days[i]) {
          const key = `${years[i]}-${months[i]}-${days[i]}`;
          eventsMap[key] = eventNames[i] || '';
        }
      }
      setEventsByDate(eventsMap);
    }
    
    const { base, sub } = parseSource(client.source || '');
    setSource(base);
    if (base === 'WHATSAPP') setWhoseWhatsapp(sub);
    else if (base === 'OLD CLIENT') setOldClientName(sub);
    
    setWhoAdded(client.whoAdded || '');
    setClientHandler(client.clientHandler || '');
    
    if (client.inquiryDateAD) {
      setInquiryDate(new Date(client.inquiryDateAD));
    }
    setInquiryTimeInput(client.inquiryTime || '');
    
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedClient(null);
    setIsEditing(false);
    resetFormState();
  };

  const resetFormState = () => {
    setClientLocation("");
    setCurrentCountry("");
    setCurrentCountryCode("NP");
    setContactNo("");
    setWhatsappNo("");
    setEventLocation("");
    setEventCity("");
    setEventFromCity("");
    setEventToCity("");
    setSelectedDates([]);
    setEventsByDate({});
    setSource("");
    setWhoseWhatsapp("");
    setOldClientName("");
    setWhoAdded("");
    setClientHandler("");
    setInquiryDate(undefined);
    setInquiryTimeInput("");
    setDescriptionInput("");
    setEmailInput("");
    setClientNameInput("");
  };

  const handleClientLocationChange = (loc: string) => {
    setClientLocation(loc);
    if (loc === "INSIDE NEPAL") {
      setCurrentCountry("Nepal");
      setCurrentCountryCode("NP");
    }
  };

  const handleCountryChange = (countryName: string, countryCode?: string) => {
    setCurrentCountry(countryName);
    setCurrentCountryCode(countryCode || getCountryCodeFromName(countryName));
  };

  const getCityOptions = () => {
    if (eventLocation === "INSIDE VALLEY") return valleyCities;
    if (eventLocation === "OUTSIDE VALLEY") return nepalCitiesOutsideValley;
    return [];
  };

  const getEventCityValue = () => {
    if (eventLocation === "INSIDE VALLEY" || eventLocation === "OUTSIDE VALLEY") {
      return eventCity;
    }
    if (eventLocation === "MIXED" || eventLocation === "ABROAD") {
      if (eventFromCity && eventToCity) {
        return `${eventFromCity} - ${eventToCity}`;
      }
      return eventFromCity || eventToCity || "";
    }
    return "";
  };

  const getSourceValue = () => {
    if (source === "WHATSAPP" && whoseWhatsapp) return `WHATSAPP - ${whoseWhatsapp}`;
    if (source === "OLD CLIENT" && oldClientName) return `OLD CLIENT - ${oldClientName}`;
    return source;
  };

  const handleSave = async () => {
    if (!editedClient || !client) return;
    
    setIsSaving(true);
    
    try {
      const sortedForSave = [...selectedDates].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        const dayA = a.day === "**" ? 99 : a.day;
        const dayB = b.day === "**" ? 99 : b.day;
        return (dayA as number) - (dayB as number);
      });

      const eventYears = sortedForSave.map(d => d.year).join("\n");
      const eventMonths = sortedForSave.map(d => d.month).join("\n");
      const eventDays = sortedForSave.map(d => getDayForStorage(d.day)).join("\n");
      const eventADDates = sortedForSave.map(d => {
        const adResult = bsToAD(d.year, d.month, d.day);
        if (isUnknownDay(d.day)) {
          return adResult as string;
        }
        return format(adResult as Date, "yyyy-MM-dd");
      }).join("\n");
      const eventsFormatted = sortedForSave
        .map(d => eventsByDate[getDateKey(d)] || "")
        .filter(Boolean)
        .join("\n");

      const countryForSheet = clientLocation === "INSIDE NEPAL" ? "Nepal" : currentCountry;

      const updatedClient: ClientData = {
        ...editedClient,
        clientName: clientNameInput,
        source: getSourceValue(),
        clientLocation,
        currentCountry: countryForSheet,
        contactNo,
        whatsappNo,
        email: emailInput,
        eventLocation,
        eventCity: getEventCityValue(),
        events: eventsFormatted,
        eventYear: eventYears,
        eventMonth: eventMonths,
        eventDay: eventDays,
        eventDateAD: eventADDates,
        whoAdded,
        clientHandler,
        description: descriptionInput,
        inquiryDateAD: inquiryDate ? format(inquiryDate, "yyyy-MM-dd") : editedClient.inquiryDateAD,
        inquiryTime: inquiryTimeInput,
      };

      await updateClient(updatedClient);
      
      // Update cache
      if (updateClientCache) {
        updateClientCache(updatedClient);
      }
      
      toast({ title: "Success!", description: "Client updated successfully" });
      
      setIsEditing(false);
      resetFormState();
      
    } catch (error) {
      console.error("Update error:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update client", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
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

  // FAB handlers
  const handleCall = async (type: 'DIRECT' | 'WHATSAPP') => {
    if (!client?.rowNumber) return;
    
    setIsLoggingCall(true);
    try {
      const result = await logCallAttempt(client.rowNumber, type, currentStatusLog || client.callLog || '');
      setCurrentStatusLog(result.callLog);
      
      const phoneNumber = type === 'DIRECT' ? client.contactNo : client.whatsappNo;
      if (type === 'DIRECT' && phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
      } else if (type === 'WHATSAPP' && phoneNumber) {
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}`, '_blank');
      }
      
      toast({ title: "Success", description: `${type} call logged` });
      if (updateClientCache) {
        updateClientCache({ ...client, callLog: result.callLog });
      }
    } catch (err) {
      console.error('Failed to log call:', err);
      toast({ title: "Error", description: "Failed to log call", variant: "destructive" });
    } finally {
      setIsLoggingCall(false);
      setShowFab(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!client?.rowNumber) return;
    
    // INTERCEPT: If moving to QUOTATION SENT, ALWAYS show quotation dialog first
    const isToQuotationSent = newStatus.toUpperCase().includes('QUOTATION SENT');
    
    if (isToQuotationSent) {
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
    
    // Continue with normal status change
    await performStatusChange(newStatus);
  };

  const performStatusChange = async (newStatus: string) => {
    if (!client?.rowNumber) return;
    
    setIsChangingStatus(true);
    try {
      const result = await updateClientStatus(client.rowNumber, newStatus, currentStatusLog || client.statusLog || '');
      setCurrentStatusLog(result.statusLog);
      
      // CRITICAL: Update global cache to sync across the app
      if (updateClientCache) {
        updateClientCache({ 
          ...client, 
          statusLog: result.statusLog 
        });
      }
      
      toast({ title: "Success", description: `Status changed to ${newStatus}` });
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setIsChangingStatus(false);
      setShowFab(false);
    }
  };

  // Handle quotation save and status update
  const handleSaveQuotation = async () => {
    if (!client?.rowNumber) return;
    
    const tiers = ['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'];
    const filledQuotations = tiers
      .filter(tier => quotationAmounts[tier]?.trim())
      .map(tier => `${tier}: NPR ${formatNPR(quotationAmounts[tier])}/-`);
    
    if (filledQuotations.length === 0) {
      toast({ title: "Please enter at least one quotation amount", variant: "destructive" });
      return;
    }
    
    const quotationData = filledQuotations.join('\n');
    
    setIsSavingQuotation(true);
    try {
      // Save quotation data
      await updateClientQuotation(client.rowNumber, quotationData);
      setCurrentQuotationData(quotationData);
      
      // Update status to QUOTATION SENT
      const statusResult = await updateClientStatus(client.rowNumber, 'QUOTATION SENT : REVIEW PENDING', currentStatusLog || client.statusLog || '');
      setCurrentStatusLog(statusResult.statusLog);
      
      // Update global cache with both quotation and status
      if (updateClientCache) {
        updateClientCache({
          ...client,
          quotationData: quotationData,
          statusLog: statusResult.statusLog
        });
      }
      
      toast({ title: "Quotation saved & status updated" });
      setShowQuotationDialog(false);
      setQuotationAmounts({});
      setPendingStatus("");
    } catch (err) {
      console.error('Failed to save quotation:', err);
      toast({ title: "Failed to save quotation", variant: "destructive" });
    } finally {
      setIsSavingQuotation(false);
    }
  };

  // Handle ADVANCE PENDING final quotation save
  const handleSaveAdvancePendingQuotation = async (packageName: string, amount: string) => {
    if (!client?.rowNumber) return;
    
    const finalData = `${packageName}: NPR ${formatNPR(amount)}/-`;
    
    setIsSavingAdvancePending(true);
    try {
      // Save final quotation
      const quotationResult = await updateFinalQuotation(client.rowNumber, finalData);
      setCurrentFinalQuotation(quotationResult.finalQuotation);
      
      // Update status to ADVANCE PENDING
      const statusResult = await updateClientStatus(client.rowNumber, pendingStatus, currentStatusLog || client.statusLog || '');
      setCurrentStatusLog(statusResult.statusLog);
      
      // Update global cache
      if (updateClientCache) {
        updateClientCache({
          ...client,
          finalQuotation: quotationResult.finalQuotation,
          statusLog: statusResult.statusLog
        });
      }
      
      toast({ title: "Final quotation locked & status updated to ADVANCE PENDING" });
      setShowAdvancePendingDialog(false);
      setPendingStatus("");
    } catch (err) {
      console.error('Failed to save final quotation:', err);
      toast({ title: "Failed to save final quotation", variant: "destructive" });
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
    if (!client?.rowNumber) return;
    
    const parsedFinal = parseFinalQuotation(currentFinalQuotation || client.finalQuotation || '');
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
        currentPaymentsMade || client.paymentsMade || '',
        client.paymentDatesAD || '',
        finalAmount,
        client.registeredDateTimeAD,
        client.clientName
      );
      
      setCurrentPaymentsMade(paymentResult.paymentsMade);
      setCurrentRemainingPayment(paymentResult.remainingPayment);
      
      // Update status to BOOKED
      const statusResult = await updateClientStatus(client.rowNumber, pendingStatus, currentStatusLog || client.statusLog || '');
      setCurrentStatusLog(statusResult.statusLog);
      
      // Update global cache
      if (updateClientCache) {
        updateClientCache({
          ...client,
          paymentsMade: paymentResult.paymentsMade,
          remainingPayment: paymentResult.remainingPayment,
          statusLog: statusResult.statusLog
        });
      }
      
      // Invalidate booked clients cache to force refresh on next access
      notifyCacheUpdate('booked-clients-invalidate');
      
      toast({ title: `Payment recorded & status updated to BOOKED` });
      setShowBookedPaymentDialog(false);
      setPendingStatus("");
    } catch (err) {
      console.error('Failed to save payment:', err);
      toast({ title: "Failed to record payment", variant: "destructive" });
    } finally {
      setIsSavingBookedPayment(false);
    }
  };

  // Handle adding a comment (from Comments tab)
  const handleAddComment = async () => {
    if (!client?.rowNumber || !newComment.trim()) return;
    await handleAddCommentDirect(newComment.trim());
    setNewComment('');
  };

  // Handle adding a comment directly (from Hero section chat)
  const handleAddCommentDirect = async (commentText: string) => {
    if (!client?.rowNumber || !commentText.trim()) return;
    
    setIsAddingComment(true);
    try {
      const result = await addClientComment(
        client.rowNumber, 
        commentText.trim(), 
        currentComments || client.comments || ''
      );
      setCurrentComments(result.comments);
      toast({ title: "Comment added" });
      
      // Update global cache
      if (updateClientCache) {
        updateClientCache({ ...client, comments: result.comments });
      }
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
    }
  }, [client?.rowNumber, client?.registeredDateTimeAD, client?.statusLog, client?.comments, client?.quotationData, client?.paymentsMade, client?.remainingPayment, client?.finalQuotation]);

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

  // Edit Mode - Keep similar to before but with dark theme
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Edit Header */}
        <div className="sticky top-0 z-50 bg-[hsl(220,25%,8%)]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCancel} 
                  disabled={isSaving}
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold text-white">Edit Client</h1>
              </div>
              <Button 
                size="icon" 
                onClick={handleSave} 
                disabled={isSaving}
                className="rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="container mx-auto px-4 py-6 space-y-4 pb-20">
          {/* Client Basic Details */}
          <FormSection title="Client Basic Details">
            <FormInput 
              label="Client Name" 
              value={clientNameInput} 
              onChange={setClientNameInput} 
              placeholder="Enter client name" 
            />
            <FormSelect 
              label="Source" 
              value={source} 
              onChange={setSource} 
              options={dropdowns?.sources || []} 
              placeholder="How did they find us?" 
            />
            {source === "WHATSAPP" && (
              <FormSelect 
                label="Whose WhatsApp?" 
                value={whoseWhatsapp} 
                onChange={setWhoseWhatsapp} 
                options={dropdowns?.whatsappOwners || []} 
              />
            )}
            {source === "OLD CLIENT" && (
              <FormInput 
                label="Old Client Name" 
                value={oldClientName} 
                onChange={setOldClientName} 
                placeholder="Enter old client name" 
              />
            )}
            <FormSelect 
              label="Added By" 
              value={whoAdded} 
              onChange={setWhoAdded} 
              options={dropdowns?.whatsappOwners || []} 
              placeholder="Who added this client?" 
            />
            <FormSelect 
              label="Handler" 
              value={clientHandler} 
              onChange={setClientHandler} 
              options={dropdowns?.whatsappOwners || []} 
              placeholder="Who is handling this client?" 
            />
          </FormSection>

          {/* Location & Contact */}
          <FormSection title="Location & Contact">
            <FormSelect 
              label="Client Current Location" 
              value={clientLocation} 
              onChange={handleClientLocationChange} 
              options={clientLocationOptions}
              placeholder="Where is the client currently?"
            />
            {clientLocation === "OUTSIDE NEPAL" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Current Country</label>
                <CountrySelector 
                  value={currentCountry} 
                  onChange={handleCountryChange}
                  showAllCountries={true}
                  placeholder="Select country..."
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Number</label>
              <PhoneInputField value={contactNo} onChange={setContactNo} defaultCountry="NP" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Number</label>
              <PhoneInputField 
                value={whatsappNo} 
                onChange={setWhatsappNo} 
                defaultCountry={clientLocation === "OUTSIDE NEPAL" ? currentCountryCode : "NP"} 
              />
            </div>
            <FormInput 
              label="Email" 
              value={emailInput} 
              onChange={setEmailInput} 
              placeholder="client@email.com" 
            />
          </FormSection>

          {/* Event Location */}
          <FormSection title="Event Location">
            <FormSelect 
              label="Event Location" 
              value={eventLocation} 
              onChange={(val) => {
                setEventLocation(val);
                setEventCity("");
                setEventFromCity("");
                setEventToCity("");
              }} 
              options={dropdowns?.eventLocations || []}
              placeholder="Select location type"
            />
            {(eventLocation === "INSIDE VALLEY" || eventLocation === "OUTSIDE VALLEY") && (
              <FormSelect 
                label="Event City" 
                value={eventCity} 
                onChange={setEventCity} 
                options={getCityOptions()}
                placeholder="Select city"
              />
            )}
            {(eventLocation === "MIXED" || eventLocation === "ABROAD") && (
              <div className="grid grid-cols-2 gap-3">
                <FormInput 
                  label="From City" 
                  value={eventFromCity} 
                  onChange={setEventFromCity} 
                  placeholder="e.g. Kathmandu" 
                />
                <FormInput 
                  label="To City" 
                  value={eventToCity} 
                  onChange={setEventToCity} 
                  placeholder="e.g. Pokhara" 
                />
              </div>
            )}
          </FormSection>

          {/* Events & Dates */}
          <FormSection title="Events & Dates">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Event Dates (BS Calendar)</label>
              <NepaliCalendar
                selectedDates={selectedDates}
                onDateSelect={setSelectedDates}
              />
            </div>
            
            {sortedDates.length > 0 && (
              <div className="space-y-3 mt-4">
                {sortedDates.map((date) => {
                  const key = getDateKey(date);
                  return (
                    <EventSelector
                      key={key}
                      date={date}
                      selectedEvent={eventsByDate[key] || ""}
                      onEventChange={(event) => handleEventChange(date, event)}
                      eventOptions={allEventOptions}
                      onRemoveDate={() => handleRemoveDate(date)}
                    />
                  );
                })}
              </div>
            )}
          </FormSection>

          {/* Inquiry Details */}
          <FormSection title="Inquiry Details">
            <FormInput 
              label="Description" 
              value={descriptionInput} 
              onChange={setDescriptionInput} 
              placeholder="Any details about the inquiry..." 
            />
            <FormInput 
              label="Inquiry Time" 
              value={inquiryTimeInput} 
              onChange={setInquiryTimeInput} 
              placeholder="e.g. 10:30 AM" 
            />
          </FormSection>
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
              isLoggingCall={isLoggingCall}
              isChangingStatus={isChangingStatus}
              isAddingComment={isAddingComment}
              eventDetailsData={eventDetailsData}
              eventDetailsLoading={eventDetailsLoading}
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
                          isExpanded={editingEventIndex === eventDetail.eventIndex}
                          onToggleExpand={() => {
                            setEditingEventIndex(
                              editingEventIndex === eventDetail.eventIndex ? null : eventDetail.eventIndex
                            );
                          }}
                          onSave={updateEventDetail}
                          isUrgent={isUrgent}
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
    </div>
  );
};

export default ClientDetail;
