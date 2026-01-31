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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Lock, Loader2 } from "lucide-react";
import { parseQuotationData, formatNPR, getQuotationTierColor, parseFinalQuotation } from "@/lib/client-card-utils";

interface FinalQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  existingQuotationData?: string;
  existingFinalQuotation?: string; // For pre-filling when editing
  onSave: (packageName: string, amount: string) => Promise<void>;
  isSaving: boolean;
  saveButtonText?: string; // Customizable button text
}

const PACKAGE_TIERS = ['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'] as const;

export function FinalQuotationDialog({
  open,
  onOpenChange,
  clientName,
  existingQuotationData,
  existingFinalQuotation,
  onSave,
  isSaving,
  saveButtonText = 'Lock & Move to Advance Pending',
}: FinalQuotationDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [finalAmount, setFinalAmount] = useState<string>('');
  const [selectedExistingQuote, setSelectedExistingQuote] = useState<string>('');

  // Parse existing quotations
  const existingQuotes = parseQuotationData(existingQuotationData || '');

  // Parse existing final quotation for editing
  const parsedExistingFinal = existingFinalQuotation ? parseFinalQuotation(existingFinalQuotation) : null;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // If editing existing final quotation, pre-fill
      if (parsedExistingFinal) {
        setSelectedPackage(parsedExistingFinal.package);
        setFinalAmount(String(parsedExistingFinal.amount).replace(/,/g, ''));
        setSelectedExistingQuote('');
      } else {
        setSelectedPackage('');
        setFinalAmount('');
        setSelectedExistingQuote('');
      }
    }
  }, [open, existingFinalQuotation]);

  // Handle selecting an existing quotation
  const handleExistingQuoteSelect = (value: string) => {
    setSelectedExistingQuote(value);
    const quote = existingQuotes.find(q => `${q.tier}:${q.amount}` === value);
    if (quote) {
      setSelectedPackage(quote.tier);
      // Extract numeric value from amount string like "NPR 85,000/-"
      const numericAmount = quote.amount.replace(/[^0-9]/g, '');
      setFinalAmount(numericAmount);
    }
  };

  const handleSave = async () => {
    if (!selectedPackage || !finalAmount.trim()) return;
    await onSave(selectedPackage, finalAmount.trim());
  };

  const isValid = selectedPackage && finalAmount.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Lock Final Quotation
          </DialogTitle>
          <DialogDescription>
            Confirm the final package for <span className="font-semibold text-foreground">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Quotations */}
          {existingQuotes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Existing Quotations
              </Label>
              <RadioGroup
                value={selectedExistingQuote}
                onValueChange={handleExistingQuoteSelect}
                className="space-y-2"
              >
                {existingQuotes.map((quote, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      selectedExistingQuote === `${quote.tier}:${quote.amount}`
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => handleExistingQuoteSelect(`${quote.tier}:${quote.amount}`)}
                  >
                    <RadioGroupItem
                      value={`${quote.tier}:${quote.amount}`}
                      id={`quote-${idx}`}
                    />
                    <label
                      htmlFor={`quote-${idx}`}
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded font-medium",
                        getQuotationTierColor(quote.tier)
                      )}>
                        {quote.tier}
                      </span>
                      <span className="font-semibold">{quote.amount}</span>
                    </label>
                  </div>
                ))}
              </RadioGroup>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or Select Package</span>
                </div>
              </div>
            </div>
          )}

          {/* Package Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Select Package
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PACKAGE_TIERS.map((tier) => (
                <Button
                  key={tier}
                  type="button"
                  variant={selectedPackage === tier ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 text-xs font-medium",
                    selectedPackage === tier && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => {
                    setSelectedPackage(tier);
                    setSelectedExistingQuote('');
                  }}
                >
                  {tier}
                </Button>
              ))}
            </div>
          </div>

          {/* Final Amount */}
          <div className="space-y-2">
            <Label htmlFor="final-amount" className="text-xs font-semibold uppercase text-muted-foreground">
              Final Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                NPR
              </span>
              <Input
                id="final-amount"
                type="text"
                inputMode="numeric"
                value={finalAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFinalAmount(value);
                  setSelectedExistingQuote('');
                }}
                placeholder="85,000"
                className="pl-12 pr-8 text-right font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                /-
              </span>
            </div>
            {finalAmount && (
              <p className="text-xs text-muted-foreground text-right">
                NPR {formatNPR(finalAmount)}/-
              </p>
            )}
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
                Saving...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {saveButtonText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
