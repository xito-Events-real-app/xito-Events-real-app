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

  // Ensure default value is set on mount
  useEffect(() => {
    if (value.length === 0 && defaultValue && options.includes(defaultValue)) {
      onChange([defaultValue]);
    }
  }, [defaultValue, options, value.length, onChange]);

  // Filter options by search
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    if (!normalizedSearch) return options;
    return options.filter((opt) => opt.toLowerCase().includes(normalizedSearch));
  }, [options, search]);

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

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        {label}
      </label>
      
      {/* Selected badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((selected) => (
            <Badge
              key={selected}
              variant="secondary"
              className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {selected}
              <button
                type="button"
                onClick={(e) => removeOption(selected, e)}
                className="ml-1.5 hover:text-destructive focus:outline-none"
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

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all",
            "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            isOpen && "border-primary ring-2 ring-ring ring-offset-2",
            !value.length && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {value.length === 0
              ? placeholder
              : `${value.length} service${value.length > 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 shrink-0 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-[9999] mt-2 w-full rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
            {/* Search input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
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
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No services found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleOption(option)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-primary/10 text-primary"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <span className="flex-1 text-left">{option}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
