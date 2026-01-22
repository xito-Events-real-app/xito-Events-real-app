import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Search, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceTypeSelectorProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  defaultValue?: string;
}

// Fallback service types if none are loaded from sheet
const FALLBACK_SERVICE_TYPES = [
  "PHOTOGRAPHY",
  "VIDEOGRAPHY", 
  "DRONE",
  "LED",
  "ALBUM",
  "FRAME",
];

export function ServiceTypeSelector({
  label,
  value,
  onChange,
  options,
  placeholder = "Select services...",
  defaultValue = "PHOTOGRAPHY",
}: ServiceTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Use fallback options if none provided
  const effectiveOptions = useMemo(() => {
    return options && options.length > 0 ? options : FALLBACK_SERVICE_TYPES;
  }, [options]);

  // Ensure default value is set on mount
  useEffect(() => {
    if (value.length === 0 && defaultValue) {
      // Check if default value exists in effective options
      const matchingOption = effectiveOptions.find(
        opt => opt.toUpperCase() === defaultValue.toUpperCase()
      );
      if (matchingOption) {
        onChange([matchingOption]);
      } else if (effectiveOptions.length > 0) {
        // Use first option as fallback
        onChange([effectiveOptions[0]]);
      }
    }
  }, [defaultValue, effectiveOptions, value.length, onChange]);

  // Filter options by search
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    if (!normalizedSearch) return effectiveOptions;
    return effectiveOptions.filter((opt) => opt.toLowerCase().includes(normalizedSearch));
  }, [effectiveOptions, search]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== option));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Color mapping for service badges
  const getServiceColor = (service: string): string => {
    const colors: Record<string, string> = {
      "PHOTOGRAPHY": "bg-blue-500/15 text-blue-600 border-blue-500/30",
      "VIDEOGRAPHY": "bg-purple-500/15 text-purple-600 border-purple-500/30",
      "DRONE": "bg-green-500/15 text-green-600 border-green-500/30",
      "LED": "bg-amber-500/15 text-amber-600 border-amber-500/30",
      "ALBUM": "bg-pink-500/15 text-pink-600 border-pink-500/30",
      "FRAME": "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
    };
    return colors[service.toUpperCase()] || "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        {label}
      </label>
      
      {/* Selected badges with color coding */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((selected) => (
            <Badge
              key={selected}
              variant="outline"
              className={cn(
                "px-2.5 py-1 text-xs font-medium border transition-all hover:scale-105",
                getServiceColor(selected)
              )}
            >
              {selected}
              <button
                type="button"
                onClick={(e) => removeOption(selected, e)}
                className="ml-1.5 hover:text-destructive focus:outline-none transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {value.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Dropdown trigger - Modern glass effect */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border-2 bg-background/80 backdrop-blur-sm px-4 py-2 text-sm transition-all duration-200",
            "hover:border-primary/50 hover:bg-background focus:outline-none",
            isOpen 
              ? "border-primary ring-4 ring-primary/10 shadow-lg" 
              : "border-input shadow-sm",
            !value.length && "text-muted-foreground"
          )}
        >
          <span className="truncate font-medium">
            {value.length === 0
              ? placeholder
              : `${value.length} service${value.length > 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-300",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </button>

        {/* Dropdown menu - Modern floating card */}
        {isOpen && (
          <div className="absolute z-[9999] mt-2 w-full rounded-xl border-2 bg-popover/95 backdrop-blur-md shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
            {/* Search input */}
            <div className="flex items-center border-b px-4 py-3">
              <Search className="w-4 h-4 text-muted-foreground mr-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>

            {/* Options list */}
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No services found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = value.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleOption(option)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                          "hover:bg-accent/80",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground scale-110"
                              : "border-muted-foreground/30 bg-background"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                        </div>
                        <span className={cn(
                          "flex-1 text-left font-medium",
                          isSelected && "text-primary"
                        )}>
                          {option}
                        </span>
                        {isSelected && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", getServiceColor(option))}
                          >
                            Selected
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
