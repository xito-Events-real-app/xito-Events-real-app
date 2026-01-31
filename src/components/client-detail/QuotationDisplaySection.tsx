import { AlertTriangle, Lock, Plus, MessageSquare, Send, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { parseQuotationData, formatNPR, parseFinalQuotation, parseComments, getRelativeTime } from "@/lib/client-card-utils";

interface QuotationDisplaySectionProps {
  status: string;
  quotationData?: string;
  ourBargainedRates?: string;
  clientBargainedRates?: string;
  finalQuotation?: string;
  onAddQuotation: () => void;
  onAddFinalQuotation?: () => void; // New: for BOOKED clients to add/edit final quotation
  comments?: string;
  onAddComment?: (comment: string) => Promise<void>;
  isAddingComment?: boolean;
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

// Inline Comments Component for side-by-side display
const InlineComments = ({ 
  comments, 
  onAddComment, 
  isAddingComment = false 
}: { 
  comments?: string; 
  onAddComment?: (comment: string) => Promise<void>; 
  isAddingComment?: boolean;
}) => {
  const [newComment, setNewComment] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const parsedComments = parseComments(comments || '');
  
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Keep scroll at top (latest first)
    }
  }, [comments]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || isAddingComment || !onAddComment) return;
    
    await onAddComment(newComment.trim());
    setNewComment('');
    setShowInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowInput(false);
      setNewComment('');
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/5 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">
            Comments {parsedComments.length > 0 && `(${parsedComments.length})`}
          </span>
        </div>
        {onAddComment && (
          <button
            onClick={() => setShowInput(!showInput)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {/* Comments List - Scrollable */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-32"
      >
        {parsedComments.length === 0 ? (
          <div className="text-center text-white/30 py-3 text-xs">
            No comments yet
          </div>
        ) : (
          [...parsedComments].reverse().map((comment, i) => (
            <div 
              key={i} 
              className="bg-white/5 rounded px-2 py-1.5"
            >
              <div className="text-white/90 text-xs leading-relaxed line-clamp-2">
                {comment.text}
              </div>
              {comment.timestamp && (
                <div className="text-[9px] text-white/40 mt-0.5 text-right">
                  {getRelativeTime(comment.timestamp)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Inline Input */}
      {showInput && onAddComment && (
        <form 
          onSubmit={handleSubmit}
          className="p-2 pt-0 border-t border-white/5 bg-white/5 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add comment..."
              className="flex-1 h-7 bg-transparent border-white/20 text-white placeholder:text-white/30 text-xs"
              disabled={isAddingComment}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isAddingComment}
              className="p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingComment ? (
                <Loader2 className="h-3 w-3 text-white animate-spin" />
              ) : (
                <Send className="h-3 w-3 text-white" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const QuotationDisplaySection = ({
  status,
  quotationData,
  ourBargainedRates,
  clientBargainedRates,
  finalQuotation,
  onAddQuotation,
  onAddFinalQuotation,
  comments,
  onAddComment,
  isAddingComment,
}: QuotationDisplaySectionProps) => {
  const upper = status.toUpperCase();
  
  // For early statuses, still show comments section
  if (!needsQuotation(status)) {
    return (
      <div className="mt-3">
        <InlineComments 
          comments={comments} 
          onAddComment={onAddComment} 
          isAddingComment={isAddingComment} 
        />
      </div>
    );
  }

  const quotationTiers = parseQuotationData(quotationData || '');
  const parsedFinal = parseFinalQuotation(finalQuotation);
  
  const isQuotationSent = upper.includes('QUOTATION SENT');
  const isBargaining = upper.includes('BARGAINING');
  const isAdvancePending = upper.includes('ADVANCE PENDING');
  const isBooked = upper.includes('BOOKED') && !upper.includes('SOMEWHERE');
  const isEndState = upper.includes('CANCELLED') || upper.includes('POSTPONED') || upper.includes('SOMEWHERE ELSE');

  // BOOKED status - show final quotation + comments side by side
  if (isBooked) {
    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: Final Quotation - Compact */}
        <div className="space-y-2">
          {parsedFinal ? (
            <div className="bg-emerald-500/20 rounded-lg border border-emerald-500/30 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wide">
                    Final Fixed Quotation
                  </span>
                </div>
                {/* Edit button for existing final quotation */}
                {onAddFinalQuotation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddFinalQuotation}
                    className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <Badge className={`${getTierColorDark(parsedFinal.package)} text-xs border-0`}>
                {parsedFinal.package}
              </Badge>
              <div className="text-lg font-bold text-white mt-1">
                NPR {formatNPR(parsedFinal.amount)}/-
              </div>
            </div>
          ) : (
            // BOOKED but no final quotation - show "Add Final Quotation" button
            <div className="bg-amber-500/20 rounded-lg border border-amber-500/30 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-medium text-amber-200 text-sm">Final Quotation Not Set</div>
                  <div className="text-[10px] text-amber-300/70">Lock final quotation for records</div>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={onAddFinalQuotation || onAddQuotation}
                className="mt-2 bg-amber-500 hover:bg-amber-600 text-black h-7 text-xs"
              >
                <Lock className="h-3 w-3 mr-1" />
                Add Final Quotation
              </Button>
            </div>
          )}
          
          {/* Original Quotation Tiers - Compact */}
          {quotationTiers.length > 0 && (
            <div className="bg-white/5 rounded-lg border border-white/10 p-2">
              <div className="text-[10px] text-white/40 mb-1.5">Original Quotation</div>
              <div className="flex flex-wrap gap-1.5">
                {quotationTiers.map((tier, idx) => (
                  <div key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getTierColorDark(tier.tier)}`}>
                    <span className="opacity-70">{tier.tier}:</span> {tier.amount}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right: Comments */}
        <InlineComments 
          comments={comments} 
          onAddComment={onAddComment} 
          isAddingComment={isAddingComment} 
        />
      </div>
    );
  }

  // BARGAINING IS ON - full negotiation comparison (compact)
  if (isBargaining) {
    const clientTiers = parseQuotationData(clientBargainedRates || '');
    const ourCounterTiers = parseQuotationData(ourBargainedRates || '');
    
    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-amber-500/20 rounded-lg border border-amber-500/30 p-3 space-y-2">
          <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-wide">
            Negotiation In Progress
          </div>
          
          {/* Our Original Proposal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <span className="text-white/60 text-xs shrink-0">Our Proposal</span>
            {quotationTiers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {quotationTiers.map((tier, idx) => (
                  <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] ${getTierColorDark(tier.tier)}`}>
                    {tier.tier}: {tier.amount}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-white/40 text-xs">Not set</span>
            )}
          </div>
          
          {/* Client's Ask */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <span className="text-white/60 text-xs shrink-0">Client Asking</span>
            {clientTiers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {clientTiers.map((tier, idx) => {
                  const diff = quotationData ? calculateDiff(quotationData, tier) : '';
                  return (
                    <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/30 text-red-200">
                      {tier.tier}: {tier.amount}
                      {diff && <span className="ml-1 text-red-400">↓{diff}/-</span>}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-white/40 text-xs">Not set</span>
            )}
          </div>
          
          {/* Our Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <span className="text-white/60 text-xs shrink-0">Our Counter</span>
            {ourCounterTiers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {ourCounterTiers.map((tier, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/30 text-green-200">
                    {tier.tier}: {tier.amount}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-white/40 text-xs">Not set</span>
            )}
          </div>
          
          {/* Show Add Quotation if original not set */}
          {quotationTiers.length === 0 && (
            <Button size="sm" onClick={onAddQuotation} className="mt-1 bg-amber-500 hover:bg-amber-600 text-black h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Original Quotation
            </Button>
          )}
        </div>
        
        <InlineComments 
          comments={comments} 
          onAddComment={onAddComment} 
          isAddingComment={isAddingComment} 
        />
      </div>
    );
  }

  // QUOTATION SENT or ADVANCE PENDING - compact
  if (isQuotationSent || isAdvancePending) {
    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          {quotationTiers.length > 0 ? (
            <div className="bg-blue-500/20 rounded-lg border border-blue-500/30 p-3 h-full">
              <div className="text-[10px] text-blue-300 mb-1.5 font-semibold uppercase tracking-wide">
                {isAdvancePending ? 'Quotation Details' : 'Quotation Sent'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quotationTiers.map((tier, idx) => (
                  <div key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getTierColorDark(tier.tier)}`}>
                    <span className="opacity-70">{tier.tier}:</span> {tier.amount}
                  </div>
                ))}
              </div>
              {/* Show final quotation for ADVANCE PENDING if available */}
              {isAdvancePending && parsedFinal && (
                <div className="mt-2 pt-2 border-t border-blue-500/30">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs text-emerald-300 font-medium">
                      Final: {parsedFinal.package} - NPR {formatNPR(parsedFinal.amount)}/-
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-500/20 rounded-lg border border-amber-500/30 p-3 h-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-medium text-amber-200 text-sm">Quotation Not Recorded</div>
                  <div className="text-[10px] text-amber-300/70">Add quotation to proceed</div>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={onAddQuotation}
                className="mt-2 bg-amber-500 hover:bg-amber-600 text-black h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Quotation
              </Button>
            </div>
          )}
        </div>
        
        <InlineComments 
          comments={comments} 
          onAddComment={onAddComment} 
          isAddingComment={isAddingComment} 
        />
      </div>
    );
  }

  // End states (CANCELLED, POSTPONED, BOOKED SOMEWHERE ELSE) - show for reference
  if (isEndState) {
    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {quotationTiers.length > 0 && (
          <div className="bg-white/5 rounded-lg border border-white/10 p-2 h-full">
            <div className="text-[10px] text-white/40 mb-1.5">Quotation (For Reference)</div>
            <div className="flex flex-wrap gap-1.5">
              {quotationTiers.map((tier, idx) => (
                <div key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getTierColorDark(tier.tier)} opacity-70`}>
                  <span className="opacity-70">{tier.tier}:</span> {tier.amount}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className={quotationTiers.length === 0 ? 'md:col-span-2' : ''}>
          <InlineComments 
            comments={comments} 
            onAddComment={onAddComment} 
            isAddingComment={isAddingComment} 
          />
        </div>
      </div>
    );
  }

  return null;
};

export default QuotationDisplaySection;
