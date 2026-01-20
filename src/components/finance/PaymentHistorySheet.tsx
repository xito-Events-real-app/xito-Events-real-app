import { useState, useMemo } from "react";
import { Receipt, Banknote, Calendar, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getMonthName } from "@/lib/nepali-months";
import NepaliDate from "nepali-date-converter";
import PaymentDrawer from "./PaymentDrawer";

interface ParsedPayment {
  amount: string;
  amountNumber: number;
  type: string;
  dateBS: string;
  dateAD: string;
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
  // Props for adding payments
  rowNumber: number;
  registeredDateTimeAD: string;
  paymentDatesAD: string;
  onPaymentAdded?: () => void;
}

/**
 * Parses payment string in format: "NPR X,XXX/- AS [Type] ON [WEEKDAY] [NepaliDate] IN [Bank]"
 * Example: "NPR 50,000/- AS ADVANCE ON SAT 2082-09-27 IN ESEWA"
 */
function parsePayments(paymentsMade: string): ParsedPayment[] {
  if (!paymentsMade?.trim()) return [];
  
  const lines = paymentsMade.split('\n').filter(line => line.trim());
  const payments: ParsedPayment[] = [];

  for (const line of lines) {
    // Pattern: NPR X,XXX/- AS TYPE ON WEEKDAY YYYY-MM-DD IN BANK
    const match = line.match(/NPR\s*([\d,]+)\/?-?\s*AS\s+(\w+)\s+ON\s+(\w{3})\s+([\d-]+)\s+IN\s+(.+)/i);
    
    if (match) {
      const [, amountStr, type, weekday, dateStr, bank] = match;
      const amountNumber = parseInt(amountStr.replace(/,/g, ''), 10);
      
      // Parse BS date (format: YYYY-MM-DD)
      const [year, month, day] = dateStr.split('-').map(Number);
      const monthName = getMonthName(month);
      const formattedDateBS = `${year} ${monthName} ${day}`;
      
      // Convert to AD date
      let formattedDateAD = 'Unknown';
      try {
        const nepaliDate = new NepaliDate(year, month - 1, day);
        const adDate = nepaliDate.toJsDate();
        if (adDate && !isNaN(adDate.getTime())) {
          const adYear = adDate.getFullYear();
          const adMonth = adDate.toLocaleString('en-US', { month: 'short' });
          const adDay = adDate.getDate();
          formattedDateAD = `${adDay} ${adMonth} ${adYear}`;
        }
      } catch (error) {
        console.error('Error converting date:', error);
      }
      
      payments.push({
        amount: `NPR ${amountNumber.toLocaleString('en-IN')}/-`,
        amountNumber,
        type: type.toUpperCase(),
        dateBS: formattedDateBS,
        dateAD: formattedDateAD,
        bank: bank.trim().toUpperCase(),
        rawLine: line,
      });
    } else {
      // Fallback: try simpler patterns
      const simpleMatch = line.match(/NPR\s*([\d,]+)/i);
      if (simpleMatch) {
        const amountNumber = parseInt(simpleMatch[1].replace(/,/g, ''), 10);
        payments.push({
          amount: `NPR ${amountNumber.toLocaleString('en-IN')}/-`,
          amountNumber,
          type: 'PAYMENT',
          dateBS: 'Unknown',
          dateAD: 'Unknown',
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
  rowNumber,
  registeredDateTimeAD,
  paymentDatesAD,
  onPaymentAdded,
}: PaymentHistorySheetProps) => {
  const [showADDates, setShowADDates] = useState<Record<number, boolean>>({});
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  
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

  const toggleDateFormat = (index: number) => {
    setShowADDates(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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

  const handlePaymentAdded = () => {
    setIsPaymentDrawerOpen(false);
    onPaymentAdded?.();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="bg-slate-900 border-slate-700 w-full sm:max-w-lg flex flex-col">
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
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Quote</p>
              <p className="text-sm font-bold text-emerald-400">
                NPR {quotationAmount.toLocaleString('en-IN')}/-
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Paid</p>
              <p className="text-sm font-bold text-green-400">
                NPR {totalPaid.toLocaleString('en-IN')}/-
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Remaining</p>
              <p className="text-sm font-bold text-amber-400">
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
            </div>
          )}

          <Separator className="bg-slate-700 my-4" />

          {/* Payment Table */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">
              {payments.length} Payment{payments.length !== 1 ? 's' : ''} Recorded
            </h3>
            <span className="text-xs text-slate-500 ml-auto">Click date to toggle</span>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <Banknote className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No payments recorded yet</p>
              </div>
            ) : (
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 bg-slate-800/50">
                      <TableHead className="text-slate-400 text-xs">Amount</TableHead>
                      <TableHead className="text-slate-400 text-xs">Type</TableHead>
                      <TableHead className="text-slate-400 text-xs">Date</TableHead>
                      <TableHead className="text-slate-400 text-xs">Bank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={index} className="border-slate-700 hover:bg-slate-800/30">
                        <TableCell className="font-semibold text-white py-3 whitespace-nowrap">
                          {payment.amount}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getTypeColor(payment.type)} text-xs`}>
                            {payment.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <button
                            onClick={() => toggleDateFormat(index)}
                            className="text-left hover:bg-slate-700/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                          >
                            <span className="text-slate-300 text-sm">
                              {showADDates[index] ? payment.dateAD : payment.dateBS}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                              ({showADDates[index] ? 'AD' : 'BS'})
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {payment.bank}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>

          {/* Add Payment Button */}
          <SheetFooter className="pt-4 mt-auto">
            <Button 
              onClick={() => setIsPaymentDrawerOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Payment Drawer */}
      <PaymentDrawer
        isOpen={isPaymentDrawerOpen}
        onClose={() => setIsPaymentDrawerOpen(false)}
        clientName={clientName}
        rowNumber={rowNumber}
        registeredDateTimeAD={registeredDateTimeAD}
        existingPaymentsMade={paymentsMade}
        existingPaymentDatesAD={paymentDatesAD}
        finalQuotationAmount={quotationAmount}
        onPaymentAdded={handlePaymentAdded}
        sourceSheet="booked"
      />
    </>
  );
};

export default PaymentHistorySheet;
