import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import NepaliDate from "nepali-date-converter";
import { nepaliMonthsEnglish, getBSYearsRange, getDaysInBSMonth } from "@/lib/nepali-date";

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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [amountError, setAmountError] = useState("");

  const years = getBSYearsRange();

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

  // Set default date to today's Nepali date
  useEffect(() => {
    if (isOpen && selectedYear === null) {
      const today = new NepaliDate();
      setSelectedYear(today.getYear());
      setSelectedMonth(today.getMonth() + 1); // 1-indexed
      setSelectedDay(today.getDate());
    }
  }, [isOpen, selectedYear]);

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

  // Get days in selected month
  const daysInMonth = selectedYear && selectedMonth 
    ? getDaysInBSMonth(selectedYear, selectedMonth) 
    : 30;

  const handleSubmit = async () => {
    if (!paymentAmount || !paymentType || !bank || !selectedYear || !selectedMonth || !selectedDay) {
      toast.error("Please fill all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Format Nepali date as YYYY-MM-DD
      const nepaliDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      
      // Convert to AD date
      const nepaliDateObj = new NepaliDate(selectedYear, selectedMonth - 1, selectedDay);
      const adDateObj = nepaliDateObj.toJsDate();
      const adDateStr = `${adDateObj.getFullYear()}-${String(adDateObj.getMonth() + 1).padStart(2, '0')}-${String(adDateObj.getDate()).padStart(2, '0')}`;
      
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
      setSelectedYear(null);
      setSelectedMonth(null);
      setSelectedDay(null);
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

          {/* Nepali Date Selectors */}
          <div className="space-y-2">
            <Label className="text-slate-300">Payment Date (BS)</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Year */}
              <Select 
                value={selectedYear?.toString() || ""} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="text-white">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month */}
              <Select 
                value={selectedMonth?.toString() || ""} 
                onValueChange={(v) => {
                  setSelectedMonth(parseInt(v));
                  // Reset day if it exceeds days in new month
                  if (selectedYear && selectedDay) {
                    const newDaysInMonth = getDaysInBSMonth(selectedYear, parseInt(v));
                    if (selectedDay > newDaysInMonth) {
                      setSelectedDay(newDaysInMonth);
                    }
                  }
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {nepaliMonthsEnglish.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()} className="text-white">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Day */}
              <Select 
                value={selectedDay?.toString() || ""} 
                onValueChange={(v) => setSelectedDay(parseInt(v))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={d.toString()} className="text-white">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isAmountValid() || !paymentType || !bank || !selectedYear || !selectedMonth || !selectedDay}
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
