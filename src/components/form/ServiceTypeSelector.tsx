import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Fallback options if sheet data is missing
const FALLBACK_SERVICE_TYPES = [
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "DRONE",
  "ALBUM",
  "FRAME",
  "LED",
  "LIVE STREAMING",
];

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Use provided options or fallback
  const effectiveOptions = useMemo(() => {
    const opts = options && options.length > 0 ? options : FALLBACK_SERVICE_TYPES;
    // Clean: trim and remove empty/duplicate
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const opt of opts) {
      const v = (opt ?? "").trim();
      if (!v) continue;
      if (seen.has(v.toUpperCase())) continue;
      seen.add(v.toUpperCase());
      cleaned.push(v);
    }
    return cleaned;
  }, [options]);

  // Toggle selection
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      // Don't allow deselecting if it's the last one
      if (value.length > 1) {
        onChange(value.filter((v) => v !== option));
      }
    } else {
      onChange([...value, option]);
    }
  };

  // Remove a selected item
  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (value.length > 1) {
      onChange(value.filter((v) => v !== option));
    }
  };

  // Get color for service badge
  const getServiceColor = (service: string): string => {
    const s = service.toUpperCase();
    if (s.includes("PHOTO")) return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30";
    if (s.includes("VIDEO")) return "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30";
    if (s.includes("DRONE")) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (s.includes("ALBUM")) return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30";
    if (s.includes("FRAME")) return "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30";
    if (s.includes("LED")) return "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    if (s.includes("STREAM")) return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30";
    return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30";
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Selected items as badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className={cn("text-xs px-2 py-0.5 border", getServiceColor(item))}
            >
              {item}
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => removeOption(item, e)}
                  className="ml-1.5 hover:bg-white/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-base"
          >
            <span className="text-muted-foreground">
              {value.length > 0 ? `${value.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-background border border-border shadow-xl" 
          align="start"
        >
          <Command>
            <CommandInput
              placeholder="Search services..."
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            <CommandList className="max-h-60">
              <CommandEmpty>No service found.</CommandEmpty>

              <CommandGroup>
                {effectiveOptions.map((option) => {
                  const isSelected = value.includes(option);
                  return (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => toggleOption(option)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{option}</span>
                      {isSelected && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Selected
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
