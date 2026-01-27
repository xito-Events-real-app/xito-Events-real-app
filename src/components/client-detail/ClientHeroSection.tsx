import { Phone, MessageCircle, Mail, MapPin, FileText, CreditCard, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientData } from "@/lib/sheets-api";
import { getMonthColorClasses, parseInquiryMonth, getCurrentStatus } from "@/lib/client-card-utils";
import LastActivitiesSummary from "./LastActivitiesSummary";

interface ClientHeroSectionProps {
  client: ClientData;
  currentStatus: string;
  onCall: (type: 'DIRECT' | 'WHATSAPP') => void;
  onPayment: () => void;
  onStatusClick: () => void;
  onEdit: () => void;
  isLoggingCall?: boolean;
  isChangingStatus?: boolean;
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

const ClientHeroSection = ({
  client,
  currentStatus,
  onCall,
  onPayment,
  onStatusClick,
  onEdit,
  isLoggingCall = false,
  isChangingStatus = false,
}: ClientHeroSectionProps) => {
  const inquiryMonth = parseInquiryMonth(client.inquiryDateBS);
  const monthColorClasses = inquiryMonth ? getMonthColorClasses(inquiryMonth) : '';

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,25%,12%)] via-[hsl(220,25%,8%)] to-[hsl(220,30%,5%)]" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative p-6 md:p-8">
        {/* Top Row: Name + Status + Edit */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            {/* Client Name - Large & Prominent */}
            <h1 className={`text-3xl md:text-4xl font-bold text-white mb-3 inline-block px-4 py-2 rounded-xl ${monthColorClasses || 'bg-white/10'}`}>
              {client.clientName}
            </h1>
            
            {/* Contact Info Row */}
            <div className="flex flex-wrap gap-4 text-white/80 mt-4">
              {client.contactNo && (
                <a 
                  href={`tel:${client.contactNo}`} 
                  className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                >
                  <Phone className="h-4 w-4 text-blue-400" />
                  <span>{client.contactNo}</span>
                </a>
              )}
              {client.whatsappNo && (
                <a 
                  href={`https://wa.me/${client.whatsappNo.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-green-400 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-green-400" />
                  <span>{client.whatsappNo}</span>
                </a>
              )}
              {client.email && (
                <a 
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 hover:text-amber-400 transition-colors"
                >
                  <Mail className="h-4 w-4 text-amber-400" />
                  <span className="truncate max-w-[200px]">{client.email}</span>
                </a>
              )}
              {client.eventCity && (
                <div className="flex items-center gap-2 text-white/60">
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

        {/* Quick Actions */}
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

        {/* Description Box - Netflix Style */}
        {client.description && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4 mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide">Description</div>
                <div className="text-white/90 whitespace-pre-wrap leading-relaxed">{client.description}</div>
              </div>
            </div>
          </div>
        )}

        {/* Last Activities Summary */}
        <LastActivitiesSummary
          statusLog={client.statusLog}
          callLog={client.callLog}
          comments={client.comments}
          paymentsMade={client.paymentsMade}
        />
      </div>
    </div>
  );
};

export default ClientHeroSection;
