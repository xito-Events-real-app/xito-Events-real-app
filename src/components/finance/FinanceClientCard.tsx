import { useState } from "react";
import { Phone, MessageCircle, Lock, Plus, Calendar, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookedClientData } from "@/lib/sheets-api";
import { getMonthName } from "@/lib/nepali-months";
import PaymentDrawer from "./PaymentDrawer";
import PaymentHistorySheet from "./PaymentHistorySheet";

interface FinanceClientCardProps {
  client: BookedClientData;
  onRefresh: () => void;
}

const FinanceClientCard = ({ client, onRefresh }: FinanceClientCardProps) => {
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [localPaymentsMade, setLocalPaymentsMade] = useState(client.paymentsMade || "");
  const [localRemainingPayment, setLocalRemainingPayment] = useState(client.remainingPayment || "");

  // Format Nepali event date
  const formatNepaliEventDate = (): string => {
    if (!client.eventYear || !client.eventMonth || !client.eventDay) return 'Date TBD';
    const monthName = getMonthName(client.eventMonth);
    const dayDisplay = client.eventDay.includes('*') ? '**' : client.eventDay;
    return `${client.eventYear} ${monthName} ${dayDisplay}`;
  };

  // Parse quotation amount
  const quotationMatch = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
  const quotationAmount = quotationMatch ? parseInt(quotationMatch[1].replace(/,/g, '')) : 0;

  // Parse paid amount from local state
  let paidAmount = 0;
  if (localPaymentsMade) {
    const payments = localPaymentsMade.split('\n');
    paidAmount = payments.reduce((sum, entry) => {
      const match = entry.match(/NPR\s*([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0);
  }

  const paymentProgress = quotationAmount > 0 ? (paidAmount / quotationAmount) * 100 : 0;
  const remainingAmount = quotationAmount - paidAmount;

  // Get package name from final quotation
  const packageMatch = client.finalQuotation?.match(/PACKAGE:\s*(.+?)(?:\s*NPR|$)/i);
  const packageName = packageMatch ? packageMatch[1].trim() : null;

  // Get last payment date
  const getLastPaymentDate = (): string | null => {
    if (!localPaymentsMade) return null;
    const payments = localPaymentsMade.split('\n').filter(Boolean);
    if (payments.length === 0) return null;
    const lastPayment = payments[payments.length - 1];
    const dateMatch = lastPayment.match(/ON\s+(\d+\s+\w+\s+\d+)/i);
    return dateMatch ? dateMatch[1] : null;
  };

  const lastPaymentDate = getLastPaymentDate();

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

  const handlePaymentAdded = (paymentsMade: string, remainingPayment: string) => {
    setLocalPaymentsMade(paymentsMade);
    setLocalRemainingPayment(remainingPayment);
    onRefresh();
  };

  const handlePaymentHistoryUpdate = () => {
    onRefresh();
  };

  // Payment status badge
  const getPaymentStatusBadge = () => {
    if (remainingAmount <= 0) {
      return <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">Fully Paid</Badge>;
    }
    if (paidAmount > 0) {
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/50">Partial</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">No Payment</Badge>;
  };

  return (
    <>
      <Card className="bg-slate-800/60 border-slate-700/50 hover:border-emerald-500/30 transition-all">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{client.clientName}</h3>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>{formatNepaliEventDate()}</span>
              </div>
              {client.clientHandler && (
                <span className="text-[10px] text-purple-400 mt-0.5">{client.clientHandler}</span>
              )}
            </div>
            {getPaymentStatusBadge()}
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

            {lastPaymentDate && (
              <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-500">
                Last payment: {lastPaymentDate}
              </div>
            )}
          </div>

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
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              onClick={() => setShowPaymentHistory(true)}
              title="View/Edit Payment History"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setShowPaymentDrawer(true)}
              title="Add New Payment"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Drawer */}
      <PaymentDrawer
        isOpen={showPaymentDrawer}
        onClose={() => setShowPaymentDrawer(false)}
        clientName={client.clientName}
        rowNumber={client.bookedRowNumber}
        registeredDateTimeAD={client.registeredDateTimeAD || ""}
        existingPaymentsMade={localPaymentsMade}
        existingPaymentDatesAD={client.paymentDatesAD || ""}
        finalQuotationAmount={quotationAmount}
        onPaymentAdded={handlePaymentAdded}
        sourceSheet="booked"
      />

      {/* Payment History Sheet */}
      <PaymentHistorySheet
        isOpen={showPaymentHistory}
        onClose={() => setShowPaymentHistory(false)}
        clientName={client.clientName}
        paymentsMade={localPaymentsMade}
        finalQuotation={client.finalQuotation || ""}
        remainingPayment={localRemainingPayment}
        rowNumber={client.bookedRowNumber}
        registeredDateTimeAD={client.registeredDateTimeAD || ""}
        paymentDatesAD={client.paymentDatesAD || ""}
        onPaymentAdded={handlePaymentHistoryUpdate}
      />
    </>
  );
};

export default FinanceClientCard;
