import { useState, useMemo } from "react";
import { ClientData } from "@/lib/sheets-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { NepaliCalendar } from "@/components/form/NepaliCalendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { NepaliDateObject } from "@/lib/nepali-date";
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Brain,
  Banknote,
  Lock,
  CreditCard,
  History,
  Bell,
  AlertTriangle,
  Loader2,
  CalendarDays,
  MessageSquare,
  ArrowRightLeft,
  Edit,
} from "lucide-react";
import {
  parseCallLog,
  getLastCallInfo,
  formatDuration,
  getStatusTimeAgo,
  getEnquiryTimeInfo,
  parseQuotationData,
  formatNPR,
  getQuotationTierColor,
  getMindsetColor,
  parseMindset,
  parseComments,
  getRelativeTime,
  parseFinalQuotation,
  getTotalPaid,
  getCurrentStatus,
} from "@/lib/client-card-utils";
import {
  updateClientStatus,
  updateClientHandler,
  logCallAttempt,
  updateClientQuotation,
  updateClientMindset,
  updateClientBargainedRates,
  updateOurCounterRates,
  addClientComment,
  updateFinalQuotation,
  addPayment,
} from "@/lib/sheets-api";
import { bsToAD } from "@/lib/nepali-date";

interface DesktopClientRowProps {
  client: ClientData;
  category: string;
  handlers: string[];
  statuses: string[];
  mindsetOptions: string[];
  paymentTypes: string[];
  banks: string[];
  onClientUpdate?: (updatedClient: ClientData) => void;
  onOpenDetail?: (client: ClientData) => void;
}

// Nepali months for display
const nepaliMonthsEnglish = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

export function DesktopClientRow({
  client,
  category,
  handlers,
  statuses,
  mindsetOptions,
  paymentTypes,
  banks,
  onClientUpdate,
  onOpenDetail,
}: DesktopClientRowProps) {
  // Expand state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Local state for dynamic values
  const [currentStatusLog, setCurrentStatusLog] = useState(client.statusLog || '');
  const [currentHandler, setCurrentHandler] = useState(client.clientHandler || '');
  const [currentCallLog, setCurrentCallLog] = useState(client.callLog || '');
  const [currentQuotationData, setCurrentQuotationData] = useState(client.quotationData || '');
  const [currentMindset, setCurrentMindset] = useState(client.mindset || '');
  const [currentClientBargainedRates, setCurrentClientBargainedRates] = useState(client.clientBargainedRates || '');
  const [currentOurBargainedRates, setCurrentOurBargainedRates] = useState(client.ourBargainedRates || '');
  const [currentComments, setCurrentComments] = useState(client.comments || '');
  const [currentFinalQuotation, setCurrentFinalQuotation] = useState(client.finalQuotation || '');
  const [currentPaymentsMade, setCurrentPaymentsMade] = useState(client.paymentsMade || '');
  const [currentPaymentDatesAD, setCurrentPaymentDatesAD] = useState(client.paymentDatesAD || '');
  const [currentRemainingPayment, setCurrentRemainingPayment] = useState(client.remainingPayment || '');

  // Loading states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingHandler, setIsUpdatingHandler] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [isSavingQuotation, setIsSavingQuotation] = useState(false);
  const [isUpdatingMindset, setIsUpdatingMindset] = useState(false);
  const [isSavingClientBargain, setIsSavingClientBargain] = useState(false);
  const [isSavingCounterRate, setIsSavingCounterRate] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isSavingFinalQuotation, setIsSavingFinalQuotation] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  // Dialog states
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [showCallHistoryDialog, setShowCallHistoryDialog] = useState(false);
  const [showClientBargainDialog, setShowClientBargainDialog] = useState(false);
  const [showOurCounterRateDialog, setShowOurCounterRateDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showFinalQuotationDialog, setShowFinalQuotationDialog] = useState(false);
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false);

  // Form states
  const [quotationAmounts, setQuotationAmounts] = useState<Record<string, string>>({});
  const [selectedClientBargainPackages, setSelectedClientBargainPackages] = useState<string[]>([]);
  const [clientBargainPrices, setClientBargainPrices] = useState<Record<string, string>>({});
  const [selectedCounterPackages, setSelectedCounterPackages] = useState<string[]>([]);
  const [ourCounterPrices, setOurCounterPrices] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState('');
  const [selectedFinalPackage, setSelectedFinalPackage] = useState('');
  const [newFinalQuotation, setNewFinalQuotation] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [paymentNepaliDates, setPaymentNepaliDates] = useState<NepaliDateObject[]>([]);
  const [selectedBank, setSelectedBank] = useState('');

  // Derived values
  const currentStatus = getCurrentStatus(currentStatusLog);
  const callEntries = useMemo(() => parseCallLog(currentCallLog), [currentCallLog]);
  const callCount = callEntries.length;
  const lastCallInfo = useMemo(() => getLastCallInfo(currentCallLog), [currentCallLog]);
  const enquiryInfo = useMemo(() => getEnquiryTimeInfo(client.inquiryDateAD, client.inquiryTime), [client.inquiryDateAD, client.inquiryTime]);
  const statusTimeAgo = useMemo(() => getStatusTimeAgo(currentStatusLog), [currentStatusLog]);
  const parsedMindset = useMemo(() => parseMindset(currentMindset), [currentMindset]);
  const parsedCommentsList = useMemo(() => parseComments(currentComments), [currentComments]);
  const lastComment = parsedCommentsList.length > 0 ? parsedCommentsList[parsedCommentsList.length - 1] : null;
  const parsedFinal = useMemo(() => parseFinalQuotation(currentFinalQuotation), [currentFinalQuotation]);
  const totalPaid = useMemo(() => getTotalPaid(currentPaymentsMade), [currentPaymentsMade]);

  // Parse events
  const events = useMemo(() => {
    if (!client.events) return [];
    const eventList = client.events.split(',').map(e => e.trim()).filter(Boolean);
    const years = client.eventYear?.split(',').map(e => e.trim()) || [];
    const months = client.eventMonth?.split(',').map(e => e.trim()) || [];
    const days = client.eventDay?.split(',').map(e => e.trim()) || [];
    
    const getEventTheme = (name: string) => {
      const n = name.toLowerCase();
      // Use semantic tokens only
      if (n.includes('reception')) {
        return { border: 'border-accent', bg: 'bg-accent/10', dot: 'bg-accent' };
      }
      if (n.includes('engagement') || n.includes('pre')) {
        return { border: 'border-secondary', bg: 'bg-secondary/10', dot: 'bg-secondary' };
      }
      if (n.includes('wedding')) {
        return { border: 'border-primary', bg: 'bg-primary/10', dot: 'bg-primary' };
      }
      return { border: 'border-primary', bg: 'bg-muted/40', dot: 'bg-primary' };
    };

    return eventList.map((eventName, i) => ({
      eventName,
      year: years[i] || '',
      monthName: months[i] || '',
      day: days[i] || '',
      theme: getEventTheme(eventName),
    }));
  }, [client.events, client.eventYear, client.eventMonth, client.eventDay]);

  // Category flags
  const isJustEnquired = category === 'JUST ENQUIRED';
  const isNumberProvided = category === 'NUMBER PROVIDED';
  const isCallNotReceived = category === 'CALL NOT RECEIVED';
  const isQuotationPending = category === 'CALLED: QUOTATION PENDING';
  const isQuotationSent = category === 'QUOTATION SENT';
  const isBargainingOn = category === 'BARGAINING IS ON';
  const isBooked = category === 'BOOKED';
  const hasContact = !!(client.contactNo || client.whatsappNo);

  // Reminder logic
  const reminderInfo = useMemo(() => {
    if (isBooked || category === 'CANCELLED' || category === 'BOOKED SOMEWHERE ELSE') return null;
    if (callCount > 0) return null; // Don't show reminder if already called
    
    const threshold = isNumberProvided ? 3 : 6;
    if (statusTimeAgo && statusTimeAgo.hoursSinceStatus >= threshold) {
      return {
        show: true,
        message: `FOLLOW UP NEEDED - ${threshold}+ HOURS IN ${category}`
      };
    }
    return null;
  }, [category, isBooked, isNumberProvided, callCount, statusTimeAgo]);

  // Handlers
  const handleCall = async (type: 'DIRECT' | 'WHATSAPP') => {
    if (!client.rowNumber) return;
    
    setIsLoggingCall(true);
    try {
      const result = await logCallAttempt(client.rowNumber, type, currentCallLog);
      setCurrentCallLog(result.callLog);
      
      const phoneNumber = type === 'DIRECT' ? client.contactNo : client.whatsappNo;
      if (type === 'DIRECT' && phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
      } else if (type === 'WHATSAPP' && phoneNumber) {
        window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}`, '_blank');
      }
      
      toast.success(`${type} call logged`);
    } catch (err) {
      console.error('Failed to log call:', err);
      toast.error('Failed to log call');
    } finally {
      setIsLoggingCall(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!client.rowNumber) return;
    
    setIsUpdatingStatus(true);
    try {
      const result = await updateClientStatus(client.rowNumber, newStatus, currentStatusLog);
      setCurrentStatusLog(result.statusLog);
      toast.success(`Status changed to ${newStatus}`);
      
      if (onClientUpdate) {
        onClientUpdate({ ...client, statusLog: result.statusLog });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleHandlerChange = async (handler: string) => {
    if (!client.rowNumber) return;
    
    setIsUpdatingHandler(true);
    try {
      await updateClientHandler(client.rowNumber, handler);
      setCurrentHandler(handler);
      toast.success(`Handler set to ${handler}`);
      
      if (onClientUpdate) {
        onClientUpdate({ ...client, clientHandler: handler });
      }
    } catch (err) {
      console.error('Failed to update handler:', err);
      toast.error('Failed to update handler');
    } finally {
      setIsUpdatingHandler(false);
    }
  };

  const handleMindsetChange = async (mindset: string) => {
    if (!client.rowNumber) return;
    
    setIsUpdatingMindset(true);
    try {
      const result = await updateClientMindset(client.rowNumber, mindset);
      setCurrentMindset(result.mindset);
      toast.success(`Mindset set to ${mindset}`);
    } catch (err) {
      console.error('Failed to update mindset:', err);
      toast.error('Failed to update mindset');
    } finally {
      setIsUpdatingMindset(false);
    }
  };

  const handleSaveQuotation = async () => {
    if (!client.rowNumber) return;
    
    const filledQuotations = Object.entries(quotationAmounts)
      .filter(([_, amount]) => amount.trim())
      .map(([tier, amount]) => `${tier}: NPR ${formatNPR(amount)}/-`);
    
    if (filledQuotations.length === 0) {
      toast.error('Please enter at least one quotation amount');
      return;
    }
    
    const quotationData = filledQuotations.join(' | ');
    
    setIsSavingQuotation(true);
    try {
      await updateClientQuotation(client.rowNumber, quotationData);
      setCurrentQuotationData(quotationData);
      
      // Update status to QUOTATION SENT
      const statusResult = await updateClientStatus(client.rowNumber, 'QUOTATION SENT', currentStatusLog);
      setCurrentStatusLog(statusResult.statusLog);
      
      toast.success('Quotation saved & status updated to QUOTATION SENT');
      setShowQuotationDialog(false);
      setQuotationAmounts({});
      
      if (onClientUpdate) {
        onClientUpdate({ ...client, quotationData, statusLog: statusResult.statusLog });
      }
    } catch (err) {
      console.error('Failed to save quotation:', err);
      toast.error('Failed to save quotation');
    } finally {
      setIsSavingQuotation(false);
    }
  };

  const handleSaveClientBargain = async () => {
    if (!client.rowNumber || selectedClientBargainPackages.length === 0) return;
    
    const bargainData = selectedClientBargainPackages
      .filter(tier => clientBargainPrices[tier])
      .map(tier => `${tier}: NPR ${formatNPR(clientBargainPrices[tier])}/-`)
      .join(' | ');
    
    if (!bargainData) {
      toast.error('Please enter at least one bargain price');
      return;
    }
    
    setIsSavingClientBargain(true);
    try {
      const result = await updateClientBargainedRates(client.rowNumber, bargainData);
      setCurrentClientBargainedRates(result.clientBargainedRates);
      
      toast.success('Client bargained prices saved');
      setShowClientBargainDialog(false);
      setSelectedClientBargainPackages([]);
      setClientBargainPrices({});
    } catch (err) {
      console.error('Failed to save bargain:', err);
      toast.error('Failed to save bargain prices');
    } finally {
      setIsSavingClientBargain(false);
    }
  };

  const handleSaveCounterRate = async () => {
    if (!client.rowNumber || selectedCounterPackages.length === 0) return;
    
    const counterData = selectedCounterPackages
      .filter(tier => ourCounterPrices[tier])
      .map(tier => `${tier}: NPR ${formatNPR(ourCounterPrices[tier])}/-`)
      .join(' | ');
    
    if (!counterData) {
      toast.error('Please enter at least one counter rate');
      return;
    }
    
    setIsSavingCounterRate(true);
    try {
      const result = await updateOurCounterRates(client.rowNumber, counterData);
      setCurrentOurBargainedRates(result.ourBargainedRates);
      
      toast.success('Our counter rates saved');
      setShowOurCounterRateDialog(false);
      setSelectedCounterPackages([]);
      setOurCounterPrices({});
    } catch (err) {
      console.error('Failed to save counter rate:', err);
      toast.error('Failed to save counter rates');
    } finally {
      setIsSavingCounterRate(false);
    }
  };

  const handleAddComment = async () => {
    if (!client.rowNumber || !newComment.trim()) return;
    
    setIsAddingComment(true);
    try {
      const result = await addClientComment(client.rowNumber, newComment.trim(), currentComments);
      setCurrentComments(result.comments);
      setNewComment('');
      toast.success('Comment added');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleSaveFinalQuotation = async () => {
    if (!client.rowNumber || !selectedFinalPackage || !newFinalQuotation.trim()) return;
    
    const finalData = `${selectedFinalPackage} NPR ${formatNPR(newFinalQuotation)}/-`;
    
    setIsSavingFinalQuotation(true);
    try {
      const result = await updateFinalQuotation(client.rowNumber, finalData);
      setCurrentFinalQuotation(result.finalQuotation);
      
      toast.success('Final quotation locked');
      setShowFinalQuotationDialog(false);
      setSelectedFinalPackage('');
      setNewFinalQuotation('');
    } catch (err) {
      console.error('Failed to save final quotation:', err);
      toast.error('Failed to save final quotation');
    } finally {
      setIsSavingFinalQuotation(false);
    }
  };

  const handleAddPayment = async () => {
    if (!client.rowNumber || !paymentAmount || !selectedPaymentType || paymentNepaliDates.length === 0 || !selectedBank) return;
    
    const parsed = parseFinalQuotation(currentFinalQuotation);
    const finalAmount = parsed ? parseInt(parsed.amount.replace(/[^0-9]/g, '')) : 0;
    
    if (!finalAmount) {
      toast.error('No final quotation set');
      return;
    }
    
    const selectedDate = paymentNepaliDates[0];
    const formattedNepaliDate = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
    
    const adDateResult = bsToAD(selectedDate.year, selectedDate.month, selectedDate.day);
    const formattedADDate = adDateResult instanceof Date 
      ? adDateResult.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
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
      
      toast.success(`Payment of NPR ${formatNPR(paymentAmount)}/- recorded!`);
      
      setPaymentAmount('');
      setSelectedPaymentType('');
      setPaymentNepaliDates([]);
      setSelectedBank('');
      setShowPaymentDrawer(false);
      setShowPaymentCalendar(false);
    } catch (err) {
      console.error('Failed to add payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setIsAddingPayment(false);
    }
  };

  // Render quotation tiers
  const renderQuotationTiers = () => {
    const tiers = parseQuotationData(currentQuotationData);
    if (tiers.length === 0) return null;
    
    return (
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Our Proposal</span>
        <div className="flex flex-wrap gap-1">
          {tiers.map((tier, i) => (
            <span key={i} className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium", getQuotationTierColor(tier.tier))}>
              {tier.tier}: {tier.amount}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Render bargaining section
  const renderBargainingSection = () => {
    const ourProposal = parseQuotationData(currentQuotationData);
    const clientBargaining = parseQuotationData(currentClientBargainedRates);
    const ourCounter = parseQuotationData(currentOurBargainedRates);
    
    return (
      <div className="space-y-2">
        {/* Our Proposal */}
        {ourProposal.length > 0 && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Our Proposal</span>
            <div className="flex flex-wrap gap-1">
              {ourProposal.map((tier, i) => (
                <span key={i} className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium", getQuotationTierColor(tier.tier))}>
                  {tier.tier}: {tier.amount}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Client Bargaining */}
        {clientBargaining.length > 0 && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-amber-600 uppercase">Client Bargaining For</span>
            <div className="flex flex-wrap gap-1">
              {clientBargaining.map((tier, i) => {
                const ourTier = ourProposal.find(t => t.tier === tier.tier);
                const ourAmount = ourTier ? parseInt(ourTier.amount.replace(/[^0-9]/g, '')) : 0;
                const clientAmount = parseInt(tier.amount.replace(/[^0-9]/g, ''));
                const diff = ourAmount - clientAmount;
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                      {tier.tier}: {tier.amount}
                    </span>
                    {diff > 0 && (
                      <span className="text-[10px] text-red-500">↓ {formatNPR(diff)}/-</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Our Counter */}
        {ourCounter.length > 0 && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-green-600 uppercase">Our Counter</span>
            <div className="flex flex-wrap gap-1">
              {ourCounter.map((tier, i) => (
                <span key={i} className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
                  {tier.tier}: {tier.amount}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-1 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setShowClientBargainDialog(true)}
          >
            <Banknote className="w-3 h-3 mr-1" />
            Client Rate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => setShowOurCounterRateDialog(true)}
          >
            <ArrowRightLeft className="w-3 h-3 mr-1" />
            Counter
          </Button>
        </div>
      </div>
    );
  };

  // Render booked section
  const renderBookedSection = () => {
    const parsed = parseFinalQuotation(currentFinalQuotation);
    const finalAmount = parsed ? parseInt(parsed.amount.replace(/[^0-9]/g, '')) : 0;
    const remaining = finalAmount - totalPaid;
    
    return (
      <div className="space-y-2">
        {/* Final Quotation */}
        {parsed ? (
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[11px]", getQuotationTierColor(parsed.package))}>
              {parsed.package}
            </Badge>
            <span className="text-sm font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              NPR {parsed.amount}/-
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowFinalQuotationDialog(true)}
          >
            <Lock className="w-3 h-3 mr-1" />
            Set Final Quote
          </Button>
        )}
        
        {/* Payment Info */}
        {parsed && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 font-medium">💰 PAID: NPR {formatNPR(totalPaid)}/-</span>
            </div>
            {remaining > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-600 font-medium">⏳ Remaining: NPR {formatNPR(remaining)}/-</span>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => setShowPaymentDrawer(true)}
            >
              <CreditCard className="w-3 h-3 mr-1" />
              Add Payment
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <TableRow 
        className="hover:bg-muted/50 cursor-pointer group"
        onClick={() => onOpenDetail?.(client)}
      >
        {/* Column 1: Client Info Block */}
        <TableCell className="py-3 align-top">
          <div className="space-y-1.5">
            {/* Client Name */}
            <span className="font-semibold text-sm text-foreground block">{client.clientName}</span>
            
            {/* City */}
            {client.eventCity && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{client.eventCity}</span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
              {client.contactNo && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={() => handleCall('DIRECT')}
                  disabled={isLoggingCall}
                  title={client.contactNo}
                >
                  {isLoggingCall ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Phone className="w-4 h-4 text-blue-600" />
                  )}
                </Button>
              )}
              {client.whatsappNo && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={() => handleCall('WHATSAPP')}
                  disabled={isLoggingCall}
                  title={client.whatsappNo}
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </Button>
              )}
              {callCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCallHistoryDialog(true)}
                  title="View call history"
                >
                  <History className="w-3 h-3 mr-1" />
                  {callCount}
                </Button>
              )}
            </div>
          </div>
          {/* Edit & Expand Buttons */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-border/50 mt-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onOpenDetail?.(client)}
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  More
                </>
              )}
            </Button>
          </div>
        </TableCell>
        
        {/* Column 2: Event */}
        <TableCell className="py-3 align-top">
          <div className="space-y-1.5">
            {events.map((event, i) => (
              <div
                key={i}
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded-md border-l-4",
                  event.theme.bg,
                  event.theme.border
                )}
              >
                <span className="font-medium text-foreground">{event.eventName}</span>
              </div>
            ))}
          </div>
        </TableCell>

        {/* Column 3: Date */}
        <TableCell className="py-3 align-top">
          <div className="space-y-1.5">
            {events.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md bg-muted/30"
              >
                <span className={cn("h-2 w-2 rounded-full", event.theme.dot)} />
                <span className="text-muted-foreground whitespace-nowrap">
                  {event.monthName} {event.day}
                </span>
              </div>
            ))}
          </div>
        </TableCell>
        
        {/* Column 4: Category Details */}
        <TableCell className="py-3 align-top" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2 max-w-md">
            {/* Time Tracking */}
            <div className="flex flex-wrap items-center gap-2">
              {enquiryInfo && (
                <span className={cn(
                  "text-[11px] flex items-center gap-1",
                  enquiryInfo.urgency === 'normal' && "text-gray-500",
                  enquiryInfo.urgency === 'warning' && "text-amber-600",
                  enquiryInfo.urgency === 'urgent' && "text-red-500",
                  enquiryInfo.urgency === 'critical' && "text-red-600 animate-pulse font-medium"
                )}>
                  <Clock className="w-3 h-3" />
                  Enquiry: {enquiryInfo.displayText}
                </span>
              )}
              {statusTimeAgo && !isJustEnquired && (
                <span className="text-[11px] text-muted-foreground">
                  {category}: {statusTimeAgo.displayText}
                </span>
              )}
            </div>
            
            {/* Reminder Alert */}
            {reminderInfo?.show && (
              <div className="flex items-center gap-1 text-[11px] bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-300 animate-pulse">
                <Bell className="w-3 h-3 text-red-600" />
                <span className="font-semibold text-red-700 dark:text-red-400">
                  ⚠️ {reminderInfo.message}
                </span>
              </div>
            )}
            
            {/* Handler Warning for NUMBER PROVIDED */}
            {isNumberProvided && !currentHandler && (
              <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                <span>Handler not selected</span>
              </div>
            )}
            
            {/* Call Tracking */}
            {callCount > 0 && lastCallInfo && (
              <div className={cn(
                "text-[11px] px-2 py-1 rounded",
                isCallNotReceived 
                  ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
              )}>
                🕐 LAST CALLED {lastCallInfo.displayText}
              </div>
            )}
            
            {/* QUOTATION PENDING - Enter Quotation Button */}
            {isQuotationPending && (
              <Button
                size="sm"
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowQuotationDialog(true)}
              >
                <FileText className="w-3 h-3 mr-1" />
                Enter Quotation
              </Button>
            )}
            
            {/* QUOTATION SENT - Show quotation tiers and mindset */}
            {isQuotationSent && (
              <div className="space-y-2">
                {renderQuotationTiers()}
                
                {/* Mindset Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Mindset:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "h-6 text-[11px] px-2",
                          parsedMindset.name 
                            ? getMindsetColor(parsedMindset.name)
                            : "bg-slate-100 text-slate-700"
                        )}
                        disabled={isUpdatingMindset}
                      >
                        {isUpdatingMindset ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Brain className="w-3 h-3 mr-1" />
                            {parsedMindset.name || "Select"}
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto z-50 bg-background">
                      {mindsetOptions.map((mindset) => (
                        <DropdownMenuItem
                          key={mindset}
                          onClick={() => handleMindsetChange(mindset)}
                          className="text-xs cursor-pointer"
                        >
                          {mindset}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
            
            {/* BARGAINING IS ON - Full bargaining UI */}
            {isBargainingOn && renderBargainingSection()}
            
            {/* BOOKED - Payment tracking */}
            {isBooked && renderBookedSection()}
            
            {/* Handler Dropdown (for most categories) */}
            {!isJustEnquired && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Handler:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] px-2 bg-muted/50"
                      disabled={isUpdatingHandler}
                    >
                      {isUpdatingHandler ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          {currentHandler || "Assign"}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto z-50 bg-background">
                    {handlers.map((handler) => (
                      <DropdownMenuItem
                        key={handler}
                        onClick={() => handleHandlerChange(handler)}
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
            
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Status:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2 bg-muted/50"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        {currentStatus}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto z-50 bg-background">
                  {statuses.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
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
            
            {/* Comments */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCommentDialog(true)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                {parsedCommentsList.length > 0 ? parsedCommentsList.length : '+'}
              </Button>
              {lastComment && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                  💬 {lastComment.text}
                </span>
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
      
      {/* Expandable Details Row */}
      {isExpanded && (
        <TableRow className="bg-muted/30 border-t-0">
          <TableCell colSpan={4} className="py-3 px-4">
            <div className="grid grid-cols-4 gap-4 text-xs">
              {/* Source */}
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                  Source
                </div>
                <div className="text-foreground">
                  {client.source || <span className="text-muted-foreground italic">Not specified</span>}
                </div>
              </div>
              
              {/* Description */}
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                  Description
                </div>
                <div className="text-foreground max-h-20 overflow-y-auto">
                  {client.description || <span className="text-muted-foreground italic">No description</span>}
                </div>
              </div>
              
              {/* Full Call Log */}
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                  Call History ({callCount})
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {callEntries.length === 0 ? (
                    <span className="text-muted-foreground italic">No calls logged</span>
                  ) : (
                    callEntries.map((entry, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded text-[10px]",
                          entry.type === 'WHATSAPP' 
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        )}
                      >
                        {entry.type === 'WHATSAPP' ? (
                          <MessageCircle className="w-3 h-3" />
                        ) : (
                          <Phone className="w-3 h-3" />
                        )}
                        <span>{entry.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Full Comments */}
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] flex items-center gap-1">
                  Comments ({parsedCommentsList.length})
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 ml-1"
                    onClick={() => setShowCommentDialog(true)}
                  >
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {parsedCommentsList.length === 0 ? (
                    <span className="text-muted-foreground italic">No comments yet</span>
                  ) : (
                    [...parsedCommentsList].reverse().map((comment, i) => (
                      <div key={i} className="bg-background rounded px-2 py-1.5 border border-border/50">
                        <p className="text-foreground leading-tight">{comment.text}</p>
                        {comment.timestamp && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {getRelativeTime(comment.timestamp)}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      
      {/* Dialogs */}
      {/* Call History Dialog */}
      <Dialog open={showCallHistoryDialog} onOpenChange={setShowCallHistoryDialog}>
        <DialogContent className="max-w-sm">
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
      
      {/* Quotation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Enter Quotation
            </DialogTitle>
            <DialogDescription>
              Enter pricing for {client.clientName}. At least one tier is required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            {['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'].map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold px-2 py-1 rounded w-24 text-center", getQuotationTierColor(tier))}>
                  {tier}
                </span>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-muted-foreground">NPR</span>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={quotationAmounts[tier] || ''}
                    onChange={(e) => setQuotationAmounts({ ...quotationAmounts, [tier]: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">/-</span>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQuotationDialog(false);
              setQuotationAmounts({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveQuotation}
              disabled={Object.values(quotationAmounts).every(v => !v.trim()) || isSavingQuotation}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSavingQuotation && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send to Quotation Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Client Bargain Dialog */}
      <Dialog open={showClientBargainDialog} onOpenChange={setShowClientBargainDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Package(s)</Label>
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
                        className={cn("text-sm font-medium cursor-pointer px-2 py-1 rounded", getQuotationTierColor(q.tier))}
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
            
            {selectedClientBargainPackages.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Enter Client's Bargained Prices</Label>
                {selectedClientBargainPackages.map((tier) => (
                  <div key={tier} className="space-y-1 p-3 bg-muted/30 rounded-lg">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", getQuotationTierColor(tier))}>
                      {tier}
                    </span>
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
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
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
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSavingClientBargain && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Bargained Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Our Counter Rate Dialog */}
      <Dialog open={showOurCounterRateDialog} onOpenChange={setShowOurCounterRateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                        <label htmlFor={`counter-pkg-${q.tier}`} className="flex flex-col">
                          <span className={cn("text-sm font-medium px-2 py-1 rounded", getQuotationTierColor(q.tier))}>
                            {q.tier}: {q.amount}
                          </span>
                          {clientRate && (
                            <span className="text-[10px] text-amber-600 ml-2 mt-0.5">
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
            
            {selectedCounterPackages.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Enter Our Counter Prices</Label>
                {selectedCounterPackages.map((tier) => (
                  <div key={tier} className="space-y-1 p-3 bg-green-50/50 dark:bg-green-900/20 rounded-lg">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", getQuotationTierColor(tier))}>
                      {tier}
                    </span>
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
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOurCounterRateDialog(false);
              setSelectedCounterPackages([]);
              setOurCounterPrices({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCounterRate}
              disabled={selectedCounterPackages.length === 0 || isSavingCounterRate}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSavingCounterRate && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Counter Rates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments - {client.clientName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Comment History */}
            <ScrollArea className="max-h-48">
              {parsedCommentsList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-2">
                  {parsedCommentsList.map((comment, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/50 rounded">
                      <p className="whitespace-pre-wrap">{comment.text}</p>
                      {comment.timestamp && (
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          🕐 {getRelativeTime(comment.timestamp)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* Add Comment */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Add Comment</Label>
              <Input
                placeholder="Type your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
                className="w-full"
              >
                {isAddingComment && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Final Quotation Dialog */}
      <Dialog open={showFinalQuotationDialog} onOpenChange={setShowFinalQuotationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              Set Final Quotation
            </DialogTitle>
            <DialogDescription>
              Lock the final booked amount for {client.clientName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
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
                      "h-10 text-xs font-semibold",
                      selectedFinalPackage === pkg && getQuotationTierColor(pkg)
                    )}
                    onClick={() => setSelectedFinalPackage(pkg)}
                  >
                    {pkg}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Final Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">NPR</span>
                <Input
                  type="number"
                  placeholder="e.g., 85000"
                  value={newFinalQuotation}
                  onChange={(e) => setNewFinalQuotation(e.target.value)}
                  className="flex-1 text-lg font-semibold"
                />
                <span className="text-sm text-muted-foreground">/-</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
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
              className="bg-green-600 hover:bg-green-700"
            >
              {isSavingFinalQuotation && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Final Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Drawer */}
      <Drawer open={showPaymentDrawer} onOpenChange={setShowPaymentDrawer}>
        <DrawerContent className="max-h-[90vh]">
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
              {/* Payment Amount */}
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
                  />
                  <span className="text-xs text-muted-foreground">/-</span>
                </div>
              </div>
              
              {/* Payment Type */}
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
                      onClick={() => setSelectedPaymentType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Nepali Date */}
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
                      onClick={() => setShowPaymentCalendar(true)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-9 justify-start text-muted-foreground text-sm"
                    onClick={() => setShowPaymentCalendar(true)}
                  >
                    <CalendarDays className="w-3.5 h-3.5 mr-2" />
                    Select payment date
                  </Button>
                )}
                
                {showPaymentCalendar && (
                  <div className="mt-2 border rounded-lg p-2 bg-background">
                    <NepaliCalendar
                      selectedDates={paymentNepaliDates}
                      onDateSelect={(dates) => {
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
              
              {/* Bank */}
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
                      onClick={() => setSelectedBank(bank)}
                    >
                      {bank}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Submit */}
              <Button
                className="w-full h-10 text-sm bg-blue-600 hover:bg-blue-700 mt-2"
                disabled={!paymentAmount || !selectedPaymentType || paymentNepaliDates.length === 0 || !selectedBank || isAddingPayment}
                onClick={handleAddPayment}
              >
                {isAddingPayment && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <CreditCard className="w-4 h-4 mr-2" />
                Save Payment
              </Button>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}
