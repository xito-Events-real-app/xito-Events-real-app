import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface FormComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export function FormCombobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  required = false,
  className,
}: FormComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedOptions = useMemo(() => {
    // Remove empty + duplicate options (keeps stable order)
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const opt of options) {
      const v = (opt ?? "").trim();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      cleaned.push(v);
    }
    return cleaned;
  }, [options]);

  const canCreate = useMemo(() => {
    const q = search.trim();
    if (!q) return false;
    const qLower = q.toLowerCase();
    return !normalizedOptions.some((o) => o.toLowerCase() === qLower);
  }, [search, normalizedOptions]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

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
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        {/* Portal-based content (prevents being clipped by overflow-hidden parents like FormSection) */}
        <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                // Prevent Enter from submitting the whole form
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            <CommandList>
              <CommandEmpty>
                {search.trim() ? "No match. Use the typed value." : "No options found."}
              </CommandEmpty>

              <CommandGroup>
                {canCreate && (
                  <CommandItem
                    value={search.trim()}
                    onSelect={() => {
                      const v = search.trim();
                      onChange(v);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="truncate">Use "{search.trim()}"</span>
                  </CommandItem>
                )}

                {normalizedOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
