import { useState } from "react";
import { StickyNote, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import benzoAvatar from "@/assets/benzo-avatar.jpeg";
import { UnassignedBenzoKeepDialog } from "./UnassignedBenzoKeepDialog";

interface SuiteBenzoKeepSectionProps {
  onOpenBenzoKeep?: () => void;
}

export function SuiteBenzoKeepSection({ onOpenBenzoKeep }: SuiteBenzoKeepSectionProps) {
  const [unassignedOpen, setUnassignedOpen] = useState(false);

  return (
    <>
      <div className="border-t border-gray-200 p-2">
        <div className="px-2 py-2 mb-1">
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wide flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-violet-500" />
            Benzo Keep
          </p>
        </div>
        
        <div className="space-y-1">
          {/* Benzo Keep - Shows clients with notes */}
          <button
            onClick={onOpenBenzoKeep}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
              "hover:bg-violet-50 border border-transparent hover:border-violet-200"
            )}
          >
            <img 
              src={benzoAvatar} 
              alt="Benzo" 
              className="w-8 h-8 rounded-lg object-cover shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-violet-700">
                Benzo Keep
              </p>
              <p className="text-xs text-gray-500">Assigned notes</p>
            </div>
          </button>

          {/* Unassigned Benzo Keep */}
          <button
            onClick={() => setUnassignedOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
              "hover:bg-amber-50 border border-transparent hover:border-amber-200"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-amber-700">
                Unassigned
              </p>
              <p className="text-xs text-gray-500">Quick notes</p>
            </div>
          </button>
        </div>
      </div>

      <UnassignedBenzoKeepDialog
        open={unassignedOpen}
        onOpenChange={setUnassignedOpen}
      />
    </>
  );
}

