import { cn } from "@/lib/utils";
import { KeyRound, Users } from "lucide-react";

interface AccountTypeSidebarProps {
  accountTypes: string[];
  typeCounts: Record<string, number>;
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
  totalCount: number;
}

export function AccountTypeSidebar({ 
  accountTypes, 
  typeCounts, 
  selectedType, 
  onSelectType,
  totalCount 
}: AccountTypeSidebarProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-pink-400" />
          Account Types
        </h2>
      </div>

      {/* All Accounts */}
      <div className="p-2">
        <button
          onClick={() => onSelectType(null)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
            selectedType === null 
              ? "bg-slate-700 text-white" 
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Accounts
          </span>
          <span className="bg-slate-600 text-slate-200 text-xs px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        </button>
      </div>

      {/* Separator */}
      <div className="px-4 py-2">
        <div className="h-px bg-slate-700" />
      </div>

      {/* Account Types */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {accountTypes.map((type) => (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left",
              selectedType === type 
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white" 
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span className="truncate">{type}</span>
            {(typeCounts[type] || 0) > 0 && (
              <span className="bg-slate-600 text-slate-200 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                {typeCounts[type]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
