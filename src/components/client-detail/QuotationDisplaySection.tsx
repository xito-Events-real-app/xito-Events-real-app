import { AlertTriangle, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseQuotationData, formatNPR, parseFinalQuotation } from "@/lib/client-card-utils";

interface QuotationDisplaySectionProps {
  status: string;
  quotationData?: string;
  ourBargainedRates?: string;
  clientBargainedRates?: string;
  finalQuotation?: string;
  onAddQuotation: () => void;
}

// Dark theme tier colors (for hero section)
function getTierColorDark(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'BASIC':
      return 'bg-blue-500/30 text-blue-200';
    case 'STANDARD':
      return 'bg-green-500/30 text-green-200';
    case 'PREMIUM':
      return 'bg-purple-500/30 text-purple-200';
    case 'WTN SPECIAL':
      return 'bg-amber-500/30 text-amber-200';
    default:
      return 'bg-white/20 text-white';
  }
}

// Check if status needs quotation display
function needsQuotation(status: string): boolean {
  const upper = status.toUpperCase();
  return (
    upper.includes('QUOTATION SENT') ||
    upper.includes('BARGAINING') ||
    upper.includes('ADVANCE PENDING') ||
    upper.includes('BOOKED') ||
    upper.includes('CANCELLED') ||
    upper.includes('POSTPONED')
  );
}

// Calculate the difference between original and proposed amounts
function calculateDiff(originalData: string, proposedTier: { tier: string; amount: string }): string {
  const originalTiers = parseQuotationData(originalData);
  const matchingOriginal = originalTiers.find(t => t.tier.toUpperCase() === proposedTier.tier.toUpperCase());
  
  if (!matchingOriginal) return '';
  
  const origAmount = parseInt(matchingOriginal.amount.replace(/[^0-9]/g, '')) || 0;
  const propAmount = parseInt(proposedTier.amount.replace(/[^0-9]/g, '')) || 0;
  const diff = origAmount - propAmount;
  
  if (diff <= 0) return '';
  return formatNPR(diff);
}

const QuotationDisplaySection = ({
  status,
  quotationData,
  ourBargainedRates,
  clientBargainedRates,
  finalQuotation,
  onAddQuotation,
}: QuotationDisplaySectionProps) => {
  const upper = status.toUpperCase();
  
  // Don't show anything for early statuses
  if (!needsQuotation(status)) {
    return null;
  }

  const quotationTiers = parseQuotationData(quotationData || '');
  const parsedFinal = parseFinalQuotation(finalQuotation);
  
  const isQuotationSent = upper.includes('QUOTATION SENT');
  const isBargaining = upper.includes('BARGAINING');
  const isAdvancePending = upper.includes('ADVANCE PENDING');
  const isBooked = upper.includes('BOOKED') && !upper.includes('SOMEWHERE');
  const isEndState = upper.includes('CANCELLED') || upper.includes('POSTPONED') || upper.includes('SOMEWHERE ELSE');

  // BOOKED status - show final quotation prominently
  if (isBooked) {
    return (
      <div className="mt-4 space-y-3">
        {/* Final Quotation - Priority Display */}
        {parsedFinal ? (
          <div className="bg-emerald-500/20 rounded-xl border border-emerald-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">
                Final Fixed Quotation
              </span>
            </div>
            <Badge className={`${getTierColorDark(parsedFinal.package)} text-sm border-0`}>
              {parsedFinal.package}
            </Badge>
            <div className="text-2xl font-bold text-white mt-2">
              NPR {formatNPR(parsedFinal.amount)}/-
            </div>
          </div>
        ) : quotationTiers.length === 0 ? (
          <div className="bg-amber-500/20 rounded-xl border border-amber-500/30 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div>
                <div className="font-medium text-amber-200">Quotation Not Recorded</div>
                <div className="text-xs text-amber-300/70">Add quotation for records</div>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={onAddQuotation}
              className="mt-3 bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Quotation
            </Button>
          </div>
        ) : null}
        
        {/* Original Quotation Tiers */}
        {quotationTiers.length > 0 && (
          <div className="bg-white/5 rounded-xl border border-white/10 p-3">
            <div className="text-xs text-white/40 mb-2">Original Quotation</div>
            <div className="flex flex-wrap gap-2">
              {quotationTiers.map((tier, idx) => (
                <div key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getTierColorDark(tier.tier)}`}>
                  <span className="opacity-70">{tier.tier}:</span> {tier.amount}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // BARGAINING IS ON - full negotiation comparison
  if (isBargaining) {
    const clientTiers = parseQuotationData(clientBargainedRates || '');
    const ourCounterTiers = parseQuotationData(ourBargainedRates || '');
    
    return (
      <div className="mt-4 bg-amber-500/20 rounded-xl border border-amber-500/30 p-4 space-y-3">
        <div className="text-xs text-amber-300 font-semibold uppercase tracking-wide">
          Negotiation In Progress
        </div>
        
        {/* Our Original Proposal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-white/60 text-sm shrink-0">Our Proposal</span>
          {quotationTiers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {quotationTiers.map((tier, idx) => (
                <span key={idx} className={`px-2 py-0.5 rounded text-xs ${getTierColorDark(tier.tier)}`}>
                  {tier.tier}: {tier.amount}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-white/40 text-sm">Not set</span>
          )}
        </div>
        
        {/* Client's Ask */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-white/60 text-sm shrink-0">Client Asking</span>
          {clientTiers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {clientTiers.map((tier, idx) => {
                const diff = quotationData ? calculateDiff(quotationData, tier) : '';
                return (
                  <span key={idx} className="px-2 py-0.5 rounded text-xs bg-red-500/30 text-red-200">
                    {tier.tier}: {tier.amount}
                    {diff && <span className="ml-1 text-red-400">↓{diff}/-</span>}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-white/40 text-sm">Not set</span>
          )}
        </div>
        
        {/* Our Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-white/60 text-sm shrink-0">Our Counter</span>
          {ourCounterTiers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {ourCounterTiers.map((tier, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-xs bg-green-500/30 text-green-200">
                  {tier.tier}: {tier.amount}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-white/40 text-sm">Not set</span>
          )}
        </div>
        
        {/* Show Add Quotation if original not set */}
        {quotationTiers.length === 0 && (
          <Button size="sm" onClick={onAddQuotation} className="mt-2 bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="h-4 w-4 mr-1" />
            Add Original Quotation
          </Button>
        )}
      </div>
    );
  }

  // QUOTATION SENT or ADVANCE PENDING
  if (isQuotationSent || isAdvancePending) {
    return (
      <div className="mt-4">
        {quotationTiers.length > 0 ? (
          <div className="bg-blue-500/20 rounded-xl border border-blue-500/30 p-4">
            <div className="text-xs text-blue-300 mb-2 font-semibold uppercase tracking-wide">
              {isAdvancePending ? 'Quotation Details' : 'Quotation Sent'}
            </div>
            <div className="flex flex-wrap gap-2">
              {quotationTiers.map((tier, idx) => (
                <div key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getTierColorDark(tier.tier)}`}>
                  <span className="opacity-70">{tier.tier}:</span> {tier.amount}
                </div>
              ))}
            </div>
            {/* Show final quotation for ADVANCE PENDING if available */}
            {isAdvancePending && parsedFinal && (
              <div className="mt-3 pt-3 border-t border-blue-500/30">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-emerald-300 font-medium">
                    Final: {parsedFinal.package} - NPR {formatNPR(parsedFinal.amount)}/-
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-500/20 rounded-xl border border-amber-500/30 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div>
                <div className="font-medium text-amber-200">Quotation Not Recorded</div>
                <div className="text-xs text-amber-300/70">Add quotation to proceed</div>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={onAddQuotation}
              className="mt-3 bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Quotation
            </Button>
          </div>
        )}
      </div>
    );
  }

  // End states (CANCELLED, POSTPONED, BOOKED SOMEWHERE ELSE) - show for reference
  if (isEndState) {
    if (quotationTiers.length === 0) return null;
    
    return (
      <div className="mt-4 bg-white/5 rounded-xl border border-white/10 p-3">
        <div className="text-xs text-white/40 mb-2">Quotation (For Reference)</div>
        <div className="flex flex-wrap gap-2">
          {quotationTiers.map((tier, idx) => (
            <div key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getTierColorDark(tier.tier)} opacity-70`}>
              <span className="opacity-70">{tier.tier}:</span> {tier.amount}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default QuotationDisplaySection;
