import { useState, useEffect, useMemo } from "react";
import { StickyNote, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { XitoSearchPanel } from "@/components/shared/XitoSearchPanel";
import { BookingCalendarMini } from "@/components/shared/BookingCalendarMini";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  
  const monthPattern = [...NEPALI_MONTHS, ...ENGLISH_MONTHS].join('|');
  const datePatterns = [
    `(${monthPattern})\\s+\\d{1,2}(?:st|nd|rd|th)?`,
    `\\d{1,2}(?:st|nd|rd|th)?\\s+(${monthPattern})`,
    `\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}`,
    `\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}`,
    `\\b(${monthPattern})\\b`,
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
  const [xitoOpen, setXitoOpen] = useState(false);

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

  const noteEditor = (
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
          placeholder="Write your notes here... Dates like 'Magh 15' or 'Falgun 3' will show matching events in Xito Search."
          className={cn(
            "min-h-[200px] h-full resize-none text-gray-900 placeholder:text-gray-400 border-2",
            selectedColorConfig.bg,
            selectedColorConfig.border
          )}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500">
        💡 Dates and months will be auto-highlighted when viewing
      </div>
    </div>
  );

  const footerButtons = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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

  // Mobile: Sheet with collapsible Xito Search
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
          <div className="py-4 flex-1 overflow-y-auto space-y-4">
            {/* Collapsible Xito Search */}
            <Collapsible open={xitoOpen} onOpenChange={setXitoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-violet-50 rounded-lg border border-violet-200 text-sm font-medium text-violet-700">
                <span>Xito Search</span>
                {xitoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border max-h-[200px] overflow-y-auto">
                  <XitoSearchPanel noteContent={content} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {noteEditor}
          </div>
          <SheetFooter className="gap-2 pt-4 border-t">
            {footerButtons}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: 3-column layout
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full bg-white text-gray-900 max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-500" />
            Benzo Keep
          </DialogTitle>
          <DialogDescription>
            Notes for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 py-2 min-h-[400px] max-h-[60vh]">
          {/* Left: Xito Search */}
          <div className="col-span-1 border rounded-lg p-3 bg-gray-50 overflow-hidden">
            <XitoSearchPanel noteContent={content} />
          </div>

          {/* Center: Note Editor */}
          <div className="col-span-2 overflow-hidden">
            {noteEditor}
          </div>

          {/* Right: Booking Calendar */}
          <div className="col-span-1 border rounded-lg p-3 bg-gray-50 overflow-hidden">
            <BookingCalendarMini />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BenzoKeepDialog;
