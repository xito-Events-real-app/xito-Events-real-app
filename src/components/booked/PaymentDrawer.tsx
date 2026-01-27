import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adToBS } from "@/lib/nepali-date";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addPayment, getDropdowns } from "@/lib/sheets-api";
import { toast } from "sonner";
import { PaymentDatePicker } from "@/components/finance/PaymentDatePicker";

interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  rowNumber: number;
  registeredDateTimeAD: string;
  existingPaymentsMade: string;
  existingPaymentDatesAD: string;
  finalQuotationAmount: number;
  onPaymentAdded: (paymentsMade: string, remainingPayment: string) => void;
  sourceSheet: 'tracker' | 'booked';
}

const PaymentDrawer = ({
  isOpen,
  onClose,
  clientName,
  rowNumber,
  registeredDateTimeAD,
  existingPaymentsMade,
  existingPaymentDatesAD,
  finalQuotationAmount,
  onPaymentAdded,
  sourceSheet,
}: PaymentDrawerProps) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [bank, setBank] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBSDate, setSelectedBSDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [amountError, setAmountError] = useState("");

  // Calculate remaining balance from existing payments
  const calculateRemainingBalance = () => {
    if (!existingPaymentsMade || !finalQuotationAmount) return finalQuotationAmount || 0;
    
    const payments = existingPaymentsMade.split('\n').filter(Boolean);
    let totalPaid = 0;
    for (const entry of payments) {
      const match = entry.match(/NPR\s*([\d,]+)\s*\/-/i);
      if (match) {
        totalPaid += parseInt(match[1].replace(/,/g, ''));
      } else {
        const fallbackMatch = entry.match(/NPR\s*([\d,]+)/i);
        if (fallbackMatch) {
          totalPaid += parseInt(fallbackMatch[1].replace(/,/g, ''));
        }
      }
    }
    return finalQuotationAmount - totalPaid;
  };

  const remainingBalance = calculateRemainingBalance();

  // Validate payment amount
  const handleAmountChange = (value: string) => {
    setPaymentAmount(value);
    const numericAmount = parseInt(value.replace(/,/g, '')) || 0;
    
    if (numericAmount > remainingBalance) {
      setAmountError(`Amount exceeds remaining balance of NPR ${remainingBalance.toLocaleString('en-IN')}`);
    } else if (numericAmount <= 0 && value !== '') {
      setAmountError('Amount must be greater than 0');
    } else {
      setAmountError('');
    }
  };

  const isAmountValid = () => {
    const numericAmount = parseInt(paymentAmount.replace(/,/g, '')) || 0;
    return numericAmount > 0 && numericAmount <= remainingBalance;
  };

  // Set default date to today when drawer opens
  useEffect(() => {
    if (isOpen && !selectedDate) {
      const today = new Date();
      const bsDate = adToBS(today);
      setSelectedDate(today);
      setSelectedBSDate({ year: bsDate.year, month: bsDate.month, day: bsDate.day as number });
    }
  }, [isOpen, selectedDate]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const data = await getDropdowns();
        setPaymentTypes(data.paymentTypes || ["ADVANCE", "PARTIAL", "FINAL"]);
        setBanks(data.banks || []);
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
        setPaymentTypes(["ADVANCE", "PARTIAL", "FINAL"]);
      }
    };
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen]);

  const handleDateChange = (date: Date, bsDate: { year: number; month: number; day: number }) => {
    setSelectedDate(date);
    setSelectedBSDate(bsDate);
  };

  const handleSubmit = async () => {
    if (!paymentAmount || !paymentType || !bank || !selectedDate || !selectedBSDate) {
      toast.error("Please fill all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Format Nepali date as YYYY-MM-DD
      const nepaliDateStr = `${selectedBSDate.year}-${String(selectedBSDate.month).padStart(2, '0')}-${String(selectedBSDate.day).padStart(2, '0')}`;
      
      // Format AD date
      const adDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      
      const result = await addPayment(
        rowNumber,
        paymentAmount,
        paymentType,
        nepaliDateStr,
        adDateStr,
        bank,
        existingPaymentsMade,
        existingPaymentDatesAD,
        finalQuotationAmount,
        registeredDateTimeAD,
        sourceSheet
      );

      toast.success(`Payment of NPR ${parseInt(paymentAmount).toLocaleString('en-IN')} recorded`);
      onPaymentAdded(result.paymentsMade, result.remainingPayment);
      
      // Reset form
      setPaymentAmount("");
      setPaymentType("");
      setBank("");
      setSelectedDate(null);
      setSelectedBSDate(null);
      onClose();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to add payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-slate-900 border-slate-700">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Add Payment
          </DrawerTitle>
          <DrawerDescription className="text-slate-400">
            Record payment for {clientName}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Remaining Balance Info */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">Remaining Balance</p>
            <p className="text-lg font-semibold text-emerald-400">
              NPR {remainingBalance.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label className="text-slate-300">Amount (NPR)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={paymentAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className={`bg-slate-800 border-slate-600 text-white ${amountError ? 'border-red-500' : ''}`}
            />
            {amountError && (
              <p className="text-xs text-red-400">{amountError}</p>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label className="text-slate-300">Payment Type</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {paymentTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-white">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bank */}
          <div className="space-y-2">
            <Label className="text-slate-300">Bank/Payment Method</Label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {banks.map((b) => (
                  <SelectItem key={b} value={b} className="text-white">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar Date Picker with AD/BS Toggle */}
          <PaymentDatePicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            defaultMode="ad"
          />
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isAmountValid() || !paymentType || !bank || !selectedDate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? "Adding..." : "Add Payment"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="border-slate-600 text-slate-300">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default PaymentDrawer;
