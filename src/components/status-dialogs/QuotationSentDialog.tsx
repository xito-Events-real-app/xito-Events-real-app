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
import { cn } from "@/lib/utils";
import { FileText, Loader2 } from "lucide-react";
import { parseQuotationData, formatNPR, getQuotationTierColor } from "@/lib/client-card-utils";

interface QuotationSentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  existingQuotationData?: string;
  onSave: (quotationData: string) => Promise<void>;
  isSaving: boolean;
}

const QUOTATION_TIERS = ['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'] as const;

export function QuotationSentDialog({
  open,
  onOpenChange,
  clientName,
  existingQuotationData,
  onSave,
  isSaving,
}: QuotationSentDialogProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({
    'BASIC': '',
    'STANDARD': '',
    'PREMIUM': '',
    'WTN SPECIAL': '',
  });

  // Parse existing quotations to pre-fill if available
  useEffect(() => {
    if (open) {
      const parsed = parseQuotationData(existingQuotationData || '');
      const newAmounts: Record<string, string> = {
        'BASIC': '',
        'STANDARD': '',
        'PREMIUM': '',
        'WTN SPECIAL': '',
      };
      
      parsed.forEach(quote => {
        const tier = quote.tier.toUpperCase();
        // Extract numeric value from amount like "NPR 85,000/-"
        const numericAmount = quote.amount.replace(/[^0-9]/g, '');
        if (QUOTATION_TIERS.some(t => tier.includes(t))) {
          const matchedTier = QUOTATION_TIERS.find(t => tier.includes(t));
          if (matchedTier) {
            newAmounts[matchedTier] = numericAmount;
          }
        }
      });
      
      setAmounts(newAmounts);
    }
  }, [open, existingQuotationData]);

  const handleAmountChange = (tier: string, value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    setAmounts(prev => ({ ...prev, [tier]: numericValue }));
  };

  const handleSave = async () => {
    // Build quotation data string: "BASIC: NPR X,XXX/- | STANDARD: NPR Y,YYY/-"
    const entries: string[] = [];
    QUOTATION_TIERS.forEach(tier => {
      const amount = amounts[tier];
      if (amount && amount.trim()) {
        entries.push(`${tier}: NPR ${formatNPR(amount)}/-`);
      }
    });
    
    if (entries.length === 0) return;
    
    const quotationData = entries.join(' | ');
    await onSave(quotationData);
  };

  // At least one tier must have an amount
  const hasAtLeastOneTier = Object.values(amounts).some(a => a && a.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Enter Quotation Amounts
          </DialogTitle>
          <DialogDescription>
            Provide quotation for <span className="font-semibold text-foreground">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter prices for each package tier. At least one tier is required.
          </p>

          <div className="space-y-3">
            {QUOTATION_TIERS.map((tier) => (
              <div key={tier} className="space-y-1.5">
                <Label 
                  htmlFor={`tier-${tier}`} 
                  className={cn(
                    "text-xs font-semibold uppercase px-2 py-0.5 rounded inline-block",
                    getQuotationTierColor(tier)
                  )}
                >
                  {tier}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    NPR
                  </span>
                  <Input
                    id={`tier-${tier}`}
                    type="text"
                    inputMode="numeric"
                    value={amounts[tier]}
                    onChange={(e) => handleAmountChange(tier, e.target.value)}
                    placeholder="0"
                    className="pl-12 pr-8 text-right font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    /-
                  </span>
                </div>
                {amounts[tier] && (
                  <p className="text-xs text-muted-foreground text-right">
                    NPR {formatNPR(amounts[tier])}/-
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Preview */}
          {hasAtLeastOneTier && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Preview</p>
              <div className="flex flex-wrap gap-2">
                {QUOTATION_TIERS.map((tier) => {
                  const amount = amounts[tier];
                  if (!amount || !amount.trim()) return null;
                  return (
                    <div key={tier} className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded font-medium",
                        getQuotationTierColor(tier)
                      )}>
                        {tier}
                      </span>
                      <span className="text-sm font-semibold">
                        NPR {formatNPR(amount)}/-
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
            disabled={!hasAtLeastOneTier || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Save & Update Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
