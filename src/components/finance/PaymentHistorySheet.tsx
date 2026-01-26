import { useState, useMemo, useEffect } from "react";
import { Receipt, Banknote, Calendar, Plus, Edit, Loader2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMonthName } from "@/lib/nepali-months";
import NepaliDate from "nepali-date-converter";
import PaymentDrawer from "./PaymentDrawer";
import { updatePayment } from "@/lib/sheets-api";
import { toast } from "sonner";

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
  finalQuotationAmount?: number;
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
  finalQuotationAmount: propQuotationAmount,
}: PaymentHistorySheetProps) => {
  const [showADDates, setShowADDates] = useState<Record<number, boolean>>({});
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  
  // Edit payment state
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    type: '',
    year: '',
    month: '',
    day: '',
    bank: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  const payments = useMemo(() => parsePayments(paymentsMade), [paymentsMade]);
  
  // Initialize edit form when a payment is selected for editing
  useEffect(() => {
    if (editingPaymentIndex !== null && payments[editingPaymentIndex]) {
      const payment = payments[editingPaymentIndex];
      // Parse the amount number
      const amountStr = payment.amountNumber.toString();
      // Parse the date (format: "YYYY Month DD")
      const dateMatch = payment.dateBS.match(/(\d{4})\s+(\w+)\s+(\d+)/);
      let year = '', month = '', day = '';
      if (dateMatch) {
        year = dateMatch[1];
        // Convert month name back to number
        const monthNames = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === dateMatch[2].toLowerCase());
        month = monthIndex >= 0 ? String(monthIndex + 1) : '';
        day = dateMatch[3];
      }
      setEditFormData({
        amount: amountStr,
        type: payment.type,
        year,
        month,
        day,
        bank: payment.bank,
      });
    }
  }, [editingPaymentIndex, payments]);
  
  // Handle edit payment submit
  const handleEditPaymentSubmit = async () => {
    if (editingPaymentIndex === null) return;
    
    try {
      setIsUpdating(true);
      
      // Validate inputs
      if (!editFormData.amount || !editFormData.type || !editFormData.year || !editFormData.month || !editFormData.day || !editFormData.bank) {
        toast.error("Please fill in all fields");
        return;
      }
      
      const result = await updatePayment(
        rowNumber,
        editingPaymentIndex,
        editFormData.amount,
        editFormData.type,
        editFormData.year,
        editFormData.month,
        editFormData.day,
        editFormData.bank,
        paymentsMade,
        quotationAmount,
        registeredDateTimeAD
      );
      
      if (result.success) {
        toast.success("Payment updated successfully");
        setEditingPaymentIndex(null);
        onPaymentAdded?.(); // Refresh data
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    } finally {
      setIsUpdating(false);
    }
  };
  
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
        <SheetContent className="bg-slate-900 border-slate-700 w-full sm:max-w-2xl flex flex-col">
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
                      <TableHead className="text-slate-400 text-xs w-16">Edit</TableHead>
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
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingPaymentIndex(index)}
                            title="Edit this payment"
                          >
                            <Edit className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400" />
                          </Button>
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

      {/* Edit Payment Dialog */}
      <Dialog open={editingPaymentIndex !== null} onOpenChange={(open) => !open && setEditingPaymentIndex(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-emerald-400" />
              Edit Payment
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the payment details below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-slate-300">Amount (NPR)</Label>
              <Input
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Enter amount"
              />
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label className="text-slate-300">Payment Type</Label>
              <Select 
                value={editFormData.type} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="ADVANCE">ADVANCE</SelectItem>
                  <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                  <SelectItem value="FINAL">FINAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date - Year/Month/Day */}
            <div className="space-y-2">
              <Label className="text-slate-300">Nepali Date (BS)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  value={editFormData.year}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, year: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Year"
                  min="2070"
                  max="2100"
                />
                <Select 
                  value={editFormData.month} 
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, month: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'].map((month, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={editFormData.day}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, day: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Day"
                  min="1"
                  max="32"
                />
              </div>
            </div>

            {/* Bank */}
            <div className="space-y-2">
              <Label className="text-slate-300">Bank/Method</Label>
              <Select 
                value={editFormData.bank} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, bank: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="ESEWA">ESEWA</SelectItem>
                  <SelectItem value="KHALTI">KHALTI</SelectItem>
                  <SelectItem value="BANK">BANK</SelectItem>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="FONEPAY">FONEPAY</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingPaymentIndex(null)}
              className="border-slate-600 text-slate-300"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditPaymentSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentHistorySheet;
