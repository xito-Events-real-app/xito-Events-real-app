import { cn } from "@/lib/utils";
import { OFFICIAL_VENUE_TYPES } from "@/lib/xito-global-venues-api";
import { Building2 } from "lucide-react";

interface VenueTypeSidebarProps {
  typeCounts: Record<string, number>;
  selectedType: string | null;
  onSelectType: (t: string | null) => void;
  totalCount: number;
}

export function VenueTypeSidebar({
  typeCounts,
  selectedType,
  onSelectType,
  totalCount,
}: VenueTypeSidebarProps) {
  const officialSet = new Set<string>(OFFICIAL_VENUE_TYPES as readonly string[]);
  const legacyTypes = Object.keys(typeCounts)
    .filter(t => !officialSet.has(t))
    .sort();

  return (
    <aside className="w-60 shrink-0 border-r bg-card hidden md:flex md:flex-col h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      <div className="px-4 py-3 border-b">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Venue Types</h3>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <TypeButton
          active={selectedType === null}
          onClick={() => onSelectType(null)}
          label="All venues"
          count={totalCount}
        />
        <div className="h-px bg-border my-1" />
        {(OFFICIAL_VENUE_TYPES as readonly string[]).map(t => (
          <TypeButton
            key={t}
            active={selectedType === t}
            onClick={() => onSelectType(t)}
            label={t}
            count={typeCounts[t] || 0}
          />
        ))}
        {legacyTypes.length > 0 && (
          <>
            <div className="px-2 mt-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Legacy types
            </div>
            {legacyTypes.map(t => (
              <TypeButton
                key={t}
                active={selectedType === t}
                onClick={() => onSelectType(t)}
                label={t}
                count={typeCounts[t] || 0}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

function TypeButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
        active
          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
          : "text-foreground hover:bg-muted"
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center",
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}