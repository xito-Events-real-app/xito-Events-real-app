import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";

interface FormComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function FormCombobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  required = false,
  className,
}: FormComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If we have a search query but no selection, use the search query as custom value
        if (searchQuery && !value) {
          onChange(searchQuery);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery, value, onChange]);

  const handleSelect = (option: string) => {
    onChange(option);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue); // Update value as user types for custom input
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0 && searchQuery) {
        // Select first matching option
        handleSelect(filteredOptions[0]);
      } else if (searchQuery) {
        // Use custom value
        onChange(searchQuery);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value || searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-12 text-base bg-background pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                    value === option && "bg-accent"
                  )}
                >
                  {option}
                  {value === option && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {searchQuery ? `Use "${searchQuery}" as custom value` : "No options available"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
