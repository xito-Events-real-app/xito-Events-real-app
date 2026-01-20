import { useState } from "react";
import { Phone, MessageCircle, Calendar, DollarSign, User, MapPin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookedClientData } from "@/lib/sheets-api";

interface BookedClientCardProps {
  client: BookedClientData;
  onRefresh: () => void;
}

const BookedClientCard = ({ client, onRefresh }: BookedClientCardProps) => {
  // Calculate days until event
  const getDaysUntilEvent = (): number | null => {
    if (!client.eventDateAD) return null;
    const eventDate = new Date(client.eventDateAD);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = getDaysUntilEvent();

  // Parse quotation amount
  const quotationMatch = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
  const quotationAmount = quotationMatch ? parseInt(quotationMatch[1].replace(/,/g, '')) : 0;

  // Parse paid amount
  let paidAmount = 0;
  if (client.paymentsMade) {
    const payments = client.paymentsMade.split('\n');
    paidAmount = payments.reduce((sum, entry) => {
      const match = entry.match(/NPR\s*([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0);
  }

  const paymentProgress = quotationAmount > 0 ? (paidAmount / quotationAmount) * 100 : 0;
  const remainingAmount = quotationAmount - paidAmount;

  // Get countdown style based on days remaining
  const getCountdownStyle = () => {
    if (days === null) return { bg: "bg-slate-700", text: "text-slate-400" };
    if (days <= 7) return { bg: "bg-red-500 animate-pulse", text: "text-white" };
    if (days <= 30) return { bg: "bg-orange-500", text: "text-white" };
    if (days <= 60) return { bg: "bg-amber-500", text: "text-black" };
    return { bg: "bg-green-500/20 border border-green-500/50", text: "text-green-400" };
  };

  const countdownStyle = getCountdownStyle();

  // Get package name from final quotation
  const packageMatch = client.finalQuotation?.match(/PACKAGE:\s*(.+?)(?:\s*NPR|$)/i);
  const packageName = packageMatch ? packageMatch[1].trim() : null;

  const handleCall = () => {
    if (client.contactNo) {
      window.open(`tel:${client.contactNo}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    if (client.whatsappNo) {
      const cleanNumber = client.whatsappNo.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  };

  return (
    <Card className="bg-slate-800/60 border-slate-700/50 hover:border-blue-500/30 transition-all">
      <CardContent className="p-4">
        {/* Header with countdown */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{client.clientName}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{client.eventLocation || client.eventCity}</span>
            </div>
          </div>
          {days !== null && (
            <Badge className={`${countdownStyle.bg} ${countdownStyle.text} ml-2 shrink-0`}>
              {days <= 0 ? (days === 0 ? "TODAY!" : `${Math.abs(days)}d ago`) : `${days}d`}
            </Badge>
          )}
        </div>

        {/* Event Date */}
        <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
          <Calendar className="h-4 w-4 text-blue-400" />
          <span>
            {client.eventDateAD 
              ? new Date(client.eventDateAD).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })
              : 'Date TBD'
            }
          </span>
          {client.events && (
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 ml-auto">
              {client.events.split(',').length} events
            </Badge>
          )}
        </div>

        {/* Financial Info */}
        <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-slate-400">Final Quote</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">
              NPR {quotationAmount.toLocaleString('en-IN')}
            </span>
          </div>
          
          {packageName && (
            <Badge variant="secondary" className="text-xs mb-2 bg-blue-500/20 text-blue-300">
              {packageName}
            </Badge>
          )}

          <Progress value={paymentProgress} className="h-2 mb-2" />
          
          <div className="flex justify-between text-xs">
            <span className="text-green-400">
              Paid: NPR {paidAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-amber-400">
              Due: NPR {remainingAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Handler */}
        {client.clientHandler && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <User className="h-3 w-3" />
            <span>Handled by {client.clientHandler}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookedClientCard;
