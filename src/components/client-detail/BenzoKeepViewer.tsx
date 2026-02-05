import { StickyNote, Pencil, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseBenzoKeepNotes, highlightDatesAndMonths } from "./BenzoKeepDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MARKER_COLORS = {
  yellow: 'bg-yellow-100 border-yellow-300',
  green: 'bg-green-100 border-green-300',
  pink: 'bg-pink-100 border-pink-300',
  blue: 'bg-blue-100 border-blue-300',
  orange: 'bg-orange-100 border-orange-300',
};

interface BenzoKeepViewerProps {
  notesData?: string;
  onEdit: () => void;
}

const BenzoKeepViewer = ({ notesData, onEdit }: BenzoKeepViewerProps) => {
  const parsed = parseBenzoKeepNotes(notesData);

  if (!parsed?.content) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-500" />
          Benzo Keep
        </h2>
        <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/20">
          <StickyNote className="h-12 w-12 mx-auto mb-3 text-white/30" />
          <p className="text-white/40 mb-4">No notes yet</p>
          <Button onClick={onEdit} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <StickyNote className="h-4 w-4" />
            Add Note
          </Button>
        </div>
      </div>
    );
  }

  const colorClasses = MARKER_COLORS[parsed.markerColor] || MARKER_COLORS.yellow;
  const lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-500" />
          Benzo Keep
        </h2>
        <Button 
          onClick={onEdit} 
          variant="outline" 
          size="sm"
          className="border-white/20 text-white hover:bg-white/10 gap-2"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {/* Note Card - Google Keep style */}
      <div 
        className={cn(
          "rounded-xl border-2 p-4 shadow-lg cursor-pointer transition-all hover:shadow-xl",
          colorClasses
        )}
        onClick={onEdit}
      >
        {/* Note Content with highlighted dates */}
        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm min-h-[100px]">
          {highlightDatesAndMonths(parsed.content)}
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-gray-300/50 flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            Last updated: {format(lastUpdated, 'MMM d, yyyy h:mm a')}
          </div>
        )}
      </div>

      {/* Click hint */}
      <p className="text-xs text-white/40 text-center">
        Click the note to edit
      </p>
    </div>
  );
};

export default BenzoKeepViewer;
