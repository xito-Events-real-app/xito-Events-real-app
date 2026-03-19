import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getDaysInBSMonth, nepaliMonthsEnglish } from "@/lib/nepali-date";
import { GaneshIcon } from "./GaneshIcon";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";

interface LaganDatesPickerProps {
  bsYear: number;
  bsMonth: number;
  laganDays: Set<number>;
  onLaganDaysChange: (days: Set<number>) => void;
}

export function LaganDatesPicker({ bsYear, bsMonth, laganDays, onLaganDaysChange }: LaganDatesPickerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);

  const toggleDay = async (day: number) => {
    setSaving(true);
    try {
      const isLagan = laganDays.has(day);
      if (isLagan) {
        await supabase
          .from("lagan_dates")
          .delete()
          .eq("bs_year", bsYear)
          .eq("bs_month", bsMonth)
          .eq("bs_day", day);
        const next = new Set(laganDays);
        next.delete(day);
        onLaganDaysChange(next);
      } else {
        await supabase
          .from("lagan_dates")
          .insert({ bs_year: bsYear, bs_month: bsMonth, bs_day: day });
        const next = new Set(laganDays);
        next.add(day);
        onLaganDaysChange(next);
      }
    } catch (e) {
      toast.error("Failed to update lagan date");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-white hover:bg-white/20 hover:text-white text-xs"
        >
          <GaneshIcon size={16} className="text-orange-300" />
          Lagan
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 z-[200] pointer-events-auto" align="start">
        <div className="text-sm font-semibold mb-2 text-center">
          Lagan Dates — {nepaliMonthsEnglish[bsMonth - 1]} {bsYear}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isLagan = laganDays.has(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                disabled={saving}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex items-center justify-center ${
                  isLagan
                    ? "bg-orange-500 text-white ring-2 ring-orange-300 shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-orange-100"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        {laganDays.size > 0 && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {laganDays.size} lagan date{laganDays.size > 1 ? "s" : ""} selected
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
