import { useMemo } from "react";
import { X, Receipt, Calendar, Banknote, CreditCard, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMonthName } from "@/lib/nepali-months";

interface ParsedPayment {
  amount: string;
  amountNumber: number;
  type: string;
  date: string;
  bank: string;
  rawLine: string;
}

interface PaymentHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  paymentsMade: string;
  finalQuotation: string;
  remainingPayment: string;
}

/**
 * Parses payment string in format: "NPR X,XXX/- AS [Type] ON [Day] [NepaliDate] IN [Bank]"
 * Example: "NPR 50,000/- AS ADVANCE ON 15 2081-10-15 IN ESEWA"
 */
function parsePayments(paymentsMade: string): ParsedPayment[] {
  if (!paymentsMade?.trim()) return [];
  
  const lines = paymentsMade.split('\n').filter(line => line.trim());
  const payments: ParsedPayment[] = [];

  for (const line of lines) {
    // Try to parse the standard format
    // Pattern: NPR X,XXX/- AS TYPE ON DAY DATE IN BANK
    const match = line.match(/NPR\s*([\d,]+)\/?-?\s*AS\s+(\w+)\s+ON\s+(\d+)\s+([\d-]+)\s+IN\s+(.+)/i);
    
    if (match) {
      const [, amountStr, type, day, dateStr, bank] = match;
      const amountNumber = parseInt(amountStr.replace(/,/g, ''), 10);
      
      // Parse date (format: YYYY-MM-DD)
      const [year, month] = dateStr.split('-').map(Number);
      const monthName = getMonthName(month);
      const formattedDate = `${year} ${monthName} ${day}`;
      
      payments.push({
        amount: `NPR ${amountNumber.toLocaleString('en-IN')}/-`,
        amountNumber,
        type: type.toUpperCase(),
        date: formattedDate,
        bank: bank.trim().toUpperCase(),
        rawLine: line,
      });
    } else {
      // Fallback: try simpler patterns or just show raw
      const simpleMatch = line.match(/NPR\s*([\d,]+)/i);
      if (simpleMatch) {
        const amountNumber = parseInt(simpleMatch[1].replace(/,/g, ''), 10);
        payments.push({
          amount: `NPR ${amountNumber.toLocaleString('en-IN')}/-`,
          amountNumber,
          type: 'PAYMENT',
          date: 'Unknown',
          bank: 'Unknown',
          rawLine: line,
        });
      }
    }
  }

  return payments;
}

function parseQuotationAmount(quotation: string): number {
  if (!quotation) return 0;
  const match = quotation.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ''), 10);
  }
  return 0;
}

const PaymentHistorySheet = ({
  isOpen,
  onClose,
  clientName,
  paymentsMade,
  finalQuotation,
  remainingPayment,
}: PaymentHistorySheetProps) => {
  const payments = useMemo(() => parsePayments(paymentsMade), [paymentsMade]);
  
  const totalPaid = useMemo(() => 
    payments.reduce((sum, p) => sum + p.amountNumber, 0), 
    [payments]
  );
  
  const quotationAmount = useMemo(() => parseQuotationAmount(finalQuotation), [finalQuotation]);
  const remaining = useMemo(() => parseQuotationAmount(remainingPayment), [remainingPayment]);
  
  const progressPercentage = quotationAmount > 0 
    ? Math.min(100, Math.round((totalPaid / quotationAmount) * 100)) 
    : 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ADVANCE':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'PARTIAL':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'FINAL':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-slate-900 border-slate-700 w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-400" />
            Payment History
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            {clientName}
          </SheetDescription>
        </SheetHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Total Paid</p>
            <p className="text-lg font-bold text-emerald-400">
              NPR {totalPaid.toLocaleString('en-IN')}/-
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Remaining</p>
            <p className="text-lg font-bold text-amber-400">
              NPR {remaining.toLocaleString('en-IN')}/-
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {quotationAmount > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Payment Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1 text-center">
              of NPR {quotationAmount.toLocaleString('en-IN')}/- total
            </p>
          </div>
        )}

        <Separator className="bg-slate-700 my-4" />

        {/* Payment List */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">
            {payments.length} Payment{payments.length !== 1 ? 's' : ''} Recorded
          </h3>
        </div>

        <ScrollArea className="h-[calc(100vh-380px)]">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Banknote className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {payments.map((payment, index) => (
                <div 
                  key={index}
                  className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-lg font-bold text-white">
                      {payment.amount}
                    </p>
                    <Badge className={getTypeColor(payment.type)}>
                      {payment.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-300">{payment.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-300">{payment.bank}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentHistorySheet;
