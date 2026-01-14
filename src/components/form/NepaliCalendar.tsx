import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NepaliDateObject,
  getCurrentBSDate,
  getDaysInBSMonth,
  getBSYearsRange,
  nepaliMonthsEnglish,
  bsToAD,
  formatBSDate,
  isUnknownDay,
  getDayDisplay,
} from "@/lib/nepali-date";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { format } from "date-fns";

interface NepaliCalendarProps {
  selectedDates: NepaliDateObject[];
  onDateSelect: (dates: NepaliDateObject[]) => void;
  multiSelect?: boolean;
}

export function NepaliCalendar({
  selectedDates,
  onDateSelect,
  multiSelect = true,
}: NepaliCalendarProps) {
  const today = getCurrentBSDate();
  const [viewMonth, setViewMonth] = useState(today.month);
  const [viewYear, setViewYear] = useState(today.year);

  const daysInMonth = getDaysInBSMonth(viewYear, viewMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Get the weekday of the first day (0 = Sunday)
  // Always pass 1 (not **) to get the first day of month
  const firstDayAD = bsToAD(viewYear, viewMonth, 1) as Date;
  const firstDayWeekday = firstDayAD.getDay();

  const isSelected = useCallback(
    (day: number) => {
      return selectedDates.some(
        (d) => d.year === viewYear && d.month === viewMonth && d.day === day
      );
    },
    [selectedDates, viewYear, viewMonth]
  );

  // Count how many unknown dates are selected for current month/year
  const getUnknownDayCount = useCallback(() => {
    return selectedDates.filter(
      (d) => d.year === viewYear && d.month === viewMonth && isUnknownDay(d.day)
    ).length;
  }, [selectedDates, viewYear, viewMonth]);

  const handleDayClick = (day: number) => {
    const newDate: NepaliDateObject = { year: viewYear, month: viewMonth, day };
    
    if (multiSelect) {
      const exists = selectedDates.some(
        (d) => d.year === newDate.year && d.month === newDate.month && d.day === newDate.day
      );
      
      if (exists) {
        onDateSelect(selectedDates.filter(
          (d) => !(d.year === newDate.year && d.month === newDate.month && d.day === newDate.day)
        ));
      } else {
        onDateSelect([...selectedDates, newDate]);
      }
    } else {
      onDateSelect([newDate]);
    }
  };

  // Handle unknown date click - always adds a new entry with unique ID
  const handleUnknownDayClick = () => {
    const uniqueId = `**-${Date.now()}`;
    const newDate: NepaliDateObject = { year: viewYear, month: viewMonth, day: uniqueId };
    
    if (multiSelect) {
      onDateSelect([...selectedDates, newDate]);
    } else {
      onDateSelect([newDate]);
    }
  };

  // Remove a specific date by its exact day value (including unique ID for **)
  const handleRemoveDate = (date: NepaliDateObject) => {
    onDateSelect(selectedDates.filter(
      (d) => !(d.year === date.year && d.month === date.month && d.day === date.day)
    ));
  };

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-foreground">
            {nepaliMonthsEnglish[viewMonth - 1]} {viewYear}
          </p>
          <p className="text-xs text-muted-foreground">BS (Bikram Sambat)</p>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells with ** option in ALL of them */}
        {Array.from({ length: firstDayWeekday }).map((_, i) => {
          const unknownCount = getUnknownDayCount();
          return (
            <button
              type="button"
              key={`empty-${i}`}
              onClick={handleUnknownDayClick}
              className={cn(
                "h-10 rounded-lg text-sm font-bold transition-all press-effect border-2 border-dashed",
                unknownCount > 0
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600"
                  : "border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:border-primary/50"
              )}
              title="Unknown date - click to add an event with unconfirmed date"
            >
              **
            </button>
          );
        })}
        
        {/* Day cells */}
        {days.map((day) => {
          const selected = isSelected(day);
          const isToday = day === today.day && viewMonth === today.month && viewYear === today.year;
          
          return (
            <button
              type="button"
              key={day}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-10 rounded-lg text-sm font-medium transition-all press-effect",
                selected
                  ? "gradient-primary text-white"
                  : isToday
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {day}
            </button>
          );
        })}
        
        {/* Trailing empty cells with ** option */}
        {(() => {
          const totalCells = firstDayWeekday + daysInMonth;
          const rows = Math.ceil(totalCells / 7);
          const totalGridCells = rows * 7;
          const trailingEmpty = totalGridCells - totalCells;
          const unknownCount = getUnknownDayCount();
          
          return Array.from({ length: trailingEmpty }).map((_, i) => (
            <button
              type="button"
              key={`trailing-${i}`}
              onClick={handleUnknownDayClick}
              className={cn(
                "h-10 rounded-lg text-sm font-bold transition-all press-effect border-2 border-dashed",
                unknownCount > 0
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600"
                  : "border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:border-primary/50"
              )}
              title="Unknown date - click to add an event with unconfirmed date"
            >
              **
            </button>
          ));
        })()}
      </div>

      {/* Selected Dates Display */}
      {selectedDates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            Selected ({selectedDates.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, i) => {
              const isUnknown = isUnknownDay(date.day);
              const adResult = bsToAD(date.year, date.month, date.day);
              const adDisplay = isUnknown 
                ? (adResult as string).split('-').slice(0, 2).join('-') + "-**"
                : format(adResult as Date, "MMM d");
              
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-xs",
                    isUnknown ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"
                  )}
                >
                  <Calendar className={cn("w-3 h-3", isUnknown ? "text-amber-600" : "text-primary")} />
                  <span className="text-foreground">{formatBSDate(date)}</span>
                  <span className="text-muted-foreground">
                    ({adDisplay})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDate(date)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
