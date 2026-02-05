import { useState, useEffect, useMemo } from "react";
import { StickyNote, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface BenzoKeepData {
  content: string;
  markerColor: 'yellow' | 'green' | 'pink' | 'blue' | 'orange';
  lastUpdated: string;
}

const MARKER_COLORS = [
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-200', border: 'border-yellow-400', ring: 'ring-yellow-500' },
  { id: 'green', name: 'Green', bg: 'bg-green-200', border: 'border-green-400', ring: 'ring-green-500' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-200', border: 'border-pink-400', ring: 'ring-pink-500' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-200', border: 'border-blue-400', ring: 'ring-blue-500' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-200', border: 'border-orange-400', ring: 'ring-orange-500' },
] as const;

// Nepali months for highlighting
const NEPALI_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface BenzoKeepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  existingNotes?: string;
  onSave: (notesData: string) => Promise<void>;
  isSaving: boolean;
}

// Parse stored JSON notes or return default
export function parseBenzoKeepNotes(notesStr: string | undefined): BenzoKeepData | null {
  if (!notesStr?.trim()) return null;
  try {
    const parsed = JSON.parse(notesStr);
    return {
      content: parsed.content || '',
      markerColor: parsed.markerColor || 'yellow',
      lastUpdated: parsed.lastUpdated || '',
    };
  } catch {
    // Fallback: treat as plain text content
    return {
      content: notesStr,
      markerColor: 'yellow',
      lastUpdated: '',
    };
  }
}

// Highlight dates and months in the text (visual only)
export function highlightDatesAndMonths(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // Build regex pattern for all months and date patterns
  const monthPattern = [...NEPALI_MONTHS, ...ENGLISH_MONTHS].join('|');
  const datePatterns = [
    // "January 15", "Feb 20th"
    `(${monthPattern})\\s+\\d{1,2}(?:st|nd|rd|th)?`,
    // "15 January", "20th Feb"
    `\\d{1,2}(?:st|nd|rd|th)?\\s+(${monthPattern})`,
    // "2082/01/25", "2026-01-15"
    `\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}`,
    // "15/01/2026"
    `\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}`,
    // Just month names
    `\\b(${monthPattern})\\b`,
    // "next week", "tomorrow"
    `\\b(tomorrow|next week|next month|yesterday)\\b`,
  ];
  
  const combinedPattern = new RegExp(`(${datePatterns.join('|')})`, 'gi');
  const parts = text.split(combinedPattern);
  
  return parts.map((part, index) => {
    if (!part) return null;
    if (combinedPattern.test(part)) {
      return (
        <mark key={index} className="bg-amber-300/50 text-amber-900 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return <span key={index}>{part}</span>;
  }).filter(Boolean);
}

const BenzoKeepDialog = ({
  open,
  onOpenChange,
  clientName,
  existingNotes,
  onSave,
  isSaving,
}: BenzoKeepDialogProps) => {
  const isMobile = useIsMobile();
  const existingData = useMemo(() => parseBenzoKeepNotes(existingNotes), [existingNotes]);
  
  const [content, setContent] = useState(existingData?.content || '');
  const [markerColor, setMarkerColor] = useState<BenzoKeepData['markerColor']>(existingData?.markerColor || 'yellow');

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      const parsed = parseBenzoKeepNotes(existingNotes);
      setContent(parsed?.content || '');
      setMarkerColor(parsed?.markerColor || 'yellow');
    }
  }, [open, existingNotes]);

  const handleSave = async () => {
    const notesData: BenzoKeepData = {
      content: content.trim(),
      markerColor,
      lastUpdated: new Date().toISOString(),
    };
    await onSave(JSON.stringify(notesData));
  };

  const selectedColorConfig = MARKER_COLORS.find(c => c.id === markerColor) || MARKER_COLORS[0];

  const dialogContent = (
    <div className="flex flex-col h-full">
      {/* Color Picker */}
      <div className="mb-4">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Marker Color</Label>
        <div className="flex gap-2">
          {MARKER_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => setMarkerColor(color.id as BenzoKeepData['markerColor'])}
              className={cn(
                "w-8 h-8 rounded-full transition-all border-2",
                color.bg,
                color.border,
                markerColor === color.id ? `ring-2 ${color.ring} ring-offset-2` : ''
              )}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Note</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your notes here... Dates like 'January 15', 'Magh 25', or '2082/01/15' will be auto-highlighted."
          className={cn(
            "min-h-[200px] h-full resize-none text-gray-900 placeholder:text-gray-400 border-2",
            selectedColorConfig.bg,
            selectedColorConfig.border
          )}
        />
      </div>

      {/* Preview hint */}
      <div className="mt-2 text-xs text-gray-500">
        💡 Dates and months will be auto-highlighted when viewing
      </div>
    </div>
  );

  const footerButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <StickyNote className="w-4 h-4" />
            Save Note
          </>
        )}
      </Button>
    </>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] bg-white rounded-t-3xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-gray-900">
              <StickyNote className="w-5 h-5 text-amber-500" />
              Benzo Keep
            </SheetTitle>
            <SheetDescription className="text-gray-600">
              Notes for {clientName}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            {dialogContent}
          </div>
          <SheetFooter className="gap-2 pt-4 border-t">
            {footerButtons}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-500" />
            Benzo Keep
          </DialogTitle>
          <DialogDescription>
            Notes for {clientName}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {dialogContent}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BenzoKeepDialog;
