import { Phone, MessageCircle, Mail, MapPin, CreditCard, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientData } from "@/lib/sheets-api";
import { getMonthColorClasses, parseInquiryMonth } from "@/lib/client-card-utils";
import ChatComments from "./ChatComments";
import QuotationDisplaySection from "./QuotationDisplaySection";

interface ClientHeroSectionProps {
  client: ClientData;
  currentStatus: string;
  onCall: (type: 'DIRECT' | 'WHATSAPP') => void;
  onPayment: () => void;
  onStatusClick: () => void;
  onEdit: () => void;
  onAddComment: (comment: string) => Promise<void>;
  onAddQuotation: () => void;
  isLoggingCall?: boolean;
  isChangingStatus?: boolean;
  isAddingComment?: boolean;
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
  
  // Split by common delimiters and clean up
  const segments = text
    .split(/\s*[:\n]\s*/)
    .map(segment => segment.trim())
    .filter(Boolean)
    .map(segment => {
      // Capitalize first letter of each segment
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });
  
  // Join with bullet separator
  return segments.join(' • ');
}

const ClientHeroSection = ({
  client,
  currentStatus,
  onCall,
  onPayment,
  onStatusClick,
  onEdit,
  onAddComment,
  onAddQuotation,
  isLoggingCall = false,
  isChangingStatus = false,
  isAddingComment = false,
}: ClientHeroSectionProps) => {
  const inquiryMonth = parseInquiryMonth(client.inquiryDateBS);
  const monthColorClasses = inquiryMonth ? getMonthColorClasses(inquiryMonth) : '';

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient - matching Finance Manager theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative p-6 md:p-8">
        {/* Top Row: Name + Status + Edit */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {/* Client Name - Large & Prominent */}
            <h1 className={`text-3xl md:text-4xl font-bold text-white mb-2 inline-block px-4 py-2 rounded-xl ${monthColorClasses || 'bg-emerald-900/30'}`}>
              {client.clientName}
            </h1>
            
            
            {/* Contact Info Row - NOT clickable */}
            <div className="flex flex-wrap gap-4 text-white/70 mt-4">
              {client.contactNo && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-400" />
                  <span>{client.contactNo}</span>
                </div>
              )}
              {client.whatsappNo && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-400" />
                  <span>{client.whatsappNo}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-amber-400" />
                  <span className="truncate max-w-[200px]">{client.email}</span>
                </div>
              )}
              {client.eventCity && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-400" />
                  <span>{client.eventCity}</span>
                </div>
              )}
            </div>

            {/* Handler & Added By */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                  {client.whoAdded ? client.whoAdded.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase">Added By</div>
                  <div className="text-sm font-medium text-white/90">{client.whoAdded || 'Unknown'}</div>
                </div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                  {client.clientHandler ? client.clientHandler.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase">Handler</div>
                  <div className="text-sm font-medium text-white/90">{client.clientHandler || 'Not Assigned'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge & Edit */}
          <div className="flex flex-col items-end gap-3">
            <Badge className={`${getStatusColor(currentStatus)} text-sm px-4 py-2 shadow-lg`}>
              {currentStatus || 'UNTOUCHED'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="rounded-full text-white/60 hover:text-white hover:bg-white/10"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quotation Display Section - Below Status */}
        <QuotationDisplaySection
          status={currentStatus}
          quotationData={client.quotationData}
          ourBargainedRates={client.ourBargainedRates}
          clientBargainedRates={client.clientBargainedRates}
          finalQuotation={client.finalQuotation}
          onAddQuotation={onAddQuotation}
        />

        {/* Quick Actions - These buttons trigger call logging */}
        <div className="flex flex-wrap gap-2 mb-6">
          {client.contactNo && (
            <Button
              size="sm"
              className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
              onClick={() => onCall('DIRECT')}
              disabled={isLoggingCall}
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </Button>
          )}
          {client.whatsappNo && (
            <Button
              size="sm"
              className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
              onClick={() => onCall('WHATSAPP')}
              disabled={isLoggingCall}
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
            onClick={onPayment}
          >
            <CreditCard className="h-4 w-4" />
            <span>Payment</span>
          </Button>
          <Button
            size="sm"
            className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
            onClick={onStatusClick}
            disabled={isChangingStatus}
          >
            <RefreshCw className={`h-4 w-4 ${isChangingStatus ? 'animate-spin' : ''}`} />
            <span>Status</span>
          </Button>
        </div>

        {/* Description Box - Cute Netflix Style with Quote Marks */}
        {client.description && (
          <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent rounded-xl border-l-4 border-amber-500 p-4 mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-amber-400/60">
                <span className="text-3xl font-serif leading-none">"</span>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-widest">
                  Client Notes
                </div>
                <div className="text-white/95 leading-relaxed text-sm">
                  {formatDescription(client.description)}
                </div>
              </div>
              <div className="shrink-0 text-amber-400/60 self-end">
                <span className="text-3xl font-serif leading-none">"</span>
              </div>
            </div>
          </div>
        )}

        {/* Chat-style Comments Section */}
        <ChatComments
          comments={client.comments || ''}
          onAddComment={onAddComment}
          isAddingComment={isAddingComment}
        />
      </div>
    </div>
  );
};

export default ClientHeroSection;
