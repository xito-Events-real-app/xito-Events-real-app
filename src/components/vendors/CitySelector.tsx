import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityCities, otherNepalCities } from "@/lib/nepal-cities";

interface CitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CitySelector({ value, onChange, placeholder = "Select city..." }: CitySelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-800 border-slate-600" align="start">
        <Command className="bg-slate-800">
          <CommandInput placeholder="Search city..." className="text-white" />
          <CommandList>
            <CommandEmpty className="text-slate-400 py-4 text-center">No city found.</CommandEmpty>
            
            {/* Priority Cities */}
            <CommandGroup heading="Popular Cities" className="text-slate-400">
              {priorityCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                  className="text-white hover:bg-slate-700 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandSeparator className="bg-slate-600" />
            
            {/* Other Cities */}
            <CommandGroup heading="Other Cities" className="text-slate-400">
              {otherNepalCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                  className="text-white hover:bg-slate-700 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
