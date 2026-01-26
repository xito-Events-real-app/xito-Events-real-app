import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import NepaliDate from "nepali-date-converter";
import { 
  nepaliMonthsEnglish, 
  getDaysInBSMonth, 
  adToBS, 
  bsToAD,
  formatBSDate 
} from "@/lib/nepali-date";
import { format } from "date-fns";

interface PaymentDatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date, bsDate: { year: number; month: number; day: number }) => void;
  defaultMode?: 'ad' | 'bs';
}

export function PaymentDatePicker({ 
  selectedDate, 
  onDateChange, 
  defaultMode = 'ad' 
}: PaymentDatePickerProps) {
  const [mode, setMode] = useState<'ad' | 'bs'>(defaultMode);
  
  // BS view state for navigation
  const [bsViewYear, setBsViewYear] = useState(() => {
    if (selectedDate) {
      const bs = adToBS(selectedDate);
      return bs.year;
    }
    const now = new NepaliDate();
    return now.getYear();
  });
  const [bsViewMonth, setBsViewMonth] = useState(() => {
    if (selectedDate) {
      const bs = adToBS(selectedDate);
      return bs.month;
    }
    const now = new NepaliDate();
    return now.getMonth() + 1;
  });

  // Get selected BS date for highlighting in BS mode
  const selectedBSDate = selectedDate ? adToBS(selectedDate) : null;

  // Handle AD calendar selection
  const handleADSelect = (date: Date | undefined) => {
    if (date) {
      const bs = adToBS(date);
      onDateChange(date, { year: bs.year, month: bs.month, day: bs.day as number });
    }
  };

  // Handle BS calendar day selection
  const handleBSSelect = (day: number) => {
    const adDate = bsToAD(bsViewYear, bsViewMonth, day);
    if (adDate instanceof Date) {
      onDateChange(adDate, { year: bsViewYear, month: bsViewMonth, day });
    }
  };

  // Navigate BS calendar
  const goToPrevMonth = () => {
    if (bsViewMonth === 1) {
      setBsViewMonth(12);
      setBsViewYear(bsViewYear - 1);
    } else {
      setBsViewMonth(bsViewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (bsViewMonth === 12) {
      setBsViewMonth(1);
      setBsViewYear(bsViewYear + 1);
    } else {
      setBsViewMonth(bsViewMonth + 1);
    }
  };

  // Get days in current BS view month
  const daysInMonth = getDaysInBSMonth(bsViewYear, bsViewMonth);
  
  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = () => {
    try {
      const adDate = bsToAD(bsViewYear, bsViewMonth, 1);
      if (adDate instanceof Date) {
        return adDate.getDay();
      }
    } catch {
      return 0;
    }
    return 0;
  };

  const firstDayOffset = getFirstDayOfMonth();

  // Get today's BS date for highlighting
  const todayBS = adToBS(new Date());

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-slate-300 text-sm font-medium">Payment Date</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          <button
            type="button"
            onClick={() => setMode('ad')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all",
              mode === 'ad' 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            AD
          </button>
          <button
            type="button"
            onClick={() => setMode('bs')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all",
              mode === 'bs' 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            BS
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-2">
        {mode === 'ad' ? (
          /* AD Calendar using shadcn */
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleADSelect}
            className={cn("p-0 pointer-events-auto [&_.rdp-months]:space-y-0")}
            classNames={{
              months: "flex flex-col space-y-0",
              month: "space-y-2",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium text-slate-200",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-slate-300 hover:bg-slate-700 rounded-md inline-flex items-center justify-center"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-slate-400 rounded-md w-8 font-normal text-[0.7rem] flex-1 text-center",
              row: "flex w-full mt-1",
              cell: "h-8 w-8 text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-emerald-600/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                "h-8 w-8 p-0 font-normal mx-auto rounded-md hover:bg-slate-700 text-slate-200 inline-flex items-center justify-center"
              ),
              day_selected:
                "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white",
              day_today: "bg-slate-700 text-emerald-400",
              day_outside: "text-slate-600 opacity-50",
              day_disabled: "text-slate-600 opacity-50",
              day_hidden: "invisible",
            }}
          />
        ) : (
          /* BS Calendar - Custom Grid */
          <div className="space-y-2">
            {/* Header with navigation */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-slate-300 hover:bg-slate-700 rounded-md inline-flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-slate-200">
                {nepaliMonthsEnglish[bsViewMonth - 1]} {bsViewYear}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                className="h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-slate-300 hover:bg-slate-700 rounded-md inline-flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-slate-400 text-[0.7rem] font-normal py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = todayBS.year === bsViewYear && 
                               todayBS.month === bsViewMonth && 
                               todayBS.day === day;
                const isSelected = selectedBSDate && 
                                  selectedBSDate.year === bsViewYear && 
                                  selectedBSDate.month === bsViewMonth && 
                                  selectedBSDate.day === day;
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleBSSelect(day)}
                    className={cn(
                      "h-8 w-full rounded-md text-sm font-normal inline-flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : isToday
                        ? "bg-slate-700 text-emerald-400"
                        : "text-slate-200 hover:bg-slate-700"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Date Display */}
      {selectedDate && (
        <div className="text-center text-sm bg-slate-800/50 rounded-lg py-2 border border-slate-700/50">
          {mode === 'ad' ? (
            <span className="text-slate-300">
              {format(selectedDate, "MMMM d, yyyy")} 
              <span className="text-emerald-400 ml-1">
                ({formatBSDate(adToBS(selectedDate))})
              </span>
            </span>
          ) : (
            <span className="text-slate-300">
              {formatBSDate(adToBS(selectedDate))} 
              <span className="text-emerald-400 ml-1">
                ({format(selectedDate, "MMM d, yyyy")})
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentDatePicker;
