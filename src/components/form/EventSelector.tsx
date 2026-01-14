import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NepaliDateObject, formatBSDate, nepaliMonthsEnglish } from "@/lib/nepali-date";
import { Search, X, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventSelectorProps {
  date: NepaliDateObject;
  selectedEvent: string;
  onEventChange: (event: string) => void;
  eventOptions: string[];
  onRemoveDate: () => void;
}

export function EventSelector({
  date,
  selectedEvent,
  onEventChange,
  eventOptions,
  onRemoveDate,
}: EventSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return eventOptions;
    const query = searchQuery.toLowerCase();
    return eventOptions.filter((opt) => opt.toLowerCase().includes(query));
  }, [eventOptions, searchQuery]);

  const handleSelectEvent = (event: string) => {
    onEventChange(event);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(true);
  };

  const handleCustomEvent = () => {
    if (searchQuery.trim()) {
      onEventChange(searchQuery.trim());
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const isUnknownDay = date.day === "**";
  const dateDisplay = `${nepaliMonthsEnglish[date.month - 1]} ${isUnknownDay ? "**" : date.day}`;

  return (
    <div className="bg-muted/50 rounded-lg p-3 border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{dateDisplay}</span>
          <span className="text-xs text-muted-foreground">({formatBSDate(date)})</span>
        </div>
        <button
          type="button"
          onClick={onRemoveDate}
          className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {/* Selected Event Display */}
      {selectedEvent && (
        <div className="mb-2">
          <Badge variant="secondary" className="gap-1">
            {selectedEvent}
            <button
              type="button"
              onClick={() => onEventChange("")}
              className="ml-1 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or type event..."
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectEvent(option)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                  selectedEvent === option && "bg-primary/10 text-primary"
                )}
              >
                {option}
              </button>
            ))
          ) : searchQuery.trim() ? (
            <button
              type="button"
              onClick={handleCustomEvent}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add "{searchQuery.trim()}"
            </button>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No options available</p>
          )}
        </div>
      )}
    </div>
  );
}
