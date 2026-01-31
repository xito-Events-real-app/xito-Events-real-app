import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, Lock, Calendar } from "lucide-react";
import { parseFinalQuotation, formatNPR, getQuotationTierColor } from "@/lib/client-card-utils";
import { PaymentDatePicker } from "@/components/finance/PaymentDatePicker";
import { bsToAD, nepaliMonthsEnglish, getCurrentBSDate } from "@/lib/nepali-date";

interface AdvancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  finalQuotation?: string;
  paymentTypes: string[];
  banks: string[];
  onSave: (data: {
    amount: string;
    paymentType: string;
    bank: string;
    nepaliDate: string;
    adDate: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export function AdvancePaymentDialog({
  open,
  onOpenChange,
  clientName,
  finalQuotation,
  paymentTypes,
  banks,
  onSave,
  isSaving,
}: AdvancePaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBSDate, setSelectedBSDate] = useState<{ year: number; month: number; day: number } | null>(null);

  // Parse existing final quotation
  const parsedFinal = parseFinalQuotation(finalQuotation || '');
  const finalAmount = parsedFinal ? parseInt(parsedFinal.amount.replace(/[^0-9]/g, '')) : 0;
  const hasFinalQuotation = parsedFinal !== null;

  // Reset state and initialize date when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentAmount('');
      setSelectedPaymentType('ADVANCE PAYMENT');
      setSelectedBank('');
      
      // Initialize with current date
      const now = new Date();
      const currentBS = getCurrentBSDate();
      setSelectedDate(now);
      setSelectedBSDate({
        year: currentBS.year,
        month: currentBS.month,
        day: currentBS.day as number
      });
    }
  }, [open]);

  const handleDateChange = (date: Date, bsDate: { year: number; month: number; day: number }) => {
    setSelectedDate(date);
    setSelectedBSDate(bsDate);
  };

  const handleSave = async () => {
    if (!hasFinalQuotation || !paymentAmount.trim() || !selectedPaymentType || !selectedBank || !selectedDate || !selectedBSDate) return;

    const formattedNepaliDate = `${selectedBSDate.year}-${String(selectedBSDate.month).padStart(2, '0')}-${String(selectedBSDate.day).padStart(2, '0')}`;
    const formattedADDate = selectedDate.toISOString().split('T')[0];

    await onSave({
      amount: paymentAmount.trim(),
      paymentType: selectedPaymentType,
      bank: selectedBank,
      nepaliDate: formattedNepaliDate,
      adDate: formattedADDate,
    });
  };

  // Require final quotation to be set before allowing payment
  const isValid = hasFinalQuotation && paymentAmount.trim() && selectedPaymentType && selectedBank && selectedDate && selectedBSDate;

  // Filter payment types to prioritize ADVANCE
  const sortedPaymentTypes = [...paymentTypes].sort((a, b) => {
    if (a.toUpperCase().includes('ADVANCE')) return -1;
    if (b.toUpperCase().includes('ADVANCE')) return 1;
    return 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Record Advance Payment
          </DialogTitle>
          <DialogDescription>
            Book <span className="font-semibold text-foreground">{clientName}</span> with advance payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Final Package Display */}
          {parsedFinal && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Final Package:</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded font-medium",
                getQuotationTierColor(parsedFinal.package)
              )}>
                {parsedFinal.package}
              </span>
              <span className="font-semibold">NPR {parsedFinal.amount}/-</span>
            </div>
          )}

          {!hasFinalQuotation && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive">
              <p className="text-sm text-destructive font-medium">
                ⛔ Final quotation is required before recording payment.
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                Please set the status to "ADVANCE PENDING" first to lock the final quotation.
              </p>
            </div>
          )}

          {/* Advance Amount */}
          <div className="space-y-2">
            <Label htmlFor="advance-amount" className="text-xs font-semibold uppercase text-muted-foreground">
              Advance Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                NPR
              </span>
              <Input
                id="advance-amount"
                type="text"
                inputMode="numeric"
                value={paymentAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setPaymentAmount(value);
                }}
                placeholder="30,000"
                className="pl-12 pr-8 text-right font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                /-
              </span>
            </div>
            {paymentAmount && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>NPR {formatNPR(paymentAmount)}/-</span>
                {finalAmount > 0 && (
                  <span>
                    Remaining: NPR {formatNPR(finalAmount - parseInt(paymentAmount || '0'))}/-
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Payment Type
            </Label>
            <Select value={selectedPaymentType} onValueChange={setSelectedPaymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                {sortedPaymentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bank/Method */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Bank / Payment Method
            </Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <PaymentDatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              defaultMode="ad"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Record Payment & Book
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
