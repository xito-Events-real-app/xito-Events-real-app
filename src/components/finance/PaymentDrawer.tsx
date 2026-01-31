import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle } from "lucide-react";
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
import { PaymentDatePicker } from "./PaymentDatePicker";

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
}: PaymentDrawerProps) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [bank, setBank] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBSDate, setSelectedBSDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  
  // Check if final quotation is set
  const hasFinalQuotation = finalQuotationAmount > 0;

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
    // Safety check: block if no final quotation
    if (!hasFinalQuotation) {
      toast.error("Final quotation not fixed. Please set final quotation first.");
      return;
    }
    
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
        clientName
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
          {/* Final Quotation Missing Warning */}
          {!hasFinalQuotation && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Final quotation not fixed</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Please lock the final quotation first (ADVANCE PENDING) before recording payment.
                </p>
              </div>
            </div>
          )}
          
          {/* Payment Amount */}
          <div className="space-y-2">
            <Label className="text-slate-300">Amount (NPR)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
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
            disabled={isSubmitting || !hasFinalQuotation || !paymentAmount || !paymentType || !bank || !selectedDate}
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
