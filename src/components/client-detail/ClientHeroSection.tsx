import { MessageCircle, Mail, MapPin, RefreshCw, Pencil, Clock } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientData } from "@/lib/sheets-api";
import { getMonthColorClasses, parseInquiryMonth } from "@/lib/client-card-utils";
import QuotationDisplaySection from "./QuotationDisplaySection";
import DashboardEventDetails from "./DashboardEventDetails";
import { EventDetailsData } from "@/hooks/useEventDetails";
interface ClientHeroSectionProps {
  client: ClientData;
  currentStatus: string;
  firstEventDaysRemaining?: number | null;
  onCall: (type: 'DIRECT' | 'WHATSAPP') => void;
  onStatusClick: () => void;
  onEdit: () => void;
  onSync: () => void;
  onAddComment: (comment: string) => Promise<void>;
  onAddQuotation: () => void;
  isLoggingCall?: boolean;
  isChangingStatus?: boolean;
  isAddingComment?: boolean;
  isSyncing?: boolean;
  eventDetailsData?: EventDetailsData | null;
  eventDetailsLoading?: boolean;
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

// Format description with better readability
function formatDescription(text: string): string {
  if (!text) return '';
  
  const segments = text
    .split(/\s*[:\n]\s*/)
    .map(segment => segment.trim())
    .filter(Boolean)
    .map(segment => {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });
  
  return segments.join(' • ');
}

const ClientHeroSection = ({
  client,
  currentStatus,
  firstEventDaysRemaining,
  onCall,
  onStatusClick,
  onEdit,
  onSync,
  onAddComment,
  onAddQuotation,
  isLoggingCall = false,
  isChangingStatus = false,
  isAddingComment = false,
  isSyncing = false,
  eventDetailsData,
  eventDetailsLoading = false,
}: ClientHeroSectionProps) => {
  const inquiryMonth = parseInquiryMonth(client.inquiryDateBS);
  const monthColorClasses = inquiryMonth ? getMonthColorClasses(inquiryMonth) : '';

  // Handle direct contact click - opens app AND logs call
  const handleContactClick = () => {
    if (client.contactNo) {
      window.open(`tel:${client.contactNo}`, '_self');
      // Fire and forget call logging
      onCall('DIRECT');
    }
  };

  // Handle WhatsApp click - opens app AND logs call
  const handleWhatsAppClick = () => {
    if (client.whatsappNo) {
      openWhatsApp(client.whatsappNo);
      // Fire and forget call logging
      onCall('WHATSAPP');
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative p-4 md:p-6">
        {/* Row 1: Client Name + Days Remaining + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className={`text-xl md:text-2xl font-bold text-white inline-block px-3 py-1 rounded-lg ${monthColorClasses || 'bg-emerald-900/30'}`}>
              {client.clientName}
            </h1>
            {firstEventDaysRemaining !== null && firstEventDaysRemaining !== undefined && (
              <Badge className="bg-amber-500/30 text-amber-200 border-0 gap-1">
                <Clock className="h-3 w-3" />
                {firstEventDaysRemaining} day{firstEventDaysRemaining !== 1 ? 's' : ''} remaining
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`${getStatusColor(currentStatus)} text-xs px-3 py-1 shadow-lg`}>
              {currentStatus || 'UNTOUCHED'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSync}
              disabled={isSyncing}
              className="rounded-full text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="rounded-full text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Row 2: Contact Info (clickable) + Email + City + Added By + Handler */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-3">
          {client.contactNo && (
            <button
              onClick={handleContactClick}
              disabled={isLoggingCall}
              className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors disabled:opacity-50"
            >
              {client.contactNo}
            </button>
          )}
          {client.whatsappNo && (
            <button
              onClick={handleWhatsAppClick}
              disabled={isLoggingCall}
              className="text-green-400 hover:text-green-300 hover:underline font-medium transition-colors disabled:opacity-50"
            >
              {client.whatsappNo}
            </button>
          )}
          {client.email && (
            <div className="flex items-center gap-1.5 text-white/60">
              <Mail className="h-3.5 w-3.5 text-amber-400" />
              <span className="truncate max-w-[150px]">{client.email}</span>
            </div>
          )}
          {client.eventCity && (
            <div className="flex items-center gap-1.5 text-white/60">
              <MapPin className="h-3.5 w-3.5 text-purple-400" />
              <span>{client.eventCity}</span>
            </div>
          )}
          
          {/* Separator */}
          <div className="w-px h-4 bg-white/20 hidden md:block" />
          
          {/* Added By */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
              {client.whoAdded ? client.whoAdded.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            </div>
            <span className="text-white/60 text-xs">
              <span className="text-white/40">Added:</span> {client.whoAdded || 'Unknown'}
            </span>
          </div>
          
          {/* Handler */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-bold">
              {client.clientHandler ? client.clientHandler.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            </div>
            <span className="text-white/60 text-xs">
              <span className="text-white/40">Handler:</span> {client.clientHandler || 'Not Assigned'}
            </span>
          </div>
        </div>

        {/* Row 3: Quick Action Buttons (no Payment) */}
        <div className="flex flex-wrap gap-2 mb-4">
          {client.contactNo && (
            <Button
              size="sm"
              className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 h-8 text-xs"
              onClick={() => onCall('DIRECT')}
              disabled={isLoggingCall}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Call</span>
            </Button>
          )}
          {client.whatsappNo && (
            <Button
              size="sm"
              className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 h-8 text-xs"
              onClick={() => onCall('WHATSAPP')}
              disabled={isLoggingCall}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 h-8 text-xs"
            onClick={onStatusClick}
            disabled={isChangingStatus}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChangingStatus ? 'animate-spin' : ''}`} />
            <span>Status</span>
          </Button>
        </div>

        {/* Quotation + Comments Side by Side */}
        <QuotationDisplaySection
          status={currentStatus}
          quotationData={client.quotationData}
          ourBargainedRates={client.ourBargainedRates}
          clientBargainedRates={client.clientBargainedRates}
          finalQuotation={client.finalQuotation}
          onAddQuotation={onAddQuotation}
          comments={client.comments}
          onAddComment={onAddComment}
          isAddingComment={isAddingComment}
        />

        {/* Event Details - Two Column Layout */}
        <DashboardEventDetails 
          eventDetailsData={eventDetailsData}
          isLoading={eventDetailsLoading}
          clientEvents={{
            events: client.events || '',
            eventYear: client.eventYear || '',
            eventMonth: client.eventMonth || '',
            eventDay: client.eventDay || '',
          }}
        />

        {/* Description Box - Always visible */}
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent rounded-xl border-l-4 border-amber-500 p-3 mt-4 animate-fade-in">
          <div className="flex items-start gap-2">
            <div className="shrink-0 text-amber-400/60">
              <span className="text-xl font-serif leading-none">"</span>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-amber-400 mb-1 uppercase tracking-widest">
                Client Notes
              </div>
              <div className="text-white/95 leading-relaxed text-xs">
                {client.description?.trim() 
                  ? formatDescription(client.description) 
                  : <span className="text-white/40 italic">No notes added</span>
                }
              </div>
            </div>
            <div className="shrink-0 text-amber-400/60 self-end">
              <span className="text-xl font-serif leading-none">"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHeroSection;
